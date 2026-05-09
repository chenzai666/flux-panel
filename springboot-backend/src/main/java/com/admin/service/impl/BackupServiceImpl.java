package com.admin.service.impl;

import com.admin.common.lang.R;
import com.admin.entity.*;
import com.admin.mapper.*;
import com.admin.service.BackupService;
import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class BackupServiceImpl extends ServiceImpl<NodeMapper, Node> implements BackupService {

    private final ViteConfigMapper viteConfigMapper;
    private final TunnelMapper tunnelMapper;
    private final UserMapper userMapper;
    private final UserTunnelMapper userTunnelMapper;
    private final SpeedLimitMapper speedLimitMapper;
    private final ForwardMapper forwardMapper;

    public BackupServiceImpl(ViteConfigMapper viteConfigMapper,
                             TunnelMapper tunnelMapper,
                             UserMapper userMapper,
                             UserTunnelMapper userTunnelMapper,
                             SpeedLimitMapper speedLimitMapper,
                             ForwardMapper forwardMapper) {
        this.viteConfigMapper = viteConfigMapper;
        this.tunnelMapper = tunnelMapper;
        this.userMapper = userMapper;
        this.userTunnelMapper = userTunnelMapper;
        this.speedLimitMapper = speedLimitMapper;
        this.forwardMapper = forwardMapper;
    }

    @Override
    public R exportAll() {
        try {
            BackupData backup = new BackupData();
            backup.setVersion("1.5.7");
            backup.setExportTime(System.currentTimeMillis());

            backup.setViteConfig(viteConfigMapper.selectList(null));
            backup.setNode(list());
            backup.setTunnel(tunnelMapper.selectList(null));
            backup.setUser(userMapper.selectList(null));
            backup.setUserTunnel(userTunnelMapper.selectList(null));
            backup.setSpeedLimit(speedLimitMapper.selectList(null));
            backup.setForward(forwardMapper.selectList(null));

            com.fasterxml.jackson.databind.ObjectMapper mapper = new com.fasterxml.jackson.databind.ObjectMapper();
            mapper.configure(com.fasterxml.jackson.databind.DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false);
            String json = mapper.writeValueAsString(backup);
            return R.ok(json);
        } catch (Exception e) {
            return R.err("导出失败: " + e.getMessage());
        }
    }

    @Override
    @Transactional
    public R importAll(String backupJson) {
        if (!StringUtils.hasText(backupJson)) {
            return R.err("导入数据不能为空");
        }
        try {
            com.fasterxml.jackson.databind.ObjectMapper mapper = new com.fasterxml.jackson.databind.ObjectMapper();
            mapper.configure(com.fasterxml.jackson.databind.DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false);
            BackupData backup = mapper.readValue(backupJson, BackupData.class);

            // ID映射：oldId -> newId
            Map<Long, Long> nodeIdMap = new HashMap<>();
            Map<Long, Long> tunnelIdMap = new HashMap<>();
            Map<Long, Long> userIdMap = new HashMap<>();
            Map<Long, Long> speedLimitIdMap = new HashMap<>();

            Map<String, Integer> result = new HashMap<>();
            result.put("vite_config", 0);
            result.put("node", 0);
            result.put("tunnel", 0);
            result.put("user", 0);
            result.put("user_tunnel", 0);
            result.put("speed_limit", 0);
            result.put("forward", 0);

            // 1. 先导入 vite_config（按name匹配，不涉及ID映射）
            if (backup.getViteConfig() != null) {
                for (ViteConfig config : backup.getViteConfig()) {
                    if (StringUtils.hasText(config.getName())) {
                        upsertViteConfig(config);
                        result.put("vite_config", result.get("vite_config") + 1);
                    }
                }
            }

            // 2. 导入节点（按name去重）
            if (backup.getNode() != null) {
                Map<String, Node> nodeMap = new HashMap<>();
                for (Node n : backup.getNode()) {
                    if (!nodeMap.containsKey(n.getName())) {
                        nodeMap.put(n.getName(), n);
                    }
                }
                for (Node node : nodeMap.values()) {
                    if (node.getId() != null) {
                        Long oldId = node.getId();
                        Long newId = upsertNode(node);
                        if (newId != null) {
                            nodeIdMap.put(oldId, newId);
                        }
                        result.put("node", result.get("node") + 1);
                    }
                }
            }

            // 3. 导入隧道（按name去重）
            if (backup.getTunnel() != null) {
                Map<String, Tunnel> tunnelMap = new HashMap<>();
                for (Tunnel t : backup.getTunnel()) {
                    if (!tunnelMap.containsKey(t.getName())) {
                        tunnelMap.put(t.getName(), t);
                    }
                }
                for (Tunnel tunnel : tunnelMap.values()) {
                    if (tunnel.getId() != null) {
                        Long oldId = tunnel.getId();
                        Long newId = upsertTunnel(tunnel);
                        if (newId != null) {
                            tunnelIdMap.put(oldId, newId);
                        }
                        result.put("tunnel", result.get("tunnel") + 1);
                    }
                }
            }

            // 4. 导入用户（按username去重）
            if (backup.getUser() != null) {
                Map<String, User> userMap = new HashMap<>();
                for (User u : backup.getUser()) {
                    if (!userMap.containsKey(u.getUser())) {
                        userMap.put(u.getUser(), u);
                    }
                }
                for (User user : userMap.values()) {
                    if (user.getId() != null) {
                        Long oldId = user.getId();
                        Long newId = upsertUser(user);
                        if (newId != null) {
                            userIdMap.put(oldId, newId);
                        }
                        result.put("user", result.get("user") + 1);
                    }
                }
            }

            // 5. 导入限速规则（按name去重）
            if (backup.getSpeedLimit() != null) {
                Map<String, SpeedLimit> speedMap = new HashMap<>();
                for (SpeedLimit sl : backup.getSpeedLimit()) {
                    if (!speedMap.containsKey(sl.getName())) {
                        speedMap.put(sl.getName(), sl);
                    }
                }
                for (SpeedLimit sl : speedMap.values()) {
                    if (sl.getId() != null) {
                        // 映射tunnelId
                        if (sl.getTunnelId() != null && tunnelIdMap.containsKey(sl.getTunnelId())) {
                            sl.setTunnelId(tunnelIdMap.get(sl.getTunnelId()));
                        }
                        Long oldId = sl.getId();
                        Long newId = upsertSpeedLimit(sl);
                        if (newId != null) {
                            speedLimitIdMap.put(oldId, newId);
                        }
                        result.put("speed_limit", result.get("speed_limit") + 1);
                    }
                }
            }

            // 6. 导入用户隧道权限（按userId+tunnelId去重）
            if (backup.getUserTunnel() != null) {
                Map<String, UserTunnel> utMap = new HashMap<>();
                for (UserTunnel ut : backup.getUserTunnel()) {
                    String key = ut.getUserId() + "_" + ut.getTunnelId();
                    if (!utMap.containsKey(key)) {
                        utMap.put(key, ut);
                    }
                }
                for (UserTunnel ut : utMap.values()) {
                    if (ut.getId() != null) {
                        // 映射tunnelId
                        if (ut.getTunnelId() != null && tunnelIdMap.containsKey(ut.getTunnelId())) {
                            ut.setTunnelId(tunnelIdMap.get(ut.getTunnelId()).intValue());
                        }
                        // 映射userId
                        if (ut.getUserId() != null && userIdMap.containsKey(ut.getUserId())) {
                            ut.setUserId(userIdMap.get(ut.getUserId()).intValue());
                        }
                        upsertUserTunnel(ut);
                        result.put("user_tunnel", result.get("user_tunnel") + 1);
                    }
                }
            }

            // 7. 导入转发（需要映射tunnelId和userId）
            // 先按 name+tunnelId+userId+remoteAddr 去重，保留第一条
            if (backup.getForward() != null) {
                Map<String, Forward> forwardMap = new HashMap<>();
                for (Forward f : backup.getForward()) {
                    String key = f.getName() + "_" + f.getTunnelId() + "_" + f.getUserId() + "_" + f.getRemoteAddr();
                    if (!forwardMap.containsKey(key)) {
                        forwardMap.put(key, f);
                    }
                }
                for (Forward forward : forwardMap.values()) {
                    if (forward.getId() != null) {
                        // 映射tunnelId (Integer -> Long -> Integer)
                        if (forward.getTunnelId() != null && tunnelIdMap.containsKey(forward.getTunnelId().longValue())) {
                            forward.setTunnelId(tunnelIdMap.get(forward.getTunnelId().longValue()).intValue());
                        }
                        // 映射userId
                        if (forward.getUserId() != null && userIdMap.containsKey(forward.getUserId().longValue())) {
                            forward.setUserId(userIdMap.get(forward.getUserId().longValue()).intValue());
                        }
                        upsertForward(forward);
                        result.put("forward", result.get("forward") + 1);
                    }
                }
            }

            StringBuilder msg = new StringBuilder("导入成功:");
            for (Map.Entry<String, Integer> entry : result.entrySet()) {
                if (entry.getValue() > 0) {
                    msg.append(" ").append(entry.getKey()).append("=").append(entry.getValue());
                }
            }

            return R.ok(msg.toString());
        } catch (Exception e) {
            return R.err("导入失败: " + e.getMessage());
        }
    }

    private void upsertViteConfig(ViteConfig config) {
        QueryWrapper<ViteConfig> q = new QueryWrapper<>();
        q.eq("name", config.getName());
        q.orderByDesc("id");
        List<ViteConfig> existingList = viteConfigMapper.selectList(q);
        ViteConfig existing = existingList.isEmpty() ? null : existingList.get(0);
        if (existing != null) {
            existing.setValue(config.getValue());
            existing.setTime(System.currentTimeMillis());
            viteConfigMapper.updateById(existing);
        } else {
            config.setTime(System.currentTimeMillis());
            viteConfigMapper.insert(config);
        }
    }

    private Long upsertNode(Node node) {
        QueryWrapper<Node> q = new QueryWrapper<>();
        q.eq("name", node.getName());
        q.orderByDesc("id");
        List<Node> existingList = baseMapper.selectList(q);
        Node existing = existingList.isEmpty() ? null : existingList.get(0);
        Long usedId;
        if (existing != null) {
            node.setId(existing.getId());
            node.setUpdatedTime(System.currentTimeMillis());
            baseMapper.updateById(node);
            usedId = existing.getId();
        } else {
            node.setCreatedTime(System.currentTimeMillis());
            node.setUpdatedTime(System.currentTimeMillis());
            baseMapper.insert(node);
            usedId = node.getId();
        }
        return usedId;
    }

    private Long upsertTunnel(Tunnel tunnel) {
        QueryWrapper<Tunnel> q = new QueryWrapper<>();
        q.eq("name", tunnel.getName());
        q.orderByDesc("id");
        List<Tunnel> existingList = tunnelMapper.selectList(q);
        Tunnel existing = existingList.isEmpty() ? null : existingList.get(0);
        Long usedId;
        if (existing != null) {
            tunnel.setId(existing.getId());
            tunnel.setUpdatedTime(System.currentTimeMillis());
            tunnelMapper.updateById(tunnel);
            usedId = existing.getId();
        } else {
            tunnel.setCreatedTime(System.currentTimeMillis());
            tunnel.setUpdatedTime(System.currentTimeMillis());
            tunnelMapper.insert(tunnel);
            usedId = tunnel.getId();
        }
        return usedId;
    }

    private Long upsertUser(User user) {
        QueryWrapper<User> q = new QueryWrapper<>();
        q.eq("user", user.getUser());
        q.orderByDesc("id");
        List<User> existingList = userMapper.selectList(q);
        User existing = existingList.isEmpty() ? null : existingList.get(0);
        Long usedId;
        if (existing != null) {
            user.setId(existing.getId());
            user.setUpdatedTime(System.currentTimeMillis());
            userMapper.updateById(user);
            usedId = existing.getId();
        } else {
            user.setCreatedTime(System.currentTimeMillis());
            user.setUpdatedTime(System.currentTimeMillis());
            userMapper.insert(user);
            usedId = user.getId();
        }
        return usedId;
    }

    private Integer upsertUserTunnel(UserTunnel ut) {
        QueryWrapper<UserTunnel> q = new QueryWrapper<>();
        q.eq("user_id", ut.getUserId()).eq("tunnel_id", ut.getTunnelId());
        q.orderByDesc("id");
        List<UserTunnel> existingList = userTunnelMapper.selectList(q);
        UserTunnel existing = existingList.isEmpty() ? null : existingList.get(0);
        if (existing != null) {
            ut.setId(existing.getId());
            userTunnelMapper.updateById(ut);
            return existing.getId();
        } else {
            userTunnelMapper.insert(ut);
            return ut.getId();
        }
    }

    private Long upsertSpeedLimit(SpeedLimit sl) {
        QueryWrapper<SpeedLimit> q = new QueryWrapper<>();
        q.eq("name", sl.getName()).eq("tunnel_id", sl.getTunnelId());
        q.orderByDesc("id");
        List<SpeedLimit> existingList = speedLimitMapper.selectList(q);
        SpeedLimit existing = existingList.isEmpty() ? null : existingList.get(0);
        Long usedId;
        if (existing != null) {
            sl.setId(existing.getId());
            sl.setUpdatedTime(System.currentTimeMillis());
            speedLimitMapper.updateById(sl);
            usedId = existing.getId();
        } else {
            sl.setCreatedTime(System.currentTimeMillis());
            sl.setUpdatedTime(System.currentTimeMillis());
            speedLimitMapper.insert(sl);
            usedId = sl.getId();
        }
        return usedId;
    }

    private void upsertForward(Forward forward) {
        QueryWrapper<Forward> q = new QueryWrapper<>();
        q.eq("name", forward.getName())
         .eq("tunnel_id", forward.getTunnelId())
         .eq("user_id", forward.getUserId())
         .eq("remote_addr", forward.getRemoteAddr());
        q.orderByDesc("id");
        List<Forward> existingList = forwardMapper.selectList(q);
        Forward existing = existingList.isEmpty() ? null : existingList.get(0);
        if (existing != null) {
            forward.setId(existing.getId());
            forwardMapper.updateById(forward);
        } else {
            forwardMapper.insert(forward);
        }
    }
}
