import React, { useState, useEffect } from "react";

import AdminLayout from "@/layouts/admin";

interface PageWrapperProps {
  children: React.ReactNode;
  title: string;
  description?: string;
  className?: string;
}

export default function PageWrapper({
  children,
  title,
  description,
  className = "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8",
}: PageWrapperProps) {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // 使用短暂的延迟确保组件完全加载，避免闪烁
    const timer = setTimeout(() => {
      setIsReady(true);
    }, 50);

    return () => clearTimeout(timer);
  }, []);

  if (!isReady) {
    return (
      <AdminLayout>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-center h-64">
            <div className="flex items-center gap-3">
              <div className="animate-spin h-5 w-5 border-2 border-[#e5e0d8] dark:border-[#3d3834] border-t-[#c96442] dark:border-t-[#d4856a] rounded-full" />
              <span className="text-[#6b6560] dark:text-[#8a8480]" />
            </div>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className={className}>
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-[#1a1a1a] dark:text-[#e8e2da] tracking-tight">
            {title}
          </h1>
          {description && (
            <p className="mt-1.5 text-sm text-[#6b6560] dark:text-[#8a8480]">
              {description}
            </p>
          )}
        </div>
        {children}
      </div>
    </AdminLayout>
  );
}
