import { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Bot, Loader } from 'lucide-react';

const GREETING = 'Hi! 👋 I\'m your DigitalWill AI assistant. Ask me anything about the platform in English or Filipino!\n\nKamusta! 👋 Ako ang AI assistant ng DigitalWill. Magtanong tungkol sa platform sa English o Filipino!';

const SUGGESTIONS = [
  'What is DigitalWill?',
  'Paano mag-add ng asset?',
  'How do beneficiaries claim?',
  'Explain encryption security',
];

export default function ChatBot() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([{ role: 'assistant', content: GREETING }]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, open]);

  const send = async (text) => {
    const userText = (text || input).trim();
    if (!userText || loading) return;

    const userMsg = { role: 'user', content: userText };
    const conversationHistory = messages.slice(1); // exclude greeting
    const newHistory = [...conversationHistory, userMsg];
    
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newHistory })
      });

      const data = await response.json();
      
      if (response.ok && data.reply) {
        setMessages(prev => [...prev, { role: 'assistant', content: data.reply }]);
      } else {
        setMessages(prev => [...prev, { 
          role: 'assistant', 
          content: data.error || 'Sorry, I encountered an error. Please try again.' 
        }]);
      }
    } catch (err) {
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: 'Unable to connect to the server. Please make sure the backend is running.' 
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { 
      e.preventDefault(); 
      send(); 
    }
  };

  return (
    <div className="chatbot-wrapper">
      <button className="chatbot-trigger" onClick={() => setOpen(o => !o)}>
        <MessageCircle size={16} />
        <span>AI Assistant</span>
      </button>

      {open && (
        <div className="chatbot-window">
          <div className="chatbot-header">
            <div className="chatbot-header-info">
              <Bot size={18} />
              <span>DigitalWill AI Assistant</span>
            </div>
            <button className="chatbot-close" onClick={() => setOpen(false)}>
              <X size={16} />
            </button>
          </div>

          <div className="chatbot-body">
            {messages.map((msg, i) => (
              <div key={i} className={`chatbot-msg ${msg.role === 'user' ? 'user' : 'bot'}`}>
                {msg.content}
              </div>
            ))}
            {loading && (
              <div className="chatbot-msg bot chatbot-typing">
                <Loader size={14} className="chatbot-spin" /> Thinking...
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {messages.length <= 1 && (
            <div className="chatbot-suggestions">
              {SUGGESTIONS.map((s, i) => (
                <button key={i} className="chatbot-chip" onClick={() => send(s)}>
                  {s}
                </button>
              ))}
            </div>
          )}

          <div className="chatbot-input-row">
            <input
              className="chatbot-input"
              placeholder="Ask anything... / Magtanong..."
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKey}
              disabled={loading}
            />
            <button className="chatbot-send" onClick={() => send()} disabled={loading}>
              <Send size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
