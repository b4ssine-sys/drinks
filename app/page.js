'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import Screen from './components/Screen';
import CircleButton from './components/CircleButton';
import IdentityModal from './components/IdentityModal';
import Chat from './components/Chat';

const STORAGE_KEY = 'drinks-logged-by';

export default function Home() {
  const [playing, setPlaying] = useState(false);
  const clickingRef = useRef(false);
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
    if (playing || clickingRef.current) return;
    clickingRef.current = true;
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
      .catch(() => {})
      .finally(() => { clickingRef.current = false; });
  }, [playing, loggedBy]);

  const handleAnimationComplete = useCallback(() => {
    setPlaying(false);
  }, []);

  return (
    <div className="container">
      <div className="section section-top">
        <Screen playing={playing} onAnimationComplete={handleAnimationComplete} todayCount={todayCount} />
        <div className="date-overlay">
          {(() => {
            const now = new Date();
            const day = now.toLocaleDateString('en-US', { weekday: 'long' }).toUpperCase();
            const dd = String(now.getDate()).padStart(2, '0');
            const mm = String(now.getMonth() + 1).padStart(2, '0');
            const yy = String(now.getFullYear()).slice(-2);
            return `${day} ${dd}-${mm}-${yy}`;
          })()}
        </div>
      </div>

      <hr className="divider" />

      <div className="section section-bottom">
        <div className="bottom-bar">
          <div className="bottom-total">
            <span className="bottom-total-label">TOTAL</span>
            <span className="bottom-total-count">{count}</span>
          </div>
        </div>
        <div className="bottom-content">
          <Chat author={loggedBy || 'anon'} />
          <CircleButton onClick={handleClick} />
        </div>
      </div>

      {needsIdentity && <IdentityModal onSave={saveIdentity} />}
    </div>
  );
}
