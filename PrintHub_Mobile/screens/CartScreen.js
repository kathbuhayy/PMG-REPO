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
  Dimensions,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useIsFocused } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { API_BASE_URL } from "../config";
import { COLORS } from "../theme";

const { width: SCREEN_WIDTH } =
  Dimensions.get("window");

const isSmallDevice =
  SCREEN_WIDTH <= 360;

const isMediumDevice =
  SCREEN_WIDTH > 360 &&
  SCREEN_WIDTH <= 430;

const scale = (size) => {
  if (isSmallDevice) {
    return size * 0.88;
  }

  if (isMediumDevice) {
    return size * 0.95;
  }

  return size;
};

export default function CartScreen({
  navigation,
}) {
  const insets = useSafeAreaInsets();
  const [user, setUser] = useState(null);
  const [cartItems, setCartItems] =
    useState([]);
  const [selectedItemIds, setSelectedItemIds] =
    useState([]);
  const [loading, setLoading] =
    useState(true);
  const [refreshing, setRefreshing] =
    useState(false);

  const isFocused = useIsFocused();

  /*
   * ==========================================================
   * AUTO SELECT ALL ITEMS WHEN CART LOADS
   * ==========================================================
   */

  useEffect(() => {
    if (
      cartItems.length > 0 &&
      selectedItemIds.length === 0
    ) {
      setSelectedItemIds(
        cartItems.map(
          (item) => item.id
        )
      );
    }
  }, [cartItems]);

  /*
   * ==========================================================
   * SELECTION
   * ==========================================================
   */

  const toggleSelection = (id) => {
    setSelectedItemIds((prev) =>
      prev.includes(id)
        ? prev.filter(
          (itemId) =>
            itemId !== id
        )
        : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (
      selectedItemIds.length ===
      cartItems.length
    ) {
      setSelectedItemIds([]);
    } else {
      setSelectedItemIds(
        cartItems.map(
          (item) => item.id
        )
      );
    }
  };

  /*
   * ==========================================================
   * CLEAR SELECTED
   * ==========================================================
   */

  const clearSelected = () => {
    if (
      selectedItemIds.length === 0
    ) {
      return;
    }

    Alert.alert(
      "Remove Selected Items",
      "Are you sure you want to remove the selected items from your cart?",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            try {
              for (
                const itemId of selectedItemIds
              ) {
                await fetch(
                  `${API_BASE_URL}/api/user/${user.id}/cart/${itemId}`,
                  {
                    method:
                      "DELETE",
                  }
                );
              }

              setSelectedItemIds(
                []
              );

              await GetCartItems(
                user.id
              );
            } catch (error) {
              console.error(
                "Clear selected cart error:",
                error
              );

              Alert.alert(
                "Error",
                "Unable to remove selected items."
              );
            }
          },
        },
      ]
    );
  };

  /*
   * ==========================================================
   * USER
   * ==========================================================
   */

  const CheckUserStatus =
    async () => {
      try {
        const userStr =
          await AsyncStorage.getItem(
            "user"
          );

        if (userStr) {
          const parsedUser =
            JSON.parse(userStr);

          setUser(parsedUser);

          await GetCartItems(
            parsedUser.id
          );
        } else {
          setUser(null);
          setCartItems([]);
          setSelectedItemIds([]);
          setLoading(false);
        }
      } catch (err) {
        console.error(
          "[CheckUserStatus] {ReadStorage}: " +
          err.message
        );

        setLoading(false);
      }
    };

  /*
   * ==========================================================
   * GET CART
   * ==========================================================
   */

  const GetCartItems =
    async (userId) => {
      try {
        if (!refreshing) {
          setLoading(true);
        }

        const response =
          await fetch(
            `${API_BASE_URL}/api/user/${userId}/cart`
          );

        const data =
          await response.json();

        if (!response.ok) {
          throw new Error(
            data.message ||
            "Failed to load cart"
          );
        }

        setCartItems(
          data || []
        );
      } catch (err) {
        console.error(
          "[GetCartItems] {FetchCartList}: " +
          err.message
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    };

  /*
   * ==========================================================
   * REFRESH
   * ==========================================================
   */

  const onRefresh = () => {
    if (!user) {
      return;
    }

    setRefreshing(true);

    GetCartItems(
      user.id
    );
  };

  useEffect(() => {
    if (isFocused) {
      CheckUserStatus();
    }
  }, [isFocused]);

  /*
   * ==========================================================
   * UPDATE QUANTITY
   * ==========================================================
   */

  const PatchCartItem = async (
    itemId,
    newQty
  ) => {
    if (
      !user ||
      newQty < 1
    ) {
      return;
    }

    try {
      const response =
        await fetch(
          `${API_BASE_URL}/api/user/${user.id}/cart/${itemId}`,
          {
            method: "PATCH",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              qty: newQty,
            }),
          }
        );

      const data =
        await response
          .json()
          .catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          data.message ||
          "Failed to update quantity"
        );
      }

      await GetCartItems(
        user.id
      );
    } catch (err) {
      console.error(
        "[PatchCartItem] {UpdateCartQty}: " +
        err.message
      );

      Alert.alert(
        "Error",
        err.message
      );
    }
  };

  /*
   * ==========================================================
   * DELETE ITEM
   * ==========================================================
   */

  const DeleteCartItem =
    async (itemId) => {
      if (!user) {
        return;
      }

      try {
        const response =
          await fetch(
            `${API_BASE_URL}/api/user/${user.id}/cart/${itemId}`,
            {
              method: "DELETE",
            }
          );

        const data =
          await response
            .json()
            .catch(() => ({}));

        if (!response.ok) {
          throw new Error(
            data.message ||
            "Failed to delete cart item"
          );
        }

        setSelectedItemIds(
          (prev) =>
            prev.filter(
              (id) =>
                id !== itemId
            )
        );

        await GetCartItems(
          user.id
        );
      } catch (err) {
        console.error(
          "[DeleteCartItem] {DeleteCart}: " +
          err.message
        );

        Alert.alert(
          "Error",
          err.message
        );
      }
    };

  /*
   * ==========================================================
   * TOTAL
   * ==========================================================
   */

  const calculateTotal =
    () => {
      return cartItems
        .filter((item) =>
          selectedItemIds.includes(
            item.id
          )
        )
        .reduce(
          (
            sum,
            item
          ) =>
            sum +
            Number(
              item.price || 0
            ) *
            Number(
              item.qty || 0
            ),
          0
        );
    };

  /*
   * ==========================================================
   * STOCK
   * ==========================================================
   */

  const getAvailableStock =
    (item) => {
      const stock =
        item?.stock ??
        item?.product?.stock ??
        null;

      if (
        stock === null ||
        stock === undefined ||
        stock === ""
      ) {
        return null;
      }

      const parsed =
        Number(stock);

      return Number.isFinite(
        parsed
      )
        ? parsed
        : null;
    };

  /*
   * ==========================================================
   * SELECTED COUNT
   * ==========================================================
   */

  const selectedCount =
    selectedItemIds.length;

  const allSelected =
    cartItems.length > 0 &&
    selectedCount ===
    cartItems.length;

  /*
   * ==========================================================
   * OUT OF STOCK
   * ==========================================================
   */

  const hasOosItem =
    cartItems
      .filter((item) =>
        selectedItemIds.includes(
          item.id
        )
      )
      .some((item) => {
        const stock =
          getAvailableStock(
            item
          );

        if (stock === null) {
          return false;
        }

        return (
          stock <
          Number(
            item.qty || 0
          )
        );
      });

  /*
   * ==========================================================
   * PRODUCT CARD
   * ==========================================================
   */

  const renderCartItem =
    ({ item }) => {
      const imageUrl =
        item.productImage ||
        item.product
          ?.images?.[0] ||
        "https://via.placeholder.com/100";

      const finishVal =
        item.customizations
          ?.finishing ||
        item.customizations
          ?.finish;

      const details =
        item.customizations
          ? [
            item
              .customizations
              .quantity &&
            `Qty: ${item.customizations.quantity}`,

            item
              .customizations
              .size &&
            `Size: ${item.customizations.size}`,

            item
              .customizations
              .material &&
            `Mat: ${item.customizations.material}`,

            finishVal &&
            `Fin: ${finishVal}`,

            item
              .customizations
              .side &&
            `Side: ${item.customizations.side}`,

            item
              .customizations
              .color &&
            `Color: ${item.customizations.color}`,
          ]
            .filter(Boolean)
            .join(" · ")
          : "";

      const availableStock =
        getAvailableStock(
          item
        );

      const isOutOfStock =
        availableStock !==
        null &&
        availableStock <
        Number(
          item.qty || 0
        );

      const isSelected =
        selectedItemIds.includes(
          item.id
        );

      return (
        <View
          style={[
            styles.card,
            isOutOfStock &&
            styles.cardOutOfStock,
          ]}
        >
          {/* ==================================================
              CARD TOP
          ================================================== */}

          <View
            style={
              styles.cardContent
            }
          >
            {/* CHECKBOX */}

            <TouchableOpacity
              style={
                styles.checkboxArea
              }
              onPress={() =>
                toggleSelection(
                  item.id
                )
              }
              activeOpacity={0.8}
            >
              <View
                style={[
                  styles.checkbox,
                  isSelected &&
                  styles.checkboxSelected,
                ]}
              >
                {isSelected && (
                  <Ionicons
                    name="checkmark"
                    size={16}
                    color="#FFFFFF"
                  />
                )}
              </View>
            </TouchableOpacity>

            {/* IMAGE */}

            <View
              style={
                styles.imageWrapper
              }
            >
              <Image
                source={{
                  uri: imageUrl,
                }}
                style={
                  styles.itemImage
                }
                resizeMode="contain"
              />
            </View>

            {/* DETAILS */}

            <View
              style={
                styles.detailsContainer
              }
            >
              {/* TITLE + MENU */}

              <View
                style={
                  styles.titleRow
                }
              >
                <Text
                  style={
                    styles.title
                  }
                  numberOfLines={1}
                >
                  {item.title ||
                    item.name ||
                    "Product"}
                </Text>

                <TouchableOpacity
                  style={
                    styles.moreButton
                  }
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name="ellipsis-vertical"
                    size={19}
                    color="#202420"
                  />
                </TouchableOpacity>
              </View>

              {/* CUSTOMIZATION DETAILS */}

              {!!details && (
                <Text
                  style={
                    styles.detailsText
                  }
                  numberOfLines={
                    isSmallDevice
                      ? 3
                      : 4
                  }
                >
                  {details}
                </Text>
              )}

              {/* DESIGN BADGE */}

              {item
                .customizations
                ?.design && (
                  <View
                    style={
                      styles.designBadge
                    }
                  >
                    <Ionicons
                      name="cube-outline"
                      size={12}
                      color="#176B3A"
                    />

                    <Text
                      style={
                        styles.designBadgeText
                      }
                    >
                      3D Design Attached
                    </Text>
                  </View>
                )}

              {/* PRICE */}

              <Text
                style={
                  styles.price
                }
              >
                ₱
                {Number(
                  item.price || 0
                ).toFixed(2)}
              </Text>

              {/* ACTIONS */}

              <View
                style={
                  styles.actions
                }
              >
                {/* QUANTITY */}

                <View
                  style={
                    styles.qtyContainer
                  }
                >
                  <TouchableOpacity
                    style={
                      styles.qtyBtn
                    }
                    onPress={() =>
                      PatchCartItem(
                        item.id,
                        Number(
                          item.qty
                        ) - 1
                      )
                    }
                    activeOpacity={
                      0.7
                    }
                  >
                    <Text
                      style={
                        styles.qtyText
                      }
                    >
                      −
                    </Text>
                  </TouchableOpacity>

                  <View
                    style={
                      styles.qtyValueWrapper
                    }
                  >
                    <Text
                      style={
                        styles.qtyVal
                      }
                    >
                      {item.qty}
                    </Text>
                  </View>

                  <TouchableOpacity
                    style={
                      styles.qtyBtn
                    }
                    onPress={async () => {
                      const stock =
                        getAvailableStock(
                          item
                        );

                      const newQty =
                        Number(
                          item.qty
                        ) + 1;

                      if (
                        stock !==
                        null &&
                        newQty >
                        stock
                      ) {
                        Alert.alert(
                          "Stock Limit",
                          `Only ${stock} item${stock ===
                            1
                            ? ""
                            : "s"
                          } available.`
                        );

                        return;
                      }

                      await PatchCartItem(
                        item.id,
                        newQty
                      );
                    }}
                    activeOpacity={
                      0.7
                    }
                  >
                    <Text
                      style={
                        styles.qtyText
                      }
                    >
                      +
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* REMOVE */}

                <TouchableOpacity
                  style={
                    styles.deleteBtn
                  }
                  onPress={() =>
                    DeleteCartItem(
                      item.id
                    )
                  }
                  activeOpacity={
                    0.7
                  }
                >
                  <Ionicons
                    name="trash-outline"
                    size={19}
                    color="#E5484D"
                  />

                  <Text
                    style={
                      styles.deleteBtnText
                    }
                  >
                    Remove
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* ==================================================
              STOCK STATUS
          ================================================== */}

          <View
            style={[
              styles.stockBar,
              isOutOfStock &&
              styles.stockBarOut,
            ]}
          >
            <View
              style={
                styles.stockLeft
              }
            >
              <View
                style={[
                  styles.stockIcon,
                  isOutOfStock &&
                  styles.stockIconOut,
                ]}
              >
                <Ionicons
                  name={
                    isOutOfStock
                      ? "alert-circle-outline"
                      : "cube-outline"
                  }
                  size={17}
                  color={
                    isOutOfStock
                      ? "#E5484D"
                      : "#176B3A"
                  }
                />
              </View>

              <Text
                style={[
                  styles.stockStatus,
                  isOutOfStock &&
                  styles.stockStatusOut,
                ]}
              >
                {isOutOfStock
                  ? "Out of Stock"
                  : "In Stock"}
              </Text>
            </View>

            <Text
              style={
                styles.stockAvailable
              }
            >
              {availableStock !==
                null
                ? isOutOfStock
                  ? `${availableStock} available`
                  : `${availableStock} available`
                : "Available"}
            </Text>
          </View>
        </View>
      );
    };

  /*
   * ==========================================================
   * NOT LOGGED IN
   * ==========================================================
   */

  if (!user) {
    return (
      <View
        style={styles.center}
      >
        <View
          style={
            styles.emptyIconCircle
          }
        >
          <Ionicons
            name="cart-outline"
            size={scale(42)}
            color="#176B3A"
          />
        </View>

        <Text
          style={
            styles.emptyTitle
          }
        >
          Your Cart
        </Text>

        <Text
          style={
            styles.infoText
          }
        >
          Log in to manage your
          cart and placed orders.
        </Text>

        <TouchableOpacity
          style={
            styles.primaryButton
          }
          onPress={() =>
            navigation.navigate(
              "Login"
            )
          }
          activeOpacity={0.85}
        >
          <Text
            style={
              styles.primaryButtonText
            }
          >
            Log In Now
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  /*
   * ==========================================================
   * LOADING
   * ==========================================================
   */

  if (
    loading &&
    cartItems.length === 0
  ) {
    return (
      <View
        style={styles.center}
      >
        <ActivityIndicator
          size="large"
          color="#176B3A"
        />

        <Text
          style={
            styles.loadingText
          }
        >
          Loading cart...
        </Text>
      </View>
    );
  }

  /*
   * ==========================================================
   * MAIN
   * ==========================================================
   */

  return (
    <View
      style={styles.container}
    >
      {/* ====================================================
          HEADER
      ==================================================== */}

      <View
        style={
          styles.header
        }
      >
        <View
          style={[
            styles.header,
            {
              paddingTop: insets.top + scale(8),
            },
          ]}
        >
          <TouchableOpacity
            style={
              styles.backButton
            }
            onPress={() =>
              navigation.navigate(
                "Main",
                {
                  screen:
                    "CatalogTab",
                }
              )
            }
            activeOpacity={0.75}
          >
            <Ionicons
              name="chevron-back"
              size={25}
              color="#101310"
            />
          </TouchableOpacity>

          <View>
            <Text
              style={
                styles.headerTitle
              }
            >
              My Cart
            </Text>

            <Text
              style={
                styles.headerSubtitle
              }
            >
              {selectedCount}{" "}
              {selectedCount ===
                1
                ? "item"
                : "items"}{" "}
              selected
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={[
            styles.clearButton,
            selectedCount ===
            0 &&
            styles.clearButtonDisabled,
          ]}
          disabled={
            selectedCount ===
            0
          }
          onPress={
            clearSelected
          }
          activeOpacity={0.8}
        >
          <Ionicons
            name="trash-outline"
            size={18}
            color={
              selectedCount ===
                0
                ? "#AEB5AE"
                : "#E5484D"
            }
          />

          <Text
            style={[
              styles.clearButtonText,
              selectedCount ===
              0 &&
              styles.clearButtonTextDisabled,
            ]}
          >
            Clear Selected
          </Text>
        </TouchableOpacity>
      </View>

      {/* ====================================================
          EMPTY CART
      ==================================================== */}

      {cartItems.length ===
        0 ? (
        <View
          style={
            styles.emptyContainer
          }
        >
          <View
            style={
              styles.emptyCartCircle
            }
          >
            <Ionicons
              name="cart-outline"
              size={55}
              color="#176B3A"
            />
          </View>

          <Text
            style={
              styles.emptyCartTitle
            }
          >
            Your Cart is Empty
          </Text>

          <Text
            style={
              styles.emptyCartText
            }
          >
            You haven't added
            anything to your cart
            yet.
          </Text>

          <TouchableOpacity
            style={
              styles.browseButtonLarge
            }
            onPress={() =>
              navigation.navigate(
                "Main",
                {
                  screen:
                    "CatalogTab",
                }
              )
            }
            activeOpacity={0.85}
          >
            <Text
              style={
                styles.browseButtonLargeText
              }
            >
              Browse Products
            </Text>

            <Ionicons
              name="arrow-forward"
              size={19}
              color="#FFFFFF"
            />
          </TouchableOpacity>
        </View>
      ) : (
        <>
          {/* ==================================================
              CART LIST
          ================================================== */}

          <FlatList
            data={cartItems}
            renderItem={
              renderCartItem
            }
            keyExtractor={(item) =>
              item.id.toString()
            }
            contentContainerStyle={
              styles.list
            }
            showsVerticalScrollIndicator={
              false
            }
            refreshControl={
              <RefreshControl
                refreshing={
                  refreshing
                }
                onRefresh={
                  onRefresh
                }
                tintColor="#176B3A"
              />
            }
            ListHeaderComponent={
              <View
                style={
                  styles.listHeader
                }
              >
                <View>
                  <Text
                    style={
                      styles.listHeaderTitle
                    }
                  >
                    Cart Items
                  </Text>

                  <Text
                    style={
                      styles.listHeaderSubtitle
                    }
                  >
                    Review your
                    products before
                    checkout
                  </Text>
                </View>

                <TouchableOpacity
                  style={
                    styles.selectAllSmall
                  }
                  onPress={
                    toggleSelectAll
                  }
                  activeOpacity={
                    0.75
                  }
                >
                  <View
                    style={[
                      styles.smallCheckbox,
                      allSelected &&
                      styles.smallCheckboxSelected,
                    ]}
                  >
                    {allSelected && (
                      <Ionicons
                        name="checkmark"
                        size={12}
                        color="#FFFFFF"
                      />
                    )}
                  </View>

                  <Text
                    style={
                      styles.selectAllSmallText
                    }
                  >
                    Select All
                  </Text>
                </TouchableOpacity>
              </View>
            }
            ListFooterComponent={
              <TouchableOpacity
                style={
                  styles.needMoreCard
                }
                onPress={() =>
                  navigation.navigate(
                    "Main",
                    {
                      screen:
                        "CatalogTab",
                    }
                  )
                }
                activeOpacity={0.85}
              >
                <View
                  style={
                    styles.needMoreIcon
                  }
                >
                  <Ionicons
                    name="bulb-outline"
                    size={26}
                    color="#176B3A"
                  />
                </View>

                <View
                  style={
                    styles.needMoreContent
                  }
                >
                  <Text
                    style={
                      styles.needMoreTitle
                    }
                  >
                    Need something else?
                  </Text>

                  <Text
                    style={
                      styles.needMoreText
                    }
                  >
                    Go back to the
                    catalog and add
                    more products to
                    your cart.
                  </Text>
                </View>

                <View
                  style={
                    styles.browseButton
                  }
                >
                  <Text
                    style={
                      styles.browseButtonText
                    }
                  >
                    Browse Products
                  </Text>

                  <Ionicons
                    name="chevron-forward"
                    size={18}
                    color="#176B3A"
                  />
                </View>
              </TouchableOpacity>
            }
          />

          {/* ==================================================
              BOTTOM CHECKOUT PANEL
          ================================================== */}

          <View
            style={
              styles.checkoutPanel
            }
          >
            {/* TOP ROW */}

            <View
              style={
                styles.checkoutTopRow
              }
            >
              <TouchableOpacity
                style={
                  styles.selectAllArea
                }
                onPress={
                  toggleSelectAll
                }
                activeOpacity={
                  0.8
                }
              >
                <View
                  style={[
                    styles.checkoutCheckbox,
                    allSelected &&
                    styles.checkoutCheckboxSelected,
                  ]}
                >
                  {allSelected && (
                    <Ionicons
                      name="checkmark"
                      size={17}
                      color="#FFFFFF"
                    />
                  )}
                </View>

                <View>
                  <Text
                    style={
                      styles.selectAllTitle
                    }
                  >
                    Select All
                  </Text>

                  <Text
                    style={
                      styles.selectAllSubtitle
                    }
                  >
                    {selectedCount}{" "}
                    {selectedCount ===
                      1
                      ? "item"
                      : "items"}{" "}
                    selected
                  </Text>
                </View>
              </TouchableOpacity>

              <View
                style={
                  styles.totalContainer
                }
              >
                <Text
                  style={
                    styles.totalLabel
                  }
                >
                  Total Amount
                </Text>

                <Text
                  style={
                    styles.totalValue
                  }
                >
                  ₱
                  {calculateTotal().toFixed(
                    2
                  )}
                </Text>
              </View>
            </View>

            {/* WARNING */}

            {hasOosItem && (
              <View
                style={
                  styles.warningBox
                }
              >
                <Ionicons
                  name="warning-outline"
                  size={18}
                  color="#E5484D"
                />

                <Text
                  style={
                    styles.warningText
                  }
                >
                  One or more selected
                  items are out of
                  stock. Remove them
                  to proceed.
                </Text>
              </View>
            )}

            {/* CHECKOUT BUTTON */}

            <TouchableOpacity
              style={[
                styles.checkoutBtn,
                (
                  hasOosItem ||
                  selectedCount ===
                  0
                ) &&
                styles.checkoutBtnDisabled,
              ]}
              disabled={
                hasOosItem ||
                selectedCount ===
                0
              }
              onPress={() => {
                if (
                  selectedItemIds.length ===
                  0
                ) {
                  Alert.alert(
                    "No Items Selected",
                    "Please select at least one item to proceed to checkout."
                  );

                  return;
                }

                navigation.navigate(
                  "Payment",
                  {
                    total:
                      calculateTotal(),

                    items:
                      cartItems.filter(
                        (
                          item
                        ) =>
                          selectedItemIds.includes(
                            item.id
                          )
                      ),
                  }
                );
              }}
              activeOpacity={0.85}
            >
              <Ionicons
                name="card-outline"
                size={20}
                color={
                  hasOosItem ||
                    selectedCount ===
                    0
                    ? "#8B918B"
                    : "#FFFFFF"
                }
                style={
                  styles.checkoutIcon
                }
              />

              <Text
                style={[
                  styles.checkoutText,
                  !hasOosItem &&
                  selectedCount >
                  0 &&
                  styles.checkoutTextEnabled,
                ]}
              >
                Proceed to Payment
              </Text>
            </TouchableOpacity>
          </View>
        </>
      )}
    </View>
  );
}

/*
 * ============================================================
 * STYLES
 * ============================================================
 */

const styles =
  StyleSheet.create({
    /*
     * ========================================================
     * MAIN
     * ========================================================
     */

    container: {
      flex: 1,
      backgroundColor:
        "#F4F7F4",
    },

    /*
     * ========================================================
     * HEADER
     * ========================================================
     */

    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: scale(16),

      // Automatically accounts for the phone's status bar
      paddingTop: scale(8),

      paddingBottom: scale(12),
      backgroundColor: "#F4F7F4",
    },

    headerLeft: {
      flexDirection: "row",
      alignItems: "center",
      flex: 1,
    },

    backButton: {
      width: scale(43),
      height: scale(43),
      borderRadius:
        scale(22),
      backgroundColor:
        "#E9F0EB",
      alignItems: "center",
      justifyContent:
        "center",
      marginRight:
        scale(10),
    },

    headerTitle: {
      fontSize: scale(27),
      fontWeight: "900",
      color: "#101310",
      letterSpacing:
        -0.5,
    },

    headerSubtitle: {
      marginTop: 1,
      fontSize: scale(12),
      color: "#747B75",
      fontWeight: "600",
    },

    clearButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent:
        "center",
      backgroundColor:
        "#FFECEC",
      paddingHorizontal:
        scale(12),
      paddingVertical:
        scale(11),
      borderRadius:
        scale(24),
      marginLeft: 8,
    },

    clearButtonDisabled: {
      backgroundColor:
        "#ECEFEC",
    },

    clearButtonText: {
      marginLeft: 6,
      color: "#E5484D",
      fontSize: scale(11),
      fontWeight: "800",
    },

    clearButtonTextDisabled: {
      color: "#AEB5AE",
    },

    /*
     * ========================================================
     * LIST
     * ========================================================
     */

    list: {
      paddingHorizontal:
        scale(14),
      paddingTop: scale(4),
      paddingBottom:
        scale(20),
    },

    listHeader: {
      flexDirection: "row",
      justifyContent:
        "space-between",
      alignItems: "center",
      marginBottom:
        scale(10),
      paddingHorizontal:
        scale(2),
    },

    listHeaderTitle: {
      fontSize: scale(16),
      fontWeight: "900",
      color: "#111411",
    },

    listHeaderSubtitle: {
      marginTop: 2,
      fontSize: scale(10),
      color: "#7B827C",
      fontWeight: "500",
    },

    selectAllSmall: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: 5,
      paddingHorizontal: 4,
    },

    smallCheckbox: {
      width: scale(20),
      height: scale(20),
      borderRadius: 6,
      borderWidth: 1.5,
      borderColor:
        "#B5BCB6",
      alignItems: "center",
      justifyContent:
        "center",
      marginRight: 6,
    },

    smallCheckboxSelected: {
      backgroundColor:
        "#176B3A",
      borderColor:
        "#176B3A",
    },

    selectAllSmallText: {
      fontSize: scale(10),
      fontWeight: "800",
      color: "#252A26",
    },

    /*
     * ========================================================
     * PRODUCT CARD
     * ========================================================
     */

    card: {
      backgroundColor:
        "#FFFFFF",
      borderRadius:
        scale(21),
      padding: scale(12),
      marginBottom:
        scale(13),
      borderWidth: 1,
      borderColor:
        "#E0E7E1",

      shadowColor:
        "#000000",
      shadowOffset: {
        width: 0,
        height: 3,
      },
      shadowOpacity: 0.05,
      shadowRadius: 8,
      elevation: 2,
    },

    cardOutOfStock: {
      borderColor:
        "#F1D0D0",
    },

    cardContent: {
      flexDirection: "row",
      alignItems: "center",
    },

    /*
     * ========================================================
     * CHECKBOX
     * ========================================================
     */

    checkboxArea: {
      padding: 3,
      marginRight: 4,
    },

    checkbox: {
      width: scale(24),
      height: scale(24),
      borderRadius: 7,
      borderWidth: 1.5,
      borderColor:
        "#A9B0AA",
      backgroundColor:
        "#FFFFFF",
      alignItems: "center",
      justifyContent:
        "center",
    },

    checkboxSelected: {
      backgroundColor:
        "#111111",
      borderColor:
        "#111111",
    },

    /*
     * ========================================================
     * IMAGE
     * ========================================================
     */

    imageWrapper: {
      width: isSmallDevice
        ? 83
        : 94,
      height: isSmallDevice
        ? 83
        : 94,
      borderRadius:
        scale(17),
      backgroundColor:
        "#F5F7F5",
      alignItems: "center",
      justifyContent:
        "center",
      marginRight:
        scale(11),
      overflow: "hidden",
    },

    itemImage: {
      width: "92%",
      height: "92%",
    },

    /*
     * ========================================================
     * DETAILS
     * ========================================================
     */

    detailsContainer: {
      flex: 1,
      minWidth: 0,
    },

    titleRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent:
        "space-between",
      minWidth: 0,
    },

    title: {
      flex: 1,
      fontSize: scale(18),
      fontWeight: "900",
      color: "#111311",
      letterSpacing:
        -0.3,
    },

    moreButton: {
      width: 25,
      height: 28,
      alignItems: "center",
      justifyContent:
        "center",
      marginLeft: 3,
    },

    detailsText: {
      marginTop: 3,
      fontSize: scale(10.5),
      color: "#727A73",
      lineHeight:
        scale(17),
      fontWeight: "500",
    },

    designBadge: {
      alignSelf:
        "flex-start",
      flexDirection: "row",
      alignItems: "center",
      backgroundColor:
        "#EDF7EF",
      borderRadius: 6,
      paddingHorizontal: 7,
      paddingVertical: 4,
      marginTop: 5,
    },

    designBadgeText: {
      marginLeft: 4,
      color: "#176B3A",
      fontSize: scale(9),
      fontWeight: "800",
    },

    /*
     * ========================================================
     * PRICE
     * ========================================================
     */

    price: {
      marginTop: 5,
      fontSize: scale(20),
      fontWeight: "900",
      color: "#090B09",
      letterSpacing:
        -0.5,
    },

    /*
     * ========================================================
     * ACTIONS
     * ========================================================
     */

    actions: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent:
        "space-between",
      marginTop: scale(8),
    },

    qtyContainer: {
      flexDirection: "row",
      alignItems: "center",
      height: scale(37),
      borderWidth: 1,
      borderColor:
        "#DDE3DE",
      borderRadius:
        scale(11),
      overflow: "hidden",
      backgroundColor:
        "#F9FAF9",
    },

    qtyBtn: {
      width: scale(39),
      height: "100%",
      alignItems: "center",
      justifyContent:
        "center",
      backgroundColor:
        "#F1F4F1",
    },

    qtyText: {
      fontSize: scale(18),
      fontWeight: "900",
      color: "#101210",
    },

    qtyValueWrapper: {
      minWidth: scale(35),
      height: "100%",
      alignItems: "center",
      justifyContent:
        "center",
      backgroundColor:
        "#FFFFFF",
    },

    qtyVal: {
      fontSize: scale(14),
      fontWeight: "800",
      color: "#111311",
    },

    deleteBtn: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: 5,
      paddingLeft: 6,
    },

    deleteBtnText: {
      color: "#E5484D",
      fontSize: scale(11),
      fontWeight: "800",
      marginLeft: 4,
    },

    /*
     * ========================================================
     * STOCK BAR
     * ========================================================
     */

    stockBar: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent:
        "space-between",
      backgroundColor:
        "#EFF7F1",
      borderRadius:
        scale(13),
      paddingHorizontal:
        scale(11),
      paddingVertical:
        scale(8),
      marginTop:
        scale(11),
    },

    stockBarOut: {
      backgroundColor:
        "#FFF1F1",
    },

    stockLeft: {
      flexDirection: "row",
      alignItems: "center",
      flex: 1,
    },

    stockIcon: {
      width: 29,
      height: 29,
      borderRadius:
        15,
      alignItems: "center",
      justifyContent:
        "center",
      backgroundColor:
        "#DFF0E3",
    },

    stockIconOut: {
      backgroundColor:
        "#FFE0E0",
    },

    stockStatus: {
      marginLeft: 7,
      fontSize: scale(11),
      fontWeight: "900",
      color: "#176B3A",
    },

    stockStatusOut: {
      color: "#E5484D",
    },

    stockAvailable: {
      fontSize: scale(10),
      color: "#6C746E",
      fontWeight: "600",
    },

    /*
     * ========================================================
     * NEED MORE CARD
     * ========================================================
     */

    needMoreCard: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor:
        "#FFFFFF",
      borderRadius:
        scale(20),
      borderWidth: 1,
      borderColor:
        "#E0E7E1",
      padding: scale(13),
      marginTop: 2,
      marginBottom:
        scale(18),
      minHeight:
        scale(100),
    },

    needMoreIcon: {
      width: scale(54),
      height: scale(54),
      borderRadius:
        scale(27),
      backgroundColor:
        "#E5F5E8",
      alignItems: "center",
      justifyContent:
        "center",
      marginRight:
        scale(11),
    },

    needMoreContent: {
      flex: 1,
      minWidth: 0,
    },

    needMoreTitle: {
      fontSize: scale(14),
      fontWeight: "900",
      color: "#111411",
      marginBottom: 3,
    },

    needMoreText: {
      fontSize: scale(10),
      lineHeight:
        scale(15),
      color: "#737B75",
      fontWeight: "500",
    },

    browseButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent:
        "center",
      backgroundColor:
        "#E7F3E9",
      borderRadius:
        scale(21),
      paddingHorizontal:
        scale(10),
      paddingVertical:
        scale(10),
      marginLeft: 5,
    },

    browseButtonText: {
      color: "#176B3A",
      fontSize: scale(9.5),
      fontWeight: "900",
    },

    /*
     * ========================================================
     * CHECKOUT PANEL
     * ========================================================
     */

    checkoutPanel: {
      backgroundColor:
        "#FFFFFF",
      borderTopWidth: 1,
      borderTopColor:
        "#E1E6E1",
      paddingHorizontal:
        scale(15),
      paddingTop:
        scale(12),
      paddingBottom:
        scale(17),

      shadowColor:
        "#000000",
      shadowOffset: {
        width: 0,
        height: -4,
      },
      shadowOpacity: 0.06,
      shadowRadius: 10,
      elevation: 8,
    },

    checkoutTopRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent:
        "space-between",
      marginBottom:
        scale(12),
    },

    selectAllArea: {
      flexDirection: "row",
      alignItems: "center",
      flex: 1,
    },

    checkoutCheckbox: {
      width: scale(30),
      height: scale(30),
      borderRadius: 8,
      borderWidth: 1.5,
      borderColor:
        "#A9B0AA",
      alignItems: "center",
      justifyContent:
        "center",
      marginRight:
        scale(10),
    },

    checkoutCheckboxSelected: {
      backgroundColor:
        "#111111",
      borderColor:
        "#111111",
    },

    selectAllTitle: {
      fontSize: scale(14),
      fontWeight: "900",
      color: "#111311",
    },

    selectAllSubtitle: {
      marginTop: 2,
      fontSize: scale(10),
      color: "#7A817B",
      fontWeight: "500",
    },

    totalContainer: {
      alignItems: "flex-end",
      marginLeft: 10,
    },

    totalLabel: {
      fontSize: scale(10),
      color: "#707870",
      fontWeight: "700",
    },

    totalValue: {
      marginTop: 1,
      fontSize: scale(25),
      fontWeight: "900",
      color: "#080A08",
      letterSpacing:
        -0.7,
    },

    /*
     * ========================================================
     * WARNING
     * ========================================================
     */

    warningBox: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor:
        "#FFF0F0",
      borderWidth: 1,
      borderColor:
        "#F3CACA",
      borderRadius:
        scale(11),
      paddingHorizontal:
        scale(11),
      paddingVertical:
        scale(9),
      marginBottom:
        scale(10),
    },

    warningText: {
      flex: 1,
      marginLeft: 7,
      color: "#E5484D",
      fontSize: scale(10),
      fontWeight: "700",
      lineHeight:
        scale(15),
    },

    /*
     * ========================================================
     * CHECKOUT BUTTON
     * ========================================================
     */

    checkoutBtn: {
      minHeight:
        scale(53),
      borderRadius:
        scale(28),
      backgroundColor:
        "#090A09",
      alignItems: "center",
      justifyContent:
        "center",
      flexDirection: "row",
    },

    checkoutBtnDisabled: {
      backgroundColor:
        "#E7EBE7",
    },

    checkoutIcon: {
      marginRight: 8,
    },

    checkoutText: {
      color: "#8B918B",
      fontSize: scale(14),
      fontWeight: "900",
    },

    checkoutTextEnabled: {
      color: "#FFFFFF",
    },

    /*
     * ========================================================
     * EMPTY CART
     * ========================================================
     */

    emptyContainer: {
      flex: 1,
      alignItems: "center",
      justifyContent:
        "center",
      paddingHorizontal:
        25,
      backgroundColor:
        "#F4F7F4",
    },

    emptyCartCircle: {
      width: 100,
      height: 100,
      borderRadius: 50,
      backgroundColor:
        "#E4F3E7",
      alignItems: "center",
      justifyContent:
        "center",
      marginBottom: 16,
    },

    emptyCartTitle: {
      fontSize: 22,
      fontWeight: "900",
      color: "#101310",
      marginBottom: 7,
    },

    emptyCartText: {
      fontSize: 13,
      color: "#737B75",
      textAlign: "center",
      lineHeight: 20,
      marginBottom: 20,
    },

    browseButtonLarge: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent:
        "center",
      backgroundColor:
        "#176B3A",
      paddingHorizontal: 23,
      paddingVertical: 13,
      borderRadius: 25,
    },

    browseButtonLargeText: {
      color: "#FFFFFF",
      fontSize: 13,
      fontWeight: "800",
      marginRight: 7,
    },

    /*
     * ========================================================
     * LOGIN / LOADING
     * ========================================================
     */

    center: {
      flex: 1,
      alignItems: "center",
      justifyContent:
        "center",
      padding: 20,
      backgroundColor:
        "#F4F7F4",
    },

    emptyIconCircle: {
      width: 90,
      height: 90,
      borderRadius: 45,
      backgroundColor:
        "#E4F3E7",
      alignItems: "center",
      justifyContent:
        "center",
      marginBottom: 15,
    },

    emptyTitle: {
      fontSize: 21,
      fontWeight: "900",
      color: "#111311",
      marginBottom: 7,
    },

    infoText: {
      fontSize: 13,
      color: "#747B75",
      marginBottom: 18,
      textAlign: "center",
      lineHeight: 20,
    },

    primaryButton: {
      backgroundColor:
        "#111311",
      paddingHorizontal:
        25,
      paddingVertical:
        13,
      borderRadius: 25,
    },

    primaryButtonText: {
      color: "#FFFFFF",
      fontSize: 13,
      fontWeight: "800",
    },

    loadingText: {
      marginTop: 10,
      fontSize: 12,
      color: "#737B75",
      fontWeight: "600",
    },
  });