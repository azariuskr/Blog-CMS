import { defineConfig } from 'vite'
import { devtools } from '@tanstack/devtools-vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import viteReact from '@vitejs/plugin-react'
import viteTsConfigPaths from 'vite-tsconfig-paths'
import tailwindcss from '@tailwindcss/vite'
import { nitro } from 'nitro/vite'

// Vite plugin to patch TanStack Start env reads in raw node_modules ESM served by Vite dev.
// We patch only specific TanStack files/keys (no global process polyfill).
function patchTanstackClientEnv(): import('vite').Plugin {
  return {
    name: 'patch-tanstack-client-env',
    enforce: 'pre',
    transform(code, id) {
      const isTanstackClientFile =
        id.includes('start-client-core') ||
        id.includes('@tanstack/router-core/dist/esm/router.js') ||
        id.includes('@tanstack/router-core/dist/esm/isServer/server.js')

      if (!isTanstackClientFile || !code.includes('process.env')) {
        return null
      }

      return code
        .replace(/process\.env\.TSS_SERVER_FN_BASE/g, '"/blog/_serverFn/"')
        .replace(/process\.env\.TSS_ROUTER_BASEPATH/g, '"/blog"')
        .replace(/process\.env\.NODE_ENV/g, JSON.stringify(process.env.NODE_ENV || 'development'))
    },
  }
}

const config = defineConfig({
  // When served behind Traefik at /template
  base: '/blog/',
  ssr: {
    // Prevent isomorphic-git (Node.js-only) from leaking into client bundle
    external: ['isomorphic-git', '@isomorphic-git/lightning-fs'],
    noExternal: [],
  },
  optimizeDeps: {
    exclude: ['isomorphic-git', '@isomorphic-git/lightning-fs'],
  },
  server: {
    host: '0.0.0.0',
    // Allow all hosts when running in Docker behind reverse proxy
    // Host validation is handled by Traefik
    allowedHosts: true,
  },
  plugins: [
    patchTanstackClientEnv(),
    devtools(),
    nitro(),
    // this is the plugin that enables path aliases
    viteTsConfigPaths({
      projects: ['./tsconfig.json'],
    }),
    tailwindcss(),
    tanstackStart(),
    viteReact(),
  ],
})

export default config
