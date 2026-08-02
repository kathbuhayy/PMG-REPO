import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  Text,
  View,
  Image,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { API_BASE_URL } from "../config";
import { COLORS } from "../theme";

const parseOptionItem = (opt) => {
  const value = String(opt || "");
  const idx = value.indexOf("|");
  if (idx === -1) return { label: value, price: 0 };
  const label = value.slice(0, idx);
  const rawPrice = value.slice(idx + 1).replace(/[^0-9.]/g, "");
  return { label, price: parseFloat(rawPrice) || 0 };
};

const CustomDropdown = ({ label, options, selected, onSelect, isOpen, onToggle }) => (
  <View style={styles.dropdownContainer}>
    <Text style={styles.dropdownLabel}>{label}</Text>
    <TouchableOpacity style={[styles.dropdownHeader, isOpen && styles.dropdownHeaderActive]} onPress={onToggle}>
      <Text style={styles.dropdownHeaderText}>{selected || "Select an option..."}</Text>
      <Ionicons name={isOpen ? "chevron-up" : "chevron-down"} size={20} color={COLORS.textMuted} />
    </TouchableOpacity>
    {isOpen && (
      <View style={styles.dropdownList}>
        {options.map((opt, idx) => (
          <TouchableOpacity 
            key={idx} 
            style={[styles.dropdownItem, idx === options.length - 1 && styles.dropdownItemLast]} 
            onPress={() => { onSelect(opt); onToggle(); }}
          >
            <Text style={[styles.dropdownItemText, selected === opt.label && styles.dropdownItemTextActive]}>
              {opt.label} {opt.price ? `(+₱${opt.price})` : ""}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    )}
  </View>
);

export default function ProductDetailScreen({ route, navigation }) {
  const { product } = route.params;
  const [adding, setAdding] = useState(false);
  const [activeDesign, setActiveDesign] = useState(null);

  useEffect(() => {
    if (route.params?.completedDesign) {
      setActiveDesign(route.params.completedDesign);
    }
  }, [route.params?.completedDesign]);

  // Configuration options state
  const [sizes, setSizes] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [sides, setSides] = useState([]);
  const [finishing, setFinishing] = useState([]);
  const [colors, setColors] = useState([]);
  const [quantities, setQuantities] = useState([]);

  // Selected state
  const [selectedSize, setSelectedSize] = useState("");
  const [selectedMaterial, setSelectedMaterial] = useState(null);
  const [selectedSide, setSelectedSide] = useState("");
  const [selectedFinish, setSelectedFinish] = useState("");
  const [selectedColor, setSelectedColor] = useState("");
  const [selectedQty, setSelectedQty] = useState(null);
  
  const [openDropdown, setOpenDropdown] = useState(null);

  useEffect(() => {
    if (!product) return;

    const parsedSizes = product.size_options || ["Standard"];
    const parsedMaterials = (product.material_options || []).map(
      parseOptionItem
    );
    const parsedSides = product.side_options || ["Single Side"];
    const parsedFinishing = product.finishing_options || ["None"];
    const parsedColors = product.color_options || ["Full Color"];
    const parsedQuantities = (product.quantity_options || []).map(
      parseOptionItem
    );

    setSizes(parsedSizes);
    setMaterials(parsedMaterials);
    setSides(parsedSides);
    setFinishing(parsedFinishing);
    setColors(parsedColors);
    setQuantities(parsedQuantities);

    setSelectedSize(parsedSizes[0] || "");
    setSelectedMaterial(parsedMaterials[0] || null);
    setSelectedSide(parsedSides[0] || "");
    setSelectedFinish(parsedFinishing[0] || "");
    setSelectedColor(parsedColors[0] || "");
    setSelectedQty(parsedQuantities[0] || null);
  }, [product]);

  // Price Calculation
  const basePrice = Number(product.price) || 0;
  const qtyPrice = selectedQty?.price || basePrice;
  const matPrice = selectedMaterial?.price || 0;
  const grandTotal = qtyPrice + matPrice;

  const executePostCartItem = async () => {
    try {
      const userStr = await AsyncStorage.getItem("user");
      if (!userStr) {
        Alert.alert(
          "Login Required",
          "Please log in to add items to your cart.",
          [
            { text: "Cancel" },
            { text: "Log In", onPress: () => navigation.navigate("Login") },
          ]
        );
        return;
      }

      const user = JSON.parse(userStr);
      setAdding(true);

      const customizations = {
        size: selectedSize,
        material: selectedMaterial?.label,
        side: selectedSide,
        finishing: selectedFinish,
        color: selectedColor,
        quantity: selectedQty?.label,
        ...(activeDesign ? { design: activeDesign } : {}),
      };

      const response = await fetch(
        `${API_BASE_URL}/api/user/${user.id}/cart`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            productId: product.id,
            title: product.name,
            price: grandTotal,
            qty: 1,
            productImage: product.images?.[0] || null,
            customizations,
          }),
        }
      );

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Failed to add to cart");
      }

      Alert.alert("Success", "Added to cart with custom options!");
    } catch (err) {
      console.error("[PostCartItem] {FetchPostCart}: " + err.message);
      Alert.alert("Error", err.message);
    } finally {
      setAdding(false);
    }
  };

  const PostCartItem = async () => {
    if (Number(product.stock) === 0) {
      Alert.alert(
        "Out of Stock",
        "This item is currently out of stock. " +
          "Do you still want to add it to your cart?",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Add to Cart", onPress: executePostCartItem },
        ]
      );
      return;
    }

    await executePostCartItem();
  };

  const imageUrl = product.images?.[0] || "https://via.placeholder.com/300";
  
  const toggleDropdown = (id) => {
    setOpenDropdown(openDropdown === id ? null : id);
  };

  return (
    <ScrollView style={styles.container}>
      <Image source={{ uri: imageUrl }} style={styles.image} />

      <View style={styles.infoContainer}>
        <Text style={styles.name}>{product.name}</Text>
        <Text style={styles.price}>
          ₱{grandTotal.toLocaleString()}
          {selectedQty?.label ? ` (${selectedQty.label})` : ""}
        </Text>
        {Number(product.stock) === 0 ? (
          <Text style={[styles.stock, { color: COLORS.danger, fontWeight: "800" }]}>
            Out of Stock
          </Text>
        ) : (
          <Text style={styles.stock}>
            Stock: {product.stock || "Available"} units
          </Text>
        )}

        <Text style={styles.sectionTitle}>Product Specifications</Text>

        {sizes.length > 0 && (
          <CustomDropdown 
            label="1. Choose Size"
            options={sizes.map(s => ({ label: s }))}
            selected={selectedSize}
            onSelect={(val) => setSelectedSize(val.label)}
            isOpen={openDropdown === 'size'}
            onToggle={() => toggleDropdown('size')}
          />
        )}

        {materials.length > 0 && (
          <CustomDropdown 
            label="2. Choose Material"
            options={materials}
            selected={selectedMaterial?.label}
            onSelect={setSelectedMaterial}
            isOpen={openDropdown === 'material'}
            onToggle={() => toggleDropdown('material')}
          />
        )}

        {sides.length > 0 && (
          <CustomDropdown 
            label="3. Choose Printed Sides"
            options={sides.map(s => ({ label: s }))}
            selected={selectedSide}
            onSelect={(val) => setSelectedSide(val.label)}
            isOpen={openDropdown === 'sides'}
            onToggle={() => toggleDropdown('sides')}
          />
        )}

        {finishing.length > 0 && (
          <CustomDropdown 
            label="4. Choose Finishing"
            options={finishing.map(f => ({ label: f }))}
            selected={selectedFinish}
            onSelect={(val) => setSelectedFinish(val.label)}
            isOpen={openDropdown === 'finish'}
            onToggle={() => toggleDropdown('finish')}
          />
        )}

        {quantities.length > 0 && (
          <CustomDropdown 
            label="5. Choose Quantity Bundle"
            options={quantities}
            selected={selectedQty?.label}
            onSelect={setSelectedQty}
            isOpen={openDropdown === 'qty'}
            onToggle={() => toggleDropdown('qty')}
          />
        )}

        <Text style={styles.sectionTitle}>Description</Text>
        <Text style={styles.description}>
          {product.description || "No description available for this product."}
        </Text>

        {activeDesign && (
          <View style={styles.designAttachedCard}>
            <View style={styles.designAttachedHeader}>
              <Ionicons
                name="checkmark-circle"
                size={20}
                color={COLORS.accentCyan}
              />
              <Text style={styles.designAttachedTitle}>
                3D Design Attached
              </Text>
            </View>
            <Text style={styles.designAttachedDesc} numberOfLines={2}>
              {activeDesign.prompt
                ? `"${activeDesign.prompt}"`
                : "Custom 3D design ready"}
            </Text>
            <TouchableOpacity
              style={styles.removeDesignBtn}
              onPress={() => setActiveDesign(null)}
            >
              <Text style={styles.removeDesignText}>Remove Design</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={styles.cartButton}
            onPress={PostCartItem}
            disabled={adding}
          >
            {adding ? (
              <ActivityIndicator color={COLORS.textLight} />
            ) : (
              <Text style={styles.buttonText}>Add to Cart</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.customizerButton}
            onPress={async () => {
              const userStr = await AsyncStorage.getItem("user");
              if (!userStr) {
                Alert.alert(
                  "Login Required",
                  "Please log in to customize this product in 3D.",
                  [
                    { text: "Cancel" },
                    {
                      text: "Log In",
                      onPress: () => navigation.navigate("Login"),
                    },
                  ]
                );
                return;
              }
              navigation.navigate("CustomizerWebView", {
                product,
                selectedOptions: {
                  size: selectedSize,
                  material: selectedMaterial?.label,
                  side: selectedSide,
                  finishing: selectedFinish,
                  color: selectedColor,
                  quantity: selectedQty?.label,
                },
              });
            }}
          >
            <Ionicons
              name="cube-outline"
              size={18}
              color={COLORS.textLight}
              style={{ marginRight: 6 }}
            />
            <Text style={styles.buttonText}>Customize in 3D</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.lightBg,
  },
  image: {
    width: "100%",
    height: 240,
    resizeMode: "cover",
  },
  infoContainer: {
    padding: 16,
  },
  name: {
    fontSize: 22,
    fontWeight: "900",
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  price: {
    fontSize: 20,
    fontWeight: "800",
    color: COLORS.accentCyan,
    marginBottom: 4,
  },
  stock: {
    fontSize: 12,
    color: COLORS.accentGreen,
    fontWeight: "700",
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: COLORS.textPrimary,
    marginTop: 12,
    marginBottom: 10,
  },
  dropdownContainer: {
    marginBottom: 16,
  },
  dropdownLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.textMuted,
    marginBottom: 6,
  },
  dropdownHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.cardBg,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 8,
  },
  dropdownHeaderActive: {
    borderColor: COLORS.accentCyan,
    backgroundColor: "rgba(6, 182, 212, 0.04)",
  },
  dropdownHeaderText: {
    fontSize: 14,
    color: COLORS.textPrimary,
    fontWeight: "600",
  },
  dropdownList: {
    backgroundColor: COLORS.cardBg,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    borderTopWidth: 0,
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
    marginTop: -2,
    overflow: 'hidden',
  },
  dropdownItem: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  dropdownItemLast: {
    borderBottomWidth: 0,
  },
  dropdownItemText: {
    fontSize: 14,
    color: COLORS.textPrimary,
  },
  dropdownItemTextActive: {
    fontWeight: "700",
    color: COLORS.accentCyan,
  },
  description: {
    fontSize: 13,
    color: COLORS.textMuted,
    lineHeight: 18,
    marginBottom: 20,
  },
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 30,
  },
  cartButton: {
    backgroundColor: COLORS.accentCyan,
    flex: 1,
    marginRight: 8,
    paddingVertical: 14,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  customizerButton: {
    backgroundColor: COLORS.primaryDark,
    flex: 1,
    marginLeft: 8,
    paddingVertical: 14,
    borderRadius: 24,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  buttonText: {
    color: COLORS.textLight,
    fontSize: 14,
    fontWeight: "800",
  },
  designAttachedCard: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.accentCyan,
    padding: 12,
    marginBottom: 16,
  },
  designAttachedHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  designAttachedTitle: {
    color: COLORS.textPrimary,
    fontWeight: "800",
    fontSize: 14,
    marginLeft: 6,
  },
  designAttachedDesc: {
    color: COLORS.textMuted,
    fontSize: 13,
    marginBottom: 8,
  },
  removeDesignBtn: {
    alignSelf: "flex-start",
  },
  removeDesignText: {
    color: COLORS.danger,
    fontWeight: "700",
    fontSize: 12,
  },
});
