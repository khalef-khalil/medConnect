import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        primary: {
          50: "#eef6ff",
          100: "#d9eaff",
          200: "#bbd9ff",
          300: "#8bc1ff",
          400: "#549fff",
          500: "#2a78ff",
          600: "#1a5eff",
          700: "#1246eb",
          800: "#1739be",
          900: "#1a3894",
          950: "#142057",
        },
        danger: {
          50: "var(--danger-50)",
          100: "var(--danger-100)",
          200: "var(--danger-200)",
          300: "var(--danger-300)",
          400: "var(--danger-400)",
          500: "var(--danger-500)",
          600: "var(--danger-600)",
          700: "var(--danger-700)",
          800: "var(--danger-800)",
          900: "var(--danger-900)",
          950: "var(--danger-950)",
        },
      },
      borderRadius: {
        'card': '0.75rem',
      },
      boxShadow: {
        'card': '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)',
      },
      height: {
        'safe-bottom': 'env(safe-area-inset-bottom, 0px)'
      }
    },
  },
  plugins: [],
};
export default config;
