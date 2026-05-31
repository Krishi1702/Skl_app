/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  // Prevent react-pdf (and its next/document dependency) from being bundled server-side
  experimental: {
    serverComponentsExternalPackages: ["react-pdf", "pdfjs-dist"],
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Exclude canvas (react-pdf optional peer dep) from the server bundle
      config.externals = [...(config.externals || []), { canvas: "canvas" }];
    }
    return config;
  },
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${
          process.env.BACKEND_URL || "http://backend:8000"
        }/api/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
