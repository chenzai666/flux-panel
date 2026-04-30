package com.admin.service.impl;

import com.admin.entity.*;
import com.admin.mapper.ViteConfigMapper;
import com.admin.service.*;
import com.admin.common.lang.R;
import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Lazy;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.util.*;

/**
 * <p>
 *  网站配置服务实现类
 * </p>
 *
 * @author QAQ
 * @since 2025-07-24
 */
@Service
public class ViteConfigServiceImpl extends ServiceImpl<ViteConfigMapper, ViteConfig> implements ViteConfigService {

    @Lazy
    @Autowired
    private NodeService nodeService;

    @Lazy
    @Autowired
    private TunnelService tunnelService;

    @Lazy
    @Autowired
    private UserService userService;

    @Lazy
    @Autowired
    private UserTunnelService userTunnelService;

    @Lazy
    @Autowired
    private SpeedLimitService speedLimitService;

    @Lazy
    @Autowired
    private ForwardService forwardService;

    // ========== 常量定义 ==========
    
    /** 成功响应消息 */
    private static final String SUCCESS_UPDATE_MSG = "配置更新成功";
    
    /** 错误响应消息 */
    private static final String ERROR_UPDATE_MSG = "配置更新失败";
    private static final String ERROR_CONFIG_NOT_FOUND = "配置不存在";
    private static final String ERROR_CONFIG_NAME_REQUIRED = "配置名称不能为空";
    private static final String ERROR_CONFIG_VALUE_REQUIRED = "配置值不能为空";

    // ========== 公共接口实现 ==========

    /**
     * 获取所有网站配置
     * 
     * @return 包含所有配置的Map
     */
    @Override
    public R getConfigs() {
        List<ViteConfig> configList = this.list();
        Map<String, String> configMap = new HashMap<>();
        
        for (ViteConfig config : configList) {
            configMap.put(config.getName(), config.getValue());
        }
        
        return R.ok(configMap);
    }

    /**
     * 根据配置名称获取配置值
     * 
     * @param name 配置名称
     * @return 配置响应对象
     */
    @Override
    public R getConfigByName(String name) {
        if (!StringUtils.hasText(name)) {
            return R.err(ERROR_CONFIG_NAME_REQUIRED);
        }

        QueryWrapper<ViteConfig> queryWrapper = new QueryWrapper<>();
        queryWrapper.eq("name", name);
        ViteConfig config = this.getOne(queryWrapper);

        if (config == null) {
            return R.err(ERROR_CONFIG_NOT_FOUND);
        }

        return R.ok(config);
    }

    /**
     * 批量更新网站配置
     * 
     * @param configMap 配置Map
     * @return 更新结果响应
     */
    @Override
    public R updateConfigs(Map<String, String> configMap) {
        if (configMap == null || configMap.isEmpty()) {
            return R.err("配置数据不能为空");
        }

        try {
            for (Map.Entry<String, String> entry : configMap.entrySet()) {
                String name = entry.getKey();
                String value = entry.getValue();
                
                if (!StringUtils.hasText(name)) {
                    continue; // 跳过无效的配置名
                }
                
                updateOrCreateConfig(name, value);
            }
            return R.ok(SUCCESS_UPDATE_MSG);
        } catch (Exception e) {
            return R.err(ERROR_UPDATE_MSG + ": " + e.getMessage());
        }
    }

    /**
     * 更新单个配置项
     * 
     * @param name 配置名
     * @param value 配置值
     * @return 更新结果响应
     */
    @Override
    public R updateConfig(String name, String value) {
        // 1. 验证必填字段
        if (!StringUtils.hasText(name)) {
            return R.err(ERROR_CONFIG_NAME_REQUIRED);
        }
        if (!StringUtils.hasText(value)) {
            return R.err(ERROR_CONFIG_VALUE_REQUIRED);
        }

        try {
            updateOrCreateConfig(name, value);
            return R.ok(SUCCESS_UPDATE_MSG);
        } catch (Exception e) {
            return R.err(ERROR_UPDATE_MSG + ": " + e.getMessage());
        }
    }

