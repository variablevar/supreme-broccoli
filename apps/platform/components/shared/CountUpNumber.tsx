'use client';
import { useEffect, useState, useRef } from 'react';
import { useInView } from 'framer-motion';

interface CountUpNumberProps {
  end: number;
  duration?: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  className?: string;
}

export function CountUpNumber({
  end,
  duration = 2,
  prefix = '',
  suffix = '',
  decimals = 0,
  className,
}: CountUpNumberProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-50px' });
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (!isInView) return;
    let start = 0;
    const totalFrames = duration * 60;
    const increment = end / totalFrames;
    let frame = 0;

    const timer = setInterval(() => {
      frame += 1;
      start += increment;
      if (frame >= totalFrames) {
        setValue(end);
        clearInterval(timer);
      } else {
        setValue(start);
      }
    }, 1000 / 60);

    return () => clearInterval(timer);
  }, [isInView, end, duration]);

  return (
    <span ref={ref} className={className}>
      {prefix}
      {value.toFixed(decimals).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
      {suffix}
    </span>
  );
}
