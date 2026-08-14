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
  TextInput,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { API_BASE_URL } from "../config";
import { COLORS } from "../theme";

const GUEST_CUSTOMIZER_LIMIT = 3;
const GUEST_CUSTOMIZER_USES_KEY = "guest_3d_customizer_uses";

// 50 PCS AND ABOVE = BULK ORDER
const BULK_ORDER_THRESHOLD = 50;

const SIZE_PRICE_ADJUSTMENTS = {
  XS: 0,
  S: 0,
  M: 0,
  L: 10,
  XL: 20,
  "2XL": 30,
  "3XL": 40,
};

const parseOptionItem = (opt) => {
  const value = String(opt || "");
  const idx = value.indexOf("|");

  if (idx === -1) {
    return {
      label: value,
      price: 0,
    };
  }

  const label = value.slice(0, idx);
  const rawPrice = value
    .slice(idx + 1)
    .replace(/[^0-9.]/g, "");

  return {
    label,
    price: parseFloat(rawPrice) || 0,
  };
};

const CustomDropdown = ({
  label,
  options,
  selected,
  onSelect,
  isOpen,
  onToggle,
}) => (
  <View style={styles.dropdownContainer}>
    <Text style={styles.dropdownLabel}>
      {label}
    </Text>

    <TouchableOpacity
      style={[
        styles.dropdownHeader,
        isOpen && styles.dropdownHeaderActive,
      ]}
      onPress={onToggle}
    >
      <Text style={styles.dropdownHeaderText}>
        {selected || "Select an option..."}
      </Text>

      <Ionicons
        name={
          isOpen
            ? "chevron-up"
            : "chevron-down"
        }
        size={20}
        color={COLORS.textMuted}
      />
    </TouchableOpacity>

    {isOpen && (
      <View style={styles.dropdownList}>
        {options.map((opt, idx) => (
          <TouchableOpacity
            key={idx}
            style={[
              styles.dropdownItem,
              idx === options.length - 1 &&
                styles.dropdownItemLast,
            ]}
            onPress={() => {
              onSelect(opt);
              onToggle();
            }}
          >
            <Text
              style={[
                styles.dropdownItemText,
                selected === opt.label &&
                  styles.dropdownItemTextActive,
              ]}
            >
              {opt.label}{" "}
              {opt.price
                ? `(+₱${opt.price})`
                : ""}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    )}
  </View>
);

export default function ProductDetailScreen({
  route,
  navigation,
}) {
  const { product } = route.params;

  const [adding, setAdding] =
    useState(false);

  const [activeDesign, setActiveDesign] =
    useState(null);

  const [liveProduct, setLiveProduct] =
    useState(product);

  const [customQty, setCustomQty] =
    useState("0");

  useEffect(() => {
    if (route.params?.completedDesign) {
      setActiveDesign(
        route.params.completedDesign
      );
    }
  }, [route.params?.completedDesign]);

  // Refresh the product so Admin quantity changes sync to Mobile.
  useEffect(() => {
    const refreshProduct = async () => {
      if (!product?.id) return;

      try {
        const response = await fetch(
          `${API_BASE_URL}/api/products/${product.id}`
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data?.message ||
              "Failed to refresh product"
          );
        }

        setLiveProduct(data);

        const parsedQuantities = (
          data.quantity_options || []
        ).map(parseOptionItem);

        setQuantities(parsedQuantities);

        setSelectedQty(
          data.quantity_mode === "text"
            ? null
            : parsedQuantities[0] || null
        );

        if (data.quantity_mode === "text") {
          setCustomQty("0");
        }
      } catch (error) {
        console.error(
          "[ProductDetail] Failed to refresh product:",
          error
        );
      }
    };

    refreshProduct();

    const unsubscribe =
      navigation.addListener(
        "focus",
        refreshProduct
      );

    return unsubscribe;
  }, [navigation, product?.id]);

  // Configuration options state
  const [sizes, setSizes] =
    useState([]);

  const [materials, setMaterials] =
    useState([]);

  const [sides, setSides] =
    useState([]);

  const [finishing, setFinishing] =
    useState([]);

  const [colors, setColors] =
    useState([]);

  const [quantities, setQuantities] =
    useState([]);

  // Selected state
  const [selectedSize, setSelectedSize] =
    useState("");

  const [
    selectedMaterial,
    setSelectedMaterial,
  ] = useState(null);

  const [selectedSide, setSelectedSide] =
    useState("");

  const [
    selectedFinish,
    setSelectedFinish,
  ] = useState("");

  const [selectedColor, setSelectedColor] =
    useState("");

  const [selectedQty, setSelectedQty] =
    useState(null);

  const [isRushOrder, setIsRushOrder] =
    useState(false);

  const [openDropdown, setOpenDropdown] =
    useState(null);

  // =========================================================
  // SYNC ADMIN PRODUCT OPTIONS TO MOBILE
  // =========================================================
  // Uses liveProduct so changes made by Admin are reflected
  // on Mobile whenever the product is refreshed.
  // =========================================================

  useEffect(() => {
    if (!liveProduct) return;

    const parsedSizes =
      liveProduct.size_options || [
        "Standard",
      ];

    const parsedMaterials = (
      liveProduct.material_options || []
    ).map(parseOptionItem);

    const parsedSides =
      liveProduct.side_options || [
        "Single Side",
      ];

    const parsedFinishing =
      liveProduct.finishing_options || [
        "None",
      ];

    const parsedColors =
      liveProduct.color_options || [
        "Full Color",
      ];

    const parsedQuantities = (
      liveProduct.quantity_options || []
    ).map(parseOptionItem);

    setSizes(parsedSizes);
    setMaterials(parsedMaterials);
    setSides(parsedSides);
    setFinishing(parsedFinishing);
    setColors(parsedColors);
    setQuantities(parsedQuantities);

    setSelectedSize(
      parsedSizes[0] || ""
    );

    setSelectedMaterial(
      parsedMaterials[0] || null
    );

    setSelectedSide(
      parsedSides[0] || ""
    );

    setSelectedFinish(
      parsedFinishing[0] || ""
    );

    setSelectedColor(
      parsedColors[0] || ""
    );

    setSelectedQty(
      liveProduct.quantity_mode === "text"
        ? null
        : parsedQuantities[0] || null
    );
  }, [liveProduct]);

  // Price Calculation
  const basePrice =
    Number(product.price) || 0;

  const qtyPrice =
    liveProduct?.quantity_mode === "text"
      ? (parseInt(customQty, 10) || 0) *
        basePrice
      : selectedQty?.price || 0;

  const matPrice =
    selectedMaterial?.price || 0;

  // Size-based price adjustment
  const normalizedSize =
    String(selectedSize || "")
      .trim()
      .toUpperCase();

  const sizePriceAdjustment =
    SIZE_PRICE_ADJUSTMENTS[
      normalizedSize
    ] || 0;

  // Get quantity for size adjustment
  const pricingQuantity =
    liveProduct?.quantity_mode === "text"
      ? Math.max(
          0,
          parseInt(customQty, 10) || 0
        )
      : (() => {
          const match =
            String(
              selectedQty?.label || ""
            ).match(/\d+/);

          return match
            ? Number(match[0])
            : 1;
        })();

  // Size adjustment is charged per piece
  const sizeTotalAdjustment =
    sizePriceAdjustment *
    pricingQuantity;

  const grandTotal =
    qtyPrice +
    matPrice +
    sizeTotalAdjustment;

  const rushFee = isRushOrder
    ? grandTotal * 0.2
    : 0;

  const finalTotal =
    grandTotal + rushFee;

  const executePostCartItem =
    async () => {
      try {
        const userStr =
          await AsyncStorage.getItem(
            "user"
          );

        if (!userStr) {
          Alert.alert(
            "Login Required",
            "Please log in to add items to your cart.",
            [
              {
                text: "Cancel",
              },
              {
                text: "Log In",
                onPress: () =>
                  navigation.navigate(
                    "Login"
                  ),
              },
            ]
          );

          return;
        }

        const user =
          JSON.parse(userStr);

        setAdding(true);

        const customizations = {
          size: selectedSize,
          material:
            selectedMaterial?.label,
          side: selectedSide,
          finishing: selectedFinish,
          color: selectedColor,
          quantity:
            selectedQty?.label,

          rushOrder: isRushOrder,
          rushFee: rushFee,

          ...(activeDesign
            ? {
                design: activeDesign,
              }
            : {}),
        };

        const response = await fetch(
          `${API_BASE_URL}/api/user/${user.id}/cart`,
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify({
              productId: product.id,

              title: product.name,

              price: finalTotal,

              qty: 1,

              productImage:
                product.images?.[0] ||
                null,

              customizations,
            }),
          }
        );

        const data =
          await response.json();

        if (!response.ok) {
          throw new Error(
            data.message ||
              "Failed to add to cart"
          );
        }

        Alert.alert(
          "Success",
          "Added to cart with custom options!"
        );
      } catch (err) {
        console.error(
          "[PostCartItem] {FetchPostCart}: " +
            err.message
        );

        Alert.alert(
          "Error",
          err.message
        );
      } finally {
        setAdding(false);
      }
    };

  // ---------------------------------------------------------
  // GET NUMERIC QUANTITY
  // ---------------------------------------------------------

  const getSelectedQuantityNumber =
    () => {
      if (!selectedQty?.label) {
        return 0;
      }

      // Handles:
      // "5 pcs"
      // "25 pcs"
      // "50 pcs"
      // "100 pcs"
      const match = String(
        selectedQty.label
      ).match(/\d+/);

      return match
        ? Number(match[0])
        : 0;
    };

  const selectedQuantityNumber =
    getSelectedQuantityNumber();

  // 50 PCS OR MORE = BULK
  const isBulkOrder =
    selectedQuantityNumber >=
    BULK_ORDER_THRESHOLD;

  // ---------------------------------------------------------
  // REQUEST QUOTE
  // ---------------------------------------------------------

  const handleRequestQuote = () => {
    navigation.navigate("Main", {
      screen: "InquiriesTab",
      params: {
        bulkInquiry: {
          product:
            liveProduct || product,

          quantity:
            selectedQuantityNumber,

          customizations: {
            size: selectedSize,

            material:
              selectedMaterial?.label ||
              "",

            side:
              selectedSide || "",

            finishing:
              selectedFinish || "",

            color:
              selectedColor || "",

            quantity:
              selectedQty?.label ||
              `${selectedQuantityNumber} pcs`,

            ...(activeDesign
              ? {
                  design: activeDesign,
                }
              : {}),
          },
        },
      },
    });
  };

  // ---------------------------------------------------------
  // ADD TO CART
  // ---------------------------------------------------------

  const PostCartItem = async () => {
    // NEVER allow 50+ pcs into the cart.
    if (isBulkOrder) {
      handleRequestQuote();
      return;
    }

    // -------------------------------------------------------
    // OUT OF STOCK CHECK
    // -------------------------------------------------------

    // ---------------------------------------------------------
    // STOCK CHECK
    // ---------------------------------------------------------

    const availableStock = Number(
      liveProduct?.stock ??
        product?.stock ??
        0
    );

    const requestedQuantity =
      Number(selectedQuantityNumber) || 0;

    // No stock
    if (availableStock <= 0) {
      Alert.alert(
        "Can't Add to Cart",
        `Can't add to cart: low stock (${availableStock}).`
      );
      return;
    }

    // Requested quantity is greater than available stock
    if (
      requestedQuantity >
      availableStock
    ) {
      Alert.alert(
        "Can't Add to Cart",
        `Can't add to cart: low stock (${availableStock}). You requested ${requestedQuantity}.`
      );
      return;
    }

    await executePostCartItem();
  };

  /*
   * ============================================================
   * GUEST 3D CUSTOMIZER ACCESS
   * ============================================================
   *
   * Guests are allowed to open the 3D Customizer 3 times.
   *
   * After the third use:
   *   - They cannot open the customizer anymore.
   *   - They are asked to log in/sign up.
   *
   * Logged-in users:
   *   - Have unlimited access.
   *
   * The guest usage count is stored in AsyncStorage so it
   * remains even if the app is closed and reopened.
   */

  const handleCustomizerPress =
    async () => {
      try {
        const userStr =
          await AsyncStorage.getItem(
            "user"
          );

        // --------------------------------------------------------
        // LOGGED-IN USER
        // --------------------------------------------------------

        if (userStr) {
          navigation.navigate(
            "CustomizerWebView",
            {
              product,

              selectedOptions: {
                size:
                  selectedSize,

                material:
                  selectedMaterial?.label,

                side:
                  selectedSide,

                finishing:
                  selectedFinish,

                color:
                  selectedColor,

                quantity:
                  selectedQty?.label,
              },
            }
          );

          return;
        }

        // --------------------------------------------------------
        // GUEST USER
        // --------------------------------------------------------

        const storedUses =
          await AsyncStorage.getItem(
            GUEST_CUSTOMIZER_USES_KEY
          );

        const currentUses =
          Number(
            storedUses || "0"
          );

        if (
          currentUses >=
          GUEST_CUSTOMIZER_LIMIT
        ) {
          Alert.alert(
            "3D Customizer Limit Reached",
            "You have used all 3 guest attempts for the 3D Customizer. Please log in or sign up to continue using the 3D Customizer.",
            [
              {
                text: "Cancel",
                style: "cancel",
              },
              {
                text:
                  "Log In / Sign Up",
                onPress: () =>
                  navigation.navigate(
                    "Login"
                  ),
              },
            ]
          );

          return;
        }

        // --------------------------------------------------------
        // USE ONE GUEST ATTEMPT
        // --------------------------------------------------------

        const newUses =
          currentUses + 1;

        await AsyncStorage.setItem(
          GUEST_CUSTOMIZER_USES_KEY,
          String(newUses)
        );

        const remainingUses =
          GUEST_CUSTOMIZER_LIMIT -
          newUses;

        navigation.navigate(
          "CustomizerWebView",
          {
            product,

            selectedOptions: {
              size:
                selectedSize,

              material:
                selectedMaterial?.label,

              side:
                selectedSide,

              finishing:
                selectedFinish,

              color:
                selectedColor,

              quantity:
                selectedQty?.label,
            },
          }
        );

        if (
          remainingUses > 0
        ) {
          setTimeout(() => {
            Alert.alert(
              "Guest 3D Customizer",
              `You have ${remainingUses} ${
                remainingUses === 1
                  ? "use"
                  : "uses"
              } remaining. Log in or sign up for unlimited access.`
            );
          }, 500);
        }
      } catch (error) {
        console.error(
          "[3D Customizer Access Error]",
          error
        );

        Alert.alert(
          "Error",
          "Unable to open the 3D Customizer. Please try again."
        );
      }
    };

  const imageUrl =
    product.images?.[0] ||
    "https://via.placeholder.com/300";

  const toggleDropdown = (
    id
  ) => {
    setOpenDropdown(
      openDropdown === id
        ? null
        : id
    );
  };

  return (
    <ScrollView
      style={styles.container}
    >
      <Image
        source={{
          uri: imageUrl,
        }}
        style={styles.image}
      />

      <View
        style={styles.infoContainer}
      >
        <Text style={styles.name}>
          {product.name}
        </Text>

        <Text style={styles.price}>
          ₱
          {finalTotal.toLocaleString()}
          {selectedQty?.label
            ? ` (${selectedQty.label})`
            : ""}
        </Text>

        {Number(product.stock) ===
        0 ? (
          <Text
            style={[
              styles.stock,
              {
                color:
                  COLORS.danger,
                fontWeight:
                  "800",
              },
            ]}
          >
            Out of Stock
          </Text>
        ) : (
          <Text
            style={styles.stock}
          >
            Stock:{" "}
            {product.stock ||
              "Available"}{" "}
            units
          </Text>
        )}

        <Text
          style={styles.sectionTitle}
        >
          Product Specifications
        </Text>

        {sizes.length > 0 && (
          <CustomDropdown
            label="1. Choose Size"
            options={sizes.map(
              (s) => ({
                label: s,
              })
            )}
            selected={
              selectedSize
            }
            onSelect={(val) =>
              setSelectedSize(
                val.label
              )
            }
            isOpen={
              openDropdown ===
              "size"
            }
            onToggle={() =>
              toggleDropdown(
                "size"
              )
            }
          />
        )}

        {materials.length >
          0 && (
          <CustomDropdown
            label="2. Choose Material"
            options={
              materials
            }
            selected={
              selectedMaterial?.label
            }
            onSelect={
              setSelectedMaterial
            }
            isOpen={
              openDropdown ===
              "material"
            }
            onToggle={() =>
              toggleDropdown(
                "material"
              )
            }
          />
        )}

        {sides.length > 0 && (
          <CustomDropdown
            label="3. Choose Printed Sides"
            options={sides.map(
              (s) => ({
                label: s,
              })
            )}
            selected={
              selectedSide
            }
            onSelect={(val) =>
              setSelectedSide(
                val.label
              )
            }
            isOpen={
              openDropdown ===
              "sides"
            }
            onToggle={() =>
              toggleDropdown(
                "sides"
              )
            }
          />
        )}

        {finishing.length >
          0 && (
          <CustomDropdown
            label="4. Choose Finishing"
            options={
              finishing.map(
                (f) => ({
                  label: f,
                })
              )
            }
            selected={
              selectedFinish
            }
            onSelect={(val) =>
              setSelectedFinish(
                val.label
              )
            }
            isOpen={
              openDropdown ===
              "finish"
            }
            onToggle={() =>
              toggleDropdown(
                "finish"
              )
            }
          />
        )}

        {liveProduct?.quantity_mode ===
        "text" ? (
          <View
            style={
              styles.dropdownContainer
            }
          >
            <Text
              style={
                styles.dropdownLabel
              }
            >
              5. Choose Quantity
            </Text>

            <View
              style={{
                flexDirection:
                  "row",
                alignItems:
                  "center",
              }}
            >
              <TouchableOpacity
                style={
                  styles.quantityMinusButton
                }
                onPress={() => {
                  const current =
                    parseInt(
                      customQty,
                      10
                    ) || 0;

                  const next =
                    Math.max(
                      0,
                      current - 1
                    );

                  setCustomQty(
                    String(next)
                  );

                  if (next <= 0) {
                    setSelectedQty(
                      null
                    );
                    return;
                  }

                  setSelectedQty({
                    label: `${next} pcs`,
                    price:
                      Number(product.price) *
                      next,
                  });
                }}
              >
                <Text
                  style={
                    styles.quantityButtonText
                  }
                >
                  −
                </Text>
              </TouchableOpacity>

              <TextInput
                value={
                  customQty
                }
                onChangeText={(
                  value
                ) => {
                  const numericValue =
                    value.replace(
                      /[^0-9]/g,
                      ""
                    );

                  const n =
                    parseInt(
                      numericValue,
                      10
                    ) || 0;

                  const availableStock =
                    Number(
                      liveProduct?.stock ??
                        product?.stock ??
                        0
                    );

                  if (
                    n >
                    availableStock
                  ) {
                    Alert.alert(
                      "Out of Stock",
                      `Can't add more product: only ${availableStock} units are in stock.`
                    );

                    setCustomQty(
                      String(
                        availableStock
                      )
                    );

                    if (
                      availableStock <=
                      0
                    ) {
                      setSelectedQty(
                        null
                      );
                      return;
                    }

                    setSelectedQty({
                      label: `${availableStock} pcs`,
                      price:
                        Number(
                          product.price
                        ) *
                        availableStock,
                    });

                    return;
                  }

                  setCustomQty(
                    numericValue
                  );

                  if (n <= 0) {
                    setSelectedQty(
                      null
                    );
                    return;
                  }

                  setSelectedQty({
                    label: `${n} pcs`,
                    price:
                      Number(
                        product.price
                      ) * n,
                  });
                }}
                keyboardType="numeric"
                placeholder="Qty"
                placeholderTextColor={
                  COLORS.textMuted
                }
                style={
                  styles.quantityTextInput
                }
              />

              <TouchableOpacity
                style={
                  styles.quantityPlusButton
                }
                onPress={() => {
                  const current =
                    parseInt(
                      customQty,
                      10
                    ) || 0;

                  const availableStock =
                    Number(
                      liveProduct?.stock ??
                        product?.stock ??
                        0
                    );

                  if (
                    current >=
                    availableStock
                  ) {
                    Alert.alert(
                      "Out of Stock",
                      `Can't add more product: only ${availableStock} units are in stock.`
                    );
                    return;
                  }

                  const next =
                    current + 1;

                  setCustomQty(
                    String(next)
                  );

                  setSelectedQty({
                    label: `${next} pcs`,
                    price:
                      Number(
                        product.price
                      ) * next,
                  });
                }}
              >
                <Text
                  style={
                    styles.quantityButtonText
                  }
                >
                  +
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          quantities.length >
            0 && (
            <CustomDropdown
              label="5. Choose Quantity Bundle"
              options={
                quantities
              }
              selected={
                selectedQty?.label
              }
              onSelect={
                setSelectedQty
              }
              isOpen={
                openDropdown ===
                "qty"
              }
              onToggle={() =>
                toggleDropdown(
                  "qty"
                )
              }
            />
          )
        )}

        <View
          style={
            styles.rushOrderContainer
          }
        >
          <TouchableOpacity
            style={[
              styles.rushOrderButton,
              isRushOrder &&
                styles.rushOrderButtonActive,
            ]}
            onPress={() =>
              setIsRushOrder(
                (current) =>
                  !current
              )
            }
          >
            <View
              style={
                styles.rushOrderLeft
              }
            >
              <Ionicons
                name={
                  isRushOrder
                    ? "flash"
                    : "flash-outline"
                }
                size={22}
                color={
                  isRushOrder
                    ? "#FFFFFF"
                    : COLORS.accentCyan
                }
              />

              <View
                style={
                  styles.rushOrderTextContainer
                }
              >
                <Text
                  style={[
                    styles.rushOrderTitle,
                    isRushOrder &&
                      styles.rushOrderTitleActive,
                  ]}
                >
                  Rush Order
                </Text>

                <Text
                  style={[
                    styles.rushOrderDescription,
                    isRushOrder &&
                      styles.rushOrderDescriptionActive,
                  ]}
                >
                  Priority production
                  (+20%)
                </Text>
              </View>
            </View>

            <Text
              style={[
                styles.rushOrderPrice,
                isRushOrder &&
                  styles.rushOrderPriceActive,
              ]}
            >
              {isRushOrder
                ? `+₱${rushFee.toLocaleString()}`
                : "+20%"}
            </Text>
          </TouchableOpacity>
        </View>

        <Text
          style={styles.sectionTitle}
        >
          Description
        </Text>

        <Text
          style={styles.description}
        >
          {product.description ||
            "No description available for this product."}
        </Text>

        {/* ---------------------------------------------------------
            BULK ORDER NOTICE
            50 PCS OR MORE
        --------------------------------------------------------- */}

        {isBulkOrder && (
          <View
            style={
              styles.bulkOrderCard
            }
          >
            <Ionicons
              name="information-circle-outline"
              size={24}
              color="#C99700"
            />

            <View
              style={
                styles.bulkOrderContent
              }
            >
              <Text
                style={
                  styles.bulkOrderTitle
                }
              >
                Bulk Order
              </Text>

              <Text
                style={
                  styles.bulkOrderText
                }
              >
                Your quantity is{" "}
                {
                  selectedQuantityNumber
                }{" "}
                pcs. Orders of 50
                pcs or more require
                a quote and cannot
                be added to the cart.
              </Text>

              <Text
                style={
                  styles.bulkOrderActionText
                }
              >
                Please request a
                quote for this order.
              </Text>
            </View>
          </View>
        )}

        {activeDesign && (
          <View
            style={
              styles.designAttachedCard
            }
          >
            <View
              style={
                styles.designAttachedHeader
              }
            >
              <Ionicons
                name="checkmark-circle"
                size={20}
                color={
                  COLORS.accentCyan
                }
              />

              <Text
                style={
                  styles.designAttachedTitle
                }
              >
                3D Design Attached
              </Text>
            </View>

            <Text
              style={
                styles.designAttachedDesc
              }
              numberOfLines={2}
            >
              {activeDesign.prompt
                ? `"${activeDesign.prompt}"`
                : "Custom 3D design ready"}
            </Text>

            <TouchableOpacity
              style={
                styles.removeDesignBtn
              }
              onPress={() =>
                setActiveDesign(
                  null
                )
              }
            >
              <Text
                style={
                  styles.removeDesignText
                }
              >
                Remove Design
              </Text>
            </TouchableOpacity>
          </View>
        )}

        <View
          style={
            styles.buttonContainer
          }
        >
          <TouchableOpacity
            style={[
              styles.cartButton,
              isBulkOrder &&
                styles.bulkQuoteButton,
            ]}
            onPress={
              isBulkOrder
                ? handleRequestQuote
                : PostCartItem
            }
            disabled={
              adding ||
              selectedQuantityNumber <= 0
            }
          >
            {adding ? (
              <ActivityIndicator
                color={
                  COLORS.textLight
                }
              />
            ) : (
              <Text
                style={
                  styles.buttonText
                }
              >
                {isBulkOrder
                  ? "Request a Quote"
                  : "Add to Cart"}
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={
              styles.customizerButton
            }
            onPress={
              handleCustomizerPress
            }
          >
            <Ionicons
              name="cube-outline"
              size={18}
              color={
                COLORS.textLight
              }
              style={{
                marginRight: 6,
              }}
            />

            <Text
              style={
                styles.buttonText
              }
            >
              Customize in 3D
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor:
      COLORS.lightBg,
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
    color:
      COLORS.textPrimary,
    marginBottom: 4,
  },

  price: {
    fontSize: 20,
    fontWeight: "800",
    color:
      COLORS.accentCyan,
    marginBottom: 4,
  },

  stock: {
    fontSize: 12,
    color:
      COLORS.accentGreen,
    fontWeight: "700",
    marginBottom: 16,
  },

  sectionTitle: {
    fontSize: 15,
    fontWeight: "800",
    color:
      COLORS.textPrimary,
    marginTop: 12,
    marginBottom: 10,
  },

  dropdownContainer: {
    marginBottom: 16,
  },

  dropdownLabel: {
    fontSize: 12,
    fontWeight: "700",
    color:
      COLORS.textMuted,
    marginBottom: 6,
  },

  dropdownHeader: {
    flexDirection:
      "row",
    justifyContent:
      "space-between",
    alignItems:
      "center",
    backgroundColor:
      COLORS.cardBg,
    borderWidth: 1,
    borderColor:
      COLORS.borderLight,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 8,
  },

  dropdownHeaderActive: {
    borderColor:
      COLORS.accentCyan,
    backgroundColor:
      "rgba(6, 182, 212, 0.04)",
  },

  dropdownHeaderText: {
    fontSize: 14,
    color:
      COLORS.textPrimary,
    fontWeight: "600",
  },

  dropdownList: {
    backgroundColor:
      COLORS.cardBg,
    borderWidth: 1,
    borderColor:
      COLORS.borderLight,
    borderTopWidth: 0,
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
    marginTop: -2,
    overflow: "hidden",
  },

  dropdownItem: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor:
      COLORS.borderLight,
  },

  dropdownItemLast: {
    borderBottomWidth: 0,
  },

  dropdownItemText: {
    fontSize: 14,
    color:
      COLORS.textPrimary,
  },

  dropdownItemTextActive: {
    fontWeight: "700",
    color:
      COLORS.accentCyan,
  },

  quantityMinusButton: {
    width: 48,
    height: 48,
    backgroundColor:
      "#f1f5f9",
    borderWidth: 1,
    borderColor:
      COLORS.borderLight,
    borderTopLeftRadius: 8,
    borderBottomLeftRadius: 8,
    alignItems: "center",
    justifyContent:
      "center",
  },

  quantityPlusButton: {
    width: 48,
    height: 48,
    backgroundColor:
      "#f1f5f9",
    borderWidth: 1,
    borderColor:
      COLORS.borderLight,
    borderTopRightRadius: 8,
    borderBottomRightRadius: 8,
    alignItems: "center",
    justifyContent:
      "center",
  },

  quantityButtonText: {
    fontSize: 20,
    fontWeight: "800",
    color: "#475569",
  },

  quantityTextInput: {
    width: 90,
    height: 48,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor:
      COLORS.borderLight,
    backgroundColor:
      COLORS.cardBg,
    textAlign: "center",
    fontSize: 16,
    fontWeight: "700",
    color:
      COLORS.textPrimary,
  },

  description: {
    fontSize: 13,
    color:
      COLORS.textMuted,
    lineHeight: 18,
    marginBottom: 20,
  },

  rushOrderContainer: {
    marginBottom: 16,
  },

  rushOrderButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor:
      COLORS.cardBg,
    borderWidth: 1,
    borderColor:
      COLORS.borderLight,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },

  rushOrderButtonActive: {
    backgroundColor:
      COLORS.accentCyan,
    borderColor:
      COLORS.accentCyan,
  },

  rushOrderLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },

  rushOrderTextContainer: {
    marginLeft: 10,
  },

  rushOrderTitle: {
    fontSize: 14,
    fontWeight: "800",
    color:
      COLORS.textPrimary,
  },

  rushOrderTitleActive: {
    color: "#FFFFFF",
  },

  rushOrderDescription: {
    fontSize: 12,
    color:
      COLORS.textMuted,
    marginTop: 2,
  },

  rushOrderDescriptionActive: {
    color: "#FFFFFF",
  },

  rushOrderPrice: {
    fontSize: 13,
    fontWeight: "800",
    color:
      COLORS.accentCyan,
  },

  rushOrderPriceActive: {
    color: "#FFFFFF",
  },

  // ---------------------------------------------------------
  // BULK ORDER
  // ---------------------------------------------------------

  bulkOrderCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#FFF8E1",
    borderWidth: 1,
    borderColor: "#E6C45A",
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
  },

  bulkOrderContent: {
    flex: 1,
    marginLeft: 10,
  },

  bulkOrderTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#8A6500",
    marginBottom: 4,
  },

  bulkOrderText: {
    fontSize: 13,
    lineHeight: 19,
    color: "#6B5A24",
  },

  bulkOrderActionText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#8A6500",
    marginTop: 6,
  },

  bulkQuoteButton: {
    backgroundColor: "#C99700",
  },

  buttonContainer: {
    flexDirection:
      "row",
    justifyContent:
      "space-between",
    marginBottom: 30,
  },

  cartButton: {
    backgroundColor:
      COLORS.accentCyan,
    flex: 1,
    marginRight: 8,
    paddingVertical: 14,
    borderRadius: 24,
    alignItems:
      "center",
    justifyContent:
      "center",
  },

  customizerButton: {
    backgroundColor:
      COLORS.primaryDark,
    flex: 1,
    marginLeft: 8,
    paddingVertical: 14,
    borderRadius: 24,
    flexDirection:
      "row",
    alignItems:
      "center",
    justifyContent:
      "center",
  },

  buttonText: {
    color:
      COLORS.textLight,
    fontSize: 14,
    fontWeight: "800",
  },

  designAttachedCard: {
    backgroundColor:
      COLORS.cardBg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor:
      COLORS.accentCyan,
    padding: 12,
    marginBottom: 16,
  },

  designAttachedHeader: {
    flexDirection:
      "row",
    alignItems:
      "center",
    marginBottom: 4,
  },

  designAttachedTitle: {
    color:
      COLORS.textPrimary,
    fontWeight: "800",
    fontSize: 14,
    marginLeft: 6,
  },

  designAttachedDesc: {
    color:
      COLORS.textMuted,
    fontSize: 13,
    marginBottom: 8,
  },

  removeDesignBtn: {
    alignSelf:
      "flex-start",
  },

  removeDesignText: {
    color:
      COLORS.danger,
    fontWeight: "700",
    fontSize: 12,
  },
});