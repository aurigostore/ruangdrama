/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "hwztchapter.dramaboxdb.com" },
      { protocol: "https", hostname: "*.dramaboxdb.com" },
    ],
  },
};

export default nextConfig;
