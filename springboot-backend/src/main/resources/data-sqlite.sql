-- 默认管理员账号: admin_user / admin_user
INSERT OR IGNORE INTO user (id, user, pwd, role_id, exp_time, flow, in_flow, out_flow, flow_reset_time, num, created_time, updated_time, status)
VALUES (1, 'admin_user', '3c85cdebade1c51cf64ca9f3c09d182d', 0, 2727251700000, 99999, 0, 0, 1, 99999, 1748914865000, 1748914865000, 1);

INSERT OR IGNORE INTO vite_config (name, value, time)
VALUES ('app_name', 'flux', 1748914865000);
