'use client';
import Image from 'next/image';
import { useRef, useState, type KeyboardEvent, type MouseEvent } from 'react';
import { motion, useAnimationControls } from 'framer-motion';
import { cn } from '@/lib/utils';
import { LiveBrand } from '@/components/shared/LiveBrand';
import { CoinBackFace } from '@/components/shared/CoinBackFace';

type BrandLogoProps = {
  size?: number;
  showWordmark?: boolean;
  priority?: boolean;
  className?: string;
  wordmarkClassName?: string;
  flippable?: boolean;
};

const MIN_FLIPS = 5;
const MAX_FLIPS = 10;

export function BrandLogo({
  size = 44,
  showWordmark = true,
  priority = false,
  className,
  wordmarkClassName,
  flippable = false,
}: BrandLogoProps) {
  const controls = useAnimationControls();
  const rotation = useRef(0);
  const [spinning, setSpinning] = useState(false);

  const flipCoin = async (event: MouseEvent | KeyboardEvent) => {
    event.preventDefault();
    event.stopPropagation();
    if (spinning) return;
    setSpinning(true);

    const flips = Math.floor(Math.random() * (MAX_FLIPS - MIN_FLIPS + 1)) + MIN_FLIPS;
    rotation.current += flips * 180;
    const liftHeight = size * 1.4;

    await controls.start({
      rotateY: rotation.current,
      y: -liftHeight,
      transition: { duration: 0.55 + flips * 0.035, ease: 'easeOut' },
    });
    await controls.start({
      y: [-liftHeight, size * 0.28, 0],
      transition: { duration: 0.45, times: [0, 0.65, 1], ease: ['easeIn', 'easeOut'] },
    });

    setSpinning(false);
  };

  return (
    <span className={cn('inline-flex items-center gap-3', className)} data-no-translate>
      {flippable ? (
        <span
          role="button"
          tabIndex={0}
          aria-label="Flip the IMNOSHI coin"
          onClick={flipCoin}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') flipCoin(event);
          }}
          className="relative inline-block shrink-0 select-none outline-none"
          style={{
            width: size,
            height: size,
            perspective: '600px',
            filter: 'drop-shadow(0 0 8px rgba(246, 216, 120, 0.28))',
          }}
        >
          <motion.span
            animate={controls}
            initial={{ rotateY: 0, y: 0 }}
            className="relative block cursor-pointer"
            style={{
              width: size,
              height: size,
              transformStyle: 'preserve-3d',
            }}
          >
            <span className="absolute inset-0" style={{ backfaceVisibility: 'hidden' }}>
              <Image
                src="/brand/imnoshi-logo.png"
                alt="IMNOSHI logo"
                width={size}
                height={size}
                priority={priority}
                className="h-full w-full object-contain"
              />
            </span>
            <span
              className="absolute inset-0"
              style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
            >
              <CoinBackFace className="h-full w-full" />
            </span>
          </motion.span>
        </span>
      ) : (
        <Image
          src="/brand/imnoshi-logo.png"
          alt="IMNOSHI logo"
          width={size}
          height={size}
          priority={priority}
          className="brand-logo-image shrink-0 select-none"
        />
      )}
      {showWordmark ? <LiveBrand compact className={wordmarkClassName} /> : null}
    </span>
  );
}
