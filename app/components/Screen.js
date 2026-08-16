'use client';

import PixelSprite from './PixelSprite';

const SPRITE_SHEET = '/img/drink-sprite.svg';

export default function Screen({ playing, onAnimationComplete, count }) {
  return (
    <>
      <h1 className="title">JAYS BEV COUNT</h1>
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
      <span className="drink-counter">{count}</span>
    </>
  );
}
