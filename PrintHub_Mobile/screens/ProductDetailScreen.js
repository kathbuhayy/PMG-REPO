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
  useWindowDimensions,
} from "react-native";

import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";

import { useFonts } from "expo-font";
import {
  Poppins_400Regular,
  Poppins_500Medium,
  Poppins_600SemiBold,
  Poppins_700Bold,
} from "@expo-google-fonts/poppins";

import { BebasNeue_400Regular } from "@expo-google-fonts/bebas-neue";

import { API_BASE_URL } from "../config";
import { COLORS } from "../theme";

// ============================================================
// CONSTANTS
// ============================================================

const GUEST_CUSTOMIZER_LIMIT = 3;
const GUEST_CUSTOMIZER_USES_KEY =
  "guest_3d_customizer_uses";

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

// ============================================================
// HELPERS
// ============================================================

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

// ============================================================
// PRODUCT IMAGE HELPERS
// ============================================================

const getProductImages = (product) => {
  const rawImages = product?.images;

  if (Array.isArray(rawImages)) {
    return rawImages.filter(
      (image) =>
        typeof image === "string" &&
        image.trim().length > 0
    );
  }

  if (typeof rawImages === "string") {
    const trimmed = rawImages.trim();

    if (!trimmed) {
      return [];
    }

    try {
      const parsed = JSON.parse(trimmed);

      if (Array.isArray(parsed)) {
        return parsed.filter(
          (image) =>
            typeof image === "string" &&
            image.trim().length > 0
        );
      }

      if (
        typeof parsed === "string" &&
        parsed.trim()
      ) {
        return [parsed.trim()];
      }
    } catch (error) {
      return [trimmed];
    }
  }

  return [];
};

const getFirstProductImage = (product) => {
  const images = getProductImages(product);

  return images.length > 0
    ? images[0]
    : null;
};

const resolveImageUrl = (image) => {
  if (!image) {
    return null;
  }

  const value = String(image).trim();

  if (!value) {
    return null;
  }

  if (
    value.startsWith("http://") ||
    value.startsWith("https://")
  ) {
    return value;
  }

  return `${API_BASE_URL}${
    value.startsWith("/") ? "" : "/"
  }${value}`;
};

// ============================================================
// CUSTOM DROPDOWN
// ============================================================