    // ========== 私有辅助方法 ==========

    /**
     * 更新或创建配置项
     * 如果配置存在则更新，不存在则创建
     */
    private void updateOrCreateConfig(String name, String value) {
        QueryWrapper<ViteConfig> queryWrapper = new QueryWrapper<>();
        queryWrapper.eq("name", name);
        ViteConfig existingConfig = this.getOne(queryWrapper);

        if (existingConfig != null) {
            // 更新现有配置
            existingConfig.setValue(value);
            existingConfig.setTime(System.currentTimeMillis());
            this.updateById(existingConfig);
        } else {
            // 创建新配置
            ViteConfig newConfig = new ViteConfig();
            newConfig.setName(name);
            newConfig.setValue(value);
            newConfig.setTime(System.currentTimeMillis());
            this.save(newConfig);
        }
    }

    // ========== 备份导入导出 ==========

    /**
     * 导出所有配置数据
     */
    @Override
    public R exportBackup() {
        try {
            Map<String, Object> backup = new LinkedHashMap<>();
            backup.put("version", "1.5.7");
            backup.put("exportTime", System.currentTimeMillis());
            backup.put("exportTimeStr", new Date().toString());

            // 导出 vite_config
            List<ViteConfig> configList = this.list();
            List<Map<String, Object>> configData = new ArrayList<>();
            for (ViteConfig config : configList) {
                Map<String, Object> item = new LinkedHashMap<>();
                item.put("id", config.getId());
                item.put("name", config.getName());
                item.put("value", config.getValue());
                item.put("time", config.getTime());
                configData.add(item);
            }
            backup.put("vite_config", configData);

            // 导出 node
            List<Node> nodeList = nodeService.list();
            List<Map<String, Object>> nodeData = new ArrayList<>();
            for (Node node : nodeList) {
                Map<String, Object> item = new LinkedHashMap<>();
                item.put("id", node.getId());
                item.put("name", node.getName());
                item.put("secret", node.getSecret());
                item.put("ip", node.getIp());
                item.put("serverIp", node.getServerIp());
                item.put("version", node.getVersion());
                item.put("portSta", node.getPortSta());
                item.put("portEnd", node.getPortEnd());
                item.put("http", node.getHttp());
                item.put("tls", node.getTls());
                item.put("socks", node.getSocks());
                item.put("createdTime", node.getCreatedTime());
                item.put("updatedTime", node.getUpdatedTime());
                item.put("status", node.getStatus());
                nodeData.add(item);
            }
            backup.put("node", nodeData);

            // 导出 tunnel
            List<Tunnel> tunnelList = tunnelService.list();
            List<Map<String, Object>> tunnelData = new ArrayList<>();
            for (Tunnel tunnel : tunnelList) {
                Map<String, Object> item = new LinkedHashMap<>();
                item.put("id", tunnel.getId());
                item.put("name", tunnel.getName());
                item.put("inNodeId", tunnel.getInNodeId());
                item.put("inIp", tunnel.getInIp());
                item.put("outNodeId", tunnel.getOutNodeId());
                item.put("outIp", tunnel.getOutIp());
                item.put("type", tunnel.getType());
                item.put("flow", tunnel.getFlow());
                item.put("protocol", tunnel.getProtocol());
                item.put("trafficRatio", tunnel.getTrafficRatio());
                item.put("tcpListenAddr", tunnel.getTcpListenAddr());
                item.put("udpListenAddr", tunnel.getUdpListenAddr());
                item.put("interfaceName", tunnel.getInterfaceName());
                item.put("createdTime", tunnel.getCreatedTime());
                item.put("updatedTime", tunnel.getUpdatedTime());
                item.put("status", tunnel.getStatus());
                tunnelData.add(item);
            }
            backup.put("tunnel", tunnelData);

            // 导出 user
            List<User> userList = userService.list();
            List<Map<String, Object>> userData = new ArrayList<>();
            for (User user : userList) {
                Map<String, Object> item = new LinkedHashMap<>();
                item.put("id", user.getId());
                item.put("user", user.getUser());
                item.put("pwd", user.getPwd());
                item.put("roleId", user.getRoleId());
                item.put("expTime", user.getExpTime());
                item.put("flow", user.getFlow());
                item.put("inFlow", user.getInFlow());
                item.put("outFlow", user.getOutFlow());
                item.put("num", user.getNum());
                item.put("flowResetTime", user.getFlowResetTime());
                item.put("createdTime", user.getCreatedTime());
                item.put("updatedTime", user.getUpdatedTime());
                item.put("status", user.getStatus());
                userData.add(item);
            }
            backup.put("user", userData);

            // 导出 user_tunnel
            List<UserTunnel> userTunnelList = userTunnelService.list();
            List<Map<String, Object>> userTunnelData = new ArrayList<>();
            for (UserTunnel ut : userTunnelList) {
                Map<String, Object> item = new LinkedHashMap<>();
                item.put("id", ut.getId());
                item.put("userId", ut.getUserId());
                item.put("tunnelId", ut.getTunnelId());
                item.put("flow", ut.getFlow());
                item.put("inFlow", ut.getInFlow());
                item.put("outFlow", ut.getOutFlow());
                item.put("flowResetTime", ut.getFlowResetTime());
                item.put("expTime", ut.getExpTime());
                item.put("speedId", ut.getSpeedId());
                item.put("num", ut.getNum());
                item.put("status", ut.getStatus());
                userTunnelData.add(item);
            }
            backup.put("user_tunnel", userTunnelData);

            // 导出 speed_limit
            List<SpeedLimit> speedLimitList = speedLimitService.list();
            List<Map<String, Object>> speedLimitData = new ArrayList<>();
            for (SpeedLimit sl : speedLimitList) {
                Map<String, Object> item = new LinkedHashMap<>();
                item.put("id", sl.getId());
                item.put("name", sl.getName());
                item.put("speed", sl.getSpeed());
                item.put("tunnelId", sl.getTunnelId());
                item.put("tunnelName", sl.getTunnelName());
                item.put("createdTime", sl.getCreatedTime());
                item.put("updatedTime", sl.getUpdatedTime());
                item.put("status", sl.getStatus());
                speedLimitData.add(item);
            }
            backup.put("speed_limit", speedLimitData);

            // 导出 forward
            List<Forward> forwardList = forwardService.list();
            List<Map<String, Object>> forwardData = new ArrayList<>();
            for (Forward fwd : forwardList) {
                Map<String, Object> item = new LinkedHashMap<>();
                item.put("id", fwd.getId());
                item.put("userId", fwd.getUserId());
                item.put("userName", fwd.getUserName());
                item.put("name", fwd.getName());
                item.put("tunnelId", fwd.getTunnelId());
                item.put("inPort", fwd.getInPort());
                item.put("outPort", fwd.getOutPort());
                item.put("remoteAddr", fwd.getRemoteAddr());
                item.put("interfaceName", fwd.getInterfaceName());
                item.put("strategy", fwd.getStrategy());
                item.put("inFlow", fwd.getInFlow());
                item.put("outFlow", fwd.getOutFlow());
                item.put("inx", fwd.getInx());
                item.put("createdTime", fwd.getCreatedTime());
                item.put("updatedTime", fwd.getUpdatedTime());
                item.put("status", fwd.getStatus());
                forwardData.add(item);
            }
            backup.put("forward", forwardData);

            return R.ok(backup);
        } catch (Exception e) {
            return R.err("导出备份失败: " + e.getMessage());
        }
    }

