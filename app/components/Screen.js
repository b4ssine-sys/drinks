'use client';

import PixelSprite from './PixelSprite';

const SPRITE_SHEET = '/img/drink-sprite.svg';

export default function Screen({ playing, onAnimationComplete, count }) {
  const today = new Date().toLocaleDateString('en-US', {
    month: 'numeric',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <>
      <h1 className="title">{today} JAYS BEV COUNT</h1>
      <div className="screen">
        <PixelSprite
          spriteSheetSrc={SPRITE_SHEET}
          frameWidth={64}
          frameHeight={100}
          frames={5}
          duration={0.8}
          scale={3}
          playing={playing}
          onComplete={onAnimationComplete}
          label={playing ? 'DRINKING...' : 'READY'}
        />
      </div>
      <div className="total-counter-panel" aria-label="Total drink counter">
        <span className="total-label">TOTAL</span>
        <span className="drink-counter">{count}</span>
      </div>
    </>
  );
}
