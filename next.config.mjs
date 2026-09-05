/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  allowedDevOrigins: ['192.168.1.39'],
  // Bundle the vendored arduino-cli binary + AVR core (fetched at build
  // time by scripts/vendor-avr-toolchain.mjs, not committed to git) into
  // the compile function's output so it's present at runtime.
  outputFileTracingIncludes: {
    '/api/compile': ['./.avr-toolchain/**'],
  },
}

export default nextConfig
