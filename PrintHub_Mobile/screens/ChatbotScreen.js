import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { COLORS } from "../theme";
import { API_BASE_URL } from "../config";

export default function ChatbotScreen() {
  const [messages, setMessages] = useState([
    {
      id: "welcome",
      role: "assistant",
      content:
        "Hi! I'm PrintHub Assistant. 👋 How can I help you with printing, products, pricing, orders, or payments today?",
    },
  ]);

  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);

  const scrollViewRef = useRef(null);

  useEffect(() => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({
        animated: true,
      });
    }, 100);
  }, [messages, sending]);

  const sendMessage = async () => {
    const text = input.trim();

    if (!text || sending) {
      return;
    }

    const userMessage = {
      id: `${Date.now()}-user`,
      role: "user",
      content: text,
    };

    const updatedMessages = [
      ...messages,
      userMessage,
    ];

    setMessages(updatedMessages);
    setInput("");
    setSending(true);

    try {
      const userStr =
        await AsyncStorage.getItem("user");

      let userId = null;

      if (userStr) {
        try {
          const user = JSON.parse(userStr);
          userId = user?.id || null;
        } catch {
          userId = null;
        }
      }

      const response = await fetch(
        `${API_BASE_URL}/api/chat`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(userId
              ? {
                  "X-User-Id": String(userId),
                }
              : {}),
          },
          body: JSON.stringify({
            messages: updatedMessages.map(
              (message) => ({
                role: message.role,
                content: message.content,
              })
            ),
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.message ||
            "Unable to get a response from PrintHub Assistant."
        );
      }

      const assistantMessage = {
        id: `${Date.now()}-assistant`,
        role: "assistant",
        content:
          data?.reply ||
          "Sorry, I wasn't able to generate a response.",
      };

      setMessages((prev) => [
        ...prev,
        assistantMessage,
      ]);
    } catch (error) {
      console.error(
        "[Chatbot] Error:",
        error
      );

      setMessages((prev) => [
        ...prev,
        {
          id: `${Date.now()}-error`,
          role: "assistant",
          content:
            "Sorry, I'm having trouble connecting right now. Please try again in a moment.",
          error: true,
        },
      ]);
    } finally {
      setSending(false);
    }
  };

  const handleSubmitEditing = () => {
    sendMessage();
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={
        Platform.OS === "ios"
          ? "padding"
          : undefined
      }
      keyboardVerticalOffset={90}
    >
      {/* Header */}
      <View style={styles.chatHeader}>
        <View style={styles.botIcon}>
          <Ionicons
            name="sparkles"
            size={22}
            color={COLORS.textLight}
          />
        </View>

        <View style={styles.headerText}>
          <Text style={styles.headerTitle}>
            PrintHub Assistant
          </Text>

          <View style={styles.onlineRow}>
            <View style={styles.onlineDot} />
            <Text style={styles.onlineText}>
              Online
            </Text>
          </View>
        </View>
      </View>

      {/* Messages */}
      <ScrollView
        ref={scrollViewRef}
        style={styles.messages}
        contentContainerStyle={
          styles.messagesContent
        }
        keyboardShouldPersistTaps="handled"
      >
        {messages.map((message) => {
          const isUser =
            message.role === "user";

          return (
            <View
              key={message.id}
              style={[
                styles.messageRow,
                isUser
                  ? styles.userRow
                  : styles.assistantRow,
              ]}
            >
              {!isUser && (
                <View style={styles.smallBotIcon}>
                  <Ionicons
                    name="sparkles"
                    size={14}
                    color={COLORS.textLight}
                  />
                </View>
              )}

              <View
                style={[
                  styles.messageBubble,
                  isUser
                    ? styles.userBubble
                    : styles.assistantBubble,
                  message.error &&
                    styles.errorBubble,
                ]}
              >
                <Text
                  style={[
                    styles.messageText,
                    isUser &&
                      styles.userMessageText,
                  ]}
                >
                  {message.content}
                </Text>
              </View>
            </View>
          );
        })}

        {sending && (
          <View
            style={[
              styles.messageRow,
              styles.assistantRow,
            ]}
          >
            <View style={styles.smallBotIcon}>
              <Ionicons
                name="sparkles"
                size={14}
                color={COLORS.textLight}
              />
            </View>

            <View
              style={[
                styles.messageBubble,
                styles.assistantBubble,
                styles.typingBubble,
              ]}
            >
              <ActivityIndicator
                size="small"
                color={COLORS.accentCyan}
              />

              <Text style={styles.typingText}>
                Thinking...
              </Text>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Input */}
      <View style={styles.inputArea}>
        <TextInput
          style={styles.input}
          value={input}
          onChangeText={setInput}
          placeholder="Ask about printing, prices, orders..."
          placeholderTextColor={COLORS.textMuted}
          multiline
          maxLength={1000}
          editable={!sending}
          onSubmitEditing={
            handleSubmitEditing
          }
          blurOnSubmit={false}
        />

        <TouchableOpacity
          style={[
            styles.sendButton,
            (!input.trim() || sending) &&
              styles.sendButtonDisabled,
          ]}
          onPress={sendMessage}
          disabled={
            !input.trim() || sending
          }
        >
          <Ionicons
            name="send"
            size={20}
            color={COLORS.textLight}
          />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.lightBg,
  },

  chatHeader: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.primaryDark,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },

  botIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: COLORS.accentCyan,
    justifyContent: "center",
    alignItems: "center",
  },

  headerText: {
    marginLeft: 12,
    flex: 1,
  },

  headerTitle: {
    color: COLORS.textLight,
    fontSize: 17,
    fontWeight: "800",
  },

  onlineRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 3,
  },

  onlineDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "#43D17A",
    marginRight: 6,
  },

  onlineText: {
    color: COLORS.textMuted,
    fontSize: 11,
    fontWeight: "600",
  },

  messages: {
    flex: 1,
  },

  messagesContent: {
    padding: 16,
    paddingBottom: 20,
  },

  messageRow: {
    flexDirection: "row",
    marginBottom: 14,
    alignItems: "flex-end",
  },

  userRow: {
    justifyContent: "flex-end",
  },

  assistantRow: {
    justifyContent: "flex-start",
  },

  smallBotIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.primaryDark,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 8,
  },

  messageBubble: {
    maxWidth: "78%",
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },

  userBubble: {
    backgroundColor: COLORS.accentCyan,
    borderBottomRightRadius: 4,
  },

  assistantBubble: {
    backgroundColor: COLORS.cardBg,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    borderBottomLeftRadius: 4,
  },

  errorBubble: {
    borderColor: "#E57373",
  },

  messageText: {
    color: COLORS.textPrimary,
    fontSize: 14,
    lineHeight: 20,
  },

  userMessageText: {
    color: COLORS.textLight,
  },

  typingBubble: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
  },

  typingText: {
    color: COLORS.textMuted,
    fontSize: 12,
    marginLeft: 8,
  },

  inputArea: {
    flexDirection: "row",
    alignItems: "flex-end",
    backgroundColor: COLORS.cardBg,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 10,
  },

  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 110,
    backgroundColor: COLORS.lightBg,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 11,
    color: COLORS.textPrimary,
    fontSize: 14,
  },

  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.accentCyan,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 8,
  },

  sendButtonDisabled: {
    opacity: 0.45,
  },
});