import { useChatDrawer } from '@/context/ChatDrawerContext';
import { useEffect, useRef, useState } from 'react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export default function ChatDrawer() {
  const { isDrawerOpen, closeDrawer } = useChatDrawer();
  const drawerRef = useRef<HTMLDivElement>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeDrawer();
    };
    if (isDrawerOpen) {
      document.addEventListener('keydown', handleEscape);
    }
    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isDrawerOpen, closeDrawer]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  if (!input.trim()) return;

  const userMessage: Message = { role: 'user', content: input };
  setMessages((prev) => [...prev, userMessage]);
  setInput('');
  setIsLoading(true);

  try {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: [...messages, userMessage] }),
    });

    if (!res.ok) throw new Error('Network error');

    const data = await res.json();
    const assistantMessage: Message = {
      role: 'assistant',
      content: data.reply,
    };

    setMessages((prev) => [...prev, assistantMessage]);
  } catch (err) {
    console.error('Chat error:', err);
  } finally {
    setIsLoading(false);
  }
};


  return (
    <div
      className={`cart-backdrop ${isDrawerOpen ? 'open' : ''}`}
      onClick={closeDrawer}
    >
      <div
        className={`cart-drawer ${isDrawerOpen ? 'open' : ''}`}
        onClick={(e) => e.stopPropagation()}
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="chat-drawer-title"
      >
        <div className="cart-drawer-inner">
          <div className="cart-header">
            <h2 id="chat-drawer-title">SUPPORT</h2>
            <button onClick={closeDrawer} aria-label="Close chat">
              &times;
            </button>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', marginBottom: '16px' }}>
            {messages.map((msg, i) => (
              <div
                key={i}
                style={{
                  background: msg.role === 'user' ? '#f0f0f0' : '#ececec',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  marginBottom: '8px',
                  fontSize: '14px',
                  color: '#181818',
                }}
              >
                <strong>{msg.role === 'user' ? 'You' : 'Support'}:</strong>{' '}
                {msg.content}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '8px' }}>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask us something..."
              style={{
                flex: 1,
                padding: '8px 12px',
                fontSize: '14px',
                border: '1px solid #ccc',
                borderRadius: '4px',
              }}
              disabled={isLoading}
            />
            <button
              type="submit"
              style={{
                padding: '8px 16px',
                background: '#181818',
                color: '#fff',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
              }}
              disabled={isLoading}
            >
              {isLoading ? '...' : 'Send'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
