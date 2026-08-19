import React, { useState, useEffect, useRef, useCallback } from "react";
import { buildApiUrl } from "../config/api";
import { adminFetch } from "../utils/adminFetch";
import { FaHeadset, FaPaperPlane, FaExclamationTriangle } from "react-icons/fa";

function buildWsUrl() {
  const apiBase = buildApiUrl("").replace(/\/$/, "");
  return apiBase.replace(/^http/, "ws") + "/ws/chat";
}

function AdminSupportInbox() {
  const [conversations, setConversations] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const wsRef = useRef(null);
  const messagesEndRef = useRef(null);

  const fetchConversations = useCallback(async () => {
    try {
      setLoading(true);
      const res = await adminFetch(buildApiUrl("/api/chat/conversations"));
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to load conversations");
      setConversations(data.conversations || []);
    } catch (err) {
      setError(err.message || "Failed to load conversations");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  // WebSocket connection
  useEffect(() => {
    const token = localStorage.getItem("authToken");
    if (!token) return;

    const ws = new WebSocket(buildWsUrl());
    wsRef.current = ws;

    ws.onopen = () => {
      ws.send(JSON.stringify({ type: "auth", token }));
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);

      if (data.type === "auth_ok") {
        setConnected(true);
      }

      if (data.type === "auth_error") {
        setConnected(false);
        console.error("Chat auth failed:", data.message);
      }

      if (data.type === "new_customer_message") {
        fetchConversations();
        setActiveId((current) => {
          if (current === data.conversationId) {
            setMessages((prev) => [...prev, data.message]);
          }
          return current;
        });
      }

      if (data.type === "message") {
        setActiveId((current) => {
          if (current === data.conversationId) {
            setMessages((prev) => [...prev, data.message]);
          }
          return current;
        });
        fetchConversations();
      }

      if (data.type === "conversation_claimed") {
        fetchConversations();
      }
    };

    ws.onclose = () => setConnected(false);
    ws.onerror = () => setConnected(false);

    return () => {
      ws.close();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const openConversation = async (conv) => {
    setActiveId(conv.id);
    try {
      const res = await adminFetch(buildApiUrl(`/api/chat/conversations/${conv.id}/messages`));
      const data = await res.json();
      if (res.ok) setMessages(data.messages || []);
    } catch (err) {
      console.error("Failed to load message history:", err);
    }
  };

  const claimConversation = (conv) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({ type: "claim_conversation", conversationId: conv.id })
      );
    }
  };

  const sendMessage = () => {
    const body = input.trim();
    if (!body || !activeId) return;
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({ type: "staff_message", conversationId: activeId, body })
      );
      setInput("");
    }
  };

  const activeConversation = conversations.find((c) => c.id === activeId);

  if (loading) {
    return <div className="coming-soon"><p>Loading support inbox...</p></div>;
  }

  if (error) {
    return (
      <div className="coming-soon">
        <div className="coming-soon-icon"><FaExclamationTriangle /></div>
        <h3>Couldn't load support inbox</h3>
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", gap: "16px", height: "calc(100vh - 220px)" }}>
      <div className="data-table-card" style={{ marginTop: 0, width: "320px", flexShrink: 0, display: "flex", flexDirection: "column" }}>
        <div className="data-table-head">
          <h3>
            <FaHeadset style={{ marginRight: "6px" }} />
            Conversations
          </h3>
          <span
            style={{
              fontSize: "11px",
              color: connected ? "#10b981" : "#ef4444",
              fontWeight: 600,
            }}
          >
            {connected ? "● Live" : "○ Offline"}
          </span>
        </div>

        <div style={{ overflowY: "auto", flex: 1 }}>
          {conversations.length === 0 ? (
            <p style={{ padding: "16px", fontSize: "13px", color: "#94a3b8" }}>
              No open conversations.
            </p>
          ) : (
            conversations.map((conv) => (
              <div
                key={conv.id}
                onClick={() => openConversation(conv)}
                style={{
                  padding: "12px 16px",
                  borderBottom: "1px solid #f1f5f9",
                  cursor: "pointer",
                  background: activeId === conv.id ? "#eff6ff" : "#fff",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <strong style={{ fontSize: "13px" }}>
                    {conv.user?.first_name} {conv.user?.last_name}
                  </strong>
                  {!conv.assignedStaff && (
                    <span style={{ fontSize: "10px", color: "#d97706", fontWeight: 700 }}>
                      UNCLAIMED
                    </span>
                  )}
                </div>
                <p style={{ margin: "4px 0 0 0", fontSize: "12px", color: "#64748b", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {conv.messages?.[0]?.body || "No messages yet"}
                </p>
                {conv.assignedStaff && (
                  <span style={{ fontSize: "11px", color: "#2563eb" }}>
                    Assigned: {conv.assignedStaff.first_name}
                  </span>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      <div className="data-table-card" style={{ marginTop: 0, flex: 1, display: "flex", flexDirection: "column" }}>
        {!activeConversation ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "#94a3b8" }}>
            Select a conversation to start chatting.
          </div>
        ) : (
          <>
            <div className="data-table-head">
              <h3>
                {activeConversation.user?.first_name} {activeConversation.user?.last_name}
              </h3>
              {!activeConversation.assignedStaff && (
                <button type="button" className="row-btn" onClick={() => claimConversation(activeConversation)}>
                  Claim Conversation
                </button>
              )}
            </div>

            <div style={{ flex: 1, overflowY: "auto", padding: "16px", display: "flex", flexDirection: "column", gap: "10px" }}>
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  style={{
                    alignSelf: msg.senderRole === "staff" ? "flex-end" : "flex-start",
                    maxWidth: "70%",
                    background: msg.senderRole === "staff" ? "#2563eb" : "#f1f5f9",
                    color: msg.senderRole === "staff" ? "#fff" : "#0f172a",
                    padding: "8px 12px",
                    borderRadius: "12px",
                    fontSize: "13px",
                  }}
                >
                  {msg.body}
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            <div style={{ display: "flex", gap: "8px", padding: "12px 16px", borderTop: "1px solid #e2e8f0" }}>
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                placeholder="Type a reply..."
                style={{ flex: 1, padding: "8px 12px", border: "1px solid #d1d5db", borderRadius: "8px" }}
              />
              <button
                type="button"
                onClick={sendMessage}
                style={{ padding: "8px 14px", background: "#2563eb", color: "#fff", border: "none", borderRadius: "8px", cursor: "pointer" }}
              >
                <FaPaperPlane size={12} />
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default AdminSupportInbox;