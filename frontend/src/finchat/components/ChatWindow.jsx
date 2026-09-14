'use client';
import { useState, useEffect, useRef } from 'react';
import { streamChat } from '../engine/GroqEngine';
import { getHistory, clearHistory } from '../memory/ChatMemory';
import { T } from '@/lib/tokens';

const QUICK_ACTIONS = [
  { label: "Analyze my portfolio risk", query: "Can you analyze the risk and diversification of my current portfolio?" },
  { label: "Budget suggestions", query: "Based on my recent transactions, what budget would you suggest for next month?" },
  { label: "Stock analysis: RELIANCE", query: "Give me an AI-driven SWOT and valuation analysis for RELIANCE." },
  { label: "Savings advice", query: "How can I improve my savings rate based on my spending habits?" },
];

// ── Inline markdown renderer ──────────────────────────────────────────────
function renderInline(text) {
  const parts = [];
  // Match **bold**, *italic*, and `inline code`
  const re = /(\*\*(.+?)\*\*|\*(.+?)\*|`([^`]+)`)/g;
  let last = 0, m;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    if (m[0].startsWith('**')) parts.push(<strong key={m.index}>{m[2]}</strong>);
    else if (m[0].startsWith('`')) parts.push(<code key={m.index} style={{ background: 'rgba(255,255,255,0.08)', padding: '1px 5px', borderRadius: 4, fontSize: '0.9em', fontFamily: "'Roboto Mono', monospace" }}>{m[4]}</code>);
    else parts.push(<em key={m.index}>{m[3]}</em>);
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}

// ── Parse markdown table rows ────────────────────────────────────────────
function parseTableRows(lines) {
  const rows = [];
  for (const line of lines) {
    const cells = line.split('|').map(c => c.trim()).filter(Boolean);
    // Skip separator rows like |---|---|
    if (cells.every(c => /^[-:]+$/.test(c))) continue;
    rows.push(cells);
  }
  return rows;
}