    /**
     * 导入备份数据
     * 导入顺序：vite_config → node → tunnel → user → user_tunnel → speed_limit → forward
     * 使用 id 映射表确保关联关系正确（因为自增 id 会变）
     */
    @Override
    @Transactional
    public R importBackup(Map<String, Object> backupData) {
        if (backupData == null || backupData.isEmpty()) {
            return R.err("备份数据不能为空");
        }

        try {
            Map<String, Object> result = new LinkedHashMap<>();
            int totalImported = 0;
            int totalFailed = 0;
            List<String> details = new ArrayList<>();

            // ID 映射表：旧id → 新id
            Map<Long, Long> nodeIdMap = new HashMap<>();
            Map<Long, Long> tunnelIdMap = new HashMap<>();
            Map<Long, Long> userIdMap = new HashMap<>();

            // 导入 vite_config
            if (backupData.containsKey("vite_config")) {
                int[] counts = importViteConfig((List<Map<String, Object>>) backupData.get("vite_config"));
                details.add("网站配置: " + counts[0] + "条成功" + (counts[1] > 0 ? ", " + counts[1] + "条失败" : ""));
                totalImported += counts[0];
                totalFailed += counts[1];
            }

            // 导入 node（记录 id 映射）
            if (backupData.containsKey("node")) {
                int[] counts = importNode((List<Map<String, Object>>) backupData.get("node"), nodeIdMap);
                details.add("节点: " + counts[0] + "条成功" + (counts[1] > 0 ? ", " + counts[1] + "条失败" : ""));
                totalImported += counts[0];
                totalFailed += counts[1];
            }

            // 导入 tunnel（记录 id 映射，使用 nodeIdMap 替换 inNodeId/outNodeId）
            if (backupData.containsKey("tunnel")) {
                int[] counts = importTunnel((List<Map<String, Object>>) backupData.get("tunnel"), nodeIdMap, tunnelIdMap);
                details.add("隧道: " + counts[0] + "条成功" + (counts[1] > 0 ? ", " + counts[1] + "条失败" : ""));
                totalImported += counts[0];
                totalFailed += counts[1];
            }

            // 导入 user（记录 id 映射）
            if (backupData.containsKey("user")) {
                int[] counts = importUser((List<Map<String, Object>>) backupData.get("user"), userIdMap);
                details.add("用户: " + counts[0] + "条成功" + (counts[1] > 0 ? ", " + counts[1] + "条失败" : ""));
                totalImported += counts[0];
                totalFailed += counts[1];
            }

            // 导入 user_tunnel（使用 userIdMap 和 tunnelIdMap 替换关联 id）
            if (backupData.containsKey("user_tunnel")) {
                int[] counts = importUserTunnel((List<Map<String, Object>>) backupData.get("user_tunnel"), userIdMap, tunnelIdMap);
                details.add("用户隧道: " + counts[0] + "条成功" + (counts[1] > 0 ? ", " + counts[1] + "条失败" : ""));
                totalImported += counts[0];
                totalFailed += counts[1];
            }

            // 导入 speed_limit
            if (backupData.containsKey("speed_limit")) {
                int[] counts = importSpeedLimit((List<Map<String, Object>>) backupData.get("speed_limit"));
                details.add("限速规则: " + counts[0] + "条成功" + (counts[1] > 0 ? ", " + counts[1] + "条失败" : ""));
                totalImported += counts[0];
                totalFailed += counts[1];
            }

            // 导入 forward（使用 userIdMap 和 tunnelIdMap 替换关联 id）
            if (backupData.containsKey("forward")) {
                int[] counts = importForward((List<Map<String, Object>>) backupData.get("forward"), userIdMap, tunnelIdMap);
                details.add("转发: " + counts[0] + "条成功" + (counts[1] > 0 ? ", " + counts[1] + "条失败" : ""));
                totalImported += counts[0];
                totalFailed += counts[1];
            }

            result.put("totalImported", totalImported);
            result.put("totalFailed", totalFailed);
            result.put("details", details);

            if (totalFailed == 0) {
                result.put("msg", "导入完成，共导入" + totalImported + "条数据");
            } else {
                result.put("msg", "导入完成，成功" + totalImported + "条，失败" + totalFailed + "条");
            }
            return R.ok(result);
        } catch (Exception e) {
            return R.err("导入备份失败: " + e.getMessage());
        }
    }

