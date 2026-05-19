import Link from "next/link";
import { BrowserMockup } from "./BrowserMockup";
import { ScrollLink } from "./ScrollLink";
import { ArrowRight, Sparkles } from "lucide-react";

export function HeroSection() {
  return (
    <section className="relative pt-32 pb-20 px-4 sm:px-6 overflow-hidden">
      {/* Background gradient orbs */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[600px] pointer-events-none">
        <div className="absolute top-20 left-1/4 w-72 h-72 bg-primary/20 rounded-full blur-[120px]" />
        <div className="absolute top-40 right-1/4 w-96 h-96 bg-indigo-600/10 rounded-full blur-[140px]" />
      </div>

      <div className="relative max-w-6xl mx-auto text-center space-y-8">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary/30 bg-primary/10 text-sm text-primary animate-fade-in">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Powered by Claude AI</span>
        </div>

        {/* Headline */}
        <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.05] animate-fade-in-up" style={{ animationDelay: "60ms" }}>
          The email client that{" "}
          <span className="bg-gradient-to-r from-primary via-indigo-400 to-violet-400 bg-clip-text text-transparent">
            thinks with you
          </span>
        </h1>

        {/* Sub-headline */}
        <p className="max-w-2xl mx-auto text-lg sm:text-xl text-muted-foreground leading-relaxed animate-fade-in-up" style={{ animationDelay: "120ms" }}>
          Pmail unifies every inbox, summarises threads with AI, drafts replies in your voice,
          and surfaces what actually matters — so you spend less time on email and more time on work.
        </p>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-fade-in-up" style={{ animationDelay: "180ms" }}>
          <Link
            href="/auth/signin"
            className="group inline-flex items-center gap-2 bg-primary hover:bg-primary/90 text-white font-semibold px-6 py-3 rounded-lg transition-all shadow-xl shadow-primary/30 hover:shadow-primary/50 hover:-translate-y-0.5"
          >
            Get Started — it&apos;s free
            <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
          </Link>
          <ScrollLink
            targetId="how-it-works"
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground font-medium px-6 py-3 rounded-lg border border-border hover:border-border/80 hover:bg-accent/30 transition-all cursor-pointer"
          >
            See how it works
          </ScrollLink>
        </div>

        {/* Browser mockup */}
        <div className="mt-16 animate-fade-in-up" style={{ animationDelay: "260ms" }}>
          <BrowserMockup />
          {/* Fade-out gradient at bottom of mockup */}
          <div className="relative -mt-20 h-20 bg-gradient-to-t from-background to-transparent pointer-events-none" />
        </div>
      </div>
    </section>
  );
}
