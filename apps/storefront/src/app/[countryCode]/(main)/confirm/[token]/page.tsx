import { getCodConfirmState } from "@lib/data/cod-confirm"
import { Metadata } from "next"
import ConfirmCod from "./confirm-cod"

export const metadata: Metadata = {
  title: "Confirm your order | DivineAura",
  robots: { index: false, follow: false },
}
// Always fresh: the link's state changes when confirmed or cancelled.
export const dynamic = "force-dynamic"

type Props = { params: Promise<{ token: string }> }

export default async function ConfirmCodPage(props: Props) {
  const { token } = await props.params
  return (
    <div className="content-container flex min-h-[60vh] items-start justify-center py-10 small:items-center">
      <ConfirmCod token={token} initial={await getCodConfirmState(token)} />
    </div>
  )
}
