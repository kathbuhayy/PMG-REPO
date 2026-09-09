import React, {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  ActivityIndicator,
  Image,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";

import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  Ionicons,
} from "@expo/vector-icons";

import {
  useFonts,
} from "expo-font";

import {
  Poppins_400Regular,
  Poppins_500Medium,
  Poppins_600SemiBold,
  Poppins_700Bold,
} from "@expo-google-fonts/poppins";

import {
  BebasNeue_400Regular,
} from "@expo-google-fonts/bebas-neue";

import {
  API_BASE_URL,
} from "../config";

import {
  COLORS,
} from "../theme";

/* =========================================================
   LOCAL PRODUCT IMAGES
========================================================= */

const IMG = {
  "business card":
    require("../assets/product-images/business-card.png"),

  "business cards":
    require("../assets/product-images/business-card.png"),

  "calling card":
    require("../assets/product-images/business-card.png"),

  flyer:
    require("../assets/product-images/flyers.png"),

  flyers:
    require("../assets/product-images/flyers.png"),

  poster:
    require("../assets/product-images/poster.png"),

  posters:
    require("../assets/product-images/poster.png"),

  shirt:
    require("../assets/product-images/shirt-front.png"),

  shirts:
    require("../assets/product-images/shirt-front.png"),

  tshirt:
    require("../assets/product-images/shirt-front.png"),

  "t-shirt":
    require("../assets/product-images/shirt-front.png"),

  "t shirt":
    require("../assets/product-images/shirt-front.png"),

  jersey:
    require("../assets/product-images/shirt-front.png"),

  jerseys:
    require("../assets/product-images/shirt-front.png"),

  cap:
    require("../assets/product-images/cap.png"),

  caps:
    require("../assets/product-images/cap.png"),

  hat:
    require("../assets/product-images/cap.png"),

  "tote bag":
    require("../assets/product-images/tote-bag.png"),

  tote:
    require("../assets/product-images/tote-bag.png"),
};

const FALLBACK =
  IMG["business card"];

/* =========================================================
   HELPERS
========================================================= */

const normalize = (value) =>
  String(value || "")
    .toLowerCase()
    .trim();

const getProductName =
  (product) =>
    product?.name ||
    product?.title ||
    product?.productName ||
    product?.product_name ||
    "Product";

const getCategory =
  (product) =>
    product?.category ||
    product?.type ||
    product?.productType ||
    product?.product_type ||
    "Printing";

const getPrice =
  (product) =>
    product?.price ??
    product?.sellingPrice ??
    product?.selling_price ??
    null;

/* =========================================================
   PRODUCT IMAGE
========================================================= */

const getImage = (
  product
) => {
  const images =
    product?.images;

  if (
    Array.isArray(images) &&
    images.length > 0
  ) {
    const firstImage =
      images.find(
        (image) =>
          typeof image ===
          "string" &&
          image.trim()
      );

    if (firstImage) {
      const imageUrl =
        firstImage.trim();

      return {
        uri:
          imageUrl.startsWith(
            "http"
          )
            ? imageUrl
            : `${API_BASE_URL}${imageUrl.startsWith(
              "/"
            )
              ? ""
              : "/"
            }${imageUrl}`,
      };
    }
  }

  const values = [
    product?.name,
    product?.title,
    product?.productName,
    product?.product_name,
    product?.category,
    product?.type,
    product?.productType,
    product?.product_type,
  ]
    .filter(Boolean)
    .map(normalize);

  for (const value of values) {
    if (IMG[value]) {
      return IMG[value];
    }
  }

  for (const value of values) {
    const key =
      Object.keys(
        IMG
      ).find(
        (item) =>
          value.includes(item) ||
          item.includes(value)
      );

    if (key) {
      return IMG[key];
    }
  }

  return FALLBACK;
};

/* =========================================================
   FALLBACK PRODUCTS
========================================================= */

const FALLBACK_PRODUCTS = [
  {
    id: "shirt",
    name: "T-Shirt",
    category: "Apparel",
    price: 350,
  },
  {
    id: "tote",
    name: "Tote Bag",
    category: "Promotional",
    price: 180,
  },
  {
    id: "cap",
    name: "Cap",
    category: "Promotional",
    price: 250,
  },
  {
    id: "business-card",
    name: "Business Cards",
    category: "Business",
    price: 150,
  },
  {
    id: "flyers",
    name: "Flyers",
    category: "Paper",
    price: 300,
  },
  {
    id: "poster",
    name: "Poster",
    category: "Large Format",
    price: 250,
  },
];

