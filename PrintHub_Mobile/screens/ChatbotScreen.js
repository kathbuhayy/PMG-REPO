import React, {
  useEffect,
  useRef,
  useState,
} from "react";

import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";

import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { COLORS } from "../theme";
import { API_BASE_URL } from "../config";

// ============================================================
// PMG CHATBOT IMAGES
// ============================================================

const CHATBOT_LOGO = require(
  "../assets/chatbot/printhub-assistant.png"
);

const PRODUCT_ICON = require(
  "../assets/chatbot/products.png"
);

const PRICES_ICON = require(
  "../assets/chatbot/prices.png"
);

const ORDERS_ICON = require(
  "../assets/chatbot/orders.png"
);

const CUSTOM_DESIGN_ICON = require(
  "../assets/chatbot/custom-design.png"
);

// ============================================================
// CHATBOT SCREEN
// ============================================================

export default function ChatbotScreen({
  navigation,
}) {
  const { width, height } =
    useWindowDimensions();

  // ==========================================================
  // DEVICE BREAKPOINTS
  // ==========================================================

  const isSmall =
    width <= 360;

  const isMedium =
    width > 360 &&
    width <= 430;

  const isLarge =
    width > 430 &&
    width <= 600;

  const isXLarge =
    width > 600;

  const scale = (
    small,
    medium,
    large,
    xlarge = large
  ) => {
    if (isSmall) {
      return small;
    }

    if (isMedium) {
      return medium;
    }

    if (isLarge) {
      return large;
    }

    return xlarge;
  };

  // ==========================================================
  // RESPONSIVE VALUES
  // ==========================================================

  const horizontalPadding =
    scale(
      14,
      18,
      24,
      32
    );

  const statusBarHeight =
    Platform.OS === "android"
      ? StatusBar.currentHeight || 0
      : 0;

  // ==========================================================
  // STATE
  // ==========================================================

  const [messages, setMessages] =
    useState([
      {
        id: "welcome",
        role: "assistant",
        content:
          "Hi there! 👋\n\nI'm your PrintHub Assistant. Ask me anything about printing, prices, orders, or custom designs!",
      },
    ]);

  const [input, setInput] =
    useState("");

  const [sending, setSending] =
    useState(false);

  const scrollViewRef =
    useRef(null);

  const inputRef =
    useRef(null);

  // ==========================================================
  // AUTO SCROLL
  // ==========================================================

  useEffect(() => {
    const timer =
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({
          animated: true,
        });
      }, 100);

    return () => {
      clearTimeout(timer);
    };
  }, [
    messages,
    sending,
  ]);

  // ==========================================================
  // SAFE TEXT
  // ==========================================================

  const safeText = (
    value
  ) => {
    if (
      value === null ||
      value === undefined
    ) {
      return "";
    }

    if (
      typeof value === "string"
    ) {
      return value;
    }

    if (
      typeof value === "number" ||
      typeof value === "boolean"
    ) {
      return String(value);
    }

    if (
      typeof value === "object"
    ) {
      try {
        if (
          typeof value.reply ===
          "string"
        ) {
          return value.reply;
        }

        if (
          typeof value.message ===
          "string"
        ) {
          return value.message;
        }

        if (
          typeof value.response ===
          "string"
        ) {
          return value.response;
        }

        if (
          typeof value.answer ===
          "string"
        ) {
          return value.answer;
        }

        if (
          typeof value.content ===
          "string"
        ) {
          return value.content;
        }

        return JSON.stringify(
          value
        );
      } catch {
        return "";
      }
    }

    return String(value);
  };

  // ==========================================================
  // SEND MESSAGE
  // ==========================================================

  const sendMessage = async (
    presetText = null
  ) => {
    try {
      // ------------------------------------------------------
      // IMPORTANT:
      // Never allow the React Native press event to become
      // the user's message.
      // ------------------------------------------------------

      let text = "";

      if (
        typeof presetText ===
        "string"
      ) {
        text =
          presetText.trim();
      } else {
        text =
          safeText(input).trim();
      }

      if (
        !text ||
        sending
      ) {
        return;
      }

      // ------------------------------------------------------
      // USER MESSAGE
      // ------------------------------------------------------

      const userMessage = {
        id: `${Date.now()}-user`,
        role: "user",
        content: text,
      };

      const updatedMessages = [
        ...messages,
        userMessage,
      ];

      setMessages(
        updatedMessages
      );

      setInput("");

      setSending(true);

      // ------------------------------------------------------
      // GET USER
      // ------------------------------------------------------

      let userId = null;

      try {
        const userStr =
          await AsyncStorage.getItem(
            "user"
          );

        if (userStr) {
          try {
            const user =
              JSON.parse(
                userStr
              );

            userId =
              user?.id ??
              user?.userId ??
              null;
          } catch (
            parseError
          ) {
            console.warn(
              "[Chatbot] Failed to parse user:",
              parseError
            );
          }
        }
      } catch (
        storageError
      ) {
        console.warn(
          "[Chatbot] AsyncStorage error:",
          storageError
        );
      }

      // ------------------------------------------------------
      // CHECK API
      // ------------------------------------------------------

      if (
        !API_BASE_URL ||
        typeof API_BASE_URL !==
          "string"
      ) {
        throw new Error(
          "API_BASE_URL is not configured."
        );
      }

      const chatUrl =
        `${API_BASE_URL.replace(
          /\/$/,
          ""
        )}/api/chat`;

      console.log(
        "[Chatbot] Request:",
        chatUrl
      );

      // ------------------------------------------------------
      // API REQUEST
      // ------------------------------------------------------

      const response =
        await fetch(
          chatUrl,
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",

              Accept:
                "application/json",

              ...(userId !== null
                ? {
                    "X-User-Id":
                      String(
                        userId
                      ),
                  }
                : {}),
            },

            body: JSON.stringify({
              messages:
                updatedMessages.map(
                  (message) => ({
                    role:
                      message.role ===
                      "user"
                        ? "user"
                        : "assistant",

                    content:
                      safeText(
                        message.content
                      ),
                  })
                ),
            }),
          }
        );

      // ------------------------------------------------------
      // READ RESPONSE SAFELY
      // ------------------------------------------------------

      const responseText =
        await response.text();

      console.log(
        "[Chatbot] Status:",
        response.status
      );

      console.log(
        "[Chatbot] Response:",
        responseText
      );

      let data = null;

      if (
        responseText &&
        responseText.trim()
      ) {
        try {
          data =
            JSON.parse(
              responseText
            );
        } catch (
          jsonError
        ) {
          console.warn(
            "[Chatbot] Response was not JSON:",
            jsonError
          );

          data = {
            reply:
              responseText,
          };
        }
      }

      // ------------------------------------------------------
      // SERVER ERROR
      // ------------------------------------------------------

      if (
        !response.ok
      ) {
        const serverMessage =
          safeText(
            data?.message ??
              data?.error ??
              data?.reply ??
              data?.response
          );

        throw new Error(
          serverMessage ||
            `Server returned HTTP ${response.status}`
        );
      }

      // ------------------------------------------------------
      // GET ASSISTANT RESPONSE
      // ------------------------------------------------------

      let reply = "";

      if (
        typeof data ===
        "string"
      ) {
        reply = data;
      } else if (
        data &&
        typeof data ===
          "object"
      ) {
        reply =
          data.reply ??
          data.message ??
          data.response ??
          data.answer ??
          data.content ??
          "";
      }

      reply =
        safeText(
          reply
        ).trim();

      // ------------------------------------------------------
      // EMPTY RESPONSE
      // ------------------------------------------------------

      if (!reply) {
        throw new Error(
          "The PrintHub Assistant returned an empty response."
        );
      }

      // ------------------------------------------------------
      // ADD ASSISTANT MESSAGE
      // ------------------------------------------------------

      const assistantMessage = {
        id: `${Date.now()}-assistant`,
        role: "assistant",
        content: reply,
      };

      setMessages(
        (previous) => [
          ...previous,
          assistantMessage,
        ]
      );
    } catch (
      error
    ) {
      console.error(
        "[Chatbot] Send message error:",
        error
      );

      const errorText =
        error?.message
          ? String(
              error.message
            )
          : "Unable to connect to the PrintHub Assistant.";

      setMessages(
        (previous) => [
          ...previous,
          {
            id: `${Date.now()}-error`,
            role: "assistant",
            content:
              `Sorry, I couldn't send your message.\n\n${errorText}`,
            error: true,
          },
        ]
      );
    } finally {
      setSending(false);
    }
  };

  // ==========================================================
  // SUBMIT FROM KEYBOARD
  // ==========================================================

  const handleSubmitEditing =
    () => {
      sendMessage();
    };

  // ==========================================================
  // QUICK ACTIONS
  // ==========================================================

  const quickActions = [
    {
      id: "products",

      image:
        PRODUCT_ICON,

      title:
        "Products",

      subtitle:
        "Browse items",

      message:
        "What printing products do you offer?",
    },

    {
      id: "prices",

      image:
        PRICES_ICON,

      title:
        "Prices",

      subtitle:
        "View pricing",

      message:
        "Can you tell me about your product prices?",
    },

    {
      id: "orders",

      image:
        ORDERS_ICON,

      title:
        "Orders",

      subtitle:
        "Track status",

      message:
        "How can I check my order status?",
    },

    {
      id: "design",

      image:
        CUSTOM_DESIGN_ICON,

      title:
        "Custom Design",

      subtitle:
        "Get started",

      message:
        "How can I create a custom design?",
    },
  ];

  // ==========================================================
  // QUICK ACTION HANDLER
  // ==========================================================

  const handleQuickAction =
    (message) => {
      if (
        typeof message !==
        "string"
      ) {
        return;
      }

      sendMessage(
        message
      );
    };

  // ==========================================================
  // BOT ICON
  // ==========================================================

  const renderBotIcon = (
    large = false
  ) => {
    const size =
      large
        ? scale(
            54,
            60,
            68,
            76
          )
        : scale(
            38,
            42,
            46,
            52
          );

    return (
      <View
        style={[
          styles.botImageWrapper,
          {
            width:
              size,

            height:
              size,

            borderRadius:
              size / 2,
          },
        ]}
      >
        <Image
          source={
            CHATBOT_LOGO
          }
          style={{
            width:
              size,

            height:
              size,
          }}
          resizeMode="contain"
        />
      </View>
    );
  };

  // ==========================================================
  // SCREEN
  // ==========================================================

  return (
    <KeyboardAvoidingView
      style={
        styles.container
      }
      behavior={
        Platform.OS ===
        "ios"
          ? "padding"
          : undefined
      }
      keyboardVerticalOffset={
        Platform.OS ===
        "ios"
          ? 0
          : 0
      }
    >
      <StatusBar
        barStyle="light-content"
        backgroundColor={
          COLORS.backgroundDeep
        }
        translucent={
          false
        }
      />

      {/* ====================================================
          HEADER
          NO TOP RIGHT BUTTONS
      ==================================================== */}

      <View
        style={[
          styles.chatHeader,
          {
            paddingTop:
              Platform.OS ===
              "android"
                ? statusBarHeight +
                  scale(
                    8,
                    9,
                    11,
                    14
                  )
                : scale(
                    12,
                    14,
                    16,
                    20
                  ),

            paddingHorizontal:
              horizontalPadding,

            paddingBottom:
              scale(
                11,
                13,
                15,
                18
              ),
          },
        ]}
      >
        {/* BOT LOGO */}

        {renderBotIcon(
          true
        )}

        {/* HEADER TEXT */}

        <View
          style={
            styles.headerText
          }
        >
          <Text
            style={[
              styles.headerTitle,
              {
                fontSize:
                  scale(
                    17,
                    19,
                    21,
                    24
                  ),

                lineHeight:
                  scale(
                    23,
                    25,
                    28,
                    31
                  ),
              },
            ]}
            numberOfLines={
              1
            }
          >
            PrintHub Assistant
          </Text>

          <View
            style={
              styles.onlineRow
            }
          >
            <View
              style={
                styles.onlineDot
              }
            />

            <Text
              style={[
                styles.onlineText,
                {
                  fontSize:
                    scale(
                      11,
                      12,
                      13,
                      14
                    ),
                },
              ]}
            >
              Online
            </Text>
          </View>

          <Text
            style={[
              styles.headerDescription,
              {
                fontSize:
                  scale(
                    9,
                    10,
                    11,
                    12
                  ),
              },
            ]}
            numberOfLines={
              1
            }
          >
            Your printing support, anytime.
          </Text>
        </View>
      </View>

      {/* ====================================================
          HEADER DIVIDER
      ==================================================== */}

      <View
        style={
          styles.headerDivider
        }
      />

      {/* ====================================================
          MESSAGES
      ==================================================== */}

      <ScrollView
        ref={
          scrollViewRef
        }
        style={
          styles.messages
        }
        contentContainerStyle={[
          styles.messagesContent,
          {
            paddingHorizontal:
              horizontalPadding,

            paddingTop:
              scale(
                18,
                20,
                24,
                28
              ),

            paddingBottom:
              scale(
                15,
                18,
                22,
                26
              ),
          },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={
          false
        }
      >
        {messages.map(
          (message) => {
            const isUser =
              message.role ===
              "user";

            return (
              <View
                key={
                  message.id
                }
                style={[
                  styles.messageRow,

                  isUser
                    ? styles.userRow
                    : styles.assistantRow,
                ]}
              >
                {/* BOT ICON */}

                {!isUser && (
                  <View
                    style={
                      styles.messageBotContainer
                    }
                  >
                    {renderBotIcon(
                      false
                    )}
                  </View>
                )}

                {/* MESSAGE */}

                <View
                  style={[
                    styles.messageColumn,

                    isUser &&
                      styles.userMessageColumn,
                  ]}
                >
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

                        {
                          fontSize:
                            scale(
                              13,
                              14,
                              15,
                              16
                            ),

                          lineHeight:
                            scale(
                              20,
                              22,
                              24,
                              26
                            ),
                        },

                        isUser &&
                          styles.userMessageText,

                        message.error &&
                          styles.errorMessageText,
                      ]}
                    >
                      {safeText(
                        message.content
                      )}
                    </Text>
                  </View>

                  {!isUser && (
                    <Text
                      style={
                        styles.messageTime
                      }
                    >
                      PrintHub Assistant
                    </Text>
                  )}
                </View>
              </View>
            );
          }
        )}

        {/* ==================================================
            TYPING
        ================================================== */}

        {sending && (
          <View
            style={[
              styles.messageRow,
              styles.assistantRow,
            ]}
          >
            <View
              style={
                styles.messageBotContainer
              }
            >
              {renderBotIcon(
                false
              )}
            </View>

            <View
              style={
                styles.messageColumn
              }
            >
              <View
                style={[
                  styles.messageBubble,
                  styles.typingBubble,
                ]}
              >
                <ActivityIndicator
                  size="small"
                  color={
                    COLORS.primary
                  }
                />

                <Text
                  style={
                    styles.typingText
                  }
                >
                  Thinking...
                </Text>
              </View>
            </View>
          </View>
        )}
      </ScrollView>

      {/* ====================================================
          BOTTOM AREA
      ==================================================== */}

      <View
        style={
          styles.bottomArea
        }
      >
        {/* ==================================================
            QUICK ACTIONS
        ================================================== */}

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={
            false
          }
          contentContainerStyle={[
            styles.quickActionsContent,
            {
              paddingHorizontal:
                horizontalPadding,
            },
          ]}
        >
          {quickActions.map(
            (action) => (
              <TouchableOpacity
                key={
                  action.id
                }
                style={[
                  styles.quickAction,

                  {
                    width:
                      scale(
                        145,
                        155,
                        170,
                        190
                      ),

                    height:
                      scale(
                        58,
                        62,
                        66,
                        72
                      ),

                    borderRadius:
                      scale(
                        29,
                        31,
                        33,
                        36
                      ),
                  },
                ]}
                onPress={() =>
                  handleQuickAction(
                    action.message
                  )
                }
                disabled={
                  sending
                }
                activeOpacity={
                  0.75
                }
              >
                {/* ICON */}

                <View
                  style={[
                    styles.quickActionIcon,
                    {
                      width:
                        scale(
                          40,
                          44,
                          48,
                          52
                        ),

                      height:
                        scale(
                          40,
                          44,
                          48,
                          52
                        ),

                      borderRadius:
                        scale(
                          20,
                          22,
                          24,
                          26
                        ),
                    },
                  ]}
                >
                  <Image
                    source={
                      action.image
                    }
                    style={
                      styles.quickActionImage
                    }
                    resizeMode="contain"
                  />
                </View>

                {/* TEXT */}

                <View
                  style={
                    styles.quickActionText
                  }
                >
                  <Text
                    style={[
                      styles.quickActionTitle,
                      {
                        fontSize:
                          scale(
                            11,
                            12,
                            13,
                            14
                          ),
                      },
                    ]}
                    numberOfLines={
                      1
                    }
                  >
                    {
                      action.title
                    }
                  </Text>

                  <Text
                    style={[
                      styles.quickActionSubtitle,
                      {
                        fontSize:
                          scale(
                            8,
                            9,
                            10,
                            11
                          ),
                      },
                    ]}
                    numberOfLines={
                      1
                    }
                  >
                    {
                      action.subtitle
                    }
                  </Text>
                </View>
              </TouchableOpacity>
            )
          )}
        </ScrollView>

        {/* ==================================================
            DIVIDER
        ================================================== */}

        <View
          style={
            styles.inputDivider
          }
        />

        {/* ==================================================
            INPUT
        ================================================== */}

        <View
          style={[
            styles.inputArea,
            {
              paddingHorizontal:
                horizontalPadding,

              paddingBottom:
                scale(
                  7,
                  9,
                  11,
                  15
                ),

              paddingTop:
                scale(
                  9,
                  10,
                  11,
                  13
                ),
            },
          ]}
        >
          {/* INPUT BOX */}

          <View
            style={[
              styles.inputWrapper,
              {
                minHeight:
                  scale(
                    50,
                    54,
                    58,
                    62
                  ),

                borderRadius:
                  scale(
                    25,
                    27,
                    29,
                    31
                  ),
              },
            ]}
          >
            {/* ATTACH */}

            <TouchableOpacity
              style={
                styles.attachButton
              }
              activeOpacity={
                0.7
              }
              onPress={() => {}}
            >
              <Ionicons
                name="attach-outline"
                size={scale(
                  22,
                  23,
                  24,
                  26
                )}
                color={
                  COLORS.textMuted
                }
              />
            </TouchableOpacity>

            {/* TEXT INPUT */}

            <TextInput
              ref={
                inputRef
              }
              style={[
                styles.input,
                {
                  fontSize:
                    scale(
                      12,
                      13,
                      14,
                      15
                    ),
                },
              ]}
              value={
                input
              }
              onChangeText={
                setInput
              }
              placeholder="Ask about printing, prices, orders..."
              placeholderTextColor={
                COLORS.inputPlaceholder
              }
              multiline
              maxLength={
                1000
              }
              editable={
                !sending
              }
              onSubmitEditing={
                handleSubmitEditing
              }
              blurOnSubmit={
                false
              }
            />
          </View>

          {/* SEND */}

          <TouchableOpacity
            style={[
              styles.sendButton,

              {
                width:
                  scale(
                    50,
                    54,
                    58,
                    62
                  ),

                height:
                  scale(
                    50,
                    54,
                    58,
                    62
                  ),

                borderRadius:
                  scale(
                    25,
                    27,
                    29,
                    31
                  ),
              },

              (!input.trim() ||
                sending) &&
                styles.sendButtonDisabled,
            ]}
            onPress={() =>
              sendMessage()
            }
            disabled={
              !input.trim() ||
              sending
            }
            activeOpacity={
              0.8
            }
          >
            {sending ? (
              <ActivityIndicator
                size="small"
                color={
                  COLORS.textDark
                }
              />
            ) : (
              <Ionicons
                name="arrow-forward"
                size={scale(
                  23,
                  25,
                  27,
                  29
                )}
                color={
                  COLORS.textDark
                }
              />
            )}
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

// ============================================================
// STYLES
// ============================================================

const styles =
  StyleSheet.create({
    // ========================================================
    // CONTAINER
    // ========================================================

    container: {
      flex: 1,

      backgroundColor:
        COLORS.background,
    },

    // ========================================================
    // HEADER
    // ========================================================

    chatHeader: {
      width: "100%",

      flexDirection:
        "row",

      alignItems:
        "center",

      backgroundColor:
        COLORS.backgroundDeep,

      minHeight: 92,
    },

    headerDivider: {
      height: 1,

      width: "100%",

      backgroundColor:
        COLORS.border,
    },

    // ========================================================
    // BOT LOGO
    // ========================================================

    botImageWrapper: {
      alignItems:
        "center",

      justifyContent:
        "center",

      backgroundColor:
        "rgba(182,255,0,0.04)",

      borderWidth: 1,

      borderColor:
        COLORS.border,

      overflow:
        "hidden",

      shadowColor:
        COLORS.primary,

      shadowOffset: {
        width: 0,
        height: 0,
      },

      shadowOpacity:
        0.28,

      shadowRadius:
        10,

      elevation: 4,

      flexShrink: 0,
    },

    // ========================================================
    // HEADER TEXT
    // ========================================================

    headerText: {
      flex: 1,

      minWidth: 0,

      marginLeft: 12,

      justifyContent:
        "center",
    },

    headerTitle: {
      fontFamily:
        "Poppins_700Bold",

      color:
        COLORS.textPrimary,

      includeFontPadding:
        false,

      letterSpacing:
        -0.25,
    },

    onlineRow: {
      flexDirection:
        "row",

      alignItems:
        "center",

      marginTop: 3,
    },

    onlineDot: {
      width: 8,

      height: 8,

      borderRadius: 4,

      backgroundColor:
        COLORS.success,

      marginRight: 6,

      shadowColor:
        COLORS.success,

      shadowOpacity:
        0.5,

      shadowRadius:
        5,

      elevation: 2,
    },

    onlineText: {
      fontFamily:
        "Poppins_600SemiBold",

      color:
        COLORS.primary,

      includeFontPadding:
        false,
    },

    headerDescription: {
      fontFamily:
        "Poppins_400Regular",

      color:
        COLORS.textMuted,

      marginTop: 2,

      includeFontPadding:
        false,
    },

    // ========================================================
    // MESSAGES
    // ========================================================

    messages: {
      flex: 1,

      backgroundColor:
        COLORS.background,
    },

    messagesContent: {
      flexGrow: 1,
    },

    messageRow: {
      flexDirection:
        "row",

      width: "100%",

      marginBottom: 17,

      alignItems:
        "flex-end",
    },

    assistantRow: {
      justifyContent:
        "flex-start",
    },

    userRow: {
      justifyContent:
        "flex-end",
    },

    messageBotContainer: {
      marginRight: 8,

      alignSelf:
        "flex-end",

      flexShrink: 0,
    },

    // ========================================================
    // MESSAGE COLUMN
    // ========================================================

    messageColumn: {
      maxWidth: "82%",

      flexShrink: 1,
    },

    userMessageColumn: {
      maxWidth: "82%",

      alignItems:
        "flex-end",
    },

    // ========================================================
    // MESSAGE BUBBLE
    // ========================================================

    messageBubble: {
      borderRadius: 18,

      paddingHorizontal: 15,

      paddingVertical: 13,

      minWidth: 45,
    },

    assistantBubble: {
      backgroundColor:
        COLORS.surfaceDark,

      borderWidth: 1,

      borderColor:
        COLORS.border,

      borderBottomLeftRadius:
        5,

      shadowColor:
        COLORS.primary,

      shadowOffset: {
        width: 0,
        height: 4,
      },

      shadowOpacity:
        0.06,

      shadowRadius:
        10,

      elevation: 1,
    },

    userBubble: {
      backgroundColor:
        COLORS.primary,

      borderBottomRightRadius:
        5,

      shadowColor:
        COLORS.primary,

      shadowOffset: {
        width: 0,
        height: 4,
      },

      shadowOpacity:
        0.18,

      shadowRadius:
        8,

      elevation: 2,
    },

    errorBubble: {
      backgroundColor:
        "rgba(239,68,68,0.08)",

      borderColor:
        "rgba(239,68,68,0.35)",
    },

    // ========================================================
    // MESSAGE TEXT
    // ========================================================

    messageText: {
      fontFamily:
        "Poppins_400Regular",

      color:
        COLORS.textPrimary,

      includeFontPadding:
        false,
    },

    userMessageText: {
      color:
        COLORS.textDark,

      fontFamily:
        "Poppins_500Medium",
    },

    errorMessageText: {
      color:
        "#FF8A8A",
    },

    messageTime: {
      fontFamily:
        "Poppins_400Regular",

      color:
        COLORS.textDim,

      fontSize: 8,

      marginTop: 5,

      marginLeft: 3,

      includeFontPadding:
        false,
    },

    // ========================================================
    // TYPING
    // ========================================================

    typingBubble: {
      flexDirection:
        "row",

      alignItems:
        "center",

      paddingVertical: 11,

      paddingHorizontal: 14,
    },

    typingText: {
      fontFamily:
        "Poppins_500Medium",

      color:
        COLORS.textMuted,

      fontSize: 11,

      marginLeft: 8,

      includeFontPadding:
        false,
    },

    // ========================================================
    // BOTTOM AREA
    // ========================================================

    bottomArea: {
      backgroundColor:
        COLORS.backgroundDeep,

      borderTopWidth: 1,

      borderTopColor:
        COLORS.border,

      paddingTop: 8,
    },

    // ========================================================
    // QUICK ACTIONS
    // ========================================================

    quickActionsContent: {
      gap: 9,

      paddingVertical: 3,
    },

    quickAction: {
      flexDirection:
        "row",

      alignItems:
        "center",

      backgroundColor:
        COLORS.surfaceDark,

      borderWidth: 1,

      borderColor:
        COLORS.borderStrong,

      paddingHorizontal: 8,

      paddingRight: 13,

      flexShrink: 0,
    },

    quickActionIcon: {
      backgroundColor:
        "rgba(182,255,0,0.08)",

      justifyContent:
        "center",

      alignItems:
        "center",

      borderWidth: 1,

      borderColor:
        COLORS.border,

      overflow:
        "hidden",

      flexShrink: 0,
    },

    quickActionImage: {
      width: "84%",

      height: "84%",
    },

    quickActionText: {
      marginLeft: 8,

      flex: 1,

      minWidth: 0,

      justifyContent:
        "center",
    },

    quickActionTitle: {
      fontFamily:
        "Poppins_700Bold",

      color:
        COLORS.textPrimary,

      includeFontPadding:
        false,
    },

    quickActionSubtitle: {
      fontFamily:
        "Poppins_400Regular",

      color:
        COLORS.textMuted,

      marginTop: 2,

      includeFontPadding:
        false,
    },

    // ========================================================
    // DIVIDER
    // ========================================================

    inputDivider: {
      height: 1,

      backgroundColor:
        "rgba(182,255,0,0.08)",

      marginTop: 9,
    },

    // ========================================================
    // INPUT AREA
    // ========================================================

    inputArea: {
      width: "100%",

      flexDirection:
        "row",

      alignItems:
        "flex-end",

      gap: 9,
    },

    // ========================================================
    // INPUT WRAPPER
    // ========================================================

    inputWrapper: {
      flex: 1,

      maxHeight: 120,

      flexDirection:
        "row",

      alignItems:
        "center",

      backgroundColor:
        COLORS.inputBackground,

      borderWidth: 1,

      borderColor:
        COLORS.borderStrong,

      paddingLeft: 5,

      paddingRight: 8,

      overflow:
        "hidden",
    },

    // ========================================================
    // ATTACH
    // ========================================================

    attachButton: {
      width: 38,

      height: 42,

      justifyContent:
        "center",

      alignItems:
        "center",

      flexShrink: 0,
    },

    // ========================================================
    // INPUT
    // ========================================================

    input: {
      flex: 1,

      minHeight: 42,

      maxHeight: 100,

      color:
        COLORS.textPrimary,

      fontFamily:
        "Poppins_400Regular",

      paddingHorizontal: 4,

      paddingTop: 10,

      paddingBottom: 10,

      includeFontPadding:
        false,

      textAlignVertical:
        "center",
    },

    // ========================================================
    // SEND BUTTON
    // ========================================================

    sendButton: {
      backgroundColor:
        COLORS.primary,

      justifyContent:
        "center",

      alignItems:
        "center",

      flexShrink: 0,

      shadowColor:
        COLORS.primary,

      shadowOffset: {
        width: 0,

        height: 5,
      },

      shadowOpacity:
        0.25,

      shadowRadius:
        10,

      elevation: 4,
    },

    sendButtonDisabled: {
      opacity: 0.30,

      shadowOpacity: 0,
    },
  });