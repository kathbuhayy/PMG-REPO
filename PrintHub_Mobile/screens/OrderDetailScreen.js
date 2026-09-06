import React, {
  useState,
  useEffect,
} from "react";

import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Alert,
  TouchableOpacity,
  Linking,
  Image,
  RefreshControl,
  useWindowDimensions,
} from "react-native";

import { COLORS } from "../theme";
import { API_BASE_URL } from "../config";
import * as ExpoLinking from "expo-linking";

import { useFonts } from "expo-font";

import {
  Poppins_400Regular,
  Poppins_500Medium,
  Poppins_600SemiBold,
  Poppins_700Bold,
} from "@expo-google-fonts/poppins";

import { Ionicons } from "@expo/vector-icons";

// ============================================================
// ORDER DETAIL SCREEN
// ============================================================

export default function OrderDetailScreen({
  route,
  navigation,
}) {
  const { width } =
    useWindowDimensions();

  const { orderId } =
    route.params || {};

  // ==========================================================
  // RESPONSIVE
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
    if (isSmall) return small;

    if (isMedium) return medium;

    if (isLarge) return large;

    return xlarge;
  };

  const horizontalPadding =
    scale(
      14,
      17,
      22,
      30
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

  const [order, setOrder] =
    useState(null);

  const [loading, setLoading] =
    useState(true);

  const [processing, setProcessing] =
    useState(false);

  const [refreshing, setRefreshing] =
    useState(false);

  // ==========================================================
  // FETCH ORDER ON LOAD
  // ==========================================================

  useEffect(() => {
    if (!orderId) {
      Alert.alert(
        "Error",
        "Invalid Order ID"
      );

      navigation.goBack();

      return;
    }

    fetchOrderDetails();
  }, [orderId]);

  // ==========================================================
  // REFRESH
  // ==========================================================

  const onRefresh =
    async () => {
      setRefreshing(true);

      await fetchOrderDetails();

      setRefreshing(false);
    };

  // ==========================================================
  // FETCH ORDER DETAILS
  // ==========================================================

  const fetchOrderDetails =
    async () => {
      try {
        setLoading(true);

        const res =
          await fetch(
            `${API_BASE_URL}/api/payments/${orderId}/status`
          );

        const data =
          await res.json();

        if (
          res.ok &&
          data.order
        ) {
          setOrder(
            data.order
          );
        } else {
          Alert.alert(
            "Error",
            data.message ||
              "Failed to fetch order details."
          );

          navigation.goBack();
        }
      } catch (err) {
        console.error(
          "[OrderDetailScreen] {FetchDetails}:",
          err?.message || err
        );

        Alert.alert(
          "Error",
          "Network request failed."
        );

        navigation.goBack();
      } finally {
        setLoading(false);
      }
    };

  // ==========================================================
  // STATUS COLOR
  // ==========================================================

  const getStatusColor =
    (status) => {
      switch (
        status
          ?.toLowerCase()
          ?.trim()
      ) {
        case "completed":
        case "delivered":
          return COLORS.success;

        case "in production":
        case "processing":
        case "approved":
        case "paid":
          return COLORS.primary;

        case "cancelled":
        case "canceled":
        case "rejected":
          return COLORS.danger;

        case "pending":
        default:
          return COLORS.warning;
      }
    };

  // ==========================================================
  // STATUS LABEL
  // ==========================================================

  const getStatusLabel =
    (status) => {
      if (!status) {
        return "Pending";
      }

      const normalized =
        status
          .toString()
          .replace(
            /_/g,
            " "
          )
          .trim();

      return normalized
        .replace(
          /\b\w/g,
          (char) =>
            char.toUpperCase()
        );
    };

  // ==========================================================
  // IMAGE URL
  // ==========================================================

  const resolveImageUrl =
    (image) => {
      if (!image) {
        return null;
      }

      let value = image;

      if (
        typeof value ===
        "object"
      ) {
        value =
          value.url ||
          value.uri ||
          value.src ||
          value.path ||
          null;
      }

      if (!value) {
        return null;
      }

      value =
        String(value).trim();

      if (!value) {
        return null;
      }

      if (
        value.startsWith(
          "http://"
        ) ||
        value.startsWith(
          "https://"
        )
      ) {
        return value;
      }

      return `${API_BASE_URL}${
        value.startsWith("/")
          ? ""
          : "/"
      }${value}`;
    };

  // ==========================================================
  // PRODUCT IMAGES
  // ==========================================================

  const getProductImages =
    (product) => {
      const rawImages =
        product?.images;

      if (
        Array.isArray(
          rawImages
        )
      ) {
        return rawImages
          .filter(
            (image) =>
              image
          )
          .map(
            resolveImageUrl
          )
          .filter(Boolean);
      }

      if (
        typeof rawImages ===
        "string"
      ) {
        const trimmed =
          rawImages.trim();

        if (!trimmed) {
          return [];
        }

        try {
          const parsed =
            JSON.parse(
              trimmed
            );

          if (
            Array.isArray(
              parsed
            )
          ) {
            return parsed
              .map(
                resolveImageUrl
              )
              .filter(Boolean);
          }

          if (
            typeof parsed ===
            "string"
          ) {
            const image =
              resolveImageUrl(
                parsed
              );

            return image
              ? [image]
              : [];
          }
        } catch {
          const image =
            resolveImageUrl(
              trimmed
            );

          return image
            ? [image]
            : [];
        }
      }

      return [];
    };

  // ==========================================================
  // DESIGN IMAGES
  // ==========================================================

  const getDesignImages =
    (design) => {
      if (!design) {
        return [];
      }

      const zoneImages =
        Object.values(
          design.zones || {}
        )
          .filter(
            (zone) =>
              zone?.imageUrl
          )
          .map(
            (zone) =>
              resolveImageUrl(
                zone.imageUrl
              )
          )
          .filter(Boolean);

      if (
        zoneImages.length > 0
      ) {
        return zoneImages;
      }

      if (
        design.generatedImageUrl
      ) {
        const image =
          resolveImageUrl(
            design.generatedImageUrl
          );

        return image
          ? [image]
          : [];
      }

      return [];
    };

  // ==========================================================
  // CANCEL ORDER
  // ==========================================================

  const handleCancelOrder =
    async () => {
      Alert.alert(
        "Cancel Order",
        "Are you sure you want to cancel this order?",
        [
          {
            text: "No",
            style: "cancel",
          },

          {
            text: "Yes, Cancel",
            style: "destructive",

            onPress:
              async () => {
                try {
                  setProcessing(
                    true
                  );

                  const res =
                    await fetch(
                      `${API_BASE_URL}/api/orders/${orderId}`,
                      {
                        method:
                          "PUT",

                        headers: {
                          "Content-Type":
                            "application/json",
                        },

                        body: JSON.stringify(
                          {
                            status:
                              "cancelled",
                          }
                        ),
                      }
                    );

                  if (!res.ok) {
                    throw new Error(
                      "Failed to cancel order"
                    );
                  }

                  Alert.alert(
                    "Success",
                    "Your order has been cancelled."
                  );

                  fetchOrderDetails();
                } catch (err) {
                  Alert.alert(
                    "Error",
                    err?.message ||
                      "Failed to cancel order."
                  );
                } finally {
                  setProcessing(
                    false
                  );
                }
              },
          },
        ]
      );
    };

  // ==========================================================
  // ORDER RECEIVED
  // ==========================================================

  const handleOrderReceived =
    async () => {
      Alert.alert(
        "Order Received",
        "Confirm that you have received your order?",
        [
          {
            text: "No",
            style: "cancel",
          },

          {
            text: "Yes, Confirm",

            onPress:
              async () => {
                try {
                  setProcessing(
                    true
                  );

                  const res =
                    await fetch(
                      `${API_BASE_URL}/api/orders/${orderId}`,
                      {
                        method:
                          "PUT",

                        headers: {
                          "Content-Type":
                            "application/json",
                        },

                        body: JSON.stringify(
                          {
                            status:
                              "completed",
                          }
                        ),
                      }
                    );

                  if (!res.ok) {
                    throw new Error(
                      "Failed to update order"
                    );
                  }

                  Alert.alert(
                    "Success",
                    "Your order has been marked as completed."
                  );

                  fetchOrderDetails();
                } catch (err) {
                  Alert.alert(
                    "Error",
                    err?.message ||
                      "Failed to update order."
                  );
                } finally {
                  setProcessing(
                    false
                  );
                }
              },
          },
        ]
      );
    };

  // ==========================================================
  // PAY NOW
  // ==========================================================

  const handlePayNow =
    async () => {
      try {
        setProcessing(
          true
        );

        const res =
          await fetch(
            `${API_BASE_URL}/api/payments/checkout`,
            {
              method:
                "POST",

              headers: {
                "Content-Type":
                  "application/json",
              },

              body: JSON.stringify(
                {
                  orderId:
                    order.id,

                  returnBase:
                    ExpoLinking.createURL(
                      ""
                    ),

                  compactCheckout:
                    false,
                }
              ),
            }
          );

        const data =
          await res.json();

        if (
          !res.ok ||
          !data.checkout_url
        ) {
          throw new Error(
            data.message ||
              "Failed to initiate payment session"
          );
        }

        await Linking.openURL(
          data.checkout_url
        );
      } catch (err) {
        Alert.alert(
          "Payment Error",
          err?.message ||
            "Unable to open payment page."
        );
      } finally {
        setProcessing(
          false
        );
      }
    };

  // ==========================================================
  // LOADING
  // ==========================================================

  if (
    !fontsLoaded ||
    loading
  ) {
    return (
      <View
        style={
          styles.loadingContainer
        }
      >
        <View
          style={
            styles.loadingLogo
          }
        >
          <Ionicons
            name="receipt-outline"
            size={30}
            color={
              COLORS.textDark
            }
          />
        </View>

        <ActivityIndicator
          size="large"
          color={
            COLORS.primary
          }
        />

        <Text
          style={
            styles.loadingText
          }
        >
          Loading order...
        </Text>
      </View>
    );
  }

  // ==========================================================
  // NO ORDER
  // ==========================================================

  if (!order) {
    return (
      <View
        style={
          styles.loadingContainer
        }
      >
        <Ionicons
          name="alert-circle-outline"
          size={50}
          color={
            COLORS.primary
          }
        />

        <Text
          style={
            styles.errorText
          }
        >
          Order not found.
        </Text>
      </View>
    );
  }

  // ==========================================================
  // NORMALIZED VALUES
  // ==========================================================

  const status =
    String(
      order.status ||
        "pending"
    )
      .trim()
      .toLowerCase();

  const paymentStatus =
    String(
      order.payment_status ||
        "awaiting payment"
    )
      .trim()
      .toLowerCase();

  const statusColor =
    getStatusColor(
      order.status
    );

  const isCancelled =
    status ===
      "cancelled" ||
    status ===
      "canceled";

  const isPaid =
    paymentStatus ===
      "paid";

  const isCompleted =
    status ===
    "completed";

  const canPay =
    !isPaid &&
    !isCancelled &&
    !isCompleted &&
    order.proofApproved;

  const canCancel =
    !isCancelled &&
    !isCompleted &&
    !isPaid;

  const canReceive =
    isPaid &&
    ![
      "completed",
      "cancelled",
      "canceled",
      "return_requested",
    ].includes(status);

  // ==========================================================
  // DATE
  // ==========================================================

  const formattedDate =
    order.createdAt
      ? new Date(
          order.createdAt
        ).toLocaleDateString(
          "en-US",
          {
            year: "numeric",
            month: "long",
            day: "numeric",
          }
        )
      : "N/A";

  // ==========================================================
  // MAIN UI
  // ==========================================================

  return (
    <View
      style={
        styles.screen
      }
    >
      <ScrollView
        style={
          styles.container
        }
        contentContainerStyle={{
          paddingHorizontal:
            horizontalPadding,

          paddingTop:
            scale(
              12,
              16,
              20,
              28
            ),

          paddingBottom:
            scale(
              30,
              35,
              40,
              50
            ),
        }}
        showsVerticalScrollIndicator={
          false
        }
        refreshControl={
          <RefreshControl
            refreshing={
              refreshing
            }
            onRefresh={
              onRefresh
            }
            tintColor={
              COLORS.primary
            }
            colors={[
              COLORS.primary,
            ]}
            progressBackgroundColor={
              COLORS.surfaceDark
            }
          />
        }
      >
        {/* ====================================================
            ORDER SUMMARY
        ==================================================== */}

        <View
          style={
            styles.card
          }
        >
          <View
            style={
              styles.cardHeader
            }
          >
            <View
              style={
                styles.cardHeaderText
              }
            >
              <Text
                style={[
                  styles.sectionTitle,
                  {
                    fontSize:
                      scale(
                        17,
                        18,
                        20,
                        22
                      ),
                  },
                ]}
              >
                Order #{order.id}
              </Text>

              <Text
                style={
                  styles.cardSubtitle
                }
              >
                Placed on{" "}
                {formattedDate}
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
                },
              ]}
            >
              <View
                style={[
                  styles.statusDot,
                  {
                    backgroundColor:
                      statusColor,
                  },
                ]}
              />

              <Text
                style={[
                  styles.statusText,
                  {
                    color:
                      statusColor,
                  },
                ]}
              >
                {getStatusLabel(
                  order.status
                )}
              </Text>
            </View>
          </View>

          <View
            style={
              styles.infoDivider
            }
          />

          <View
            style={
              styles.infoRow
            }
          >
            <View
              style={
                styles.infoIcon
              }
            >
              <Ionicons
                name="calendar-outline"
                size={18}
                color={
                  COLORS.primary
                }
              />
            </View>

            <View
              style={
                styles.infoContent
              }
            >
              <Text
                style={
                  styles.infoLabel
                }
              >
                Order Date
              </Text>

              <Text
                style={
                  styles.infoValue
                }
              >
                {formattedDate}
              </Text>
            </View>
          </View>

          <View
            style={
              styles.infoRow
            }
          >
            <View
              style={
                styles.infoIcon
              }
            >
              <Ionicons
                name="card-outline"
                size={18}
                color={
                  COLORS.primary
                }
              />
            </View>

            <View
              style={
                styles.infoContent
              }
            >
              <Text
                style={
                  styles.infoLabel
                }
              >
                Payment Status
              </Text>

              <Text
                style={[
                  styles.infoValue,
                  {
                    color:
                      isPaid
                        ? COLORS.success
                        : COLORS.warning,
                  },
                ]}
              >
                {order.payment_status ||
                  "Awaiting Payment"}
              </Text>
            </View>
          </View>
        </View>

        {/* ====================================================
            SHIPPING INFORMATION
        ==================================================== */}

        <View
          style={
            styles.card
          }
        >
          <View
            style={
              styles.sectionHeader
            }
          >
            <View
              style={
                styles.sectionIcon
              }
            >
              <Ionicons
                name="location-outline"
                size={20}
                color={
                  COLORS.textDark
                }
              />
            </View>

            <Text
              style={
                styles.sectionTitle
              }
            >
              Shipping Information
            </Text>
          </View>

          <View
            style={
              styles.shippingBox
            }
          >
            <Ionicons
              name="navigate-outline"
              size={20}
              color={
                COLORS.primary
              }
            />

            <Text
              style={
                styles.shippingText
              }
            >
              {order.shipping_address ||
                "No shipping address provided."}
            </Text>
          </View>
        </View>

        {/* ====================================================
            ORDER ITEMS
        ==================================================== */}

        <View
          style={
            styles.card
          }
        >
          <View
            style={
              styles.sectionHeader
            }
          >
            <View
              style={
                styles.sectionIcon
              }
            >
              <Ionicons
                name="bag-handle-outline"
                size={20}
                color={
                  COLORS.textDark
                }
              />
            </View>

            <Text
              style={
                styles.sectionTitle
              }
            >
              Order Items
            </Text>
          </View>

          {order.items &&
          order.items.length >
            0 ? (
            order.items.map(
              (
                item,
                index
              ) => {
                const design =
                  item.customizations
                    ?.design;

                const productImages =
                  getProductImages(
                    item.product
                  );

                const designImages =
                  getDesignImages(
                    design
                  );

                const allImages = [
                  ...productImages,
                  ...designImages,
                ];

                const productName =
                  item.product
                    ?.name ||
                  `Product #${item.productId}`;

                const quantity =
                  Number(
                    item.quantity
                  ) || 1;

                const unitPrice =
                  Number(
                    item.unit_price
                  ) || 0;

                const totalPrice =
                  Number(
                    item.total_price
                  ) || 0;

                return (
                  <View
                    key={
                      `${item.id || index}`
                    }
                    style={[
                      styles.itemCard,
                      index >
                        0 &&
                        styles.itemCardSpacing,
                    ]}
                  >
                    {/* PRODUCT IMAGES */}

                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={
                        false
                      }
                      contentContainerStyle={
                        styles.itemImages
                      }
                    >
                      {allImages.length >
                      0 ? (
                        allImages
                          .slice(
                            0,
                            5
                          )
                          .map(
                            (
                              src,
                              imageIndex
                            ) => (
                              <Image
                                key={`${index}-${imageIndex}`}
                                source={{
                                  uri: src,
                                }}
                                style={[
                                  styles.itemThumb,
                                  {
                                    width:
                                      scale(
                                        58,
                                        64,
                                        72,
                                        82
                                      ),

                                    height:
                                      scale(
                                        58,
                                        64,
                                        72,
                                        82
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
                                  58,
                                  64,
                                  72,
                                  82
                                ),

                              height:
                                scale(
                                  58,
                                  64,
                                  72,
                                  82
                                ),
                            },
                          ]}
                        >
                          <Ionicons
                            name="image-outline"
                            size={
                              scale(
                                22,
                                24,
                                26,
                                28
                              )
                            }
                            color={
                              COLORS.textMuted
                            }
                          />
                        </View>
                      )}
                    </ScrollView>

                    {/* PRODUCT INFORMATION */}

                    <View
                      style={
                        styles.itemInfo
                      }
                    >
                      <Text
                        style={[
                          styles.itemName,
                          {
                            fontSize:
                              scale(
                                14,
                                15,
                                16,
                                17
                              ),
                          },
                        ]}
                      >
                        {productName}
                      </Text>

                      {design?.prompt && (
                        <View
                          style={
                            styles.designPromptBox
                          }
                        >
                          <Ionicons
                            name="sparkles-outline"
                            size={14}
                            color={
                              COLORS.primary
                            }
                          />

                          <Text
                            style={
                              styles.itemPrompt
                            }
                            numberOfLines={
                              3
                            }
                          >
                            {design.prompt}
                          </Text>
                        </View>
                      )}

                      <View
                        style={
                          styles.quantityPriceRow
                        }
                      >
                        <View>
                          <Text
                            style={
                              styles.itemSubText
                            }
                          >
                            Quantity
                          </Text>

                          <Text
                            style={
                              styles.quantityValue
                            }
                          >
                            {quantity}
                          </Text>
                        </View>

                        <View
                          style={
                            styles.priceDetails
                          }
                        >
                          <Text
                            style={
                              styles.itemSubText
                            }
                          >
                            Unit Price
                          </Text>

                          <Text
                            style={
                              styles.unitPrice
                            }
                          >
                            ₱
                            {unitPrice.toLocaleString()}
                          </Text>
                        </View>
                      </View>

                      <View
                        style={
                          styles.itemTotalRow
                        }
                      >
                        <Text
                          style={
                            styles.itemTotalLabel
                          }
                        >
                          Item Total
                        </Text>

                        <Text
                          style={
                            styles.itemPrice
                          }
                        >
                          ₱
                          {totalPrice.toLocaleString()}
                        </Text>
                      </View>
                    </View>
                  </View>
                );
              }
            )
          ) : (
            <View
              style={
                styles.noItemsBox
              }
            >
              <Ionicons
                name="cube-outline"
                size={28}
                color={
                  COLORS.textMuted
                }
              />

              <Text
                style={
                  styles.noItemsText
                }
              >
                No items found.
              </Text>
            </View>
          )}

          {/* ==================================================
              TOTAL
          ================================================== */}

          <View
            style={
              styles.divider
            }
          />

          <View
            style={
              styles.totalRow
            }
          >
            <View>
              <Text
                style={
                  styles.totalLabel
                }
              >
                Total Amount
              </Text>

              <Text
                style={
                  styles.totalSubtext
                }
              >
                Final order total
              </Text>
            </View>

            <Text
              style={[
                styles.totalAmount,
                {
                  fontSize:
                    scale(
                      21,
                      23,
                      25,
                      28
                    ),
                },
              ]}
            >
              ₱
              {Number(
                order.total || 0
              ).toLocaleString()}
            </Text>
          </View>

          {/* ==================================================
              PAYMENT / ACTIONS
          ================================================== */}

          <View
            style={
              styles.actionContainer
            }
          >
            {/* WAITING FOR APPROVAL */}

            {!isPaid &&
              !isCancelled &&
              !isCompleted &&
              !order.proofApproved && (
                <View
                  style={
                    styles.waitingBox
                  }
                >
                  <View
                    style={
                      styles.waitingIcon
                    }
                  >
                    <Ionicons
                      name="time-outline"
                      size={20}
                      color={
                        COLORS.warning
                      }
                    />
                  </View>

                  <View
                    style={
                      styles.waitingContent
                    }
                  >
                    <Text
                      style={
                        styles.waitingTitle
                      }
                    >
                      Waiting for seller approval
                    </Text>

                    <Text
                      style={
                        styles.waitingText
                      }
                    >
                      Your order is being
                      reviewed. Payment
                      will become available
                      after approval.
                    </Text>
                  </View>
                </View>
              )}

            {/* PAY NOW */}

            {canPay && (
              <TouchableOpacity
                style={
                  styles.payBtn
                }
                onPress={
                  handlePayNow
                }
                disabled={
                  processing
                }
                activeOpacity={
                  0.85
                }
              >
                {processing ? (
                  <ActivityIndicator
                    color={
                      COLORS.textDark
                    }
                  />
                ) : (
                  <>
                    <Ionicons
                      name="card-outline"
                      size={20}
                      color={
                        COLORS.textDark
                      }
                    />

                    <Text
                      style={
                        styles.payBtnText
                      }
                    >
                      Pay Now
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            )}

            {/* CANCEL */}

            {canCancel && (
              <TouchableOpacity
                style={
                  styles.cancelBtn
                }
                onPress={
                  handleCancelOrder
                }
                disabled={
                  processing
                }
                activeOpacity={
                  0.85
                }
              >
                <Ionicons
                  name="close-circle-outline"
                  size={20}
                  color={
                    COLORS.danger
                  }
                />

                <Text
                  style={
                    styles.cancelBtnText
                  }
                >
                  {processing
                    ? "Processing..."
                    : "Cancel Order"}
                </Text>
              </TouchableOpacity>
            )}

            {/* ORDER RECEIVED */}

            {canReceive && (
              <TouchableOpacity
                style={
                  styles.receiveBtn
                }
                onPress={
                  handleOrderReceived
                }
                disabled={
                  processing
                }
                activeOpacity={
                  0.85
                }
              >
                {processing ? (
                  <ActivityIndicator
                    color={
                      COLORS.textDark
                    }
                  />
                ) : (
                  <>
                    <Ionicons
                      name="checkmark-circle-outline"
                      size={20}
                      color={
                        COLORS.textDark
                      }
                    />

                    <Text
                      style={
                        styles.receiveBtnText
                      }
                    >
                      Order Received
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            )}

            {/* COMPLETED */}

            {isCompleted && (
              <View
                style={
                  styles.completedBox
                }
              >
                <Ionicons
                  name="checkmark-circle"
                  size={24}
                  color={
                    COLORS.success
                  }
                />

                <Text
                  style={
                    styles.completedText
                  }
                >
                  Order Completed
                </Text>
              </View>
            )}

            {/* CANCELLED */}

            {isCancelled && (
              <View
                style={
                  styles.cancelledBox
                }
              >
                <Ionicons
                  name="close-circle"
                  size={24}
                  color={
                    COLORS.danger
                  }
                />

                <Text
                  style={
                    styles.cancelledText
                  }
                >
                  This order has been cancelled.
                </Text>
              </View>
            )}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

// ============================================================
// STYLES
// ============================================================

const styles =
  StyleSheet.create({
    // ========================================================
    // SCREEN
    // ========================================================

    screen: {
      flex: 1,
      backgroundColor:
        COLORS.background,
    },

    container: {
      flex: 1,
      backgroundColor:
        COLORS.background,
    },

    // ========================================================
    // LOADING
    // ========================================================

    loadingContainer: {
      flex: 1,

      justifyContent:
        "center",

      alignItems:
        "center",

      backgroundColor:
        COLORS.background,

      paddingHorizontal: 30,
    },

    loadingLogo: {
      width: 64,
      height: 64,

      borderRadius: 18,

      backgroundColor:
        COLORS.primary,

      justifyContent:
        "center",

      alignItems:
        "center",

      marginBottom: 18,
    },

    loadingText: {
      marginTop: 10,

      fontFamily:
        "Poppins_500Medium",

      fontSize: 12,

      color:
        COLORS.textMuted,
    },

    errorText: {
      marginTop: 14,

      fontFamily:
        "Poppins_600SemiBold",

      color:
        COLORS.textPrimary,

      fontSize: 15,

      textAlign:
        "center",
    },

    // ========================================================
    // CARD
    // ========================================================

    card: {
      backgroundColor:
        COLORS.surfaceDark,

      borderRadius: 16,

      borderWidth: 1,

      borderColor:
        COLORS.border,

      padding: 16,

      marginBottom: 16,

      shadowColor:
        "#000000",

      shadowOffset: {
        width: 0,
        height: 8,
      },

      shadowOpacity: 0.25,

      shadowRadius: 18,

      elevation: 4,
    },

    // ========================================================
    // CARD HEADER
    // ========================================================

    cardHeader: {
      flexDirection:
        "row",

      alignItems:
        "flex-start",

      justifyContent:
        "space-between",
    },

    cardHeaderText: {
      flex: 1,

      paddingRight: 10,
    },

    sectionTitle: {
      fontFamily:
        "Poppins_700Bold",

      fontSize: 17,

      color:
        COLORS.textPrimary,

      marginBottom: 4,
    },

    cardSubtitle: {
      fontFamily:
        "Poppins_400Regular",

      fontSize: 11,

      color:
        COLORS.textMuted,
    },

    // ========================================================
    // STATUS
    // ========================================================

    statusBadge: {
      flexDirection:
        "row",

      alignItems:
        "center",

      paddingHorizontal: 10,

      paddingVertical: 7,

      borderRadius: 999,

      borderWidth: 1,

      maxWidth: "45%",
    },

    statusDot: {
      width: 7,
      height: 7,

      borderRadius: 4,

      marginRight: 6,
    },

    statusText: {
      fontFamily:
        "Poppins_700Bold",

      fontSize: 9,

      textTransform:
        "capitalize",

      textAlign:
        "center",
    },

    // ========================================================
    // DIVIDER
    // ========================================================

    infoDivider: {
      height: 1,

      backgroundColor:
        COLORS.border,

      marginVertical: 14,
    },

    divider: {
      height: 1,

      backgroundColor:
        COLORS.border,

      marginVertical: 16,
    },

    // ========================================================
    // INFO ROW
    // ========================================================

    infoRow: {
      flexDirection:
        "row",

      alignItems:
        "center",

      marginBottom: 13,
    },

    infoIcon: {
      width: 38,
      height: 38,

      borderRadius: 11,

      backgroundColor:
        "rgba(182,255,0,0.08)",

      borderWidth: 1,

      borderColor:
        COLORS.border,

      alignItems:
        "center",

      justifyContent:
        "center",

      marginRight: 11,
    },

    infoContent: {
      flex: 1,
    },

    infoLabel: {
      fontFamily:
        "Poppins_500Medium",

      fontSize: 10,

      color:
        COLORS.textMuted,

      marginBottom: 2,
    },

    infoValue: {
      fontFamily:
        "Poppins_600SemiBold",

      fontSize: 13,

      color:
        COLORS.textPrimary,
    },

    // ========================================================
    // SECTION HEADER
    // ========================================================

    sectionHeader: {
      flexDirection:
        "row",

      alignItems:
        "center",

      marginBottom: 13,
    },

    sectionIcon: {
      width: 34,
      height: 34,

      borderRadius: 10,

      backgroundColor:
        COLORS.primary,

      alignItems:
        "center",

      justifyContent:
        "center",

      marginRight: 9,
    },

    // ========================================================
    // SHIPPING
    // ========================================================

    shippingBox: {
      flexDirection:
        "row",

      alignItems:
        "flex-start",

      backgroundColor:
        COLORS.cardDark,

      borderWidth: 1,

      borderColor:
        COLORS.border,

      borderRadius: 11,

      padding: 12,
    },

    shippingText: {
      flex: 1,

      marginLeft: 10,

      fontFamily:
        "Poppins_400Regular",

      fontSize: 12,

      lineHeight: 19,

      color:
        COLORS.textSecondary,
    },

    // ========================================================
    // ITEM CARD
    // ========================================================

    itemCard: {
      backgroundColor:
        COLORS.cardDark,

      borderWidth: 1,

      borderColor:
        COLORS.border,

      borderRadius: 13,

      padding: 11,
    },

    itemCardSpacing: {
      marginTop: 10,
    },

    // ========================================================
    // ITEM IMAGES
    // ========================================================

    itemImages: {
      flexDirection:
        "row",

      gap: 7,

      paddingBottom: 3,
    },

    itemThumb: {
      backgroundColor:
        COLORS.white,

      borderRadius: 9,

      borderWidth: 1,

      borderColor:
        COLORS.borderDark,
    },

    imagePlaceholder: {
      borderRadius: 9,

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

    // ========================================================
    // ITEM INFO
    // ========================================================

    itemInfo: {
      marginTop: 10,
    },

    itemName: {
      fontFamily:
        "Poppins_700Bold",

      color:
        COLORS.textPrimary,

      marginBottom: 7,
    },

    designPromptBox: {
      flexDirection:
        "row",

      alignItems:
        "flex-start",

      backgroundColor:
        "rgba(182,255,0,0.05)",

      borderWidth: 1,

      borderColor:
        COLORS.border,

      borderRadius: 9,

      padding: 9,

      marginBottom: 10,
    },

    itemPrompt: {
      flex: 1,

      marginLeft: 7,

      fontFamily:
        "Poppins_400Regular",

      fontSize: 11,

      lineHeight: 17,

      color:
        COLORS.textSecondary,

      fontStyle:
        "italic",
    },

    quantityPriceRow: {
      flexDirection:
        "row",

      justifyContent:
        "space-between",

      alignItems:
        "center",

      paddingVertical: 8,
    },

    priceDetails: {
      alignItems:
        "flex-end",
    },

    itemSubText: {
      fontFamily:
        "Poppins_500Medium",

      fontSize: 10,

      color:
        COLORS.textMuted,
    },

    quantityValue: {
      fontFamily:
        "Poppins_700Bold",

      fontSize: 14,

      color:
        COLORS.primary,

      marginTop: 2,
    },

    unitPrice: {
      fontFamily:
        "Poppins_600SemiBold",

      fontSize: 12,

      color:
        COLORS.textPrimary,

      marginTop: 2,
    },

    itemTotalRow: {
      flexDirection:
        "row",

      alignItems:
        "center",

      justifyContent:
        "space-between",

      borderTopWidth: 1,

      borderTopColor:
        COLORS.border,

      paddingTop: 9,

      marginTop: 4,
    },

    itemTotalLabel: {
      fontFamily:
        "Poppins_500Medium",

      fontSize: 11,

      color:
        COLORS.textMuted,
    },

    itemPrice: {
      fontFamily:
        "Poppins_700Bold",

      fontSize: 14,

      color:
        COLORS.primary,
    },

    // ========================================================
    // NO ITEMS
    // ========================================================

    noItemsBox: {
      minHeight: 110,

      alignItems:
        "center",

      justifyContent:
        "center",

      backgroundColor:
        COLORS.cardDark,

      borderRadius: 11,

      borderWidth: 1,

      borderColor:
        COLORS.border,
    },

    noItemsText: {
      fontFamily:
        "Poppins_400Regular",

      fontSize: 12,

      color:
        COLORS.textMuted,

      marginTop: 7,
    },

    // ========================================================
    // TOTAL
    // ========================================================

    totalRow: {
      flexDirection:
        "row",

      alignItems:
        "center",

      justifyContent:
        "space-between",
    },

    totalLabel: {
      fontFamily:
        "Poppins_700Bold",

      fontSize: 14,

      color:
        COLORS.textPrimary,
    },

    totalSubtext: {
      fontFamily:
        "Poppins_400Regular",

      fontSize: 10,

      color:
        COLORS.textMuted,

      marginTop: 2,
    },

    totalAmount: {
      fontFamily:
        "Poppins_700Bold",

      color:
        COLORS.primary,

      textAlign:
        "right",
    },

    // ========================================================
    // ACTIONS
    // ========================================================

    actionContainer: {
      marginTop: 18,

      gap: 10,
    },

    payBtn: {
      minHeight: 52,

      borderRadius: 12,

      backgroundColor:
        COLORS.primary,

      flexDirection:
        "row",

      alignItems:
        "center",

      justifyContent:
        "center",

      paddingHorizontal: 15,

      shadowColor:
        COLORS.primary,

      shadowOffset: {
        width: 0,
        height: 6,
      },

      shadowOpacity: 0.2,

      shadowRadius: 12,

      elevation: 3,
    },

    payBtnText: {
      fontFamily:
        "Poppins_700Bold",

      fontSize: 14,

      color:
        COLORS.textDark,

      marginLeft: 7,
    },

    receiveBtn: {
      minHeight: 52,

      borderRadius: 12,

      backgroundColor:
        COLORS.success,

      flexDirection:
        "row",

      alignItems:
        "center",

      justifyContent:
        "center",

      paddingHorizontal: 15,
    },

    receiveBtnText: {
      fontFamily:
        "Poppins_700Bold",

      fontSize: 14,

      color:
        COLORS.textDark,

      marginLeft: 7,
    },

    cancelBtn: {
      minHeight: 52,

      borderRadius: 12,

      backgroundColor:
        "rgba(239,68,68,0.04)",

      borderWidth: 1.2,

      borderColor:
        COLORS.danger,

      flexDirection:
        "row",

      alignItems:
        "center",

      justifyContent:
        "center",

      paddingHorizontal: 15,
    },

    cancelBtnText: {
      fontFamily:
        "Poppins_700Bold",

      fontSize: 14,

      color:
        COLORS.danger,

      marginLeft: 7,
    },

    // ========================================================
    // WAITING
    // ========================================================

    waitingBox: {
      flexDirection:
        "row",

      alignItems:
        "flex-start",

      backgroundColor:
        "rgba(245,158,11,0.08)",

      borderWidth: 1,

      borderColor:
        "rgba(245,158,11,0.30)",

      borderRadius: 12,

      padding: 12,
    },

    waitingIcon: {
      width: 36,
      height: 36,

      borderRadius: 10,

      backgroundColor:
        "rgba(245,158,11,0.12)",

      alignItems:
        "center",

      justifyContent:
        "center",
    },

    waitingContent: {
      flex: 1,

      marginLeft: 9,
    },

    waitingTitle: {
      fontFamily:
        "Poppins_700Bold",

      fontSize: 12,

      color:
        COLORS.warning,

      marginBottom: 3,
    },

    waitingText: {
      fontFamily:
        "Poppins_400Regular",

      fontSize: 10,

      lineHeight: 16,

      color:
        COLORS.textSecondary,
    },

    // ========================================================
    // COMPLETED
    // ========================================================

    completedBox: {
      minHeight: 52,

      borderRadius: 12,

      backgroundColor:
        "rgba(34,197,94,0.10)",

      borderWidth: 1,

      borderColor:
        "rgba(34,197,94,0.30)",

      flexDirection:
        "row",

      alignItems:
        "center",

      justifyContent:
        "center",

      paddingHorizontal: 15,
    },

    completedText: {
      fontFamily:
        "Poppins_700Bold",

      fontSize: 13,

      color:
        COLORS.success,

      marginLeft: 8,
    },

    // ========================================================
    // CANCELLED
    // ========================================================

    cancelledBox: {
      minHeight: 52,

      borderRadius: 12,

      backgroundColor:
        "rgba(239,68,68,0.08)",

      borderWidth: 1,

      borderColor:
        "rgba(239,68,68,0.28)",

      flexDirection:
        "row",

      alignItems:
        "center",

      justifyContent:
        "center",

      paddingHorizontal: 15,
    },

    cancelledText: {
      fontFamily:
        "Poppins_600SemiBold",

      fontSize: 12,

      color:
        COLORS.danger,

      marginLeft: 8,

      textAlign:
        "center",
    },
  });