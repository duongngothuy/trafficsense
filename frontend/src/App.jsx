import { useState, useRef, useEffect } from "react";

const SUGGESTED_QUESTIONS = [
  "Which borough has the most accidents?",
  "What time of day are accidents most common?",
  "Show me injury trends over time",
  "What are the top contributing factors to crashes?",
  "Which streets are the most dangerous?",
];

function PlotlyChart({ chartJson }) {
  const ref = useRef(null);
  useEffect(() => {
    if (!ref.current || !chartJson) return;
    const data = JSON.parse(chartJson);
    if (window.Plotly) {
      window.Plotly.newPlot(ref.current, data.data, {
        ...data.layout,
        paper_bgcolor: "rgba(0,0,0,0)",
        plot_bgcolor: "rgba(0,0,0,0)",
        font: { color: "#e2e8f0", family: "IBM Plex Mono, monospace" },
        margin: { t: 40, r: 20, b: 40, l: 50 },
      }, { responsive: true, displayModeBar: false });
    }
  }, [chartJson]);
  return <div ref={ref} style={{ width: "100%", minHeight: 320 }} />;
}

function TypingDots() {
  return (
    <div style={{ display: "flex", gap: 4, alignItems: "center", padding: "12px 16px" }}>
      {[0, 1, 2].map(i => (
        <span key={i} style={{
          width: 7, height: 7, borderRadius: "50%", background: "#FF4444",
          animation: "pulse 1.2s ease-in-out infinite",
          animationDelay: `${i * 0.2}s`
        }} />
      ))}
    </div>
  );
}

