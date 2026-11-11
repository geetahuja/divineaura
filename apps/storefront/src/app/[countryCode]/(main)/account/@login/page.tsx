import { Metadata } from "next"

import LoginTemplate from "@modules/account/templates/login-template"

export const metadata: Metadata = {
  title: { absolute: "Sign in | DivineAura" },
  description: "Sign in to your DivineAura account with your mobile number.",
}

// ?next=/checkout returns there after login; only same-site paths are accepted.
export default async function Login({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams
  return <LoginTemplate next={next && /^\/(?!\/)/.test(next) ? next : undefined} />
}
