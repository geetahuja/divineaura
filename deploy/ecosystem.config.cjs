// PM2 processes on the VPS (ARCHITECTURE.md §18). Paths go through the "app"
// symlink, so `pm2 reload` after deploy.sh switches it starts the new release.
//   pm2 startOrReload /var/www/divineaura/app/deploy/ecosystem.config.cjs --update-env
// Cluster mode (2 instances) lets `pm2 reload` restart one at a time — no downtime.
const APP = "/var/www/divineaura/app"
const LOGS = "/var/log/divineaura"
const medusa = `${APP}/apps/backend/node_modules/@medusajs/cli/cli.js`
const server = `${APP}/apps/backend/.medusa/server` // medusa build output (has .env symlink)

module.exports = {
  apps: [
    {
      name: "medusa-server",
      script: medusa,
      args: "start --host 127.0.0.1",
      cwd: server,
      exec_mode: "cluster",
      instances: 2,
      env: { NODE_ENV: "production", PORT: "9000", MEDUSA_WORKER_MODE: "server" },
      max_memory_restart: "1200M",
      kill_timeout: 10000,
      listen_timeout: 60000,
      out_file: `${LOGS}/medusa-server.log`,
      error_file: `${LOGS}/medusa-server.err.log`,
      merge_logs: true,
      time: true,
    },
    {
      name: "medusa-worker",
      script: medusa,
      args: "start --host 127.0.0.1",
      cwd: server,
      exec_mode: "fork",
      instances: 1,
      env: { NODE_ENV: "production", PORT: "9001", MEDUSA_WORKER_MODE: "worker", DISABLE_MEDUSA_ADMIN: "true" },
      max_memory_restart: "1000M",
      kill_timeout: 15000,
      out_file: `${LOGS}/medusa-worker.log`,
      error_file: `${LOGS}/medusa-worker.err.log`,
      time: true,
    },
    {
      name: "storefront",
      script: `${APP}/apps/storefront/node_modules/next/dist/bin/next`,
      // No -H: Next must see its own host as "localhost" (it compares that with its rewrite
      // URLs; 127.0.0.1 makes / → /in a proxied request). Port 3000 is closed by UFW.
      args: "start -p 3000",
      cwd: `${APP}/apps/storefront`,
      exec_mode: "cluster",
      instances: 2,
      env: { NODE_ENV: "production" },
      max_memory_restart: "700M",
      listen_timeout: 30000,
      out_file: `${LOGS}/storefront.log`,
      error_file: `${LOGS}/storefront.err.log`,
      merge_logs: true,
      time: true,
    },
  ],
}
