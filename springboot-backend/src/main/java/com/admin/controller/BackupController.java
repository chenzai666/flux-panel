package com.admin.controller;

import com.admin.common.annotation.RequireRole;
import com.admin.common.aop.LogAnnotation;
import com.admin.common.lang.R;
import com.admin.entity.*;
import com.admin.service.*;
import com.admin.service.impl.TunnelServiceImpl;
import com.alibaba.fastjson.JSONArray;
import com.alibaba.fastjson.JSONObject;
import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.*;
import java.util.concurrent.CompletableFuture;

@Slf4j
@RestController
@CrossOrigin
@RequestMapping("/api/v1/backup")
public class BackupController extends BaseController {

    @Autowired
    private ChainTunnelService chainTunnelService;

    @Autowired
    private ForwardPortService forwardPortService;

    @Autowired
    private SpeedLimitService speedLimitService;

    @LogAnnotation
    @RequireRole
    @PostMapping("/export")
    public R export() {
        Map<String, Object> backup = new LinkedHashMap<>();
        backup.put("version", "beta");
        backup.put("exportTime", System.currentTimeMillis());
        backup.put("nodes", nodeService.list());
        backup.put("tunnels", tunnelService.list());
        backup.put("chainTunnels", chainTunnelService.list());
        backup.put("forwards", forwardService.list());
        backup.put("forwardPorts", forwardPortService.list());
        backup.put("users", userService.list());
        backup.put("userTunnels", userTunnelService.list());
        backup.put("speedLimits", speedLimitService.list());
        return R.ok(backup);
    }

    @LogAnnotation
    @RequireRole
    @PostMapping("/import")
    @Transactional(rollbackFor = Exception.class)
    public R importBackup(@RequestBody JSONObject backupData) {
        try {
            String version = backupData.getString("version");
            boolean isBeta = "beta".equals(version);

            // Stable v1.x uses singular keys ("node","tunnel","forward"…) and version like "1.x.x"
            // Beta uses plural keys ("nodes","tunnels","forwards"…) and version="beta"
            boolean isStable = !isBeta && (
                backupData.containsKey("node") ||
                backupData.containsKey("tunnel") ||
                backupData.containsKey("forward") ||
                (version != null && version.startsWith("1."))
            );

            if (!isBeta && !isStable) {
                return R.err("无法识别备份格式，请确认备份文件来自 flux-panel");
            }

            clearAllData();

            return isBeta ? importBetaFormat(backupData) : importStableFormat(backupData);

        } catch (Exception e) {
            log.error("导入备份失败", e);
            return R.err("导入失败: " + e.getMessage());
        }
    }

    private void clearAllData() {
        forwardPortService.remove(new QueryWrapper<ForwardPort>().gt("id", 0));
        forwardService.remove(new QueryWrapper<Forward>().gt("id", 0));
        chainTunnelService.remove(new QueryWrapper<ChainTunnel>().gt("id", 0));
        speedLimitService.remove(new QueryWrapper<SpeedLimit>().gt("id", 0));
        userTunnelService.remove(new QueryWrapper<UserTunnel>().gt("id", 0));
        tunnelService.remove(new QueryWrapper<Tunnel>().gt("id", 0));
        // Skip admin users (roleId=0) to prevent lockout
        userService.remove(new QueryWrapper<User>().ne("role_id", 0));
        nodeService.remove(new QueryWrapper<Node>().gt("id", 0));
    }