/* =========================================================
   CATEGORY GROUPS
========================================================= */

const PRODUCT_CATEGORY_GROUPS = {
  APPAREL: [
    "hoodie",
    "sweatshirt",
    "t-shirt",
    "t shirt",
    "tshirt",
    "jersey",
  ],

  WEARABLES: [
    "cap",
    "hat",
  ],

  STICKERS_LABELS: [
    "sticker",
    "label",
    "hang tag",
    "hangtag",
  ],

  PAPER_CARDS: [
    "business card",
    "flyer",
    "notebook",
    "note card",
    "thank you card",
    "brochure",
  ],

  LARGE_FORMAT_SIGNAGE: [
    "poster",
    "banner",
    "tarpaulin",
    "signage",
  ],

  PROMOTIONAL_PERSONALIZED: [
    "mug",
    "tote bag",
    "tote",
    "personalized",
    "promotional",
  ],
};

/* =========================================================
   CATEGORY MATCHING
========================================================= */

const productMatchesCategory = (
  product,
  selectedCategory
) => {
  if (
    selectedCategory ===
    "ALL"
  ) {
    return true;
  }

  const name =
    normalize(
      getProductName(
        product
      )
    );

  const category =
    normalize(
      getCategory(
        product
      )
    );

  const keywords =
    PRODUCT_CATEGORY_GROUPS[
    selectedCategory
    ] || [];

  if (
    keywords.some(
      (keyword) =>
        name.includes(
          keyword
        )
    )
  ) {
    return true;
  }

  const categoryAliases = {
    APPAREL: [
      "apparel",
      "clothing",
    ],

    WEARABLES: [
      "wearables",
      "accessories",
    ],

    STICKERS_LABELS: [
      "sticker",
      "label",
    ],

    PAPER_CARDS: [
      "paper",
      "cards",
      "card",
      "stationery",
      "business",
    ],

    LARGE_FORMAT_SIGNAGE: [
      "large format",
      "signage",
      "signs",
    ],

    PROMOTIONAL_PERSONALIZED: [
      "promotional",
      "personalized",
    ],
  };

  return (
    categoryAliases[
    selectedCategory
    ] || []
  ).some(
    (alias) =>
      category.includes(
        alias
      )
  );
};

/* =========================================================
   COMPONENT
========================================================= */

