import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  outputFileTracingRoot: path.join(__dirname),
  webpack: (config) => {
    // Firebase v11 exports field conditions don't match Next.js/webpack defaults.
    // Alias each subpackage directly to its CJS dist file to bypass exports resolution.
    const firebasePkgs = ["app", "auth", "firestore", "storage"];
    for (const pkg of firebasePkgs) {
      config.resolve.alias[`firebase/${pkg}`] = path.resolve(
        `./node_modules/firebase/${pkg}/dist/index.cjs.js`
      );
    }
    return config;
  },
  // Images from Firebase Storage
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "firebasestorage.googleapis.com",
      },
    ],
  },
};

export default nextConfig;
