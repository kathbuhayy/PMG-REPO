import React, { useState, useCallback } from "react";
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

  const fetchOrders = async () => {
    try {
      const userStr = await AsyncStorage.getItem("user");
      if (!userStr) return;
      const user = JSON.parse(userStr);
      const res = await fetch(`${API_BASE_URL}/api/user/${user.id}/orders`);
      if (res.ok) {
        const data = await res.json();
        setOrders(data || []);
      }
    } catch (err) {
      console.error("[OrdersScreen] {FetchOrders}: " + err.message);
    }
  };

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      fetchOrders().finally(() => setLoading(false));
    }, [])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchOrders().finally(() => setRefreshing(false));
  }, []);

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

  const renderOrderItem = ({ item }) => {
    // Generate a summary of items
    let itemSummary = "No items";
    const productImages = [];
    
    if (item.items && item.items.length > 0) {
      const parts = item.items.map(orderItem => {
        const name = orderItem.product?.name || `Product #${orderItem.productId}`;
        
        // Try to find a displayable image
        const productImg = orderItem.product?.images?.[0];
        if (productImg && productImages.length < 4) {
          productImages.push(productImg);
        } else if (orderItem.customizations?.design?.generatedImageUrl && productImages.length < 4) {
          productImages.push(orderItem.customizations.design.generatedImageUrl);
        }
        
        return `${name} (x${orderItem.quantity})`;
      });
      itemSummary = parts.join(", ");
    }

    return (
      <TouchableOpacity 
        style={styles.orderCard}
        onPress={() => navigation.navigate("OrderDetail", { orderId: item.id })}
      >
        <View style={styles.headerRow}>
          <Text style={styles.orderId}>Order #{item.id}</Text>
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: getStatusColor(item.status) + "20" },
            ]}
          >
            <Text
              style={[styles.statusText, { color: getStatusColor(item.status) }]}
            >
              {item.status || "Pending"}
            </Text>
          </View>
        </View>

        <Text style={styles.dateText}>
          Date: {item.createdAt ? item.createdAt.slice(0, 10) : "Recent"}
        </Text>
        
        {productImages.length > 0 && (
          <View style={styles.thumbnailRow}>
            {productImages.map((src, i) => (
              <Image key={i} source={{ uri: src }} style={styles.thumbnailImg} />
            ))}
            {item.items && item.items.length > 4 && (
              <View style={styles.thumbnailMore}>
                <Text style={styles.thumbnailMoreText}>+{item.items.length - 4}</Text>
              </View>
            )}
          </View>
        )}

        <Text style={styles.itemsSummaryText} numberOfLines={2}>
          Items: {itemSummary}
        </Text>

        <Text style={styles.amountText}>
          Total: ₱{Number(item.total || 0).toLocaleString()}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.pageTitle}>Order History & Status</Text>

      {loading ? (
        <ActivityIndicator size="large" color={COLORS.accentCyan} />
      ) : orders.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons
            name="receipt-outline"
            size={48}
            color={COLORS.textMuted}
          />
          <Text style={styles.emptyText}>No order records found.</Text>
        </View>
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderOrderItem}
          contentContainerStyle={{ paddingBottom: 24 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        />
      )}
    </View>
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
    marginBottom: 16,
  },
  orderCard: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    padding: 16,
    marginBottom: 12,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  orderId: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.textPrimary,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "800",
  },
  dateText: {
    fontSize: 13,
    color: COLORS.textMuted,
    marginTop: 4,
  },
  thumbnailRow: {
    flexDirection: 'row',
    marginTop: 10,
    gap: 8,
  },
  thumbnailImg: {
    width: 40,
    height: 40,
    borderRadius: 6,
    backgroundColor: COLORS.borderLight,
  },
  thumbnailMore: {
    width: 40,
    height: 40,
    borderRadius: 6,
    backgroundColor: COLORS.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbnailMoreText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textMuted,
  },
  itemsSummaryText: {
    fontSize: 13,
    color: COLORS.textPrimary,
    marginTop: 6,
    fontStyle: 'italic',
  },
  amountText: {
    fontSize: 15,
    fontWeight: "800",
    color: COLORS.accentCyan,
    marginTop: 8,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    marginTop: 60,
  },
  emptyText: {
    color: COLORS.textMuted,
    fontSize: 14,
    marginTop: 12,
  },
});
