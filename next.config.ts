import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['better-sqlite3', 'typeorm', 'reflect-metadata'],
};

export default nextConfig;
