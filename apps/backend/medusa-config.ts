import { loadEnv, defineConfig } from '@medusajs/framework/utils'

loadEnv(process.env.NODE_ENV || 'development', process.cwd())

const env = process.env
// SITE_MODE=staging|live (deploy/GO-LIVE.md). Development behaves like staging;
// a production server without SITE_MODE counts as live. Live refuses test tools.
const TEST_TOOLS = env.SITE_MODE === 'staging' || (env.SITE_MODE !== 'live' && env.NODE_ENV !== 'production')

// Payment gateways (ARCHITECTURE.md §2, §5.7). Each is a Medusa payment provider
// module, registered only when its keys are in .env; which ones customers see is
// chosen in Admin → Settings → Regions → India → Payment providers. The storefront
// picks a checkout adapter by provider id. To add Cashfree / PayU / PhonePe / Paytm,
// see deploy/GO-LIVE.md "Adding another payment gateway".
const paymentProviders = [
  // Cash on Delivery (always available; switched on/off in Admin → COD & payments).
  { resolve: './src/modules/cod-payment', id: 'cod', options: {} },
  ...(env.RAZORPAY_KEY_ID && env.RAZORPAY_KEY_SECRET && env.RAZORPAY_WEBHOOK_SECRET
    ? [
        {
          resolve: './src/modules/razorpay-payment',
          id: 'razorpay',
          options: { key_id: env.RAZORPAY_KEY_ID, key_secret: env.RAZORPAY_KEY_SECRET, webhook_secret: env.RAZORPAY_WEBHOOK_SECRET },
        },
      ]
    : []),
  ...(TEST_TOOLS && env.TEST_PAYMENT_ENABLED === 'true'
    ? [
        {
          resolve: './src/modules/test-payment',
          id: 'test-payment',
          options: { webhook_secret: env.TEST_PAYMENT_WEBHOOK_SECRET },
        },
      ]
    : []),
]

// Production (VPS): Redis-backed events, workflows and locks so the API server
// and the worker process (PM2) share one queue. Dev without REDIS_URL: in-memory.
const redisModules = env.REDIS_URL
  ? [
      { resolve: '@medusajs/medusa/event-bus-redis', options: { redisUrl: env.REDIS_URL } },
      { resolve: '@medusajs/medusa/workflow-engine-redis', options: { redis: { redisUrl: env.REDIS_URL } } },
      {
        resolve: '@medusajs/medusa/locking',
        options: { providers: [{ resolve: '@medusajs/medusa/locking-redis', id: 'locking-redis', is_default: true, options: { redisUrl: env.REDIS_URL } }] },
      },
    ]
  : []

module.exports = defineConfig({
  projectConfig: {
    databaseUrl: process.env.DATABASE_URL,
    redisUrl: process.env.REDIS_URL,
    // PM2 runs two processes on the VPS: "server" (API + admin) and "worker" (jobs, subscribers).
    workerMode: (env.MEDUSA_WORKER_MODE as 'shared' | 'worker' | 'server') || 'shared',
    // Admin session cookie; blank = the API host only (ARCHITECTURE.md §0).
    ...(env.COOKIE_DOMAIN ? { cookieOptions: { domain: env.COOKIE_DOMAIN } } : {}),
    http: {
      storeCors: process.env.STORE_CORS!,
      adminCors: process.env.ADMIN_CORS!,
      authCors: process.env.AUTH_CORS!,
      jwtSecret: process.env.JWT_SECRET,
      cookieSecret: process.env.COOKIE_SECRET,
    }
  },
  admin: {
    backendUrl: process.env.MEDUSA_BACKEND_URL,
    disable: env.DISABLE_MEDUSA_ADMIN === 'true',
  },
  modules: [
    ...redisModules,
    // Uploads (product photos, certificates, Sacred Places images) live on local
    // disk: apps/backend/static in dev, /var/www/divineaura/uploads on the VPS
    // (served by Nginx). ARCHITECTURE.md §2, §18.
    {
      resolve: '@medusajs/medusa/file',
      options: {
        providers: [
          {
            resolve: '@medusajs/medusa/file-local',
            id: 'local',
            options: {
              upload_dir: process.env.FILE_UPLOAD_DIR || 'static',
              backend_url: process.env.FILE_BACKEND_URL || 'http://localhost:9000/static',
            },
          },
        ],
      },
    },
    { resolve: './src/modules/product-specs' },
    { resolve: './src/modules/sacred-places' },
    { resolve: './src/modules/hero-banners' },
    { resolve: './src/modules/journal' },
    { resolve: '@medusajs/medusa/payment', options: { providers: paymentProviders } },
    { resolve: './src/modules/cod' },
    // Delivery pricing + courier shipments (ARCHITECTURE.md §5.4, §5.9). The
    // courier (test / Shiprocket) is chosen in src/lib/couriers from .env.
    {
      resolve: '@medusajs/medusa/fulfillment',
      options: {
        providers: [
          { resolve: '@medusajs/medusa/fulfillment-manual', id: 'manual' },
          { resolve: './src/modules/courier-fulfillment', id: 'courier', options: {} },
        ],
      },
    },
    { resolve: './src/modules/shipping' },
    // GST: Medusa's rates for goods; the COD fee follows its own setting.
    { resolve: '@medusajs/medusa/tax', options: { providers: [{ resolve: './src/modules/gst-tax', id: 'gst' }] } },
    // Customer messages (ARCHITECTURE.md §19): channel + providers come from .env
    // (MESSAGING_CHANNEL, OTP_CHANNEL, MSG91_*, WHATSAPP_*, RESEND_API_KEY) — see providers.ts.
    { resolve: './src/modules/messaging' },
    // Login: admins keep email + password; customers sign in with a mobile / email OTP (§11).
    { resolve: './src/modules/otp' },
    // GST invoices + credit notes, and customer returns (milestone 10).
    { resolve: './src/modules/invoice' },
    { resolve: './src/modules/returns' },
    // Verified-buyer product reviews (milestone 11).
    { resolve: './src/modules/reviews' },
    // Content pages (About, FAQ, policies) + privacy requests (milestone 12).
    { resolve: './src/modules/content' },
    {
      resolve: '@medusajs/medusa/auth',
      dependencies: ['cache', 'logger'],
      options: {
        providers: [
          { resolve: '@medusajs/medusa/auth-emailpass', id: 'emailpass' },
          { resolve: './src/modules/phone-otp-auth', id: 'phone-otp', options: { secret: process.env.OTP_SECRET } },
        ],
      },
    },
  ],
})
