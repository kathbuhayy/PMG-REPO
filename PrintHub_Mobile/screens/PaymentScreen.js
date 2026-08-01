import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Linking,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "../theme";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_BASE_URL, WEB_APP_URL } from "../config";

export default function PaymentScreen({ route, navigation }) {
  const { total = 0, items = [] } = route.params || {};
  const [processing, setProcessing] = useState(false);

  const handlePay = async () => {
    try {
      setProcessing(true);
      const userStr = await AsyncStorage.getItem("user");
      if (!userStr) {
        Alert.alert("Error", "User session not found. Please login again.");
        setProcessing(false);
        return;
      }
      const user = JSON.parse(userStr);

      const orderItems = items.map((item) => ({
        productId: item.productId,
        quantity: item.qty,
        unitPrice: item.price,
        customizations: item.customizations || {},
        imageUrl: item.productImage || null,
      }));

      // Create the order first (defaults to awaiting_payment)
      const payload = {
        userId: user.id,
        items: orderItems,
        shippingCost: 0,
        shipping_address: "Mobile App Checkout",
        billing_address: "Mobile App Checkout",
      };

      const response = await fetch(`${API_BASE_URL}/api/orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Failed to create order");
      }

      const createdOrder = data.order;

      // Clear the user's cart after successful order creation
      await fetch(`${API_BASE_URL}/api/user/${user.id}/cart`, {
        method: "DELETE",
      }).catch(err => console.error("Failed to clear cart:", err));

      // DO NOT ATTEMPT TO PAY HERE. Payment requires admin approval first.
      
      setProcessing(false);

      Alert.alert(
        "Order Placed Successfully!",
        "Your order was sent to admin for approval. You can pay after the design is approved.",
        [
          {
            text: "View Orders",
            onPress: () => navigation.navigate("Main", { screen: "OrdersTab" }),
          },
        ]
      );
    } catch (err) {
      console.error("[PaymentScreen] {PlaceOrder}: " + err.message);
      Alert.alert("Error", err.message || "Order placement failed");
      setProcessing(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.pageTitle}>Checkout Summary</Text>

      {/* Summary Card */}
      <View style={styles.summaryCard}>
        <Text style={styles.summaryTitle}>Checkout Total</Text>
        <Text style={styles.summaryAmount}>₱{Number(total).toLocaleString()}</Text>
        <Text style={styles.summaryItems}>
          {items.length} item(s) included
        </Text>
      </View>

      {/* Informational Note */}
      <Text style={styles.sectionHeader}>Important Note</Text>
      <View style={styles.methodCard}>
        <Ionicons name="information-circle-outline" size={24} color={COLORS.accentGold} />
        <Text style={styles.methodText}>Admin Approval Required</Text>
      </View>
      <Text style={{ color: COLORS.textMuted, fontSize: 13, marginBottom: 20 }}>
        By placing this order, it will be sent to the admin for design approval. Once approved, you will be able to pay for this order via your Orders tab.
      </Text>

      <TouchableOpacity
        style={styles.payBtn}
        onPress={handlePay}
        disabled={processing}
      >
        <Text style={styles.payBtnText}>
          {processing ? "Processing..." : `Place Order (₱${Number(total).toLocaleString()})`}
        </Text>
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
  payBtn: {
    backgroundColor: COLORS.accentCyan,
    borderRadius: 24,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 20,
    marginBottom: 40,
  },
  payBtnText: {
    color: COLORS.textLight,
    fontWeight: "800",
    fontSize: 15,
  },
});
