import Image from 'next/image';
import { cn } from '@/lib/utils';

type Props = { size?: number; showWordmark?: boolean; priority?: boolean; className?: string; wordmarkClassName?: string; flippable?: boolean };
export function BrandLogo({ size = 44, showWordmark = true, priority = false, className, wordmarkClassName }: Props) {
  return (
    <span data-no-translate className={cn('inline-flex items-center gap-3', className)}>
      <Image
        src="/brand/imnoshi-logo.png"
        alt="Imnoshi logo"
        width={size}
        height={size}
        priority={priority}
        className="shrink-0 select-none object-contain"
      />
      {showWordmark ? (
        <span className={cn('font-space text-2xl font-bold tracking-tight text-primary', wordmarkClassName)}>
          Imo<span aria-hidden="true" className="text-foreground">.</span>
        </span>
      ) : null}
    </span>
  );
}
