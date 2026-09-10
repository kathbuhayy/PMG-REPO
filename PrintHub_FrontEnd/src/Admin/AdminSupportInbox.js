import React, { useState, useEffect } from "react";
import { FaHeadset, FaPaperPlane } from "react-icons/fa";

function isSameDay(a, b) {
  const d1 = new Date(a);
  const d2 = new Date(b);
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
}

function formatMessageTime(dateStr) {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  let hours = date.getHours();
  const minutes = date.getMinutes().toString().padStart(2, "0");
  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12 || 12;
  return `${hours}:${minutes} ${ampm}`;
}

function formatDateSeparator(dateStr) {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (isSameDay(date, now)) return "Today";
  if (isSameDay(date, yesterday)) return "Yesterday";
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function UnreadBadge({ count }) {
  if (!count) return null;
  return (
    <span
      style={{
        minWidth: "18px",
        height: "18px",
        padding: "0 5px",
        borderRadius: "999px",
        background: "#EF4444",
        color: "#fff",
        fontSize: "10px",
        fontWeight: 700,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        lineHeight: 1,
      }}
    >
      {count > 9 ? "9+" : count}
    </span>
  );
}

function AdminSupportInbox({ chat }) {
  const [input, setInput] = useState("");
  const activeConversation = chat.conversations.find((c) => c.id === chat.activeId);

  // This tab is a fixed-height chat shell (conversations list + message
  // thread each scroll internally) rather than a normal tall page like
  // every other admin tab, so lock the outer page scroll while it's
  // mounted - otherwise any slight overflow (a long unread message, an
  // extra-tall row) makes the whole page scroll behind it too, on top
  // of the internal scroll areas. Locks both <body> and <html>: body
  // alone can leave the page's scrollbar still active if the browser
  // treats <html> as the actual scrolling root (same fix needed for
  // CheckoutModal's overlay earlier). Restored on unmount so other
  // tabs' normal page scrolling is unaffected.
  useEffect(() => {
    const prevBodyOverflow = document.body.style.overflow;
    const prevHtmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevBodyOverflow;
      document.documentElement.style.overflow = prevHtmlOverflow;
    };
  }, []);

  const handleSend = () => {
    if (!input.trim()) return;
    chat.sendMessage(input);
    setInput("");
  };

  return (
    // 64px = .dashboard-content's own top+bottom padding (32px each) -
    // the only fixed number this needs, since everything above the
    // conversations/chat row (the header) sizes itself; a flex:1 row
    // then gets exactly whatever's left, instead of guessing the
    // header's rendered height and hardcoding that guess as well
    // (which is what previously left a large gap of unused space
    // below both panels).
    <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 64px)" }}>
      <div className="admin-page-header">
        <h1 className="admin-page-header-title">Support Inbox</h1>
        <p className="admin-page-header-desc">
          Live chat conversations with customers.
        </p>
      </div>

      <div style={{ display: "flex", gap: "16px", flex: 1, minHeight: 0 }}>
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
                <div style={{ display: "flex", justifyContent: "space-between", gap: "8px" }}>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
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
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "4px", flexShrink: 0 }}>
                    {conv.messages?.[0]?.createdAt && (
                      <span style={{ fontSize: "10px", color: "#94a3b8" }}>
                        {formatMessageTime(conv.messages[0].createdAt)}
                      </span>
                    )}
                    <UnreadBadge count={conv.unreadCount} />
                  </div>
                </div>
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
              {chat.messages.map((msg, idx) => {
                const prevMsg = chat.messages[idx - 1];
                const showDateSeparator = !prevMsg || !isSameDay(prevMsg.createdAt, msg.createdAt);
                return (
                  <React.Fragment key={msg.id}>
                    {showDateSeparator && (
                      <div style={{ display: "flex", justifyContent: "center", margin: "4px 0" }}>
                        <span
                          style={{
                            fontSize: "11px",
                            color: "#64748b",
                            background: "#f1f5f9",
                            padding: "3px 10px",
                            borderRadius: "999px",
                            fontWeight: 600,
                          }}
                        >
                          {formatDateSeparator(msg.createdAt)}
                        </span>
                      </div>
                    )}
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        alignSelf: msg.senderRole === "staff" ? "flex-end" : "flex-start",
                        maxWidth: "70%",
                      }}
                    >
                      <div
                        style={{
                          background: msg.senderRole === "staff" ? "#2563eb" : "#f1f5f9",
                          color: msg.senderRole === "staff" ? "#fff" : "#0f172a",
                          padding: "8px 12px",
                          borderRadius: "12px",
                          fontSize: "13px",
                        }}
                      >
                        {msg.body}
                      </div>
                      <span
                        style={{
                          fontSize: "10px",
                          color: "#94a3b8",
                          marginTop: "3px",
                          alignSelf: msg.senderRole === "staff" ? "flex-end" : "flex-start",
                        }}
                      >
                        {formatMessageTime(msg.createdAt)}
                      </span>
                    </div>
                  </React.Fragment>
                );
              })}
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