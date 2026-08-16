'use client';

import { useState, useCallback, useEffect } from 'react';
import Screen from './components/Screen';
import CircleButton from './components/CircleButton';

export default function Home() {
  const [playing, setPlaying] = useState(false);
  const [count, setCount] = useState(0);

  useEffect(() => {
    fetch('/api/count')
      .then((r) => r.json())
      .then((data) => setCount(data.count))
      .catch(() => {});
  }, []);

  const handleClick = useCallback(() => {
    if (!playing) setPlaying(true);
  }, [playing]);

  const handleAnimationComplete = useCallback(() => {
    setPlaying(false);
    fetch('/api/count', { method: 'POST' })
      .then((r) => r.json())
      .then((data) => setCount(data.count))
      .catch(() => setCount((c) => c + 1));
  }, []);

  return (
    <div className="container">
      <div className="section section-top">
        <Screen playing={playing} onAnimationComplete={handleAnimationComplete} count={count} />
      </div>

      <hr className="divider" />

      <div className="section section-bottom">
        <CircleButton onClick={handleClick} />
      </div>
    </div>
  );
}
