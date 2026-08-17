'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

export default function Chat({ author }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const listRef = useRef(null);

  const fetchMessages = useCallback(() => {
    fetch('/api/messages')
      .then((r) => { if (r.ok) return r.json(); throw new Error(); })
      .then(setMessages)
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetchMessages();
    const interval = setInterval(fetchMessages, 4000);
    return () => clearInterval(interval);
  }, [fetchMessages]);

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages]);

  const send = useCallback(() => {
    const text = input.trim();
    if (!text || sending) return;
    setSending(true);
    fetch('/api/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ author, body: text }),
    })
      .then((r) => { if (r.ok) return r.json(); throw new Error(); })
      .then((msg) => {
        setMessages((prev) => [...prev, msg]);
        setInput('');
        fetchMessages();
      })
      .catch(() => {})
      .finally(() => setSending(false));
  }, [input, sending, author, fetchMessages]);

  const handleKey = useCallback((e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }, [send]);

  return (
    <div className="chat-box">
      <div className="chat-header">
        <span className="chat-title">BEV CHAT</span>
      </div>
      <div className="chat-messages" ref={listRef}>
        {messages.map((m) => (
          <div key={m.id} className={`chat-msg ${m.author === author ? 'chat-msg--mine' : ''}`}>
            <span className="chat-msg-author">{m.author}</span>
            <span className="chat-msg-body">{m.body}</span>
          </div>
        ))}
        {messages.length === 0 && (
          <div className="chat-empty">No messages yet</div>
        )}
      </div>
      <div className="chat-input-row">
        <input
          className="chat-input"
          value={input}
          onChange={(e) => setInput(e.target.value.slice(0, 50))}
          onKeyDown={handleKey}
          placeholder="Say something..."
          maxLength={50}
        />
        <button className="chat-send" onClick={send} disabled={sending || !input.trim()}>
          &gt;
        </button>
      </div>
      <div className="chat-char-count">{input.length}/50</div>
    </div>
  );
}
