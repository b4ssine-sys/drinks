'use client';

import PixelSprite from './PixelSprite';

const SPRITE_FULL = '/img/drink-full.svg';
const SPRITE_EMPTY = '/img/drink-empty.svg';

export default function Screen({ drinkState }) {
  return (
    <div className="screen">
      <PixelSprite
        spriteSheetSrc={drinkState ? SPRITE_FULL : SPRITE_EMPTY}
        frameWidth={64}
        frameHeight={100}
        frames={1}
        scale={3}
        label={drinkState ? 'DRINKING' : 'EMPTY'}
      />
    </div>
  );
}
