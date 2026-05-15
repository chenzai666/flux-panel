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
