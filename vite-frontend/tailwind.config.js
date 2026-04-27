import {heroui} from "@heroui/theme"

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    './src/layouts/**/*.{js,ts,jsx,tsx,mdx}',
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    "./node_modules/@heroui/theme/dist/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Claude 精确配色 — 与 claude.ai 保持一致
        // 背景层级
        'claude-bg':            '#f3f0eb',
        'claude-bg-panel':      '#ffffff',
        'claude-bg-secondary':  '#f9f8f6',
        'claude-sidebar':       '#f3f0eb',
        'claude-card':          '#ffffff',

        // 边框
        'claude-border':        '#ebe7e1',
        'claude-border-md':     '#e0dbd3',
        'claude-border-dark':   '#d0cac2',

        // 文字
        'claude-text':          '#1a1a1a',
        'claude-text-secondary':'#6b6560',
        'claude-text-tertiary': '#9b9590',

        // 强调色（Claude 橙褐）
        'claude-accent':        '#c96442',
        'claude-accent-hover':  '#b5583a',
        'claude-accent-light':  '#fdf0eb',

        // 状态色 — 精确对齐参考 HTML
        // 绿色（运行中/在线）
        'claude-success':       '#639922',
        'claude-success-bg':    '#EAF3DE',
        'claude-success-text':  '#27500A',
        'claude-success-border':'#C0DD97',

        // 琥珀色（流量告警/警告）
        'claude-warning':       '#BA7517',
        'claude-warning-bg':    '#FAEEDA',
        'claude-warning-text':  '#633806',
        'claude-warning-border':'#FAC775',

        // 红色（已停止/错误）
        'claude-danger':        '#E24B4A',
        'claude-danger-bg':     '#FCEBEB',
        'claude-danger-text':   '#791F1F',
        'claude-danger-border': '#F7C1C1',

        // 蓝色（信息/TCP）
        'claude-info':          '#378ADD',
        'claude-info-bg':       '#E6F1FB',
        'claude-info-text':     '#0C447C',
        'claude-info-border':   '#B5D4F4',

        // 旧名保留（向后兼容）
        'claude-success-light': '#EAF3DE',
        'claude-warning-light': '#FAEEDA',
        'claude-danger-light':  '#FCEBEB',
        'claude-info-light':    '#E6F1FB',
      },
      fontFamily: {
        'claude':      ['"Source Serif 4"', 'Georgia', 'serif'],
        'claude-sans': ['-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', 'sans-serif'],
        'claude-mono': ['"SF Mono"', '"Fira Code"', '"Fira Mono"', '"Roboto Mono"', 'ui-monospace', 'monospace'],
      },
      boxShadow: {
        'claude':    '0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.06)',
        'claude-md': '0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -1px rgba(0,0,0,0.03)',
        'claude-lg': '0 10px 15px -3px rgba(0,0,0,0.05), 0 4px 6px -2px rgba(0,0,0,0.03)',
      },
      borderWidth: {
        'half': '0.5px',
      },
    },
  },
  darkMode: "class",
  plugins: [heroui({
    themes: {
      light: {
        colors: {
          background: "#f3f0eb",
          foreground: "#1a1a1a",
          primary: {
            DEFAULT: "#c96442",
            foreground: "#ffffff",
            50:  "#fdf0eb",
            100: "#fbe0d5",
            200: "#f5bfab",
            300: "#ed9e80",
            400: "#e07d55",
            500: "#c96442",
            600: "#b5583a",
            700: "#974a31",
            800: "#7a3c28",
            900: "#5c2e20",
          },
          success: {
            DEFAULT: "#639922",
            foreground: "#ffffff",
            50:  "#EAF3DE",
            100: "#d5e8bd",
            200: "#C0DD97",
            300: "#96cc5a",
            400: "#7ab535",
            500: "#639922",
            600: "#4e7a1b",
            700: "#3b5c14",
            800: "#27500A",
            900: "#1a3306",
          },
          warning: {
            DEFAULT: "#BA7517",
            foreground: "#ffffff",
            50:  "#FAEEDA",
            100: "#f5ddb5",
            200: "#FAC775",
            300: "#e09a3a",
            400: "#cc8225",
            500: "#BA7517",
            600: "#996012",
            700: "#7a4c0e",
            800: "#633806",
            900: "#402500",
          },
          danger: {
            DEFAULT: "#E24B4A",
            foreground: "#ffffff",
            50:  "#FCEBEB",
            100: "#f9d6d6",
            200: "#F7C1C1",
            300: "#f08080",
            400: "#e86060",
            500: "#E24B4A",
            600: "#c53030",
            700: "#a32d2d",
            800: "#791F1F",
            900: "#4a1212",
          },
          default: {
            DEFAULT: "#9b9590",
            foreground: "#1a1a1a",
            50:  "#faf8f5",
            100: "#f3f0eb",
            200: "#ebe7e1",
            300: "#e0dbd3",
            400: "#d0cac2",
            500: "#9b9590",
            600: "#7d7670",
            700: "#5f5852",
            800: "#413b36",
            900: "#231e1b",
          },
          content1: "#ffffff",
          content2: "#f9f8f6",
          content3: "#f3f0eb",
          content4: "#ebe7e1",
        }
      },
      dark: {
        colors: {
          background: "#1a1614",
          foreground: "#e8e2da",
          primary: {
            DEFAULT: "#d4856a",
            foreground: "#1a1614",
            50:  "#2d2420",
            100: "#3d3128",
            200: "#4d3e32",
            300: "#6b5748",
            400: "#8a7060",
            500: "#d4856a",
            600: "#c87860",
            700: "#bb6b55",
            800: "#a85e4c",
            900: "#8f4f40",
          },
          success: {
            DEFAULT: "#639922",
            foreground: "#e8e2da",
            50:  "#1a2e0a",
            100: "#203808",
            200: "#2d5214",
            300: "#3b6b1a",
            400: "#4e7a1b",
            500: "#639922",
            600: "#7ab535",
            700: "#96cc5a",
            800: "#b3dd8a",
            900: "#d5eec0",
          },
          warning: {
            DEFAULT: "#BA7517",
            foreground: "#e8e2da",
            50:  "#2d1e08",
            100: "#3d2a0a",
            200: "#5a3810",
            300: "#7a4c0e",
            400: "#996012",
            500: "#BA7517",
            600: "#cc8225",
            700: "#d4956a",
            800: "#e8b88a",
            900: "#f5ddb5",
          },
          danger: {
            DEFAULT: "#E24B4A",
            foreground: "#e8e2da",
            50:  "#2d1010",
            100: "#3d1414",
            200: "#5a1e1e",
            300: "#7a2020",
            400: "#a32d2d",
            500: "#E24B4A",
            600: "#e86060",
            700: "#f08080",
            800: "#f7b0b0",
            900: "#fad8d8",
          },
          default: {
            DEFAULT: "#7d7670",
            foreground: "#e8e2da",
            50:  "#1a1614",
            100: "#231e1b",
            200: "#2d2824",
            300: "#3d3834",
            400: "#4d4844",
            500: "#7d7670",
            600: "#8a8480",
            700: "#a09a94",
            800: "#c8c2bc",
            900: "#e8e2da",
          },
          content1: "#231e1b",
          content2: "#2d2824",
          content3: "#3d3834",
          content4: "#4d4844",
        }
      }
    }
  })],
}

