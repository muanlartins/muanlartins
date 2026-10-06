import { TimelinePage } from "@/components/site/timeline-page"
import personal from "@/content/personal"
import { sectionMetadata } from "@/lib/metadata"

export const metadata = sectionMetadata("personal", personal)

export default function Home() {
  return <TimelinePage content={personal} />
}
