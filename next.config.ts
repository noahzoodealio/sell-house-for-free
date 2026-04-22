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
      // HomeJunction CDN — MLS search now inlines image URLs directly
      // (see Zoodealio.MLS ListingsController search response), and those
      // URLs point at `images.homejunction.com/listings/armls/...`.
      {
        protocol: "https",
        hostname: "images.homejunction.com",
        pathname: "/listings/**",
      },
    ],
  },
};

const withMDX = createMDX({});

export default withMDX(nextConfig);
