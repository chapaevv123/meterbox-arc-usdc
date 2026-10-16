import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { nodePolyfills } from 'vite-plugin-node-polyfills'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_')
  const mainnetAddress = (env.VITE_METERBOX_ADDRESS ?? '').toLowerCase()
  if (env.VITE_USE_MAINNET === 'true' && (
    !/^0x[0-9a-f]{40}$/.test(mainnetAddress) ||
    mainnetAddress === '0xc904569da992f343d0968454abe7486457a1a8f6' ||
    mainnetAddress === '0x0000000000000000000000000000000000000000'
  )) {
    throw new Error('Arc Mainnet build requires a deployed Mainnet MeterBox address')
  }
  return {
  plugins: [react(), nodePolyfills()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
    dedupe: ['react', 'react-dom'],
  },
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-dom/client',
      'react/jsx-runtime',
      '@tanstack/react-query',
      'wagmi',
      'wagmi/chains',
      'wagmi/connectors',
      'viem',
      'viem/chains',
      'connectkit',
      'lucide-react',
      'sonner',
      'vite-plugin-node-polyfills/shims/buffer',
      'vite-plugin-node-polyfills/shims/global',
      'vite-plugin-node-polyfills/shims/process',
    ],
  },
  server: {
    allowedHosts: true,
    cors: true,
  },
  }
})
