import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    localPatterns: [
      {
        pathname: "/api/popup-image",
      },
    ],
  },
};

export default nextConfig;
