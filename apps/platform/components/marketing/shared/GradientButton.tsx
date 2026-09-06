import { cn } from '@/lib/utils';

interface GradientButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
}

export function GradientButton({ children, className, ...props }: GradientButtonProps) {
  return (
    <button
      className={cn(
        'relative overflow-hidden rounded-xl px-6 py-3 font-semibold text-primary-foreground transition-all',
        'bg-primary',
        'hover:bg-primary/90 hover:scale-105 active:scale-95',
        className
      )}
      {...props}
    >
      <span className="relative z-10">{children}</span>
    </button>
  );
}
