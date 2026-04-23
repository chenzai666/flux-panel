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
        // Claude warm neutral palette
        'claude-bg': '#f5f1eb',
        'claude-sidebar': '#ede8e0',
        'claude-card': '#ffffff',
        'claude-border': '#e5e0d8',
        'claude-text': '#1a1a1a',
        'claude-text-secondary': '#6b6560',
        'claude-text-tertiary': '#9b9590',
        'claude-accent': '#c96442',
        'claude-accent-hover': '#b5583a',
        'claude-accent-light': '#fdf0eb',
        'claude-success': '#2d8a56',
        'claude-success-light': '#edf7f1',
        'claude-warning': '#b8860b',
        'claude-warning-light': '#fef9ee',
        'claude-danger': '#c53030',
        'claude-danger-light': '#fef2f2',
        'claude-info': '#3b7dd8',
        'claude-info-light': '#eff6ff',
      },
      fontFamily: {
        'claude': ['"Source Serif 4"', 'Georgia', 'serif'],
        'claude-sans': ['-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', 'sans-serif'],
      },
      boxShadow: {
        'claude': '0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.06)',
        'claude-md': '0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -1px rgba(0,0,0,0.03)',
        'claude-lg': '0 10px 15px -3px rgba(0,0,0,0.05), 0 4px 6px -2px rgba(0,0,0,0.03)',
      },
    },
  },
  darkMode: "class",
  plugins: [heroui({
    themes: {
      light: {
        colors: {
          background: "#f5f1eb",
          foreground: "#1a1a1a",
          primary: {
            DEFAULT: "#c96442",
            foreground: "#ffffff",
            50: "#fdf0eb",
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
          default: {
            DEFAULT: "#9b9590",
            foreground: "#1a1a1a",
            50: "#faf8f5",
            100: "#f0ece6",
            200: "#e5e0d8",
            300: "#d0c9bf",
            400: "#b8b0a4",
            500: "#9b9590",
            600: "#7d7670",
            700: "#5f5852",
            800: "#413b36",
            900: "#231e1b",
          },
          content1: "#ffffff",
          content2: "#faf8f5",
          content3: "#f0ece6",
          content4: "#e5e0d8",
        }
      },
      dark: {
        colors: {
          background: "#1a1614",
          foreground: "#e8e2da",
          primary: {
            DEFAULT: "#d4856a",
            foreground: "#1a1614",
            50: "#2d2420",
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
          default: {
            DEFAULT: "#7d7670",
            foreground: "#e8e2da",
            50: "#1a1614",
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
