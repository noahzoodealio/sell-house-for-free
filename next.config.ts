import type { NextConfig } from "next";
import createMDX from "@next/mdx";

const nextConfig: NextConfig = {
  pageExtensions: ["js", "jsx", "md", "mdx", "ts", "tsx"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "zoodealiomls.blob.core.windows.net",
        pathname: "/mlsimages/**",
      },
    ],
  },
};

const withMDX = createMDX({});

export default withMDX(nextConfig);
