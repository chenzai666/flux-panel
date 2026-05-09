import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@heroui/button";

import { Logo } from "@/components/icons";
import { siteConfig } from "@/config/site";

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
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    } catch (e) {
      window.scrollTo(0, 0);
    }
    document.body.scrollTop = 0;
    document.documentElement.scrollTop = 0;
  }, [location.pathname]);

  const handleBack = () => {
    navigate("/profile");
  };

  return (
    <div className="app-shell flex flex-col min-h-screen">
      {/* 顶部导航栏 */}
      <header className="app-header h-14 safe-top flex-shrink-0 flex items-center justify-between px-4 relative z-10">
        <div className="flex items-center gap-2">
          <Button isIconOnly size="sm" variant="light" onPress={handleBack}>
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path
                clipRule="evenodd"
                d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z"
                fillRule="evenodd"
              />
            </svg>
          </Button>
          <div className="w-7 h-7 rounded-lg bg-[#f0dfcc] text-[#8a4f21] flex items-center justify-center">
            <Logo size={17} />
          </div>
          <h1 className="text-sm font-semibold text-[#1f1b16]">
            {siteConfig.name}
          </h1>
        </div>

        <div className="flex items-center gap-2" />
      </header>

      {/* 主内容区域 */}
      <main className="app-content flex-1 pb-0">{children}</main>
    </div>
  );
}
