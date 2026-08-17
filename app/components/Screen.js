'use client';

import PixelSprite from './PixelSprite';

export default function Screen({ playing, onAnimationComplete, count, todayCount }) {
  const today = new Date().toLocaleDateString('en-US', {
    month: 'numeric',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <>
      <h1 className="title">{today} JAYS BEV COUNT</h1>
      <div className="hero-row">
        <div className="counter-panel" aria-label="Today's drink counter">
          <span className="counter-label">TODAY</span>
          <span className="drink-counter">{todayCount}</span>
        </div>

        <div className="center-visual">
          <PixelSprite
            spriteSheetSrc="/img/drink-sprite.svg"
            frameWidth={64}
            frameHeight={100}
            frames={5}
            duration={1}
            scale={3}
            playing={playing}
          />
          <PixelSprite
            spriteSheetSrc="/img/running-combined.png"
            frameWidth={169.25}
            frameHeight={369}
            frames={8}
            duration={1.4}
            scale={0.5}
            playing={playing}
            onComplete={onAnimationComplete}
            label={playing ? 'RUNNING...' : 'READY'}
          />
        </div>

        <div className="counter-panel" aria-label="Total drink counter">
          <span className="counter-label">TOTAL</span>
          <span className="drink-counter">{count}</span>
        </div>
      </div>
    </>
  );
}
