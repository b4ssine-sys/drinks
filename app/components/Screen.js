'use client';

import PixelSprite from './PixelSprite';

export default function Screen({ playing, onAnimationComplete, count }) {
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
          <span className="drink-counter">{count}</span>
        </div>

        <div className="center-visual">
          <div className="drink-badge" aria-label="Drink icon">
            <img src="/img/drink-full.svg" alt="Drink" />
          </div>
          <PixelSprite
            spriteSheetSrc="/img/running.png"
            frameWidth={64}
            frameHeight={64}
            frames={4}
            duration={0.7}
            scale={2.4}
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
