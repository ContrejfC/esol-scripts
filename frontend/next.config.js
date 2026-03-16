/** @type {import('next').NextConfig} */
// Backend port – must match the port you use when running uvicorn (e.g. --port 8002)
const BACKEND_PORT = process.env.BACKEND_PORT || "8002";

const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    return [
      { source: "/api/:path*", destination: `http://127.0.0.1:${BACKEND_PORT}/:path*` },
    ];
  },
  env: {
    NEXT_PUBLIC_BACKEND_PORT: BACKEND_PORT,
  },
};

module.exports = nextConfig;


