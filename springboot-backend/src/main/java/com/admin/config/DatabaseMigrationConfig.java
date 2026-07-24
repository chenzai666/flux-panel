package com.admin.config;

import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.DatabaseMetaData;
import java.sql.ResultSet;
import java.sql.Statement;

/**
 * 启动时执行数据库结构迁移，兼容旧版本升级场景，对全新安装无副作用
 */
@Slf4j
@Component
@Order(1)
public class DatabaseMigrationConfig implements ApplicationRunner {

    private final DataSource dataSource;

    public DatabaseMigrationConfig(DataSource dataSource) {
        this.dataSource = dataSource;
    }

    @Override
    public void run(ApplicationArguments args) throws Exception {
        try (Connection conn = dataSource.getConnection()) {
            // 旧版本 node 表没有 sort_order 字段，自动补全
            addColumnIfMissing(conn, "node", "sort_order", "INTEGER NOT NULL DEFAULT 0");
            // 用户隧道自动切换开关（默认关闭）
            addColumnIfMissing(conn, "user", "auto_switch", "INTEGER NOT NULL DEFAULT 0");
            // user_tunnel.flow 从 INTEGER 迁移到 REAL，支持小数流量（如 0.5GB）
            migrateUserTunnelFlowToReal(conn);
        }
    }

    private void migrateUserTunnelFlowToReal(Connection conn) {
        try {
            DatabaseMetaData meta = conn.getMetaData();
            try (ResultSet rs = meta.getColumns(null, null, "user_tunnel", "flow")) {
                if (rs.next()) {
                    String typeName = rs.getString("TYPE_NAME");
                    if (!"REAL".equalsIgnoreCase(typeName) && !"DOUBLE".equalsIgnoreCase(typeName) && !"FLOAT".equalsIgnoreCase(typeName)) {
                        try (Statement stmt = conn.createStatement()) {
                            stmt.execute("BEGIN TRANSACTION");
                            stmt.execute("ALTER TABLE user_tunnel RENAME TO user_tunnel_bak");
                            stmt.execute("CREATE TABLE user_tunnel (" +
                                    "id INTEGER PRIMARY KEY AUTOINCREMENT," +
                                    "user_id INTEGER NOT NULL," +
                                    "tunnel_id INTEGER NOT NULL," +
                                    "speed_id INTEGER," +
                                    "num INTEGER NOT NULL DEFAULT 0," +
                                    "flow REAL NOT NULL DEFAULT 0," +
                                    "in_flow INTEGER NOT NULL DEFAULT 0," +
                                    "out_flow INTEGER NOT NULL DEFAULT 0," +
                                    "flow_reset_time INTEGER NOT NULL DEFAULT 0," +
                                    "exp_time INTEGER NOT NULL DEFAULT 0," +
                                    "status INTEGER NOT NULL DEFAULT 1)");
                            stmt.execute("INSERT INTO user_tunnel SELECT * FROM user_tunnel_bak");
                            stmt.execute("DROP TABLE user_tunnel_bak");
                            stmt.execute("COMMIT");
                            log.info("迁移：user_tunnel.flow 列已从 INTEGER 转换为 REAL");
                        }
                    }
                }
            }
        } catch (Exception e) {
            try (Statement rollback = conn.createStatement()) {
                rollback.execute("ROLLBACK");
            } catch (Exception ignored) {}
            log.warn("迁移 user_tunnel.flow 跳过：{}", e.getMessage());
        }
    }

    private void addColumnIfMissing(Connection conn, String table, String column, String definition) {
        try {
            DatabaseMetaData meta = conn.getMetaData();
            try (ResultSet rs = meta.getColumns(null, null, table, column)) {
                if (!rs.next()) {
                    try (Statement stmt = conn.createStatement()) {
                        stmt.execute("ALTER TABLE " + table + " ADD COLUMN " + column + " " + definition);
                        log.info("迁移：已为 {}.{} 添加列", table, column);
                    }
                }
            }
        } catch (Exception e) {
            log.warn("迁移 {}.{} 跳过：{}", table, column, e.getMessage());
        }
    }
}
