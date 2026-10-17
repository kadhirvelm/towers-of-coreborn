// biome-ignore lint/style/useNodejsImportProtocol: Use Node.js import protocol
const path = require("path");

const PUBLIC_URL = (() => {
  if (process.env.NODE_ENV !== "development") {
    return "";
  }

  const { PUBLIC_URL } = require("./publicUrl");
  return PUBLIC_URL;
})();

/** @type {import('next').NextConfig} */
const nextConfig = {
  allowedDevOrigins: [PUBLIC_URL],
  devIndicators: false,
  experimental: {
    cpus: 1,
  },
  async headers() {
    return [
      {
        headers: [
          { key: "Content-Security-Policy", value: "frame-ancestors *" },
        ],
        source: "/public/doc/:slug",
      },
    ];
  },
  images: {
    remotePatterns: [
      {
        hostname: "localhost",
        pathname: "/visual/**",
        port: "8080",
        protocol: "http",
      },
    ],
  },
  reactStrictMode: false,
  sassOptions: {
    includePaths: [path.join(__dirname, "styles")],
  },
};

nextConfig.env = {
  ...nextConfig.env,
  APP_BASE_URL: process.env.APP_BASE_URL,
  PUBLIC_URL: process.env.PUBLIC_URL,
};

if (process.env.NODE_ENV === "development") {
  // Allow Node.js to accept self-signed SSL certs when making server-side
  // fetch calls (e.g. SSR → local backend on https://localhost:8080).
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

  nextConfig.env = {
    ...nextConfig.env,
    APP_BASE_URL: `https://${process.env.PUBLIC_URL}:3000`,
    NEXT_PUBLIC_API_CLIENT_URL: process.env.BACKEND_API_URL,
  };
} else {
  nextConfig.env = {
    ...nextConfig.env,
    // The URL to the backend server
    NEXT_PUBLIC_API_CLIENT_URL: process.env.PUBLIC_URL,
  };
}

module.exports = nextConfig;
