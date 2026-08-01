import React, { useState, useEffect } from "react";
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
} from "react-native";
import { COLORS } from "../theme";
import { API_BASE_URL } from "../config";
import * as ExpoLinking from "expo-linking";

export default function OrderDetailScreen({ route, navigation }) {
  const { orderId } = route.params || {};
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (!orderId) {
      Alert.alert("Error", "Invalid Order ID");
      navigation.goBack();
      return;
    }
    fetchOrderDetails();
  }, [orderId]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchOrderDetails();
    setRefreshing(false);
  };

  const fetchOrderDetails = async () => {
    try {
      setLoading(true);
      // Hit the status endpoint to trigger a PayMongo sync in case webhooks were missed
      const res = await fetch(`${API_BASE_URL}/api/payments/${orderId}/status`);
      const data = await res.json();

      if (res.ok && data.order) {
        setOrder(data.order);
      } else {
        Alert.alert("Error", data.message || "Failed to fetch order details.");
        navigation.goBack();
      }
    } catch (err) {
      console.error("[OrderDetailScreen] {FetchDetails}: " + err.message);
      Alert.alert("Error", "Network request failed.");
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case "completed":
      case "delivered":
        return COLORS.success;
      case "in production":
      case "processing":
        return COLORS.accentCyan;
      case "pending":
      default:
        return COLORS.warning;
    }
  };

  const handleCancelOrder = async () => {
    Alert.alert("Cancel Order", "Are you sure you want to cancel this order?", [
      { text: "No", style: "cancel" },
      {
        text: "Yes, Cancel",
        style: "destructive",
        onPress: async () => {
          try {
            setProcessing(true);
            const res = await fetch(`${API_BASE_URL}/api/orders/${orderId}`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ status: "cancelled" }),
            });
            if (!res.ok) throw new Error("Failed to cancel order");
            Alert.alert("Success", "Your order has been cancelled.");
            fetchOrderDetails();
          } catch (err) {
            Alert.alert("Error", err.message);
          } finally {
            setProcessing(false);
          }
        },
      },
    ]);
  };

  const handleOrderReceived = async () => {
    Alert.alert(
      "Order Received",
      "Confirm that you have received your order?",
      [
        { text: "No", style: "cancel" },
        {
          text: "Yes, Confirm",
          onPress: async () => {
            try {
              setProcessing(true);
              const res = await fetch(`${API_BASE_URL}/api/orders/${orderId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: "completed" }),
              });
              if (!res.ok) throw new Error("Failed to update order");
              Alert.alert(
                "Success",
                "Your order has been marked as completed.",
              );
              fetchOrderDetails();
            } catch (err) {
              Alert.alert("Error", err.message);
            } finally {
              setProcessing(false);
            }
          },
        },
      ],
    );
  };

  const handlePayNow = async () => {
    try {
      setProcessing(true);
      const res = await fetch(`${API_BASE_URL}/api/payments/checkout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: order.id,
          returnBase: ExpoLinking.createURL(""), // Redirect back to mobile app via Expo deep link
          compactCheckout: false,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.checkout_url) {
        throw new Error(data.message || "Failed to initiate payment session");
      }
      Linking.openURL(data.checkout_url);
    } catch (err) {
      Alert.alert("Payment Error", err.message);
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.accentCyan} />
      </View>
    );
  }

  if (!order) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.errorText}>Order not found.</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: 30 }}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Header Info */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Order #{order.id}</Text>
        <Text style={styles.infoText}>
          Date: {order.createdAt ? order.createdAt.slice(0, 10) : "N/A"}
        </Text>
        <Text style={styles.infoText}>
          Payment Status:{" "}
          <Text style={{ fontWeight: "700" }}>
            {order.payment_status || "Awaiting Payment"}
          </Text>
        </Text>

        <View
          style={{ flexDirection: "row", alignItems: "center", marginTop: 8 }}
        >
          <Text style={styles.infoText}>Status: </Text>
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: getStatusColor(order.status) + "20" },
            ]}
          >
            <Text
              style={[
                styles.statusText,
                { color: getStatusColor(order.status) },
              ]}
            >
              {order.status || "Pending"}
            </Text>
          </View>
        </View>
      </View>

      {/* Address Info */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Shipping Information</Text>
        <Text style={styles.infoText}>{order.shipping_address || "N/A"}</Text>
      </View>

      {/* Items List */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Order Items</Text>
        {order.items && order.items.length > 0 ? (
          order.items.map((item, index) => {
            const design = item.customizations?.design;
            const productImg = item.product?.images?.[0];
            const productName =
              item.product?.name || `Product #${item.productId}`;

            const zoneImgs = Object.values(design?.zones || {})
              .filter((z) => z?.imageUrl)
              .map((z) => z.imageUrl);
            const imgs = zoneImgs.length
              ? zoneImgs
              : design?.generatedImageUrl
                ? [design.generatedImageUrl]
                : [];

            return (
              <View key={index} style={styles.itemRow}>
                <View style={styles.itemThumbsContainer}>
                  {productImg && (
                    <Image
                      source={{ uri: productImg }}
                      style={styles.itemThumb}
                    />
                  )}
                  {imgs.map((src, i) => (
                    <Image
                      key={i}
                      source={{ uri: src }}
                      style={styles.itemThumb}
                    />
                  ))}
                </View>

                <View style={styles.itemDetails}>
                  <Text style={styles.itemName}>{productName}</Text>
                  {design?.prompt && (
                    <Text style={styles.itemPrompt}>
                      "
                      {design.prompt.length > 80
                        ? design.prompt.slice(0, 80) + "..."
                        : design.prompt}
                      "
                    </Text>
                  )}
                  <Text style={styles.itemSubText}>
                    Qty: {item.quantity || 1}
                  </Text>
                </View>
                <Text style={styles.itemPrice}>
                  ₱{Number(item.unit_price || 0).toLocaleString()} x{" "}
                  {item.quantity || 1} = ₱
                  {Number(item.total_price || 0).toLocaleString()}
                </Text>
              </View>
            );
          })
        ) : (
          <Text style={styles.infoText}>No items found.</Text>
        )}

        <View style={styles.divider} />

        <View style={styles.totalRow}>
          <Text style={styles.totalText}>Total Amount:</Text>
          <Text style={styles.totalAmount}>
            ₱{Number(order.total || 0).toLocaleString()}
          </Text>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionContainer}>
          {order.payment_status !== "paid" && order.status !== "cancelled" && (
            <>
              {order.proofApproved ? (
                <TouchableOpacity
                  style={[styles.actionBtn, styles.payBtn]}
                  onPress={handlePayNow}
                  disabled={processing}
                >
                  <Text style={styles.actionBtnText}>
                    {processing ? "Processing..." : "Pay Now"}
                  </Text>
                </TouchableOpacity>
              ) : (
                <View style={[styles.actionBtn, styles.disabledBtn]}>
                  <Text style={styles.disabledBtnText}>
                    Waiting for seller approval
                  </Text>
                </View>
              )}
              <TouchableOpacity
                style={[styles.actionBtn, styles.cancelBtn]}
                onPress={handleCancelOrder}
                disabled={processing}
              >
                <Text style={styles.cancelBtnText}>
                  {processing ? "Processing..." : "Cancel Order"}
                </Text>
              </TouchableOpacity>
            </>
          )}

          {order.payment_status === "paid" &&
            !["completed", "cancelled", "return_requested"].includes(
              order.status,
            ) && (
              <TouchableOpacity
                style={[styles.actionBtn, styles.receiveBtn]}
                onPress={handleOrderReceived}
                disabled={processing}
              >
                <Text style={styles.actionBtnText}>
                  {processing ? "Processing..." : "Order Received"}
                </Text>
              </TouchableOpacity>
            )}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.lightBg,
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.lightBg,
  },
  errorText: {
    color: COLORS.textMuted,
    fontSize: 16,
  },
  card: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.textPrimary,
    marginBottom: 12,
  },
  infoText: {
    fontSize: 14,
    color: COLORS.textMuted,
    marginBottom: 4,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "700",
    textTransform: "capitalize",
  },
  itemRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  itemThumbsContainer: {
    flexDirection: "row",
    marginRight: 12,
    gap: 4,
  },
  itemThumb: {
    width: 48,
    height: 48,
    borderRadius: 6,
    backgroundColor: COLORS.borderLight,
  },
  itemDetails: {
    flex: 1,
    justifyContent: "center",
  },
  itemName: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.textPrimary,
  },
  itemPrompt: {
    fontSize: 12,
    fontStyle: "italic",
    color: COLORS.textMuted,
    marginTop: 2,
  },
  itemSubText: {
    fontSize: 13,
    color: COLORS.textMuted,
    marginTop: 4,
    fontWeight: "600",
  },
  itemPrice: {
    fontSize: 14,
    fontWeight: "800",
    color: COLORS.textPrimary,
    marginLeft: 12,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.borderLight,
    marginVertical: 12,
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  totalText: {
    fontSize: 15,
    fontWeight: "700",
    color: COLORS.textPrimary,
  },
  totalAmount: {
    fontSize: 18,
    fontWeight: "800",
    color: COLORS.accentCyan,
  },
  actionContainer: {
    marginTop: 20,
    gap: 12,
  },
  actionBtn: {
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
  },
  payBtn: {
    backgroundColor: COLORS.accentCyan,
  },
  receiveBtn: {
    backgroundColor: COLORS.success,
  },
  actionBtnText: {
    color: COLORS.textLight,
    fontWeight: "700",
    fontSize: 15,
  },
  cancelBtn: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: COLORS.danger,
  },
  cancelBtnText: {
    color: COLORS.danger,
    fontWeight: "700",
    fontSize: 15,
  },
  disabledBtn: {
    backgroundColor: COLORS.borderLight,
  },
  disabledBtnText: {
    color: COLORS.textMuted,
    fontWeight: "600",
    fontSize: 15,
  },
});
