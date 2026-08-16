'use client';

import { useState, useCallback, useEffect } from 'react';
import Screen from './components/Screen';
import CircleButton from './components/CircleButton';

const STORAGE_KEY = 'drinks-logged-by';

export default function Home() {
  const [playing, setPlaying] = useState(false);
  const [count, setCount] = useState(0);
  const [todayCount, setTodayCount] = useState(0);
  const [loggedBy, setLoggedBy] = useState('');
  const [identityInput, setIdentityInput] = useState('');
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

  const saveIdentity = useCallback(() => {
    const value = (identityInput || '').trim() || 'unknown';
    window.localStorage.setItem(STORAGE_KEY, value);
    setLoggedBy(value);
    setNeedsIdentity(false);
  }, [identityInput]);

  const handleClick = useCallback(() => {
    if (playing) return;
    setPlaying(true);
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

      {needsIdentity && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(10, 10, 26, 0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100,
          padding: '16px',
        }}>
          <div style={{
            background: '#12122a',
            border: '2px solid #ff2d7b',
            borderRadius: '12px',
            padding: '24px',
            width: 'min(400px, 100%)',
            boxShadow: '0 0 30px rgba(255, 45, 123, 0.3)',
          }}>
            <h2 style={{
              fontFamily: 'Press Start 2P, monospace',
              fontSize: '16px',
              letterSpacing: '2px',
              color: '#ff2d7b',
              textAlign: 'center',
              marginBottom: '16px',
            }}>
              WHO PRESSED IT?
            </h2>
            <input
              value={identityInput}
              onChange={(event) => setIdentityInput(event.target.value)}
              placeholder="Enter your name"
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '8px',
                border: '2px solid #00e5cc',
                background: '#0a0a1a',
                color: '#f0e6ff',
                fontSize: '16px',
                marginBottom: '16px',
              }}
              onKeyDown={(event) => {
                if (event.key === 'Enter') saveIdentity();
              }}
            />
            <button
              type="button"
              onClick={saveIdentity}
              style={{
                width: '100%',
                padding: '12px 16px',
                borderRadius: '8px',
                border: 'none',
                background: '#ff2d7b',
                color: '#0a0a1a',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Save identity
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
