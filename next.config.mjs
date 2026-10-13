/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  allowedDevOrigins: ['192.168.1.39'],
  // AVR toolchain tracing is intentionally omitted by default to keep
  // deployments small. Re-enable alongside VENDOR_AVR_TOOLCHAIN when needed.
}

export default nextConfig
