import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const silentProxyErrors = ['ECONNREFUSED', 'ECONNRESET', 'ETIMEDOUT', 'ENOTFOUND']

const proxyHandler = {
  target: 'http://localhost:5000',
  changeOrigin: true,
  configure: (proxy) => {
    proxy.on('error', (err, _req, res) => {
      if (silentProxyErrors.some((code) => err.message.includes(code) || err.code === code)) {
        if (res && typeof res.writeHead === 'function' && !res.headersSent) {
          res.writeHead(502)
          res.end()
        }
        return
      }
      console.error('[proxy error]', err.message)
    })
  },
}

export default defineConfig({
  plugins: [react(), tailwindcss()],
  customLogger: {
    info:  (msg, opts) => { if (!msg.includes('http proxy error')) console.info(msg) },
    warn:  (msg, opts) => { if (!msg.includes('http proxy error')) console.warn(msg) },
    error: (msg, opts) => { if (!msg.includes('http proxy error')) console.error(msg) },
    warnOnce: (msg) => { if (!msg.includes('http proxy error')) console.warn(msg) },
    clearScreen: () => {},
    hasErrorLogged: () => false,
    hasWarned: false,
  },
  server: {
    port: 5175,
    proxy: {
      '/api':     proxyHandler,
      '/uploads': proxyHandler,
    },
  },
})
