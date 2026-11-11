import { loadEnv, defineConfig } from '@medusajs/framework/utils'

loadEnv(process.env.NODE_ENV || 'development', process.cwd())

// Payment providers (ARCHITECTURE.md §2, §5.7). Each one is a Medusa payment
// provider module; the storefront picks an adapter by provider id, so adding
// Razorpay or Cashfree here (plus one storefront adapter) needs no checkout change.
// The test provider is development-only and refuses to load in production.
const TEST_PAYMENT_ENABLED =
  process.env.TEST_PAYMENT_ENABLED === 'true' && process.env.NODE_ENV !== 'production'

const paymentProviders = [
  // Cash on Delivery (always available; switched on/off in Admin → COD & payments).
  { resolve: './src/modules/cod-payment', id: 'cod', options: {} },
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
