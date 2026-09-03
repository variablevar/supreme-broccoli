import Image from 'next/image';
import { cn } from '@/lib/utils';

type BrandLogoProps = {
  size?: number;
  showWordmark?: boolean;
  priority?: boolean;
  className?: string;
};

export function BrandLogo({ size = 44, showWordmark = true, priority = false, className }: BrandLogoProps) {
  return (
    <span className={cn('inline-flex items-center gap-3', className)}>
      <Image
        src="/brand/imnoshi-logo.png"
        alt="IMNOSHI logo"
        width={size}
        height={size}
        priority={priority}
        className="brand-logo-image shrink-0 select-none"
      />
      {showWordmark ? <span className="live-brand font-space font-bold">IMNOSHI</span> : null}
    </span>
  );
}
