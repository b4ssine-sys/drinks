'use client';

import PixelSprite from './PixelSprite';

const SPRITE_SHEET = '/img/drink-sprite.svg';

export default function Screen({ playing, onAnimationComplete }) {
  return (
    <div className="screen">
      <PixelSprite
        spriteSheetSrc={SPRITE_SHEET}
        frameWidth={64}
        frameHeight={100}
        frames={5}
        duration={0.4}
        scale={3}
        playing={playing}
        onComplete={onAnimationComplete}
        label={playing ? 'DRINKING...' : 'READY'}
      />
    </div>
  );
}
