'use client';

import { useState, useCallback } from 'react';
import Screen from './components/Screen';
import CircleButton from './components/CircleButton';

export default function Home() {
  const [playing, setPlaying] = useState(false);

  const handleClick = useCallback(() => {
    if (!playing) setPlaying(true);
  }, [playing]);

  const handleAnimationComplete = useCallback(() => {
    setPlaying(false);
  }, []);

  return (
    <div className="container">
      <div className="section section-top">
        <Screen playing={playing} onAnimationComplete={handleAnimationComplete} />
      </div>

      <hr className="divider" />

      <div className="section section-bottom">
        <CircleButton onClick={handleClick} />
      </div>
    </div>
  );
}
