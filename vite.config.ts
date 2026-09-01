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

// Custom dev-server proxy plugin for Yahoo Finance market data
function yahooFinanceProxy(): Plugin {
  return {
    name: 'yahoo-finance-proxy',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url?.startsWith('/api/market/')) {
          return next();
        }

        try {
          const urlObj = new URL(req.url, 'http://localhost');
          const path = urlObj.pathname.replace('/api/market', '');
          const searchParams = urlObj.search;

          let targetUrl = '';
          if (path.startsWith('/chart/')) {
            const ticker = path.replace('/chart/', '');
            targetUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}${searchParams}`;
          } else if (path.startsWith('/search')) {
            targetUrl = `https://query1.finance.yahoo.com/v1/finance/search${searchParams}`;
          } else if (path.startsWith('/quote/')) {
            const ticker = path.replace('/quote/', '');
            targetUrl = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${ticker}`;
          } else {
            return next();
          }

          const response = await fetch(targetUrl, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
              'Accept': 'application/json'
            }
          });

          const data = await response.json();
          res.setHeader('Content-Type', 'application/json');
          res.setHeader('Access-Control-Allow-Origin', '*');
          res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
          res.setHeader('Access-Control-Allow-Headers', '*');
          res.end(JSON.stringify(data));
        } catch (error: any) {
          console.error('Yahoo Finance Proxy Error:', error.message);
          res.statusCode = 500;
          res.end(JSON.stringify({ error: 'Failed to fetch market data', details: error.message }));
        }
      });
    }
  };
}

// https://vite.dev/config/
export default defineConfig({
  base: './', // Relative paths for GitHub Pages compatibility
  plugins: [react(), yahooFinanceProxy(), versionPlugin()],
  define: {
    __APP_BUILD_ID__: JSON.stringify(BUILD_ID),
  },
  server: {
    host: true, // Allow mobile devices on same Wi-Fi to connect
    port: 5173
  }
})
