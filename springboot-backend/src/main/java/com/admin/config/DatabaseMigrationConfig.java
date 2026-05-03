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
 * Runs schema migrations on startup to handle upgrades from older versions.
 * Safe to run on both fresh installs and upgrades.
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
            // node.port: added in beta, absent when upgrading from stable v1.x
            addColumnIfMissing(conn, "node", "port", "TEXT NOT NULL DEFAULT ''");
        }
    }

    private void addColumnIfMissing(Connection conn, String table, String column, String definition) {
        try {
            DatabaseMetaData meta = conn.getMetaData();
            try (ResultSet rs = meta.getColumns(null, null, table, column)) {
                if (!rs.next()) {
                    try (Statement stmt = conn.createStatement()) {
                        stmt.execute("ALTER TABLE " + table + " ADD COLUMN " + column + " " + definition);
                        log.info("Migration: added column {}.{}", table, column);
                    }
                }
            }
        } catch (Exception e) {
            log.warn("Migration {}.{} skipped: {}", table, column, e.getMessage());
        }
    }
}