function Message({ msg }) {
  const isUser = msg.role === "user";
  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      alignItems: isUser ? "flex-end" : "flex-start",
      marginBottom: 24,
      animation: "fadeUp 0.3s ease-out",
    }}>
      <div style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        marginBottom: 6,
        flexDirection: isUser ? "row-reverse" : "row",
      }}>
        <div style={{
          width: 28, height: 28, borderRadius: "50%",
          background: isUser ? "#FF4444" : "#1a1a2e",
          border: isUser ? "none" : "1px solid #FF4444",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 12, color: isUser ? "#fff" : "#FF4444",
          fontFamily: "IBM Plex Mono, monospace",
          fontWeight: 700,
        }}>
          {isUser ? "U" : "⬡"}
        </div>
        <span style={{ fontSize: 11, color: "#64748b", fontFamily: "IBM Plex Mono, monospace" }}>
          {isUser ? "you" : "trafficsense"}
        </span>
      </div>

      <div style={{
        maxWidth: "80%",
        background: isUser
          ? "linear-gradient(135deg, #FF4444 0%, #cc2222 100%)"
          : "rgba(255,255,255,0.04)",
        border: isUser ? "none" : "1px solid rgba(255,68,68,0.15)",
        borderRadius: isUser ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
        padding: "12px 16px",
        color: "#e2e8f0",
        fontSize: 14,
        lineHeight: 1.6,
        fontFamily: "'DM Sans', sans-serif",
        whiteSpace: "pre-wrap",
      }}>
        {msg.text}
      </div>

      {msg.charts && msg.charts.length > 0 && (
        <div style={{ width: "min(700px, 90vw)", marginTop: 12 }}>
          {msg.charts.map((c, i) => (
            <div key={i} style={{
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,68,68,0.2)",
              borderRadius: 12,
              padding: "16px 8px",
              marginBottom: 8,
            }}>
              <PlotlyChart chartJson={c} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function App() {
  const [messages, setMessages] = useState([]);
  const [history, setHistory] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    // Load Plotly
    const script = document.createElement("script");
    script.src = "https://cdn.plot.ly/plotly-2.35.2.min.js";
    document.head.appendChild(script);
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const send = async (text) => {
    const q = text || input.trim();
    if (!q || loading) return;
    setInput("");

    const userMsg = { role: "user", text: q };
    setMessages(prev => [...prev, userMsg]);
    setLoading(true);

    try {
      const res = await fetch("https://trafficsense-6lw3.onrender.com/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: q, history }),
      });
      const data = await res.json();
      setMessages(prev => [...prev, {
        role: "assistant",
        text: data.text,
        charts: data.charts || [],
      }]);
      setHistory(data.messages || []);
    } catch (e) {
      setMessages(prev => [...prev, {
        role: "assistant",
        text: "⚠️ Could not connect to backend. Make sure the FastAPI server is running on port 8000.",
        charts: [],
      }]);
    }
    setLoading(false);
  };

  const isEmpty = messages.length === 0;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;700&family=DM+Sans:wght@300;400;500&family=Bebas+Neue&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #080c14; }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 0.3; transform: scale(0.8); }
          50%       { opacity: 1;   transform: scale(1.2); }
        }
        @keyframes scanline {
          0%   { transform: translateY(-100%); }
          100% { transform: translateY(100vh); }
        }
        textarea:focus { outline: none; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #FF4444; border-radius: 2px; }
      `}</style>

      <div style={{
        minHeight: "100vh",
        background: "#080c14",
        display: "flex",
        flexDirection: "column",
        position: "relative",
        overflow: "hidden",
      }}>
        {/* Grid overlay */}
        <div style={{
          position: "fixed", inset: 0, pointerEvents: "none",
          backgroundImage: `
            linear-gradient(rgba(255,68,68,0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,68,68,0.03) 1px, transparent 1px)
          `,
          backgroundSize: "40px 40px",
        }} />

        {/* Glow */}
        <div style={{
          position: "fixed", top: "-20vh", left: "50%", transform: "translateX(-50%)",
          width: "60vw", height: "40vh",
          background: "radial-gradient(ellipse, rgba(255,68,68,0.08) 0%, transparent 70%)",
          pointerEvents: "none",
        }} />

        {/* Header */}
        <header style={{
          padding: "20px 32px",
          display: "flex",
          alignItems: "center",
          gap: 16,
          borderBottom: "1px solid rgba(255,68,68,0.1)",
          position: "relative", zIndex: 10,
        }}>
          <div style={{
            width: 36, height: 36,
            background: "#FF4444",
            clipPath: "polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <span style={{ fontSize: 16 }}>🦀</span>
          </div>
          <div>
            <div style={{
              fontFamily: "Bebas Neue, sans-serif",
              fontSize: 22, letterSpacing: 4,
              color: "#fff",
            }}>TRAFFICSENSE</div>
            <div style={{
              fontFamily: "IBM Plex Mono, monospace",
              fontSize: 10, color: "#FF4444", letterSpacing: 2,
            }}>AGENTIC TRAFFIC ANALYST · NYC 2021–2023</div>
          </div>
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#22c55e", animation: "pulse 2s infinite" }} />
            <span style={{ fontFamily: "IBM Plex Mono, monospace", fontSize: 11, color: "#64748b" }}>238,421 records loaded</span>
          </div>
        </header>

        {/* Main */}
        <main style={{
          flex: 1,
          maxWidth: 820,
          width: "100%",
          margin: "0 auto",
          padding: "32px 24px 140px",
          position: "relative", zIndex: 10,
        }}>
          {isEmpty && (
            <div style={{ animation: "fadeUp 0.5s ease-out" }}>
              <div style={{ textAlign: "center", marginBottom: 48, paddingTop: 32 }}>
                <div style={{
                  fontFamily: "Bebas Neue, sans-serif",
                  fontSize: "clamp(40px, 8vw, 72px)",
                  color: "#fff",
                  letterSpacing: 6,
                  lineHeight: 1,
                }}>ANALYZE NYC</div>
                <div style={{
                  fontFamily: "Bebas Neue, sans-serif",
                  fontSize: "clamp(40px, 8vw, 72px)",
                  color: "#FF4444",
                  letterSpacing: 6,
                  lineHeight: 1,
                }}>TRAFFIC DATA</div>
                <p style={{
                  fontFamily: "DM Sans, sans-serif",
                  color: "#64748b", fontSize: 15, marginTop: 16,
                  fontWeight: 300,
                }}>
                  Ask anything. The agent queries, analyzes, and visualizes autonomously.
                </p>
              </div>

              <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
                gap: 10,
              }}>
                {SUGGESTED_QUESTIONS.map((q, i) => (
                  <button key={i} onClick={() => send(q)} style={{
                    background: "rgba(255,255,255,0.03)",
                    border: "1px solid rgba(255,68,68,0.2)",
                    borderRadius: 10,
                    padding: "12px 14px",
                    color: "#94a3b8",
                    fontFamily: "DM Sans, sans-serif",
                    fontSize: 13,
                    cursor: "pointer",
                    textAlign: "left",
                    transition: "all 0.2s",
                  }}
                    onMouseEnter={e => {
                      e.target.style.borderColor = "#FF4444";
                      e.target.style.color = "#e2e8f0";
                      e.target.style.background = "rgba(255,68,68,0.08)";
                    }}
                    onMouseLeave={e => {
                      e.target.style.borderColor = "rgba(255,68,68,0.2)";
                      e.target.style.color = "#94a3b8";
                      e.target.style.background = "rgba(255,255,255,0.03)";
                    }}
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg, i) => <Message key={i} msg={msg} />)}
          {loading && (
            <div style={{
              display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 24,
              animation: "fadeUp 0.3s ease-out",
            }}>
              <div style={{
                width: 28, height: 28, borderRadius: "50%",
                border: "1px solid #FF4444",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 12, color: "#FF4444",
                fontFamily: "IBM Plex Mono, monospace",
              }}>⬡</div>
              <div style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,68,68,0.15)",
                borderRadius: "18px 18px 18px 4px",
              }}>
                <TypingDots />
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </main>

        {/* Input bar */}
        <div style={{
          position: "fixed", bottom: 0, left: 0, right: 0,
          padding: "16px 24px 24px",
          background: "linear-gradient(to top, #080c14 60%, transparent)",
          zIndex: 20,
        }}>
          <div style={{
            maxWidth: 820, margin: "0 auto",
            display: "flex", gap: 10, alignItems: "flex-end",
          }}>
            <div style={{
              flex: 1,
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,68,68,0.3)",
              borderRadius: 14,
              padding: "12px 16px",
              display: "flex", alignItems: "flex-end", gap: 10,
            }}>
              <textarea
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
                placeholder="Ask about NYC traffic accidents..."
                rows={1}
                style={{
                  flex: 1, background: "transparent", border: "none",
                  color: "#e2e8f0", fontFamily: "DM Sans, sans-serif",
                  fontSize: 14, resize: "none", lineHeight: 1.5,
                  maxHeight: 120, overflowY: "auto",
                }}
              />
              <button onClick={() => send()} disabled={!input.trim() || loading} style={{
                width: 36, height: 36, borderRadius: 10,
                background: input.trim() && !loading ? "#FF4444" : "rgba(255,68,68,0.2)",
                border: "none", cursor: input.trim() && !loading ? "pointer" : "default",
                display: "flex", alignItems: "center", justifyContent: "center",
                transition: "all 0.2s", flexShrink: 0,
                color: "#fff", fontSize: 16,
              }}>↑</button>
            </div>
          </div>
          <div style={{
            textAlign: "center", marginTop: 8,
            fontFamily: "IBM Plex Mono, monospace",
            fontSize: 10, color: "#334155",
          }}>
            SHIFT+ENTER for newline · ENTER to send
          </div>
        </div>
      </div>
    </>
  );
}
