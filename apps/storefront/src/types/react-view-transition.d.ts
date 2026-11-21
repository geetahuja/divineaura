// Next 16's App Router runs React canary, which exports <ViewTransition>;
// @types/react 19.0 doesn't declare it yet. Remove once @types/react ships it.
import "react"

declare module "react" {
  export const ViewTransition: FC<{
    name?: string
    share?: string
    default?: string
    enter?: string
    exit?: string
    update?: string
    children?: ReactNode
  }>
}
