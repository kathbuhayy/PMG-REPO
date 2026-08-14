import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "../theme";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_BASE_URL } from "../config";

export default function PaymentScreen({ route, navigation }) {
  const { total = 0, items = [] } = route.params || {};

  const [processing, setProcessing] = useState(false);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const userStr = await AsyncStorage.getItem("user");

        if (!userStr) {
          Alert.alert(
            "Error",
            "User session not found. Please login again."
          );
          navigation.goBack();
          return;
        }

        const user = JSON.parse(userStr);

        const res = await fetch(
          `${API_BASE_URL}/api/user-profile/${user.id}`
        );

        const data = await res.json();

        if (res.ok) {
          setProfile(data);
        } else {
          Alert.alert(
            "Error",
            data.message || "Failed to load profile"
          );
        }
      } catch (err) {
        console.error("[PaymentScreen] Profile error:", err);

        Alert.alert(
          "Error",
          "Network error while loading profile"
        );
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, []);

  const handlePay = async () => {
    if (processing) return;

    if (!profile || !profile.address || profile.address.trim() === "") {
      Alert.alert(
        "Missing Address",
        "Please set your shipping address in your profile before checking out.",
        [
          {
            text: "Cancel",
            style: "cancel",
          },
          {
            text: "Edit Profile",
            onPress: () =>
              navigation.navigate("EditProfile"),
          },
        ]
      );

      return;
    }

    if (!items || items.length === 0) {
      Alert.alert(
        "No Items",
        "There are no items selected for checkout."
      );
      return;
    }

    try {
      setProcessing(true);

      const userStr = await AsyncStorage.getItem("user");

      if (!userStr) {
        Alert.alert(
          "Error",
          "User session not found. Please login again."
        );

        setProcessing(false);
        return;
      }

      const user = JSON.parse(userStr);

      if (!user?.id) {
        Alert.alert(
          "Error",
          "Invalid user session. Please login again."
        );

        setProcessing(false);
        return;
      }

      /*
       * Convert mobile cart items into the format
       * expected by the backend.
       */
      const orderItems = items.map((item) => ({
        productId: Number(item.productId),
        quantity: Number(item.qty || 1),
        unitPrice: Number(item.price || 0),
        customizations: item.customizations || {},
        imageUrl: item.productImage || null,
      }));

      /*
       * Create the order first.
       *
       * The backend creates it as awaiting payment
       * and the customer must wait for admin/design
       * approval before PayMongo payment is allowed.
       */
      const payload = {
        userId: Number(user.id),
        items: orderItems,
        shippingCost: 0,
        shipping_address: profile.address.trim(),
        billing_address: profile.address.trim(),
      };

      console.log(
        "[PaymentScreen] Creating order:",
        JSON.stringify(payload, null, 2)
      );

      const response = await fetch(
        `${API_BASE_URL}/api/orders`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        }
      );

      let data = {};

      try {
        data = await response.json();
      } catch (jsonError) {
        console.error(
          "[PaymentScreen] Invalid server response:",
          jsonError
        );
      }

      console.log(
        "[PaymentScreen] Order response:",
        JSON.stringify(data, null, 2)
      );

      if (!response.ok) {
        throw new Error(
          data.message || "Failed to create order"
        );
      }

      /*
       * Get the newly created order ID.
       *
       * The backend should return the created order
       * either directly as `order.id` or as `orderId`.
       */
      const createdOrderId =
        data?.order?.id ||
        data?.orderId ||
        data?.id;

      if (!createdOrderId) {
        console.error(
          "[PaymentScreen] Missing order ID:",
          data
        );

        throw new Error(
          "Order was created, but the order ID was not returned by the server."
        );
      }

      console.log(
        "[PaymentScreen] Created order:",
        createdOrderId
      );

      /*
       * Clear the user's cart only AFTER the order
       * has been successfully created.
       */
      try {
        const clearCartResponse = await fetch(
          `${API_BASE_URL}/api/user/${user.id}/cart`,
          {
            method: "DELETE",
          }
        );

        if (!clearCartResponse.ok) {
          console.warn(
            "[PaymentScreen] Cart could not be cleared:",
            clearCartResponse.status
          );
        }
      } catch (cartError) {
        console.error(
          "[PaymentScreen] Failed to clear cart:",
          cartError
        );
      }

      /*
       * Store the latest order ID locally.
       *
       * This can also be useful if the Orders screen
       * needs to refresh after returning to the app.
       */
      await AsyncStorage.setItem(
        "latestOrderId",
        String(createdOrderId)
      );

      Alert.alert(
        "Order Placed Successfully!",
        "Your order has been submitted to the admin for design approval. You can pay once the design has been approved.",
        [
          {
            text: "View Order",
            onPress: () => {
              navigation.navigate("Main", {
                screen: "OrdersTab",
                params: {
                  orderId: createdOrderId,
                  refresh: true,
                },
              });
            },
          },
        ]
      );
    } catch (err) {
      console.error(
        "[PaymentScreen] Place Order Error:",
        err
      );

      Alert.alert(
        "Order Failed",
        err.message ||
          "Something went wrong while placing your order."
      );
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator
          size="large"
          color={COLORS.accentCyan}
        />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: 40 }}
    >
      <Text style={styles.pageTitle}>
        Checkout Summary
      </Text>

      {/* Summary Card */}
      <View style={styles.summaryCard}>
        <Text style={styles.summaryTitle}>
          Checkout Total
        </Text>

        <Text style={styles.summaryAmount}>
          ₱{Number(total).toLocaleString()}
        </Text>

        <Text style={styles.summaryItems}>
          {items.length} item(s) included
        </Text>
      </View>

      {/* Shipping Address Card */}
      <View style={styles.addressCard}>
        <Text style={styles.addressTitle}>
          Shipping Address
        </Text>

        <Text style={styles.addressText}>
          {profile?.address ||
            "No shipping address set yet."}
        </Text>

        <TouchableOpacity
          style={styles.editAddressBtn}
          onPress={() =>
            navigation.navigate("EditProfile")
          }
        >
          <Text style={styles.editAddressBtnText}>
            {profile?.address
              ? "Change Address"
              : "Set Address"}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Informational Note */}
      <Text style={styles.sectionHeader}>
        Important Note
      </Text>

      <View style={styles.methodCard}>
        <Ionicons
          name="information-circle-outline"
          size={24}
          color={COLORS.accentGold}
        />

        <Text style={styles.methodText}>
          Admin Approval Required
        </Text>
      </View>

      <Text style={styles.noteText}>
        By placing this order, it will be sent to the
        admin for design approval. Once the design is
        approved, you will be able to pay for this order
        through your Orders tab.
      </Text>

      {/* Place Order */}
      <TouchableOpacity
        style={[
          styles.payBtn,
          processing && styles.payBtnDisabled,
        ]}
        onPress={handlePay}
        disabled={processing}
        activeOpacity={0.8}
      >
        {processing ? (
          <View style={styles.processingContainer}>
            <ActivityIndicator
              size="small"
              color={COLORS.textLight}
            />

            <Text style={styles.processingText}>
              Processing...
            </Text>
          </View>
        ) : (
          <Text style={styles.payBtnText}>
            Place Order (₱
            {Number(total).toLocaleString()})
          </Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.lightBg,
    padding: 16,
  },

  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.lightBg,
  },

  pageTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: COLORS.textPrimary,
    marginBottom: 14,
  },

  summaryCard: {
    backgroundColor: COLORS.primaryDark,
    borderRadius: 18,
    padding: 20,
    marginBottom: 20,
  },

  summaryTitle: {
    color: COLORS.accentGold,
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.5,
  },

  summaryAmount: {
    color: COLORS.textLight,
    fontSize: 32,
    fontWeight: "900",
    marginTop: 4,
  },

  summaryItems: {
    color: COLORS.textMuted,
    fontSize: 13,
    marginTop: 4,
  },

  addressCard: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    padding: 16,
    marginBottom: 20,
  },

  addressTitle: {
    fontSize: 12,
    fontWeight: "800",
    color: COLORS.textMuted,
    textTransform: "uppercase",
    marginBottom: 6,
  },

  addressText: {
    fontSize: 14,
    color: COLORS.textPrimary,
    fontWeight: "600",
    lineHeight: 20,
    marginBottom: 12,
  },

  editAddressBtn: {
    alignSelf: "flex-start",
  },

  editAddressBtnText: {
    color: COLORS.accentCyan,
    fontWeight: "700",
    fontSize: 13,
  },

  sectionHeader: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.textMuted,
    marginBottom: 10,
  },

  methodCard: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },

  methodText: {
    flex: 1,
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.textPrimary,
    marginLeft: 12,
  },

  noteText: {
    color: COLORS.textMuted,
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 20,
  },

  payBtn: {
    backgroundColor: COLORS.accentCyan,
    borderRadius: 24,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 20,
  },

  payBtnDisabled: {
    opacity: 0.7,
  },

  payBtnText: {
    color: COLORS.textLight,
    fontWeight: "800",
    fontSize: 15,
  },

  processingContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },

  processingText: {
    color: COLORS.textLight,
    fontWeight: "800",
    fontSize: 15,
    marginLeft: 10,
  },
});