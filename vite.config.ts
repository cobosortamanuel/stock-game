import { defineConfig, Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'
import path from 'path'

const BUILD_ID = `${Date.now()}_${Math.random().toString(36).substring(2, 8)}`

function versionPlugin(): Plugin {
  return {
    name: 'version-generator-plugin',
    buildStart() {
      const publicDir = path.resolve(__dirname, 'public')
      const versionFile = path.join(publicDir, 'version.json')
      const versionData = {
        buildId: BUILD_ID,
        buildTime: Date.now()
      }
      try {
        if (!fs.existsSync(publicDir)) {
          fs.mkdirSync(publicDir, { recursive: true })
        }
        fs.writeFileSync(versionFile, JSON.stringify(versionData, null, 2))
      } catch (e) {
        console.warn('Could not write version.json to public:', e)
      }
    },
    generateBundle() {
      this.emitFile({
        type: 'asset',
        fileName: 'version.json',
        source: JSON.stringify({
          buildId: BUILD_ID,
          buildTime: Date.now()
        }, null, 2)
      })
    }
  }
}

// Dev-only: sirve /api/market con el mismo código que la función de Supabase
function marketApiDev(): Plugin {
  return {
    name: "market-api-dev",
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url || !/^\/api\/market(\?|$)/.test(req.url)) return next();
        try {
          const mod = await server.ssrLoadModule("/supabase/functions/market/index.ts");
          const response: Response = await mod.default(new Request(`http://localhost${req.url}`, { method: req.method }));
          res.statusCode = response.status;
          response.headers.forEach((value, key) => res.setHeader(key, value));
          res.end(await response.text());
        } catch (error: any) {
          res.statusCode = 500;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ error: error?.message || "dev proxy error" }));
        }
      });
    },
  };
}

// https://vite.dev/config/
export default defineConfig({
  base: './', // Relative paths for GitHub Pages compatibility
  plugins: [react(), marketApiDev(), versionPlugin()],
  define: {
    __APP_BUILD_ID__: JSON.stringify(BUILD_ID),
  },
  server: {
    host: true, // Allow mobile devices on same Wi-Fi to connect
    port: 5173
  }
})
