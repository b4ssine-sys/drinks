'use client';

import { useState, useEffect, useRef } from 'react';
import PixelSprite from './PixelSprite';

function useSpriteScales() {
  const [scales, setScales] = useState({ runner: 1, bev: 3 });

  useEffect(() => {
    function update() {
      const vh = window.innerHeight;
      const sectionTopHeight = vh * 0.7;
      const targetRunnerHeight = sectionTopHeight * 0.75;
      const runnerScale = Math.max(0.4, targetRunnerHeight / 369);
      const bevScale = Math.max(1.5, Math.min(4, sectionTopHeight * 0.35 / 100));
      setScales({ runner: runnerScale, bev: bevScale });
    }
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  return scales;
}

export default function Screen({ playing, onAnimationComplete, todayCount }) {
  const { runner: runnerScale, bev: bevScale } = useSpriteScales();

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
        <div className="hero-left">
          <PixelSprite
            spriteSheetSrc="/img/running-combined.png"
            frameWidth={169.25}
            frameHeight={369}
            frames={8}
            duration={1.4}
            scale={runnerScale}
            playing={playing}
            onComplete={onAnimationComplete}
            label={playing ? 'RUNNING...' : 'READY'}
          />
        </div>

        <div className="hero-right">
          <PixelSprite
            spriteSheetSrc="/img/drink-sprite.svg"
            frameWidth={64}
            frameHeight={100}
            frames={5}
            duration={1}
            scale={bevScale}
            playing={playing}
          />
          <div className="counter-panel" aria-label="Today's drink counter">
            <span className="counter-label">TODAY</span>
            <span className="drink-counter">{todayCount}</span>
          </div>
        </div>
      </div>
    </>
  );
}