    private R importBetaFormat(JSONObject data) {
        JSONArray nodesArr = data.getJSONArray("nodes");
        if (nodesArr != null && !nodesArr.isEmpty()) {
            nodeService.saveBatch(nodesArr.toJavaList(Node.class));
        }

        JSONArray tunnelsArr = data.getJSONArray("tunnels");
        if (tunnelsArr != null && !tunnelsArr.isEmpty()) {
            tunnelService.saveBatch(tunnelsArr.toJavaList(Tunnel.class));
        }

        JSONArray chainTunnelsArr = data.getJSONArray("chainTunnels");
        if (chainTunnelsArr != null && !chainTunnelsArr.isEmpty()) {
            chainTunnelService.saveBatch(chainTunnelsArr.toJavaList(ChainTunnel.class));
        }

        JSONArray forwardsArr = data.getJSONArray("forwards");
        if (forwardsArr != null && !forwardsArr.isEmpty()) {
            forwardService.saveBatch(forwardsArr.toJavaList(Forward.class));
        }

        JSONArray forwardPortsArr = data.getJSONArray("forwardPorts");
        if (forwardPortsArr != null && !forwardPortsArr.isEmpty()) {
            forwardPortService.saveBatch(forwardPortsArr.toJavaList(ForwardPort.class));
        }

        JSONArray usersArr = data.getJSONArray("users");
        if (usersArr != null) {
            List<User> users = new ArrayList<>();
            for (int i = 0; i < usersArr.size(); i++) {
                User u = usersArr.getJSONObject(i).toJavaObject(User.class);
                if (u.getRoleId() == null || u.getRoleId() != 0) {
                    users.add(u);
                }
            }
            if (!users.isEmpty()) userService.saveBatch(users);
        }

        JSONArray userTunnelsArr = data.getJSONArray("userTunnels");
        if (userTunnelsArr != null && !userTunnelsArr.isEmpty()) {
            userTunnelService.saveBatch(userTunnelsArr.toJavaList(UserTunnel.class));
        }

        JSONArray speedLimitsArr = data.getJSONArray("speedLimits");
        if (speedLimitsArr != null && !speedLimitsArr.isEmpty()) {
            speedLimitService.saveBatch(speedLimitsArr.toJavaList(SpeedLimit.class));
        }

        CompletableFuture.runAsync(() -> forwardService.syncAllToGost());
        return R.ok("导入成功，正在后台同步转发配置到Gost节点");
    }

