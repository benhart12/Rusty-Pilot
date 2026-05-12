import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        display: ["DM Serif Display", "Georgia", "serif"],
        "mono-data": ["IBM Plex Mono", "Courier New", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;
