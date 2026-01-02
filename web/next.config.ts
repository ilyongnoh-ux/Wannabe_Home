import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Turbopack 루트 명시 (락파일 오판 방지)
  turbopack: {
    root: __dirname,
  },

  // 개발 중 허용할 접근 Origin (LAN 접속 경고 제거)
  allowedDevOrigins: [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://192.168.0.34:3000",
  ],
};

export default nextConfig;
