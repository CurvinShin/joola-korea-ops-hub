/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    // 계약서 PDF에 쓰는 한글 글꼴 파일을 서버 함수에 함께 배포한다.
    outputFileTracingIncludes: {
      "/api/partner-contract-pdf/[token]": ["./assets/fonts/**"],
      "/api/partner-contracts/[id]/pdf": ["./assets/fonts/**"],
      "/api/contract-sign-pdf/[token]": ["./assets/fonts/**"],
    },
    serverActions: {
      // 실사 재고 엑셀 업로드(재고 최신화)가 기본 1MB 제한을 넘을 수 있어 상향.
      bodySizeLimit: "10mb",
    },
  },
};

module.exports = nextConfig;
