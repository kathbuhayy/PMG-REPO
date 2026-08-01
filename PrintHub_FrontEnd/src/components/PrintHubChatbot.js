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

export default function PrintHubChatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showSuggested, setShowSuggested] = useState(true);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  useEffect(() => {
    if (isOpen) inputRef.current?.focus();
  }, [isOpen]);

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

  const handleKey = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <>
      {/* Floating Action Button */}
      <button
        className={`phc-fab ${isOpen ? "phc-fab--open" : ""}`}
        onClick={() => setIsOpen((v) => !v)}
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
      </button>

      {/* Chat Window */}
      <div className={`phc-window ${isOpen ? "phc-window--open" : ""}`}>

        {/* Header */}
        <div className="phc-header">
          <div className="phc-header-info">
            <div className="phc-avatar">
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="3" y="11" width="18" height="10" rx="2" />
                <circle cx="12" cy="5" r="2" />
                <path d="M12 7v4" />
                <line x1="8" y1="16" x2="8" y2="16" />
                <line x1="16" y1="16" x2="16" y2="16" />
              </svg>
            </div>
            <div>
              <div className="phc-name">PrintHub Assistant</div>
              <div className="phc-powered">
                Powered by Gemini AI – Ask me anything about printing!
              </div>
            </div>
          </div>
          <button className="phc-close-btn" onClick={() => setIsOpen(false)}>
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="phc-body">
          {/* Welcome message */}
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

          {/* Suggested chips */}
          {showSuggested && (
            <div className="phc-chips">
              {SUGGESTED.map((s) => (
                <button
                  key={s}
                  className="phc-chip"
                  onClick={() => sendMessage(s)}
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          {/* Messages */}
          {messages.map((m, i) => (
            <div key={i} className={`phc-row phc-row--${m.role}`}>
              {m.role === "assistant" && (
                <span className="phc-bot-icon">
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
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

          {/* Typing dots */}
          {isLoading && (
            <div className="phc-row phc-row--assistant">
              <span className="phc-bot-icon">
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
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

          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="phc-footer">
          <input
            ref={inputRef}
            className="phc-input"
            placeholder="Ask me about printing services, pricing, delivery, etc..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKey}
            disabled={isLoading}
          />
          <button
            className="phc-send"
            onClick={() => sendMessage()}
            disabled={isLoading || !input.trim()}
          >
            Send
          </button>
        </div>
      </div>
    </>
  );
}
