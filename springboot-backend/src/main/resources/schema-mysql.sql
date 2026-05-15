CREATE TABLE IF NOT EXISTS `node` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `secret` varchar(100) NOT NULL,
  `ip` text,
  `server_ip` varchar(100) NOT NULL DEFAULT '',
  `version` varchar(100) DEFAULT NULL,
  `port_sta` int(11) NOT NULL DEFAULT 0,
  `port_end` int(11) NOT NULL DEFAULT 65535,
  `http` int(11) NOT NULL DEFAULT 0,
  `tls` int(11) NOT NULL DEFAULT 0,
  `socks` int(11) NOT NULL DEFAULT 0,
  `sort_order` int(11) NOT NULL DEFAULT 0,
  `created_time` bigint(20) NOT NULL,
  `updated_time` bigint(20) DEFAULT NULL,
  `status` int(11) NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `tunnel` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `in_node_id` bigint(20) DEFAULT NULL,
  `in_ip` text,
  `out_node_id` bigint(20) DEFAULT NULL,
  `out_ip` text,
  `type` int(11) NOT NULL DEFAULT 1,
  `flow` int(11) NOT NULL DEFAULT 1,
  `protocol` varchar(10) NOT NULL DEFAULT 'tls',
  `traffic_ratio` decimal(10,2) NOT NULL DEFAULT 1.00,
  `tcp_listen_addr` varchar(100) DEFAULT NULL,
  `udp_listen_addr` varchar(100) DEFAULT NULL,
  `interface_name` varchar(200) DEFAULT NULL,
  `created_time` bigint(20) NOT NULL,
  `updated_time` bigint(20) NOT NULL,
  `status` int(11) NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `forward` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `user_name` varchar(100) NOT NULL,
  `name` varchar(100) NOT NULL,
  `tunnel_id` int(11) NOT NULL,
  `in_port` int(11) DEFAULT NULL,
  `out_port` int(11) DEFAULT NULL,
  `remote_addr` text,
  `interface_name` varchar(200) DEFAULT NULL,
  `strategy` varchar(100) NOT NULL DEFAULT 'fifo',
  `in_flow` bigint(20) NOT NULL DEFAULT 0,
  `out_flow` bigint(20) NOT NULL DEFAULT 0,
  `inx` int(11) NOT NULL DEFAULT 0,
  `created_time` bigint(20) NOT NULL,
  `updated_time` bigint(20) NOT NULL,
  `status` int(11) NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `user` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `user` varchar(100) NOT NULL,
  `pwd` varchar(100) NOT NULL,
  `role_id` int(11) NOT NULL DEFAULT 1,
  `exp_time` bigint(20) NOT NULL DEFAULT 0,
  `flow` bigint(20) NOT NULL DEFAULT 0,
  `in_flow` bigint(20) NOT NULL DEFAULT 0,
  `out_flow` bigint(20) NOT NULL DEFAULT 0,
  `flow_reset_time` bigint(20) NOT NULL DEFAULT 0,
  `num` int(11) NOT NULL DEFAULT 0,
  `created_time` bigint(20) NOT NULL,
  `updated_time` bigint(20) DEFAULT NULL,
  `status` int(11) NOT NULL DEFAULT 1,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `user_tunnel` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `tunnel_id` int(11) NOT NULL,
  `speed_id` int(11) DEFAULT NULL,
  `num` int(11) NOT NULL DEFAULT 0,
  `flow` bigint(20) NOT NULL DEFAULT 0,
  `in_flow` bigint(20) NOT NULL DEFAULT 0,
  `out_flow` bigint(20) NOT NULL DEFAULT 0,
  `flow_reset_time` bigint(20) NOT NULL DEFAULT 0,
  `exp_time` bigint(20) NOT NULL DEFAULT 0,
  `status` int(11) NOT NULL DEFAULT 1,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `speed_limit` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `speed` int(11) NOT NULL,
  `tunnel_id` bigint(20) NOT NULL,
  `tunnel_name` varchar(100) NOT NULL,
  `created_time` bigint(20) NOT NULL,
  `updated_time` bigint(20) DEFAULT NULL,
  `status` int(11) NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `statistics_flow` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `flow` bigint(20) NOT NULL DEFAULT 0,
  `total_flow` bigint(20) NOT NULL DEFAULT 0,
  `time` varchar(100) NOT NULL,
  `created_time` bigint(20) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `vite_config` (
  `id` int(10) NOT NULL AUTO_INCREMENT,
  `name` varchar(200) NOT NULL,
  `value` varchar(200) NOT NULL,
  `time` bigint(20) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
