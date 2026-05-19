import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { LandingNav } from "@/app/(marketing)/_components/LandingNav";
import { HeroSection } from "@/app/(marketing)/_components/HeroSection";
import { SocialProofBar } from "@/app/(marketing)/_components/SocialProofBar";
import { FeaturesGrid } from "@/app/(marketing)/_components/FeaturesGrid";
import { HowItWorks } from "@/app/(marketing)/_components/HowItWorks";
import { DeepDiveRows } from "@/app/(marketing)/_components/DeepDiveRows";
import { CtaBanner } from "@/app/(marketing)/_components/CtaBanner";
import { LandingFooter } from "@/app/(marketing)/_components/LandingFooter";

export default async function RootPage() {
  const session = await auth();
  if (session) redirect("/inbox");

  return (
    <div className="min-h-screen bg-background text-foreground">
      <LandingNav />
      <main>
        <HeroSection />
        <SocialProofBar />
        <FeaturesGrid />
        <HowItWorks />
        <DeepDiveRows />
        <CtaBanner />
      </main>
      <LandingFooter />
    </div>
  );
}
