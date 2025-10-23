const nextConfig: import('next').NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: '15mb'
    }
  }
}

export default nextConfig
