'use client';

import { useState, useEffect, useRef } from 'react';
import PixelSprite from './PixelSprite';

function useSpriteScale() {
  const [scale, setScale] = useState(0.7);

  useEffect(() => {
    function update() {
      const vh = window.innerHeight;
      const available = vh * 0.7 - 60;
      const factor = Math.min(1, Math.max(0.3, (available - 50) / 634.5));
      setScale(factor);
    }
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  return scale;
}

export default function Screen({ playing, onAnimationComplete, todayCount }) {
  const spriteScale = useSpriteScale();

  const titleText = `JAYS BEV COUNT`;
  const chars = titleText.split('');
  const n = chars.length;
  const maxDrop = 14;
  const maxAngle = 8;

  const titleRef = useRef(null);
  const naturalWidth = useRef(0);
  const [titleScale, setTitleScale] = useState(1);

  useEffect(() => {
    function update() {
      if (!titleRef.current) return;
      if (naturalWidth.current === 0) {
        naturalWidth.current = titleRef.current.scrollWidth;
      }
      const available = window.innerWidth - 16;
      setTitleScale(Math.min(1, available / naturalWidth.current));
    }
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  return (
    <>
      <h1
        ref={titleRef}
        className="title"
        aria-label={titleText}
        style={{ transform: `scale(${titleScale})`, transformOrigin: 'center top' }}
      >
        {chars.map((char, i) => {
          const t = n > 1 ? (2 * i / (n - 1)) - 1 : 0;
          const y = maxDrop * t * t;
          const r = maxAngle * t;
          const isSpace = char === ' ';
          return (
            <span
              key={i}
              className="title-char"
              style={{
                transform: `translateY(${y}px) rotate(${r}deg)`,
                ...(isSpace ? { width: '0.5em' } : {}),
              }}
            >
              {isSpace ? ' ' : char}
            </span>
          );
        })}
      </h1>
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
            scale={4.5 * spriteScale}
            playing={playing}
          />
          <PixelSprite
            spriteSheetSrc="/img/running-combined.png"
            frameWidth={169.25}
            frameHeight={369}
            frames={8}
            duration={1.4}
            scale={0.5 * spriteScale}
            playing={playing}
            onComplete={onAnimationComplete}
            label={playing ? 'RUNNING...' : 'READY'}
          />
        </div>

      </div>
    </>
  );
}
