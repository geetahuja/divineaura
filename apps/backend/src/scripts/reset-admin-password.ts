import { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules, MedusaError } from "@medusajs/framework/utils"

/**
 * Reset an admin user's password (email/password login).
 *
 *   pnpm medusa exec ./src/scripts/reset-admin-password.ts <email>
 *
 * The new password is read from the NEW_ADMIN_PASSWORD env variable, never from
 * the command line (that would leave it in shell history / process list).
 * See README for a PowerShell one-liner that prompts for it hidden.
 */
export default async function resetAdminPassword({ container, args }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const email = args?.[0]?.trim().toLowerCase()
  const password = process.env.NEW_ADMIN_PASSWORD

  if (!email) {
    throw new MedusaError(MedusaError.Types.INVALID_ARGUMENT, "Usage: medusa exec ./src/scripts/reset-admin-password.ts <email>")
  }
  if (!password || password.length < 8) {
    throw new MedusaError(MedusaError.Types.INVALID_ARGUMENT, "Set NEW_ADMIN_PASSWORD to the new password (at least 8 characters)")
  }

  const users = await container.resolve(Modules.USER).listUsers({ email })
  if (!users.length) {
    throw new MedusaError(MedusaError.Types.NOT_FOUND, `No admin user with email ${email}`)
  }

  const { success, error } = await container
    .resolve(Modules.AUTH)
    .updateProvider("emailpass", { entity_id: email, password })
  if (!success) {
    throw new MedusaError(MedusaError.Types.INVALID_DATA, `Password not changed: ${error}`)
  }

  logger.info(`Password updated for ${email}`)
}
