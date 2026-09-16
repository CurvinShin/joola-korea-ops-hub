/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    serverActions: {
      // 실사 재고 엑셀 업로드(재고 최신화)가 기본 1MB 제한을 넘을 수 있어 상향.
      bodySizeLimit: "10mb",
    },
  },
};

module.exports = nextConfig;
