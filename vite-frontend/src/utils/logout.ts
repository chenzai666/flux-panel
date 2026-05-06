const CACHE_PREFIX = 'vite_config_';

/**
 * 安全退出登录函数
 * 清除认证数据，但保留站点配置缓存（避免重新登录时软件名闪烁）
 */
export const safeLogout = () => {
  // 先保存站点配置缓存
  const configEntries: [string, string][] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith(CACHE_PREFIX)) {
      configEntries.push([key, localStorage.getItem(key)!]);
    }
  }

  localStorage.clear();

  // 恢复站点配置缓存
  configEntries.forEach(([key, value]) => {
    localStorage.setItem(key, value);
  });
};