package com.admin.common.task;

import com.admin.common.utils.GostUtil;
import com.admin.entity.*;
import com.admin.service.*;
import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import javax.annotation.Resource;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

/**
 * 隧道自动切换服务
 * 当用户某条隧道流量耗尽时，从该用户已授权的其他隧道中按顺序分配空位，
 * 将转发逐条迁移过去；目标隧道空位不足时自动换下一个，仍不够的暂停处理。
 */
@Slf4j
@Service
public class TunnelAutoSwitchService {

    private static final long BYTES_TO_GB = 1024L * 1024L * 1024L;

    private static final ConcurrentHashMap<String, Object> SWITCH_LOCKS = new ConcurrentHashMap<>();

    @Resource
    private UserTunnelService userTunnelService;

    @Resource
    private ForwardService forwardService;

    @Resource
    private TunnelService tunnelService;

    /**
     * 尝试将用户在流量耗尽隧道上的所有转发自动切换到其他可用隧道。
     *
     * @return true=至少有一条转发成功切换；false=无可用隧道，调用方应暂停服务
     */
    public boolean tryAutoSwitch(String userId, String userTunnelId) {
        String lockKey = userId + "_" + userTunnelId;
        synchronized (SWITCH_LOCKS.computeIfAbsent(lockKey, k -> new Object())) {
            try {
                return doSwitch(Integer.valueOf(userId), Integer.valueOf(userTunnelId));
            } finally {
                SWITCH_LOCKS.remove(lockKey);
            }
        }
    }

    private boolean doSwitch(Integer userId, Integer exhaustedUTId) {
        UserTunnel exhaustedUT = userTunnelService.getById(exhaustedUTId);
        if (exhaustedUT == null) return false;

        // 并发保护：二次确认流量确实耗尽
        if (!isExhausted(exhaustedUT)) return true;

        Tunnel exhaustedTunnel = tunnelService.getById(exhaustedUT.getTunnelId());
        if (exhaustedTunnel == null) return false;

        // 取出待迁移的活跃转发
        List<Forward> forwards = forwardService.list(
                new QueryWrapper<Forward>()
                        .eq("user_id", userId)
                        .eq("tunnel_id", exhaustedUT.getTunnelId())
                        .eq("status", 1)
        );
        if (forwards.isEmpty()) return false;

        // 构建可用隧道列表（有余量、未过期、有空位、同类型），并记录当前已占用数
        List<CandidateTunnel> candidates = buildCandidates(userId, exhaustedUTId,
                exhaustedTunnel.getInNodeId(), exhaustedTunnel.getType());

        log.info("[自动切换] 用户[{}] 隧道「{}」流量耗尽，待迁移{}条转发，候选隧道{}个",
                userId, exhaustedTunnel.getName(), forwards.size(), candidates.size());

        int switched = 0, paused = 0;

        for (Forward forward : forwards) {
            // 从候选列表中找还有空位的隧道
            CandidateTunnel target = candidates.stream()
                    .filter(CandidateTunnel::hasSlot)
                    .findFirst()
                    .orElse(null);

            if (target != null) {
                if (forwardService.switchTunnel(forward.getId(), target.tunnelId).getCode() == 0) {
                    target.useSlot();
                    switched++;
                    log.info("[自动切换] 转发[{}]「{}」→ 隧道「{}」", forward.getId(), forward.getName(), target.tunnelName);
                } else {
                    pauseForward(forward, exhaustedUT);
                    paused++;
                    log.warn("[自动切换] 转发[{}]「{}」切换失败，已暂停", forward.getId(), forward.getName());
                }
            } else {
                pauseForward(forward, exhaustedUT);
                paused++;
                log.info("[自动切换] 转发[{}]「{}」无可用隧道，已暂停", forward.getId(), forward.getName());
            }
        }

        log.info("[自动切换] 用户[{}] 完成：切换{}条，暂停{}条", userId, switched, paused);
        return switched > 0;
    }

