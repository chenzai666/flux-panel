import React, { useMemo, useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

import { Logo } from '@/components/icons';
import { siteConfig } from '@/config/site';

// 子页面标题映射
const PAGE_TITLES: Record<string, string> = {
  '/user': '用户管理',
  '/limit': '限速管理',
  '/config': '网站配置',
  '/change-password': '修改密码',
};

// 返回目标映射 - 子页面返回到对应的主页面
const BACK_TARGETS: Record<string, string> = {
  '/user': '/profile',
  '/limit': '/profile',
  '/config': '/profile',
  '/change-password': '/',
};

export default function H5SimpleLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const navigate = useNavigate();
  const location = useLocation();
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

  // 动态页面标题
  const pageTitle = useMemo(() => {
    return PAGE_TITLES[location.pathname] || siteConfig.name;
  }, [location.pathname]);

  // 动态返回目标
  const backTarget = useMemo(() => {
    return BACK_TARGETS[location.pathname] || '/profile';
  }, [location.pathname]);

  // 路由切换时回到顶部
  React.useEffect(() => {
    try {
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    } catch (e) {
      window.scrollTo(0, 0);
    }
    document.body.scrollTop = 0;
    document.documentElement.scrollTop = 0;
  }, [location.pathname]);

  const handleBack = () => {
    // 触觉反馈
    if (navigator.vibrate) {
      navigator.vibrate(5);
    }
    navigate(backTarget);
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#f5f1eb] dark:bg-[#1a1614]">
      {/* 顶部导航栏 - 毛玻璃效果 */}
      <header
        className="h-12 safe-top flex-shrink-0 flex items-center justify-between px-2 relative z-30"
        style={{
          backgroundColor: isDark ? 'rgba(35, 30, 27, 0.82)' : 'rgba(255, 255, 255, 0.82)',
          backdropFilter: 'saturate(180%) blur(20px)',
          WebkitBackdropFilter: 'saturate(180%) blur(20px)',
          borderBottom: isDark ? '0.5px solid rgba(61, 56, 52, 0.5)' : '0.5px solid rgba(229, 224, 216, 0.5)',
        }}
      >
        {/* 左侧返回按钮 + Logo + 标题 */}
        <div className="flex items-center gap-1">
          <button
            onClick={handleBack}
            className="flex items-center justify-center w-9 h-9 rounded-xl active:bg-[#f5f1eb] dark:active:bg-[#2d2824] transition-colors"
            aria-label="返回"
          >
            <svg className="w-5 h-5 text-[#c96442] dark:text-[#d4856a]" fill="none" stroke="currentColor" strokeWidth={2.2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
          </button>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-gradient-to-br from-[#c96442] to-[#d4856a] flex items-center justify-center shadow-sm">
              <Logo size={12} />
            </div>
            <h1 className="text-[15px] font-semibold text-[#1a1a1a] dark:text-[#e8e2da] tracking-tight">
              {pageTitle}
            </h1>
          </div>
        </div>

        {/* 右侧占位（平衡布局） */}
        <div className="w-9" />
      </header>

      {/* 主内容区域 */}
      <main className="flex-1 bg-[#f5f1eb] dark:bg-[#1a1614] overflow-y-auto overflow-x-hidden">
        <div className="h5-page-transition">
          {children}
        </div>
      </main>
    </div>
  );
}
