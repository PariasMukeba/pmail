"use client";

/**
 * Per-account label view.
 *
 * Reads `accountId` and `label` from the URL params and renders the
 * filtered email list for that account/label combination.
 */

import useSWR from "swr";
import type { Email } from "@/lib/types";
import Link from "next/link";

interface Props {
  params: { accountId: string; label: string };
}

/** SWR fetcher helper. */
async function fetcher<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to fetch");
  return res.json() as Promise<T>;
}

export default function AccountLabelPage({ params }: Props) {
  const { accountId, label } = params;
  const decodedLabel = decodeURIComponent(label);

  const url = `/api/emails?accountId=${encodeURIComponent(accountId)}&label=${encodeURIComponent(decodedLabel)}`;
  const { data, isLoading } = useSWR<{ emails: Email[] }>(url, fetcher, {
    refreshInterval: 10_000,
  });

  const emails = data?.emails ?? [];

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border flex items-center justify-between shrink-0">
        <h1 className="font-semibold text-lg capitalize">
          {decodedLabel.toLowerCase()}
        </h1>
        <span className="text-sm text-muted-foreground">
          {emails.length} messages
        </span>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <LabelListSkeleton />
        ) : emails.length === 0 ? (
          <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
            No emails in this folder
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {emails.map((email) => (
              <li key={email.id}>
                <Link
                  href={`/email/${email.id}`}
                  className={`flex flex-col px-4 py-3 hover:bg-secondary transition-colors
                    ${!email.isRead ? "font-medium" : "text-muted-foreground"}`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="truncate text-sm">
                      {email.from.name || email.from.address}
                    </span>
                    <span className="text-xs text-muted-foreground shrink-0">
                      {new Date(email.date).toLocaleDateString()}
                    </span>
                  </div>
                  <span className="truncate text-sm">{email.subject}</span>
                  <p className="text-xs text-muted-foreground truncate mt-0.5">
                    {email.preview}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function LabelListSkeleton() {
  return (
    <ul className="divide-y divide-border">
      {Array.from({ length: 6 }).map((_, i) => (
        <li key={i} className="px-4 py-3 animate-pulse space-y-2">
          <div className="flex justify-between">
            <div className="h-3 bg-secondary rounded w-32" />
            <div className="h-3 bg-secondary rounded w-10" />
          </div>
          <div className="h-3 bg-secondary rounded w-48" />
          <div className="h-2 bg-secondary rounded w-full" />
        </li>
      ))}
    </ul>
  );
}
