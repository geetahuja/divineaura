"use client"

import useToggleState from "@lib/hooks/use-toggle-state"
import { Search as SearchIcon } from "lucide-react"
import dynamic from "next/dynamic"
import Link from "next/link"
import { useState } from "react"
import SearchDrawer from "./drawer"

// The search UI (InstantSearch) is downloaded on first open — or on hover/focus of the button.
const loadPanel = () => import("./panel")
const SearchInstant = dynamic(loadPanel, {
  ssr: false,
  loading: () => <p className="px-4 py-6 text-center text-ui-fg-muted">Loading search…</p>,
})

const Search = ({
  className = "flex items-center p-2 text-primary hover:text-primary-hover",
  children,
}: {
  className?: string
  children?: React.ReactNode
}) => {
  const { state: isOpen, open, close } = useToggleState()
  const [used, setUsed] = useState(false)

  return (
    <>
      {/* A real link so search works without JavaScript; with JS it opens the drawer instead. */}
      <Link
        href="/search"
        prefetch={false}
        onClick={(event) => {
          event.preventDefault()
          setUsed(true)
          open()
        }}
        onMouseEnter={() => void loadPanel()}
        onFocus={() => void loadPanel()}
        aria-label={children ? undefined : "Search products"}
        className={className}
        data-testid="nav-search-button"
      >
        {children ?? <SearchIcon className="h-5 w-5" aria-hidden />}
      </Link>

      <SearchDrawer isOpen={isOpen} close={close}>
        {used && <SearchInstant onNavigate={close} />}
      </SearchDrawer>
    </>
  )
}

export default Search
