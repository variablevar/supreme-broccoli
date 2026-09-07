import { HeroSection } from '@/components/marketing/hero/HeroSection';
import { EngineShowcase } from '@/components/marketing/engines/EngineShowcase';
import { PricingSection } from '@/components/marketing/pricing/PricingSection';
import { LiveStatsTicker } from '@/components/marketing/stats/LiveStatsTicker';

export default function HomePage() {
  return (
    <>
      <div className="pointer-events-none fixed inset-0 z-0 flex items-center justify-center opacity-30">
        <span data-no-translate aria-hidden="true" className="font-space text-[35vmin] font-bold tracking-tighter text-primary/10 select-none">Imo.</span>
      </div>
      <HeroSection />
      <LiveStatsTicker />
      <EngineShowcase />
      <PricingSection />
    </>
  );
}
