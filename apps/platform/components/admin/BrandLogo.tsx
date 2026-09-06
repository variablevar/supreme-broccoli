import { cn } from '@/lib/utils';

type Props = { size?: number; showWordmark?: boolean; priority?: boolean; className?: string; wordmarkClassName?: string; flippable?: boolean };
export function BrandLogo({ className, wordmarkClassName }: Props) {
  return <span data-no-translate className={cn('inline-flex font-space text-2xl font-bold tracking-tight text-primary', className, wordmarkClassName)}>Imo<span aria-hidden="true" className="text-foreground">.</span></span>;
}
