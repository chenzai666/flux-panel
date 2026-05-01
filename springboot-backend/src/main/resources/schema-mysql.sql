-- MySQL schema for flux-panel beta
-- Executed automatically on startup when DB_TYPE=mysql

CREATE TABLE IF NOT EXISTS `forward` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `user_id` INT NOT NULL,
  `user_name` VARCHAR(100) NOT NULL,
  `name` VARCHAR(100) NOT NULL,
  `tunnel_id` INT NOT NULL,
  `remote_addr` LONGTEXT NOT NULL,
  `strategy` VARCHAR(100) NOT NULL DEFAULT 'fifo',
  `in_flow` BIGINT NOT NULL DEFAULT 0,
  `out_flow` BIGINT NOT NULL DEFAULT 0,
  `created_time` BIGINT NOT NULL,
  `updated_time` BIGINT NOT NULL,
  `status` INT NOT NULL,
  `inx` INT NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `forward_port` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `forward_id` INT NOT NULL,
  `node_id` INT NOT NULL,
  `port` INT NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `node` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(100) NOT NULL,
  `secret` VARCHAR(100) NOT NULL,
  `server_ip` VARCHAR(100) NOT NULL,
  `port` TEXT NOT NULL,
  `interface_name` VARCHAR(200),
  `version` VARCHAR(100),
  `http` INT NOT NULL DEFAULT 0,
  `tls` INT NOT NULL DEFAULT 0,
  `socks` INT NOT NULL DEFAULT 0,
  `created_time` BIGINT NOT NULL,
  `updated_time` BIGINT,
  `status` INT NOT NULL,
  `tcp_listen_addr` VARCHAR(100) NOT NULL DEFAULT '[::]',
  `udp_listen_addr` VARCHAR(100) NOT NULL DEFAULT '[::]',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `speed_limit` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(100) NOT NULL,
  `speed` INT NOT NULL,
  `tunnel_id` INT NOT NULL,
  `tunnel_name` VARCHAR(100) NOT NULL,
  `created_time` BIGINT NOT NULL,
  `updated_time` BIGINT,
  `status` INT NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `statistics_flow` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `user_id` INT NOT NULL,
  `flow` BIGINT NOT NULL,
  `total_flow` BIGINT NOT NULL,
  `time` VARCHAR(100) NOT NULL,
  `created_time` BIGINT NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `tunnel` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(100) NOT NULL,
  `traffic_ratio` DECIMAL(10,1) NOT NULL DEFAULT 1.0,
  `type` INT NOT NULL,
  `protocol` VARCHAR(10) NOT NULL DEFAULT 'tls',
  `flow` INT NOT NULL,
  `created_time` BIGINT NOT NULL,
  `updated_time` BIGINT NOT NULL,
  `status` INT NOT NULL,
  `in_ip` TEXT,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `chain_tunnel` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `tunnel_id` INT NOT NULL,
  `chain_type` VARCHAR(10) NOT NULL,
  `node_id` INT NOT NULL,
  `port` INT,
  `strategy` VARCHAR(10),
  `inx` INT,
  `protocol` VARCHAR(10),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `user` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `user` VARCHAR(100) NOT NULL,
  `pwd` VARCHAR(100) NOT NULL,
  `role_id` INT NOT NULL,
  `exp_time` BIGINT NOT NULL,
  `flow` BIGINT NOT NULL,
  `in_flow` BIGINT NOT NULL DEFAULT 0,
  `out_flow` BIGINT NOT NULL DEFAULT 0,
  `flow_reset_time` BIGINT NOT NULL,
  `num` INT NOT NULL,
  `created_time` BIGINT NOT NULL,
  `updated_time` BIGINT,
  `status` INT NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `user_tunnel` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `user_id` INT NOT NULL,
  `tunnel_id` INT NOT NULL,
  `speed_id` INT,
  `num` INT NOT NULL,
  `flow` BIGINT NOT NULL,
  `in_flow` BIGINT NOT NULL DEFAULT 0,
  `out_flow` BIGINT NOT NULL DEFAULT 0,
  `flow_reset_time` BIGINT NOT NULL,
  `exp_time` BIGINT NOT NULL,
  `status` INT NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `vite_config` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(200) NOT NULL,
  `value` VARCHAR(200) NOT NULL,
  `time` BIGINT NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- -------------------------------------------------------
-- Migrations for upgrades from stable v1.x
-- These ALTER TABLE statements fail silently on fresh installs
-- (column already exists) and succeed when upgrading from stable.
-- Requires continue-on-error: true in application.yml
-- -------------------------------------------------------
ALTER TABLE `node` ADD COLUMN `port` TEXT NOT NULL DEFAULT '' AFTER `server_ip`;
ALTER TABLE `node` ADD COLUMN `interface_name` VARCHAR(200) AFTER `port`;
ALTER TABLE `node` ADD COLUMN `tcp_listen_addr` VARCHAR(100) NOT NULL DEFAULT '[::]' AFTER `status`;
ALTER TABLE `node` ADD COLUMN `udp_listen_addr` VARCHAR(100) NOT NULL DEFAULT '[::]' AFTER `tcp_listen_addr`;
ALTER TABLE `tunnel` ADD COLUMN `in_ip` TEXT AFTER `status`;
ALTER TABLE `forward` ADD COLUMN `inx` INT NOT NULL DEFAULT 0;
