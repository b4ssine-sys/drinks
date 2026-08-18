'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

function generateId() {
  return 'msg_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

export function useChat(conversationId, currentUserId) {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const pollRef = useRef(null);

  const fetchHistory = useCallback(async () => {
    try {
      const res = await fetch(`/api/conversations/${conversationId}/messages?limit=50`);
      if (!res.ok) throw new Error();
      const { data } = await res.json();
      setMessages(data);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [conversationId]);

  useEffect(() => {
    fetchHistory();
    pollRef.current = setInterval(fetchHistory, 4000);
    return () => clearInterval(pollRef.current);
  }, [fetchHistory]);

  const sendMessage = useCallback(async (content, attachments = []) => {
    const msg = {
      _id: generateId(),
      conversation_id: conversationId,
      sender_id: currentUserId,
      type: 'text',
      content,
      metadata: attachments.length ? { attachments } : {},
    };

    try {
      const res = await fetch(`/api/conversations/${conversationId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(msg),
      });
      if (!res.ok) throw new Error();
      const { data } = await res.json();
      setMessages((prev) => [...prev, data]);
    } catch {
      // silent
    }
  }, [conversationId, currentUserId]);

  const addReaction = useCallback(async (messageId, emoji) => {
    try {
      const res = await fetch(`/api/conversations/${conversationId}/messages`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message_id: messageId,
          user_id: currentUserId,
          emoji,
        }),
      });
      if (!res.ok) throw new Error();
      const { data } = await res.json();
      setMessages((prev) =>
        prev.map((m) => (m.id === data.id ? data : m))
      );
    } catch {
      // silent
    }
  }, [conversationId, currentUserId]);

  return { messages, loading, sendMessage, addReaction };
}
