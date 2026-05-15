package com.admin.config;

import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import javax.annotation.PreDestroy;
import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.Statement;

/**
 * SQLite WAL 模式配置，仅在 DB_DRIVER=org.sqlite.JDBC 时激活
 */
@Slf4j
@Component
@EnableScheduling
@ConditionalOnProperty(name = "spring.datasource.driver-class-name", havingValue = "org.sqlite.JDBC", matchIfMissing = false)
public class SQLiteConfig implements ApplicationRunner {

    private final DataSource dataSource;

    public SQLiteConfig(DataSource dataSource) {
        this.dataSource = dataSource;
    }

    @Override
    public void run(ApplicationArguments args) throws Exception {
        try (Connection connection = dataSource.getConnection();
             Statement statement = connection.createStatement()) {
            statement.execute("PRAGMA journal_mode=WAL;");
            statement.execute("PRAGMA synchronous=NORMAL;");
            statement.execute("PRAGMA cache_size=-64000;");
            statement.execute("PRAGMA temp_store=MEMORY;");
            statement.execute("PRAGMA busy_timeout=5000;");
            statement.execute("PRAGMA wal_autocheckpoint=1000;");
            log.info("SQLite WAL 模式配置成功");
        } catch (Exception e) {
            log.error("SQLite 配置失败", e);
            throw e;
        }
    }

    @Scheduled(fixedDelay = 300000, initialDelay = 300000)
    public void performCheckpoint() {
        try (Connection connection = dataSource.getConnection();
             Statement statement = connection.createStatement()) {
            statement.execute("PRAGMA wal_checkpoint(TRUNCATE);");
            log.debug("SQLite WAL checkpoint 完成");
        } catch (Exception e) {
            log.error("SQLite checkpoint 失败", e);
        }
    }

    @PreDestroy
    public void onShutdown() {
        log.info("关闭前执行最终 SQLite checkpoint...");
        try (Connection connection = dataSource.getConnection();
             Statement statement = connection.createStatement()) {
            statement.execute("PRAGMA wal_checkpoint(TRUNCATE);");
            log.info("最终 SQLite checkpoint 完成");
        } catch (Exception e) {
            log.error("最终 SQLite checkpoint 失败", e);
        }
    }
}
