import { Sparkles, Zap, Inbox, Shield, Search, Smartphone } from "lucide-react";
import type { ReactNode } from "react";

interface Feature {
  icon: ReactNode;
  title: string;
  description: string;
  color: string;
}

const FEATURES: Feature[] = [
  {
    icon: <Sparkles className="w-5 h-5" />,
    title: "AI Summaries",
    description:
      "Claude reads every thread and surfaces a 3-sentence brief. Absorb full context in seconds, not minutes.",
    color: "text-indigo-400 bg-indigo-400/10 border-indigo-400/20",
  },
  {
    icon: <Zap className="w-5 h-5" />,
    title: "Smart Reply Drafts",
    description:
      "One click generates a full reply in your tone and style. Edit or send as-is — your choice.",
    color: "text-yellow-400 bg-yellow-400/10 border-yellow-400/20",
  },
  {
    icon: <Inbox className="w-5 h-5" />,
    title: "Unified Inbox",
    description:
      "Gmail, Outlook, iCloud, and any IMAP account in one fast, sorted list. Nothing falls through the cracks.",
    color: "text-blue-400 bg-blue-400/10 border-blue-400/20",
  },
  {
    icon: <Shield className="w-5 h-5" />,
    title: "Encrypted at Rest",
    description:
      "Every email body is AES-256-GCM encrypted before it touches our database. Even we can't read your mail.",
    color: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20",
  },
  {
    icon: <Search className="w-5 h-5" />,
    title: "Instant Search",
    description:
      "Full-text search across every connected account in under 200 ms. Find anything, immediately.",
    color: "text-purple-400 bg-purple-400/10 border-purple-400/20",
  },
  {
    icon: <Smartphone className="w-5 h-5" />,
    title: "PWA — Works Anywhere",
    description:
      "Offline-capable progressive web app. Add to your home screen on iOS, Android, or desktop.",
    color: "text-pink-400 bg-pink-400/10 border-pink-400/20",
  },
];

function FeatureCard({ feature }: { feature: Feature }) {
  return (
    <div className="group relative rounded-xl border border-white/[0.07] bg-card/50 p-6 hover:border-white/[0.14] hover:bg-card transition-all duration-300 hover:-translate-y-0.5">
      <div className={`inline-flex p-2.5 rounded-lg border ${feature.color} mb-4`}>
        {feature.icon}
      </div>
      <h3 className="font-semibold text-foreground mb-2">{feature.title}</h3>
      <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
    </div>
  );
}

export function FeaturesGrid() {
  return (
    <section id="features" className="py-24 px-4 sm:px-6">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <p className="text-sm text-primary font-medium uppercase tracking-widest mb-3">Features</p>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
            Everything email should have always been
          </h2>
          <p className="mt-4 text-muted-foreground max-w-xl mx-auto text-base leading-relaxed">
            Built from scratch around AI assistance — not bolted on as an afterthought.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {FEATURES.map((f) => (
            <FeatureCard key={f.title} feature={f} />
          ))}
        </div>
      </div>
    </section>
  );
}
