/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  allowedDevOrigins: ['192.168.1.39'],
  // Only bundle the large AVR toolchain when explicitly enabled for a deployment.
  ...(process.env.VENDOR_AVR_TOOLCHAIN === "1"
    ? { outputFileTracingIncludes: { "/api/compile": ["./.avr-toolchain/**"] } }
    : {}),
}

export default nextConfig
