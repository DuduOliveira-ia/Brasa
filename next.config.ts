import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Build standalone — copia só o que é preciso pra rodar (server.js + deps).
  // Reduz drasticamente a imagem Docker. Ver Dockerfile.
  output: "standalone",
};

export default nextConfig;
