/** @type {import('next').NextConfig} */
// Backend port – must match the port you use when running uvicorn (e.g. --port 8002)
const BACKEND_PORT = process.env.BACKEND_PORT || "8002";

function rewriteBackendOrigin() {
  const raw = (process.env.NEXT_PUBLIC_API_BASE || "").trim();
  if (raw.startsWith("http://") || raw.startsWith("https://")) {
    let b = raw.replace(/\/+$/, "");
    if (b.endsWith("/api")) b = b.slice(0, -4).replace(/\/+$/, "");
    return b;
  }
  return `http://127.0.0.1:${BACKEND_PORT}`;
}

const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    const origin = rewriteBackendOrigin();
    return [{ source: "/api/:path*", destination: `${origin}/:path*` }];
  },
  env: {
    NEXT_PUBLIC_BACKEND_PORT: BACKEND_PORT,
  },
};

module.exports = nextConfig;


