"use client";
import { useState, KeyboardEvent } from "react";
import { X } from "lucide-react";
import { cn, isValidEmail } from "@/lib/utils";
import type { EmailAddress } from "@/lib/types";

interface RecipientInputProps {
  value: EmailAddress[];
  onChange: (v: EmailAddress[]) => void;
  placeholder?: string;
}

export function RecipientInput({
  value,
  onChange,
  placeholder = "Add recipients...",
}: RecipientInputProps) {
  const [inputValue, setInputValue] = useState("");

  const addRecipient = (raw: string) => {
    const emails = raw
      .split(/[,;]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    const newRecipients: EmailAddress[] = emails
      .filter((e) => isValidEmail(e))
      .map((e) => ({ name: "", address: e }));
    if (newRecipients.length > 0) {
      onChange([...value, ...newRecipients]);
      setInputValue("");
    }
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === "," || e.key === ";") {
      e.preventDefault();
      addRecipient(inputValue);
    } else if (e.key === "Backspace" && inputValue === "" && value.length > 0) {
      onChange(value.slice(0, -1));
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-1 min-h-[36px] px-2 py-1 border border-input rounded-md bg-background focus-within:ring-2 focus-within:ring-ring">
      {value.map((recipient, i) => (
        <span
          key={i}
          title={
            recipient.name
              ? `${recipient.name} <${recipient.address}>`
              : recipient.address
          }
          className={cn(
            "flex items-center gap-1 px-2 py-0.5 rounded text-xs max-w-[260px]",
            isValidEmail(recipient.address)
              ? "bg-secondary text-secondary-foreground"
              : "bg-destructive/20 text-destructive",
          )}
        >
          <span className="font-mono truncate">
            {recipient.name
              ? `${recipient.name} <${recipient.address}>`
              : recipient.address}
          </span>
          <button
            onClick={() => onChange(value.filter((_, idx) => idx !== i))}
            className="hover:text-foreground shrink-0"
          >
            <X className="w-2.5 h-2.5" />
          </button>
        </span>
      ))}
      <input
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={onKeyDown}
        onBlur={() => inputValue && addRecipient(inputValue)}
        placeholder={value.length === 0 ? placeholder : ""}
        className="flex-1 min-w-[120px] bg-transparent text-sm outline-none placeholder:text-muted-foreground"
      />
    </div>
  );
}
