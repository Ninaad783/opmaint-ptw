import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        safety: {
          orange: "#ea580c",
          yellow: "#eab308",
          red: "#dc2626",
          green: "#16a34a",
          blue: "#0284c7",
          dark: "#0f172a",
        },
      },
    },
  },
  plugins: [],
};
export default config;