    // ========== 各表导入方法 ==========

    private int[] importViteConfig(List<Map<String, Object>> items) {
        int success = 0, fail = 0;
        for (Map<String, Object> item : items) {
            try {
                String name = item.get("name") != null ? item.get("name").toString() : null;
                String value = item.get("value") != null ? item.get("value").toString() : "";
                if (name == null) { fail++; continue; }
                updateOrCreateConfig(name, value);
                success++;
            } catch (Exception e) { fail++; }
        }
        return new int[]{success, fail};
    }

    private int[] importNode(List<Map<String, Object>> items, Map<Long, Long> nodeIdMap) {
        int success = 0, fail = 0;
        for (Map<String, Object> item : items) {
            try {
                Long oldId = getLong(item, "id");
                String secret = getStr(item, "secret");
                // 按 secret 判重，secret 唯一标识节点
                if (secret != null) {
                    Node existing = nodeService.getOne(new QueryWrapper<Node>().eq("secret", secret));
                    if (existing != null) {
                        if (oldId != null && oldId > 0) nodeIdMap.put(oldId, existing.getId());
                        fail++; continue;
                    }
                }
                Node node = new Node();
                node.setName(getStr(item, "name"));
                node.setSecret(secret);
                node.setIp(getStr(item, "ip"));
                node.setServerIp(getStr(item, "serverIp"));
                node.setVersion(getStr(item, "version"));
                node.setPortSta(getInt(item, "portSta"));
                node.setPortEnd(getInt(item, "portEnd"));
                node.setHttp(getInt(item, "http"));
                node.setTls(getInt(item, "tls"));
                node.setSocks(getInt(item, "socks"));
                node.setCreatedTime(getLong(item, "createdTime"));
                node.setUpdatedTime(getLong(item, "updatedTime"));
                node.setStatus(getInt(item, "status"));
                nodeService.save(node);
                if (oldId != null && oldId > 0) {
                    nodeIdMap.put(oldId, node.getId());
                }
                success++;
            } catch (Exception e) { fail++; }
        }
        return new int[]{success, fail};
    }

