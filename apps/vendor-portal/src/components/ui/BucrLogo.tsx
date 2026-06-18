import React from 'react';
import Image from 'next/image';

interface BucrLogoProps {
  width?: number;
  height?: number;
  className?: string;
}

export function BucrLogo({ width = 400, height = 100, className }: BucrLogoProps) {
  return (
    <Image
      src="/bucr_logo.png"
      alt="Bucr"
      width={width}
      height={height}
      className={className}
      priority
      style={{ objectFit: 'contain' }}
    />
  );
}
