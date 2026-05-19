"use client"
import { useEffect, useState } from "react"
import useSWR from "swr"
import { useUIStore } from "@/lib/stores/useUIStore"
import { useEmailStore } from "@/lib/stores/useEmailStore"
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from "@/components/ui/command"
import { X, Clock, Search } from "lucide-react"
import { formatEmailDate } from "@/lib/utils"
import type { Email, PaginatedResult } from "@/lib/types"

function useDebounce<T>(value: T, delay: number) {
  const [debouncedValue, setDebouncedValue] = useState(value)
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])
  return debouncedValue
}

const fetcher = (url: string) => fetch(url).then((r) => r.json())

export function SearchView() {
  const { closeSearch } = useUIStore()
  const { selectEmail } = useEmailStore()
  const [query, setQuery] = useState("")
  const debouncedQuery = useDebounce(query, 200)
  const [recentSearches, setRecentSearches] = useState<string[]>([])

  useEffect(() => {
    const stored = localStorage.getItem("aire-recent-searches")
    if (stored) setRecentSearches(JSON.parse(stored))
  }, [])

  const { data } = useSWR<PaginatedResult<Email>>(
    debouncedQuery.length > 1 ? `/api/search?q=${encodeURIComponent(debouncedQuery)}` : null,
    fetcher
  )

  const saveSearch = (q: string) => {
    const updated = [q, ...recentSearches.filter((s) => s !== q)].slice(0, 5)
    localStorage.setItem("aire-recent-searches", JSON.stringify(updated))
    setRecentSearches(updated)
  }

  const selectResult = (email: Email) => {
    selectEmail(email.id)
    saveSearch(query)
    closeSearch()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[10vh] bg-background/80 backdrop-blur-sm">
      <div className="w-full max-w-2xl mx-4">
        <Command className="rounded-xl border border-border shadow-2xl bg-card" shouldFilter={false}>
          <div className="flex items-center border-b border-border px-3">
            <Search className="w-4 h-4 text-muted-foreground mr-2 shrink-0" />
            <CommandInput
              value={query}
              onValueChange={setQuery}
              placeholder="Search emails..."
              className="flex-1 h-12 bg-transparent border-0 outline-none text-foreground placeholder:text-muted-foreground"
              autoFocus
            />
            <button onClick={closeSearch} className="text-muted-foreground hover:text-foreground ml-2">
              <X className="w-4 h-4" />
            </button>
          </div>
          <CommandList className="max-h-[60vh]">
            {!query && recentSearches.length > 0 && (
              <CommandGroup heading="Recent searches">
                {recentSearches.map((s) => (
                  <CommandItem key={s} onSelect={() => setQuery(s)} className="gap-2">
                    <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                    {s}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
            {!query && (
              <CommandGroup heading="Suggestions">
                {["from:", "subject:", "has:attachment", "is:unread", "is:starred"].map((s) => (
                  <CommandItem key={s} onSelect={() => setQuery(s)} className="font-mono text-sm">
                    {s}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
            {query && !data?.items?.length && <CommandEmpty>No results for &quot;{query}&quot;</CommandEmpty>}
            {data?.items && data.items.length > 0 && (
              <CommandGroup heading={`Results (${data.items.length})`}>
                {data.items.map((email) => (
                  <CommandItem key={email.id} onSelect={() => selectResult(email)} className="flex items-start gap-3 py-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-medium truncate">{email.from.name || email.from.address}</span>
                        <span className="text-xs text-muted-foreground shrink-0">{formatEmailDate(email.date)}</span>
                      </div>
                      <div className="text-xs text-muted-foreground truncate">{email.subject}</div>
                      <div className="text-xs text-muted-foreground/70 truncate">{email.preview}</div>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </div>
    </div>
  )
}
