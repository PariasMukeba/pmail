"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Mail, Menu, X } from "lucide-react";
import { ScrollLink } from "./ScrollLink";

export function LandingNav() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-background/80 backdrop-blur-xl border-b border-border/60 shadow-sm"
          : "bg-transparent"
      }`}
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shadow-lg shadow-primary/40 group-hover:shadow-primary/60 transition-shadow">
            <Mail className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-foreground tracking-tight text-lg">Pmail</span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-1">
          <ScrollLink targetId="features" className="px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors rounded-md hover:bg-accent/50 cursor-pointer">
            Features
          </ScrollLink>
          <ScrollLink targetId="how-it-works" className="px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors rounded-md hover:bg-accent/50 cursor-pointer">
            How it works
          </ScrollLink>
        </nav>

        {/* Desktop CTA */}
        <div className="hidden md:flex items-center gap-3">
          <Link
            href="/auth/signin"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5 rounded-md hover:bg-accent/50"
          >
            Sign in
          </Link>
          <Link
            href="/auth/signin"
            className="text-sm font-medium bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-md transition-all shadow-lg shadow-primary/30 hover:shadow-primary/50"
          >
            Get Started
          </Link>
        </div>

        {/* Mobile hamburger */}
        <button
          className="md:hidden p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors"
          onClick={() => setOpen(!open)}
          aria-label="Toggle menu"
        >
          {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="md:hidden bg-background/95 backdrop-blur-xl border-b border-border px-4 pb-4 space-y-1">
          <ScrollLink targetId="features" onClick={() => setOpen(false)} className="block px-3 py-2 text-sm text-muted-foreground hover:text-foreground rounded-md hover:bg-accent/50 cursor-pointer">Features</ScrollLink>
          <ScrollLink targetId="how-it-works" onClick={() => setOpen(false)} className="block px-3 py-2 text-sm text-muted-foreground hover:text-foreground rounded-md hover:bg-accent/50 cursor-pointer">How it works</ScrollLink>
          <div className="pt-2 flex flex-col gap-2">
            <Link href="/auth/signin" className="block text-center text-sm text-muted-foreground border border-border rounded-md py-2 hover:bg-accent/50 transition-colors">Sign in</Link>
            <Link href="/auth/signin" className="block text-center text-sm font-medium bg-primary text-white rounded-md py-2 hover:bg-primary/90 transition-colors">Get Started</Link>
          </div>
        </div>
      )}
    </header>
  );
}