    private R importStableFormat(JSONObject data) {
        long now = System.currentTimeMillis();

        // Import nodes — convert portSta/portEnd integer range to port TEXT
        // Stable uses "node" (singular), beta uses "nodes"
        JSONArray nodesArr = coalesce(data.getJSONArray("nodes"), data.getJSONArray("node"));
        if (nodesArr != null) {
            for (int i = 0; i < nodesArr.size(); i++) {
                JSONObject j = nodesArr.getJSONObject(i);
                Node node = new Node();
                node.setId(j.getLong("id"));
                node.setName(j.getString("name"));
                node.setSecret(j.getString("secret"));
                node.setServerIp(coalesce(j.getString("serverIp"), j.getString("server_ip")));
                node.setVersion(j.getString("version"));
                node.setHttp(j.getIntValue("http"));
                node.setTls(j.getIntValue("tls"));
                node.setSocks(j.getIntValue("socks"));
                node.setStatus(j.getInteger("status") != null ? j.getIntValue("status") : 1);
                node.setCreatedTime(j.getLong("createdTime") != null ? j.getLong("createdTime") : now);
                node.setUpdatedTime(now);

                Integer portSta = coalesce(j.getInteger("portSta"), j.getInteger("port_sta"));
                Integer portEnd = coalesce(j.getInteger("portEnd"), j.getInteger("port_end"));
                if (portSta != null && portEnd != null) {
                    node.setPort(portSta + "-" + portEnd);
                } else if (j.getString("port") != null) {
                    node.setPort(j.getString("port"));
                }
                nodeService.save(node);
            }
        }

        // Import tunnels — drop stable-only fields, create chain_tunnel from inNodeId/outNodeId
        // Stable uses "tunnel" (singular), beta uses "tunnels"
        Map<Long, Long> tunnelEntryNodeMap = new HashMap<>();
        JSONArray tunnelsArr = coalesce(data.getJSONArray("tunnels"), data.getJSONArray("tunnel"));
        if (tunnelsArr != null) {
            for (int i = 0; i < tunnelsArr.size(); i++) {
                JSONObject j = tunnelsArr.getJSONObject(i);
                Tunnel tunnel = new Tunnel();
                tunnel.setId(j.getLong("id"));
                tunnel.setName(j.getString("name"));
                tunnel.setType(j.getIntValue("type"));
                tunnel.setFlow(j.getIntValue("flow"));
                tunnel.setTrafficRatio(coalesce(j.getBigDecimal("trafficRatio"), j.getBigDecimal("traffic_ratio")));
                tunnel.setStatus(j.getInteger("status") != null ? j.getIntValue("status") : 1);
                tunnel.setCreatedTime(j.getLong("createdTime") != null ? j.getLong("createdTime") : now);
                tunnel.setUpdatedTime(now);
                tunnelService.save(tunnel);

                Long inNodeId = coalesce(j.getLong("inNodeId"), j.getLong("in_node_id"));
                Long outNodeId = coalesce(j.getLong("outNodeId"), j.getLong("out_node_id"));
                // 出口节点监听端口：稳定版存在 tcpListenAddr，格式如 ":8080" 或 "0.0.0.0:8080"
                Integer exitPort = parseListenPort(
                        coalesce(j.getString("tcpListenAddr"), j.getString("tcp_listen_addr")));

                if (inNodeId != null && inNodeId > 0) {
                    ChainTunnel entry = new ChainTunnel();
                    entry.setTunnelId(tunnel.getId());
                    entry.setChainType(1);
                    entry.setNodeId(inNodeId);
                    chainTunnelService.save(entry);
                    tunnelEntryNodeMap.put(tunnel.getId(), inNodeId);
                }

                if (outNodeId != null && outNodeId > 0) {
                    ChainTunnel exit = new ChainTunnel();
                    exit.setTunnelId(tunnel.getId());
                    exit.setChainType(3);
                    exit.setNodeId(outNodeId);
                    exit.setPort(exitPort);
                    chainTunnelService.save(exit);
                }
            }
        }

        // Import forwards — create forward_port from inPort linked to entry node
        // Stable uses "forward" (singular), beta uses "forwards"
        JSONArray forwardsArr = coalesce(data.getJSONArray("forwards"), data.getJSONArray("forward"));
        if (forwardsArr != null) {
            for (int i = 0; i < forwardsArr.size(); i++) {
                JSONObject j = forwardsArr.getJSONObject(i);
                Forward forward = new Forward();
                forward.setId(j.getLong("id"));
                forward.setUserId(coalesce(j.getInteger("userId"), j.getInteger("user_id")));
                forward.setUserName(coalesce(j.getString("userName"), j.getString("user_name")));
                forward.setName(j.getString("name"));
                forward.setTunnelId(coalesce(j.getInteger("tunnelId"), j.getInteger("tunnel_id")));
                // Stable stores target as remoteAddr (host only) + outPort (int) separately.
                // Beta stores as remoteAddr "host:port". Merge if outPort present and remoteAddr has no port.
                String remoteAddr = coalesce(j.getString("remoteAddr"), j.getString("remote_addr"));
                Integer outPort = coalesce(j.getInteger("outPort"), j.getInteger("out_port"));
                if (remoteAddr != null && outPort != null && !remoteAddr.contains(":")) {
                    remoteAddr = remoteAddr + ":" + outPort;
                }
                forward.setRemoteAddr(remoteAddr);
                forward.setStrategy(j.getString("strategy"));
                forward.setInFlow(coalesce(j.getLong("inFlow"), j.getLong("in_flow")));
                forward.setOutFlow(coalesce(j.getLong("outFlow"), j.getLong("out_flow")));
                forward.setStatus(1);
                forward.setCreatedTime(j.getLong("createdTime") != null ? j.getLong("createdTime") : now);
                forward.setUpdatedTime(now);
                forwardService.save(forward);

                Integer inPort = coalesce(j.getInteger("inPort"), j.getInteger("in_port"));
                Long entryNodeId = forward.getTunnelId() != null
                        ? tunnelEntryNodeMap.get(forward.getTunnelId().longValue()) : null;

                // Fallback: if entryNodeId not in map, query DB for the entry ChainTunnel
                if (entryNodeId == null && forward.getTunnelId() != null) {
                    ChainTunnel entryChain = chainTunnelService.getOne(
                            new QueryWrapper<ChainTunnel>()
                                    .eq("tunnel_id", forward.getTunnelId())
                                    .eq("chain_type", 1));
                    if (entryChain != null) {
                        entryNodeId = entryChain.getNodeId();
                    }
                }

                // Auto-allocate port if inPort is missing or zero
                if ((inPort == null || inPort == 0) && entryNodeId != null) {
                    inPort = findAvailablePort(entryNodeId, forward.getId());
                }

                if (inPort != null && entryNodeId != null) {
                    ForwardPort fp = new ForwardPort();
                    fp.setForwardId(forward.getId());
                    fp.setNodeId(entryNodeId);
                    fp.setPort(inPort);
                    forwardPortService.save(fp);
                }
            }
        }

        // Import users (skip admin)
        // Stable uses "user" (singular), beta uses "users"
        JSONArray usersArr = coalesce(data.getJSONArray("users"), data.getJSONArray("user"));
        if (usersArr != null) {
            for (int i = 0; i < usersArr.size(); i++) {
                JSONObject j = usersArr.getJSONObject(i);
                Integer roleId = coalesce(j.getInteger("roleId"), j.getInteger("role_id"));
                if (roleId != null && roleId == 0) continue;
                userService.save(j.toJavaObject(User.class));
            }
        }

        // Stable uses "user_tunnel", beta uses "userTunnels"
        JSONArray userTunnelsArr = coalesce(data.getJSONArray("userTunnels"), data.getJSONArray("user_tunnel"));
        if (userTunnelsArr != null && !userTunnelsArr.isEmpty()) {
            userTunnelService.saveBatch(userTunnelsArr.toJavaList(UserTunnel.class));
        }

        // Stable uses "speed_limit", beta uses "speedLimits"
        JSONArray speedLimitsArr = coalesce(data.getJSONArray("speedLimits"), data.getJSONArray("speed_limit"));
        if (speedLimitsArr != null && !speedLimitsArr.isEmpty()) {
            speedLimitService.saveBatch(speedLimitsArr.toJavaList(SpeedLimit.class));
        }

        CompletableFuture.runAsync(() -> forwardService.syncAllToGost());
        return R.ok("稳定版数据迁移完成，转发配置正在后台同步到Gost节点，中间链路节点需手动配置");
    }

