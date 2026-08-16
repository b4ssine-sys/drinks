'use client';

import { useCallback } from 'react';

export default function PixelSprite({
  spriteSheetSrc,
  frameWidth,
  frameHeight,
  frames = 2,
  duration = 0.4,
  scale = 3,
  playing = false,
  onComplete,
  label,
}) {
  const scaledWidth = frameWidth * scale;
  const scaledHeight = frameHeight * scale;

  const handleAnimationEnd = useCallback(() => {
    if (onComplete) onComplete();
  }, [onComplete]);

  return (
    <div className="pixel-sprite-wrapper">
      <div
        className={`pixel-sprite ${playing ? 'pixel-sprite--playing' : ''}`}
        onAnimationEnd={handleAnimationEnd}
        style={{
          width: `${scaledWidth}px`,
          height: `${scaledHeight}px`,
          backgroundImage: `url(${spriteSheetSrc})`,
          backgroundSize: `${scaledWidth * frames}px ${scaledHeight}px`,
          '--sprite-duration': `${duration}s`,
          '--sprite-steps': frames,
        }}
      />
      {label && <span className="pixel-sprite-label">{label}</span>}
    </div>
  );
}