    private int[] importTunnel(List<Map<String, Object>> items, Map<Long, Long> nodeIdMap, Map<Long, Long> tunnelIdMap) {
        int success = 0, fail = 0;
        for (Map<String, Object> item : items) {
            try {
                Long oldId = getLong(item, "id");
                Tunnel tunnel = new Tunnel();
                tunnel.setName(getStr(item, "name"));
                // 使用 nodeIdMap 映射 inNodeId 和 outNodeId
                Long oldInNodeId = getLong(item, "inNodeId");
                tunnel.setInNodeId(oldInNodeId != null ? nodeIdMap.getOrDefault(oldInNodeId, oldInNodeId) : null);
                tunnel.setInIp(getStr(item, "inIp"));
                Long oldOutNodeId = getLong(item, "outNodeId");
                tunnel.setOutNodeId(oldOutNodeId != null ? nodeIdMap.getOrDefault(oldOutNodeId, oldOutNodeId) : null);
                tunnel.setOutIp(getStr(item, "outIp"));
                tunnel.setType(getInt(item, "type"));
                tunnel.setFlow(getInt(item, "flow"));
                tunnel.setProtocol(getStr(item, "protocol"));
                if (item.get("trafficRatio") != null) {
                    tunnel.setTrafficRatio(new java.math.BigDecimal(item.get("trafficRatio").toString()));
                }
                tunnel.setTcpListenAddr(getStr(item, "tcpListenAddr"));
                tunnel.setUdpListenAddr(getStr(item, "udpListenAddr"));
                tunnel.setInterfaceName(getStr(item, "interfaceName"));
                tunnel.setCreatedTime(getLong(item, "createdTime"));
                tunnel.setUpdatedTime(getLong(item, "updatedTime"));
                tunnel.setStatus(getInt(item, "status"));
                tunnelService.save(tunnel);
                if (oldId != null && oldId > 0) {
                    tunnelIdMap.put(oldId, tunnel.getId());
                }
                success++;
            } catch (Exception e) { fail++; }
        }
        return new int[]{success, fail};
    }