export default function ProductOverview({
  navigation,
  route,
}) {
  const {
    width,
  } =
    useWindowDimensions();

  const insets = useSafeAreaInsets();

  const isSmall =
    width <= 360;

  const isMedium =
    width > 360 &&
    width <= 430;

  const isLarge =
    width > 430 &&
    width <= 600;

  const scale = (
    small,
    medium,
    large,
    xlarge
  ) => {
    if (isSmall) {
      return small;
    }

    if (isMedium) {
      return medium;
    }

    if (isLarge) {
      return large;
    }

    return xlarge;
  };

  const styles = useMemo(
    () =>
      createStyles(
        scale
      ),
    [width]
  );

  const SIDE_PADDING =
    scale(
      12,
      16,
      20,
      26
    );

  const CARD_GAP =
    scale(
      8,
      10,
      12,
      14
    );

  const CARD_WIDTH =
    (
      width -
      SIDE_PADDING * 2 -
      CARD_GAP
    ) / 2;

  const [
    fontsLoaded,
  ] = useFonts({
    Poppins:
      Poppins_400Regular,

    PoppinsMedium:
      Poppins_500Medium,

    PoppinsSemiBold:
      Poppins_600SemiBold,

    PoppinsBold:
      Poppins_700Bold,

    BebasNeue:
      BebasNeue_400Regular,
  });

  const [
    products,
    setProducts,
  ] = useState(
    FALLBACK_PRODUCTS
  );

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    search,
    setSearch,
  ] = useState("");

  /*
   * IMPORTANT:
   * Get the category sent from CatalogScreen.
   */
  const [
    category,
    setCategory,
  ] = useState(
    route?.params
      ?.category ||
    "ALL"
  );

  /*
   * Update the selected category
   * whenever CatalogScreen sends
   * a new category.
   */
  useEffect(() => {
    const incomingCategory =
      route?.params?.category;

    if (
      incomingCategory
    ) {
      setCategory(
        incomingCategory
      );
    }
  }, [
    route?.params?.category,
  ]);

  /* =======================================================
     NAVIGATION
  ======================================================= */

  const getRootNavigation =
    () => {
      let root =
        navigation;

      let parent =
        root?.getParent?.();

      while (parent) {
        root = parent;

        parent =
          root?.getParent?.();
      }

      return root;
    };

  const goToMainTab =
    (tabName) => {
      const root =
        getRootNavigation();

      if (!root) {
        return;
      }

      const rootState =
        root.getState?.();

      if (
        rootState?.routeNames?.includes(
          "Main"
        )
      ) {
        root.navigate(
          "Main",
          {
            screen:
              tabName,
          }
        );

        return;
      }

      if (
        rootState?.routeNames?.includes(
          tabName
        )
      ) {
        root.navigate(
          tabName
        );

        return;
      }

      try {
        root.navigate(
          "Main",
          {
            screen:
              tabName,
          }
        );
      } catch (
      error
      ) {
        console.warn(
          "Navigation error:",
          error
        );
      }
    };

  const goHome = () => {
    goToMainTab(
      "CatalogTab"
    );
  };

  const openOrders = () => {
    goToMainTab(
      "OrdersTab"
    );
  };

  const openChat = () => {
    goToMainTab(
      "ChatbotTab"
    );
  };

  const openProfile =
    () => {
      goToMainTab(
        "ProfileTab"
      );
    };

  const openCart = () => {
    goToMainTab(
      "CartTab"
    );
  };

  const openProduct =
    (product) => {
      const root =
        getRootNavigation();

      if (!root) {
        return;
      }

      root.navigate(
        "ProductDetail",
        {
          product,
        }
      );
    };

  /* =======================================================
     FETCH PRODUCTS
  ======================================================= */

  /* =======================================================
     FETCH PRODUCTS
  ======================================================= */

  useEffect(() => {
    let mounted = true;

    const fetchProducts = async () => {
      try {
        const response = await fetch(
          `${API_BASE_URL}/api/products?limit=100`,
          {
            method: "GET",
            headers: {
              Accept: "application/json",
            },
          }
        );

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();

        const list = Array.isArray(data)
          ? data
          : Array.isArray(data?.products)
            ? data.products
            : Array.isArray(data?.data)
              ? data.data
              : [];

        if (mounted && list.length > 0) {
          setProducts(list);
        }
      } catch (error) {
        /*
         * Do not treat a normal screen unmount/navigation
         * as a product API failure.
         */
        if (mounted) {
          console.warn(
            "Product overview fetch failed:",
            error?.message || error
          );
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    fetchProducts();

    return () => {
      mounted = false;
    };
  }, []);

  /* =======================================================
     FILTER PRODUCTS
  ======================================================= */

  const filteredProducts =
    useMemo(() => {
      const query =
        normalize(
          search
        );

      return products.filter(
        (product) => {
          const name =
            normalize(
              getProductName(
                product
              )
            );

          const categoryName =
            normalize(
              getCategory(
                product
              )
            );

          const matchesSearch =
            !query ||
            name.includes(
              query
            ) ||
            categoryName.includes(
              query
            );

          const matchesCategory =
            productMatchesCategory(
              product,
              category
            );

          return (
            matchesSearch &&
            matchesCategory
          );
        }
      );
    }, [
      products,
      search,
      category,
    ]);

  /* =======================================================
     LOADING
  ======================================================= */

  if (
    !fontsLoaded ||
    loading
  ) {
    return (
      <View
        style={
          styles.loadingScreen
        }
      >
        <StatusBar
          barStyle="light-content"
          backgroundColor={
            COLORS.backgroundDeep
          }
        />

        <Image
          source={require("../assets/images/pmg-logo-nav.png")}
          style={{
            width: scale(
              110,
              125,
              145,
              165
            ),
            height:
              scale(
                110,
                125,
                145,
                165
              ) * 0.32,
          }}
          resizeMode="contain"
        />

        <ActivityIndicator
          size="large"
          color={
            COLORS.primary
          }
          style={{
            marginTop: 25,
          }}
        />

        <Text
          style={
            styles.loadingText
          }
        >
          LOADING PRODUCTS...
        </Text>
      </View>
    );
  }

  /* =======================================================
     MAIN SCREEN
  ======================================================= */

  return (
    <SafeAreaView
      style={
        styles.safeArea
      }
    >
      <StatusBar
        barStyle="light-content"
        backgroundColor={
          COLORS.backgroundDeep
        }
      />

      {/* HEADER */}

      <View
        style={[
          styles.header,
          {
            height: scale(
              74,
              80,
              88,
              96
            ),
            paddingHorizontal:
              SIDE_PADDING,
            paddingTop:
              insets.top +
              scale(
                4,
                5,
                6,
                8
              ),
          },
        ]}
      >
        <TouchableOpacity
          style={
            styles.headerButton
          }
          onPress={
            goHome
          }
        >
          <Ionicons
            name="arrow-back"
            size={scale(
              23,
              25,
              27,
              30
            )}
            color={
              COLORS.white
            }
          />
        </TouchableOpacity>

        <View
          style={
            styles.logoContainer
          }
        >
          <Image
            source={require("../assets/images/pmg-logo-nav.png")}
            style={{
              width: scale(
                100,
                112,
                128,
                145
              ),
              height:
                scale(
                  100,
                  112,
                  128,
                  145
                ) * 0.32,
            }}
            resizeMode="contain"
          />
        </View>

        <TouchableOpacity
          style={
            styles.headerButton
          }
          onPress={
            openCart
          }
        >
          <Ionicons
            name="cart-outline"
            size={scale(
              24,
              26,
              28,
              31
            )}
            color={
              COLORS.white
            }
          />
        </TouchableOpacity>
      </View>

      <View
        style={
          styles.headerLine
        }
      />

      <ScrollView
        showsVerticalScrollIndicator={
          false
        }
        contentContainerStyle={{
          paddingBottom:
            scale(
              90,
              100,
              110,
              120
            ),
        }}
      >
        {/* TITLE */}

        <View
          style={[
            styles.titleSection,
            {
              paddingHorizontal:
                SIDE_PADDING,
            },
          ]}
        >
          <Text
            style={
              styles.eyebrow
            }
          >
            SHOP PMG
          </Text>

          <Text
            style={[
              styles.pageTitle,
              {
                fontSize:
                  scale(
                    32,
                    36,
                    42,
                    48
                  ),
              },
            ]}
          >
            OUR PRODUCTS
          </Text>

          <Text
            style={
              styles.subtitle
            }
          >
            Browse our complete
            collection of printing
            products and services.
          </Text>
        </View>

        {/* SEARCH */}

        <View
          style={[
            styles.searchWrapper,
            {
              marginHorizontal:
                SIDE_PADDING,
            },
          ]}
        >
          <Ionicons
            name="search-outline"
            size={scale(
              19,
              20,
              21,
              23
            )}
            color={
              COLORS.primary
            }
          />

          <TextInput
            value={search}
            onChangeText={
              setSearch
            }
            placeholder="Search products..."
            placeholderTextColor={
              COLORS.inputPlaceholder
            }
            style={
              styles.searchInput
            }
          />

          {search.length >
            0 && (
              <TouchableOpacity
                onPress={() =>
                  setSearch(
                    ""
                  )
                }
              >
                <Ionicons
                  name="close-circle"
                  size={scale(
                    18,
                    19,
                    20,
                    22
                  )}
                  color={
                    COLORS.textMuted
                  }
                />
              </TouchableOpacity>
            )}
        </View>

        {/* CATEGORY FILTERS */}

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={
            false
          }
          contentContainerStyle={{
            paddingLeft:
              SIDE_PADDING,
            paddingRight:
              SIDE_PADDING,
            paddingTop:
              scale(
                12,
                14,
                16,
                18
              ),
            paddingBottom: 5,
          }}
        >
          {[
            "ALL",
            "APPAREL",
            "WEARABLES",
            "STICKERS_LABELS",
            "PAPER_CARDS",
            "LARGE_FORMAT_SIGNAGE",
            "PROMOTIONAL_PERSONALIZED",
          ].map(
            (item) => (
              <TouchableOpacity
                key={item}
                style={[
                  styles.categoryPill,
                  category ===
                  item &&
                  styles.categoryPillActive,
                ]}
                onPress={() =>
                  setCategory(
                    item
                  )
                }
              >
                <Text
                  style={[
                    styles.categoryText,
                    category ===
                    item &&
                    styles.categoryTextActive,
                  ]}
                >
                  {
                    {
                      ALL: "ALL",
                      APPAREL:
                        "APPAREL",
                      WEARABLES:
                        "WEARABLES",
                      STICKERS_LABELS:
                        "STICKERS & LABELS",
                      PAPER_CARDS:
                        "PAPER & CARDS",
                      LARGE_FORMAT_SIGNAGE:
                        "LARGE FORMAT & SIGNAGE",
                      PROMOTIONAL_PERSONALIZED:
                        "PROMOTIONAL & PERSONALIZED",
                    }[
                    item
                    ] ||
                    item
                  }
                </Text>
              </TouchableOpacity>
            )
          )}
        </ScrollView>

        {/* RESULT COUNT */}

        <View
          style={[
            styles.resultRow,
            {
              paddingHorizontal:
                SIDE_PADDING,
            },
          ]}
        >
          <Text
            style={
              styles.resultText
            }
          >
            {
              filteredProducts.length
            }{" "}
            PRODUCTS
          </Text>

          <TouchableOpacity
            onPress={() => {
              setSearch("");
              setCategory(
                "ALL"
              );
            }}
          >
            <Text
              style={
                styles.clearText
              }
            >
              CLEAR FILTER
            </Text>
          </TouchableOpacity>
        </View>

        {/* PRODUCT GRID */}

        <View
          style={[
            styles.productGrid,
            {
              paddingHorizontal:
                SIDE_PADDING,
            },
          ]}
        >
          {filteredProducts.length ===
            0 ? (
            <View
              style={
                styles.emptyState
              }
            >
              <Ionicons
                name="search-outline"
                size={scale(
                  42,
                  45,
                  48,
                  52
                )}
                color={
                  COLORS.textMuted
                }
              />

              <Text
                style={
                  styles.emptyTitle
                }
              >
                NO PRODUCTS FOUND
              </Text>

              <Text
                style={
                  styles.emptyDescription
                }
              >
                Try searching for
                another product.
              </Text>
            </View>
          ) : (
            filteredProducts.map(
              (
                product,
                index
              ) => (
                <TouchableOpacity
                  key={
                    product?.id ||
                    product?._id ||
                    index
                  }
                  style={[
                    styles.productCard,
                    {
                      width:
                        CARD_WIDTH,
                    },
                  ]}
                  activeOpacity={0.85}
                  onPress={() =>
                    openProduct(
                      product
                    )
                  }
                >
                  <View
                    style={
                      styles.productImage
                    }
                  >
                    <Image
                      source={
                        getImage(
                          product
                        )
                      }
                      style={
                        styles.productImageContent
                      }
                      resizeMode="contain"
                    />

                    <View
                      style={
                        styles.productIcon
                      }
                    >
                      <Ionicons
                        name="arrow-forward"
                        size={scale(
                          14,
                          15,
                          16,
                          18
                        )}
                        color={
                          COLORS.primary
                        }
                      />
                    </View>
                  </View>

                  <View
                    style={
                      styles.productInfo
                    }
                  >
                    <Text
                      style={
                        styles.productCategory
                      }
                      numberOfLines={
                        1
                      }
                    >
                      {getCategory(
                        product
                      )}
                    </Text>

                    <Text
                      style={
                        styles.productName
                      }
                      numberOfLines={
                        2
                      }
                    >
                      {getProductName(
                        product
                      )}
                    </Text>

                    <Text
                      style={
                        styles.price
                      }
                    >
                      {getPrice(
                        product
                      ) == null
                        ? "CUSTOM"
                        : `₱${Number(
                          getPrice(
                            product
                          )
                        ).toLocaleString()}`}
                    </Text>

                    <View
                      style={
                        styles.viewProduct
                      }
                    >
                      <Text
                        style={
                          styles.viewProductText
                        }
                      >
                        VIEW PRODUCT
                      </Text>

                      <Ionicons
                        name="chevron-forward"
                        size={scale(
                          15,
                          16,
                          17,
                          19
                        )}
                        color={
                          COLORS.primary
                        }
                      />
                    </View>
                  </View>
                </TouchableOpacity>
              )
            )
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

/* =========================================================
   STYLES
========================================================= */

const createStyles =
  (scale) =>
    StyleSheet.create({
      safeArea: {
        flex: 1,
        backgroundColor:
          COLORS.backgroundDeep,
      },

      loadingScreen: {
        flex: 1,
        backgroundColor:
          COLORS.backgroundDeep,
        alignItems:
          "center",
        justifyContent:
          "center",
      },

      loadingText: {
        color:
          COLORS.primary,
        fontFamily:
          "BebasNeue",
        fontSize: scale(
          17,
          18,
          19,
          21
        ),
        letterSpacing: 2.5,
        marginTop: scale(
          11,
          12,
          14,
          16
        ),
      },

      header: {
        backgroundColor:
          COLORS.backgroundDeep,
        flexDirection:
          "row",
        alignItems:
          "center",
        justifyContent:
          "space-between",
      },

      headerButton: {
        width: scale(
          38,
          40,
          42,
          46
        ),
        height: scale(
          38,
          40,
          42,
          46
        ),
        alignItems:
          "center",
        justifyContent:
          "center",
      },

      logoContainer: {
        flex: 1,
        alignItems:
          "center",
        justifyContent:
          "center",
      },

      headerLine: {
        height: 1,
        backgroundColor:
          "rgba(182,255,0,.18)",
      },

      titleSection: {
        paddingTop: scale(
          22,
          26,
          30,
          36
        ),
        paddingBottom: scale(
          16,
          18,
          20,
          24
        ),
      },

      eyebrow: {
        color:
          COLORS.primary,
        fontFamily:
          "PoppinsBold",
        fontSize: scale(
          8,
          9,
          9,
          10
        ),
        letterSpacing: 2,
        marginBottom: 4,
      },

      pageTitle: {
        color:
          COLORS.white,
        fontFamily:
          "BebasNeue",
        letterSpacing: 1,
      },

      subtitle: {
        color:
          COLORS.textSecondary,
        fontFamily:
          "Poppins",
        fontSize: scale(
          10,
          11,
          12,
          13
        ),
        lineHeight: scale(
          16,
          17,
          18,
          20
        ),
        marginTop: scale(
          6,
          7,
          8,
          9
        ),
        maxWidth: scale(
          290,
          320,
          330,
          430
        ),
      },

      searchWrapper: {
        height: scale(
          46,
          50,
          54,
          58
        ),
        borderRadius: scale(
          23,
          25,
          27,
          29
        ),
        borderWidth: 1,
        borderColor:
          COLORS.borderStrong,
        backgroundColor:
          COLORS.inputBackground,
        flexDirection:
          "row",
        alignItems:
          "center",
        paddingHorizontal:
          scale(
            12,
            14,
            16,
            18
          ),
      },

      searchInput: {
        flex: 1,
        color:
          COLORS.white,
        fontFamily:
          "Poppins",
        fontSize: scale(
          10,
          11,
          12,
          13
        ),
        marginLeft: scale(
          7,
          8,
          9,
          10
        ),
        paddingVertical: 0,
      },

      categoryPill: {
        height: scale(
          32,
          34,
          36,
          40
        ),
        borderRadius: 20,
        borderWidth: 1,
        borderColor:
          COLORS.border,
        backgroundColor:
          COLORS.surfaceDark,
        paddingHorizontal:
          scale(
            10,
            12,
            14,
            16
          ),
        alignItems:
          "center",
        justifyContent:
          "center",
        marginRight: scale(
          6,
          7,
          8,
          10
        ),
      },

      categoryPillActive: {
        backgroundColor:
          COLORS.primary,
        borderColor:
          COLORS.primary,
      },

      categoryText: {
        color:
          COLORS.textSecondary,
        fontFamily:
          "PoppinsBold",
        fontSize: scale(
          8,
          9,
          9,
          10
        ),
        letterSpacing: 0.4,
      },

      categoryTextActive: {
        color:
          "#071000",
      },

      resultRow: {
        flexDirection:
          "row",
        alignItems:
          "center",
        justifyContent:
          "space-between",
        paddingTop: scale(
          16,
          18,
          20,
          23
        ),
        paddingBottom: scale(
          10,
          11,
          13,
          15
        ),
      },

      resultText: {
        color:
          COLORS.textMuted,
        fontFamily:
          "PoppinsSemiBold",
        fontSize: scale(
          8,
          9,
          9,
          10
        ),
        letterSpacing: 1,
      },

      clearText: {
        color:
          COLORS.primary,
        fontFamily:
          "PoppinsBold",
        fontSize: scale(
          7,
          8,
          8,
          9
        ),
        letterSpacing: 0.8,
      },

      productGrid: {
        flexDirection:
          "row",
        flexWrap:
          "wrap",
        justifyContent:
          "space-between",
        rowGap: scale(
          9,
          11,
          13,
          15
        ),
      },

      productCard: {
        backgroundColor:
          COLORS.cardDark,
        borderWidth: 1,
        borderColor:
          COLORS.border,
        borderRadius: scale(
          15,
          17,
          19,
          22
        ),
        overflow:
          "hidden",
      },

      productImage: {
        width: "100%",
        aspectRatio:
          scale(
            0.95,
            1,
            1.05,
            1.08
          ),
        minHeight: scale(
          105,
          115,
          130,
          145
        ),
        maxHeight: scale(
          155,
          175,
          205,
          250
        ),
        backgroundColor:
          "#03150C",
        alignItems:
          "center",
        justifyContent:
          "center",
        position:
          "relative",
      },

      productImageContent: {
        width:
          scale(
            86,
            88,
            90,
            92
          ) + "%",
        height:
          scale(
            86,
            88,
            90,
            92
          ) + "%",
      },

      productIcon: {
        position:
          "absolute",
        right: scale(
          7,
          8,
          9,
          11
        ),
        top: scale(
          7,
          8,
          9,
          11
        ),
        width: scale(
          27,
          29,
          31,
          35
        ),
        height: scale(
          27,
          29,
          31,
          35
        ),
        borderRadius: scale(
          14,
          15,
          16,
          18
        ),
        backgroundColor:
          "rgba(0,0,0,.6)",
        alignItems:
          "center",
        justifyContent:
          "center",
      },

      productInfo: {
        padding: scale(
          8,
          9,
          11,
          13
        ),
      },

      productCategory: {
        color:
          COLORS.textMuted,
        fontFamily:
          "PoppinsMedium",
        fontSize: scale(
          7,
          8,
          8,
          9
        ),
        textTransform:
          "uppercase",
        marginBottom: 3,
      },

      productName: {
        color:
          COLORS.white,
        fontFamily:
          "PoppinsSemiBold",
        fontSize: scale(
          11,
          12,
          13,
          15
        ),
        lineHeight: scale(
          15,
          17,
          18,
          21
        ),
        minHeight: scale(
          30,
          34,
          36,
          42
        ),
      },

      price: {
        color:
          COLORS.primary,
        fontFamily:
          "PoppinsBold",
        fontSize: scale(
          11,
          12,
          13,
          15
        ),
        marginTop: scale(
          4,
          5,
          5,
          6
        ),
      },

      viewProduct: {
        flexDirection:
          "row",
        alignItems:
          "center",
        justifyContent:
          "space-between",
        borderTopWidth: 1,
        borderTopColor:
          "rgba(255,255,255,.07)",
        marginTop: scale(
          7,
          8,
          9,
          11
        ),
        paddingTop: scale(
          7,
          8,
          9,
          11
        ),
      },

      viewProductText: {
        color:
          COLORS.white,
        fontFamily:
          "PoppinsBold",
        fontSize: scale(
          7,
          8,
          8,
          9
        ),
        letterSpacing: 0.6,
      },

      emptyState: {
        width: "100%",
        minHeight: scale(
          210,
          230,
          250,
          290
        ),
        backgroundColor:
          COLORS.surfaceDark,
        borderWidth: 1,
        borderColor:
          COLORS.border,
        borderRadius: scale(
          16,
          18,
          20,
          23
        ),
        alignItems:
          "center",
        justifyContent:
          "center",
        padding: scale(
          22,
          26,
          30,
          36
        ),
      },

      emptyTitle: {
        color:
          COLORS.white,
        fontFamily:
          "PoppinsBold",
        fontSize: scale(
          12,
          13,
          14,
          16
        ),
        marginTop: scale(
          10,
          11,
          13,
          15
        ),
      },

      emptyDescription: {
        color:
          COLORS.textMuted,
        fontFamily:
          "Poppins",
        fontSize: scale(
          9,
          10,
          10,
          12
        ),
        marginTop: scale(
          4,
          5,
          5,
          6
        ),
        textAlign:
          "center",
      },
    });