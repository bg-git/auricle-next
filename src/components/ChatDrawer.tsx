import { useChatDrawer } from '@/context/ChatDrawerContext';
import { useEffect, useRef, useState } from 'react';
import React from 'react';


interface Message {
  role: 'user' | 'assistant';
  content: string;
}

function linkify(text: string): React.ReactNode[] {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  return text.split(urlRegex).map((part, i) =>
    urlRegex.test(part) ? (
      <a
        key={i}
        href={part}
        target="_blank"
        rel="noopener noreferrer"
        style={{ color: '#0070f3', textDecoration: 'underline' }}
      >
        {part}
      </a>
    ) : (
      part
    )
  );
}

export default function ChatDrawer() {
  const { isDrawerOpen, closeDrawer } = useChatDrawer();
  const drawerRef = useRef<HTMLDivElement>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [customerEmail, setCustomerEmail] = useState('');
const [emailCaptured, setEmailCaptured] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const emailSentRef = useRef(false);
  const replySound = useRef<HTMLAudioElement | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    replySound.current = new Audio('/message.mp3');
  }, []);

  useEffect(() => {
    if (!isLoading) inputRef.current?.focus();
  }, [isLoading]);

const isLoggedIn = false; // Replace this later with real auth check

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
  }, [messages, isTyping]);

  // Add opening message on first open
  useEffect(() => {
    if (isDrawerOpen && messages.length === 0) {
      setMessages([
        {
          role: 'assistant',
          content: "Hey, we're online. How can we help you today?",
        },
      ]);
    }
    
  }, [isDrawerOpen, messages.length]);
// Send transcript after 2 mins of no new messages
useEffect(() => {
  if (messages.length === 0) return;

  const timeout = setTimeout(() => {
    // Avoid duplicate sends
    if (messages.length < 2 || emailSentRef.current) return;
emailSentRef.current = true;


    // Convert to email-friendly format
    const formattedMessages = messages.map((msg) => ({
      sender: msg.role === 'user' ? 'You' : 'AURICLE',
      text: msg.content,
    }));

    fetch('/api/email/chat-transcript', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: customerEmail || 'anonymous@auricle.co.uk',
     name: 'Customer',
        messages: formattedMessages,
      }),
    });
  }, 2 * 60 * 1000); // 2 minutes

  return () => clearTimeout(timeout);
}, [messages, customerEmail]);

const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  if (!input.trim()) return;

  const userMessage: Message = { role: 'user', content: input };
  const updatedMessages = [...messages, userMessage];

  setMessages(updatedMessages);
  setInput('');
  setIsLoading(true);

  try {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: updatedMessages }), // ✅ FIXED
    });

    if (!res.ok) throw new Error('Network error');

    const data = await res.json();
    const assistantMessage: Message = {
      role: 'assistant',
      content: data.reply,
    };

    // ⏳ Wait 3s before showing "Typing..."
setTimeout(() => {
  setIsTyping(true);

  // ⏱️ Wait another 6s before showing the reply
  setTimeout(() => {
    // ✅ Trigger sound here
    if (replySound.current) {
      replySound.current.currentTime = 0;
      replySound.current.play().catch((err) => {
        console.warn('Failed to play reply sound:', err);
      });
    }

    setMessages((prev) => [...prev, assistantMessage]);
    setIsTyping(false);
    setIsLoading(false);
  }, 6000);
}, 5000);
  } catch (err) {
    console.error('Chat error:', err);
    setIsTyping(false);
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
        <audio ref={replySound} src="/message.mp3" preload="auto" style={{ display: 'none' }} />
        <div className="cart-drawer-inner">
  <div
    className="cart-header"
    style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
  >
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <h2 id="chat-drawer-title" style={{ margin: 0 }}>LIVE CHAT</h2>
      <div className="ring-container" style={{ position: 'relative', width: '24px', height: '24px' }}>
        <div className="ringring"></div>
        <div className="circle"></div>
      </div>
    </div>
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
                  fontSize: '16px',
                  color: '#181818',
                }}
              >
                <strong>{msg.role === 'user' ? 'ME' : 'AURICLE'}:</strong>{' '}
{linkify(msg.content)}


              </div>
            ))}
            {isTyping && (
              <div
                style={{
                  background: '#ececec',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  marginBottom: '8px',
                  fontSize: '14px',
                  color: '#181818',
                }}
              >
                <strong>AURICLE:</strong> Typing…
              </div>
            )}
            {!isLoggedIn && !emailCaptured && (
  <div
    style={{
      background: '#ececec',
      padding: '12px',
      borderRadius: '6px',
      marginBottom: '12px',
      fontSize: '14px',
      color: '#181818',
    }}
  >
    <div><strong>AURICLE:</strong> Want a copy of this chat? Enter your email:</div>
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (customerEmail.trim()) setEmailCaptured(true);
      }}
  style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px' }}

    >
      <input
  type="email"
  value={customerEmail}
  onChange={(e) => setCustomerEmail(e.target.value)}
  placeholder="you@example.com"
  required
  style={{
    flex: 1,
    padding: '10px 12px',
    fontSize: '16px',
    border: '1px solid #ccc',
    borderRadius: '4px',
  }}
/>

      <button
        type="submit"
        style={{
          background: '#181818',
          color: '#fff',
          border: 'none',
          borderRadius: '4px',
          padding: '8px 16px',
          cursor: 'pointer',
        }}
      >
        &#10003;
      </button>
    </form>
  </div>
)}
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
    padding: '10px 12px',
    fontSize: '16px',
    lineHeight: 1.5,
    border: '1px solid #ccc',
    borderRadius: '4px',
  }}
  disabled={isLoading}
  ref={inputRef}
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
