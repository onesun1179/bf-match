import {defineConfig} from "@apps-in-toss/web-framework/config";

export default defineConfig({
  appName: "bf-match",
  brand: {
    displayName: "배드민턴 매치", // 화면에 노출될 앱의 한글 이름으로 바꿔주세요.
    primaryColor: "#64B5F6", // 화면에 노출될 앱의 기본 색상으로 바꿔주세요.
    icon: "https://api.bf-match.shop/icons/bf-match-icon.png", // local: http://localhost:8080/icons/bf-match-icon.png
  },
  web: {
    host: "localhost",
    port: 5173,
    commands: {
      dev: "vite dev",
      build: "vite build",
    },
  },
  permissions: [],
  outdir: "dist",
});