function renderTable(rows, startIdx) {
  if (rows.length === 0) return null;
  const header = rows[0];
  const body = rows.slice(1);
  return (
    <div key={`table-${startIdx}`} style={{ overflowX: 'auto', margin: '8px 0' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5, lineHeight: 1.5 }}>
        <thead>
          <tr>
            {header.map((cell, ci) => (
              <th key={ci} style={{ padding: '6px 10px', borderBottom: '1px solid rgba(255,255,255,0.12)', textAlign: 'left', fontWeight: 700, color: '#fff', whiteSpace: 'nowrap' }}>{renderInline(cell)}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {body.map((row, ri) => (
            <tr key={ri}>
              {row.map((cell, ci) => (
                <td key={ci} style={{ padding: '5px 10px', borderBottom: '1px solid rgba(255,255,255,0.05)', color: '#ccc' }}>{renderInline(cell)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function renderMarkdown(text) {
  const lines = text.split('\n');
  const elements = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // ── Fenced code blocks (```) ──
    if (line.trim().startsWith('```')) {
      const lang = line.trim().slice(3).trim();
      const codeLines = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      i++; // skip closing ```
      elements.push(
        <pre key={`code-${i}`} style={{
          background: 'rgba(0,0,0,0.35)', padding: '12px 14px', borderRadius: 10,
          border: '1px solid rgba(255,255,255,0.06)', overflowX: 'auto',
          fontFamily: "'Roboto Mono', monospace", fontSize: 12, lineHeight: 1.6,
          margin: '6px 0', color: '#e0e0e0',
        }}>
          {lang && <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 1 }}>{lang}</div>}
          <code>{codeLines.join('\n')}</code>
        </pre>
      );
      continue;
    }

    // ── Tables (lines starting with |) ──
    if (line.trim().startsWith('|')) {
      const tableLines = [];
      while (i < lines.length && lines[i].trim().startsWith('|')) {
        tableLines.push(lines[i]);
        i++;
      }
      const rows = parseTableRows(tableLines);
      if (rows.length > 0) {
        elements.push(renderTable(rows, i));
      }
      continue;
    }

    // ── Headings ──
    if (line.startsWith('### ')) {
      elements.push(<div key={i} className="fc-heading" style={{ fontSize: 13 }}>{renderInline(line.slice(4))}</div>);
      i++; continue;
    }
    if (line.startsWith('## ')) {
      elements.push(<div key={i} className="fc-heading" style={{ fontSize: 15 }}>{renderInline(line.slice(3))}</div>);
      i++; continue;
    }
    if (line.startsWith('# ')) {
      elements.push(<div key={i} className="fc-heading" style={{ fontSize: 16 }}>{renderInline(line.slice(2))}</div>);
      i++; continue;
    }

    // ── Blockquotes ──
    if (line.startsWith('> ')) {
      elements.push(
        <div key={i} style={{
          borderLeft: '3px solid rgba(0,212,170,0.4)', paddingLeft: 12,
          margin: '6px 0', color: 'rgba(255,255,255,0.7)', fontStyle: 'italic', fontSize: 13,
        }}>{renderInline(line.slice(2))}</div>
      );
      i++; continue;
    }

    // ── Numbered lists ──
    if (line.match(/^\d+\.\s/)) {
      const match = line.match(/^(\d+)\.\s(.*)/);
      elements.push(
        <div key={i} className="fc-bullet" style={{ paddingLeft: 4 }}>
          <span style={{ color: 'var(--teal)', fontWeight: 700, marginRight: 6, fontFamily: "'Roboto Mono', monospace", fontSize: 12 }}>{match[1]}.</span>
          {renderInline(match[2])}
        </div>
      );
      i++; continue;
    }

    // ── Unordered bullets ──
    if (line.match(/^[-*] /)) {
      elements.push(<div key={i} className="fc-bullet">• {renderInline(line.slice(2))}</div>);
      i++; continue;
    }

    // ── Empty lines ──
    if (line.trim() === '') {
      elements.push(<div key={i} className="fc-spacer" />);
      i++; continue;
    }

    // ── Regular paragraph ──
    elements.push(<div key={i}>{renderInline(line)}</div>);
    i++;
  }

  return <div className="finchat-msg-body">{elements}</div>;
}

// ─────────────────────────────────────────────────────────────────────────────

export default function ChatWindow() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [statusText, setStatusText] = useState('');
  const [isMobile, setIsMobile] = useState(false);
  const scrollRef = useRef(null);

  // Detect mobile viewport
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 1024);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Prevent body scroll when chat is open on mobile
  useEffect(() => {
    if (isOpen && isMobile) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen, isMobile]);

  useEffect(() => {
    setMessages(getHistory());
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const handleSend = async (query) => {
    const textToSend = query || input;
    if (!textToSend.trim() || isTyping) return;

    const userMsg = { role: 'user', content: textToSend, timestamp: Date.now() };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);
    setStatusText('');

    let aiResponse = '';
    try {
      const stream = streamChat(textToSend);
      // Push empty placeholder — filtered from render until first text chunk arrives
      setMessages((prev) => [...prev, { role: 'assistant', content: '', timestamp: Date.now() }]);

      for await (const chunk of stream) {
        // Status message from tool execution
        if (chunk && typeof chunk === 'object' && chunk.type === 'status') {
          setStatusText(chunk.text);
          continue;
        }
        // Real text chunk — clear status, accumulate text
        setStatusText('');
        aiResponse += chunk;
        setMessages((prev) => {
          const last = prev[prev.length - 1];
          if (last?.role === 'assistant') {
            return [...prev.slice(0, -1), { ...last, content: aiResponse }];
          }
          return prev;
        });
      }
    } catch (error) {
      console.error('FinChat stream error:', error);
      const errMsg = error.message || "I couldn't connect to my backend. Please check your connection and try again.";
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last?.role === 'assistant' && !last.content) {
          return [...prev.slice(0, -1), { ...last, content: errMsg }];
        }
        return [...prev, { role: 'assistant', content: errMsg, timestamp: Date.now() }];
      });
    } finally {
      setIsTyping(false);
      setStatusText('');
    }
  };

  const handleClear = () => {
    clearHistory();
    setMessages([]);
  };

  return (
    <>
      {/* Floating Toggle Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="finchat-toggle"
          style={{
            position: 'fixed',
            bottom: isMobile ? 76 : 30,
            right: 30,
            width: 56, height: 56, borderRadius: '50%',
            background: 'linear-gradient(135deg, #00d4aa, #9d77f7)',
            border: 'none', boxShadow: '0 8px 32px rgba(0,212,170,0.3)',
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'white', fontSize: 22, zIndex: 1000,
            transition: 'transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.1) rotate(5deg)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1) rotate(0deg)'; }}
        >
          ✦
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div
          className="finchat-window"
          style={{
            position: 'fixed',
            ...(isMobile ? {
              top: 54,
              left: 0,
              right: 0,
              bottom: 64,
              width: '100%',
              height: 'auto',
              borderRadius: '0',
            } : {
              bottom: 30,
              right: 30,
              width: 420,
              height: 650,
              borderRadius: 24,
            }),
            background: 'rgba(21, 23, 30, 0.98)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255,255,255,0.08)',
            boxShadow: '0 24px 64px rgba(0,0,0,0.4)',
            display: 'flex', flexDirection: 'column',
            zIndex: 1100, overflow: 'hidden',
            animation: 'finchat-slide-up 0.4s cubic-bezier(0.23, 1, 0.32, 1)',
          }}
        >
          {/* Header */}
          <div style={{
            padding: '20px 24px',
            background: 'linear-gradient(to bottom, rgba(0,212,170,0.05), transparent)',
            borderBottom: '1px solid rgba(255,255,255,0.05)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{
                width: 36, height: 36, borderRadius: 12,
                background: 'linear-gradient(135deg,rgba(0,212,170,.2),rgba(157,119,247,.2))',
                border: '1px solid rgba(0,212,170,.3)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18,
              }}>✦</div>
              <div>
                <div style={{ fontSize: 16, fontWeight: 700, color: 'white' }}>FinChat</div>
                <div style={{ fontSize: 11, color: T.text.tertiary, display: 'flex', alignItems: 'center', gap: 5 }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#00d4aa' }} />
                  AI Financial Copilot Live
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              {messages.length > 0 && (
                <button
                  onClick={handleClear}
                  title="Clear chat history"
                  style={{ background: 'none', border: 'none', color: T.text.tertiary, cursor: 'pointer', fontSize: 13, padding: '0 6px', lineHeight: 1 }}
                >🗑️</button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                style={{ background: 'none', border: 'none', color: T.text.tertiary, cursor: 'pointer', fontSize: 20, lineHeight: 1 }}
              >×</button>
            </div>
          </div>

          {/* Messages Area */}
          <div
            ref={scrollRef}
            style={{
              flex: 1, overflowY: 'auto', padding: '24px',
              display: 'flex', flexDirection: 'column', gap: 20,
              scrollBehavior: 'smooth',
            }}
          >
            {messages.length === 0 && (
              <div style={{ textAlign: 'center', marginTop: 40 }}>
                <div style={{ fontSize: 40, marginBottom: 16 }}>👋</div>
                <h3 style={{ color: 'white', marginBottom: 8 }}>Welcome to FinChat</h3>
                <p style={{ fontSize: 13, color: T.text.tertiary, lineHeight: 1.6, padding: '0 20px' }}>
                  Your AI-powered financial advisor. Ask me anything about your expenses, portfolio, or stock investments.
                </p>
              </div>
            )}

            {/* Filter out empty placeholder assistant messages until first chunk */}
            {messages.filter((msg) => msg.role === 'user' || msg.content).map((msg, i) => (
              <div key={i} style={{
                alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                maxWidth: '85%', display: 'flex', flexDirection: 'column', gap: 6,
              }}>
                <div style={{
                  padding: '12px 16px',
                  borderRadius: msg.role === 'user' ? '18px 18px 2px 18px' : '18px 18px 18px 2px',
                  background: msg.role === 'user' ? T.accent.purple : 'rgba(255,255,255,0.04)',
                  border: msg.role === 'user' ? 'none' : '1px solid rgba(255,255,255,0.05)',
                  color: msg.role === 'user' ? 'white' : '#e0e0e0',
                  fontSize: 14, lineHeight: 1.5,
                  whiteSpace: msg.role === 'user' ? 'pre-wrap' : undefined,
                }}>
                  {msg.role === 'user' ? msg.content : renderMarkdown(msg.content)}
                </div>
                <div style={{
                  fontSize: 10, color: T.text.tertiary,
                  alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                }}>
                  {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            ))}

            {/* Typing / Status indicator */}
            {isTyping && (
              <div style={{
                alignSelf: 'flex-start', background: 'rgba(255,255,255,0.04)',
                padding: '12px 16px', borderRadius: '18px 18px 18px 2px',
                display: 'flex', gap: 6, alignItems: 'center',
                border: '1px solid rgba(255,255,255,0.05)',
              }}>
                {statusText ? (
                  <>
                    <span style={{
                      fontSize: 13, display: 'inline-block',
                      color: '#00d4aa', animation: 'fc-spin 1s linear infinite',
                    }}>⟳</span>
                    <span style={{ fontSize: 12, color: '#00d4aa' }}>{statusText}</span>
                  </>
                ) : (
                  <>
                    <div className="typing-dot" style={{ width: 4, height: 4, borderRadius: '50%', background: '#666', animation: 'typing 1s infinite' }} />
                    <div className="typing-dot" style={{ width: 4, height: 4, borderRadius: '50%', background: '#666', animation: 'typing 1s infinite 0.2s' }} />
                    <div className="typing-dot" style={{ width: 4, height: 4, borderRadius: '50%', background: '#666', animation: 'typing 1s infinite 0.4s' }} />
                  </>
                )}
              </div>
            )}
          </div>

          {/* Quick Actions */}
          {messages.length < 3 && (
            <div style={{ padding: '0 24px 16px', display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {QUICK_ACTIONS.map((action, i) => (
                <button
                  key={i}
                  disabled={isTyping}
                  onClick={() => !isTyping && handleSend(action.query)}
                  style={{
                    padding: '8px 14px', borderRadius: 12,
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    color: T.text.secondary, fontSize: 12,
                    cursor: isTyping ? 'default' : 'pointer',
                    transition: 'all 0.2s',
                    opacity: isTyping ? 0.4 : 1,
                  }}
                  onMouseEnter={(e) => {
                    if (isTyping) return;
                    e.currentTarget.style.background = 'rgba(255,255,255,0.08)';
                    e.currentTarget.style.borderColor = T.accent.teal;
                    e.currentTarget.style.color = 'white';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
                    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)';
                    e.currentTarget.style.color = T.text.secondary;
                  }}
                >
                  {action.label}
                </button>
              ))}
            </div>
          )}

          {/* Input Area */}
          <div style={{
            padding: '20px 24px',
            borderTop: '1px solid rgba(255,255,255,0.05)',
            background: 'rgba(21, 23, 30, 0.5)',
          }}>
            <div style={{
              display: 'flex', gap: 12,
              background: 'rgba(255,255,255,0.03)',
              borderRadius: 16, padding: '4px 4px 4px 16px',
              border: '1px solid rgba(255,255,255,0.08)',
              alignItems: 'center',
            }}>
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
                placeholder="Ask about your finance..."
                style={{
                  flex: 1, background: 'none', border: 'none',
                  color: 'white', fontSize: 14, outline: 'none', padding: '10px 0',
                }}
              />
              <button
                onClick={() => handleSend()}
                disabled={!input.trim() || isTyping}
                style={{
                  width: 36, height: 36, borderRadius: 12,
                  background: input.trim() && !isTyping ? T.accent.teal : 'rgba(255,255,255,0.05)',
                  color: 'white', border: 'none',
                  cursor: input.trim() && !isTyping ? 'pointer' : 'default',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                ➔
              </button>
            </div>
            <div style={{ fontSize: 9, color: T.text.tertiary, textAlign: 'center', marginTop: 12, opacity: 0.6 }}>
              Informational advice only. Check our <span style={{ color: T.accent.purple }}>Financial Disclaimer</span>.
            </div>
          </div>

          <style>{`
            @keyframes finchat-slide-up {
              from { transform: translateY(20px); opacity: 0; }
              to { transform: translateY(0); opacity: 1; }
            }
            @keyframes typing {
              0%, 100% { transform: translateY(0); }
              50% { transform: translateY(-4px); }
            }
            @keyframes fc-spin {
              from { transform: rotate(0deg); }
              to { transform: rotate(360deg); }
            }
          `}</style>
        </div>
      )}
    </>
  );
}
