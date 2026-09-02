'use client';
import { useRef } from 'react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { GlassCard } from '@/components/shared/GlassCard';

gsap.registerPlugin(ScrollTrigger);

interface EngineCardProps {
  number: number;
  title: string;
  description: string;
  features: string[];
}

export function EngineCard({ number, title, description, features }: EngineCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    gsap.fromTo(
      cardRef.current,
      { rotateY: -90, opacity: 0, transformOrigin: 'left center' },
      {
        rotateY: 0,
        opacity: 1,
        duration: 1.2,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: cardRef.current,
          start: 'top 80%',
          end: 'top 30%',
          scrub: 1,
        },
      }
    );
  }, { scope: cardRef });

  return (
    <div ref={cardRef} style={{ perspective: '1000px' }}>
      <GlassCard className="h-full">
        <div className="flex items-center gap-4 mb-4">
          <span className="text-5xl font-bold text-foreground/10 font-space">0{number}</span>
          <h3 className="text-2xl font-bold font-space text-foreground">{title}</h3>
        </div>
        <p className="text-foreground/70 mb-6 leading-relaxed">{description}</p>
        <ul className="space-y-2">
          {features.map((f, i) => (
            <li key={i} className="flex items-center gap-2 text-sm text-foreground/60">
              <span className="w-1.5 h-1.5 rounded-full bg-primary" />
              {f}
            </li>
          ))}
        </ul>
      </GlassCard>
    </div>
  );
}
