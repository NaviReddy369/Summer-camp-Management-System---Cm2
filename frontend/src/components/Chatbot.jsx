import { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Bot, User } from 'lucide-react';
import api from '../api';

const WELCOME = "Hey! 👋 I'm the CM2 Camp Bot. Ask me about **activities**, **schedule**, **teams**, **announcements**, or type **help** to see everything I know!";

export default function Chatbot({ user }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([{ from: 'bot', text: WELCOME }]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  const sendMessage = async (e) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || loading) return;

    setMessages((prev) => [...prev, { from: 'user', text }]);
    setInput('');
    setLoading(true);

    try {
      const res = await api.post('/chat', { message: text });
      setMessages((prev) => [...prev, { from: 'bot', text: res.data.reply }]);
    } catch {
      setMessages((prev) => [...prev, { from: 'bot', text: "Oops, couldn't reach the server. Try again! 🏕️" }]);
    } finally {
      setLoading(false);
    }
  };

  const formatText = (text) => {
    return text
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/_(.+?)_/g, '<em>$1</em>')
      .replace(/\n/g, '<br/>');
  };

  return (
    <>
      {/* Floating Button */}
      {!open && (
        <button className="chatbot-fab" onClick={() => setOpen(true)} title="Camp Chat">
          <MessageCircle size={26} />
          <span className="chatbot-fab-badge">Chat</span>
        </button>
      )}

      {/* Chat Window */}
      {open && (
        <div className="chatbot-window">
          <div className="chatbot-header">
            <div className="chatbot-header-info">
              <Bot size={20} />
              <div>
                <h4>CM2 Camp Bot</h4>
                <span>Ask me anything about camp!</span>
              </div>
            </div>
            <button className="chatbot-close" onClick={() => setOpen(false)}>
              <X size={18} />
            </button>
          </div>

          <div className="chatbot-messages">
            {messages.map((msg, i) => (
              <div key={i} className={`chatbot-msg ${msg.from}`}>
                <div className="chatbot-msg-avatar">
                  {msg.from === 'bot' ? <Bot size={16} /> : <User size={16} />}
                </div>
                <div
                  className="chatbot-msg-bubble"
                  dangerouslySetInnerHTML={{ __html: formatText(msg.text) }}
                />
              </div>
            ))}
            {loading && (
              <div className="chatbot-msg bot">
                <div className="chatbot-msg-avatar"><Bot size={16} /></div>
                <div className="chatbot-msg-bubble chatbot-typing">
                  <span></span><span></span><span></span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <form className="chatbot-input" onSubmit={sendMessage}>
            <input
              ref={inputRef}
              type="text"
              placeholder="Ask about schedule, activities..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={loading}
            />
            <button type="submit" disabled={loading || !input.trim()}>
              <Send size={18} />
            </button>
          </form>
        </div>
      )}
    </>
  );
}
