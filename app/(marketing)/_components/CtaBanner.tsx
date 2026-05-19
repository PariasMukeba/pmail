import Link from "next/link";
import { ArrowRight } from "lucide-react";

export function CtaBanner() {
  return (
    <section className="py-24 px-4 sm:px-6">
      <div className="max-w-4xl mx-auto">
        <div className="relative rounded-2xl overflow-hidden border border-primary/20">
          {/* Background gradient */}
          <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-indigo-900/20 to-violet-900/10" />
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-violet-600/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/4" />

          <div className="relative px-8 py-16 text-center space-y-6">
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
              Ready to spend less time on email?
            </h2>
            <p className="text-muted-foreground text-lg max-w-md mx-auto">
              Connect your first account in under a minute. No credit card required.
            </p>
            <Link
              href="/auth/signin"
              className="group inline-flex items-center gap-2 bg-primary hover:bg-primary/90 text-white font-semibold px-8 py-3.5 rounded-lg transition-all shadow-xl shadow-primary/30 hover:shadow-primary/50 hover:-translate-y-0.5 text-base"
            >
              Get Started Free
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
