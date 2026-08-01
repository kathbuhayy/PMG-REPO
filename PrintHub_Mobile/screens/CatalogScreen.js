import React, { useState, useEffect, useMemo } from "react";
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { API_BASE_URL } from "../config";
import { COLORS } from "../theme";

const categoryMapping = {
  Clothing: ["T-Shirt", "Jersey", "Cap"],
  Business: [
    "Note Cards",
    "Brochure",
    "Flyer",
    "Business Card",
    "Poster",
    "Banners",
  ],
  Labels: ["Hang Tags", "stickers", "Mug", "Notebook"],
};

const categories = ["All", ...Object.keys(categoryMapping)];

const getProductCategory = (product) => {
  if (!product) return "Print";
  const printType = product.print_type || product.category || "";
  const name = product.name || product.title || "";
  const matched = Object.entries(categoryMapping).find(([, items]) =>
    items.some(
      (item) =>
        printType.toLowerCase().includes(item.toLowerCase()) ||
        name.toLowerCase().includes(item.toLowerCase())
    )
  );
  return matched?.[0] || product.category || "Print";
};

export default function CatalogScreen({ navigation }) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");

  const GetProducts = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/api/products?limit=100`);
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Failed to load products");
      }
      const list = data.products || data || [];
      setProducts(Array.isArray(list) ? list : []);
    } catch (err) {
      console.error("[GetProducts] {FetchList}: " + err.message);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    GetProducts();
  }, []);

  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const printType = product.print_type || "";
      const name = product.name || "";
      const matchesCategory =
        selectedCategory === "All" ||
        categoryMapping[selectedCategory]?.some(
          (item) =>
            printType.toLowerCase().includes(item.toLowerCase()) ||
            name.toLowerCase().includes(item.toLowerCase())
        );
      const matchesSearch = name
        .toLowerCase()
        .includes(searchQuery.toLowerCase());

      return matchesCategory && matchesSearch;
    });
  }, [products, selectedCategory, searchQuery]);

  const renderProductItem = ({ item }) => {
    const imageUrl = item.images?.[0] || "https://via.placeholder.com/150";
    const categoryTag = getProductCategory(item);

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => navigation.navigate("ProductDetail", { product: item })}
      >
        <View style={styles.imageContainer}>
          <Image source={{ uri: imageUrl }} style={styles.image} />
          <View style={styles.categoryBadge}>
            <Text style={styles.categoryBadgeText}>{categoryTag}</Text>
          </View>
          {Number(item.stock) === 0 && (
            <View style={styles.oosBadge}>
              <Text style={styles.oosBadgeText}>Out of Stock</Text>
            </View>
          )}
        </View>

        <View style={styles.infoContainer}>
          <Text style={styles.name} numberOfLines={2}>
            {item.name}
          </Text>
          <Text style={styles.price}>
            ₱{Number(item.price || 0).toLocaleString()}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Search Header */}
      <View style={styles.searchSection}>
        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={20} color={COLORS.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search products..."
            placeholderTextColor={COLORS.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        {/* Category Pills */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.pillContainer}
        >
          {categories.map((cat) => (
            <TouchableOpacity
              key={cat}
              style={[
                styles.pill,
                selectedCategory === cat && styles.activePill,
              ]}
              onPress={() => setSelectedCategory(cat)}
            >
              <Text
                style={[
                  styles.pillText,
                  selectedCategory === cat && styles.activePillText,
                ]}
              >
                {cat}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.accentCyan} />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>Error: {error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={GetProducts}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : filteredProducts.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyText}>No products found</Text>
        </View>
      ) : (
        <FlatList
          data={filteredProducts}
          renderItem={renderProductItem}
          keyExtractor={(item) => item.id.toString()}
          numColumns={2}
          columnWrapperStyle={styles.row}
          contentContainerStyle={styles.list}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.lightBg,
  },
  searchSection: {
    padding: 14,
    backgroundColor: COLORS.cardBg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.lightBg,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 42,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
    color: COLORS.textPrimary,
  },
  pillContainer: {
    marginTop: 10,
  },
  pill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: COLORS.lightBg,
    marginRight: 8,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  activePill: {
    backgroundColor: COLORS.accentCyan,
    borderColor: COLORS.accentCyan,
  },
  pillText: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.textMuted,
  },
  activePillText: {
    color: COLORS.textLight,
  },
  list: {
    padding: 12,
  },
  row: {
    justifyContent: "space-between",
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  card: {
    backgroundColor: COLORS.cardBg,
    width: "48%",
    borderRadius: 16,
    padding: 10,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
  },
  imageContainer: {
    position: "relative",
  },
  image: {
    width: "100%",
    height: 120,
    borderRadius: 12,
    resizeMode: "cover",
  },
  categoryBadge: {
    position: "absolute",
    bottom: 6,
    left: 6,
    backgroundColor: "rgba(7, 17, 31, 0.85)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  categoryBadgeText: {
    color: COLORS.accentCyan,
    fontSize: 10,
    fontWeight: "800",
  },
  oosBadge: {
    position: "absolute",
    top: 6,
    right: 6,
    backgroundColor: COLORS.danger,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  oosBadgeText: {
    color: COLORS.textLight,
    fontSize: 10,
    fontWeight: "800",
  },
  infoContainer: {
    marginTop: 8,
  },
  name: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.textPrimary,
    height: 36,
  },
  price: {
    fontSize: 15,
    fontWeight: "800",
    color: COLORS.accentCyan,
    marginTop: 4,
  },
  errorText: {
    fontSize: 14,
    color: COLORS.danger,
    textAlign: "center",
    marginBottom: 10,
  },
  emptyText: {
    fontSize: 14,
    color: COLORS.textMuted,
    fontWeight: "600",
  },
  retryButton: {
    backgroundColor: COLORS.accentCyan,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  retryText: {
    color: COLORS.textLight,
    fontWeight: "700",
  },
});
