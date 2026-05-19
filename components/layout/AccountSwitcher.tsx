"use client"
import { useEffect } from "react"
import useSWR from "swr"
import { useEmailStore } from "@/lib/stores/useEmailStore"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { ChevronDown, Plus, Check } from "lucide-react"
import { getInitials } from "@/lib/utils"
import Link from "next/link"
import type { ConnectedAccount } from "@/lib/types"

const fetcher = (url: string) => fetch(url).then((r) => r.json())

export function AccountSwitcher() {
  const { accounts, selectedAccountId, setSelectedAccountId, setAccounts } = useEmailStore()
  const { data } = useSWR<ConnectedAccount[]>("/api/accounts", fetcher, { refreshInterval: 60_000 })

  useEffect(() => {
    if (data) setAccounts(data)
  }, [data, setAccounts])

  const selectedAccount = accounts.find((a) => a.id === selectedAccountId)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-2 w-full px-2 py-1.5 rounded-md hover:bg-accent transition-colors">
          <Avatar className="w-6 h-6">
            <AvatarFallback className="text-[10px]" style={{ backgroundColor: selectedAccount?.color || "#6366F1" }}>
              {selectedAccount ? getInitials(selectedAccount.displayName || selectedAccount.email) : "U"}
            </AvatarFallback>
          </Avatar>
          <span className="flex-1 text-left text-sm truncate">
            {selectedAccount?.displayName || selectedAccount?.email || "Unified"}
          </span>
          <ChevronDown className="w-3 h-3 text-muted-foreground" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        <DropdownMenuItem onClick={() => setSelectedAccountId("unified")} className="gap-2">
          <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center">
            <span className="text-[9px] text-primary font-bold">U</span>
          </div>
          <span className="flex-1">Unified Inbox</span>
          {selectedAccountId === "unified" && <Check className="w-3 h-3" />}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        {accounts.map((account) => (
          <DropdownMenuItem key={account.id} onClick={() => setSelectedAccountId(account.id)} className="gap-2">
            <div className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[9px] font-bold"
              style={{ backgroundColor: account.color }}>
              {getInitials(account.displayName || account.email)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm truncate">{account.displayName || account.email}</div>
              <div className="text-xs text-muted-foreground capitalize">{account.provider}</div>
            </div>
            {selectedAccountId === account.id && <Check className="w-3 h-3" />}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/auth/add-account" className="gap-2">
            <Plus className="w-4 h-4" />
            Add account
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
