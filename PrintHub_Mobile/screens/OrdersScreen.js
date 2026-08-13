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
} from "react-native";

import { Ionicons } from "@expo/vector-icons";
import { API_BASE_URL } from "../config";
import { COLORS } from "../theme";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "@react-navigation/native";

export default function OrdersScreen({ navigation }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [activeFilter, setActiveFilter] = useState("all");

  const fetchOrders = async () => {
    try {
      const userStr = await AsyncStorage.getItem("user");

      if (!userStr) {
        setOrders([]);
        return;
      }

      const user = JSON.parse(userStr);

      const res = await fetch(
        `${API_BASE_URL}/api/user/${user.id}/orders`
      );

if (res.ok) {
  const data = await res.json();

  setOrders(
    Array.isArray(data)
      ? [...data].sort((a, b) => {
          const dateA = new Date(a?.createdAt || 0).getTime();

          const dateB = new Date(b?.createdAt || 0).getTime();

          return dateB - dateA;
        })
      : [],
  );
} else {
  console.error("[OrdersScreen] Failed to fetch orders:", res.status);
}
    } catch (err) {
      console.error(
        "[OrdersScreen] {FetchOrders}: " +
          err.message
      );
    }
  };

  useFocusEffect(
    useCallback(() => {
      setLoading(true);

      fetchOrders().finally(() =>
        setLoading(false)
      );
    }, [])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);

    fetchOrders().finally(() =>
      setRefreshing(false)
    );
  }, []);

  // =========================================================
  // STATUS HELPERS
  // =========================================================

  const normalizeStatus = (status) => {
    return String(status || "")
      .trim()
      .toLowerCase()
      .replace(/_/g, " ");
  };

  const getStatusColor = (status) => {
    const normalized = normalizeStatus(status);

    switch (normalized) {
      case "completed":
        return COLORS.success;

      case "delivered":
        return COLORS.success;

      case "paid":
        return COLORS.accentCyan;

      case "processing":
      case "in production":
        return COLORS.accentCyan;

      case "approved":
        return COLORS.accentCyan;

      case "cancelled":
      case "canceled":
      case "rejected":
        return COLORS.danger;

      case "pending":
      case "payment pending":
      default:
        return COLORS.warning;
    }
  };

  const getDisplayStatus = (order) => {
    const status = normalizeStatus(order?.status);

    const paymentStatus = normalizeStatus(
      order?.paymentStatus ||
        order?.payment_status
    );

    if (
      paymentStatus === "pending" &&
      status !== "cancelled" &&
      status !== "canceled" &&
      status !== "completed"
    ) {
      return "Payment Pending";
    }

    if (!status) {
      return "Pending";
    }

    if (status === "in production") {
      return "Processing";
    }

    return order.status || "Pending";
  };

  // =========================================================
  // ORDER PROGRESS
  // =========================================================

  const orderSteps = [
    "Placed",
    "Approved",
    "Paid",
    "Processing",
    "Delivered",
    "Completed",
  ];

  const getStepIndex = (order) => {
    const status = normalizeStatus(order?.status);

    const paymentStatus = normalizeStatus(
      order?.paymentStatus ||
        order?.payment_status
    );

    if (
      status === "cancelled" ||
      status === "canceled" ||
      status === "rejected"
    ) {
      return -1;
    }

    if (status === "completed") {
      return 5;
    }

    if (status === "delivered") {
      return 4;
    }

    if (
      status === "processing" ||
      status === "in production"
    ) {
      return 3;
    }

    if (
      status === "paid" ||
      paymentStatus === "paid"
    ) {
      return 2;
    }

    if (status === "approved") {
      return 1;
    }

    return 0;
  };

  // =========================================================
  // FILTER HELPERS
  // =========================================================

  const isPaymentPending = (order) => {
    const status = normalizeStatus(order?.status);

    const paymentStatus = normalizeStatus(
      order?.paymentStatus ||
        order?.payment_status
    );

    return (
      paymentStatus === "pending" ||
      status === "payment pending"
    );
  };

  const isToReceive = (order) => {
    const status = normalizeStatus(order?.status);

    return (
      status === "paid" ||
      status === "processing" ||
      status === "in production" ||
      status === "approved"
    );
  };

  const isCancelled = (order) => {
    const status = normalizeStatus(order?.status);

    return (
      status === "cancelled" ||
      status === "canceled"
    );
  };

  // =========================================================
  // FILTER COUNTS
  // =========================================================

  const toPayCount = useMemo(() => {
    return orders.filter(isPaymentPending).length;
  }, [orders]);

  const toReceiveCount = useMemo(() => {
    return orders.filter(isToReceive).length;
  }, [orders]);

  const cancelledCount = useMemo(() => {
    return orders.filter(isCancelled).length;
  }, [orders]);

  // =========================================================
  // FILTERED ORDERS
  // =========================================================

  const filteredOrders = useMemo(() => {
    if (activeFilter === "all") {
      return orders;
    }

    if (activeFilter === "toPay") {
      return orders.filter(isPaymentPending);
    }

    if (activeFilter === "toReceive") {
      return orders.filter(isToReceive);
    }

    if (activeFilter === "cancelled") {
      return orders.filter(isCancelled);
    }

    return orders;
  }, [orders, activeFilter]);

  // =========================================================
  // IMAGE HELPER
  // =========================================================

  const getImageUrl = (image) => {
    if (!image) {
      return null;
    }

    if (typeof image === "object") {
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

    if (
      image.startsWith("http://") ||
      image.startsWith("https://")
    ) {
      return image;
    }

    if (image.startsWith("/")) {
      return `${API_BASE_URL}${image}`;
    }

    return image;
  };

  const getProductImage = (orderItem) => {
    const product = orderItem?.product;

    const productImages = product?.images;

    if (
      Array.isArray(productImages) &&
      productImages.length > 0
    ) {
      return getImageUrl(productImages[0]);
    }

    if (
      typeof productImages === "string" &&
      productImages
    ) {
      return getImageUrl(productImages);
    }

    const generatedImage =
      orderItem?.customizations
        ?.design
        ?.generatedImageUrl;

    if (generatedImage) {
      return getImageUrl(generatedImage);
    }

    return null;
  };

  // =========================================================
  // CANCEL
  // =========================================================

  const handleCancelOrder = (order) => {
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
            navigation.navigate("OrderDetail", {
              orderId: order.id,
            });
          },
        },
      ]
    );
  };

  // =========================================================
  // PAY NOW
  // =========================================================

  const handlePayNow = (order) => {
    navigation.navigate("Payment", {
      orderId: order.id,
    });
  };

  // =========================================================
  // CAN CANCEL
  // =========================================================

  const canCancel = (order) => {
    const status = normalizeStatus(order?.status);

    return (
      status === "pending" ||
      status === "payment pending" ||
      status === "placed"
    );
  };

  // =========================================================
  // RENDER STATUS TRACKER
  // =========================================================

  const renderProgress = (order) => {
    const currentStep = getStepIndex(order);

    const cancelled = currentStep === -1;

    return (
      <View style={styles.progressContainer}>
        {orderSteps.map((step, index) => {
          const completed =
            !cancelled &&
            index <= currentStep;

          const active =
            !cancelled &&
            index === currentStep;

          return (
            <View
              key={step}
              style={styles.progressStep}
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
                          index <= currentStep
                            ? COLORS.accentCyan
                            : COLORS.borderLight,
                      },
                    ]}
                  />
                )}

                <View
                  style={[
                    styles.progressDot,
                    {
                      backgroundColor:
                        completed
                          ? COLORS.accentCyan
                          : COLORS.borderLight,
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
                    color:
                      completed
                        ? COLORS.accentCyan
                        : COLORS.textMuted,
                    fontWeight:
                      active ? "800" : "500",
                  },
                ]}
                numberOfLines={1}
              >
                {step}
              </Text>
            </View>
          );
        })}
      </View>
    );
  };

  // =========================================================
  // RENDER ORDER
  // =========================================================

  const renderOrderItem = ({ item }) => {
    let itemSummary = "No items";

    const productImages = [];

    if (
      item.items &&
      item.items.length > 0
    ) {
      const parts = item.items.map(
        (orderItem) => {
          const name =
            orderItem?.product?.name ||
            `Product #${orderItem?.productId}`;

          const image =
            getProductImage(orderItem);

          if (
            image &&
            productImages.length < 4
          ) {
            productImages.push(image);
          }

          return `${name} (x${
            orderItem?.quantity || 0
          })`;
        }
      );

      itemSummary = parts.join(", ");
    }

    const displayStatus =
      getDisplayStatus(item);

    const statusColor =
      getStatusColor(displayStatus);

    const paymentPending =
      isPaymentPending(item);

    const orderDate = item.createdAt
      ? new Date(
          item.createdAt
        ).toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
        })
      : "Recent";

    return (
      <View style={styles.orderCard}>
        {/* ORDER HEADER */}

        <View style={styles.orderHeader}>
          <View
            style={styles.orderHeaderLeft}
          >
            <Text style={styles.orderId}>
              Order #{item.id}
            </Text>

            <Text style={styles.dateText}>
              {orderDate}
            </Text>
          </View>

          <View
            style={[
              styles.statusBadge,
              {
                backgroundColor:
                  statusColor + "20",
              },
            ]}
          >
            <Text
              style={[
                styles.statusText,
                {
                  color: statusColor,
                },
              ]}
            >
              {displayStatus.toUpperCase()}
            </Text>
          </View>
        </View>

        {/* STATUS PROGRESS */}

        {renderProgress(item)}

        {/* ITEMS */}

        <Text style={styles.sectionLabel}>
          ITEMS
        </Text>

        <View style={styles.itemsBox}>
          <View style={styles.thumbnailRow}>
            {productImages.length > 0 ? (
              productImages.map(
                (src, index) => (
                  <Image
                    key={`${item.id}-${index}`}
                    source={{
                      uri: src,
                    }}
                    style={
                      styles.thumbnailImg
                    }
                  />
                )
              )
            ) : (
              <View
                style={
                  styles.imagePlaceholder
                }
              >
                <Ionicons
                  name="image-outline"
                  size={22}
                  color={
                    COLORS.textMuted
                  }
                />
              </View>
            )}

            {item.items &&
              item.items.length > 4 && (
                <View
                  style={
                    styles.thumbnailMore
                  }
                >
                  <Text
                    style={
                      styles.thumbnailMoreText
                    }
                  >
                    +
                    {item.items.length - 4}
                  </Text>
                </View>
              )}
          </View>

          <Text
            style={
              styles.itemsSummaryText
            }
            numberOfLines={3}
          >
            {itemSummary}
          </Text>

          <Text style={styles.amountText}>
            ₱
            {Number(
              item.total || 0
            ).toLocaleString()}
          </Text>
        </View>

        {/* SHIPPING ADDRESS */}

        {item.shippingAddress && (
          <View
            style={
              styles.shippingSection
            }
          >
            <Text
              style={
                styles.sectionLabel
              }
            >
              SHIPPING ADDRESS
            </Text>

            <Text
              style={
                styles.shippingText
              }
            >
              {typeof item.shippingAddress ===
              "string"
                ? item.shippingAddress
                : item.shippingAddress
                    ?.address ||
                  item.shippingAddress
                    ?.fullAddress ||
                  "Shipping address available"}
            </Text>
          </View>
        )}

        {/* TOTAL + ACTIONS */}

        <View style={styles.bottomRow}>
          <View>
            <Text style={styles.totalLabel}>
              Total:
            </Text>

            <Text
              style={styles.totalAmount}
            >
              ₱
              {Number(
                item.total || 0
              ).toLocaleString()}
            </Text>
          </View>

          <View
            style={styles.actionButtons}
          >
            {canCancel(item) && (
              <TouchableOpacity
                style={
                  styles.cancelButton
                }
                onPress={() =>
                  handleCancelOrder(item)
                }
              >
                <Text
                  style={
                    styles.cancelButtonText
                  }
                >
                  Cancel Order
                </Text>
              </TouchableOpacity>
            )}

            {paymentPending && (
              <TouchableOpacity
                style={styles.payButton}
                onPress={() =>
                  handlePayNow(item)
                }
              >
                <Text
                  style={
                    styles.payButtonText
                  }
                >
                  Pay Now
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* VIEW DETAILS */}

        <TouchableOpacity
          style={
            styles.viewDetailsButton
          }
          onPress={() =>
            navigation.navigate(
              "OrderDetail",
              {
                orderId: item.id,
              }
            )
          }
        >
          <Text
            style={
              styles.viewDetailsText
            }
          >
            View Order Details
          </Text>

          <Ionicons
            name="chevron-forward"
            size={18}
            color={COLORS.accentCyan}
          />
        </TouchableOpacity>
      </View>
    );
  };

  // =========================================================
  // FILTER BUTTON
  // =========================================================

  const FilterButton = ({
    label,
    value,
    count,
  }) => {
    const active =
      activeFilter === value;

    return (
      <TouchableOpacity
        style={[
          styles.filterButton,
          active &&
            styles.filterButtonActive,
        ]}
        onPress={() =>
          setActiveFilter(value)
        }
      >
        <Text
          style={[
            styles.filterText,
            active &&
              styles.filterTextActive,
          ]}
        >
          {label}
        </Text>

        <View
          style={[
            styles.filterCount,
            active &&
              styles.filterCountActive,
          ]}
        >
          <Text
            style={[
              styles.filterCountText,
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

  // =========================================================
  // MAIN
  // =========================================================

  return (
    <View style={styles.container}>
      <FlatList
        data={filteredOrders}
        keyExtractor={(item) =>
          String(item.id)
        }
        renderItem={renderOrderItem}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={
          styles.listContent
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={
              COLORS.accentCyan
            }
          />
        }
        ListHeaderComponent={
          <>
            {/* PAGE HEADER */}

            <View style={styles.pageHeader}>
              <Text
                style={styles.pageTitle}
              >
                Order History & Status
              </Text>

              <Text
                style={
                  styles.pageSubtitle
                }
              >
                Track and manage your
                custom printing orders.
              </Text>
            </View>

            {/* FILTERS */}

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={
                false
              }
              contentContainerStyle={
                styles.filtersContainer
              }
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
                count={
                  toReceiveCount
                }
              />

              <FilterButton
                label="Cancelled"
                value="cancelled"
                count={
                  cancelledCount
                }
              />
            </ScrollView>
          </>
        }
        ListEmptyComponent={
          !loading ? (
            <View
              style={
                styles.emptyContainer
              }
            >
              <Ionicons
                name="receipt-outline"
                size={52}
                color={
                  COLORS.textMuted
                }
              />

              <Text
                style={
                  styles.emptyTitle
                }
              >
                {activeFilter ===
                "toPay"
                  ? "No orders to pay"
                  : activeFilter ===
                    "toReceive"
                  ? "No orders to receive"
                  : activeFilter ===
                    "cancelled"
                  ? "No cancelled orders"
                  : "No orders yet"}
              </Text>

              <Text
                style={
                  styles.emptyText
                }
              >
                {activeFilter ===
                "all"
                  ? "Your order history will appear here."
                  : activeFilter ===
                    "cancelled"
                  ? "Cancelled orders will appear here."
                  : "There are no orders in this category."}
              </Text>
            </View>
          ) : null
        }
        ListFooterComponent={
          loading ? (
            <View
              style={
                styles.loadingContainer
              }
            >
              <ActivityIndicator
                size="large"
                color={
                  COLORS.accentCyan
                }
              />
            </View>
          ) : (
            <View
              style={{
                height: 24,
              }}
            />
          )
        }
      />
    </View>
  );
}

// ===========================================================
// STYLES
// ===========================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.lightBg,
  },

  listContent: {
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 30,
  },

  // HEADER

  pageHeader: {
    marginBottom: 18,
  },

  pageTitle: {
    fontSize: 25,
    fontWeight: "900",
    color: COLORS.textPrimary,
    marginBottom: 5,
  },

  pageSubtitle: {
    fontSize: 13,
    lineHeight: 19,
    color: COLORS.textMuted,
  },

  // FILTERS

  filtersContainer: {
    paddingBottom: 18,
    gap: 8,
  },

  filterButton: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    backgroundColor: COLORS.cardBg,
    borderRadius: 22,
    paddingHorizontal: 15,
    paddingVertical: 9,
    marginRight: 4,
  },

  filterButtonActive: {
    backgroundColor: COLORS.primaryDark,
    borderColor: COLORS.primaryDark,
  },

  filterText: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.textPrimary,
  },

  filterTextActive: {
    color: COLORS.textLight,
  },

  filterCount: {
    marginLeft: 7,
    minWidth: 21,
    height: 21,
    borderRadius: 11,
    backgroundColor: COLORS.lightBg,
    alignItems: "center",
    justifyContent: "center",
  },

  filterCountActive: {
    backgroundColor:
      "rgba(255,255,255,0.18)",
  },

  filterCountText: {
    fontSize: 11,
    fontWeight: "800",
    color: COLORS.textMuted,
  },

  filterCountTextActive: {
    color: COLORS.textLight,
  },

  // ORDER CARD

  orderCard: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    marginBottom: 16,
    overflow: "hidden",
  },

  orderHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    padding: 16,
    paddingBottom: 12,
  },

  orderHeaderLeft: {
    flex: 1,
    paddingRight: 10,
  },

  orderId: {
    fontSize: 17,
    fontWeight: "900",
    color: COLORS.textPrimary,
  },

  dateText: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 4,
  },

  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
  },

  statusText: {
    fontSize: 10,
    fontWeight: "900",
  },

  // PROGRESS

  progressContainer: {
    flexDirection: "row",
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 16,
  },

  progressStep: {
    flex: 1,
    alignItems: "center",
  },

  progressLineWrapper: {
    width: "100%",
    height: 20,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },

  progressLine: {
    position: "absolute",
    height: 2,
    width: "100%",
    left: "-50%",
    top: 9,
  },

  progressDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    zIndex: 2,
  },

  progressDotActive: {
    width: 14,
    height: 14,
    borderRadius: 7,
  },

  progressLabel: {
    fontSize: 7,
    textAlign: "center",
    marginTop: 3,
  },

  // ITEMS

  sectionLabel: {
    fontSize: 11,
    fontWeight: "800",
    color: COLORS.textMuted,
    letterSpacing: 0.3,
    paddingHorizontal: 16,
    marginBottom: 8,
  },

  itemsBox: {
    marginHorizontal: 16,
    backgroundColor: COLORS.lightBg,
    borderRadius: 10,
    padding: 10,
    marginBottom: 14,
  },

  thumbnailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  thumbnailImg: {
    width: 52,
    height: 52,
    borderRadius: 7,
    backgroundColor: COLORS.borderLight,
  },

  imagePlaceholder: {
    width: 52,
    height: 52,
    borderRadius: 7,
    backgroundColor: COLORS.borderLight,
    alignItems: "center",
    justifyContent: "center",
  },

  thumbnailMore: {
    width: 52,
    height: 52,
    borderRadius: 7,
    backgroundColor: COLORS.borderLight,
    alignItems: "center",
    justifyContent: "center",
  },

  thumbnailMoreText: {
    fontSize: 13,
    fontWeight: "800",
    color: COLORS.textMuted,
  },

  itemsSummaryText: {
    fontSize: 13,
    lineHeight: 18,
    color: COLORS.textPrimary,
    marginTop: 9,
    fontStyle: "italic",
  },

  amountText: {
    fontSize: 16,
    fontWeight: "900",
    color: COLORS.textPrimary,
    marginTop: 8,
    textAlign: "right",
  },

  // SHIPPING

  shippingSection: {
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
    paddingTop: 14,
    paddingHorizontal: 16,
    paddingBottom: 14,
  },

  shippingText: {
    fontSize: 12,
    lineHeight: 18,
    color: COLORS.textPrimary,
  },

  // BOTTOM

  bottomRow: {
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  totalLabel: {
    fontSize: 11,
    color: COLORS.textMuted,
  },

  totalAmount: {
    fontSize: 18,
    fontWeight: "900",
    color: COLORS.textPrimary,
    marginTop: 1,
  },

  actionButtons: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  cancelButton: {
    borderWidth: 1,
    borderColor: COLORS.danger,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },

  cancelButtonText: {
    color: COLORS.danger,
    fontSize: 11,
    fontWeight: "800",
  },

  payButton: {
    backgroundColor: COLORS.accentCyan,
    borderRadius: 8,
    paddingHorizontal: 13,
    paddingVertical: 9,
  },

  payButtonText: {
    color: COLORS.textLight,
    fontSize: 11,
    fontWeight: "800",
  },

  viewDetailsButton: {
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
    paddingHorizontal: 16,
    paddingVertical: 13,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 5,
  },

  viewDetailsText: {
    color: COLORS.accentCyan,
    fontSize: 13,
    fontWeight: "800",
  },

  // EMPTY

  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 60,
    paddingHorizontal: 20,
  },

  emptyTitle: {
    color: COLORS.textPrimary,
    fontSize: 17,
    fontWeight: "800",
    marginTop: 14,
  },

  emptyText: {
    color: COLORS.textMuted,
    fontSize: 13,
    marginTop: 6,
    textAlign: "center",
  },

  loadingContainer: {
    paddingVertical: 30,
    alignItems: "center",
  },
});