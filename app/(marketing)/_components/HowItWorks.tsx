import { LogIn, BrainCircuit, Send } from "lucide-react";
import type { ReactNode } from "react";

interface Step {
  number: string;
  icon: ReactNode;
  title: string;
  body: string;
}

const STEPS: Step[] = [
  {
    number: "01",
    icon: <LogIn className="w-6 h-6" />,
    title: "Connect your accounts",
    body: "Sign in with Google or Microsoft in one click, or enter IMAP credentials for Yahoo, iCloud, or any provider.",
  },
  {
    number: "02",
    icon: <BrainCircuit className="w-6 h-6" />,
    title: "Let AI do the reading",
    body: "Pmail summarises, prioritises, and drafts replies automatically. You only read what truly matters.",
  },
  {
    number: "03",
    icon: <Send className="w-6 h-6" />,
    title: "Reply at the speed of thought",
    body: "Accept an AI draft, tweak a word, or write from scratch — all inside the same fluid composer.",
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="py-24 px-4 sm:px-6 bg-card/30 border-y border-border/50">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <p className="text-sm text-primary font-medium uppercase tracking-widest mb-3">How it works</p>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
            Up and running in 60 seconds
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-6 relative">
          {/* Connector line — desktop only */}
          <div className="hidden md:block absolute top-10 left-[calc(33%-16px)] right-[calc(33%-16px)] h-px border-t border-dashed border-border/60 pointer-events-none" />

          {STEPS.map((step, i) => (
            <div key={i} className="flex flex-col items-center text-center gap-4 relative">
              {/* Number badge + icon */}
              <div className="relative">
                <div className="w-20 h-20 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-lg shadow-primary/10">
                  {step.icon}
                </div>
                <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-primary text-white text-xs font-bold flex items-center justify-center shadow-md shadow-primary/40">
                  {i + 1}
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="font-semibold text-foreground text-lg">{step.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed max-w-xs mx-auto">{step.body}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
