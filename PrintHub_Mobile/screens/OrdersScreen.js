import React, {
  useState,
  useCallback,
  useMemo,
} from "react";

import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Image,
  ScrollView,
  Linking,
  useWindowDimensions,
} from "react-native";

import { Ionicons } from "@expo/vector-icons";

import AsyncStorage from "@react-native-async-storage/async-storage";

import { SafeAreaView } from "react-native-safe-area-context";

import {
  useFocusEffect,
} from "@react-navigation/native";

import { useFonts } from "expo-font";

import {
  Poppins_400Regular,
  Poppins_500Medium,
  Poppins_600SemiBold,
  Poppins_700Bold,
} from "@expo-google-fonts/poppins";

import { API_BASE_URL } from "../config";
import { COLORS } from "../theme";

// ============================================================
// ORDERS SCREEN
// ============================================================

export default function OrdersScreen({
  navigation,
}) {
  // ==========================================================
  // RESPONSIVE
  // ==========================================================

  const { width, height } =
    useWindowDimensions();

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

  /*
   * Responsive scaling.
   *
   * Small:
   * 320-360 phones
   *
   * Medium:
   * 361-430 phones
   *
   * Large:
   * 431-600 phones/tablet-sized phones
   *
   * XLarge:
   * 600+
   */
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

  /*
   * Keep content from becoming excessively wide
   * on very large screens.
   */
  const contentWidth =
    Math.min(
      width - scale(
        20,
        28,
        40,
        64
      ),
      820
    );

  // ==========================================================
  // FONTS
  // ==========================================================

  const [fontsLoaded] =
    useFonts({
      Poppins_400Regular,
      Poppins_500Medium,
      Poppins_600SemiBold,
      Poppins_700Bold,
    });

  // ==========================================================
  // STATE
  // ==========================================================

  const [orders, setOrders] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [activeFilter, setActiveFilter] =
    useState("all");

  // ==========================================================
  // FETCH ORDERS
  // ==========================================================

  const fetchOrders =
    useCallback(async () => {
      try {
        const userStr =
          await AsyncStorage.getItem(
            "user"
          );

        if (!userStr) {
          setOrders([]);
          return;
        }

        const user =
          JSON.parse(userStr);

        if (!user?.id) {
          setOrders([]);
          return;
        }

        const res =
          await fetch(
            `${API_BASE_URL}/api/user/${user.id}/orders`
          );

        if (res.ok) {
          const data =
            await res.json();

          setOrders(
            Array.isArray(data)
              ? [...data].sort(
                  (a, b) => {
                    const dateA =
                      new Date(
                        a?.createdAt || 0
                      ).getTime();

                    const dateB =
                      new Date(
                        b?.createdAt || 0
                      ).getTime();

                    return (
                      dateB -
                      dateA
                    );
                  }
                )
              : []
          );
        } else {
          console.error(
            "[OrdersScreen] Failed to fetch orders:",
            res.status
          );
        }
      } catch (err) {
        console.error(
          "[OrdersScreen] FetchOrders:",
          err?.message || err
        );
      }
    }, []);

  // ==========================================================
  // AUTO SYNC
  // ==========================================================

  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      setLoading(true);

      fetchOrders().finally(
        () => {
          if (isActive) {
            setLoading(false);
          }
        }
      );

      const interval =
        setInterval(() => {
          fetchOrders();
        }, 5000);

      return () => {
        isActive = false;
        clearInterval(interval);
      };
    }, [fetchOrders])
  );

  // ==========================================================
  // MANUAL REFRESH
  // ==========================================================

  const onRefresh =
    useCallback(() => {
      setRefreshing(true);

      fetchOrders().finally(
        () => {
          setRefreshing(false);
        }
      );
    }, [fetchOrders]);

  // ==========================================================
  // STATUS HELPERS
  // ==========================================================

  const normalizeStatus =
    (status) => {
      return String(
        status || ""
      )
        .trim()
        .toLowerCase()
        .replace(
          /_/g,
          " "
        );
    };

  // ==========================================================
  // PROOF APPROVAL
  // ==========================================================

  const isProofApproved =
    (order) => {
      return (
        order?.proofApproved ===
          true ||
        String(
          order?.proofApproved || ""
        )
          .trim()
          .toLowerCase() ===
          "true"
      );
    };

  // ==========================================================
  // STATUS COLOR
  // ==========================================================

  const getStatusColor =
    (status) => {
      const normalized =
        normalizeStatus(
          status
        );

      switch (normalized) {
        case "completed":
          return COLORS.success;

        case "delivered":
          return COLORS.success;

        case "paid":
          return COLORS.primary;

        case "processing":
        case "in production":
          return COLORS.primary;

        case "approved":
          return COLORS.primary;

        case "cancelled":
        case "canceled":
        case "rejected":
          return COLORS.danger;

        case "pending":
        case "payment pending":
          return COLORS.warning;

        default:
          return COLORS.warning;
      }
    };

  // ==========================================================
  // DISPLAY STATUS
  // ==========================================================

  const getDisplayStatus =
    (order) => {
      const status =
        normalizeStatus(
          order?.status
        );

      const paymentStatus =
        normalizeStatus(
          order?.paymentStatus ||
            order?.payment_status
        );

      if (
        isProofApproved(order) &&
        paymentStatus !==
          "paid" &&
        status !== "paid" &&
        status !== "processing" &&
        status !==
          "in production" &&
        status !== "delivered" &&
        status !== "completed"
      ) {
        return "Approved";
      }

      if (
        paymentStatus ===
          "pending" &&
        status !==
          "cancelled" &&
        status !==
          "canceled" &&
        status !==
          "completed"
      ) {
        return "Payment Pending";
      }

      if (!status) {
        return "Pending";
      }

      if (
        status ===
        "in production"
      ) {
        return "Processing";
      }

      return (
        order.status ||
        "Pending"
      );
    };

  // ==========================================================
  // ORDER STEPS
  // ==========================================================

  const orderSteps = [
    "Placed",
    "Approved",
    "Paid",
    "Processing",
    "Delivered",
    "Completed",
  ];

  const smallOrderSteps = [
    "Placed",
    "Approved",
    "Paid",
    "Process",
    "Deliver",
    "Done",
  ];

  // ==========================================================
  // STEP INDEX
  // ==========================================================

  const getStepIndex =
    (order) => {
      const status =
        normalizeStatus(
          order?.status
        );

      const paymentStatus =
        normalizeStatus(
          order?.paymentStatus ||
            order?.payment_status
        );

      if (
        status ===
          "cancelled" ||
        status ===
          "canceled" ||
        status ===
          "rejected"
      ) {
        return -1;
      }

      if (
        status ===
        "completed"
      ) {
        return 5;
      }

      if (
        status ===
        "delivered"
      ) {
        return 4;
      }

      if (
        status ===
          "processing" ||
        status ===
          "in production"
      ) {
        return 3;
      }

      if (
        status === "paid" ||
        paymentStatus ===
          "paid"
      ) {
        return 2;
      }

      if (
        status === "approved" ||
        isProofApproved(order)
      ) {
        return 1;
      }

      return 0;
    };

  // ==========================================================
  // PAYMENT PENDING
  // ==========================================================

  const isPaymentPending =
    (order) => {
      const status =
        normalizeStatus(
          order?.status
        );

      const paymentStatus =
        normalizeStatus(
          order?.paymentStatus ||
            order?.payment_status
        );

      if (
        status ===
          "cancelled" ||
        status ===
          "canceled" ||
        status ===
          "rejected" ||
        status ===
          "completed"
      ) {
        return false;
      }

      if (
        status === "paid" ||
        paymentStatus ===
          "paid"
      ) {
        return false;
      }

      if (
        isProofApproved(order)
      ) {
        return true;
      }

      if (
        status ===
          "payment pending" ||
        paymentStatus ===
          "pending"
      ) {
        return true;
      }

      return false;
    };

  // ==========================================================
  // TO RECEIVE
  // ==========================================================

  const isToReceive =
    (order) => {
      const status =
        normalizeStatus(
          order?.status
        );

      const paymentStatus =
        normalizeStatus(
          order?.paymentStatus ||
            order?.payment_status
        );

      return (
        status === "paid" ||
        paymentStatus ===
          "paid" ||
        status ===
          "processing" ||
        status ===
          "in production" ||
        status ===
          "delivered" ||
        status ===
          "completed"
      );
    };

  // ==========================================================
  // CANCELLED
  // ==========================================================

  const isCancelled =
    (order) => {
      const status =
        normalizeStatus(
          order?.status
        );

      return (
        status ===
          "cancelled" ||
        status ===
          "canceled" ||
        status ===
          "rejected"
      );
    };

  // ==========================================================
  // FILTER COUNTS
  // ==========================================================

  const toPayCount =
    useMemo(() => {
      return orders.filter(
        isPaymentPending
      ).length;
    }, [orders]);

  const toReceiveCount =
    useMemo(() => {
      return orders.filter(
        isToReceive
      ).length;
    }, [orders]);

  const cancelledCount =
    useMemo(() => {
      return orders.filter(
        isCancelled
      ).length;
    }, [orders]);

  // ==========================================================
  // FILTERED ORDERS
  // ==========================================================

  const filteredOrders =
    useMemo(() => {
      if (
        activeFilter ===
        "all"
      ) {
        return orders;
      }

      if (
        activeFilter ===
        "toPay"
      ) {
        return orders.filter(
          isPaymentPending
        );
      }

      if (
        activeFilter ===
        "toReceive"
      ) {
        return orders.filter(
          isToReceive
        );
      }

      if (
        activeFilter ===
        "cancelled"
      ) {
        return orders.filter(
          isCancelled
        );
      }

      return orders;
    }, [
      orders,
      activeFilter,
    ]);

  // ==========================================================
  // IMAGE HELPER
  // ==========================================================

  const getImageUrl =
    (image) => {
      if (!image) {
        return null;
      }

      if (
        typeof image ===
        "object"
      ) {
        image =
          image.url ||
          image.uri ||
          image.src ||
          image.path ||
          null;
      }

      if (!image) {
        return null;
      }

      image = String(
        image
      ).trim();

      if (
        image.startsWith(
          "http://"
        ) ||
        image.startsWith(
          "https://"
        )
      ) {
        return image;
      }

      if (
        image.startsWith("/")
      ) {
        return `${API_BASE_URL}${image}`;
      }

      return image;
    };

  // ==========================================================
  // PRODUCT IMAGE
  // ==========================================================

  const getProductImage =
    (orderItem) => {
      const product =
        orderItem?.product;

      const productImages =
        product?.images;

      if (
        Array.isArray(
          productImages
        ) &&
        productImages.length >
          0
      ) {
        return getImageUrl(
          productImages[0]
        );
      }

      if (
        typeof productImages ===
          "string" &&
        productImages
      ) {
        return getImageUrl(
          productImages
        );
      }

      const generatedImage =
        orderItem
          ?.customizations
          ?.design
          ?.generatedImageUrl;

      if (generatedImage) {
        return getImageUrl(
          generatedImage
        );
      }

      return null;
    };

  // ==========================================================
  // CANCEL ORDER
  // ==========================================================

  const handleCancelOrder =
    (order) => {
      Alert.alert(
        "Cancel Order",
        `Are you sure you want to cancel Order #${order.id}?`,
        [
          {
            text: "No",
            style: "cancel",
          },
          {
            text: "View Order",
            onPress: () => {
              navigation.navigate(
                "OrderDetail",
                {
                  orderId:
                    order.id,
                }
              );
            },
          },
        ]
      );
    };

  // ==========================================================
  // PAY NOW
  // ==========================================================

  const handlePayNow =
    async (order) => {
      try {
        if (!order?.id) {
          Alert.alert(
            "Payment Error",
            "Invalid order."
          );
          return;
        }

        const paymentStatus =
          normalizeStatus(
            order?.paymentStatus ||
              order?.payment_status
          );

        const status =
          normalizeStatus(
            order?.status
          );

        if (
          paymentStatus ===
            "paid" ||
          status === "paid"
        ) {
          Alert.alert(
            "Already Paid",
            "This order has already been paid."
          );
          return;
        }

        if (
          !isProofApproved(order)
        ) {
          Alert.alert(
            "Payment Unavailable",
            "Please wait for admin to approve your design before paying."
          );
          return;
        }

        Alert.alert(
          "Proceed to Payment",
          `Pay ₱${Number(
            order.total || 0
          ).toLocaleString()} for Order #${order.id}?`,
          [
            {
              text: "Cancel",
              style: "cancel",
            },
            {
              text: "Pay Now",
              onPress:
                async () => {
                  try {
                    const response =
                      await fetch(
                        `${API_BASE_URL}/api/payments/checkout`,
                        {
                          method:
                            "POST",
                          headers: {
                            "Content-Type":
                              "application/json",
                          },
                          body:
                            JSON.stringify(
                              {
                                orderId:
                                  order.id,
                              }
                            ),
                        }
                      );

                    let data = {};

                    try {
                      data =
                        await response.json();
                    } catch (
                      jsonError
                    ) {
                      console.error(
                        "[OrdersScreen] Payment response JSON error:",
                        jsonError
                      );
                    }

                    console.log(
                      "[OrdersScreen] Payment response:",
                      data
                    );

                    if (
                      !response.ok
                    ) {
                      throw new Error(
                        data?.message ||
                          "Failed to create payment checkout."
                      );
                    }

                    const checkoutUrl =
                      data?.checkout_url;

                    if (
                      !checkoutUrl
                    ) {
                      throw new Error(
                        "PayMongo did not return a checkout URL."
                      );
                    }

                    await Linking.openURL(
                      checkoutUrl
                    );
                  } catch (
                    err
                  ) {
                    console.error(
                      "[OrdersScreen] PayNow:",
                      err
                    );

                    Alert.alert(
                      "Payment Error",
                      err?.message ||
                        "Unable to open the payment page. Please try again."
                    );
                  }
                },
            },
          ]
        );
      } catch (err) {
        console.error(
          "[OrdersScreen] HandlePayNow:",
          err
        );

        Alert.alert(
          "Payment Error",
          err?.message ||
            "Unable to start payment."
        );
      }
    };

  // ==========================================================
  // CAN CANCEL
  // ==========================================================

  const canCancel =
    (order) => {
      const status =
        normalizeStatus(
          order?.status
        );

      return (
        status ===
          "pending" ||
        status ===
          "payment pending" ||
        status ===
          "placed"
      );
    };

  // ==========================================================
  // PROGRESS TRACKER
  // ==========================================================

  const renderProgress =
    (order) => {
      const currentStep =
        getStepIndex(order);

      const cancelled =
        currentStep === -1;

      const steps =
        isSmall
          ? smallOrderSteps
          : orderSteps;

      return (
        <View
          style={[
            styles.progressContainer,
            {
              paddingHorizontal:
                scale(
                  6,
                  10,
                  16,
                  22
                ),
            },
          ]}
        >
          {steps.map(
            (
              step,
              index
            ) => {
              const completed =
                !cancelled &&
                index <=
                  currentStep;

              const active =
                !cancelled &&
                index ===
                  currentStep;

              return (
                <View
                  key={`${step}-${index}`}
                  style={
                    styles.progressStep
                  }
                >
                  <View
                    style={
                      styles.progressLineWrapper
                    }
                  >
                    {index > 0 && (
                      <View
                        style={[
                          styles.progressLine,
                          {
                            backgroundColor:
                              !cancelled &&
                              index <=
                                currentStep
                                ? COLORS.primary
                                : COLORS.borderDark,
                          },
                        ]}
                      />
                    )}

                    <View
                      style={[
                        styles.progressDot,
                        {
                          width:
                            scale(
                              9,
                              11,
                              13,
                              15
                            ),
                          height:
                            scale(
                              9,
                              11,
                              13,
                              15
                            ),
                          borderRadius:
                            scale(
                              4.5,
                              5.5,
                              6.5,
                              7.5
                            ),
                          backgroundColor:
                            completed
                              ? COLORS.primary
                              : COLORS.surfaceDarkAlt,
                          borderColor:
                            completed
                              ? COLORS.primary
                              : COLORS.borderDark,
                        },
                        active &&
                          styles.progressDotActive,
                      ]}
                    />
                  </View>

                  <Text
                    style={[
                      styles.progressLabel,
                      {
                        fontSize:
                          scale(
                            6.5,
                            7.5,
                            8.5,
                            10
                          ),
                        lineHeight:
                          scale(
                            9,
                            10,
                            11,
                            13
                          ),
                        color:
                          completed
                            ? COLORS.primary
                            : COLORS.textMuted,
                      },
                    ]}
                    numberOfLines={
                      isSmall
                        ? 2
                        : 1
                    }
                  >
                    {step}
                  </Text>
                </View>
              );
            }
          )}
        </View>
      );
    };

  // ==========================================================
  // ORDER CARD
  // ==========================================================

  const renderOrderItem =
    ({ item }) => {
      let itemSummary =
        "No items";

      const productImages =
        [];

      if (
        item.items &&
        item.items.length > 0
      ) {
        const parts =
          item.items.map(
            (orderItem) => {
              const name =
                orderItem
                  ?.product
                  ?.name ||
                `Product #${orderItem?.productId}`;

              const image =
                getProductImage(
                  orderItem
                );

              if (
                image &&
                productImages.length <
                  4
              ) {
                productImages.push(
                  image
                );
              }

              return `${name} (x${
                orderItem?.quantity ||
                0
              })`;
            }
          );

        itemSummary =
          parts.join(", ");
      }

      const displayStatus =
        getDisplayStatus(item);

      const statusColor =
        getStatusColor(
          displayStatus
        );

      const paymentPending =
        isPaymentPending(item);

      const orderDate =
        item.createdAt
          ? new Date(
              item.createdAt
            ).toLocaleDateString(
              "en-US",
              {
                year: "numeric",
                month: "long",
                day: "numeric",
              }
            )
          : "Recent";

      return (
        <View
          style={[
            styles.orderCard,
            {
              width:
                contentWidth,
              borderRadius:
                scale(
                  14,
                  16,
                  18,
                  20
                ),
            },
          ]}
        >
          {/* ==================================================
              ORDER HEADER
          ================================================== */}

          <View
            style={[
              styles.orderHeader,
              {
                padding:
                  scale(
                    12,
                    15,
                    18,
                    21
                  ),
              },
            ]}
          >
            <View
              style={
                styles.orderHeaderLeft
              }
            >
              <Text
                style={[
                  styles.orderId,
                  {
                    fontSize:
                      scale(
                        14,
                        16,
                        18,
                        20
                      ),
                  },
                ]}
                numberOfLines={1}
              >
                Order #{item.id}
              </Text>

              <Text
                style={
                  styles.dateText
                }
                numberOfLines={1}
              >
                {orderDate}
              </Text>
            </View>

            <View
              style={[
                styles.statusBadge,
                {
                  backgroundColor:
                    statusColor +
                    "20",
                  borderColor:
                    statusColor +
                    "55",
                  paddingHorizontal:
                    scale(
                      7,
                      9,
                      11,
                      13
                    ),
                  paddingVertical:
                    scale(
                      5,
                      6,
                      7,
                      8
                    ),
                  maxWidth:
                    scale(
                      "46%",
                      "45%",
                      "44%",
                      "42%"
                    ),
                },
              ]}
            >
              <Text
                style={[
                  styles.statusText,
                  {
                    fontSize:
                      scale(
                        7,
                        8,
                        9,
                        10
                      ),
                  },
                ]}
                numberOfLines={1}
              >
                {displayStatus.toUpperCase()}
              </Text>
            </View>
          </View>

          {/* ==================================================
              PROGRESS
          ================================================== */}

          {renderProgress(item)}

          {/* ==================================================
              ITEMS
          ================================================== */}

          <Text
            style={[
              styles.sectionLabel,
              {
                paddingHorizontal:
                  scale(
                    12,
                    15,
                    18,
                    21
                  ),
              },
            ]}
          >
            ITEMS
          </Text>

          <View
            style={[
              styles.itemsBox,
              {
                marginHorizontal:
                  scale(
                    12,
                    15,
                    18,
                    21
                  ),
                padding:
                  scale(
                    8,
                    10,
                    12,
                    14
                  ),
                borderRadius:
                  scale(
                    11,
                    12,
                    14,
                    15
                  ),
              },
            ]}
          >
            <View
              style={
                styles.thumbnailRow
              }
            >
              {productImages.length >
              0 ? (
                productImages.map(
                  (
                    src,
                    index
                  ) => (
                    <Image
                      key={`${item.id}-${index}`}
                      source={{
                        uri: src,
                      }}
                      style={[
                        styles.thumbnailImg,
                        {
                          width:
                            scale(
                              43,
                              49,
                              56,
                              64
                            ),
                          height:
                            scale(
                              43,
                              49,
                              56,
                              64
                            ),
                          borderRadius:
                            scale(
                              6,
                              7,
                              8,
                              9
                            ),
                        },
                      ]}
                      resizeMode="contain"
                    />
                  )
                )
              ) : (
                <View
                  style={[
                    styles.imagePlaceholder,
                    {
                      width:
                        scale(
                          43,
                          49,
                          56,
                          64
                        ),
                      height:
                        scale(
                          43,
                          49,
                          56,
                          64
                        ),
                    },
                  ]}
                >
                  <Ionicons
                    name="image-outline"
                    size={scale(
                      18,
                      20,
                      22,
                      24
                    )}
                    color={
                      COLORS.textMuted
                    }
                  />
                </View>
              )}

              {item.items &&
                item.items.length >
                  4 && (
                  <View
                    style={[
                      styles.thumbnailMore,
                      {
                        width:
                          scale(
                            43,
                            49,
                            56,
                            64
                          ),
                        height:
                          scale(
                            43,
                            49,
                            56,
                            64
                          ),
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.thumbnailMoreText,
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
                      +
                      {item.items.length -
                        4}
                    </Text>
                  </View>
                )}
            </View>

            <Text
              style={[
                styles.itemsSummaryText,
                {
                  fontSize:
                    scale(
                      11,
                      12,
                      13,
                      14
                    ),
                  lineHeight:
                    scale(
                      17,
                      18,
                      19,
                      21
                    ),
                },
              ]}
              numberOfLines={
                isSmall
                  ? 4
                  : 3
              }
            >
              {itemSummary}
            </Text>

            <Text
              style={[
                styles.amountText,
                {
                  fontSize:
                    scale(
                      14,
                      15,
                      17,
                      18
                    ),
                },
              ]}
            >
              ₱
              {Number(
                item.total || 0
              ).toLocaleString()}
            </Text>
          </View>

          {/* ==================================================
              SHIPPING ADDRESS
          ================================================== */}

          {item.shippingAddress && (
            <View
              style={[
                styles.shippingSection,
                {
                  paddingHorizontal:
                    scale(
                      12,
                      15,
                      18,
                      21
                    ),
                },
              ]}
            >
              <Text
                style={
                  styles.sectionLabel
                }
              >
                SHIPPING ADDRESS
              </Text>

              <Text
                style={[
                  styles.shippingText,
                  {
                    fontSize:
                      scale(
                        10,
                        11,
                        12,
                        13
                      ),
                    lineHeight:
                      scale(
                        16,
                        17,
                        19,
                        20
                      ),
                  },
                ]}
              >
                {typeof item.shippingAddress ===
                "string"
                  ? item.shippingAddress
                  : item
                      .shippingAddress
                      ?.address ||
                    item
                      .shippingAddress
                      ?.fullAddress ||
                    "Shipping address available"}
              </Text>
            </View>
          )}

          {/* ==================================================
              TOTAL + ACTIONS
          ================================================== */}

          <View
            style={[
              styles.bottomRow,
              {
                paddingHorizontal:
                  scale(
                    12,
                    15,
                    18,
                    21
                  ),
                paddingVertical:
                  scale(
                    11,
                    13,
                    14,
                    16
                  ),
              },
            ]}
          >
            <View
              style={
                styles.totalContainer
              }
            >
              <Text
                style={[
                  styles.totalLabel,
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
              >
                Total
              </Text>

              <Text
                style={[
                  styles.totalAmount,
                  {
                    fontSize:
                      scale(
                        15,
                        17,
                        19,
                        21
                      ),
                  },
                ]}
              >
                ₱
                {Number(
                  item.total || 0
                ).toLocaleString()}
              </Text>
            </View>

            <View
              style={[
                styles.actionButtons,
                isSmall &&
                  styles.actionButtonsSmall,
                {
                  maxWidth:
                    isSmall
                      ? "54%"
                      : "62%",
                },
              ]}
            >
              {canCancel(
                item
              ) && (
                <TouchableOpacity
                  style={[
                    styles.cancelButton,
                    {
                      paddingHorizontal:
                        scale(
                          8,
                          10,
                          12,
                          14
                        ),
                      paddingVertical:
                        scale(
                          7,
                          8,
                          9,
                          10
                        ),
                    },
                  ]}
                  onPress={() =>
                    handleCancelOrder(
                      item
                    )
                  }
                  activeOpacity={
                    0.8
                  }
                >
                  <Text
                    style={[
                      styles.cancelButtonText,
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
                    numberOfLines={1}
                  >
                    Cancel Order
                  </Text>
                </TouchableOpacity>
              )}

              {paymentPending && (
                <TouchableOpacity
                  style={[
                    styles.payButton,
                    {
                      paddingHorizontal:
                        scale(
                          10,
                          12,
                          14,
                          16
                        ),
                      paddingVertical:
                        scale(
                          8,
                          9,
                          10,
                          11
                        ),
                    },
                  ]}
                  onPress={() =>
                    handlePayNow(
                      item
                    )
                  }
                  activeOpacity={
                    0.8
                  }
                >
                  <Text
                    style={[
                      styles.payButtonText,
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
                  >
                    Pay Now
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* ==================================================
              VIEW DETAILS
          ================================================== */}

          <TouchableOpacity
            style={[
              styles.viewDetailsButton,
              {
                minHeight:
                  scale(
                    47,
                    50,
                    52,
                    55
                  ),
              },
            ]}
            onPress={() =>
              navigation.navigate(
                "OrderDetail",
                {
                  orderId:
                    item.id,
                }
              )
            }
            activeOpacity={
              0.8
            }
          >
            <Text
              style={[
                styles.viewDetailsText,
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
              View Order Details
            </Text>

            <Ionicons
              name="chevron-forward"
              size={scale(
                15,
                16,
                17,
                18
              )}
              color={
                COLORS.primary
              }
            />
          </TouchableOpacity>
        </View>
      );
    };

  // ==========================================================
  // FILTER BUTTON
  // ==========================================================

  const FilterButton =
    ({
      label,
      value,
      count,
    }) => {
      const active =
        activeFilter ===
        value;

      return (
        <TouchableOpacity
          style={[
            styles.filterButton,
            {
              minWidth:
                scale(
                  92,
                  112,
                  130,
                  145
                ),
              height:
                scale(
                  43,
                  46,
                  48,
                  51
                ),
              paddingHorizontal:
                scale(
                  10,
                  13,
                  16,
                  18
                ),
            },
            active &&
              styles.filterButtonActive,
          ]}
          onPress={() =>
            setActiveFilter(
              value
            )
          }
          activeOpacity={
            0.8
          }
        >
          <Text
            style={[
              styles.filterText,
              {
                fontSize:
                  scale(
                    10,
                    11,
                    12,
                    13
                  ),
              },
              active &&
                styles.filterTextActive,
            ]}
          >
            {label}
          </Text>

          <View
            style={[
              styles.filterCount,
              {
                minWidth:
                  scale(
                    20,
                    22,
                    23,
                    25
                  ),
                height:
                  scale(
                    20,
                    22,
                    23,
                    25
                  ),
                borderRadius:
                  scale(
                    10,
                    11,
                    12,
                    13
                  ),
              },
              active &&
                styles.filterCountActive,
            ]}
          >
            <Text
              style={[
                styles.filterCountText,
                {
                  fontSize:
                    scale(
                      8,
                      9,
                      10,
                      10
                    ),
                },
                active &&
                  styles.filterCountTextActive,
              ]}
            >
              {count}
            </Text>
          </View>
        </TouchableOpacity>
      );
    };

  // ==========================================================
  // LOADING SCREEN
  // ==========================================================

  if (!fontsLoaded) {
    return (
      <View
        style={
          styles.loadingScreen
        }
      >
        <View
          style={[
            styles.loadingLogo,
            {
              width:
                scale(
                  54,
                  58,
                  62,
                  68
                ),
              height:
                scale(
                  54,
                  58,
                  62,
                  68
                ),
              borderRadius:
                scale(
                  16,
                  17,
                  18,
                  20
                ),
            },
          ]}
        >
          <Ionicons
            name="print"
            size={scale(
              23,
              25,
              28,
              30
            )}
            color={
              COLORS.textDark
            }
          />
        </View>

        <ActivityIndicator
          size={
            isSmall
              ? "small"
              : "large"
          }
          color={
            COLORS.primary
          }
        />

        <Text
          style={[
            styles.loadingText,
            {
              fontSize:
                scale(
                  10,
                  11,
                  12,
                  13
                ),
            },
          ]}
        >
          Loading orders...
        </Text>
      </View>
    );
  }

// ==========================================================
// MAIN
// ==========================================================

return (
  <SafeAreaView
    style={styles.safeArea}
    edges={["top", "bottom"]}
  >
    <View style={styles.container}>

      {/* ========================================================
          TOP HEADER
      ======================================================== */}

      <View
        style={[
          styles.screenHeader,
          {
            minHeight: scale(64, 68, 72, 78),
            paddingHorizontal: scale(14, 18, 22, 30),
          },
        ]}
      >
        <TouchableOpacity
          style={[
            styles.backButton,
            {
              width: scale(40, 44, 48, 52),
              height: scale(40, 44, 48, 52),
            },
          ]}
          onPress={() => navigation.goBack()}
          activeOpacity={0.75}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Ionicons
            name="arrow-back"
            size={scale(24, 26, 28, 30)}
            color={COLORS.textPrimary}
          />
        </TouchableOpacity>

        <Text
          style={[
            styles.screenHeaderTitle,
            {
              fontSize: scale(18, 21, 24, 28),
              lineHeight: scale(23, 27, 30, 35),
            },
          ]}
          numberOfLines={1}
        >
          Order History & Status
        </Text>

        {/* Invisible spacer keeps title perfectly centered */}
        <View
          style={{
            width: scale(40, 44, 48, 52),
            height: 1,
          }}
        />
      </View>

      {/* ========================================================
          ORDERS LIST
      ======================================================== */}

      <FlatList
        data={filteredOrders}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderOrderItem}
        showsVerticalScrollIndicator={false}

        contentContainerStyle={[
          styles.listContent,
          {
            paddingHorizontal: Math.max(
              scale(10, 14, 20, 32),
              (width - contentWidth) / 2
            ),
            paddingBottom: scale(
              24,
              28,
              32,
              40
            ),
          },
        ]}

        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.primary}
            colors={[COLORS.primary]}
            progressBackgroundColor={
              COLORS.surfaceDark
            }
          />
        }


        ListHeaderComponent={
          <View
            style={[
              styles.headerWrapper,
              {
                width: contentWidth,
                paddingTop: scale(
                  14,
                  18,
                  22,
                  26
                ),
              },
            ]}
          >
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={[
                styles.filtersContainer,
                {
                  paddingBottom: scale(
                    12,
                    15,
                    18,
                    21
                  ),
                },
              ]}
            >
              <FilterButton
                label="All"
                value="all"
                count={orders.length}
              />

              <FilterButton
                label="To Pay"
                value="toPay"
                count={toPayCount}
              />

              <FilterButton
                label="To Receive"
                value="toReceive"
                count={toReceiveCount}
              />

              <FilterButton
                label="Cancelled"
                value="cancelled"
                count={cancelledCount}
              />
            </ScrollView>
          </View>
        }
        ListEmptyComponent={
          !loading ? (
            <View
              style={[
                styles.emptyContainer,
                {
                  width: contentWidth,
                  paddingTop: scale(
                    50,
                    60,
                    70,
                    85
                  ),
                  paddingHorizontal: scale(
                    18,
                    22,
                    25,
                    35
                  ),
                },
              ]}
            >
              <View
                style={[
                  styles.emptyIconCircle,
                  {
                    width: scale(
                      68,
                      75,
                      82,
                      90
                    ),
                    height: scale(
                      68,
                      75,
                      82,
                      90
                    ),
                    borderRadius: scale(
                      34,
                      37.5,
                      41,
                      45
                    ),
                    marginBottom: scale(
                      13,
                      15,
                      16,
                      18
                    ),
                  },
                ]}
              >
                <Ionicons
                  name="receipt-outline"
                  size={scale(
                    34,
                    38,
                    42,
                    46
                  )}
                  color={COLORS.primary}
                />
              </View>

              <Text
                style={[
                  styles.emptyTitle,
                  {
                    fontSize: scale(
                      15,
                      16,
                      17,
                      19
                    ),
                  },
                ]}
              >
                {activeFilter === "toPay"
                  ? "No orders to pay"
                  : activeFilter === "toReceive"
                  ? "No orders to receive"
                  : activeFilter === "cancelled"
                  ? "No cancelled orders"
                  : "No orders yet"}
              </Text>

              <Text
                style={[
                  styles.emptyText,
                  {
                    fontSize: scale(
                      10,
                      11,
                      12,
                      13
                    ),
                    lineHeight: scale(
                      16,
                      18,
                      19,
                      21
                    ),
                    maxWidth: scale(
                      270,
                      300,
                      340,
                      440
                    ),
                  },
                ]}
              >
                {activeFilter === "all"
                  ? "Your order history will appear here."
                  : activeFilter === "cancelled"
                  ? "Cancelled orders will appear here."
                  : "There are no orders in this category."}
              </Text>
            </View>
          ) : null
        }
        ListFooterComponent={
          loading ? (
            <View
              style={[
                styles.loadingContainer,
                {
                  paddingVertical: scale(
                    25,
                    28,
                    32,
                    38
                  ),
                  width: contentWidth,
                },
              ]}
            >
              <ActivityIndicator
                size={
                  isSmall
                    ? "small"
                    : "large"
                }
                color={COLORS.primary}
              />

              <Text
                style={[
                  styles.loadingListText,
                  {
                    fontSize: scale(
                      9,
                      10,
                      11,
                      12
                    ),
                  },
                ]}
              >
                Loading orders...
              </Text>
            </View>
          ) : (
            <View
              style={{
                height: scale(
                  15,
                  20,
                  25,
                  30
                ),
              }}
            />
          )
        }
      />
    </View>
  </SafeAreaView>
);
}

// ============================================================
// STYLES
// ============================================================

// ============================================================
// STYLES
// ============================================================

const styles =
  StyleSheet.create({
    // ========================================================
    // SCREEN
    // ========================================================
    safeArea: {
      flex: 1,
      backgroundColor: COLORS.background,
    },
    
    screenHeader: {
      width: "100%",
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      backgroundColor: COLORS.background,
      borderBottomWidth: 1,
      borderBottomColor: COLORS.border,
    },
    
    backButton: {
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 999,
    },
    
    screenHeaderTitle: {
      flex: 1,
      fontFamily: "Poppins_700Bold",
      color: COLORS.textPrimary,
      textAlign: "center",
      letterSpacing: -0.4,
      includeFontPadding: false,
      marginHorizontal: 8,
    },
    container: {
      flex: 1,
      backgroundColor:
        COLORS.background,
    },

    headerWrapper: {
      alignSelf: "center",
    },

    listContent: {
      paddingTop: 0,
    },


    // ========================================================
    // FILTERS
    // ========================================================

    filtersContainer: {
      flexDirection: "row",
      gap: 8,
    },

    filterButton: {
      flexDirection:
        "row",

      alignItems:
        "center",

      justifyContent:
        "center",

      borderWidth: 1,

      borderColor:
        COLORS.border,

      backgroundColor:
        COLORS.surfaceDark,

      borderRadius: 999,

      marginRight: 1,
    },

    filterButtonActive: {
      backgroundColor:
        COLORS.primary,

      borderColor:
        COLORS.primary,
    },

    filterText: {
      fontFamily:
        "Poppins_600SemiBold",

      color:
        COLORS.textSecondary,

      includeFontPadding:
        false,
    },

    filterTextActive: {
      color:
        COLORS.textDark,
    },

    filterCount: {
      marginLeft: 7,

      backgroundColor:
        COLORS.surfaceDarkAlt,

      alignItems:
        "center",

      justifyContent:
        "center",
    },

    filterCountActive: {
      backgroundColor:
        "rgba(2,15,9,0.15)",
    },

    filterCountText: {
      fontFamily:
        "Poppins_700Bold",

      color:
        COLORS.textMuted,

      includeFontPadding:
        false,
    },

    filterCountTextActive: {
      color:
        COLORS.textDark,
    },

    // ========================================================
    // ORDER CARD
    // ========================================================

    orderCard: {
      alignSelf: "center",

      backgroundColor:
        COLORS.surfaceDark,

      borderWidth: 1,

      borderColor:
        COLORS.border,

      marginBottom: 14,

      overflow: "hidden",

      shadowColor:
        "#000000",

      shadowOffset: {
        width: 0,
        height: 7,
      },

      shadowOpacity: 0.24,

      shadowRadius: 15,

      elevation: 5,
    },

    // ========================================================
    // ORDER HEADER
    // ========================================================

    orderHeader: {
      flexDirection:
        "row",

      justifyContent:
        "space-between",

      alignItems:
        "flex-start",
    },

    orderHeaderLeft: {
      flex: 1,

      paddingRight: 8,

      minWidth: 0,
    },

    orderId: {
      fontFamily:
        "Poppins_700Bold",

      color:
        COLORS.textPrimary,

      includeFontPadding:
        false,
    },

    dateText: {
      fontFamily:
        "Poppins_400Regular",

      fontSize: 10,

      color:
        COLORS.textMuted,

      marginTop: 3,

      includeFontPadding:
        false,
    },

    statusBadge: {
      borderRadius: 999,

      borderWidth: 1,

      alignItems:
        "center",

      justifyContent:
        "center",

      flexShrink: 1,
    },

    statusText: {
      fontFamily:
        "Poppins_700Bold",

      letterSpacing: 0.4,

      textAlign:
        "center",

      includeFontPadding:
        false,
    },

    // ========================================================
    // PROGRESS
    // ========================================================

    progressContainer: {
      flexDirection:
        "row",

      paddingTop: 6,

      paddingBottom: 14,
    },

    progressStep: {
      flex: 1,

      alignItems:
        "center",

      minWidth: 0,
    },

    progressLineWrapper: {
      width: "100%",

      height: 20,

      alignItems:
        "center",

      justifyContent:
        "center",

      position:
        "relative",
    },

    progressLine: {
      position: "absolute",

      height: 2,

      width: "100%",

      left: "-50%",

      top: 9,

      borderRadius: 2,
    },

    progressDot: {
      zIndex: 2,

      borderWidth: 1,
    },

    progressDotActive: {
      shadowColor:
        COLORS.primary,

      shadowOffset: {
        width: 0,
        height: 0,
      },

      shadowOpacity: 0.7,

      shadowRadius: 7,

      elevation: 5,
    },

    progressLabel: {
      fontFamily:
        "Poppins_500Medium",

      textAlign:
        "center",

      marginTop: 4,

      width: "100%",

      includeFontPadding:
        false,
    },

    // ========================================================
    // SECTION LABEL
    // ========================================================

    sectionLabel: {
      fontFamily:
        "Poppins_600SemiBold",

      fontSize: 9,

      color:
        COLORS.textMuted,

      letterSpacing: 1,

      marginBottom: 7,

      includeFontPadding:
        false,
    },

    // ========================================================
    // ITEMS
    // ========================================================

    itemsBox: {
      backgroundColor:
        COLORS.cardDark,

      borderWidth: 1,

      borderColor:
        COLORS.border,

      marginBottom: 14,
    },

    thumbnailRow: {
      flexDirection:
        "row",

      alignItems:
        "center",

      gap: 7,

      flexWrap: "nowrap",
    },

    thumbnailImg: {
      backgroundColor:
        COLORS.white,

      borderWidth: 1,

      borderColor:
        COLORS.borderDark,
    },

    imagePlaceholder: {
      borderRadius: 8,

      backgroundColor:
        COLORS.surfaceDarkAlt,

      borderWidth: 1,

      borderColor:
        COLORS.border,

      alignItems:
        "center",

      justifyContent:
        "center",
    },

    thumbnailMore: {
      borderRadius: 8,

      backgroundColor:
        COLORS.surfaceDarkAlt,

      borderWidth: 1,

      borderColor:
        COLORS.border,

      alignItems:
        "center",

      justifyContent:
        "center",
    },

    thumbnailMoreText: {
      fontFamily:
        "Poppins_700Bold",

      color:
        COLORS.primary,

      includeFontPadding:
        false,
    },

    itemsSummaryText: {
      fontFamily:
        "Poppins_400Regular",

      color:
        COLORS.textSecondary,

      marginTop: 9,

      includeFontPadding:
        false,
    },

    amountText: {
      fontFamily:
        "Poppins_700Bold",

      color:
        COLORS.primary,

      marginTop: 6,

      textAlign:
        "right",

      includeFontPadding:
        false,
    },

    // ========================================================
    // SHIPPING
    // ========================================================

    shippingSection: {
      borderTopWidth: 1,

      borderTopColor:
        COLORS.border,

      paddingTop: 12,

      paddingBottom: 12,
    },

    shippingText: {
      fontFamily:
        "Poppins_400Regular",

      color:
        COLORS.textSecondary,

      includeFontPadding:
        false,
    },

    // ========================================================
    // TOTAL
    // ========================================================

    bottomRow: {
      borderTopWidth: 1,

      borderTopColor:
        COLORS.border,

      flexDirection:
        "row",

      justifyContent:
        "space-between",

      alignItems:
        "center",
    },

    totalContainer: {
      flex: 1,

      minWidth: 0,
    },

    totalLabel: {
      fontFamily:
        "Poppins_500Medium",

      color:
        COLORS.textMuted,

      includeFontPadding:
        false,
    },

    totalAmount: {
      fontFamily:
        "Poppins_700Bold",

      color:
        COLORS.primary,

      marginTop: 1,

      includeFontPadding:
        false,
    },

    actionButtons: {
      flexDirection:
        "row",

      alignItems:
        "center",

      justifyContent:
        "flex-end",

      gap: 6,

      flexShrink: 1,
    },

    actionButtonsSmall: {
      flexDirection:
        "column",

      alignItems:
        "stretch",

      justifyContent:
        "center",

      gap: 5,
    },

    cancelButton: {
      borderWidth: 1,

      borderColor:
        COLORS.danger,

      borderRadius: 9,

      alignItems:
        "center",

      justifyContent:
        "center",

      flexShrink: 1,
    },

    cancelButtonText: {
      fontFamily:
        "Poppins_600SemiBold",

      color:
        COLORS.danger,

      includeFontPadding:
        false,
    },

    payButton: {
      backgroundColor:
        COLORS.primary,

      borderRadius: 9,

      alignItems:
        "center",

      justifyContent:
        "center",

      flexShrink: 1,
    },

    payButtonText: {
      fontFamily:
        "Poppins_700Bold",

      color:
        COLORS.textDark,

      includeFontPadding:
        false,
    },

    // ========================================================
    // VIEW DETAILS
    // ========================================================

    viewDetailsButton: {
      borderTopWidth: 1,

      borderTopColor:
        COLORS.border,

      paddingHorizontal: 14,

      flexDirection:
        "row",

      justifyContent:
        "center",

      alignItems:
        "center",

      gap: 5,
    },

    viewDetailsText: {
      fontFamily:
        "Poppins_600SemiBold",

      color:
        COLORS.primary,

      includeFontPadding:
        false,
    },

    // ========================================================
    // EMPTY
    // ========================================================

    emptyContainer: {
      alignSelf: "center",

      alignItems:
        "center",

      justifyContent:
        "center",
    },

    emptyIconCircle: {
      backgroundColor:
        COLORS.surfaceDark,

      borderWidth: 1,

      borderColor:
        COLORS.borderStrong,

      alignItems:
        "center",

      justifyContent:
        "center",
    },

    emptyTitle: {
      fontFamily:
        "Poppins_700Bold",

      color:
        COLORS.textPrimary,

      textAlign:
        "center",

      includeFontPadding:
        false,
    },

    emptyText: {
      fontFamily:
        "Poppins_400Regular",

      color:
        COLORS.textMuted,

      marginTop: 7,

      textAlign:
        "center",

      includeFontPadding:
        false,
    },

    // ========================================================
    // LOADING
    // ========================================================

    loadingScreen: {
      flex: 1,

      alignItems:
        "center",

      justifyContent:
        "center",

      backgroundColor:
        COLORS.background,
    },

    loadingLogo: {
      alignItems:
        "center",

      justifyContent:
        "center",

      backgroundColor:
        COLORS.primary,

      marginBottom: 16,
    },

    loadingText: {
      fontFamily:
        "Poppins_500Medium",

      color:
        COLORS.textMuted,

      marginTop: 9,

      includeFontPadding:
        false,
    },

    loadingContainer: {
      alignSelf: "center",

      alignItems:
        "center",

      justifyContent:
        "center",
    },

    loadingListText: {
      fontFamily:
        "Poppins_400Regular",

      color:
        COLORS.textMuted,

      marginTop: 8,

      includeFontPadding:
        false,
    },

    // ========================================================
    // CUSTOM BOTTOM NAVIGATION
    // ========================================================

    bottomNavigation: {
      position:
        "absolute",

      left: 0,

      right: 0,

      bottom: 0,

      backgroundColor:
        "rgba(1,8,6,0.98)",

      borderTopWidth: 1,

      borderTopColor:
        COLORS.border,

      flexDirection:
        "row",

      alignItems:
        "center",

      justifyContent:
        "space-around",

      paddingHorizontal: 4,

      paddingBottom: 3,

      zIndex: 100,

      elevation: 20,
    },

    bottomNavItem: {
      flex: 1,

      height: "100%",

      alignItems:
        "center",

      justifyContent:
        "center",

      paddingTop: 4,

      minWidth: 0,
    },

    bottomNavItemActive: {
      // Active item
    },

    activeNavIcon: {
      backgroundColor:
        COLORS.primary,

      alignItems:
        "center",

      justifyContent:
        "center",

      marginBottom: 1,
    },

    bottomNavText: {
      fontFamily:
        "Poppins_500Medium",

      color:
        COLORS.textMuted,

      marginTop: 2,

      includeFontPadding:
        false,
    },

    bottomNavTextActive: {
      fontFamily:
        "Poppins_700Bold",

      color:
        COLORS.primary,

      marginTop: 2,

      includeFontPadding:
        false,
    },
  });