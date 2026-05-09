package com.admin.entity;

import lombok.Data;
import java.util.List;

@Data
public class BackupData {
    private String version;
    private Long exportTime;
    private List<ViteConfig> viteConfig;
    private List<Node> node;
    private List<Tunnel> tunnel;
    private List<User> user;
    private List<UserTunnel> userTunnel;
    private List<SpeedLimit> speedLimit;
    private List<Forward> forward;
}
