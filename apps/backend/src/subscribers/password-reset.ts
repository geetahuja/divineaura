import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { MESSAGING_MODULE } from "../modules/messaging"
import type MessagingModuleService from "../modules/messaging/service"

// Admin "Forgot password" (Medusa emits auth.password_reset with a reset token).
// The link goes by email through the messaging layer (console in development).
export default async function passwordReset({ event, container }: SubscriberArgs<{ entity_id: string; token: string; actor_type: string }>) {
  if (event.data.actor_type !== "user") return // customers log in with OTP
  const admin = (process.env.MEDUSA_BACKEND_URL || "http://localhost:9000").replace(/\/$/, "")
  const link = `${admin}/app/reset-password?token=${encodeURIComponent(event.data.token)}&email=${encodeURIComponent(event.data.entity_id)}`
  await container
    .resolve<MessagingModuleService>(MESSAGING_MODULE)
    .sendMessage("admin_password_reset", { email: event.data.entity_id }, { link }, { dedupe: false })
}

export const config: SubscriberConfig = { event: "auth.password_reset" }
