import React, {
  useEffect,
  useRef,
  useState,
} from "react";

import {
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";

import AsyncStorage from "@react-native-async-storage/async-storage";

import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useFonts } from "expo-font";

import {
  Montserrat_400Regular,
  Montserrat_500Medium,
  Montserrat_600SemiBold,
  Montserrat_700Bold,
  Montserrat_800ExtraBold,
} from "@expo-google-fonts/montserrat";

import { BebasNeue_400Regular } from "@expo-google-fonts/bebas-neue";

import { API_BASE_URL } from "../config";
import { COLORS } from "../theme";

/* =========================================================
   LOCAL PRODUCT IMAGES
========================================================= */

const IMG = {
  "business card": require("../assets/product-images/business-card.png"),
  "business cards": require("../assets/product-images/business-card.png"),
  "calling card": require("../assets/product-images/business-card.png"),

  flyer: require("../assets/product-images/flyers.png"),
  flyers: require("../assets/product-images/flyers.png"),

  poster: require("../assets/product-images/poster.png"),
  posters: require("../assets/product-images/poster.png"),

  shirt: require("../assets/product-images/shirt-front.png"),
  shirts: require("../assets/product-images/shirt-front.png"),
  tshirt: require("../assets/product-images/shirt-front.png"),
  "t-shirt": require("../assets/product-images/shirt-front.png"),
  "t shirt": require("../assets/product-images/shirt-front.png"),
  jersey: require("../assets/product-images/shirt-front.png"),

  cap: require("../assets/product-images/cap.png"),
  caps: require("../assets/product-images/cap.png"),
  hat: require("../assets/product-images/cap.png"),

  "tote bag": require("../assets/product-images/tote-bag.png"),
  tote: require("../assets/product-images/tote-bag.png"),
};

const FALLBACK = IMG["business card"];

