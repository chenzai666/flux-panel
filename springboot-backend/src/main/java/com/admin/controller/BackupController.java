package com.admin.controller;

import com.admin.common.annotation.RequireRole;
import com.admin.common.aop.LogAnnotation;
import com.admin.common.lang.R;
import com.admin.entity.*;
import com.admin.service.*;
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

            // Detect stable v1.x format: tunnels contain inNodeId / in_node_id
            JSONArray tunnelsArr = backupData.getJSONArray("tunnels");
            boolean isStable = !isBeta && tunnelsArr != null && !tunnelsArr.isEmpty() &&
                    (tunnelsArr.getJSONObject(0).containsKey("inNodeId") ||
                     tunnelsArr.getJSONObject(0).containsKey("in_node_id"));

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
        forwardPortService.remove(new QueryWrapper<>());
        forwardService.remove(new QueryWrapper<>());
        chainTunnelService.remove(new QueryWrapper<>());
        speedLimitService.remove(new QueryWrapper<>());
        userTunnelService.remove(new QueryWrapper<>());
        tunnelService.remove(new QueryWrapper<>());
        // Skip admin users (roleId=0) to prevent lockout
        userService.remove(new QueryWrapper<User>().ne("role_id", 0));
        nodeService.remove(new QueryWrapper<>());
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
        JSONArray nodesArr = data.getJSONArray("nodes");
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
        Map<Long, Long> tunnelEntryNodeMap = new HashMap<>();
        JSONArray tunnelsArr = data.getJSONArray("tunnels");
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
        JSONArray forwardsArr = data.getJSONArray("forwards");
        if (forwardsArr != null) {
            for (int i = 0; i < forwardsArr.size(); i++) {
                JSONObject j = forwardsArr.getJSONObject(i);
                Forward forward = new Forward();
                forward.setId(j.getLong("id"));
                forward.setUserId(coalesce(j.getInteger("userId"), j.getInteger("user_id")));
                forward.setUserName(coalesce(j.getString("userName"), j.getString("user_name")));
                forward.setName(j.getString("name"));
                forward.setTunnelId(coalesce(j.getInteger("tunnelId"), j.getInteger("tunnel_id")));
                forward.setRemoteAddr(coalesce(j.getString("remoteAddr"), j.getString("remote_addr")));
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
        JSONArray usersArr = data.getJSONArray("users");
        if (usersArr != null) {
            for (int i = 0; i < usersArr.size(); i++) {
                JSONObject j = usersArr.getJSONObject(i);
                Integer roleId = coalesce(j.getInteger("roleId"), j.getInteger("role_id"));
                if (roleId != null && roleId == 0) continue;
                userService.save(j.toJavaObject(User.class));
            }
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
        return R.ok("稳定版数据迁移完成，转发配置正在后台同步到Gost节点，中间链路节点需手动配置");
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