    private int[] importUser(List<Map<String, Object>> items, Map<Long, Long> userIdMap) {
        int success = 0, fail = 0;
        for (Map<String, Object> item : items) {
            try {
                Long oldId = getLong(item, "id");
                String username = getStr(item, "user");
                // 按用户名判重
                if (username != null) {
                    User existing = userService.getOne(new QueryWrapper<User>().eq("user", username));
                    if (existing != null) {
                        if (oldId != null && oldId > 0) userIdMap.put(oldId, existing.getId());
                        fail++; continue;
                    }
                }
                User user = new User();
                user.setUser(username);
                user.setPwd(getStr(item, "pwd"));
                user.setRoleId(getInt(item, "roleId"));
                user.setExpTime(getLong(item, "expTime"));
                user.setFlow(getLong(item, "flow"));
                user.setInFlow(getLong(item, "inFlow"));
                user.setOutFlow(getLong(item, "outFlow"));
                user.setNum(getInt(item, "num"));
                user.setFlowResetTime(getLong(item, "flowResetTime"));
                user.setCreatedTime(getLong(item, "createdTime"));
                user.setUpdatedTime(getLong(item, "updatedTime"));
                user.setStatus(getInt(item, "status"));
                userService.save(user);
                if (oldId != null && oldId > 0) {
                    userIdMap.put(oldId, user.getId());
                }
                success++;
            } catch (Exception e) { fail++; }
        }
        return new int[]{success, fail};
    }

    private int[] importUserTunnel(List<Map<String, Object>> items, Map<Long, Long> userIdMap, Map<Long, Long> tunnelIdMap) {
        int success = 0, fail = 0;
        for (Map<String, Object> item : items) {
            try {
                Long oldUserId = getLong(item, "userId");
                Long oldTunnelId = getLong(item, "tunnelId");
                Long newUserId = oldUserId != null ? userIdMap.getOrDefault(oldUserId, oldUserId) : null;
                Long newTunnelId = oldTunnelId != null ? tunnelIdMap.getOrDefault(oldTunnelId, oldTunnelId) : null;
                // 按 (user_id, tunnel_id) 判重
                if (newUserId != null && newTunnelId != null) {
                    long count = userTunnelService.count(new QueryWrapper<UserTunnel>()
                            .eq("user_id", newUserId).eq("tunnel_id", newTunnelId));
                    if (count > 0) { fail++; continue; }
                }
                UserTunnel ut = new UserTunnel();
                ut.setUserId(newUserId != null ? newUserId.intValue() : null);
                ut.setTunnelId(newTunnelId != null ? newTunnelId.intValue() : null);
                ut.setFlow(getLong(item, "flow"));
                ut.setInFlow(getLong(item, "inFlow"));
                ut.setOutFlow(getLong(item, "outFlow"));
                ut.setFlowResetTime(getLong(item, "flowResetTime"));
                ut.setExpTime(getLong(item, "expTime"));
                ut.setSpeedId(getInt(item, "speedId"));
                ut.setNum(getInt(item, "num"));
                ut.setStatus(getInt(item, "status"));
                userTunnelService.save(ut);
                success++;
            } catch (Exception e) { fail++; }
        }
        return new int[]{success, fail};
    }

