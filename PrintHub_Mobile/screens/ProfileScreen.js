import React, {
  useState,
  useEffect,
} from "react";

import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Alert,
  ScrollView,
  Image,
  useWindowDimensions,
} from "react-native";

import AsyncStorage from "@react-native-async-storage/async-storage";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  useIsFocused,
} from "@react-navigation/native";

import { Ionicons } from "@expo/vector-icons";

import { useFonts } from "expo-font";

import {
  Poppins_400Regular,
  Poppins_500Medium,
  Poppins_600SemiBold,
  Poppins_700Bold,
} from "@expo-google-fonts/poppins";

import { COLORS } from "../theme";
import { API_BASE_URL } from "../config";

import pmgLogo from "../assets/images/pmg-logo-nav.png";


/*
============================================================
PROFILE SCREEN
============================================================
*/

export default function ProfileScreen({
  navigation,
}) {
  /*
  ==========================================================
  RESPONSIVE
  ==========================================================
  */

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
    if (isSmall) return small;

    if (isMedium) return medium;

    if (isLarge) return large;

    return xlarge;
  };


  /*
  ==========================================================
  FONTS
  ==========================================================
  */

  const [fontsLoaded] =
    useFonts({
      Poppins_400Regular,
      Poppins_500Medium,
      Poppins_600SemiBold,
      Poppins_700Bold,
    });


  /*
  ==========================================================
  STATE
  ==========================================================
  */

  const [user, setUser] =
    useState(null);

  const [avatarUrl, setAvatarUrl] =
    useState(null);

  const isFocused =
    useIsFocused();


  /*
  ==========================================================
  GET LOCAL USER
  ==========================================================
  */

  const GetLocalUser =
    async () => {
      try {
        const savedUser =
          await AsyncStorage.getItem(
            "user"
          );

        if (savedUser) {
          const parsed =
            JSON.parse(savedUser);

          setUser(parsed);

          if (parsed?.id) {
            fetchUserProfile(
              parsed.id
            );
          }
        } else {
          setUser(null);
          setAvatarUrl(null);
        }
      } catch (err) {
        console.error(
          "[GetLocalUser] {ReadStorage}: " +
            err.message
        );
      }
    };


  /*
  ==========================================================
  REFRESH PROFILE WHEN SCREEN IS FOCUSED
  ==========================================================
  */

  useEffect(() => {
    if (isFocused) {
      GetLocalUser();
    }
  }, [isFocused]);


  /*
  ==========================================================
  FETCH PROFILE
  ==========================================================
  */

  const fetchUserProfile =
    async (userId) => {
      try {
        const res =
          await fetch(
            `${API_BASE_URL}/api/user-profile/${userId}`
          );

        if (res.ok) {
          const data =
            await res.json();

          setAvatarUrl(
            data?.avatar_url ||
              null
          );
        }
      } catch (err) {
        console.error(
          "[fetchUserProfile]: " +
            err.message
        );
      }
    };


  /*
  ==========================================================
  LOGOUT
  ==========================================================
  */

  const PostLogout =
    async () => {
      try {
        await AsyncStorage.removeItem(
          "user"
        );

        setUser(null);
        setAvatarUrl(null);

        Alert.alert(
          "Logged Out",
          "You have been logged out successfully."
        );

        navigation.reset({
          index: 0,
          routes: [
            {
              name: "Landing",
            },
          ],
        });
      } catch (err) {
        console.error(
          "[PostLogout] {ClearStorage}: " +
            err.message
        );
      }
    };


  /*
  ==========================================================
  LOADING
  ==========================================================
  */

  if (!fontsLoaded) {
    return (
      <View
        style={styles.loadingScreen}
      >
        <View
          style={[
            styles.loadingLogo,
            {
              width: scale(
                56,
                62,
                66,
                72
              ),
              height: scale(
                56,
                62,
                66,
                72
              ),
              borderRadius: scale(
                15,
                17,
                18,
                20
              ),
            },
          ]}
        >
          <Image
            source={pmgLogo}
            style={styles.loadingLogoImage}
            resizeMode="contain"
          />
        </View>

        <Text
          style={styles.loadingText}
        >
          Loading profile...
        </Text>
      </View>
    );
  }


  /*
  ==========================================================
  GUEST PROFILE
  ==========================================================
  */

  if (!user) {
    return (
      <View
        style={styles.guestContainer}
      >
        <View
          style={[
            styles.guestLogoCircle,
            {
              width: scale(
                90,
                100,
                110,
                120
              ),
              height: scale(
                90,
                100,
                110,
                120
              ),
              borderRadius: scale(
                45,
                50,
                55,
                60
              ),
            },
          ]}
        >
          <Image
            source={pmgLogo}
            style={styles.guestLogo}
            resizeMode="contain"
          />
        </View>

        <Text
          style={[
            styles.guestTitle,
            {
              fontSize: scale(
                20,
                22,
                24,
                28
              ),
            },
          ]}
        >
          Welcome to PrintHub
        </Text>

        <Text
          style={[
            styles.guestSub,
            {
              fontSize: scale(
                11,
                12,
                13,
                14
              ),
            },
          ]}
        >
          Sign in to access your
          orders, inquiries, and
          personalized profile.
        </Text>

        <TouchableOpacity
          style={[
            styles.loginBtn,
            {
              minHeight: scale(
                50,
                54,
                58,
                62
              ),
              borderRadius: scale(
                25,
                27,
                29,
                31
              ),
            },
          ]}
          onPress={() =>
            navigation.navigate(
              "Login"
            )
          }
          activeOpacity={0.8}
        >
          <Ionicons
            name="log-in-outline"
            size={scale(
              18,
              19,
              20,
              22
            )}
            color={
              COLORS.textDark
            }
          />

          <Text
            style={[
              styles.loginText,
              {
                fontSize: scale(
                  12,
                  13,
                  14,
                  15
                ),
              },
            ]}
          >
            Log In to Account
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.landingBtn,
            {
              minHeight: scale(
                48,
                52,
                56,
                60
              ),
              borderRadius: scale(
                24,
                26,
                28,
                30
              ),
            },
          ]}
          onPress={() =>
            navigation.navigate(
              "Landing"
            )
          }
          activeOpacity={0.8}
        >
          <Text
            style={[
              styles.landingBtnText,
              {
                fontSize: scale(
                  11,
                  12,
                  13,
                  14
                ),
              },
            ]}
          >
            View Feature Highlights
          </Text>

          <Ionicons
            name="arrow-forward"
            size={scale(
              16,
              17,
              18,
              20
            )}
            color={
              COLORS.primary
            }
          />
        </TouchableOpacity>
      </View>
    );
  }


  /*
  ==========================================================
  USER INFORMATION
  ==========================================================
  */

  const firstName =
    user?.firstName ||
    user?.first_name ||
    "User";

  const email =
    user?.email ||
    "No email available";

  const role =
    user?.role ||
    "Customer";


  /*
  ==========================================================
  MAIN PROFILE
  ==========================================================
  */

  return (
    <View style={styles.container}>
  
      {/* ==================================================
          HEADER
      ================================================== */}
  
  <SafeAreaView
  style={styles.safeArea}
  edges={["top"]}
>
  <View
    style={[
      styles.header,
      {
        height: scale(64, 68, 72, 78),
        paddingHorizontal: scale(
          14,
          18,
          22,
          30
        ),
      },
    ]}
  >

    {/* BACK BUTTON */}

    <TouchableOpacity
      style={[
        styles.backButton,
        {
          width: scale(
            40,
            44,
            48,
            52
          ),
          height: scale(
            40,
            44,
            48,
            52
          ),
        },
      ]}
      onPress={() =>
        navigation.goBack()
      }
      activeOpacity={0.75}
      accessibilityRole="button"
      accessibilityLabel="Go back"
    >
      <Ionicons
        name="arrow-back"
        size={scale(
          24,
          26,
          28,
          30
        )}
        color="#FFFFFF"
      />
    </TouchableOpacity>


    {/* CENTERED TITLE */}

    <View
      style={styles.headerTitleContainer}
      pointerEvents="none"
    >
      <Text
        style={[
          styles.headerTitle,
          {
            fontSize: scale(
              20,
              22,
              24,
              28
            ),
            lineHeight: scale(
              25,
              28,
              30,
              35
            ),
          },
        ]}
        numberOfLines={1}
      >
        My Profile
      </Text>
    </View>


    {/* RIGHT SPACER */}

    <View
      style={[
        styles.headerRightSpacer,
        {
          width: scale(
            40,
            44,
            48,
            52
          ),
          height: scale(
            40,
            44,
            48,
            52
          ),
        },
      ]}
    />

  </View>
</SafeAreaView>
  
  
      {/* ==================================================
          SCROLLABLE CONTENT
      ================================================== */}
  
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingHorizontal: scale(
              12,
              16,
              24,
              32
            ),
          },
        ]}
      >
  
        {/* ==================================================
            PROFILE CARD
        ================================================== */}
  
        <View
          style={[
            styles.profileCard,
            {
              borderRadius: scale(
                15,
                17,
                19,
                21
              ),
              padding: scale(
                14,
                16,
                18,
                22
              ),
            },
          ]}
        >
  
          {/* Green glow/decorative area */}
  
          <View
            style={[
              styles.profileGlow,
              {
                width: scale(
                  150,
                  175,
                  200,
                  230
                ),
                height: scale(
                  150,
                  175,
                  200,
                  230
                ),
                borderRadius: scale(
                  75,
                  88,
                  100,
                  115
                ),
              },
            ]}
          />
  
          <View
            style={[
              styles.profileGlowSmall,
              {
                width: scale(
                  70,
                  80,
                  90,
                  100
                ),
                height: scale(
                  70,
                  80,
                  90,
                  100
                ),
                borderRadius: scale(
                  35,
                  40,
                  45,
                  50
                ),
              },
            ]}
          />
  
          {/* Top branding strip */}
  
          <View
            style={styles.profileTopStrip}
          >
            <View
              style={[
                styles.stripBlock,
                {
                  backgroundColor:
                    COLORS.primary,
                },
              ]}
            />
  
            <View
              style={[
                styles.stripBlock,
                {
                  backgroundColor:
                    COLORS.white,
                },
              ]}
            />
  
            <View
              style={[
                styles.stripBlock,
                {
                  backgroundColor:
                    COLORS.primary,
                },
              ]}
            />
          </View>
  
          {/* Profile content */}
  
          <View
            style={[
              styles.profileContent,
              {
                minHeight: scale(
                  135,
                  150,
                  165,
                  180
                ),
              },
            ]}
          >
  
            {/* Avatar */}
  
            <View
              style={[
                styles.avatarWrapper,
                {
                  width: scale(
                    76,
                    86,
                    96,
                    108
                  ),
                  height: scale(
                    76,
                    86,
                    96,
                    108
                  ),
                },
              ]}
            >
              {avatarUrl ? (
                <Image
                  source={{
                    uri: avatarUrl,
                  }}
                  style={[
                    styles.avatarImage,
                    {
                      borderRadius: scale(
                        38,
                        43,
                        48,
                        54
                      ),
                    },
                  ]}
                />
              ) : (
                <View
                  style={[
                    styles.avatarCircle,
                    {
                      borderRadius: scale(
                        38,
                        43,
                        48,
                        54
                      ),
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.avatarInitial,
                      {
                        fontSize: scale(
                          27,
                          31,
                          35,
                          40
                        ),
                      },
                    ]}
                  >
                    {firstName
                      ? firstName[0].toUpperCase()
                      : "U"}
                  </Text>
                </View>
              )}
  
              <TouchableOpacity
                style={[
                  styles.avatarEdit,
                  {
                    width: scale(
                      25,
                      28,
                      30,
                      34
                    ),
                    height: scale(
                      25,
                      28,
                      30,
                      34
                    ),
                    borderRadius: scale(
                      13,
                      14,
                      15,
                      17
                    ),
                  },
                ]}
                onPress={() =>
                  navigation.navigate(
                    "EditProfile"
                  )
                }
                activeOpacity={0.8}
              >
                <Ionicons
                  name="pencil"
                  size={scale(
                    12,
                    13,
                    14,
                    16
                  )}
                  color={
                    COLORS.textDark
                  }
                />
              </TouchableOpacity>
            </View>
  
            {/* User info */}
  
            <View
              style={styles.profileInfo}
            >
              <Text
                style={[
                  styles.userName,
                  {
                    fontSize: scale(
                      19,
                      21,
                      23,
                      26
                    ),
                  },
                ]}
                numberOfLines={1}
              >
                {firstName}
              </Text>
  
              <Text
                style={[
                  styles.userEmail,
                  {
                    fontSize: scale(
                      9.5,
                      10.5,
                      11.5,
                      13
                    ),
                  },
                ]}
                numberOfLines={1}
              >
                {email}
              </Text>
  
              <View
                style={styles.roleTag}
              >
                <Ionicons
                  name="person-outline"
                  size={12}
                  color={
                    COLORS.textDark
                  }
                />
  
                <Text
                  style={styles.roleText}
                >
                  {role}
                </Text>
              </View>
            </View>
  
            {/* Edit arrow */}
  
            <TouchableOpacity
              style={[
                styles.profileArrow,
                {
                  width: scale(
                    34,
                    38,
                    42,
                    46
                  ),
                  height: scale(
                    34,
                    38,
                    42,
                    46
                  ),
                  borderRadius: scale(
                    17,
                    19,
                    21,
                    23
                  ),
                },
              ]}
              onPress={() =>
                navigation.navigate(
                  "EditProfile"
                )
              }
              activeOpacity={0.8}
            >
              <Ionicons
                name="chevron-forward"
                size={scale(
                  18,
                  20,
                  22,
                  24
                )}
                color={
                  COLORS.textDark
                }
              />
            </TouchableOpacity>
  
          </View>
  
        </View>
  



        {/* ==================================================
            ACCOUNT SECTION
        ================================================== */}

        <View
          style={[
            styles.sectionHeader,
            {
              marginTop: scale(
                2,
                4,
                6,
                8
              ),
            },
          ]}
        >
          <View>
            <Text
              style={[
                styles.sectionTitle,
                {
                  fontSize:
                    scale(
                      17,
                      19,
                      21,
                      24
                    ),
                },
              ]}
            >
              Account
            </Text>

            <Text
              style={[
                styles.sectionSubtitle,
                {
                  fontSize:
                    scale(
                      9,
                      10,
                      11,
                      12
                    ),
                },
              ]}
            >
              Manage your profile
              and account settings
            </Text>
          </View>

          <View
            style={styles.sectionDots}
          >
            <View
              style={[
                styles.sectionDot,
                {
                  backgroundColor:
                    COLORS.primary,
                },
              ]}
            />

            <View
              style={[
                styles.sectionDot,
                {
                  backgroundColor:
                    COLORS.primary,
                  opacity: 0.45,
                },
              ]}
            />
          </View>
        </View>


        {/* ==================================================
            MENU
        ================================================== */}

        <View
          style={[
            styles.menuSection,
            {
              borderRadius:
                scale(
                  13,
                  15,
                  17,
                  19
                ),
            },
          ]}
        >

          {/* EDIT PROFILE */}

          <TouchableOpacity
            style={[
              styles.menuItem,
              {
                minHeight:
                  scale(
                    70,
                    76,
                    82,
                    90
                  ),
                paddingHorizontal:
                  scale(
                    11,
                    13,
                    15,
                    18
                  ),
              },
            ]}
            onPress={() =>
              navigation.navigate(
                "EditProfile"
              )
            }
            activeOpacity={0.75}
          >
            <View
              style={[
                styles.menuIconCircle,
                {
                  width: scale(
                    43,
                    47,
                    51,
                    56
                  ),
                  height: scale(
                    43,
                    47,
                    51,
                    56
                  ),
                  borderRadius:
                    scale(
                      22,
                      24,
                      26,
                      28
                    ),
                },
              ]}
            >
              <Ionicons
                name="person-outline"
                size={scale(
                  20,
                  21,
                  22,
                  24
                )}
                color={
                  COLORS.primary
                }
              />
            </View>

            <View
              style={styles.menuContent}
            >
              <Text
                style={[
                  styles.menuTitle,
                  {
                    fontSize:
                      scale(
                        11.5,
                        12.5,
                        13.5,
                        15
                      ),
                  },
                ]}
              >
                Personal Information
              </Text>

              <Text
                style={[
                  styles.menuSubtitle,
                  {
                    fontSize:
                      scale(
                        8.5,
                        9.5,
                        10.5,
                        11.5
                      ),
                  },
                ]}
              >
                View and update your
                personal details
              </Text>
            </View>

            <View
              style={styles.menuArrowCircle}
            >
              <Ionicons
                name="chevron-forward"
                size={16}
                color={
                  COLORS.primary
                }
              />
            </View>
          </TouchableOpacity>


          <View
            style={styles.menuDivider}
          />


          {/* PASSWORD */}

          <TouchableOpacity
            style={[
              styles.menuItem,
              {
                minHeight:
                  scale(
                    70,
                    76,
                    82,
                    90
                  ),
                paddingHorizontal:
                  scale(
                    11,
                    13,
                    15,
                    18
                  ),
              },
            ]}
            onPress={() =>
              navigation.navigate(
                "PasswordSecurity"
              )
            }
            activeOpacity={0.75}
          >
            <View
              style={[
                styles.menuIconCircle,
                {
                  width: scale(
                    43,
                    47,
                    51,
                    56
                  ),
                  height: scale(
                    43,
                    47,
                    51,
                    56
                  ),
                  borderRadius:
                    scale(
                      22,
                      24,
                      26,
                      28
                    ),
                },
              ]}
            >
              <Ionicons
                name="lock-closed-outline"
                size={scale(
                  20,
                  21,
                  22,
                  24
                )}
                color={
                  COLORS.primary
                }
              />
            </View>

            <View
              style={styles.menuContent}
            >
              <Text
                style={[
                  styles.menuTitle,
                  {
                    fontSize:
                      scale(
                        11.5,
                        12.5,
                        13.5,
                        15
                      ),
                  },
                ]}
              >
                Passwords & Security
              </Text>

              <Text
                style={[
                  styles.menuSubtitle,
                  {
                    fontSize:
                      scale(
                        8.5,
                        9.5,
                        10.5,
                        11.5
                      ),
                  },
                ]}
              >
                Protect your PrintHub
                account
              </Text>
            </View>

            <View
              style={styles.menuArrowCircle}
            >
              <Ionicons
                name="chevron-forward"
                size={16}
                color={
                  COLORS.primary
                }
              />
            </View>
          </TouchableOpacity>


          <View
            style={styles.menuDivider}
          />


          {/* ORDER HISTORY */}

          <TouchableOpacity
            style={[
              styles.menuItem,
              {
                minHeight:
                  scale(
                    70,
                    76,
                    82,
                    90
                  ),
                paddingHorizontal:
                  scale(
                    11,
                    13,
                    15,
                    18
                  ),
              },
            ]}
            onPress={() =>
              navigation.navigate(
                "Main",
                {
                  screen:
                    "OrdersTab",
                }
              )
            }
            activeOpacity={0.75}
          >
            <View
              style={[
                styles.menuIconCircle,
                {
                  width: scale(
                    43,
                    47,
                    51,
                    56
                  ),
                  height: scale(
                    43,
                    47,
                    51,
                    56
                  ),
                  borderRadius:
                    scale(
                      22,
                      24,
                      26,
                      28
                    ),
                },
              ]}
            >
              <Ionicons
                name="receipt-outline"
                size={scale(
                  20,
                  21,
                  22,
                  24
                )}
                color={
                  COLORS.primary
                }
              />
            </View>

            <View
              style={styles.menuContent}
            >
              <Text
                style={[
                  styles.menuTitle,
                  {
                    fontSize:
                      scale(
                        11.5,
                        12.5,
                        13.5,
                        15
                      ),
                  },
                ]}
              >
                Order History & Status
              </Text>

              <Text
                style={[
                  styles.menuSubtitle,
                  {
                    fontSize:
                      scale(
                        8.5,
                        9.5,
                        10.5,
                        11.5
                      ),
                  },
                ]}
              >
                Track your printing
                orders
              </Text>
            </View>

            <View
              style={styles.menuArrowCircle}
            >
              <Ionicons
                name="chevron-forward"
                size={16}
                color={
                  COLORS.primary
                }
              />
            </View>
          </TouchableOpacity>


          <View
            style={styles.menuDivider}
          />


          {/* INQUIRIES */}

          <TouchableOpacity
            style={[
              styles.menuItem,
              {
                minHeight:
                  scale(
                    70,
                    76,
                    82,
                    90
                  ),
                paddingHorizontal:
                  scale(
                    11,
                    13,
                    15,
                    18
                  ),
              },
            ]}
            onPress={() =>
              navigation.navigate(
                "Main",
                {
                  screen:
                    "InquiriesTab",
                }
              )
            }
            activeOpacity={0.75}
          >
            <View
              style={[
                styles.menuIconCircle,
                {
                  width: scale(
                    43,
                    47,
                    51,
                    56
                  ),
                  height: scale(
                    43,
                    47,
                    51,
                    56
                  ),
                  borderRadius:
                    scale(
                      22,
                      24,
                      26,
                      28
                    ),
                },
              ]}
            >
              <Ionicons
                name="chatbubbles-outline"
                size={scale(
                  20,
                  21,
                  22,
                  24
                )}
                color={
                  COLORS.primary
                }
              />
            </View>

            <View
              style={styles.menuContent}
            >
              <Text
                style={[
                  styles.menuTitle,
                  {
                    fontSize:
                      scale(
                        11.5,
                        12.5,
                        13.5,
                        15
                      ),
                  },
                ]}
              >
                Custom Quotes & Inquiries
              </Text>

              <Text
                style={[
                  styles.menuSubtitle,
                  {
                    fontSize:
                      scale(
                        8.5,
                        9.5,
                        10.5,
                        11.5
                      ),
                  },
                ]}
              >
                Ask questions or request
                a custom quote
              </Text>
            </View>

            <View
              style={styles.menuArrowCircle}
            >
              <Ionicons
                name="chevron-forward"
                size={16}
                color={
                  COLORS.primary
                }
              />
            </View>
          </TouchableOpacity>

        </View>


        {/* ==================================================
            ACCOUNT STATUS
        ================================================== */}

        <View
          style={[
            styles.statusCard,
            {
              borderRadius:
                scale(
                  12,
                  14,
                  16,
                  18
                ),
            },
          ]}
        >
          <View
            style={styles.statusIcon}
          >
            <Ionicons
              name="shield-checkmark-outline"
              size={21}
              color={
                COLORS.primary
              }
            />
          </View>

          <View
            style={styles.statusContent}
          >
            <Text
              style={[
                styles.statusTitle,
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
              Account Active
            </Text>

            <Text
              style={[
                styles.statusText,
                {
                  fontSize:
                    scale(
                      8.5,
                      9.5,
                      10.5,
                      11.5
                    ),
                },
              ]}
            >
              Your PrintHub account
              is ready for printing.
            </Text>
          </View>

          <View
            style={styles.activeDot}
          />
        </View>


        {/* ==================================================
            LOGOUT
        ================================================== */}

        <TouchableOpacity
          style={[
            styles.logoutBtn,
            {
              minHeight:
                scale(
                  52,
                  57,
                  62,
                  68
                ),
              borderRadius:
                scale(
                  26,
                  29,
                  31,
                  34
                ),
            },
          ]}
          onPress={PostLogout}
          activeOpacity={0.8}
        >
          <View
            style={styles.logoutIconCircle}
          >
            <Ionicons
              name="log-out-outline"
              size={scale(
                19,
                20,
                21,
                23
              )}
              color={
                COLORS.danger
              }
            />
          </View>

          <Text
            style={[
              styles.logoutText,
              {
                fontSize:
                  scale(
                    12,
                    13,
                    14,
                    15
                  ),
              },
            ]}
          >
            Log Out Account
          </Text>
        </TouchableOpacity>


        {/* ==================================================
            BRAND FOOTER
        ================================================== */}

        <View
          style={styles.brandFooter}
        >
          <Image
            source={pmgLogo}
            style={[
              styles.brandFooterLogo,
              {
                width: scale(
                  62,
                  72,
                  82,
                  95
                ),
                height: scale(
                  30,
                  34,
                  38,
                  44
                ),
              },
            ]}
            resizeMode="contain"
          />

          <View
            style={styles.brandFooterLine}
          />

          <Text
            style={[
              styles.brandFooterText,
              {
                fontSize:
                  scale(
                    8,
                    9,
                    10,
                    11
                  ),
              },
            ]}
          >
            PRINT • CREATE • DELIVER
          </Text>
        </View>


        <View
          style={{
            height: scale(
              25,
              30,
              35,
              40
            ),
          }}
        />

      </ScrollView>
    </View>
  );
}


/*
============================================================
STYLES
============================================================
*/

const styles =
  StyleSheet.create({

    /*
    ========================================================
    SCREEN
    ========================================================
    */

    container: {
      flex: 1,

      backgroundColor:
        COLORS.background,
    },

    scrollContent: {
      paddingTop: 4,

      paddingBottom: 30,
    },

    /*
========================================================
HEADER
========================================================
*/

safeArea: {
  backgroundColor: COLORS.background,
},

header: {
  width: "100%",

  flexDirection: "row",

  alignItems: "center",

  justifyContent: "space-between",

  backgroundColor: COLORS.background,

  borderBottomWidth: 1,

  borderBottomColor: COLORS.border,
},

backButton: {
  alignItems: "center",

  justifyContent: "center",

  borderRadius: 999,
},

headerTitleContainer: {
  position: "absolute",

  left: 0,

  right: 0,

  top: 0,

  bottom: 0,

  alignItems: "center",

  justifyContent: "center",

  paddingHorizontal: 60,

  zIndex: 10,
},

headerTitle: {
  fontFamily:
    "Poppins_700Bold",

  color: "#FFFFFF",

  letterSpacing: -0.5,

  textAlign: "center",

  includeFontPadding: false,
},

headerRightSpacer: {
  opacity: 0,
},


    /*
    ========================================================
    PROFILE CARD
    ========================================================
    */

    profileCard: {
      backgroundColor:
        COLORS.surfaceDark,

      borderWidth: 1,

      borderColor:
        COLORS.border,

      marginBottom: 20,

      overflow: "hidden",

      position: "relative",

      shadowColor:
        "#000000",

      shadowOffset: {
        width: 0,
        height: 8,
      },

      shadowOpacity: 0.25,

      shadowRadius: 18,

      elevation: 5,
    },

    profileGlow: {
      position: "absolute",

      right: -75,
      top: -80,

      backgroundColor:
        COLORS.primary,

      opacity: 0.10,
    },

    profileGlowSmall: {
      position: "absolute",

      left: -30,
      bottom: -35,

      backgroundColor:
        COLORS.primary,

      opacity: 0.07,
    },

    profileTopStrip: {
      position: "absolute",

      top: 0,
      left: 0,
      right: 0,

      height: 4,

      flexDirection: "row",
    },

    stripBlock: {
      flex: 1,
    },

    profileContent: {
      flexDirection: "row",

      alignItems: "center",

      position: "relative",

      zIndex: 2,

      paddingTop: 8,
    },


    /*
    ========================================================
    AVATAR
    ========================================================
    */

    avatarWrapper: {
      position: "relative",

      marginRight: 13,
    },

    avatarImage: {
      width: "100%",
      height: "100%",

      borderWidth: 3,

      borderColor:
        COLORS.primary,

      backgroundColor:
        COLORS.surfaceDarkAlt,
    },

    avatarCircle: {
      width: "100%",
      height: "100%",

      backgroundColor:
        COLORS.primary,

      borderWidth: 3,

      borderColor:
        COLORS.primary,

      alignItems: "center",

      justifyContent: "center",
    },

    avatarInitial: {
      fontFamily:
        "Poppins_700Bold",

      color:
        COLORS.textDark,
    },

    avatarEdit: {
      position: "absolute",

      right: -3,
      bottom: -2,

      backgroundColor:
        COLORS.primary,

      borderWidth: 2,

      borderColor:
        COLORS.surfaceDark,

      alignItems: "center",

      justifyContent: "center",
    },


    /*
    ========================================================
    PROFILE INFORMATION
    ========================================================
    */

    profileInfo: {
      flex: 1,

      minWidth: 0,
    },

    userName: {
      fontFamily:
        "Poppins_700Bold",

      color:
        COLORS.textPrimary,

      letterSpacing: -0.3,
    },

    userEmail: {
      fontFamily:
        "Poppins_400Regular",

      color:
        COLORS.textSecondary,

      marginTop: 2,
    },

    roleTag: {
      flexDirection: "row",

      alignItems: "center",

      alignSelf:
        "flex-start",

      backgroundColor:
        COLORS.primary,

      paddingHorizontal: 9,

      paddingVertical: 5,

      borderRadius: 999,

      marginTop: 8,
    },

    roleText: {
      fontFamily:
        "Poppins_700Bold",

      color:
        COLORS.textDark,

      fontSize: 9,

      marginLeft: 4,

      textTransform:
        "capitalize",
    },

    profileArrow: {
      backgroundColor:
        COLORS.primary,

      alignItems: "center",

      justifyContent: "center",

      marginLeft: 6,
    },


    /*
    ========================================================
    PROFILE FOOTER
    ========================================================
    */

    profileFooter: {
      flexDirection: "row",

      alignItems: "center",

      marginTop: 14,

      paddingTop: 12,

      borderTopWidth: 1,

      borderTopColor:
        COLORS.border,

      position: "relative",

      zIndex: 2,
    },

    profileFooterIcon: {
      width: 28,
      height: 28,

      borderRadius: 14,

      backgroundColor:
        COLORS.surfaceDarkAlt,

      borderWidth: 1,

      borderColor:
        COLORS.border,

      alignItems: "center",

      justifyContent: "center",

      marginRight: 8,
    },

    profileFooterText: {
      fontFamily:
        "Poppins_500Medium",

      color:
        COLORS.textMuted,

      flex: 1,
    },

    profileFooterLogo: {
      opacity: 0.9,
    },


    /*
    ========================================================
    SECTION HEADER
    ========================================================
    */

    sectionHeader: {
      flexDirection: "row",

      alignItems: "center",

      justifyContent:
        "space-between",

      marginBottom: 9,

      paddingHorizontal: 2,
    },

    sectionTitle: {
      fontFamily:
        "Poppins_700Bold",

      color:
        COLORS.textPrimary,
    },

    sectionSubtitle: {
      fontFamily:
        "Poppins_400Regular",

      color:
        COLORS.textMuted,

      marginTop: 2,
    },

    sectionDots: {
      flexDirection: "row",

      alignItems: "center",

      gap: 4,
    },

    sectionDot: {
      width: 7,
      height: 7,

      borderRadius: 4,
    },


    /*
    ========================================================
    MENU
    ========================================================
    */

    menuSection: {
      backgroundColor:
        COLORS.surfaceDark,

      borderWidth: 1,

      borderColor:
        COLORS.border,

      overflow: "hidden",

      marginBottom: 17,

      shadowColor:
        "#000000",

      shadowOffset: {
        width: 0,
        height: 5,
      },

      shadowOpacity: 0.18,

      shadowRadius: 12,

      elevation: 3,
    },

    menuItem: {
      flexDirection: "row",

      alignItems: "center",
    },

    menuIconCircle: {
      backgroundColor:
        COLORS.surfaceDarkAlt,

      borderWidth: 1,

      borderColor:
        COLORS.border,

      alignItems: "center",

      justifyContent: "center",

      marginRight: 11,
    },

    menuContent: {
      flex: 1,

      minWidth: 0,
    },

    menuTitle: {
      fontFamily:
        "Poppins_600SemiBold",

      color:
        COLORS.textPrimary,
    },

    menuSubtitle: {
      fontFamily:
        "Poppins_400Regular",

      color:
        COLORS.textMuted,

      marginTop: 3,
    },

    menuArrowCircle: {
      width: 30,
      height: 30,

      borderRadius: 15,

      backgroundColor:
        COLORS.surfaceDarkAlt,

      borderWidth: 1,

      borderColor:
        COLORS.border,

      alignItems: "center",

      justifyContent: "center",

      marginLeft: 6,
    },

    menuDivider: {
      height: 1,

      backgroundColor:
        COLORS.border,

      marginLeft: 69,
    },


    /*
    ========================================================
    ACCOUNT STATUS
    ========================================================
    */

    statusCard: {
      backgroundColor:
        COLORS.cardDark,

      borderWidth: 1,

      borderColor:
        COLORS.border,

      minHeight: 65,

      flexDirection: "row",

      alignItems: "center",

      paddingHorizontal: 12,

      marginBottom: 15,
    },

    statusIcon: {
      width: 40,
      height: 40,

      borderRadius: 20,

      backgroundColor:
        COLORS.surfaceDarkAlt,

      borderWidth: 1,

      borderColor:
        COLORS.border,

      alignItems: "center",

      justifyContent: "center",

      marginRight: 10,
    },

    statusContent: {
      flex: 1,
    },

    statusTitle: {
      fontFamily:
        "Poppins_600SemiBold",

      color:
        COLORS.textPrimary,
    },

    statusText: {
      fontFamily:
        "Poppins_400Regular",

      color:
        COLORS.textMuted,

      marginTop: 2,
    },

    activeDot: {
      width: 9,
      height: 9,

      borderRadius: 5,

      backgroundColor:
        COLORS.primary,

      shadowColor:
        COLORS.primary,

      shadowOffset: {
        width: 0,
        height: 0,
      },

      shadowOpacity: 0.7,

      shadowRadius: 5,

      elevation: 4,
    },


    /*
    ========================================================
    LOGOUT
    ========================================================
    */

    logoutBtn: {
      backgroundColor:
        "rgba(239,68,68,0.08)",

      borderWidth: 1,

      borderColor:
        COLORS.danger,

      flexDirection: "row",

      alignItems: "center",

      justifyContent: "center",

      marginBottom: 18,
    },

    logoutIconCircle: {
      width: 31,
      height: 31,

      borderRadius: 16,

      alignItems: "center",

      justifyContent: "center",

      marginRight: 5,
    },

    logoutText: {
      fontFamily:
        "Poppins_700Bold",

      color:
        COLORS.danger,
    },


    /*
    ========================================================
    BRAND FOOTER
    ========================================================
    */

    brandFooter: {
      alignItems: "center",

      justifyContent: "center",

      paddingTop: 5,
    },

    brandFooterLogo: {
      opacity: 0.9,

      marginBottom: 5,
    },

    brandFooterLine: {
      width: 45,
      height: 2,

      borderRadius: 2,

      backgroundColor:
        COLORS.primary,

      marginBottom: 5,
    },

    brandFooterText: {
      fontFamily:
        "Poppins_500Medium",

      color:
        COLORS.textMuted,

      letterSpacing: 1,
    },


    /*
    ========================================================
    GUEST
    ========================================================
    */

    guestContainer: {
      flex: 1,

      justifyContent:
        "center",

      alignItems:
        "center",

      paddingHorizontal: 25,

      backgroundColor:
        COLORS.background,
    },

    guestLogoCircle: {
      backgroundColor:
        COLORS.surfaceDark,

      borderWidth: 1,

      borderColor:
        COLORS.borderStrong,

      alignItems: "center",

      justifyContent: "center",

      marginBottom: 17,
    },

    guestLogo: {
      width: "72%",
      height: "72%",
    },

    guestTitle: {
      fontFamily:
        "Poppins_700Bold",

      color:
        COLORS.textPrimary,

      textAlign: "center",
    },

    guestSub: {
      fontFamily:
        "Poppins_400Regular",

      color:
        COLORS.textMuted,

      textAlign: "center",

      lineHeight: 19,

      marginTop: 7,

      marginBottom: 20,

      maxWidth: 320,
    },

    loginBtn: {
      width: "100%",

      backgroundColor:
        COLORS.primary,

      flexDirection: "row",

      alignItems: "center",

      justifyContent:
        "center",

      marginBottom: 10,
    },

    loginText: {
      fontFamily:
        "Poppins_700Bold",

      color:
        COLORS.textDark,

      marginLeft: 7,
    },

    landingBtn: {
      width: "100%",

      backgroundColor:
        COLORS.surfaceDark,

      borderWidth: 1,

      borderColor:
        COLORS.border,

      flexDirection: "row",

      alignItems: "center",

      justifyContent:
        "center",
    },

    landingBtnText: {
      fontFamily:
        "Poppins_600SemiBold",

      color:
        COLORS.textPrimary,

      marginRight: 6,
    },


    /*
    ========================================================
    LOADING
    ========================================================
    */

    loadingScreen: {
      flex: 1,

      alignItems: "center",

      justifyContent: "center",

      backgroundColor:
        COLORS.background,
    },

    loadingLogo: {
      backgroundColor:
        COLORS.primary,

      alignItems: "center",

      justifyContent: "center",

      marginBottom: 18,

      overflow: "hidden",
    },

    loadingLogoImage: {
      width: "80%",
      height: "80%",
    },

    loadingText: {
      fontFamily:
        "Poppins_500Medium",

      color:
        COLORS.textMuted,

      fontSize: 12,

      marginTop: 10,
    },
  });