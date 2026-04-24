import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

import { Logo } from '@/components/icons';
import { siteConfig } from '@/config/site';

interface TabItem {
  path: string;
  label: string;
  icon: React.ReactNode;
  activeIcon: React.ReactNode;
  adminOnly?: boolean;
}

// 页面标题映射
const PAGE_TITLES: Record<string, string> = {
  '/dashboard': '首页',
  '/forward': '转发管理',
  '/tunnel': '隧道管理',
  '/node': '节点状态',
  '/profile': '我的',
};

export default function H5Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isDark, setIsDark] = useState(false);

  // 检测暗黑模式
  useEffect(() => {
    const checkDark = () => {
      setIsDark(document.documentElement.classList.contains('dark'));
    };
    checkDark();

    const observer = new MutationObserver(checkDark);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });

    return () => observer.disconnect();
  }, []);

  // Tabbar配置 - 使用填充风格的活跃图标
  const tabItems: TabItem[] = [
    {
      path: '/dashboard',
      label: '首页',
      icon: (
        <svg className="w-[22px] h-[22px]" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      ),
      activeIcon: (
        <svg className="w-[22px] h-[22px]" fill="currentColor" viewBox="0 0 24 24">
          <path d="M11.47 3.841a.75.75 0 011.06 0l8.69 8.69a.75.75 0 01-.53 1.28h-1.44v7.44a.75.75 0 01-.75.75h-4.5a.75.75 0 01-.75-.75v-4.5h-2.25v4.5a.75.75 0 01-.75.75h-4.5a.75.75 0 01-.75-.75v-7.44H3.31a.75.75 0 01-.53-1.28l8.69-8.69z" />
        </svg>
      )
    },
    {
      path: '/forward',
      label: '转发',
      icon: (
        <svg className="w-[22px] h-[22px]" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
        </svg>
      ),
      activeIcon: (
        <svg className="w-[22px] h-[22px]" fill="currentColor" viewBox="0 0 24 24">
          <path fillRule="evenodd" d="M15.97 2.47a.75.75 0 011.06 0l4.5 4.5a.75.75 0 010 1.06l-4.5 4.5a.75.75 0 11-1.06-1.06l3.22-3.22H7.5a.75.75 0 010-1.5h11.69l-3.22-3.22a.75.75 0 010-1.06zm-7.94 9a.75.75 0 010 1.06L4.81 15.75h11.69a.75.75 0 010 1.5H4.81l3.22 3.22a.75.75 0 11-1.06 1.06l-4.5-4.5a.75.75 0 010-1.06l4.5-4.5a.75.75 0 011.06 0z" clipRule="evenodd" />
        </svg>
      )
    },
    {
      path: '/tunnel',
      label: '隧道',
      icon: (
        <svg className="w-[22px] h-[22px]" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m9.86-2.13a4.5 4.5 0 00-1.242-7.244l-4.5-4.5a4.5 4.5 0 00-6.364 6.364L4.34 8.058" />
        </svg>
      ),
      activeIcon: (
        <svg className="w-[22px] h-[22px]" fill="currentColor" viewBox="0 0 24 24">
          <path fillRule="evenodd" d="M19.902 4.098a3.75 3.75 0 00-5.304 0l-4.5 4.5a3.75 3.75 0 001.06 6.09l-.304.304a3.75 3.75 0 00-5.304 0l-1.06-1.06a.75.75 0 00-1.061 1.06l1.06 1.06a5.25 5.25 0 007.425 0l.304-.304a3.75 3.75 0 006.09-1.06l4.5-4.5a3.75 3.75 0 000-5.304zm-4.243 1.06a2.25 2.25 0 013.182 3.182l-4.5 4.5a2.25 2.25 0 01-3.182-3.182l4.5-4.5z" clipRule="evenodd" />
        </svg>
      ),
      adminOnly: true
    },
    {
      path: '/node',
      label: '节点',
      icon: (
        <svg className="w-[22px] h-[22px]" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
        </svg>
      ),
      activeIcon: (
        <svg className="w-[22px] h-[22px]" fill="currentColor" viewBox="0 0 24 24">
          <path fillRule="evenodd" d="M14.615 1.595a.75.75 0 01.359.852L12.982 9.75h7.268a.75.75 0 01.537 1.272l-10.5 11.25a.75.75 0 01-1.261-.719l1.992-7.302H3.25a.75.75 0 01-.537-1.272l10.5-11.25a.75.75 0 011.402-.034z" clipRule="evenodd" />
        </svg>
      ),
      adminOnly: true
    },
    {
      path: '/profile',
      label: '我的',
      icon: (
        <svg className="w-[22px] h-[22px]" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
        </svg>
      ),
      activeIcon: (
        <svg className="w-[22px] h-[22px]" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 15a3 3 0 100-6 3 3 0 000 6z" />
          <path fillRule="evenodd" d="M1.323 11.447C2.811 6.976 7.028 3.75 12.001 3.75c4.97 0 9.185 3.223 10.675 7.69.12.362.12.752 0 1.113-1.487 4.471-5.705 7.697-10.677 7.697-4.971 0-9.186-3.223-10.675-7.69a1.762 1.762 0 010-1.113zM17.25 12a5.25 5.25 0 11-10.5 0 5.25 5.25 0 0110.5 0z" clipRule="evenodd" />
        </svg>
      )
    }
  ];

  useEffect(() => {
    // 兼容处理：如果没有admin字段，根据role_id判断（0为管理员）
    let adminFlag = localStorage.getItem('admin') === 'true';
    if (localStorage.getItem('admin') === null) {
      const roleId = parseInt(localStorage.getItem('role_id') || '1', 10);
      adminFlag = roleId === 0;
      localStorage.setItem('admin', adminFlag.toString());
    }
    setIsAdmin(adminFlag);
  }, []);

  // Tab点击处理 - 带触觉反馈
  const handleTabClick = (path: string) => {
    if (location.pathname !== path) {
      // 触觉反馈（如果设备支持）
      if (navigator.vibrate) {
        navigator.vibrate(5);
      }
      navigate(path);
    }
  };

  // 过滤tab项（根据权限）
  const filteredTabItems = tabItems.filter(item =>
    !item.adminOnly || isAdmin
  );

  // 当前页面标题
  const currentTitle = useMemo(() => {
    return PAGE_TITLES[location.pathname] || siteConfig.name;
  }, [location.pathname]);

  // 路由切换时回到页面顶部
  useEffect(() => {
    try {
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    } catch (e) {
      window.scrollTo(0, 0);
    }
    document.body.scrollTop = 0;
    document.documentElement.scrollTop = 0;
  }, [location.pathname]);

  return (
    <div className="flex flex-col min-h-screen bg-[#f5f1eb] dark:bg-[#1a1614]">
      {/* 顶部导航栏 - 毛玻璃效果 */}
      <header
        className="h-12 safe-top flex-shrink-0 flex items-center justify-between px-4 relative z-30"
        style={{
          backgroundColor: isDark ? 'rgba(35, 30, 27, 0.82)' : 'rgba(255, 255, 255, 0.82)',
          backdropFilter: 'saturate(180%) blur(20px)',
          WebkitBackdropFilter: 'saturate(180%) blur(20px)',
          borderBottom: isDark ? '0.5px solid rgba(61, 56, 52, 0.5)' : '0.5px solid rgba(229, 224, 216, 0.5)',
        }}
      >
        {/* 左侧 Logo + 标题 */}
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#c96442] to-[#d4856a] flex items-center justify-center shadow-sm">
            <Logo size={15} />
          </div>
          <h1 className="text-[15px] font-semibold text-[#1a1a1a] dark:text-[#e8e2da] tracking-tight">
            {currentTitle}
          </h1>
        </div>

        {/* 右侧状态指示 */}
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-[11px] text-[#9b9590] dark:text-[#5d5854]">在线</span>
        </div>
      </header>

      {/* 主内容区域 */}
      <main className="flex-1 bg-[#f5f1eb] dark:bg-[#1a1614] overflow-y-auto overflow-x-hidden">
        <div className="h5-page-transition">
          {children}
        </div>
      </main>

      {/* 用于给固定 Tabbar 腾出空间的占位元素 */}
      <div aria-hidden className="h-[52px] safe-bottom" />

      {/* 底部Tabbar - 毛玻璃效果 + 精致分隔线 */}
      <nav
        className="h-[52px] safe-bottom flex-shrink-0 flex items-center justify-around px-1 fixed bottom-0 left-0 right-0 z-30"
        style={{
          backgroundColor: isDark ? 'rgba(35, 30, 27, 0.88)' : 'rgba(255, 255, 255, 0.88)',
          backdropFilter: 'saturate(180%) blur(20px)',
          WebkitBackdropFilter: 'saturate(180%) blur(20px)',
          borderTop: isDark ? '0.5px solid rgba(61, 56, 52, 0.4)' : '0.5px solid rgba(229, 224, 216, 0.5)',
        }}
      >
        {filteredTabItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <button
              key={item.path}
              onClick={() => handleTabClick(item.path)}
              className={`
                relative flex flex-col items-center justify-center flex-1 h-full
                transition-all duration-200 min-h-[44px] active:scale-95
                ${isActive
                  ? 'text-[#c96442] dark:text-[#d4856a]'
                  : 'text-[#b5b0aa] dark:text-[#4d4844]'
                }
              `}
            >
              {/* 活跃指示器 - 顶部小圆点 */}
              {isActive && (
                <div className="absolute top-0.5 w-1 h-1 rounded-full bg-[#c96442] dark:bg-[#d4856a]" />
              )}

              {/* 图标区域 */}
              <div className="flex-shrink-0 mb-0.5 transition-transform duration-200">
                {isActive ? item.activeIcon : item.icon}
              </div>

              {/* 标签文字 */}
              <span className={`text-[10px] leading-tight ${isActive ? 'font-semibold' : 'font-medium'}`}>
                {item.label}
              </span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
