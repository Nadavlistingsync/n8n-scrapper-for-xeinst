/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    appDir: true,
  },
  env: {
    GITHUB_TOKEN: process.env.GITHUB_TOKEN,
    RESEND_API_KEY: process.env.RESEND_API_KEY,
    SUPABASE_URL: process.env.SUPABASE_URL,
    SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY,
  },
}

module.exports = nextConfig 