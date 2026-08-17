'use client';

import { useState, useCallback, useEffect } from 'react';
import Screen from './components/Screen';
import CircleButton from './components/CircleButton';
import IdentityModal from './components/IdentityModal';

const STORAGE_KEY = 'drinks-logged-by';

export default function Home() {
  const [playing, setPlaying] = useState(false);
  const [count, setCount] = useState(0);
  const [todayCount, setTodayCount] = useState(0);
  const [loggedBy, setLoggedBy] = useState('');
  const [needsIdentity, setNeedsIdentity] = useState(false);

  const refreshCount = useCallback(() => {
    fetch('/api/count')
      .then((r) => { if (r.ok) return r.json(); throw new Error(); })
      .then((data) => {
        setCount(data.count);
        setTodayCount(data.today ?? data.count);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    refreshCount();

    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved) {
      setLoggedBy(saved);
    } else {
      setNeedsIdentity(true);
    }

    const interval = setInterval(refreshCount, 10000);
    return () => clearInterval(interval);
  }, [refreshCount]);

  const saveIdentity = useCallback((value) => {
    window.localStorage.setItem(STORAGE_KEY, value);
    setLoggedBy(value);
    setNeedsIdentity(false);
  }, []);

  const handleClick = useCallback(() => {
    if (playing) return;
    setPlaying(true);
    setTimeout(() => setPlaying(false), 2000);
    const actor = loggedBy || 'unknown';
    setCount((c) => c + 1);
    setTodayCount((c) => c + 1);
    fetch('/api/count', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ logged_by: actor }),
    })
      .then((r) => { if (r.ok) return r.json(); throw new Error(); })
      .then((data) => {
        setCount(data.count);
        if (data.today != null) setTodayCount(data.today);
      })
      .catch(() => {});
  }, [playing, loggedBy]);

  const handleAnimationComplete = useCallback(() => {
    setPlaying(false);
  }, []);

  return (
    <div className="container">
      <div className="section section-top">
        <Screen playing={playing} onAnimationComplete={handleAnimationComplete} count={count} todayCount={todayCount} />
      </div>

      <hr className="divider" />

      <div className="section section-bottom">
        <CircleButton onClick={handleClick} />
      </div>

      {needsIdentity && <IdentityModal onSave={saveIdentity} />}
    </div>
  );
}
