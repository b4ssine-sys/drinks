'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

const CONV_ID = 'conv_bev_chat';

function generateId() {
  return 'msg_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

export default function Chat({ author }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const listRef = useRef(null);

  const fetchMessages = useCallback(() => {
    fetch(`/api/messages?conversation_id=${CONV_ID}`)
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
      body: JSON.stringify({
        _id: generateId(),
        conversation_id: CONV_ID,
        sender_id: author,
        type: 'text',
        content: text,
      }),
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
          <div key={m.id} className={`chat-msg ${m.sender_id === author ? 'chat-msg--mine' : ''}`}>
            <span className="chat-msg-author">{m.sender_id}</span>
            <span className="chat-msg-body">{m.content}</span>
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
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKey}
          placeholder="Say something..."
        />
        <button className="chat-send" onClick={send} disabled={sending || !input.trim()}>
          &gt;
        </button>
      </div>
    </div>
  );
}
