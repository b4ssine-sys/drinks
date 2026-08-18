'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useChat } from '@/hooks/useChat';

const CONV_ID = 'conv_bev_chat';

export default function Chat({ author }) {
  const { messages, loading, sendMessage, addReaction } = useChat(CONV_ID, author);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const listRef = useRef(null);

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages]);

  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || sending) return;
    setSending(true);
    setInput('');
    await sendMessage(text);
    setSending(false);
  }, [input, sending, sendMessage]);

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
        {loading && <div className="chat-empty">Loading...</div>}
        {!loading && messages.map((m) => {
          const msgId = m.id || m._id;
          const reactions = typeof m.reactions === 'string' ? JSON.parse(m.reactions) : (m.reactions || []);
          return (
            <div key={msgId} className={`chat-msg ${m.sender_id === author ? 'chat-msg--mine' : ''}`}>
              <span className="chat-msg-author">{m.sender_id}</span>
              <span className="chat-msg-body">{m.content}</span>
              {reactions.length > 0 && (
                <span className="chat-msg-reactions">
                  {reactions.map((r, i) => (
                    <span key={i} className="chat-reaction">{r.emoji}</span>
                  ))}
                </span>
              )}
              <button
                className="chat-react-btn"
                onClick={() => addReaction(msgId, '👍')}
                title="React"
              >
                +👍
              </button>
            </div>
          );
        })}
        {!loading && messages.length === 0 && (
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
