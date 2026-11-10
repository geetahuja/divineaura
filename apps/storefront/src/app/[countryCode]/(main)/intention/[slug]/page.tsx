import { TagPage, tagMetadata, TagPageProps } from "@modules/listing/tag-page"

export const generateMetadata = (props: TagPageProps) => tagMetadata("intention", props)

export default function IntentionPage(props: TagPageProps) {
  return <TagPage kind="intention" {...props} />
}
