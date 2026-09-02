import { HeroSection } from '@/components/marketing/hero/HeroSection';
import { EngineShowcase } from '@/components/marketing/engines/EngineShowcase';
import { PricingSection } from '@/components/marketing/pricing/PricingSection';
import { LiveStatsTicker } from '@/components/marketing/stats/LiveStatsTicker';

export default function HomePage() {
  return (
    <>
      <HeroSection />
      <LiveStatsTicker />
      <EngineShowcase />
      <PricingSection />
    </>
  );
}