// Guest 3D Customizer usage is reset when a fresh guest session
// starts from the Landing screen. ProductDetail.js consumes this
// counter when the guest actually opens the 3D Customizer.
const GUEST_CUSTOMIZER_USES_KEY = "guest_3d_customizer_uses";
const GUEST_SESSION_KEY = "guest_3d_customizer_session";

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
    id: "card",
    name: "Business Cards",
    category: "Business",
    price: 150,
  },
  {
    id: "flyer",
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
   CATEGORY DATA
   IMAGE ONLY
========================================================= */

const CATEGORY_DATA = [
  {
    id: "APPAREL",
    image: require("../assets/category-images/apparel.png"),
  },
  {
    id: "WEARABLES",
    image: require("../assets/category-images/wearables.png"),
  },
  {
    id: "STICKERS_LABELS",
    image: require("../assets/category-images/stickers-labels.png"),
  },
  {
    id: "PAPER_CARDS",
    image: require("../assets/category-images/paper-cards.png"),
  },
  {
    id: "LARGE_FORMAT_SIGNAGE",
    image: require("../assets/category-images/large-format-signage.png"),
  },
  {
    id: "PROMOTIONAL_PERSONALIZED",
    image: require("../assets/category-images/promotional-personalized.png"),
  },
];

/* =========================================================
   HELPERS
========================================================= */

const norm = (value) =>
  String(value || "")
    .toLowerCase()
    .trim();

const productName = (product) =>
  product?.name ||
  product?.title ||
  product?.productName ||
  product?.product_name ||
  "Product";

const productCategory = (product) =>
  product?.category ||
  product?.type ||
  product?.productType ||
  product?.product_type ||
  "";

const productPrice = (product) =>
  product?.price ??
  product?.sellingPrice ??
  product?.selling_price ??
  null;

/* =========================================================
   PRODUCT IMAGE HANDLING
========================================================= */

const getProductImages = (product) => {
  const rawImages =
    product?.images ??
    product?.image ??
    product?.imageUrl ??
    product?.image_url ??
    null;

  if (Array.isArray(rawImages)) {
    return rawImages
      .filter(
        (image) =>
          typeof image === "string" &&
          image.trim().length > 0
      )
      .map((image) => image.trim());
  }

  if (typeof rawImages === "string") {
    const trimmed = rawImages.trim();

    if (!trimmed) {
      return [];
    }

    try {
      const parsed = JSON.parse(trimmed);

      if (Array.isArray(parsed)) {
        return parsed
          .filter(
            (image) =>
              typeof image === "string" &&
              image.trim().length > 0
          )
          .map((image) => image.trim());
      }

      if (
        typeof parsed === "string" &&
        parsed.trim()
      ) {
        return [parsed.trim()];
      }
    } catch {
      return [trimmed];
    }

    return [trimmed];
  }

  return [];
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

const localImage = (product) => {
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
    .map(norm);

  for (const value of values) {
    if (IMG[value]) {
      return IMG[value];
    }
  }

  for (const value of values) {
    const key = Object.keys(IMG).find(
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

const productImageSource = (product) => {
  const images = getProductImages(product);

  if (images.length > 0) {
    const url = resolveImageUrl(images[0]);

    if (url) {
      return {
        uri: url,
      };
    }
  }

  return localImage(product);
};

/* =========================================================
   COMPONENT
========================================================= */

export default function LandingScreen({
  navigation,
}) {
  /*
   * Start a clean guest 3D-Customizer counter for a new guest
   * session. This also clears the old global counter that may
   * have been left at 3 on the device from a previous guest.
   *
   * Logged-in users are untouched because they have unlimited
   * 3D Customizer access.
   */
  useEffect(() => {
    let mounted = true;

    const initializeGuestSession = async () => {
      try {
        const user = await AsyncStorage.getItem("user");

        if (user || !mounted) {
          return;
        }

        // Remove the previous shared counter so a new guest
        // does not inherit another guest's remaining/used attempts.
        await AsyncStorage.removeItem(
          GUEST_CUSTOMIZER_USES_KEY
        );

        // Give this guest session its own identifier.
        const session =
          `${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;

        await AsyncStorage.setItem(
          GUEST_SESSION_KEY,
          session
        );
      } catch (error) {
        console.warn(
          "Guest 3D Customizer session initialization failed:",
          error
        );
      }
    };

    initializeGuestSession();

    return () => {
      mounted = false;
    };
  }, []);

  const { width } =
    useWindowDimensions();

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
    xlarge = large
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

  const SIDE_PADDING = scale(
    14,
    18,
    24,
    30
  );

  const LOGO_WIDTH = scale(
    105,
    118,
    132,
    148
  );

  const HEADER_HEIGHT = scale(
    62,
    68,
    74,
    80
  );

  const HERO_HEIGHT = scale(
    430,
    470,
    520,
    570
  );

  const CATEGORY_CARD_WIDTH =
    scale(
      118,
      128,
      140,
      155
    );

  const CATEGORY_CARD_HEIGHT =
    scale(
      150,
      160,
      172,
      190
    );

  const scrollRef =
    useRef(null);

  const [fontsLoaded] =
    useFonts({
      Montserrat:
        Montserrat_400Regular,

      MontserratMedium:
        Montserrat_500Medium,

      MontserratSemiBold:
        Montserrat_600SemiBold,

      MontserratBold:
        Montserrat_700Bold,

      MontserratExtraBold:
        Montserrat_800ExtraBold,

      BebasNeue:
        BebasNeue_400Regular,
    });

  const [products, setProducts] =
    useState(
      FALLBACK_PRODUCTS
    );

  const [
    selectedCategory,
    setSelectedCategory,
  ] = useState("ALL");

  const [
    searchText,
    setSearchText,
  ] = useState("");

  const [
    searchVisible,
    setSearchVisible,
  ] = useState(false);

  const [
    menuVisible,
    setMenuVisible,
  ] = useState(false);

  const [
    heroIndex,
    setHeroIndex,
  ] = useState(0);

  /* =======================================================
     HIDE NATIVE TAB BAR
  ======================================================= */

  useEffect(() => {
    const parent =
      navigation.getParent?.();

    parent?.setOptions({
      tabBarStyle: {
        display: "none",
        height: 0,
        padding: 0,
        borderTopWidth: 0,
      },
    });

    return () => {
      parent?.setOptions({
        tabBarStyle:
          undefined,
      });
    };
  }, [navigation]);

  /* =======================================================
     FETCH PRODUCTS
  ======================================================= */

  useEffect(() => {
    let alive = true;

    const controller =
      new AbortController();

    const timeout = setTimeout(
      () => {
        controller.abort();
      },
      6000
    );

    const loadProducts =
      async () => {
        try {
          const response =
            await fetch(
              `${API_BASE_URL}/api/products?page=1&limit=50`,
              {
                method: "GET",
                signal:
                  controller.signal,
              }
            );

          if (!response.ok) {
            throw new Error(
              `HTTP ${response.status}`
            );
          }

          const data =
            await response.json();

          const fetchedProducts =
            Array.isArray(
              data?.products
            )
              ? data.products
              : Array.isArray(data)
                ? data
                : [];

          if (
            alive &&
            fetchedProducts.length >
              0
          ) {
            setProducts(
              fetchedProducts
            );
          }
        } catch (error) {
          console.log(
            "Catalog product fetch:",
            error?.message ||
              error
          );
        } finally {
          clearTimeout(timeout);
        }
      };

    loadProducts();

    return () => {
      alive = false;
      clearTimeout(timeout);
      controller.abort();
    };
  }, []);

  /* =======================================================
     HERO PRODUCTS
  ======================================================= */

  const heroProducts =
    products.length > 0
      ? products.slice(0, 5)
      : FALLBACK_PRODUCTS;

  const currentProduct =
    heroProducts[
      heroIndex %
        heroProducts.length
    ] ||
    FALLBACK_PRODUCTS[0];

  /* =======================================================
     AUTO HERO CAROUSEL
  ======================================================= */

  useEffect(() => {
    if (heroProducts.length < 2) {
      return;
    }

    const timer = setInterval(() => {
      setHeroIndex((index) =>
        (index + 1) % heroProducts.length
      );
    }, 5000);

    return () => {
      clearInterval(timer);
    };
  }, [heroProducts.length]);

  /* =======================================================
     NAVIGATION
  ======================================================= */

  const getRootNavigation =
    () => {
      let root = navigation;

      let parent =
        root?.getParent?.();

      while (parent) {
        root = parent;

        parent =
          root?.getParent?.();
      }

      return root;
    };

  const goToTab = (
    tabName
  ) => {
    setMenuVisible(false);

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
          screen: tabName,
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
          screen: tabName,
        }
      );
    } catch (error) {
      console.warn(
        "Navigation error:",
        error
      );
    }
  };

  const openHome = () => {
    setMenuVisible(false);
  };

  /*
   * GUEST: browsing products/categories is allowed.
   * Mark the route as guest so downstream screens can
   * preserve the guest restrictions.
   */
  const openProducts = (
    category = "ALL"
  ) => {
    setMenuVisible(false);

    const root =
      getRootNavigation();

    if (!root) {
      return;
    }

    try {
      root.navigate(
        "ProductOverview",
        {
          category,
          isGuest: true,
        }
      );
    } catch (error) {
      console.warn(
        "Unable to open ProductOverview:",
        error
      );
    }
  };

  const openOrders = () => {
    setMenuVisible(false);
    navigation.navigate("Login");
  };

  const openChat = () => {
    setMenuVisible(false);

    const root =
      getRootNavigation();

    if (!root) {
      return;
    }

    try {
      root.navigate(
        "Main",
        {
          screen:
            "ChatbotTab",
        }
      );
    } catch (error) {
      console.warn(
        "Unable to open AI Chat:",
        error
      );
    }
  };

  const openCart = () => {
    setMenuVisible(false);
    navigation.navigate("Login");
  };

  const openProfile = () => {
    setMenuVisible(false);
    navigation.navigate("Login");
  };

  const goToProduct = (
    product
  ) => {
    setMenuVisible(false);

    const root =
      getRootNavigation();

    if (!root) {
      return;
    }

    try {
      root.navigate(
        "ProductOverview",
        {
          product,
          isGuest: true,
        }
      );
    } catch (error) {
      try {
        root.navigate(
          "ProductDetail",
          {
            product,
            isGuest: true,
          }
        );
      } catch (
        fallbackError
      ) {
        console.warn(
          "Product navigation error:",
          fallbackError
        );
      }
    }
  };

  /* =======================================================
     UPDATED CATEGORY CLICK
  ======================================================= */

  const selectCategory =
    (category) => {
      setSelectedCategory(
        category
      );

      setMenuVisible(false);

      /*
       * Open ProductOverview immediately
       * and send the selected category.
       */
      openProducts(category);
    };

  const submitSearch =
    () => {
      setSearchVisible(
        false
      );
    };

  /* =======================================================
     LOADING
  ======================================================= */

  if (!fontsLoaded) {
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
            width:
              LOGO_WIDTH,
            height:
              LOGO_WIDTH *
              0.32,
          }}
          resizeMode="contain"
        />

        <ActivityIndicator
          color={
            COLORS.primary
          }
          size="large"
          style={{
            marginTop: 25,
          }}
        />

        <Text
          style={
            styles.loadingText
          }
        >
          LOADING...
        </Text>
      </View>
    );
  }

  return (
    <View
      style={
        styles.safeArea
      }
    >
      <StatusBar
        barStyle="light-content"
        backgroundColor={
          COLORS.backgroundDeep
        }
        translucent={false}
      />

      {/* HEADER */}

      <View
        style={[
          styles.headerWrapper,
          {
            paddingTop: scale(
              8,
              9,
              10,
              12
            ),
          },
        ]}
      >
        <View
          style={[
            styles.header,
            {
              height:
                HEADER_HEIGHT,

              paddingHorizontal:
                scale(
                  8,
                  12,
                  18,
                  24
                ),
            },
          ]}
        >
          <TouchableOpacity
            style={
              styles.headerIconButton
            }
            onPress={() =>
              setMenuVisible(
                true
              )
            }
            activeOpacity={0.7}
          >
            <Ionicons
              name="menu"
              size={scale(
                28,
                31,
                34,
                37
              )}
              color={
                COLORS.white
              }
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={
              styles.logoWrapper
            }
            onPress={
              openHome
            }
            activeOpacity={0.8}
          >
            <Image
              source={require("../assets/images/pmg-logo-nav.png")}
              style={{
                width:
                  LOGO_WIDTH,
                height:
                  LOGO_WIDTH *
                  0.32,
              }}
              resizeMode="contain"
            />
          </TouchableOpacity>

          <View
            style={
              styles.headerActions
            }
          >
            <TouchableOpacity
              style={
                styles.headerIconButton
              }
              onPress={() =>
                setSearchVisible(
                  true
                )
              }
              activeOpacity={0.7}
            >
              <Ionicons
                name="search-outline"
                size={scale(
                  23,
                  25,
                  27,
                  29
                )}
                color={
                  COLORS.white
                }
              />
            </TouchableOpacity>

            <TouchableOpacity
              style={
                styles.headerIconButton
              }
              onPress={
                openCart
              }
              activeOpacity={0.7}
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
        </View>

        <View
          style={
            styles.headerLine
          }
        />
      </View>

      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={
          false
        }
        contentContainerStyle={{
          paddingBottom:
            scale(
              30,
              35,
              40,
              45
            ),
        }}
      >
        {/* HERO */}

        <View
          style={[
            styles.hero,
            {
              height:
                HERO_HEIGHT,
            },
          ]}
        >
          <View
            style={
              styles.heroBorderLeft
            }
          />

          <View
            style={
              styles.heroBorderRight
            }
          />

          <View
            style={[
              styles.heroContent,
              {
                paddingHorizontal:
                  SIDE_PADDING,
              },
            ]}
          >
            <View
              style={
                styles.heroLeft
              }
            >
              <View
                style={
                  styles.heroBadge
                }
              >
                <Text
                  style={
                    styles.heroBadgeText
                  }
                >
                  PMG PRINTING HOUSE
                </Text>
              </View>

              <Text
                style={[
                  styles.heroTitle,
                  {
                    fontSize:
                      scale(
                        42,
                        48,
                        56,
                        64
                      ),
                  },
                ]}
              >
                PRINT
              </Text>

              <Text
                style={[
                  styles.heroTitle,
                  {
                    fontSize:
                      scale(
                        42,
                        48,
                        56,
                        64
                      ),
                  },
                ]}
              >
                CREATE{" "}
                <Text
                  style={
                    styles.greenText
                  }
                >
                  DELIVER
                </Text>
              </Text>

              <Text
                style={[
                  styles.heroDescription,
                  {
                    fontSize:
                      scale(
                        10,
                        11,
                        12,
                        13
                      ),
                    lineHeight:
                      scale(
                        15,
                        16,
                        18,
                        20
                      ),
                  },
                ]}
              >
                Quality printing products
                made for your business,
                events, and personal
                projects.
              </Text>

              <TouchableOpacity
                style={[
                  styles.shopButton,
                  {
                    height:
                      scale(
                        45,
                        48,
                        52,
                        56
                      ),
                  },
                ]}
                onPress={() =>
                  openProducts(
                    "ALL"
                  )
                }
                activeOpacity={0.85}
              >
                <Text
                  style={[
                    styles.shopButtonText,
                    {
                      fontSize:
                        scale(
                          10,
                          11,
                          12,
                          13
                        ),
                    },
                  ]}
                >
                  SHOP PRODUCTS
                </Text>

                <Ionicons
                  name="arrow-forward"
                  size={20}
                  color="#071000"
                />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={
                styles.heroProduct
              }
              onPress={() =>
                goToProduct(
                  currentProduct
                )
              }
              activeOpacity={0.85}
            >
              <Image
                source={
                  productImageSource(
                    currentProduct
                  )
                }
                style={{
                  width:
                    scale(
                      145,
                      175,
                      215,
                      260
                    ),
                  height:
                    scale(
                      180,
                      210,
                      250,
                      300
                    ),
                }}
                resizeMode="contain"
              />

              <View
                style={
                  styles.heroProductLabel
                }
              >
                <Text
                  style={
                    styles.heroProductLabelText
                  }
                >
                  {productName(
                    currentProduct
                  ).toUpperCase()}
                </Text>
              </View>
            </TouchableOpacity>
          </View>

          <View
            style={
              styles.heroDots
            }
          >
            {heroProducts.map(
              (_, index) => (
                <TouchableOpacity
                  key={index}
                  onPress={() =>
                    setHeroIndex(
                      index
                    )
                  }
                  style={[
                    styles.heroDot,
                    index ===
                      heroIndex &&
                      styles.heroDotActive,
                  ]}
                />
              )
            )}
          </View>
        </View>

        {/* CATEGORIES */}

        <View
          style={[
            styles.categorySection,
            {
              paddingLeft:
                SIDE_PADDING,
            },
          ]}
        >
          <View
            style={
              styles.categoryHeader
            }
          >
            <Text
              style={[
                styles.categoryTitle,
                {
                  fontSize:
                    scale(
                      11,
                      12,
                      13,
                      14
                    ),
                },
              ]}
            >
              CATEGORIES
            </Text>

            <TouchableOpacity
              style={
                styles.categoryViewAll
              }
              onPress={() =>
                openProducts(
                  "ALL"
                )
              }
            >
              <Text
                style={
                  styles.categoryViewAllText
                }
              >
                VIEW ALL
              </Text>

              <Ionicons
                name="arrow-forward"
                size={17}
                color={
                  COLORS.primary
                }
              />
            </TouchableOpacity>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={
              false
            }
            contentContainerStyle={{
              paddingRight:
                SIDE_PADDING,
              paddingVertical: 4,
            }}
          >
            {CATEGORY_DATA.map(
              (category) => {
                const isSelected =
                  selectedCategory ===
                  category.id;

                return (
                  <TouchableOpacity
                    key={
                      category.id
                    }
                    style={[
                      styles.categoryCard,
                      {
                        width:
                          CATEGORY_CARD_WIDTH,
                        height:
                          CATEGORY_CARD_HEIGHT,
                      },
                      isSelected &&
                        styles.categoryCardSelected,
                    ]}
                    onPress={() =>
                      selectCategory(
                        category.id
                      )
                    }
                    activeOpacity={
                      0.82
                    }
                  >
                    <View
                      style={
                        styles.categoryImageArea
                      }
                    >
                      <Image
                        source={
                          category.image
                        }
                        style={
                          styles.categoryImage
                        }
                        resizeMode="contain"
                      />
                    </View>
                  </TouchableOpacity>
                );
              }
            )}
          </ScrollView>
        </View>

        {/* POPULAR PRODUCTS */}

        <View
          style={[
            styles.section,
            {
              paddingHorizontal:
                SIDE_PADDING,
            },
          ]}
        >
          <View
            style={
              styles.sectionHeader
            }
          >
            <View>
              <Text
                style={
                  styles.sectionEyebrow
                }
              >
                EXPLORE
              </Text>

              <Text
                style={[
                  styles.sectionTitle,
                  {
                    fontSize:
                      scale(
                        34,
                        37,
                        40,
                        44
                      ),
                  },
                ]}
              >
                POPULAR PRODUCTS
              </Text>
            </View>

            <TouchableOpacity
              onPress={() =>
                openProducts(
                  "ALL"
                )
              }
            >
              <Text
                style={
                  styles.viewAll
                }
              >
                VIEW ALL
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={
              false
            }
          >
            {products
              .slice(0, 8)
              .map(
                (
                  product,
                  index
                ) => {
                  const price =
                    productPrice(
                      product
                    );

                  return (
                    <TouchableOpacity
                      key={
                        product?.id ||
                        product?._id ||
                        index
                      }
                      style={[
                        styles.popularCard,
                        {
                          width:
                            scale(
                              170,
                              185,
                              205,
                              225
                            ),
                        },
                      ]}
                      onPress={() =>
                        goToProduct(
                          product
                        )
                      }
                      activeOpacity={
                        0.85
                      }
                    >
                      <View
                        style={
                          styles.popularImage
                        }
                      >
                        <Image
                          source={
                            productImageSource(
                              product
                            )
                          }
                          style={{
                            width:
                              "90%",
                            height:
                              "90%",
                          }}
                          resizeMode="contain"
                        />

                        <View
                          style={
                            styles.heart
                          }
                        >
                          <Ionicons
                            name="heart-outline"
                            size={17}
                            color={
                              COLORS.white
                            }
                          />
                        </View>
                      </View>

                      <Text
                        style={
                          styles.productName
                        }
                        numberOfLines={
                          1
                        }
                      >
                        {productName(
                          product
                        )}
                      </Text>

                      <View
                        style={
                          styles.productBottom
                        }
                      >
                        <Text
                          style={
                            styles.price
                          }
                        >
                          ₱
                          {Number(
                            price || 0
                          ).toLocaleString()}
                        </Text>

                        <TouchableOpacity
                          style={
                            styles.plusButton
                          }
                          onPress={() =>
                            navigation.navigate("Login")
                          }
                          activeOpacity={0.8}
                        >
                          <Ionicons
                            name="add"
                            size={19}
                            color="#071000"
                          />
                        </TouchableOpacity>
                      </View>
                    </TouchableOpacity>
                  );
                }
              )}
          </ScrollView>
        </View>

        {/* WHY CHOOSE PMG */}

        <View
          style={[
            styles.section,
            {
              paddingHorizontal:
                SIDE_PADDING,
            },
          ]}
        >
          <Text
            style={
              styles.sectionEyebrow
            }
          >
            WHY US
          </Text>

          <Text
            style={[
              styles.sectionTitle,
              {
                fontSize:
                  scale(
                    34,
                    37,
                    40,
                    44
                  ),
              },
            ]}
          >
            WHY CHOOSE PMG
          </Text>

          <View
            style={
              styles.benefitGrid
            }
          >
            <BenefitCard
              icon="flash-outline"
              title="FAST SERVICE"
              text="Quick turnaround for your printing needs."
            />

            <BenefitCard
              icon="ribbon-outline"
              title="PREMIUM QUALITY"
              text="Professional printing with quality materials."
            />

            <BenefitCard
              icon="color-palette-outline"
              title="CUSTOM DESIGN"
              text="Create personalized products that fit your brand."
            />

            <BenefitCard
              icon="shield-checkmark-outline"
              title="RELIABLE"
              text="Your orders are handled with care from start to finish."
            />
          </View>
        </View>

        {/* CTA */}

        <View
          style={[
            styles.section,
            {
              paddingHorizontal:
                SIDE_PADDING,
            },
          ]}
        >
          <LinearGradient
            colors={[
              "#102A16",
              "#06120B",
            ]}
            style={
              styles.ctaGradient
            }
          >
            <Text
              style={[
                styles.ctaTitle,
                {
                  fontSize:
                    scale(
                      34,
                      38,
                      42,
                      48
                    ),
                },
              ]}
            >
              HAVE A CUSTOM
              PROJECT?
            </Text>

            <Text
              style={
                styles.ctaText
              }
            >
              Tell us what you need
              and we'll help turn
              your idea into a
              finished print.
            </Text>

            <TouchableOpacity
              style={
                styles.ctaButton
              }
              onPress={
                openChat
              }
              activeOpacity={0.85}
            >
              <Text
                style={
                  styles.ctaButtonText
                }
              >
                TALK TO PMG
              </Text>

              <Ionicons
                name="arrow-forward"
                size={20}
                color="#071000"
              />
            </TouchableOpacity>
          </LinearGradient>
        </View>

        {/* FOOTER */}

        <View
          style={
            styles.footer
          }
        >
          <Image
            source={require("../assets/images/pmg-logo-nav.png")}
            style={{
              width:
                scale(
                  130,
                  145,
                  160,
                  175
                ),
              height:
                scale(
                  42,
                  46,
                  52,
                  58
                ),
            }}
            resizeMode="contain"
          />

          <Text
            style={
              styles.footerText
            }
          >
            PRINT • CREATE • DELIVER
          </Text>

          <Text
            style={
              styles.footerCopyright
            }
          >
            © PMG PRINTING HOUSE
          </Text>
        </View>
      </ScrollView>

      {/* SEARCH MODAL */}

      <Modal
        visible={
          searchVisible
        }
        transparent
        animationType="fade"
        onRequestClose={() =>
          setSearchVisible(
            false
          )
        }
      >
        <View
          style={
            styles.modalOverlay
          }
        >
          <View
            style={[
              styles.searchModal,
              {
                width:
                  isSmall
                    ? "92%"
                    : "90%",
              },
            ]}
          >
            <View
              style={
                styles.modalHeader
              }
            >
              <Text
                style={
                  styles.modalTitle
                }
              >
                SEARCH PRODUCTS
              </Text>

              <TouchableOpacity
                onPress={() =>
                  setSearchVisible(
                    false
                  )
                }
              >
                <Ionicons
                  name="close"
                  size={25}
                  color={
                    COLORS.white
                  }
                />
              </TouchableOpacity>
            </View>

            <View
              style={
                styles.searchInputWrapper
              }
            >
              <Ionicons
                name="search-outline"
                size={19}
                color={
                  COLORS.textMuted
                }
              />

              <TextInput
                value={
                  searchText
                }
                onChangeText={
                  setSearchText
                }
                placeholder="Search products..."
                placeholderTextColor={
                  COLORS.textMuted
                }
                style={
                  styles.searchInput
                }
                autoFocus
                returnKeyType="search"
                onSubmitEditing={
                  submitSearch
                }
              />
            </View>

            <TouchableOpacity
              style={
                styles.searchButton
              }
              onPress={
                submitSearch
              }
            >
              <Text
                style={
                  styles.searchButtonText
                }
              >
                SEARCH
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* SIDE MENU */}

      <Modal
        visible={
          menuVisible
        }
        transparent
        animationType="slide"
        onRequestClose={() =>
          setMenuVisible(
            false
          )
        }
      >
        <View
          style={
            styles.menuOverlay
          }
        >
          <View
            style={[
              styles.menuPanel,
              {
                width:
                  isSmall
                    ? "82%"
                    : isMedium
                      ? "78%"
                      : isLarge
                        ? "72%"
                        : "65%",
              },
            ]}
          >
            <View
              style={
                styles.menuHeader
              }
            >
              <Image
                source={require("../assets/images/pmg-logo-nav.png")}
                style={{
                  width:
                    scale(
                      130,
                      145,
                      160,
                      175
                    ),
                  height:
                    scale(
                      42,
                      46,
                      52,
                      58
                    ),
                }}
                resizeMode="contain"
              />

              <TouchableOpacity
                onPress={() =>
                  setMenuVisible(
                    false
                  )
                }
              >
                <Ionicons
                  name="close"
                  size={27}
                  color={
                    COLORS.white
                  }
                />
              </TouchableOpacity>
            </View>

            <View
              style={
                styles.menuDivider
              }
            />

            <MenuItem
              icon="home-outline"
              title="HOME"
              onPress={
                openHome
              }
            />

            <MenuItem
              icon="grid-outline"
              title="PRODUCTS"
              onPress={() =>
                openProducts(
                  "ALL"
                )
              }
            />

            <MenuItem
              icon="receipt-outline"
              title="ORDERS"
              onPress={
                openOrders
              }
            />

            <MenuItem
              icon="sparkles-outline"
              title="AI CHAT"
              onPress={
                openChat
              }
            />

            <MenuItem
              icon="cart-outline"
              title="CART"
              onPress={
                openCart
              }
            />

            <MenuItem
              icon="person-outline"
              title="PROFILE"
              onPress={
                openProfile
              }
            />

            <View
              style={
                styles.menuBottom
              }
            >
              <Text
                style={
                  styles.menuBottomTitle
                }
              >
                PMG PRINTING HOUSE
              </Text>

              <Text
                style={
                  styles.menuBottomText
                }
              >
                PRINT • CREATE • DELIVER
              </Text>
            </View>
          </View>

          <Pressable
            style={
              styles.menuOutside
            }
            onPress={() =>
              setMenuVisible(
                false
              )
            }
          />
        </View>
      </Modal>
    </View>
  );
}

/* =========================================================
   BENEFIT CARD
========================================================= */

function BenefitCard({
  icon,
  title,
  text,
}) {
  return (
    <View
      style={
        styles.benefitCard
      }
    >
      <Ionicons
        name={icon}
        size={27}
        color={
          COLORS.primary
        }
      />

      <Text
        style={
          styles.benefitTitle
        }
      >
        {title}
      </Text>

      <Text
        style={
          styles.benefitText
        }
      >
        {text}
      </Text>
    </View>
  );
}

/* =========================================================
   MENU ITEM
========================================================= */

function MenuItem({
  icon,
  title,
  onPress,
}) {
  return (
    <TouchableOpacity
      style={
        styles.menuItem
      }
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Ionicons
        name={icon}
        size={22}
        color={
          COLORS.primary
        }
      />

      <Text
        style={
          styles.menuItemText
        }
      >
        {title}
      </Text>
    </TouchableOpacity>
  );
}

/* =========================================================
   STYLES
========================================================= */

const styles =
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
      fontSize: 20,
      letterSpacing: 3,
      marginTop: 14,
    },

    headerWrapper: {
      width: "100%",
      backgroundColor:
        COLORS.backgroundDeep,
    },

    header: {
      width: "100%",
      backgroundColor:
        COLORS.backgroundDeep,
      flexDirection:
        "row",
      alignItems:
        "center",
      justifyContent:
        "space-between",
    },

    headerLine: {
      height: 1,
      backgroundColor:
        "rgba(182,255,0,0.18)",
    },

    headerIconButton: {
      width: 42,
      minWidth: 36,
      height: 44,
      alignItems:
        "center",
      justifyContent:
        "center",
    },

    logoWrapper: {
      flex: 1,
      height: "100%",
      alignItems:
        "center",
      justifyContent:
        "center",
    },

    headerActions: {
      flexDirection:
        "row",
      alignItems:
        "center",
      justifyContent:
        "flex-end",
    },

    hero: {
      position:
        "relative",
      overflow:
        "hidden",
      backgroundColor:
        COLORS.backgroundDeep,
      justifyContent:
        "center",
      borderBottomWidth:
        1,
      borderBottomColor:
        "rgba(182,255,0,0.1)",
    },

    heroContent: {
      flex: 1,
      flexDirection:
        "row",
      alignItems:
        "center",
      justifyContent:
        "space-between",
      zIndex: 5,
    },

    heroLeft: {
      justifyContent:
        "center",
      zIndex: 10,
      flex: 1,
    },

    heroProduct: {
      alignItems:
        "center",
      justifyContent:
        "center",
      zIndex: 5,
    },

    heroBorderLeft: {
      position:
        "absolute",
      left: 0,
      top: "8%",
      bottom: "8%",
      width: "48%",
      borderWidth: 2,
      borderRightWidth:
        0,
      borderColor:
        COLORS.primary,
      borderTopLeftRadius:
        50,
      borderBottomLeftRadius:
        50,
    },

    heroBorderRight: {
      position:
        "absolute",
      right: 0,
      top: "8%",
      bottom: "8%",
      width: "48%",
      borderWidth: 2,
      borderLeftWidth:
        0,
      borderColor:
        COLORS.primary,
      borderTopRightRadius:
        50,
      borderBottomRightRadius:
        50,
    },

    heroBadge: {
      alignSelf:
        "flex-start",
      borderWidth: 2,
      borderColor:
        COLORS.primary,
      borderRadius: 28,
      paddingHorizontal: 14,
      paddingVertical: 6,
      marginBottom: 14,
    },

    heroBadgeText: {
      color:
        COLORS.primary,
      fontFamily:
        "MontserratBold",
      letterSpacing: 1.5,
      fontSize: 9,
    },

    heroTitle: {
      color:
        COLORS.white,
      fontFamily:
        "BebasNeue",
    },

    greenText: {
      color:
        COLORS.primary,
    },

    heroDescription: {
      color:
        COLORS.textSecondary,
      fontFamily:
        "Montserrat",
      maxWidth: 235,
      marginTop: 8,
      marginBottom: 14,
    },

    shopButton: {
      width: "100%",
      maxWidth: 360,
      backgroundColor:
        COLORS.primary,
      borderRadius: 40,
      paddingHorizontal: 20,
      flexDirection:
        "row",
      alignItems:
        "center",
      justifyContent:
        "space-between",
    },

    shopButtonText: {
      color: "#071000",
      fontFamily:
        "MontserratExtraBold",
      letterSpacing: 0.5,
    },

    heroProductLabel: {
      backgroundColor:
        "rgba(0,0,0,0.6)",
      borderWidth: 1,
      borderColor:
        "rgba(182,255,0,.5)",
      borderRadius: 20,
      paddingHorizontal: 12,
      paddingVertical: 5,
    },

    heroProductLabelText: {
      color:
        COLORS.primary,
      fontFamily:
        "MontserratBold",
      fontSize: 9,
      letterSpacing: 1,
    },

    heroDots: {
      position:
        "absolute",
      bottom: 20,
      left: 0,
      right: 0,
      flexDirection:
        "row",
      justifyContent:
        "center",
      alignItems:
        "center",
      gap: 9,
    },

    heroDot: {
      width: 13,
      height: 13,
      borderRadius: 7,
      backgroundColor:
        "rgba(255,255,255,.35)",
    },

    heroDotActive: {
      width: 45,
      backgroundColor:
        COLORS.primary,
    },

    categorySection: {
      marginTop: 26,
    },

    categoryHeader: {
      flexDirection:
        "row",
      alignItems:
        "center",
      justifyContent:
        "space-between",
      marginBottom: 12,
      paddingRight: 14,
    },

    categoryTitle: {
      color:
        COLORS.primary,
      fontFamily:
        "MontserratExtraBold",
      letterSpacing: 2.2,
    },

    categoryViewAll: {
      flexDirection:
        "row",
      alignItems:
        "center",
      gap: 6,
    },

    categoryViewAllText: {
      color:
        COLORS.primary,
      fontFamily:
        "MontserratBold",
      fontSize: 9,
      letterSpacing: 1,
    },

    categoryCard: {
      backgroundColor:
        "#07140C",
      borderRadius: 18,
      borderWidth: 1,
      borderColor:
        "rgba(91,155,40,.28)",
      alignItems:
        "center",
      justifyContent:
        "center",
      marginRight: 10,
      overflow:
        "hidden",
    },

    categoryCardSelected: {
      borderColor:
        "rgba(182,255,0,.7)",
      backgroundColor:
        "#092014",
    },

    categoryImageArea: {
      width: "92%",
      height: "92%",
      alignItems:
        "center",
      justifyContent:
        "center",
    },

    categoryImage: {
      width: "91%",
      height: "91%",
    },

    section: {
      marginTop: 30,
    },

    sectionHeader: {
      flexDirection:
        "row",
      alignItems:
        "flex-end",
      justifyContent:
        "space-between",
      marginBottom: 15,
    },

    sectionEyebrow: {
      color:
        COLORS.primary,
      fontFamily:
        "MontserratExtraBold",
      fontSize: 11,
      letterSpacing: 2.2,
      marginBottom: 5,
    },

    sectionTitle: {
      color:
        COLORS.white,
      fontFamily:
        "BebasNeue",
      letterSpacing: 0.8,
    },

    viewAll: {
      color:
        COLORS.primary,
      fontFamily:
        "MontserratBold",
      fontSize: 9,
      letterSpacing: 1,
    },

    popularCard: {
      backgroundColor:
        "#07140C",
      borderRadius: 22,
      marginRight: 13,
      padding: 10,
      borderWidth: 1,
      borderColor:
        "rgba(182,255,0,.12)",
    },

    popularImage: {
      height: 145,
      backgroundColor:
        "#020D08",
      borderRadius: 17,
      alignItems:
        "center",
      justifyContent:
        "center",
      position:
        "relative",
    },

    heart: {
      position:
        "absolute",
      top: 9,
      right: 9,
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor:
        "rgba(0,0,0,.45)",
      alignItems:
        "center",
      justifyContent:
        "center",
    },

    productName: {
      color:
        COLORS.white,
      fontFamily:
        "MontserratSemiBold",
      fontSize: 13,
      marginTop: 10,
    },

    productBottom: {
      flexDirection:
        "row",
      alignItems:
        "center",
      justifyContent:
        "space-between",
      marginTop: 8,
    },

    price: {
      color:
        COLORS.primary,
      fontFamily:
        "MontserratBold",
      fontSize: 14,
    },

    plusButton: {
      width: 34,
      height: 34,
      borderRadius: 17,
      backgroundColor:
        COLORS.primary,
      alignItems:
        "center",
      justifyContent:
        "center",
    },

    benefitGrid: {
      flexDirection:
        "row",
      flexWrap:
        "wrap",
      justifyContent:
        "space-between",
      marginTop: 16,
    },

    benefitCard: {
      width: "48.5%",
      minHeight: 155,
      backgroundColor:
        "#07140C",
      borderRadius: 18,
      borderWidth: 1,
      borderColor:
        "rgba(182,255,0,.12)",
      padding: 15,
      marginBottom: 10,
    },

    benefitTitle: {
      color:
        COLORS.white,
      fontFamily:
        "MontserratBold",
      fontSize: 11,
      marginTop: 12,
    },

    benefitText: {
      color:
        COLORS.textSecondary,
      fontFamily:
        "Montserrat",
      fontSize: 10,
      lineHeight: 16,
      marginTop: 7,
    },

    ctaGradient: {
      paddingHorizontal: 22,
      paddingVertical: 30,
      borderWidth: 1,
      borderColor:
        "rgba(182,255,0,.2)",
      borderRadius: 25,
    },

    ctaTitle: {
      color:
        COLORS.white,
      fontFamily:
        "BebasNeue",
    },

    ctaText: {
      color:
        COLORS.textSecondary,
      fontFamily:
        "Montserrat",
      fontSize: 11,
      lineHeight: 18,
      marginTop: 8,
      maxWidth: 300,
    },

    ctaButton: {
      marginTop: 20,
      height: 48,
      backgroundColor:
        COLORS.primary,
      borderRadius: 25,
      paddingHorizontal: 18,
      flexDirection:
        "row",
      alignItems:
        "center",
      justifyContent:
        "space-between",
    },

    ctaButtonText: {
      color: "#071000",
      fontFamily:
        "MontserratBold",
      fontSize: 12,
    },

    footer: {
      alignItems:
        "center",
      paddingTop: 45,
      paddingBottom: 30,
    },

    footerText: {
      color:
        COLORS.textMuted,
      fontFamily:
        "MontserratSemiBold",
      fontSize: 9,
      letterSpacing: 1.5,
      marginTop: 8,
    },

    footerCopyright: {
      color:
        "rgba(255,255,255,.35)",
      fontFamily:
        "Montserrat",
      fontSize: 9,
      marginTop: 5,
    },

    modalOverlay: {
      flex: 1,
      backgroundColor:
        "rgba(0,0,0,.78)",
      alignItems:
        "center",
      justifyContent:
        "center",
    },

    searchModal: {
      backgroundColor:
        "#07140C",
      borderRadius: 22,
      padding: 18,
      borderWidth: 1,
      borderColor:
        "rgba(182,255,0,.2)",
    },

    modalHeader: {
      flexDirection:
        "row",
      alignItems:
        "center",
      justifyContent:
        "space-between",
      marginBottom: 18,
    },

    modalTitle: {
      color:
        COLORS.white,
      fontFamily:
        "MontserratBold",
      fontSize: 14,
    },

    searchInputWrapper: {
      height: 50,
      borderRadius: 14,
      backgroundColor:
        "#020D08",
      borderWidth: 1,
      borderColor:
        "rgba(182,255,0,.2)",
      flexDirection:
        "row",
      alignItems:
        "center",
      paddingHorizontal: 13,
      gap: 9,
    },

    searchInput: {
      flex: 1,
      color:
        COLORS.white,
      fontFamily:
        "Montserrat",
      fontSize: 13,
    },

    searchButton: {
      height: 48,
      borderRadius: 24,
      backgroundColor:
        COLORS.primary,
      alignItems:
        "center",
      justifyContent:
        "center",
      marginTop: 14,
    },

    searchButtonText: {
      color: "#071000",
      fontFamily:
        "MontserratBold",
      fontSize: 12,
      letterSpacing: 1,
    },

    menuOverlay: {
      flex: 1,
      flexDirection:
        "row",
      backgroundColor:
        "rgba(0,0,0,.55)",
    },

    menuPanel: {
      height: "100%",
      backgroundColor:
        "#020D08",
      paddingHorizontal: 20,
      borderRightWidth: 1,
      borderRightColor:
        "rgba(182,255,0,.18)",
    },

    menuOutside: {
      flex: 1,
    },

    menuHeader: {
      flexDirection:
        "row",
      alignItems:
        "center",
      justifyContent:
        "space-between",
      paddingTop: 32,
      paddingBottom: 15,
    },

    menuDivider: {
      height: 1,
      backgroundColor:
        "rgba(182,255,0,.14)",
      marginBottom: 10,
    },

    menuItem: {
      minHeight: 58,
      flexDirection:
        "row",
      alignItems:
        "center",
      gap: 14,
      borderBottomWidth: 1,
      borderBottomColor:
        "rgba(255,255,255,.04)",
    },

    menuItemText: {
      color:
        COLORS.white,
      fontFamily:
        "MontserratSemiBold",
      fontSize: 12,
      letterSpacing: 0.6,
    },

    menuBottom: {
      marginTop: "auto",
      paddingBottom: 35,
      paddingTop: 25,
    },

    menuBottomTitle: {
      color:
        COLORS.primary,
      fontFamily:
        "MontserratBold",
      fontSize: 12,
      letterSpacing: 1,
    },

    menuBottomText: {
      color:
        COLORS.textMuted,
      fontFamily:
        "Montserrat",
      fontSize: 9,
      letterSpacing: 1.2,
      marginTop: 5,
    },
  });