    /**
     * 构建候选隧道列表：有余量、未过期、有转发空位，且隧道类型必须与耗尽隧道相同，
     * 优先同入口节点排前面（切换后用户无需更新连接地址）。
     */
    private List<CandidateTunnel> buildCandidates(Integer userId, Integer excludeUTId,
                                                    Long preferredInNodeId, Integer requiredTunnelType) {
        long now = System.currentTimeMillis();

        List<UserTunnel> eligible = userTunnelService.list(
                        new QueryWrapper<UserTunnel>()
                                .eq("user_id", userId)
                                .eq("status", 1)
                                .ne("id", excludeUTId))
                .stream()
                .filter(ut -> !isExhausted(ut))
                .filter(ut -> ut.getExpTime() == null || ut.getExpTime() > now)
                .collect(Collectors.toList());

        List<CandidateTunnel> candidates = new ArrayList<>();
        for (UserTunnel ut : eligible) {
            Tunnel tunnel = tunnelService.getById(ut.getTunnelId());
            if (tunnel == null) continue;

            // 只切换到同类型隧道，避免 type 1 ↔ type 2 混用导致 outPort 为 null
            if (requiredTunnelType != null && !requiredTunnelType.equals(tunnel.getType())) continue;

            // 当前该用户在这条隧道上已有多少条活跃转发
            long existingCount = forwardService.count(
                    new QueryWrapper<Forward>()
                            .eq("user_id", userId)
                            .eq("tunnel_id", ut.getTunnelId())
                            .eq("status", 1)
            );

            int numLimit = (ut.getNum() != null && ut.getNum() > 0) ? ut.getNum() : Integer.MAX_VALUE;
            int available = (int) Math.max(0, numLimit - existingCount);

            if (available > 0) {
                boolean preferred = Objects.equals(preferredInNodeId, tunnel.getInNodeId());
                candidates.add(new CandidateTunnel(ut.getTunnelId(), tunnel.getName(), available, preferred));
            }
        }

        // 同入口节点的排前面（端口不变，连接无感），其余按加入顺序
        candidates.sort((a, b) -> Boolean.compare(b.preferred, a.preferred));
        return candidates;
    }

    /** 暂停单条转发（不依赖 JWT 上下文） */
    private void pauseForward(Forward forward, UserTunnel ut) {
        try {
            Tunnel tunnel = tunnelService.getById(forward.getTunnelId());
            if (tunnel != null) {
                String name = forward.getId() + "_" + forward.getUserId() + "_" + ut.getId();
                GostUtil.PauseService(tunnel.getInNodeId(), name);
                if (tunnel.getType() == 2) {
                    GostUtil.PauseRemoteService(tunnel.getOutNodeId(), name);
                }
            }
            forward.setStatus(0);
            forwardService.updateById(forward);
        } catch (Exception e) {
            log.error("[自动切换] 暂停转发[{}]失败: {}", forward.getId(), e.getMessage());
        }
    }

    private boolean isExhausted(UserTunnel ut) {
        Double limit = ut.getFlow();
        if (limit == null || limit <= 0) return false;
        long used = (ut.getInFlow() != null ? ut.getInFlow() : 0L)
                  + (ut.getOutFlow() != null ? ut.getOutFlow() : 0L);
        return used >= limit * BYTES_TO_GB;
    }

    /** 候选隧道，带实时空位计数 */
    private static class CandidateTunnel {
        final Integer tunnelId;
        final String tunnelName;
        final boolean preferred;
        private int remainingSlots;

        CandidateTunnel(Integer tunnelId, String tunnelName, int remainingSlots, boolean preferred) {
            this.tunnelId = tunnelId;
            this.tunnelName = tunnelName;
            this.remainingSlots = remainingSlots;
            this.preferred = preferred;
        }

        boolean hasSlot() { return remainingSlots > 0; }

        void useSlot() { remainingSlots--; }
    }
}
