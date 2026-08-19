import { useState, useRef, useEffect, useCallback } from "react";
import { buildApiUrl } from "../config/api";
import { adminFetch } from "../utils/adminFetch";

function buildWsUrl() {
  const apiBase = buildApiUrl("").replace(/\/$/, "");
  return apiBase.replace(/^http/, "ws") + "/ws/chat";
}

/**
 * useSupportChat
 * One shared WebSocket connection for the whole admin session — lives at
 * the dashboard shell level so it stays connected across every page, not
 * just while Support Inbox happens to be open. Powers both the global
 * toast banner and the Support Inbox page itself.
 */
function useSupportChat({ enabled }) {
  const [connected, setConnected] = useState(false);
  const [conversations, setConversations] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [toast, setToast] = useState(null);
  const wsRef = useRef(null);
  const activeIdRef = useRef(null);

  activeIdRef.current = activeId;

  const fetchConversations = useCallback(async () => {
    try {
      const res = await adminFetch(buildApiUrl("/api/chat/conversations"));
      const data = await res.json();
      if (res.ok) setConversations(data.conversations || []);
    } catch (err) {
      console.error("Failed to fetch conversations:", err);
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;
    const token = localStorage.getItem("authToken");
    if (!token) return;

    fetchConversations();

    const ws = new WebSocket(buildWsUrl());
    wsRef.current = ws;

    ws.onopen = () => ws.send(JSON.stringify({ type: "auth", token }));

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);

      if (data.type === "auth_ok") setConnected(true);
      if (data.type === "auth_error") setConnected(false);

      if (data.type === "new_customer_message") {
        fetchConversations();
        if (activeIdRef.current === data.conversationId) {
          setMessages((prev) => [...prev, data.message]);
        }
        setToast({ customerName: data.customerName, body: data.message.body });
        setTimeout(() => setToast(null), 5000);
      }

      if (data.type === "message") {
        fetchConversations();
        if (activeIdRef.current === data.conversationId) {
          setMessages((prev) => [...prev, data.message]);
        }
        if (data.message.senderRole === "customer") {
          setToast({ customerName: null, body: data.message.body });
          setTimeout(() => setToast(null), 5000);
        }
      }

      if (data.type === "conversation_claimed") {
        fetchConversations();
      }
    };

    ws.onclose = () => setConnected(false);
    ws.onerror = () => setConnected(false);

    return () => ws.close();
  }, [enabled, fetchConversations]);

  const openConversation = useCallback(async (conv) => {
    setActiveId(conv.id);
    try {
      const res = await adminFetch(buildApiUrl(`/api/chat/conversations/${conv.id}/messages`));
      const data = await res.json();
      if (res.ok) setMessages(data.messages || []);
    } catch (err) {
      console.error("Failed to load message history:", err);
    }
  }, []);

  const claimConversation = useCallback((conv) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "claim_conversation", conversationId: conv.id }));
    }
  }, []);

  const sendMessage = useCallback((body) => {
    if (!body.trim() || !activeIdRef.current) return;
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({ type: "staff_message", conversationId: activeIdRef.current, body })
      );
    }
  }, []);

  const dismissToast = useCallback(() => setToast(null), []);

  return {
    connected,
    conversations,
    activeId,
    messages,
    openConversation,
    claimConversation,
    sendMessage,
    toast,
    dismissToast,
  };
}

export default useSupportChat;