    private int[] importSpeedLimit(List<Map<String, Object>> items) {
        int success = 0, fail = 0;
        for (Map<String, Object> item : items) {
            try {
                SpeedLimit sl = new SpeedLimit();
                sl.setName(getStr(item, "name"));
                sl.setSpeed(getInt(item, "speed"));
                sl.setTunnelId(getLong(item, "tunnelId"));
                sl.setTunnelName(getStr(item, "tunnelName"));
                sl.setCreatedTime(getLong(item, "createdTime"));
                sl.setUpdatedTime(getLong(item, "updatedTime"));
                sl.setStatus(getInt(item, "status"));
                speedLimitService.save(sl);
                success++;
            } catch (Exception e) { fail++; }
        }
        return new int[]{success, fail};
    }

    private int[] importForward(List<Map<String, Object>> items, Map<Long, Long> userIdMap, Map<Long, Long> tunnelIdMap) {
        int success = 0, fail = 0;
        for (Map<String, Object> item : items) {
            try {
                String name = getStr(item, "name");
                Long oldTunnelId = getLong(item, "tunnelId");
                Long newTunnelId = oldTunnelId != null ? tunnelIdMap.getOrDefault(oldTunnelId, oldTunnelId) : null;

                // 跳过已存在的同名转发（同一隧道下），防止重复导入导致数据库错误
                if (name != null && newTunnelId != null) {
                    long count = forwardService.count(new QueryWrapper<Forward>()
                            .eq("name", name).eq("tunnel_id", newTunnelId));
                    if (count > 0) { fail++; continue; }
                }

                Forward fwd = new Forward();
                Long oldUserId = getLong(item, "userId");
                fwd.setUserId(oldUserId != null ? userIdMap.getOrDefault(oldUserId, oldUserId).intValue() : null);
                fwd.setUserName(getStr(item, "userName"));
                fwd.setName(name);
                fwd.setTunnelId(newTunnelId != null ? newTunnelId.intValue() : null);
                fwd.setInPort(getInt(item, "inPort"));
                fwd.setOutPort(getInt(item, "outPort"));
                fwd.setRemoteAddr(getStr(item, "remoteAddr"));
                fwd.setInterfaceName(getStr(item, "interfaceName"));
                fwd.setStrategy(getStr(item, "strategy"));
                fwd.setInFlow(getLong(item, "inFlow"));
                fwd.setOutFlow(getLong(item, "outFlow"));
                fwd.setInx(getInt(item, "inx"));
                fwd.setCreatedTime(getLong(item, "createdTime"));
                fwd.setUpdatedTime(getLong(item, "updatedTime"));
                fwd.setStatus(getInt(item, "status"));
                // 先持久化到数据库（原代码 Bug：只调用 updateForwardA 而未 save，导致转发不入库）
                forwardService.save(fwd);
                // 再启动 GOST 服务（仅对启用状态的转发）
                if (Integer.valueOf(1).equals(fwd.getStatus())) {
                    forwardService.updateForwardA(fwd);
                }
                success++;
            } catch (Exception e) { fail++; }
        }
        return new int[]{success, fail};
    }

    // ========== 类型转换辅助方法 ==========

    private String getStr(Map<String, Object> item, String key) {
        Object val = item.get(key);
        return val != null ? val.toString() : null;
    }

    private Integer getInt(Map<String, Object> item, String key) {
        Object val = item.get(key);
        if (val == null) return null;
        if (val instanceof Number) return ((Number) val).intValue();
        try { return Integer.parseInt(val.toString()); } catch (Exception e) { return null; }
    }

    private Long getLong(Map<String, Object> item, String key) {
        Object val = item.get(key);
        if (val == null) return null;
        if (val instanceof Number) return ((Number) val).longValue();
        try { return Long.parseLong(val.toString()); } catch (Exception e) { return null; }
    }

}
