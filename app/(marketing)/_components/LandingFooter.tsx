import Link from "next/link";
import { Mail, MapPin } from "lucide-react";

const DEVELOPER = {
  name: "Parias Mukeba",
  role: "Founder & Lead Engineer",
  email: "pariasmukeba@gmail.com",
  github: "https://github.com/marcuselliot",
  twitter: "https://twitter.com/pariaslunkamba",
  location: "Kinshasa, DRC",
  initials: "PM",
} as const;

const LINKS = {
  Product: [
    { label: "Features", href: "#features" },
    { label: "How it works", href: "#how-it-works" },
    { label: "Get Started", href: "/auth/signin" },
  ],
  Legal: [
    { label: "Privacy Policy", href: "/privacy" },
    { label: "Terms of Service", href: "/terms" },
  ],
  Dev: [
    { label: "GitHub", href: DEVELOPER.github },
    { label: "Status", href: "#" },
  ],
};

export function LandingFooter() {
  return (
    <footer className="border-t border-border/50 bg-card/20">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
          {/* Brand */}
          <div className="space-y-4 lg:col-span-1">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shadow-lg shadow-primary/30">
                <Mail className="w-4 h-4 text-white" />
              </div>
              <span className="font-bold text-foreground text-lg">Pmail</span>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              The AI-first email client. Unified inbox, smart summaries, and reply drafts — all in one fast PWA.
            </p>
          </div>

          {/* Link columns */}
          {Object.entries(LINKS).map(([group, links]) => (
            <div key={group} className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/60">{group}</p>
              <ul className="space-y-2">
                {links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                      {...(link.href.startsWith("http") ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          {/* Developer card */}
          <div className="rounded-xl border border-border/60 bg-card/50 p-4 space-y-3 h-fit">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/60">Built by</p>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white font-bold text-sm shrink-0 shadow-md shadow-primary/30">
                {DEVELOPER.initials}
              </div>
              <div>
                <p className="font-semibold text-foreground text-sm">{DEVELOPER.name}</p>
                <p className="text-xs text-muted-foreground">{DEVELOPER.role}</p>
              </div>
            </div>
            <div className="space-y-1.5 text-xs text-muted-foreground">
              <a
                href={`mailto:${DEVELOPER.email}`}
                className="flex items-center gap-2 hover:text-foreground transition-colors group"
              >
                <Mail className="w-3.5 h-3.5 text-muted-foreground/50 group-hover:text-primary transition-colors" />
                {DEVELOPER.email}
              </a>
              <a
                href={DEVELOPER.github}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 hover:text-foreground transition-colors group"
              >
                <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 text-muted-foreground/50 group-hover:text-primary transition-colors fill-current"><path d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.342-3.369-1.342-.454-1.155-1.11-1.462-1.11-1.462-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0112 6.836c.85.004 1.705.114 2.504.336 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.202 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.163 22 16.418 22 12c0-5.523-4.477-10-10-10z"/></svg>
                {DEVELOPER.github.replace("https://", "")}
              </a>
              <a
                href={DEVELOPER.twitter}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 hover:text-foreground transition-colors group"
              >
                <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 text-muted-foreground/50 group-hover:text-primary transition-colors fill-current"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                @pariaslunkamba
              </a>
              <div className="flex items-center gap-2">
                <MapPin className="w-3.5 h-3.5 text-muted-foreground/50" />
                {DEVELOPER.location}
              </div>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-10 pt-6 border-t border-border/40 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground/50">
          <span>© 2025 Pmail · All rights reserved</span>
          <span>Made with Claude · Kinshasa, DRC</span>
        </div>
      </div>
    </footer>
  );
}
