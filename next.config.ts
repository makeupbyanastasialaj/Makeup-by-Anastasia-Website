import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Static export for Azure Static Web Apps. All data comes from the
  // Azure Functions API at /api (see the `api/` folder).
  output: "export",
  images: { unoptimized: true },
  trailingSlash: true,
};

export default nextConfig;
