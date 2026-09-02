import { GlassCard } from '@/components/shared/GlassCard';
import { Check } from 'lucide-react';

interface BuildOptionCardProps {
  name: string;
  price: string;
  description: string;
  features: string[];
}

export function BuildOptionCard({ name, price, description, features }: BuildOptionCardProps) {
  return (
    <GlassCard className="h-full flex flex-col">
      <div className="mb-6">
        <h3 className="font-space text-2xl font-bold text-foreground mb-2">{name}</h3>
        <p className="text-foreground/50 text-sm mb-4">{description}</p>
        <div className="text-3xl font-bold text-foreground">{price}</div>
      </div>

      <ul className="space-y-3 flex-1">
        {features.map((feature) => (
          <li key={feature} className="flex items-start gap-3 text-sm text-foreground/70">
            <Check size={16} className="text-primary mt-0.5 shrink-0" />
            {feature}
          </li>
        ))}
      </ul>

      <button className="mt-8 w-full py-3 rounded-xl border border-border/10 text-foreground font-semibold hover:bg-accent/5 transition-colors">
        Choose {name}
      </button>
    </GlassCard>
  );
}
