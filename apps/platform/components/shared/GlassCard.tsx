'use client';

import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
}

export function GlassCard({ children, className, hover = true }: GlassCardProps) {
  return (
    <motion.div
      whileHover={hover ? {
        y: -4,
        scale: 1.02,
        boxShadow: '0 20px 40px rgba(0,0,0,0.15)'
      } : undefined}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      className={cn(
        'glass rounded-2xl p-6 relative overflow-hidden',
        className
      )}
    >
      {children}
    </motion.div>
  );
}
