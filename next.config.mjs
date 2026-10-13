/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  allowedDevOrigins: ['192.168.1.39'],
  // Keep the large compiler out of ordinary builds. The same production flag
  // used by the editor also vendors and bundles it; the explicit override is
  // useful for testing a deployment build.
  ...(
    process.env.VENDOR_AVR_TOOLCHAIN === "1" ||
    (process.env.VERCEL_ENV === "production" && process.env.NEXT_PUBLIC_ENABLE_AVR_COMPILER === "1")
      ? { outputFileTracingIncludes: { "/api/compile": ["./.avr-toolchain/**"] } }
      : {}
  ),
}

export default nextConfig
