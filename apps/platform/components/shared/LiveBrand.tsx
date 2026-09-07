import { cn } from '@/lib/utils';

type LiveBrandProps = {
  className?: string;
  compact?: boolean;
};

export function LiveBrand({ className, compact = false }: LiveBrandProps) {
  return (
    <span
      className={cn('live-brand font-space font-black', compact ? 'text-lg' : 'text-xl', className)}
      data-no-translate
    >
      Imo
    </span>
  );
}
