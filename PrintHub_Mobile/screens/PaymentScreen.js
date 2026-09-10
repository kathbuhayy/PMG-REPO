import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  StatusBar,
  Image,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_BASE_URL } from "../config";

const COLORS = {
  background: "#06150D",
  card: "#0D2519",
  cardBorder: "#294A32",
  lime: "#A8FF3E",
  limeDark: "#8BEA20",
  white: "#FFFFFF",
  text: "#F5F7F5",
  muted: "#89978E",
};

export default function PaymentScreen({
  route,
  navigation,
}) {
  const {
    total = 0,
    items = [],
  } = route.params || {};

  const [processing, setProcessing] =
    useState(false);

  const [profile, setProfile] = useState(null);

  const [loading, setLoading] =
    useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const userStr =
          await AsyncStorage.getItem("user");

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
            data.message ||
              "Failed to load profile"
          );
        }
      } catch (err) {
        console.error(
          "[PaymentScreen] Profile error:",
          err
        );

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

    if (
      !profile ||
      !profile.address ||
      profile.address.trim() === ""
    ) {
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
              navigation.navigate(
                "EditProfile"
              ),
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

      const userStr =
        await AsyncStorage.getItem("user");

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

      const orderItems = items.map((item) => ({
        productId: Number(item.productId),
        quantity: Number(item.qty || 1),
        unitPrice: Number(item.price || 0),
        customizations:
          item.customizations || {},
        imageUrl:
          item.productImage || null,
      }));

      const payload = {
        userId: Number(user.id),
        items: orderItems,
        shippingCost: 0,
        shipping_address:
          profile.address.trim(),
        billing_address:
          profile.address.trim(),
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
          data.message ||
            "Failed to create order"
        );
      }

      const createdOrderId =
        data?.order?.id ||
        data?.orderId ||
        data?.id;

      if (!createdOrderId) {
        throw new Error(
          "Order was created, but the order ID was not returned by the server."
        );
      }

      console.log(
        "[PaymentScreen] Created order:",
        createdOrderId
      );

      /* CLEAR CART */
      try {
        const clearCartResponse =
          await fetch(
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

      /* SAVE LATEST ORDER */
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
      <View style={styles.loadingScreen}>
        <StatusBar
          barStyle="light-content"
          backgroundColor={COLORS.background}
        />

        <ActivityIndicator
          size="large"
          color={COLORS.lime}
        />
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <StatusBar
        barStyle="light-content"
        backgroundColor={COLORS.background}
      />

      <ScrollView
        style={styles.background}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >

        {/* PAGE HEADER */}
        <Text style={styles.eyebrow}>
          CHECKOUT
        </Text>

        <Text style={styles.pageTitle}>
          Mobile{" "}
          <Text style={styles.pageTitleAccent}>
            Checkout
          </Text>
        </Text>

        <Text style={styles.subtitle}>
          Review your order and place it securely.
        </Text>

        {/* TOTAL CARD */}
        <View style={styles.totalCard}>
          <View style={styles.totalTop}>
            <View style={styles.totalInfo}>
              <Text style={styles.totalLabel}>
                Checkout Total
              </Text>

              <Text style={styles.totalAmount}>
                ₱{Number(total).toLocaleString()}
              </Text>

              <Text style={styles.totalItems}>
                {items.length} item(s) included
              </Text>
            </View>

            <Ionicons
              name="cart-outline"
              size={54}
              color={COLORS.lime}
            />
          </View>
        </View>

        {/* SHIPPING ADDRESS HEADER */}
        <View style={styles.sectionHeaderRow}>
          <View style={styles.sectionHeaderLeft}>
            <Ionicons
              name="location"
              size={21}
              color={COLORS.lime}
            />

            <Text style={styles.sectionHeader}>
              Shipping Address
            </Text>
          </View>

          <TouchableOpacity
            onPress={() =>
              navigation.navigate(
                "EditProfile"
              )
            }
          >
            <Text style={styles.editText}>
              Edit
            </Text>
          </TouchableOpacity>
        </View>

        {/* ADDRESS */}
        <View style={styles.addressCard}>
          <Text style={styles.addressText}>
            {profile?.address ||
              "No shipping address set yet."}
          </Text>

          <TouchableOpacity
            onPress={() =>
              navigation.navigate(
                "EditProfile"
              )
            }
          >
            <Text style={styles.changeAddress}>
              {profile?.address
                ? "Change Address"
                : "Set Address"}
            </Text>
          </TouchableOpacity>
        </View>

        {/* IMPORTANT NOTE HEADER */}
        <View style={styles.sectionHeaderRow}>
          <View style={styles.sectionHeaderLeft}>
            <View style={styles.infoCircle}>
              <Text style={styles.infoText}>
                i
              </Text>
            </View>

            <Text style={styles.sectionHeader}>
              Important Note
            </Text>
          </View>
        </View>

        {/* NOTE */}
        <View style={styles.noteCard}>
          <Text style={styles.noteText}>
            By placing this order, it will be sent
            to the admin for design approval. Once
            the design is approved, you will be able
            to pay for this order through your Orders
            tab.
          </Text>
        </View>

        {/* PLACE ORDER */}
        <TouchableOpacity
          style={[
            styles.placeOrderButton,
            processing &&
              styles.placeOrderDisabled,
          ]}
          onPress={handlePay}
          disabled={processing}
          activeOpacity={0.8}
        >
          {processing ? (
            <View
              style={styles.processingContainer}
            >
              <ActivityIndicator
                size="small"
                color="#000000"
              />

              <Text style={styles.processingText}>
                Processing...
              </Text>
            </View>
          ) : (
            <View style={styles.buttonContent}>
              <Text style={styles.placeOrderText}>
                Place Order (₱
                {Number(total).toLocaleString()})
              </Text>

              <Text style={styles.arrow}>
                →
              </Text>
            </View>
          )}
        </TouchableOpacity>

        {/* FOOTER */}
        <View style={styles.footer}>
          <View style={styles.footerDot} />

          <Text style={styles.footerText}>
            PRINT. CREATE. DELIVER.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  loadingScreen: {
    flex: 1,
    backgroundColor: COLORS.background,
    justifyContent: "center",
    alignItems: "center",
  },

  background: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  content: {
    paddingHorizontal: 24,
    paddingTop: 30,
    paddingBottom: 50,
  },

  logoContainer: {
    alignItems: "center",
    marginBottom: 22,
  },

  logo: {
    width: 175,
    height: 70,
  },

  eyebrow: {
    color: COLORS.lime,
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 2.2,
    marginBottom: 9,
  },

  pageTitle: {
    color: COLORS.white,
    fontSize: 34,
    fontWeight: "900",
  },

  pageTitleAccent: {
    color: COLORS.lime,
  },

  subtitle: {
    color: COLORS.muted,
    fontSize: 13,
    lineHeight: 20,
    marginTop: 7,
    marginBottom: 23,
  },

  totalCard: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.limeDark,
    borderRadius: 21,
    padding: 22,
    marginBottom: 28,
  },

  totalTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  totalInfo: {
    flex: 1,
  },

  totalLabel: {
    color: COLORS.lime,
    fontSize: 13,
    fontWeight: "900",
    marginBottom: 7,
  },

  totalAmount: {
    color: COLORS.lime,
    fontSize: 38,
    fontWeight: "900",
    letterSpacing: -1,
  },

  totalItems: {
    color: COLORS.white,
    fontSize: 13,
    marginTop: 4,
  },

  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },

  sectionHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
  },

  sectionHeader: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: "900",
    marginLeft: 8,
  },

  editText: {
    color: COLORS.lime,
    fontSize: 12,
    fontWeight: "900",
  },

  addressCard: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    borderRadius: 17,
    padding: 19,
    marginBottom: 27,
  },

  addressText: {
    color: "#D9E0DB",
    fontSize: 13,
    lineHeight: 21,
    fontWeight: "500",
    marginBottom: 13,
  },

  changeAddress: {
    color: COLORS.lime,
    fontSize: 12,
    fontWeight: "900",
  },

  infoCircle: {
    width: 21,
    height: 21,
    borderRadius: 11,
    backgroundColor: COLORS.lime,
    justifyContent: "center",
    alignItems: "center",
  },

  infoText: {
    color: "#000000",
    fontSize: 14,
    fontWeight: "900",
  },

  noteCard: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    borderRadius: 17,
    padding: 19,
    marginBottom: 28,
  },

  noteText: {
    color: "#D0D8D2",
    fontSize: 13,
    lineHeight: 21,
  },

  placeOrderButton: {
    height: 61,
    backgroundColor: COLORS.lime,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },

  placeOrderDisabled: {
    opacity: 0.65,
  },

  buttonContent: {
    flexDirection: "row",
    alignItems: "center",
  },

  placeOrderText: {
    color: "#000000",
    fontSize: 14,
    fontWeight: "900",
  },

  arrow: {
    color: "#000000",
    fontSize: 23,
    fontWeight: "900",
    marginLeft: 10,
  },

  processingContainer: {
    flexDirection: "row",
    alignItems: "center",
  },

  processingText: {
    color: "#000000",
    fontSize: 14,
    fontWeight: "900",
    marginLeft: 10,
  },

  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 27,
  },

  footerDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: COLORS.lime,
    marginRight: 8,
  },

  footerText: {
    color: "#425348",
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1.8,
  },
});