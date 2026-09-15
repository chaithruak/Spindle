import { readFileSync } from 'node:fs';
import path from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

type EnvironmentsFile = {
  environments: Record<string, { webPort: number; apiPort: number }>;
};

const environments = JSON.parse(
  readFileSync(path.join(import.meta.dirname, '../../config/environments.json'), 'utf8'),
) as EnvironmentsFile;
const name = process.env.SPINDLE_ENV ?? 'development';
const environment = environments.environments[name];
if (!environment) {
  throw new Error(`No environment called "${name}" in config/environments.json.`);
}

// Loopback only, on the environment's own port, and never a different port
// when that one is taken.
const loopback = '127.0.0.1';

export default defineConfig({
  plugins: [react()],
  server: {
    host: loopback,
    port: environment.webPort,
    strictPort: true,
    proxy: {
      '/api': {
        target: `http://${loopback}:${environment.apiPort}`,
        rewrite: (url) => url.replace(/^\/api/, ''),
      },
    },
  },
  preview: {
    host: loopback,
    port: environment.webPort,
    strictPort: true,
  },
});
