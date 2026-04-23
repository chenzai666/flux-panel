import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from "@heroui/button";

import { Logo } from '@/components/icons';
import { siteConfig } from '@/config/site';

export default function H5SimpleLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const navigate = useNavigate();
  const location = useLocation();
  
  // 路由切换时回到顶部，避免上一页滚动位置保留
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
    navigate('/profile');
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#f5f1eb] dark:bg-[#1a1614]">
      {/* 顶部导航栏 */}
      <header className="bg-white dark:bg-[#231e1b] shadow-[0_1px_3px_rgba(0,0,0,0.04)] border-b border-[#e5e0d8] dark:border-[#2d2824] h-14 safe-top flex-shrink-0 flex items-center justify-between px-4 relative z-10">
        <div className="flex items-center gap-2">
          <Button
            isIconOnly
            variant="light"
            size="sm"
            onPress={handleBack}
            className="text-[#6b6560] dark:text-[#8a8480]"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          </Button>
          <div className="w-8 h-8 rounded-lg bg-[#c96442] flex items-center justify-center">
            <Logo size={18} />
          </div>
          <h1 className="text-sm font-semibold text-[#1a1a1a] dark:text-[#e8e2da]">{siteConfig.name}</h1>
        </div>

        <div className="flex items-center gap-2">
        </div>
      </header>

      {/* 主内容区域 */}
      <main className="flex-1 bg-[#f5f1eb] dark:bg-[#1a1614] pb-0">
        {children}
      </main>
    </div>
  );
}