const CustomDropdown = ({
  label,
  options,
  selected,
  onSelect,
  isOpen,
  onToggle,
}) => {
  return (
    <View style={styles.dropdownContainer}>
      <Text style={styles.dropdownLabel}>
        {label}
      </Text>

      <TouchableOpacity
        style={[
          styles.dropdownHeader,
          isOpen &&
            styles.dropdownHeaderActive,
        ]}
        onPress={onToggle}
        activeOpacity={0.8}
      >
        <Text
          style={styles.dropdownHeaderText}
          numberOfLines={1}
        >
          {selected ||
            "Select an option..."}
        </Text>

        <Ionicons
          name={
            isOpen
              ? "chevron-up"
              : "chevron-down"
          }
          size={20}
          color={COLORS.primary}
        />
      </TouchableOpacity>

      {isOpen && (
        <View
          style={styles.dropdownList}
        >
          {options.map((opt, index) => (
            <TouchableOpacity
              key={`${opt.label}-${index}`}
              style={[
                styles.dropdownItem,
                index ===
                  options.length - 1 &&
                  styles.dropdownItemLast,
              ]}
              onPress={() => {
                onSelect(opt);
                onToggle();
              }}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.dropdownItemText,
                  selected === opt.label &&
                    styles.dropdownItemTextActive,
                ]}
              >
                {opt.label}

                {opt.price
                  ? ` (+₱${opt.price.toLocaleString()})`
                  : ""}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
};

// ============================================================
// PRODUCT DETAIL SCREEN
// ============================================================

export default function ProductDetailScreen({
  route,
  navigation,
}) {
  const { width } =
    useWindowDimensions();

  const product =
    route?.params?.product || {};

  // ==========================================================
  // FONTS
  // ==========================================================

  const [fontsLoaded] = useFonts({
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_600SemiBold,
    Poppins_700Bold,
    BebasNeue_400Regular,
  });

  // ==========================================================
  // RESPONSIVE
  // ==========================================================

  const isSmall = width <= 360;

  const isMedium =
    width > 360 && width <= 430;

  const scale = (
    small,
    medium,
    large
  ) => {
    if (isSmall) return small;
    if (isMedium) return medium;
    return large;
  };

  // ==========================================================
  // PRODUCT STATE
  // ==========================================================

  const [liveProduct, setLiveProduct] =
    useState(product);

  const [adding, setAdding] =
    useState(false);

  const [activeDesign, setActiveDesign] =
    useState(null);

  const [customQty, setCustomQty] =
    useState("0");

  // ==========================================================
  // OPTIONS
  // ==========================================================

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

  // ==========================================================
  // SELECTED OPTIONS
  // ==========================================================

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

  const [
    selectedColor,
    setSelectedColor,
  ] = useState("");

  const [selectedQty, setSelectedQty] =
    useState(null);

  const [isRushOrder, setIsRushOrder] =
    useState(false);

  const [openDropdown, setOpenDropdown] =
    useState(null);

  // ==========================================================
  // COMPLETED 3D DESIGN
  // ==========================================================

  useEffect(() => {
    if (route?.params?.completedDesign) {
      setActiveDesign(
        route.params.completedDesign
      );
    }
  }, [
    route?.params?.completedDesign,
  ]);

  // ==========================================================
  // REFRESH PRODUCT FROM BACKEND
  // ==========================================================

  useEffect(() => {
    let mounted = true;

    const refreshProduct = async () => {
      if (!product?.id) {
        console.warn(
          "[ProductDetail] No product ID received:",
          product
        );
        return;
      }

      const url =
        `${API_BASE_URL}/api/products/${product.id}`;

      console.log(
        "[ProductDetail] Fetching product:",
        url
      );

      try {
        const controller =
          new AbortController();

        const timeout = setTimeout(
          () => {
            controller.abort();
          },
          10000
        );

        let response;

        try {
          response = await fetch(
            url,
            {
              method: "GET",
              headers: {
                Accept:
                  "application/json",
              },
              signal:
                controller.signal,
            }
          );
        } finally {
          clearTimeout(timeout);
        }

        const responseText =
          await response.text();

        console.log(
          "[ProductDetail] HTTP status:",
          response.status
        );

        console.log(
          "[ProductDetail] Response:",
          responseText
        );

        let data = null;

        try {
          data = JSON.parse(
            responseText
          );
        } catch {
          console.warn(
            "[ProductDetail] Response is not JSON."
          );
        }

        if (!response.ok) {
          throw new Error(
            data?.message ||
              `Failed to fetch product. HTTP ${response.status}`
          );
        }

        if (!data) {
          throw new Error(
            "Backend returned an empty product response."
          );
        }

        if (!mounted) {
          return;
        }

        setLiveProduct(data);

        const parsedQuantities = (
          data.quantity_options || []
        ).map(parseOptionItem);

        setQuantities(
          parsedQuantities
        );

        setSelectedQty(
          data.quantity_mode ===
            "text"
            ? null
            : parsedQuantities[0] ||
                null
        );

        if (
          data.quantity_mode ===
          "text"
        ) {
          setCustomQty("0");
        }
      } catch (error) {
        if (
          error?.name ===
          "AbortError"
        ) {
          console.warn(
            "[ProductDetail] Product request timed out:",
            url
          );
        } else {
          console.error(
            "[ProductDetail] Failed to refresh product:",
            error
          );
        }

        // Keep the product received from
        // ProductOverview if Render is sleeping
        // or temporarily unavailable.
        if (mounted) {
          setLiveProduct(
            (current) =>
              current || product
          );
        }
      }
    };

    refreshProduct();

    const unsubscribe =
      navigation.addListener(
        "focus",
        refreshProduct
      );

    return () => {
      mounted = false;

      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [
    navigation,
    product?.id,
  ]);

  // ==========================================================
  // SYNC ADMIN PRODUCT OPTIONS
  // ==========================================================

  useEffect(() => {
    if (!liveProduct) {
      return;
    }

    const parsedSizes =
      liveProduct.size_options || [
        "Standard",
      ];

    const parsedMaterials = (
      liveProduct.material_options ||
      []
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
      liveProduct.quantity_options ||
      []
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
      liveProduct.quantity_mode ===
        "text"
        ? null
        : parsedQuantities[0] ||
            null
    );
  }, [liveProduct]);

  // ==========================================================
  // DISPLAY PRODUCT
  // ==========================================================

  const displayProduct =
    liveProduct || product;

  // ==========================================================
  // BASE PRICE
  // ==========================================================

  const basePrice =
    Number(
      displayProduct?.price
    ) || 0;

  // ==========================================================
  // QUANTITY PRICE
  // ==========================================================

  const qtyPrice =
    displayProduct?.quantity_mode ===
    "text"
      ? (parseInt(customQty, 10) ||
          0) * basePrice
      : selectedQty?.price || 0;

  // ==========================================================
  // MATERIAL PRICE
  // ==========================================================

  const matPrice =
    selectedMaterial?.price || 0;

  // ==========================================================
  // SIZE PRICE
  // ==========================================================

  const normalizedSize =
    String(selectedSize || "")
      .trim()
      .toUpperCase();

  const sizePriceAdjustment =
    SIZE_PRICE_ADJUSTMENTS[
      normalizedSize
    ] || 0;

  // ==========================================================
  // QUANTITY NUMBER
  // ==========================================================

  const getSelectedQuantityNumber =
    () => {
      if (
        displayProduct?.quantity_mode ===
        "text"
      ) {
        return Math.max(
          0,
          parseInt(customQty, 10) || 0
        );
      }

      if (selectedQty?.label) {
        const match =
          String(
            selectedQty.label
          ).match(/\d+/);

        if (match) {
          return Number(match[0]);
        }
      }

      return 1;
    };

  const selectedQuantityNumber =
    getSelectedQuantityNumber();

  // ==========================================================
  // TOTALS
  // ==========================================================

  const sizeTotalAdjustment =
    sizePriceAdjustment *
    selectedQuantityNumber;

  const grandTotal =
    qtyPrice +
    matPrice +
    sizeTotalAdjustment;

  const rushFee = isRushOrder
    ? grandTotal * 0.2
    : 0;

  const finalTotal =
    grandTotal + rushFee;

  // ==========================================================
  // STOCK
  // ==========================================================

  const displayStock =
    Number(
      displayProduct?.stock
    ) || 0;

  // ==========================================================
  // BULK
  // ==========================================================

  const isBulkOrder =
    selectedQuantityNumber >=
    BULK_ORDER_THRESHOLD;

  // ==========================================================
  // ADD TO CART
  // ==========================================================

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
                style: "cancel",
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

        const currentProduct =
          liveProduct || product;

        const currentImage =
          getFirstProductImage(
            currentProduct
          );

        const customizations = {
          size: selectedSize,

          material:
            selectedMaterial?.label,

          side: selectedSide,

          finishing: selectedFinish,

          color: selectedColor,

          quantity:
            selectedQty?.label ||
            `${selectedQuantityNumber} pcs`,

          rushOrder:
            isRushOrder,

          rushFee,

          ...(activeDesign
            ? {
                design:
                  activeDesign,
              }
            : {}),
        };

        const response =
          await fetch(
            `${API_BASE_URL}/api/user/${user.id}/cart`,
            {
              method: "POST",

              headers: {
                "Content-Type":
                  "application/json",
              },

              body: JSON.stringify({
                productId:
                  currentProduct.id,

                title:
                  currentProduct.name,

                price:
                  finalTotal,

                qty: 1,

                productImage:
                  currentImage
                    ? resolveImageUrl(
                        currentImage
                      )
                    : null,

                customizations,
              }),
            }
          );

        const responseText =
          await response.text();

        let data = null;

        try {
          data =
            JSON.parse(
              responseText
            );
        } catch {
          data = null;
        }

        if (!response.ok) {
          throw new Error(
            data?.message ||
              `Failed to add to cart. HTTP ${response.status}`
          );
        }

        Alert.alert(
          "Success",
          "Added to cart with custom options!"
        );
      } catch (err) {
        console.error(
          "[ProductDetail] Add to cart error:",
          err
        );

        Alert.alert(
          "Error",
          err?.message ||
            "Failed to add product to cart."
        );
      } finally {
        setAdding(false);
      }
    };

  // ==========================================================
  // REQUEST QUOTE
  // ==========================================================

  const handleRequestQuote =
    () => {
      navigation.navigate(
        "Main",
        {
          screen:
            "InquiriesTab",

          params: {
            bulkInquiry: {
              product:
                liveProduct ||
                product,

              quantity:
                selectedQuantityNumber,

              customizations: {
                size:
                  selectedSize,

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
                      design:
                        activeDesign,
                    }
                  : {}),
              },
            },
          },
        }
      );
    };

  // ==========================================================
  // POST CART ITEM
  // ==========================================================

  const PostCartItem =
    async () => {
      if (isBulkOrder) {
        handleRequestQuote();
        return;
      }

      const availableStock =
        Number(
          displayProduct?.stock
        ) || 0;

      const requestedQuantity =
        Number(
          selectedQuantityNumber
        ) || 0;

      if (availableStock <= 0) {
        Alert.alert(
          "Can't Add to Cart",
          `Can't add to cart: low stock (${availableStock}).`
        );

        return;
      }

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

      if (
        requestedQuantity <= 0
      ) {
        Alert.alert(
          "Choose Quantity",
          "Please select a quantity before adding the product to your cart."
        );

        return;
      }

      await executePostCartItem();
    };

  // ==========================================================
  // 3D CUSTOMIZER
  // ==========================================================

  const handleCustomizerPress =
    async () => {
      try {
        const userStr =
          await AsyncStorage.getItem(
            "user"
          );

        // LOGGED IN
        if (userStr) {
          navigation.navigate(
            "CustomizerWebView",
            {
              product:
                liveProduct ||
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

        // GUEST
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
            product:
              liveProduct ||
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

  // ==========================================================
  // IMAGE
  // ==========================================================

  const imageUrl =
    resolveImageUrl(
      getFirstProductImage(
        liveProduct
      ) ||
        getFirstProductImage(
          product
        )
    );

  // ==========================================================
  // DROPDOWN
  // ==========================================================

  const toggleDropdown =
    (id) => {
      setOpenDropdown(
        openDropdown === id
          ? null
          : id
      );
    };

  // ==========================================================
  // FONT LOADING
  // ==========================================================

  if (!fontsLoaded) {
    return (
      <View
        style={styles.loadingScreen}
      >
        <ActivityIndicator
          size="large"
          color={COLORS.primary}
        />

        <Text
          style={
            styles.loadingText
          }
        >
          Loading...
        </Text>
      </View>
    );
  }

  // ==========================================================
  // UI
  // ==========================================================

  return (
    <View
      style={styles.screen}
    >
      {/* ======================================================
          HEADER
      ====================================================== */}

      <View
        style={styles.header}
      >
        <TouchableOpacity
          style={
            styles.headerBackButton
          }
          onPress={() =>
            navigation.goBack()
          }
          activeOpacity={0.8}
        >
          <Ionicons
            name="arrow-back"
            size={27}
            color={
              COLORS.white
            }
          />
        </TouchableOpacity>

        <Text
          style={styles.headerTitle}
        >
          Product Details
        </Text>

        <View
          style={
            styles.headerSpacer
          }
        />
      </View>

      {/* ======================================================
          CONTENT
      ====================================================== */}

      <ScrollView
        style={styles.container}
        contentContainerStyle={{
          paddingBottom: 35,
        }}
        showsVerticalScrollIndicator={
          false
        }
      >
        {/* PRODUCT IMAGE */}

        <View
          style={[
            styles.imageContainer,
            {
              height: scale(
                220,
                250,
                290
              ),
            },
          ]}
        >
          {imageUrl ? (
            <Image
              source={{
                uri: imageUrl,
              }}
              style={styles.image}
              resizeMode="contain"
            />
          ) : (
            <View
              style={
                styles.imageFallback
              }
            >
              <Ionicons
                name="image-outline"
                size={48}
                color={
                  COLORS.textMuted
                }
              />

              <Text
                style={
                  styles.imageFallbackText
                }
              >
                No product image
              </Text>
            </View>
          )}
        </View>

        {/* PRODUCT INFORMATION */}

        <View
          style={[
            styles.infoContainer,
            {
              paddingHorizontal:
                scale(
                  14,
                  18,
                  24
                ),
            },
          ]}
        >
          <Text
            style={[
              styles.name,
              {
                fontSize: scale(
                  22,
                  24,
                  27
                ),
              },
            ]}
          >
            {displayProduct?.name ||
              "Product"}
          </Text>

          <Text
            style={[
              styles.price,
              {
                fontSize: scale(
                  20,
                  22,
                  24
                ),
              },
            ]}
          >
            ₱
            {finalTotal.toLocaleString()}

            {selectedQty?.label
              ? ` (${selectedQty.label})`
              : ""}
          </Text>

          {/* STOCK */}

          {displayStock <= 0 ? (
            <Text
              style={[
                styles.stock,
                {
                  color:
                    COLORS.danger,
                },
              ]}
            >
              Out of Stock
            </Text>
          ) : (
            <Text
              style={styles.stock}
            >
              Stock: {displayStock} units
            </Text>
          )}

          {/* SPECIFICATIONS */}

          <Text
            style={styles.sectionTitle}
          >
            Product Specifications
          </Text>

          {/* SIZE */}

          {sizes.length > 0 && (
            <CustomDropdown
              label="1. Choose Size"
              options={sizes.map(
                (size) => ({
                  label: size,
                  price: 0,
                })
              )}
              selected={
                selectedSize
              }
              onSelect={(value) =>
                setSelectedSize(
                  value.label
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

          {/* MATERIAL */}

          {materials.length > 0 && (
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

          {/* SIDES */}

          {sides.length > 0 && (
            <CustomDropdown
              label="3. Choose Printed Sides"
              options={sides.map(
                (side) => ({
                  label: side,
                  price: 0,
                })
              )}
              selected={
                selectedSide
              }
              onSelect={(value) =>
                setSelectedSide(
                  value.label
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

          {/* FINISHING */}

          {finishing.length > 0 && (
            <CustomDropdown
              label="4. Choose Finishing"
              options={finishing.map(
                (finish) => ({
                  label: finish,
                  price: 0,
                })
              )}
              selected={
                selectedFinish
              }
              onSelect={(value) =>
                setSelectedFinish(
                  value.label
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

          {/* QUANTITY */}

          {displayProduct?.quantity_mode ===
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
                style={
                  styles.quantityRow
                }
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

                    if (
                      next <= 0
                    ) {
                      setSelectedQty(
                        null
                      );

                      return;
                    }

                    setSelectedQty({
                      label: `${next} pcs`,
                      price:
                        basePrice *
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
                  value={customQty}
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
                        displayProduct?.stock
                      ) || 0;

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
                          basePrice *
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
                        basePrice * n,
                    });
                  }}
                  keyboardType="numeric"
                  placeholder="Qty"
                  placeholderTextColor={
                    COLORS.inputPlaceholder
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
                        displayProduct?.stock
                      ) || 0;

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
                        basePrice *
                        next,
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
            quantities.length > 0 && (
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

          {/* RUSH ORDER */}

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
              activeOpacity={0.85}
            >
              <View
                style={
                  styles.rushOrderLeft
                }
              >
                <View
                  style={
                    styles.rushIconCircle
                  }
                >
                  <Ionicons
                    name={
                      isRushOrder
                        ? "flash"
                        : "flash-outline"
                    }
                    size={20}
                    color={
                      isRushOrder
                        ? COLORS.textDark
                        : COLORS.primary
                    }
                  />
                </View>

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

          {/* DESCRIPTION */}

          <Text
            style={styles.sectionTitle}
          >
            Description
          </Text>

          <Text
            style={styles.description}
          >
            {displayProduct?.description ||
              "No description available for this product."}
          </Text>

          {/* BULK ORDER */}

          {isBulkOrder && (
            <View
              style={
                styles.bulkOrderCard
              }
            >
              <Ionicons
                name="information-circle-outline"
                size={24}
                color={
                  COLORS.warning
                }
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

          {/* 3D DESIGN */}

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
                <View
                  style={
                    styles.designCheckCircle
                  }
                >
                  <Ionicons
                    name="checkmark"
                    size={15}
                    color={
                      COLORS.textDark
                    }
                  />
                </View>

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

          {/* ACTION BUTTONS */}

          <View
            style={[
              styles.buttonContainer,
              isSmall &&
                styles.buttonContainerSmall,
            ]}
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
                selectedQuantityNumber <=
                  0
              }
              activeOpacity={0.85}
            >
              {adding ? (
                <ActivityIndicator
                  color={
                    COLORS.textDark
                  }
                />
              ) : (
                <>
                  <Ionicons
                    name={
                      isBulkOrder
                        ? "chatbubble-ellipses-outline"
                        : "cart-outline"
                    }
                    size={18}
                    color={
                      COLORS.textDark
                    }
                    style={{
                      marginRight: 6,
                    }}
                  />

                  <Text
                    style={
                      styles.primaryButtonText
                    }
                  >
                    {isBulkOrder
                      ? "Request a Quote"
                      : "Add to Cart"}
                  </Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={
                styles.customizerButton
              }
              onPress={
                handleCustomizerPress
              }
              activeOpacity={0.85}
            >
              <Ionicons
                name="cube-outline"
                size={18}
                color={
                  COLORS.primary
                }
                style={{
                  marginRight: 6,
                }}
              />

              <Text
                style={
                  styles.customizerButtonText
                }
              >
                Customize in 3D
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

// ============================================================
// STYLES
// ============================================================

const styles = StyleSheet.create({
  // ==========================================================
  // SCREEN
  // ==========================================================

  screen: {
    flex: 1,
    backgroundColor:
      COLORS.background,
  },

  container: {
    flex: 1,
    backgroundColor:
      COLORS.background,
  },

  // ==========================================================
  // HEADER
  // ==========================================================

  header: {
    height: 76,
    backgroundColor:
      COLORS.backgroundDeep,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor:
      COLORS.border,
  },

  headerBackButton: {
    width: 46,
    height: 46,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 23,
  },

  headerTitle: {
    flex: 1,
    textAlign: "center",
    fontFamily:
      "Poppins_700Bold",
    fontSize: 21,
    color:
      COLORS.textPrimary,
  },

  headerSpacer: {
    width: 46,
    height: 46,
  },

  // ==========================================================
  // LOADING
  // ==========================================================

  loadingScreen: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor:
      COLORS.background,
  },

  loadingText: {
    marginTop: 10,
    fontFamily:
      "Poppins_500Medium",
    fontSize: 13,
    color:
      COLORS.textSecondary,
  },

  // ==========================================================
  // IMAGE
  // ==========================================================

  imageContainer: {
    width: "100%",
    backgroundColor:
      COLORS.white,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },

  image: {
    width: "100%",
    height: "100%",
  },

  imageFallback: {
    flex: 1,
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor:
      COLORS.surfaceDark,
  },

  imageFallbackText: {
    marginTop: 8,
    fontFamily:
      "Poppins_500Medium",
    fontSize: 12,
    color:
      COLORS.textMuted,
  },

  // ==========================================================
  // INFORMATION
  // ==========================================================

  infoContainer: {
    paddingTop: 18,
    paddingBottom: 25,
  },

  name: {
    fontFamily:
      "Poppins_700Bold",
    color:
      COLORS.textPrimary,
    marginBottom: 4,
  },

  price: {
    fontFamily:
      "Poppins_700Bold",
    color:
      COLORS.primary,
    marginBottom: 4,
  },

  stock: {
    fontFamily:
      "Poppins_600SemiBold",
    fontSize: 12,
    color:
      COLORS.success,
    marginBottom: 18,
  },

  sectionTitle: {
    fontFamily:
      "Poppins_700Bold",
    fontSize: 16,
    color:
      COLORS.textPrimary,
    marginTop: 12,
    marginBottom: 11,
  },

  description: {
    fontFamily:
      "Poppins_400Regular",
    fontSize: 13,
    color:
      COLORS.textSecondary,
    lineHeight: 21,
    marginBottom: 20,
  },

  // ==========================================================
  // DROPDOWNS
  // ==========================================================

  dropdownContainer: {
    marginBottom: 16,
  },

  dropdownLabel: {
    fontFamily:
      "Poppins_600SemiBold",
    fontSize: 12,
    color:
      COLORS.textSecondary,
    marginBottom: 7,
  },

  dropdownHeader: {
    minHeight: 50,
    flexDirection: "row",
    justifyContent:
      "space-between",
    alignItems: "center",
    backgroundColor:
      COLORS.surfaceDark,
    borderWidth: 1,
    borderColor:
      COLORS.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 10,
  },

  dropdownHeaderActive: {
    borderColor:
      COLORS.primary,
    backgroundColor:
      "rgba(182, 255, 0, 0.05)",
  },

  dropdownHeaderText: {
    flex: 1,
    marginRight: 10,
    fontFamily:
      "Poppins_500Medium",
    fontSize: 14,
    color:
      COLORS.textPrimary,
  },

  dropdownList: {
    backgroundColor:
      COLORS.surfaceDark,
    borderWidth: 1,
    borderColor:
      COLORS.border,
    borderTopWidth: 0,
    borderBottomLeftRadius: 10,
    borderBottomRightRadius: 10,
    marginTop: -2,
    overflow: "hidden",
  },

  dropdownItem: {
    paddingHorizontal: 14,
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor:
      COLORS.borderDark,
  },

  dropdownItemLast: {
    borderBottomWidth: 0,
  },

  dropdownItemText: {
    fontFamily:
      "Poppins_400Regular",
    fontSize: 14,
    color:
      COLORS.textSecondary,
  },

  dropdownItemTextActive: {
    fontFamily:
      "Poppins_700Bold",
    color:
      COLORS.primary,
  },

  // ==========================================================
  // QUANTITY
  // ==========================================================

  quantityRow: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
  },

  quantityMinusButton: {
    width: 50,
    height: 50,
    backgroundColor:
      COLORS.surfaceDark,
    borderWidth: 1,
    borderColor:
      COLORS.border,
    borderTopLeftRadius: 10,
    borderBottomLeftRadius: 10,
    alignItems: "center",
    justifyContent:
      "center",
  },

  quantityPlusButton: {
    width: 50,
    height: 50,
    backgroundColor:
      COLORS.surfaceDark,
    borderWidth: 1,
    borderColor:
      COLORS.border,
    borderTopRightRadius: 10,
    borderBottomRightRadius: 10,
    alignItems: "center",
    justifyContent:
      "center",
  },

  quantityButtonText: {
    fontFamily:
      "Poppins_700Bold",
    fontSize: 21,
    color:
      COLORS.primary,
  },

  quantityTextInput: {
    flex: 1,
    maxWidth: 130,
    height: 50,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor:
      COLORS.border,
    backgroundColor:
      COLORS.inputBackground,
    textAlign: "center",
    fontFamily:
      "Poppins_700Bold",
    fontSize: 16,
    color:
      COLORS.textPrimary,
  },

  // ==========================================================
  // RUSH ORDER
  // ==========================================================

  rushOrderContainer: {
    marginBottom: 18,
  },

  rushOrderButton: {
    minHeight: 70,
    flexDirection: "row",
    alignItems: "center",
    justifyContent:
      "space-between",
    backgroundColor:
      COLORS.surfaceDark,
    borderWidth: 1,
    borderColor:
      COLORS.border,
    borderRadius: 13,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },

  rushOrderButtonActive: {
    backgroundColor:
      COLORS.primary,
    borderColor:
      COLORS.primary,
  },

  rushOrderLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },

  rushIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor:
      "rgba(182,255,0,0.10)",
    alignItems: "center",
    justifyContent:
      "center",
  },

  rushOrderTextContainer: {
    marginLeft: 10,
    flex: 1,
  },

  rushOrderTitle: {
    fontFamily:
      "Poppins_700Bold",
    fontSize: 14,
    color:
      COLORS.textPrimary,
  },

  rushOrderTitleActive: {
    color:
      COLORS.textDark,
  },

  rushOrderDescription: {
    fontFamily:
      "Poppins_400Regular",
    fontSize: 12,
    color:
      COLORS.textMuted,
    marginTop: 2,
  },

  rushOrderDescriptionActive: {
    color:
      COLORS.textDark,
  },

  rushOrderPrice: {
    fontFamily:
      "Poppins_700Bold",
    fontSize: 13,
    color:
      COLORS.primary,
  },

  rushOrderPriceActive: {
    color:
      COLORS.textDark,
  },

  // ==========================================================
  // BULK ORDER
  // ==========================================================

  bulkOrderCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor:
      "rgba(245,158,11,0.10)",
    borderWidth: 1,
    borderColor:
      "rgba(245,158,11,0.35)",
    borderRadius: 13,
    padding: 14,
    marginBottom: 17,
  },

  bulkOrderContent: {
    flex: 1,
    marginLeft: 10,
  },

  bulkOrderTitle: {
    fontFamily:
      "Poppins_700Bold",
    fontSize: 15,
    color:
      COLORS.warning,
    marginBottom: 4,
  },

  bulkOrderText: {
    fontFamily:
      "Poppins_400Regular",
    fontSize: 13,
    lineHeight: 19,
    color:
      "rgba(255,255,255,0.72)",
  },

  bulkOrderActionText: {
    fontFamily:
      "Poppins_700Bold",
    fontSize: 13,
    color:
      COLORS.warning,
    marginTop: 6,
  },

  bulkQuoteButton: {
    backgroundColor:
      COLORS.warning,
  },

  // ==========================================================
  // 3D DESIGN
  // ==========================================================

  designAttachedCard: {
    backgroundColor:
      COLORS.surfaceDark,
    borderRadius: 13,
    borderWidth: 1,
    borderColor:
      COLORS.primary,
    padding: 13,
    marginBottom: 17,
  },

  designAttachedHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 5,
  },

  designCheckCircle: {
    width: 23,
    height: 23,
    borderRadius: 12,
    backgroundColor:
      COLORS.primary,
    alignItems: "center",
    justifyContent:
      "center",
  },

  designAttachedTitle: {
    fontFamily:
      "Poppins_700Bold",
    color:
      COLORS.textPrimary,
    fontSize: 14,
    marginLeft: 7,
  },

  designAttachedDesc: {
    fontFamily:
      "Poppins_400Regular",
    color:
      COLORS.textSecondary,
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 8,
  },

  removeDesignBtn: {
    alignSelf:
      "flex-start",
  },

  removeDesignText: {
    fontFamily:
      "Poppins_700Bold",
    color:
      COLORS.danger,
    fontSize: 12,
  },

  // ==========================================================
  // BUTTONS
  // ==========================================================

  buttonContainer: {
    flexDirection: "row",
    justifyContent:
      "space-between",
    marginTop: 5,
    marginBottom: 12,
  },

  buttonContainerSmall: {
    flexDirection: "column",
  },

  cartButton: {
    minHeight: 52,
    backgroundColor:
      COLORS.primary,
    flex: 1,
    marginRight: 6,
    paddingHorizontal: 10,
    paddingVertical: 14,
    borderRadius: 26,
    alignItems: "center",
    justifyContent:
      "center",
    flexDirection: "row",
  },

  customizerButton: {
    minHeight: 52,
    backgroundColor:
      COLORS.surfaceDark,
    flex: 1,
    marginLeft: 6,
    paddingHorizontal: 10,
    paddingVertical: 14,
    borderRadius: 26,
    borderWidth: 1,
    borderColor:
      COLORS.borderStrong,
    flexDirection: "row",
    alignItems: "center",
    justifyContent:
      "center",
  },

  primaryButtonText: {
    fontFamily:
      "Poppins_700Bold",
    color:
      COLORS.textDark,
    fontSize: 13,
    textAlign: "center",
  },

  customizerButtonText: {
    fontFamily:
      "Poppins_700Bold",
    color:
      COLORS.primary,
    fontSize: 13,
    textAlign: "center",
  },
});