'use client';

import { useState, useCallback } from 'react';

export default function IdentityModal({ onSave }) {
  const [input, setInput] = useState('');

  const handleSave = useCallback(() => {
    onSave((input || '').trim() || 'unknown');
  }, [input, onSave]);

  return (
    <div className="identity-overlay">
      <div className="identity-card">
        <h2 className="identity-title">WHO PRESSED IT?</h2>
        <input
          className="identity-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Enter your name"
          onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); }}
        />
        <button
          type="button"
          className="identity-button"
          onClick={handleSave}
        >
          Save identity
        </button>
      </div>
    </div>
  );
}
