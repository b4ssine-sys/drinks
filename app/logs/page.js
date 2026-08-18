'use client';

import { useState, useEffect, useCallback } from 'react';

export default function Logs() {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchMessages = useCallback(() => {
    fetch('/api/messages')
      .then((r) => { if (r.ok) return r.json(); throw new Error(); })
      .then((data) => {
        setMessages(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchMessages();
    const interval = setInterval(fetchMessages, 5000);
    return () => clearInterval(interval);
  }, [fetchMessages]);

  return (
    <div className="logs-page">
      <div className="logs-header">
        <h1 className="logs-title">BEV CHAT LOGS</h1>
        <span className="logs-count">{messages.length} messages</span>
      </div>
      <div className="logs-list">
        {loading && <div className="logs-empty">Loading...</div>}
        {!loading && messages.length === 0 && (
          <div className="logs-empty">No messages yet</div>
        )}
        {messages.map((m) => {
          const meta = typeof m.metadata === 'string' ? JSON.parse(m.metadata) : (m.metadata || {});
          const reactions = typeof m.reactions === 'string' ? JSON.parse(m.reactions) : (m.reactions || []);
          const attachments = meta.attachments || [];

          return (
            <div key={m.id} className="logs-entry">
              <div className="logs-entry-meta">
                <span className="logs-entry-author">{m.sender_id}</span>
                <span className="logs-entry-type">[{m.type}]</span>
                <span className="logs-entry-time">
                  {new Date(m.created_at).toLocaleString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                    hour12: false,
                  })}
                </span>
              </div>
              <div className="logs-entry-body">{m.content}</div>
              {attachments.length > 0 && (
                <div className="logs-entry-attachments">
                  {attachments.map((a, i) => (
                    <span key={i} className="logs-attachment">[{a.type}]</span>
                  ))}
                </div>
              )}
              {reactions.length > 0 && (
                <div className="logs-entry-reactions">
                  {reactions.map((r, i) => (
                    <span key={i} className="logs-reaction">{r.emoji}</span>
                  ))}
                </div>
              )}
              {m.parent_id && (
                <div className="logs-entry-reply">reply to {m.parent_id}</div>
              )}
            </div>
          );
        })}
      </div>
      <a href="/" className="logs-back">&lt; BACK</a>
    </div>
  );
}
