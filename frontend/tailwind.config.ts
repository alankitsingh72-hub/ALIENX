import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        ink: "#172438",
        navy: "#102a43",
        teal: "#087e8b",
        canvas: "#f4f7fa",
      },
      boxShadow: {
        card: "0 16px 48px rgba(16, 42, 67, 0.08)",
      },
    },
  },
  plugins: [],
};
export default config;
