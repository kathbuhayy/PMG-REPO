import React, { useState, useRef, useEffect } from "react";
import { buildApiUrl } from "../config/api";
import "./PrintHubChatbot.css";

const SUGGESTED = [
  "Business card pricing",
  "Delivery times",
  "Bulk order discounts",
  "File requirements",
  "Returns policy",
];

function localPrintHubReply(text) {
  const q = String(text || "").toLowerCase();
  if (q.includes("business card") || q.includes("calling card")) {
    return "Yes, PrintHub offers business cards. Browse the product list, choose quantity and options, then customize before checkout.";
  }
  if (q.includes("delivery") || q.includes("shipping")) {
    return "PrintHub supports pickup and delivery options. Available shipping choices can vary per product and order.";
  }
  if (q.includes("payment") || q.includes("pay")) {
    return "Customers can pay after admin design approval. Once your order is approved, the Pay Now button becomes available in My Orders.";
  }
  if (q.includes("file") || q.includes("format") || q.includes("design")) {
    return "For print designs, prepare clear files such as PDF, PNG, JPG, AI, or PSD. You can also use the product customizer where available.";
  }
  if (q.includes("return") || q.includes("refund")) {
    return "For delivered orders, submit a return or complaint from My Orders. PrintHub staff will review it through the system.";
  }
  if (q.includes("bulk") || q.includes("discount")) {
    return "Bulk orders are supported. For custom pricing, submit an inquiry or checkout request so the admin team can review the details.";
  }
  return "I can help with PrintHub products, pricing, customization, checkout, admin approval before payment, delivery, and order support. What would you like to print?";
}

function parseMarkdown(text) {
  return text
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.*?)\*/g, "<em>$1</em>")
    .replace(/`(.*?)`/g, "<code>$1</code>")
    .replace(/^[*-•] (.+)/gm, "<li>$1</li>")
    .replace(/(<li>[\s\S]*?<\/li>)/g, "<ul>$1</ul>")
    .replace(/\n{2,}/g, "<br/>");
}

function buildWsUrl() {
  const apiBase = buildApiUrl("").replace(/\/$/, "");
  return apiBase.replace(/^http/, "ws") + "/ws/chat";
}