    /** 在节点可用端口范围内找第一个未被占用的端口（用于稳定版迁移时自动分配） */
    private Integer findAvailablePort(Long nodeId, Long excludeForwardId) {
        Node node = nodeService.getById(nodeId);
        if (node == null || node.getPort() == null) return null;

        Set<Integer> used = new HashSet<>();
        chainTunnelService.list(new QueryWrapper<ChainTunnel>().eq("node_id", nodeId))
                .stream().map(ChainTunnel::getPort).filter(Objects::nonNull).forEach(used::add);
        forwardPortService.list(new QueryWrapper<ForwardPort>().eq("node_id", nodeId)
                .ne("forward_id", excludeForwardId))
                .stream().map(ForwardPort::getPort).filter(Objects::nonNull).forEach(used::add);

        return TunnelServiceImpl.parsePorts(node.getPort()).stream()
                .filter(p -> !used.contains(p)).findFirst().orElse(null);
    }

    /** 解析稳定版 tcpListenAddr，支持 ":8080"、"0.0.0.0:8080"、"8080" 三种格式 */
    private static Integer parseListenPort(String addr) {
        if (addr == null || addr.isBlank()) return null;
        int colonIdx = addr.lastIndexOf(':');
        String portStr = colonIdx >= 0 ? addr.substring(colonIdx + 1) : addr.trim();
        try {
            int port = Integer.parseInt(portStr.trim());
            return (port > 0 && port <= 65535) ? port : null;
        } catch (NumberFormatException e) {
            return null;
        }
    }

    @SafeVarargs
    private static <T> T coalesce(T... values) {
        for (T v : values) {
            if (v != null) return v;
        }
        return null;
    }
}
