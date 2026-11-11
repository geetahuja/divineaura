import { loadEnv, defineConfig } from '@medusajs/framework/utils'

loadEnv(process.env.NODE_ENV || 'development', process.cwd())

// Payment providers (ARCHITECTURE.md §2, §5.7). Each one is a Medusa payment
// provider module; the storefront picks an adapter by provider id, so adding
// Razorpay or Cashfree here (plus one storefront adapter) needs no checkout change.
// The test provider is development-only and refuses to load in production.
const TEST_PAYMENT_ENABLED =
  process.env.TEST_PAYMENT_ENABLED === 'true' && process.env.NODE_ENV !== 'production'

const paymentProviders = [
  ...(TEST_PAYMENT_ENABLED
    ? [
        {
          resolve: './src/modules/test-payment',
          id: 'test-payment',
          options: { webhook_secret: process.env.TEST_PAYMENT_WEBHOOK_SECRET },
        },
      ]
    : []),
]

module.exports = defineConfig({
  projectConfig: {
    databaseUrl: process.env.DATABASE_URL,
    redisUrl: process.env.REDIS_URL,
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
  },
  modules: [
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
    ...(paymentProviders.length
      ? [{ resolve: '@medusajs/medusa/payment', options: { providers: paymentProviders } }]
      : []),
  ],
})
