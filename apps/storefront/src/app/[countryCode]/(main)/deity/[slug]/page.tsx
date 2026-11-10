import { TagPage, tagMetadata, TagPageProps } from "@modules/listing/tag-page"

export const generateMetadata = (props: TagPageProps) => tagMetadata("deity", props)

export default function DeityPage(props: TagPageProps) {
  return <TagPage kind="deity" {...props} />
}
