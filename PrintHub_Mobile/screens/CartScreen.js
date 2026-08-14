import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useIsFocused } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { API_BASE_URL } from "../config";
import { COLORS } from "../theme";

export default function CartScreen({ navigation }) {
  const [user, setUser] = useState(null);
  const [cartItems, setCartItems] = useState([]);
  const [selectedItemIds, setSelectedItemIds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const isFocused = useIsFocused();

  useEffect(() => {
    if (cartItems.length > 0 && selectedItemIds.length === 0) {
      setSelectedItemIds(cartItems.map(item => item.id));
    }
  }, [cartItems]);

  const toggleSelection = (id) => {
    setSelectedItemIds((prev) => 
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const CheckUserStatus = async () => {
    try {
      const userStr = await AsyncStorage.getItem("user");
      if (userStr) {
        const parsedUser = JSON.parse(userStr);
        setUser(parsedUser);
        await GetCartItems(parsedUser.id);
      } else {
        setUser(null);
        setCartItems([]);
        setLoading(false);
      }
    } catch (err) {
      console.error("[CheckUserStatus] {ReadStorage}: " + err.message);
      setLoading(false);
    }
  };

  const GetCartItems = async (userId) => {
    try {
      if (!refreshing) setLoading(true);
      const response = await fetch(`${API_BASE_URL}/api/user/${userId}/cart`);
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Failed to load cart");
      }
      setCartItems(data || []);
    } catch (err) {
      console.error("[GetCartItems] {FetchCartList}: " + err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    if (!user) return;
    setRefreshing(true);
    GetCartItems(user.id);
  };

  useEffect(() => {
    if (isFocused) {
      CheckUserStatus();
    }
  }, [isFocused]);

  const PatchCartItem = async (itemId, newQty) => {
    if (!user || newQty < 1) return;
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/user/${user.id}/cart/${itemId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ qty: newQty }),
        }
      );
      if (!response.ok) {
        throw new Error("Failed to update quantity");
      }
      await GetCartItems(user.id);
    } catch (err) {
      console.error("[PatchCartItem] {UpdateCartQty}: " + err.message);
      Alert.alert("Error", err.message);
    }
  };

  const DeleteCartItem = async (itemId) => {
    if (!user) return;
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/user/${user.id}/cart/${itemId}`,
        { method: "DELETE" }
      );
      if (!response.ok) {
        throw new Error("Failed to delete cart item");
      }
      await GetCartItems(user.id);
    } catch (err) {
      console.error("[DeleteCartItem] {DeleteCart}: " + err.message);
      Alert.alert("Error", err.message);
    }
  };

  const calculateTotal = () => {
    return cartItems
      .filter((item) => selectedItemIds.includes(item.id))
      .reduce((sum, item) => sum + item.price * item.qty, 0);
  };

  const renderCartItem = ({ item }) => {
    const imageUrl = item.productImage || "https://via.placeholder.com/100";
    const finishVal =
      item.customizations?.finishing || item.customizations?.finish;
    const details = item.customizations
      ? [
          item.customizations.quantity &&
            `Qty: ${item.customizations.quantity}`,
          item.customizations.size && `Size: ${item.customizations.size}`,
          item.customizations.material &&
            `Mat: ${item.customizations.material}`,
          finishVal && `Fin: ${finishVal}`,
          item.customizations.side && `Side: ${item.customizations.side}`,
          item.customizations.color && `Color: ${item.customizations.color}`,
        ]
          .filter(Boolean)
          .join(" · ")
      : "";

    return (
      <View style={[styles.card, { alignItems: "center" }]}>
        <TouchableOpacity
          style={styles.checkboxContainer}
          onPress={() => toggleSelection(item.id)}
        >
          <View
            style={[
              styles.checkbox,
              selectedItemIds.includes(item.id) && styles.checkboxSelected,
            ]}
          >
            {selectedItemIds.includes(item.id) && (
              <Text style={styles.checkmark}>✓</Text>
            )}
          </View>
        </TouchableOpacity>
        <Image source={{ uri: imageUrl }} style={styles.itemImage} />
        <View style={styles.detailsContainer}>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <Text style={styles.title} numberOfLines={1}>
              {item.title}
            </Text>
            {Number(item.stock ?? item.product?.stock ?? 0) <
              Number(item.qty) && (
              <Text
                style={{
                  color: COLORS.danger,
                  fontSize: 10,
                  fontWeight: "800",
                  marginLeft: 6,
                }}
              >
                [Out of Stock]
              </Text>
            )}
          </View>
          {!!details && (
            <Text
              style={{
                fontSize: 11,
                color: COLORS.textMuted,
                marginTop: 2,
              }}
            >
              {details}
            </Text>
          )}
          {item.customizations?.design && (
            <View style={styles.designBadge}>
              <Ionicons
                name="cube-outline"
                size={12}
                color={COLORS.accentCyan}
              />
              <Text style={styles.designBadgeText}>3D Design Attached</Text>
            </View>
          )}
          <Text style={styles.price}>₱{Number(item.price).toFixed(2)}</Text>

          <View style={styles.actions}>
            <View style={styles.qtyContainer}>
              <TouchableOpacity
                style={styles.qtyBtn}
                onPress={() => PatchCartItem(item.id, item.qty - 1)}
              >
                <Text style={styles.qtyText}>-</Text>
              </TouchableOpacity>
              <Text style={styles.qtyVal}>{item.qty}</Text>
              <TouchableOpacity
                style={styles.qtyBtn}
                onPress={async () => {
                  const availableStock = Number(
                    item.stock ?? item.product?.stock ?? 0,
                  );

                  const newQty = item.qty + 1;

                  if (newQty > availableStock) {
                    Alert.alert(
                      "Can't Add to Cart",
                      `Can't add to cart: low stock (${availableStock}).`,
                    );
                    return;
                  }

                  await PatchCartItem(item.id, newQty);
                }}
              >
                <Text style={styles.qtyText}>+</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.deleteBtn}
              onPress={() => DeleteCartItem(item.id)}
            >
              <Text style={styles.deleteBtnText}>Remove</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  const hasOosItem = cartItems
    .filter((item) => selectedItemIds.includes(item.id))
    .some((item) => item.stock === 0 || item.product?.stock === 0);

  if (!user) {
    return (
      <View style={styles.center}>
        <Text style={styles.infoText}>
          Log in to manage your cart and placed orders.
        </Text>
        <TouchableOpacity
          style={styles.loginBtn}
          onPress={() => navigation.navigate("Login")}
        >
          <Text style={styles.btnText}>Log In Now</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (loading && cartItems.length === 0) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.accentCyan} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {cartItems.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.infoText}>Your cart is currently empty.</Text>
        </View>
      ) : (
        <>
          <FlatList
            data={cartItems}
            renderItem={renderCartItem}
            keyExtractor={(item) => item.id.toString()}
            contentContainerStyle={styles.list}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
          />
          <View style={styles.footer}>
            {hasOosItem && (
              <Text
                style={{
                  color: COLORS.danger,
                  fontSize: 12,
                  fontWeight: "700",
                  textAlign: "center",
                  marginBottom: 8,
                }}
              >
                One or more items are out of stock. Remove them to proceed.
              </Text>
            )}
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total Amount:</Text>
              <Text style={styles.totalValue}>
                ₱{calculateTotal().toFixed(2)}
              </Text>
            </View>
            <TouchableOpacity
              style={[
                styles.checkoutBtn,
                hasOosItem && { opacity: 0.5, backgroundColor: COLORS.textMuted },
              ]}
              disabled={hasOosItem}
              onPress={() => {
                if (selectedItemIds.length === 0) {
                  Alert.alert("No Items Selected", "Please select at least one item to proceed to checkout.");
                  return;
                }
                navigation.navigate("Payment", {
                  total: calculateTotal(),
                  items: cartItems.filter(item => selectedItemIds.includes(item.id)),
                })
              }}
            >
              <Text style={styles.btnText}>Proceed to Payment</Text>
            </TouchableOpacity>
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.lightBg,
  },
  list: {
    padding: 16,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  infoText: {
    fontSize: 14,
    color: COLORS.textMuted,
    marginBottom: 16,
    textAlign: "center",
  },
  loginBtn: {
    backgroundColor: COLORS.accentCyan,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 20,
  },
  btnText: {
    color: COLORS.textLight,
    fontSize: 14,
    fontWeight: "700",
  },
  card: {
    backgroundColor: COLORS.cardBg,
    flexDirection: "row",
    borderRadius: 16,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  itemImage: {
    width: 76,
    height: 76,
    borderRadius: 12,
    resizeMode: "cover",
  },
  detailsContainer: {
    flex: 1,
    marginLeft: 12,
    justifyContent: "space-between",
  },
  title: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.textPrimary,
  },
  price: {
    fontSize: 15,
    fontWeight: "800",
    color: COLORS.accentCyan,
    marginTop: 2,
  },
  actions: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8,
  },
  qtyContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    borderRadius: 8,
  },
  qtyBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: COLORS.lightBg,
  },
  qtyText: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.textPrimary,
  },
  qtyVal: {
    paddingHorizontal: 10,
    fontSize: 13,
    fontWeight: "700",
  },
  deleteBtn: {
    padding: 4,
  },
  deleteBtnText: {
    color: COLORS.danger,
    fontSize: 12,
    fontWeight: "700",
  },
  footer: {
    backgroundColor: COLORS.cardBg,
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  totalLabel: {
    fontSize: 15,
    color: COLORS.textPrimary,
    fontWeight: "600",
  },
  totalValue: {
    fontSize: 22,
    fontWeight: "900",
    color: COLORS.accentCyan,
  },
  checkoutBtn: {
    backgroundColor: COLORS.accentCyan,
    padding: 14,
    borderRadius: 24,
    alignItems: "center",
  },
  checkboxContainer: {
    padding: 8,
    marginRight: 4,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderWidth: 2,
    borderColor: COLORS.textMuted,
    borderRadius: 6,
    justifyContent: "center",
    alignItems: "center",
  },
  checkboxSelected: {
    backgroundColor: COLORS.accentCyan,
    borderColor: COLORS.accentCyan,
  },
  checkmark: {
    color: COLORS.textLight,
    fontWeight: "bold",
    fontSize: 14,
  },
  designBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(6, 182, 212, 0.1)",
    alignSelf: "flex-start",
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
    marginTop: 4,
  },
  designBadgeText: {
    color: COLORS.accentCyan,
    fontSize: 10,
    fontWeight: "700",
    marginLeft: 4,
  },
});
