-- ============================================================
-- flux-panel MySQL 升级脚本
-- 稳定版 (v1.x MySQL) → Beta 版 (v2.x MySQL)
-- ============================================================
-- 执行前请先备份数据库！
-- Usage: mysql -u root -p gost < mysql-upgrade.sql
-- ============================================================

SET NAMES utf8mb4;
SET foreign_key_checks = 0;

-- ------------------------------------------------------------
-- 1. node 表：新架构使用 port TEXT 替代 port_sta/port_end，
--    新增 interface_name, tcp_listen_addr, udp_listen_addr
-- ------------------------------------------------------------
ALTER TABLE `node`
  ADD COLUMN IF NOT EXISTS `port` TEXT NOT NULL DEFAULT '[]' AFTER `server_ip`,
  ADD COLUMN IF NOT EXISTS `interface_name` VARCHAR(200) AFTER `port`,
  ADD COLUMN IF NOT EXISTS `tcp_listen_addr` VARCHAR(100) NOT NULL DEFAULT '[::]' AFTER `status`,
  ADD COLUMN IF NOT EXISTS `udp_listen_addr` VARCHAR(100) NOT NULL DEFAULT '[::]' AFTER `tcp_listen_addr`;

-- 将旧 port_sta/port_end 合并迁移为 JSON 数组格式 "[start,end]"
UPDATE `node` SET `port` = CONCAT('[', `port_sta`, ',', `port_end`, ']')
  WHERE `port` = '[]' AND `port_sta` IS NOT NULL AND `port_end` IS NOT NULL;

-- 删除旧列（已迁移后可执行）
ALTER TABLE `node`
  DROP COLUMN IF EXISTS `ip`,
  DROP COLUMN IF EXISTS `port_sta`,
  DROP COLUMN IF EXISTS `port_end`;

-- ------------------------------------------------------------
-- 2. tunnel 表：新架构去掉每条隧道的节点绑定字段，
--    改用 chain_tunnel 表描述链路拓扑
-- ------------------------------------------------------------
ALTER TABLE `tunnel`
  ADD COLUMN IF NOT EXISTS `in_ip` TEXT AFTER `status`;

-- 迁移 in_ip（入口 IP 保留）
UPDATE `tunnel` SET `in_ip` = `in_ip` WHERE `in_ip` IS NOT NULL;

-- 删除旧的节点绑定列
ALTER TABLE `tunnel`
  DROP COLUMN IF EXISTS `in_node_id`,
  DROP COLUMN IF EXISTS `out_node_id`,
  DROP COLUMN IF EXISTS `out_ip`,
  DROP COLUMN IF EXISTS `tcp_listen_addr`,
  DROP COLUMN IF EXISTS `udp_listen_addr`,
  DROP COLUMN IF EXISTS `interface_name`;

-- ------------------------------------------------------------
-- 3. forward 表：端口信息移至 forward_port 表，
--    删除 in_port, out_port, interface_name
-- ------------------------------------------------------------
-- 创建 forward_port 表（如不存在）
CREATE TABLE IF NOT EXISTS `forward_port` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `forward_id` INT NOT NULL,
  `node_id` INT NOT NULL,
  `port` INT NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 迁移旧 in_port 数据到 forward_port（以 tunnel 的 in_node_id 作为 node_id）
-- 注意：此迁移假设每条转发只有一个入口节点（稳定版行为）
-- 如果 tunnel 表中 in_node_id 已被删除，请跳过此步骤
INSERT IGNORE INTO `forward_port` (`forward_id`, `node_id`, `port`)
  SELECT f.`id`, t.`in_node_id`, f.`in_port`
  FROM `forward` f
  JOIN `tunnel` t ON f.`tunnel_id` = t.`id`
  WHERE f.`in_port` IS NOT NULL
    AND t.`in_node_id` IS NOT NULL
  ON DUPLICATE KEY UPDATE `port` = VALUES(`port`);

-- 删除 forward 旧列
ALTER TABLE `forward`
  DROP COLUMN IF EXISTS `in_port`,
  DROP COLUMN IF EXISTS `out_port`,
  DROP COLUMN IF EXISTS `interface_name`;

-- ------------------------------------------------------------
-- 4. 创建 chain_tunnel 表（描述隧道链路拓扑）
-- ------------------------------------------------------------
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

-- 说明：chain_tunnel 需要根据业务重新配置，无法自动从旧数据迁移。
-- 请登录管理面板，为每条隧道重新配置链路节点（入口/中转/出口）。

SET foreign_key_checks = 1;

-- ============================================================
-- 升级完成。请重启 flux-panel 服务并重新配置隧道链路。
-- ============================================================
