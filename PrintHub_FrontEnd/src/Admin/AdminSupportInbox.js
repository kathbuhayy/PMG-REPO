import React, { useState } from "react";
import { FaHeadset, FaPaperPlane } from "react-icons/fa";

function AdminSupportInbox({ chat }) {
  const [input, setInput] = useState("");
  const activeConversation = chat.conversations.find((c) => c.id === chat.activeId);

  const handleSend = () => {
    if (!input.trim()) return;
    chat.sendMessage(input);
    setInput("");
  };

  return (
    <div>
      <div className="admin-page-header">
        <h1 className="admin-page-header-title">Support Inbox</h1>
        <p className="admin-page-header-desc">
          Live chat conversations with customers.
        </p>
      </div>

      <div style={{ display: "flex", gap: "16px", height: "calc(100vh - 320px)" }}>
      <div className="data-table-card" style={{ marginTop: 0, width: "320px", flexShrink: 0, display: "flex", flexDirection: "column" }}>
        <div className="data-table-head">
          <h3><FaHeadset style={{ marginRight: "6px" }} />Conversations</h3>
          <span style={{ fontSize: "11px", color: chat.connected ? "#10b981" : "#ef4444", fontWeight: 600 }}>
            {chat.connected ? "● Live" : "○ Offline"}
          </span>
        </div>

        <div style={{ overflowY: "auto", flex: 1 }}>
          {chat.conversations.length === 0 ? (
            <p style={{ padding: "16px", fontSize: "13px", color: "#94a3b8" }}>No open conversations.</p>
          ) : (
            chat.conversations.map((conv) => (
              <div
                key={conv.id}
                onClick={() => chat.openConversation(conv)}
                style={{
                  padding: "12px 16px",
                  borderBottom: "1px solid #f1f5f9",
                  cursor: "pointer",
                  background: chat.activeId === conv.id ? "#eff6ff" : "#fff",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <strong style={{ fontSize: "13px" }}>
                    {conv.user?.first_name} {conv.user?.last_name}
                  </strong>
                  {!conv.assignedStaff && (
                    <span style={{ fontSize: "10px", color: "#d97706", fontWeight: 700 }}>UNCLAIMED</span>
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
              <h3>{activeConversation.user?.first_name} {activeConversation.user?.last_name}</h3>
              {!activeConversation.assignedStaff && (
                <button type="button" className="row-btn" onClick={() => chat.claimConversation(activeConversation)}>
                  Claim Conversation
                </button>
              )}
            </div>

            <div style={{ flex: 1, overflowY: "auto", padding: "16px", display: "flex", flexDirection: "column", gap: "10px" }}>
              {chat.messages.map((msg) => (
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
            </div>

            <div style={{ display: "flex", gap: "8px", padding: "12px 16px", borderTop: "1px solid #e2e8f0" }}>
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSend()}
                placeholder="Type a reply..."
                style={{ flex: 1, padding: "8px 12px", border: "1px solid #d1d5db", borderRadius: "8px" }}
              />
              <button
                type="button"
                onClick={handleSend}
                style={{ padding: "8px 14px", background: "#2563eb", color: "#fff", border: "none", borderRadius: "8px", cursor: "pointer" }}
              >
                <FaPaperPlane size={12} />
              </button>
            </div>
          </>
        )}
      </div>
      </div>
    </div>
  );
}

export default AdminSupportInbox;