export default function PrintHubChatbot() {
  const [isOpen, setIsOpen] = useState(false);
  // "choice" = AI/Staff picker, "ai" = existing AI chat, "staff" = live support
  const [mode, setMode] = useState("choice");

  // --- AI chat state (unchanged from before) ---
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showSuggested, setShowSuggested] = useState(true);

  // --- Staff chat state ---
  const [staffMessages, setStaffMessages] = useState([]);
  const [staffInput, setStaffInput] = useState("");
  const [staffConnected, setStaffConnected] = useState(false);
  const [staffConnecting, setStaffConnecting] = useState(false);
  const [hasUnread, setHasUnread] = useState(false);
  const wsRef = useRef(null);
  const isOpenRef = useRef(isOpen);
  const modeRef = useRef(mode);

  isOpenRef.current = isOpen;
  modeRef.current = mode;

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const isLoggedIn = !!(
    localStorage.getItem("authToken") &&
    (localStorage.getItem("user") || localStorage.getItem("userId"))
  );

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading, staffMessages, mode]);

  useEffect(() => {
    if (isOpen && (mode === "ai" || mode === "staff")) inputRef.current?.focus();
  }, [isOpen, mode]);

  // Clean up the socket when the widget unmounts entirely.
  useEffect(() => {
    return () => {
      wsRef.current?.close();
    };
  }, []);

  const sendMessage = async (text) => {
    const userText = (text || input).trim();
    if (!userText || isLoading) return;

    setInput("");
    setShowSuggested(false);

    const newMessages = [...messages, { role: "user", content: userText }];
    setMessages(newMessages);
    setIsLoading(true);

    try {
      const contents = newMessages.map((m) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }],
      }));

      const res = await fetch(buildApiUrl("/api/chat"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: contents }),
      });

      if (!res.ok) {
        throw new Error(`Chat endpoint unavailable: ${res.status}`);
      }

      const data = await res.json();
      const reply = data.reply || localPrintHubReply(userText);

      setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: localPrintHubReply(userText) },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const connectStaffChat = () => {
    if (!isLoggedIn) return;
    setStaffConnecting(true);

    const ws = new WebSocket(buildWsUrl());
    wsRef.current = ws;

    ws.onopen = () => {
      const token = localStorage.getItem("authToken");
      ws.send(JSON.stringify({ type: "auth", token }));
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);

      if (data.type === "auth_ok" && data.role === "customer") {
        setStaffConnected(true);
        setStaffConnecting(false);
        setStaffMessages(data.history || []);
      }

      if (data.type === "auth_error") {
        setStaffConnecting(false);
        setStaffConnected(false);
      }

      if (data.type === "message") {
        setStaffMessages((prev) => [...prev, data.message]);
        const isFromStaff = data.message.senderRole === "staff";
        const isCurrentlyViewing = isOpenRef.current && modeRef.current === "staff";
        if (isFromStaff && !isCurrentlyViewing) {
          setHasUnread(true);
        }
      }
    };

    ws.onclose = () => {
      setStaffConnected(false);
      setStaffConnecting(false);
    };
    ws.onerror = () => {
      setStaffConnected(false);
      setStaffConnecting(false);
    };
  };

  const sendStaffMessage = () => {
    const body = staffInput.trim();
    if (!body || wsRef.current?.readyState !== WebSocket.OPEN) return;
    wsRef.current.send(JSON.stringify({ type: "customer_message", body }));
    setStaffInput("");
  };

  const chooseMode = (nextMode) => {
    setMode(nextMode);
    if (nextMode === "staff") {
      setHasUnread(false);
      if (!wsRef.current) connectStaffChat();
    }
  };

  const backToChoice = () => {
    setMode("choice");
  };

  const handleKey = (e) => {
    if (e.key !== "Enter" || e.shiftKey) return;
    e.preventDefault();
    if (mode === "ai") sendMessage();
    if (mode === "staff") sendStaffMessage();
  };

  return (
    <>
      {/* Floating Action Button */}
      <button
        className={`phc-fab ${isOpen ? "phc-fab--open" : ""}`}
        onClick={() => {
          setIsOpen((v) => !v);
          if (mode === "staff") setHasUnread(false);
        }}
        aria-label="Toggle PrintHub chat"
      >
        {isOpen ? (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        ) : (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
            <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z" />
          </svg>
        )}
        {!isOpen && <span className="phc-ping" />}
        {hasUnread && <span className="phc-unread-dot" />}
      </button>

      {/* Chat Window */}
      <div className={`phc-window ${isOpen ? "phc-window--open" : ""}`}>

        {/* Header */}
        <div className="phc-header">
          <div className="phc-header-info">
            {mode !== "choice" && (
              <button
                className="phc-back-btn"
                onClick={backToChoice}
                aria-label="Back to chat options"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M15 18l-6-6 6-6" />
                </svg>
              </button>
            )}
            <div className="phc-avatar">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="10" rx="2" />
                <circle cx="12" cy="5" r="2" />
                <path d="M12 7v4" />
                <line x1="8" y1="16" x2="8" y2="16" />
                <line x1="16" y1="16" x2="16" y2="16" />
              </svg>
            </div>
            <div>
              <div className="phc-name">
                {mode === "staff" ? "Live Support" : "PrintHub Assistant"}
              </div>
              <div className="phc-powered">
                {mode === "staff"
                  ? staffConnected
                    ? "Connected to PrintHub staff"
                    : staffConnecting
                      ? "Connecting..."
                      : "Not connected"
                  : "Powered by Gemini AI – Ask me anything about printing!"}
              </div>
            </div>
          </div>
          <button className="phc-close-btn" onClick={() => setIsOpen(false)}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="phc-body">
          {mode === "choice" && (
            <div className="phc-choice">
              <p className="phc-choice-lead">
                Hi! How would you like to get help today?
              </p>
              <button className="phc-choice-card" onClick={() => chooseMode("ai")}>
                <span className="phc-choice-title">💬 Chat with AI</span>
                <span className="phc-choice-desc">
                  Instant answers about pricing, delivery, and file requirements.
                </span>
              </button>
              <button className="phc-choice-card" onClick={() => chooseMode("staff")}>
                <span className="phc-choice-title">🧑‍💼 Talk to Staff</span>
                <span className="phc-choice-desc">
                  {isLoggedIn
                    ? "Connect live with a PrintHub team member."
                    : "Log in required to chat with our team."}
                </span>
              </button>
            </div>
          )}

          {mode === "ai" && (
            <>
              <div className="phc-welcome">
                <p>
                  Hi! I'm your <strong>PrintHub AI assistant</strong> powered by{" "}
                  <strong>Google Gemini AI</strong>. I can help with:
                </p>
                <ul>
                  <li>Pricing and quotes (business cards, flyers, etc.)</li>
                  <li>Delivery times and shipping options</li>
                  <li>Turnaround time for orders</li>
                  <li>Design services and file requirements</li>
                  <li>File formats (PDF, PNG, JPG, AI, PSD)</li>
                  <li>Payment methods (GCash, PayMaya, Bank Transfer)</li>
                  <li>Returns and refunds policy</li>
                  <li>Bulk order discounts</li>
                  <li>Order status and tracking</li>
                </ul>
                {showSuggested && (
                  <p className="phc-try-label">
                    <em>Try asking me:</em>
                  </p>
                )}
              </div>

              {showSuggested && (
                <div className="phc-chips">
                  {SUGGESTED.map((s) => (
                    <button key={s} className="phc-chip" onClick={() => sendMessage(s)}>
                      {s}
                    </button>
                  ))}
                </div>
              )}

              {messages.map((m, i) => (
                <div key={i} className={`phc-row phc-row--${m.role}`}>
                  {m.role === "assistant" && (
                    <span className="phc-bot-icon">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="11" width="18" height="10" rx="2" />
                        <circle cx="12" cy="5" r="2" />
                        <path d="M12 7v4" />
                      </svg>
                    </span>
                  )}
                  <div
                    className={`phc-bubble phc-bubble--${m.role}`}
                    dangerouslySetInnerHTML={{ __html: parseMarkdown(m.content) }}
                  />
                </div>
              ))}

              {isLoading && (
                <div className="phc-row phc-row--assistant">
                  <span className="phc-bot-icon">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="11" width="18" height="10" rx="2" />
                      <circle cx="12" cy="5" r="2" />
                      <path d="M12 7v4" />
                    </svg>
                  </span>
                  <div className="phc-bubble phc-bubble--assistant phc-typing">
                    <span />
                    <span />
                    <span />
                  </div>
                </div>
              )}
            </>
          )}

          {mode === "staff" && (
            <>
              {!isLoggedIn ? (
                <div className="phc-welcome">
                  <p>
                    You'll need to be logged in to chat with our staff. Please log in,
                    then come back and select <strong>Talk to Staff</strong> again.
                  </p>
                </div>
              ) : (
                <>
                  {staffMessages.length === 0 && staffConnected && (
                    <div className="phc-welcome">
                      <p>You're connected. Send a message and a staff member will reply here.</p>
                    </div>
                  )}
                  {staffMessages.map((m) => (
                    <div
                      key={m.id}
                      className={`phc-row phc-row--${m.senderRole === "staff" ? "assistant" : "user"}`}
                    >
                      <div
                        className={`phc-bubble phc-bubble--${m.senderRole === "staff" ? "assistant" : "user"}`}
                      >
                        {m.body}
                      </div>
                    </div>
                  ))}
                </>
              )}
            </>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input — only shown for AI and staff modes, not the choice screen */}
        {mode !== "choice" && (mode === "ai" || isLoggedIn) && (
          <div className="phc-footer">
            <input
              ref={inputRef}
              className="phc-input"
              placeholder={
                mode === "ai"
                  ? "Ask me about printing services, pricing, delivery, etc..."
                  : "Type your message..."
              }
              value={mode === "ai" ? input : staffInput}
              onChange={(e) =>
                mode === "ai" ? setInput(e.target.value) : setStaffInput(e.target.value)
              }
              onKeyDown={handleKey}
              disabled={mode === "ai" ? isLoading : !staffConnected}
            />
            <button
              className="phc-send"
              onClick={() => (mode === "ai" ? sendMessage() : sendStaffMessage())}
              disabled={
                mode === "ai"
                  ? isLoading || !input.trim()
                  : !staffConnected || !staffInput.trim()
              }
            >
              Send
            </button>
          </div>
        )}
      </div>
    </>
  );
}