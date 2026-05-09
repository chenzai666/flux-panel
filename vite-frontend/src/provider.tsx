import type { NavigateOptions } from "react-router-dom";

import * as React from "react";
import { HeroUIProvider } from "@heroui/system";
import { useHref, useNavigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { I18nProvider } from "@react-aria/i18n";

import { ThemeProvider } from "@/components/theme-provider";

declare module "@react-types/shared" {
  interface RouterConfig {
    routerOptions: NavigateOptions;
  }
}

export interface ProvidersProps {
  children: React.ReactNode;
}

export function Provider({ children }: ProvidersProps) {
  const navigate = useNavigate();

  return (
    <I18nProvider locale="zh-CN">
      <HeroUIProvider navigate={navigate} useHref={useHref}>
        <ThemeProvider>
          {children}
          <Toaster
            position="top-center"
            toastOptions={{
              duration: 2000,
              className: "dark:bg-[#231e1b] dark:text-[#e8e2da]",
              style: {
                background: "var(--color-background-primary)",
                color: "var(--color-text-primary)",
                border: "1px solid var(--color-border-tertiary)",
              },
              success: {
                duration: 2000,
                style: {
                  background: "var(--color-semantic-success-bg)",
                  color: "var(--color-semantic-success-text)",
                  border: "1px solid var(--color-semantic-success-border)",
                },
              },
              error: {
                duration: 2000,
                style: {
                  background: "var(--color-semantic-danger-bg)",
                  color: "var(--color-semantic-danger-text)",
                  border: "1px solid var(--color-semantic-danger-border)",
                },
              },
            }}
          />
        </ThemeProvider>
      </HeroUIProvider>
    </I18nProvider>
  );
}
