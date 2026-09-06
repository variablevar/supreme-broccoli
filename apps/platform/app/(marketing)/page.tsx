import Image from 'next/image';
import { HeroSection } from '@/components/marketing/hero/HeroSection';
import { EngineShowcase } from '@/components/marketing/engines/EngineShowcase';
import { PricingSection } from '@/components/marketing/pricing/PricingSection';
import { LiveStatsTicker } from '@/components/marketing/stats/LiveStatsTicker';

export default function HomePage() {
  return (
    <>
      <div className="pointer-events-none fixed inset-0 z-0 flex items-center justify-center opacity-30">
        <Image
          src="/brand/imnoshi-logo-full.png"
          alt=""
          width={1254}
          height={1254}
          loading="eager"
          className="h-[85vmin] w-[85vmin] object-contain select-none"
        />
      </div>
      <HeroSection />
      <LiveStatsTicker />
      <EngineShowcase />
      <PricingSection />
    </>
  );
}
