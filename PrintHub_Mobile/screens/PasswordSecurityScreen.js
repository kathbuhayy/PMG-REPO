import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Modal,
  Image,
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

import { COLORS } from "../theme";
import { API_BASE_URL } from "../config";

import pmgLogo from "../assets/images/pmg-logo-nav.png";


/*
============================================================
RESPONSIVE SCALE
============================================================
*/

const getScale = (width) => {
  if (width <= 360) {
    return 0.88;
  }

  if (width <= 430) {
    return 0.95;
  }

  if (width <= 600) {
    return 1;
  }

  return 1.08;
};


/*
============================================================
PASSWORD SECURITY SCREEN
============================================================
*/

export default function PasswordSecurityScreen({
  navigation,
}) {
  const { width } =
    useWindowDimensions();

  const scale =
    getScale(width);


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
  USER
  ==========================================================
  */

  const [user, setUser] =
    useState(null);

  const [loading, setLoading] =
    useState(true);


  /*
  ==========================================================
  PASSWORD STATE
  ==========================================================
  */

  const [currentPassword, setCurrentPassword] =
    useState("");

  const [newPassword, setNewPassword] =
    useState("");

  const [confirmNewPassword, setConfirmNewPassword] =
    useState("");


  /*
  ==========================================================
  PASSWORD VISIBILITY
  ==========================================================
  */

  const [showCurrentPassword, setShowCurrentPassword] =
    useState(false);

  const [showNewPassword, setShowNewPassword] =
    useState(false);

  const [showConfirmNewPassword, setShowConfirmNewPassword] =
    useState(false);


  /*
  ==========================================================
  OTP
  ==========================================================
  */

  const [otpModalOpen, setOtpModalOpen] =
    useState(false);

  const [otp, setOtp] =
    useState("");

  const [otpVerified, setOtpVerified] =
    useState(false);

  const [otpLoading, setOtpLoading] =
    useState(false);

  const [saving, setSaving] =
    useState(false);


  /*
  ==========================================================
  LOAD USER
  ==========================================================
  */

  useEffect(() => {
    const loadUser =
      async () => {
        try {
          const stored =
            await AsyncStorage.getItem(
              "user"
            );

          if (!stored) {
            navigation.goBack();
            return;
          }

          setUser(
            JSON.parse(stored)
          );
        } catch (err) {
          console.error(
            "[PasswordSecurity] Load error:",
            err
          );

          Alert.alert(
            "Error",
            "Failed to load user session"
          );
        } finally {
          setLoading(false);
        }
      };

    loadUser();
  }, []);


  /*
  ==========================================================
  PASSWORD CRITERIA
  ==========================================================
  */

  const criteria = {
    uppercase:
      /[A-Z]/.test(
        newPassword
      ),

    number:
      /\d/.test(
        newPassword
      ),

    special:
      /[^A-Za-z0-9]/.test(
        newPassword
      ),

    length:
      newPassword.length >=
        8 &&
      newPassword.length <=
        12,
  };


  /*
  ==========================================================
  OPEN OTP MODAL / REQUEST OTP
  ==========================================================
  */

  const openOtpModal =
    async () => {
      if (!user?.email) {
        return;
      }

      setOtpLoading(true);
      setOtpModalOpen(true);
      setOtp("");

      try {
        const res =
          await fetch(
            `${API_BASE_URL}/api/password/request-otp`,
            {
              method: "POST",

              headers: {
                "Content-Type":
                  "application/json",
              },

              body: JSON.stringify({
                email:
                  user.email,
              }),
            }
          );

        const data =
          await res.json();

        if (!res.ok) {
          Alert.alert(
            "Error",
            data.message ||
              "Failed to send OTP"
          );

          setOtpModalOpen(
            false
          );

          return;
        }

        Alert.alert(
          "Success",
          "OTP sent. Please check your email."
        );
      } catch (err) {
        Alert.alert(
          "Error",
          "Network error while requesting OTP"
        );

        setOtpModalOpen(
          false
        );
      } finally {
        setOtpLoading(false);
      }
    };


  /*
  ==========================================================
  VERIFY OTP
  ==========================================================
  */

  const verifyOtp =
    async () => {
      if (
        !otp ||
        otp.length !== 6
      ) {
        Alert.alert(
          "Error",
          "Please enter the 6-digit OTP"
        );

        return;
      }

      setOtpLoading(true);

      try {
        const res =
          await fetch(
            `${API_BASE_URL}/api/password/verify-otp`,
            {
              method: "POST",

              headers: {
                "Content-Type":
                  "application/json",
              },

              body: JSON.stringify({
                email:
                  user.email,

                otp,
              }),
            }
          );

        const data =
          await res.json();

        if (!res.ok) {
          Alert.alert(
            "Error",
            data.message ||
              "OTP verification failed"
          );

          return;
        }

        setOtpVerified(
          true
        );

        setOtpModalOpen(
          false
        );

        setOtp("");

        Alert.alert(
          "Success",
          "OTP verified. You can now change your password."
        );
      } catch (err) {
        Alert.alert(
          "Error",
          "Network error"
        );
      } finally {
        setOtpLoading(false);
      }
    };


  /*
  ==========================================================
  CHANGE PASSWORD
  ==========================================================
  */

  const handleChangePassword =
    async () => {
      if (!otpVerified) {
        Alert.alert(
          "Error",
          "Please verify OTP first."
        );

        return;
      }

      if (
        !currentPassword ||
        !newPassword ||
        !confirmNewPassword
      ) {
        Alert.alert(
          "Error",
          "Please complete all fields."
        );

        return;
      }

      if (
        newPassword !==
        confirmNewPassword
      ) {
        Alert.alert(
          "Error",
          "New password and confirm password do not match."
        );

        return;
      }

      const passOk =
        criteria.uppercase &&
        criteria.number &&
        criteria.special &&
        criteria.length;

      if (!passOk) {
        Alert.alert(
          "Error",
          "Password must meet the requirements."
        );

        return;
      }

      setSaving(true);

      try {
        const res =
          await fetch(
            `${API_BASE_URL}/api/profile/${user.id}/password`,
            {
              method: "PUT",

              headers: {
                "Content-Type":
                  "application/json",
              },

              body: JSON.stringify({
                currentPassword,
                newPassword,
              }),
            }
          );

        const data =
          await res.json();

        if (!res.ok) {
          Alert.alert(
            "Error",
            data.message ||
              "Failed to change password"
          );

          return;
        }

        Alert.alert(
          "Success",
          "Password changed successfully!",
          [
            {
              text: "OK",

              onPress: () =>
                navigation.goBack(),
            },
          ]
        );
      } catch (err) {
        Alert.alert(
          "Error",
          "Network error"
        );
      } finally {
        setSaving(false);
      }
    };


  /*
  ==========================================================
  LOADING
  ==========================================================
  */

  if (
    loading ||
    !user ||
    !fontsLoaded
  ) {
    return (
      <View
        style={
          styles.loadingContainer
        }
      >
        <Image
          source={pmgLogo}
          style={
            styles.loadingLogo
          }
          resizeMode="contain"
        />

        <ActivityIndicator
          size="small"
          color={
            COLORS.primary
          }
          style={{
            marginTop: 15,
          }}
        />

        <Text
          style={
            styles.loadingText
          }
        >
          Loading security...
        </Text>
      </View>
    );
  }


  /*
  ==========================================================
  MAIN UI
  ==========================================================
  */

  return (
    <View
      style={
        styles.container
      }
    >

      {/* ==================================================
          HEADER
      ================================================== */}

      <View
        style={[
          styles.header,
          {
            paddingHorizontal:
              14 * scale,
          },
        ]}
      >

        <TouchableOpacity
          style={
            styles.backButton
          }
          onPress={() =>
            navigation.goBack()
          }
          activeOpacity={0.7}
        >
          <Ionicons
            name="arrow-back"
            size={28 * scale}
            color={
              COLORS.textPrimary
            }
          />
        </TouchableOpacity>


        <View
          style={
            styles.headerCenter
          }
        >
          <Text
            style={[
              styles.headerTitle,
              {
                fontSize:
                  21 * scale,
              },
            ]}
          >
            Passwords & Security
          </Text>

          <Text
            style={[
              styles.headerSubtitle,
              {
                fontSize:
                  8 * scale,
              },
            ]}
          >
            ACCOUNT SECURITY
          </Text>
        </View>


        <View
          style={
            styles.headerLogoBox
          }
        >
          <Image
            source={pmgLogo}
            style={
              styles.headerLogo
            }
            resizeMode="contain"
          />
        </View>

      </View>


      {/* ==================================================
          CONTENT
      ================================================== */}

      <ScrollView
        style={
          styles.scrollView
        }
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingHorizontal:
              14 * scale,

            paddingBottom:
              45 * scale,
          },
        ]}
        showsVerticalScrollIndicator={
          false
        }
        keyboardShouldPersistTaps="handled"
      >

        {/* =================================================
            SECURITY INTRO
        ================================================= */}

        <View
          style={[
            styles.securityBanner,
            {
              borderRadius:
                16 * scale,
            },
          ]}
        >

          <View
            style={
              styles.bannerIcon
            }
          >
            <Ionicons
              name="shield-checkmark-outline"
              size={24 * scale}
              color={
                COLORS.primary
              }
            />
          </View>

          <View
            style={
              styles.bannerTextContainer
            }
          >
            <Text
              style={[
                styles.bannerEyebrow,
                {
                  fontSize:
                    8 * scale,
                },
              ]}
            >
              ACCOUNT PROTECTION
            </Text>

            <Text
              style={[
                styles.bannerTitle,
                {
                  fontSize:
                    14 * scale,
                },
              ]}
            >
              Keep your account secure
            </Text>

            <Text
              style={[
                styles.bannerText,
                {
                  fontSize:
                    9.5 * scale,
                },
              ]}
            >
              Verify your email before
              changing your password.
            </Text>
          </View>

        </View>


        {/* =================================================
            EMAIL VERIFICATION CARD
        ================================================= */}

        <View
          style={[
            styles.card,
            {
              borderRadius:
                17 * scale,

              padding:
                17 * scale,
            },
          ]}
        >

          <View
            style={
              styles.cardHeader
            }
          >

            <View
              style={
                styles.cardHeaderLeft
              }
            >

              <Text
                style={[
                  styles.cardEyebrow,
                  {
                    fontSize:
                      8 * scale,
                  },
                ]}
              >
                STEP 01
              </Text>

              <Text
                style={[
                  styles.cardTitle,
                  {
                    fontSize:
                      17 * scale,
                  },
                ]}
              >
                Email Verification
              </Text>

            </View>

            <View
              style={
                styles.stepIcon
              }
            >
              <Ionicons
                name={
                  otpVerified
                    ? "checkmark"
                    : "mail-outline"
                }
                size={19 * scale}
                color={
                  otpVerified
                    ? COLORS.textDark
                    : COLORS.primary
                }
              />
            </View>

          </View>


          {/* EMAIL */}

          <View
            style={
              styles.emailBox
            }
          >
            <View
              style={
                styles.emailIcon
              }
            >
              <Ionicons
                name="mail"
                size={17 * scale}
                color={
                  COLORS.primary
                }
              />
            </View>

            <View
              style={
                styles.emailTextContainer
              }
            >
              <Text
                style={[
                  styles.emailLabel,
                  {
                    fontSize:
                      7.5 * scale,
                  },
                ]}
              >
                REGISTERED EMAIL
              </Text>

              <Text
                style={[
                  styles.emailText,
                  {
                    fontSize:
                      10.5 * scale,
                  },
                ]}
                numberOfLines={1}
              >
                {user.email}
              </Text>
            </View>
          </View>


          {/* OTP BUTTON */}

          <TouchableOpacity
            style={[
              styles.otpBtn,
              {
                minHeight:
                  51 * scale,

                borderRadius:
                  11 * scale,
              },
              otpVerified &&
                styles.otpVerifiedBtn,
            ]}
            onPress={
              openOtpModal
            }
            disabled={
              otpLoading
            }
            activeOpacity={0.8}
          >

            {otpLoading ? (
              <ActivityIndicator
                size="small"
                color={
                  COLORS.textDark
                }
              />
            ) : (
              <>
                <Ionicons
                  name={
                    otpVerified
                      ? "checkmark-circle"
                      : "paper-plane-outline"
                  }
                  size={
                    19 * scale
                  }
                  color={
                    COLORS.textDark
                  }
                />

                <Text
                  style={[
                    styles.otpBtnText,
                    {
                      fontSize:
                        12 * scale,
                    },
                  ]}
                >
                  {otpVerified
                    ? "OTP Verified"
                    : "Send OTP"}
                </Text>
              </>
            )}

          </TouchableOpacity>

        </View>


        {/* =================================================
            CHANGE PASSWORD CARD
        ================================================= */}

        <View
          style={[
            styles.card,
            {
              borderRadius:
                17 * scale,

              padding:
                17 * scale,
            },
          ]}
        >

          <View
            style={
              styles.cardHeader
            }
          >

            <View
              style={
                styles.cardHeaderLeft
              }
            >

              <Text
                style={[
                  styles.cardEyebrow,
                  {
                    fontSize:
                      8 * scale,
                  },
                ]}
              >
                STEP 02
              </Text>

              <Text
                style={[
                  styles.cardTitle,
                  {
                    fontSize:
                      17 * scale,
                  },
                ]}
              >
                Change Password
              </Text>

            </View>

            <View
              style={
                styles.lockHeaderIcon
              }
            >
              <Ionicons
                name="lock-closed-outline"
                size={18 * scale}
                color={
                  COLORS.primary
                }
              />
            </View>

          </View>


          {/* =================================================
              CURRENT PASSWORD
          ================================================= */}

          <Text
            style={[
              styles.label,
              {
                fontSize:
                  10 * scale,
              },
            ]}
          >
            Current Password
          </Text>

          <View
            style={[
              styles.inputContainer,
              {
                minHeight:
                  50 * scale,

                borderRadius:
                  10 * scale,
              },
            ]}
          >

            <Ionicons
              name="key-outline"
              size={18 * scale}
              color={
                COLORS.primary
              }
            />

            <TextInput
              style={[
                styles.input,
                {
                  fontSize:
                    11.5 * scale,
                },
              ]}
              secureTextEntry={
                !showCurrentPassword
              }
              value={
                currentPassword
              }
              onChangeText={
                setCurrentPassword
              }
              placeholder="Enter current password"
              placeholderTextColor={
                COLORS.textMuted
              }
              selectionColor={
                COLORS.primary
              }
              autoCapitalize="none"
            />

            <TouchableOpacity
              onPress={() =>
                setShowCurrentPassword(
                  !showCurrentPassword
                )
              }
              style={
                styles.eyeBtn
              }
              activeOpacity={0.7}
            >
              <Ionicons
                name={
                  showCurrentPassword
                    ? "eye-off-outline"
                    : "eye-outline"
                }
                size={
                  20 * scale
                }
                color={
                  COLORS.textMuted
                }
              />
            </TouchableOpacity>

          </View>


          {/* =================================================
              NEW PASSWORD
          ================================================= */}

          <Text
            style={[
              styles.label,
              {
                fontSize:
                  10 * scale,
              },
            ]}
          >
            New Password
          </Text>

          <View
            style={[
              styles.inputContainer,
              {
                minHeight:
                  50 * scale,

                borderRadius:
                  10 * scale,
              },
            ]}
          >

            <Ionicons
              name="lock-closed-outline"
              size={18 * scale}
              color={
                COLORS.primary
              }
            />

            <TextInput
              style={[
                styles.input,
                {
                  fontSize:
                    11.5 * scale,
                },
              ]}
              secureTextEntry={
                !showNewPassword
              }
              value={
                newPassword
              }
              onChangeText={
                setNewPassword
              }
              placeholder="Create a new password"
              placeholderTextColor={
                COLORS.textMuted
              }
              selectionColor={
                COLORS.primary
              }
              autoCapitalize="none"
            />

            <TouchableOpacity
              onPress={() =>
                setShowNewPassword(
                  !showNewPassword
                )
              }
              style={
                styles.eyeBtn
              }
              activeOpacity={0.7}
            >
              <Ionicons
                name={
                  showNewPassword
                    ? "eye-off-outline"
                    : "eye-outline"
                }
                size={
                  20 * scale
                }
                color={
                  COLORS.textMuted
                }
              />
            </TouchableOpacity>

          </View>


          {/* =================================================
              CONFIRM PASSWORD
          ================================================= */}

          <Text
            style={[
              styles.label,
              {
                fontSize:
                  10 * scale,
              },
            ]}
          >
            Confirm New Password
          </Text>

          <View
            style={[
              styles.inputContainer,
              {
                minHeight:
                  50 * scale,

                borderRadius:
                  10 * scale,
              },
            ]}
          >

            <Ionicons
              name="shield-checkmark-outline"
              size={18 * scale}
              color={
                COLORS.primary
              }
            />

            <TextInput
              style={[
                styles.input,
                {
                  fontSize:
                    11.5 * scale,
                },
              ]}
              secureTextEntry={
                !showConfirmNewPassword
              }
              value={
                confirmNewPassword
              }
              onChangeText={
                setConfirmNewPassword
              }
              placeholder="Confirm new password"
              placeholderTextColor={
                COLORS.textMuted
              }
              selectionColor={
                COLORS.primary
              }
              autoCapitalize="none"
            />

            <TouchableOpacity
              onPress={() =>
                setShowConfirmNewPassword(
                  !showConfirmNewPassword
                )
              }
              style={
                styles.eyeBtn
              }
              activeOpacity={0.7}
            >
              <Ionicons
                name={
                  showConfirmNewPassword
                    ? "eye-off-outline"
                    : "eye-outline"
                }
                size={
                  20 * scale
                }
                color={
                  COLORS.textMuted
                }
              />
            </TouchableOpacity>

          </View>


          {/* =================================================
              PASSWORD REQUIREMENTS
          ================================================= */}

          <View
            style={[
              styles.criteriaBox,
              {
                borderRadius:
                  11 * scale,
              },
            ]}
          >

            <View
              style={
                styles.criteriaHeader
              }
            >
              <Ionicons
                name="shield-outline"
                size={16 * scale}
                color={
                  COLORS.primary
                }
              />

              <Text
                style={[
                  styles.criteriaTitle,
                  {
                    fontSize:
                      9 * scale,
                  },
                ]}
              >
                PASSWORD REQUIREMENTS
              </Text>
            </View>


            <View
              style={
                styles.criteriaGrid
              }
            >

              <View
                style={
                  styles.criteriaRow
                }
              >
                <Ionicons
                  name={
                    criteria.uppercase
                      ? "checkmark-circle"
                      : "ellipse-outline"
                  }
                  size={
                    16 * scale
                  }
                  color={
                    criteria.uppercase
                      ? COLORS.primary
                      : COLORS.textMuted
                  }
                />

                <Text
                  style={[
                    styles.criteriaText,
                    {
                      fontSize:
                        9 * scale,
                    },
                    criteria.uppercase &&
                      styles.criteriaOk,
                  ]}
                >
                  At least 1 uppercase letter
                </Text>
              </View>


              <View
                style={
                  styles.criteriaRow
                }
              >
                <Ionicons
                  name={
                    criteria.number
                      ? "checkmark-circle"
                      : "ellipse-outline"
                  }
                  size={
                    16 * scale
                  }
                  color={
                    criteria.number
                      ? COLORS.primary
                      : COLORS.textMuted
                  }
                />

                <Text
                  style={[
                    styles.criteriaText,
                    {
                      fontSize:
                        9 * scale,
                    },
                    criteria.number &&
                      styles.criteriaOk,
                  ]}
                >
                  At least 1 number
                </Text>
              </View>


              <View
                style={
                  styles.criteriaRow
                }
              >
                <Ionicons
                  name={
                    criteria.special
                      ? "checkmark-circle"
                      : "ellipse-outline"
                  }
                  size={
                    16 * scale
                  }
                  color={
                    criteria.special
                      ? COLORS.primary
                      : COLORS.textMuted
                  }
                />

                <Text
                  style={[
                    styles.criteriaText,
                    {
                      fontSize:
                        9 * scale,
                    },
                    criteria.special &&
                      styles.criteriaOk,
                  ]}
                >
                  At least 1 special character
                </Text>
              </View>


              <View
                style={
                  styles.criteriaRow
                }
              >
                <Ionicons
                  name={
                    criteria.length
                      ? "checkmark-circle"
                      : "ellipse-outline"
                  }
                  size={
                    16 * scale
                  }
                  color={
                    criteria.length
                      ? COLORS.primary
                      : COLORS.textMuted
                  }
                />

                <Text
                  style={[
                    styles.criteriaText,
                    {
                      fontSize:
                        9 * scale,
                    },
                    criteria.length &&
                      styles.criteriaOk,
                  ]}
                >
                  8–12 characters
                </Text>
              </View>

            </View>

          </View>


          {/* =================================================
              CHANGE PASSWORD BUTTON
          ================================================= */}

          <TouchableOpacity
            style={[
              styles.saveBtn,
              {
                minHeight:
                  54 * scale,

                borderRadius:
                  27 * scale,
              },

              (!otpVerified ||
                saving) &&
                styles.saveBtnDisabled,
            ]}
            onPress={
              handleChangePassword
            }
            disabled={
              !otpVerified ||
              saving
            }
            activeOpacity={0.8}
          >

            {saving ? (
              <ActivityIndicator
                size="small"
                color={
                  COLORS.textDark
                }
              />
            ) : (
              <>
                <Ionicons
                  name="lock-open-outline"
                  size={
                    20 * scale
                  }
                  color={
                    COLORS.textDark
                  }
                />

                <Text
                  style={[
                    styles.saveBtnText,
                    {
                      fontSize:
                        12.5 * scale,
                    },
                  ]}
                >
                  Change Password
                </Text>
              </>
            )}

          </TouchableOpacity>


          {/* =================================================
              OTP WARNING / VERIFIED MESSAGE
          ================================================= */}

          {!otpVerified ? (
            <View
              style={
                styles.warningBox
              }
            >
              <Ionicons
                name="alert-circle-outline"
                size={18 * scale}
                color={
                  COLORS.danger
                }
              />

              <Text
                style={[
                  styles.noteText,
                  {
                    fontSize:
                      9.5 * scale,
                  },
                ]}
              >
                You must verify OTP
                first to change your
                password.
              </Text>
            </View>
          ) : (
            <View
              style={
                styles.verifiedBox
              }
            >
              <Ionicons
                name="checkmark-circle"
                size={18 * scale}
                color={
                  COLORS.primary
                }
              />

              <Text
                style={[
                  styles.verifiedText,
                  {
                    fontSize:
                      9.5 * scale,
                  },
                ]}
              >
                Email verification
                complete. You can
                now change your
                password.
              </Text>
            </View>
          )}

        </View>


        {/* =================================================
            FOOTER
        ================================================= */}

        <View
          style={
            styles.footer
          }
        >

          <Image
            source={pmgLogo}
            style={
              styles.footerLogo
            }
            resizeMode="contain"
          />

          <View
            style={
              styles.footerLine
            }
          />

          <Text
            style={
              styles.footerText
            }
          >
            PRINT • CREATE • DELIVER
          </Text>

        </View>

      </ScrollView>


      {/* ====================================================
          OTP MODAL
      ==================================================== */}

      <Modal
        visible={
          otpModalOpen
        }
        transparent={true}
        animationType="fade"
        onRequestClose={() =>
          setOtpModalOpen(
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
              styles.modalContent,
              {
                width:
                  width > 600
                    ? 430
                    : "88%",

                borderRadius:
                  19 * scale,
              },
            ]}
          >

            {/* MODAL TOP ACCENT */}

            <View
              style={
                styles.modalAccent
              }
            />


            {/* ICON */}

            <View
              style={
                styles.modalIcon
              }
            >
              <Ionicons
                name="shield-checkmark-outline"
                size={29 * scale}
                color={
                  COLORS.primary
                }
              />
            </View>


            <Text
              style={[
                styles.modalTitle,
                {
                  fontSize:
                    20 * scale,
                },
              ]}
            >
              Enter OTP
            </Text>

            <Text
              style={[
                styles.modalSub,
                {
                  fontSize:
                    9.5 * scale,
                },
              ]}
            >
              Verification code sent to
            </Text>

            <Text
              style={[
                styles.modalEmail,
                {
                  fontSize:
                    10.5 * scale,
                },
              ]}
              numberOfLines={1}
            >
              {user.email}
            </Text>


            {/* OTP INPUT */}

            <View
              style={
                styles.otpInputWrapper
              }
            >
              <Ionicons
                name="keypad-outline"
                size={19 * scale}
                color={
                  COLORS.primary
                }
              />

              <TextInput
                style={[
                  styles.otpInput,
                  {
                    fontSize:
                      20 * scale,
                  },
                ]}
                keyboardType="number-pad"
                maxLength={6}
                value={otp}
                onChangeText={(text) =>
                  setOtp(
                    text.replace(
                      /\D/g,
                      ""
                    )
                  )
                }
                placeholder="000000"
                placeholderTextColor={
                  COLORS.textMuted
                }
                selectionColor={
                  COLORS.primary
                }
              />
            </View>


            {/* VERIFY */}

            {otpLoading ? (
              <View
                style={
                  styles.modalLoading
                }
              >
                <ActivityIndicator
                  size="small"
                  color={
                    COLORS.primary
                  }
                />

                <Text
                  style={
                    styles.modalLoadingText
                  }
                >
                  Verifying...
                </Text>
              </View>
            ) : (
              <TouchableOpacity
                style={[
                  styles.verifyBtn,
                  {
                    minHeight:
                      51 * scale,

                    borderRadius:
                      11 * scale,
                  },
                ]}
                onPress={
                  verifyOtp
                }
                activeOpacity={0.8}
              >
                <Ionicons
                  name="checkmark-circle-outline"
                  size={
                    20 * scale
                  }
                  color={
                    COLORS.textDark
                  }
                />

                <Text
                  style={[
                    styles.verifyBtnText,
                    {
                      fontSize:
                        12 * scale,
                    },
                  ]}
                >
                  Verify OTP
                </Text>
              </TouchableOpacity>
            )}


            {/* CANCEL */}

            <TouchableOpacity
              style={
                styles.cancelBtn
              }
              onPress={() =>
                setOtpModalOpen(
                  false
                )
              }
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.cancelBtnText,
                  {
                    fontSize:
                      10.5 * scale,
                  },
                ]}
              >
                Cancel
              </Text>
            </TouchableOpacity>

          </View>

        </View>

      </Modal>

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
    MAIN
    ========================================================
    */

    container: {
      flex: 1,

      backgroundColor:
        "#07110B",
    },

    scrollView: {
      flex: 1,

      backgroundColor:
        "#07110B",
    },

    scrollContent: {
      paddingTop: 14,
    },


    /*
    ========================================================
    LOADING
    ========================================================
    */

    loadingContainer: {
      flex: 1,

      justifyContent:
        "center",

      alignItems: "center",

      backgroundColor:
        "#07110B",
    },

    loadingLogo: {
      width: 100,

      height: 55,
    },

    loadingText: {
      fontFamily:
        "Poppins_500Medium",

      color:
        "#8B978F",

      fontSize: 10,

      marginTop: 8,
    },


    /*
    ========================================================
    HEADER
    ========================================================
    */

    header: {
      height: 86,

      backgroundColor:
        "#020805",

      flexDirection: "row",

      alignItems: "center",

      borderBottomWidth: 1,

      borderBottomColor:
        "rgba(142,255,0,0.16)",

      paddingTop: 12,
    },

    backButton: {
      width: 44,

      height: 44,

      alignItems: "center",

      justifyContent:
        "center",
    },

    headerCenter: {
      flex: 1,

      alignItems: "center",

      justifyContent:
        "center",

      marginLeft: -3,
    },

    headerTitle: {
      fontFamily:
        "Poppins_700Bold",

      color:
        "#F5F7F5",

      letterSpacing: -0.5,

      textAlign: "center",
    },

    headerSubtitle: {
      fontFamily:
        "Poppins_600SemiBold",

      color:
        "#8EFF00",

      letterSpacing: 1.3,

      marginTop: 1,
    },

    headerLogoBox: {
      width: 70,

      height: 38,

      alignItems: "center",

      justifyContent:
        "center",

      marginLeft: 5,
    },

    headerLogo: {
      width: "100%",

      height: "100%",
    },


    /*
    ========================================================
    SECURITY BANNER
    ========================================================
    */

    securityBanner: {
      backgroundColor:
        "#0C1810",

      borderWidth: 1,

      borderColor:
        "rgba(142,255,0,0.18)",

      padding: 13,

      marginBottom: 14,

      flexDirection: "row",

      alignItems: "center",

      overflow: "hidden",
    },

    bannerIcon: {
      width: 47,

      height: 47,

      borderRadius: 24,

      backgroundColor:
        "rgba(142,255,0,0.10)",

      borderWidth: 1,

      borderColor:
        "rgba(142,255,0,0.20)",

      alignItems: "center",

      justifyContent:
        "center",

      marginRight: 11,
    },

    bannerTextContainer: {
      flex: 1,
    },

    bannerEyebrow: {
      fontFamily:
        "Poppins_600SemiBold",

      color:
        "#8EFF00",

      letterSpacing: 1,

      marginBottom: 1,
    },

    bannerTitle: {
      fontFamily:
        "Poppins_700Bold",

      color:
        "#F5F7F5",
    },

    bannerText: {
      fontFamily:
        "Poppins_400Regular",

      color:
        "#8B978F",

      marginTop: 1,

      lineHeight: 15,
    },


    /*
    ========================================================
    CARD
    ========================================================
    */

    card: {
      backgroundColor:
        "#0B1610",

      borderWidth: 1,

      borderColor:
        "rgba(255,255,255,0.08)",

      marginBottom: 14,

      shadowColor:
        "#000000",

      shadowOffset: {
        width: 0,

        height: 5,
      },

      shadowOpacity: 0.24,

      shadowRadius: 10,

      elevation: 3,

      overflow: "hidden",
    },

    cardHeader: {
      flexDirection: "row",

      alignItems: "center",

      justifyContent:
        "space-between",

      marginBottom: 12,
    },

    cardHeaderLeft: {
      flex: 1,
    },

    cardEyebrow: {
      fontFamily:
        "Poppins_600SemiBold",

      color:
        "#8EFF00",

      letterSpacing: 1.1,
    },

    cardTitle: {
      fontFamily:
        "Poppins_700Bold",

      color:
        "#F5F7F5",

      marginTop: 1,
    },

    stepIcon: {
      width: 39,

      height: 39,

      borderRadius: 20,

      backgroundColor:
        "#8EFF00",

      alignItems: "center",

      justifyContent:
        "center",

      marginLeft: 10,
    },

    lockHeaderIcon: {
      width: 39,

      height: 39,

      borderRadius: 20,

      backgroundColor:
        "rgba(142,255,0,0.08)",

      borderWidth: 1,

      borderColor:
        "rgba(142,255,0,0.18)",

      alignItems: "center",

      justifyContent:
        "center",

      marginLeft: 10,
    },


    /*
    ========================================================
    EMAIL
    ========================================================
    */

    emailBox: {
      flexDirection: "row",

      alignItems: "center",

      backgroundColor:
        "#07110B",

      borderWidth: 1,

      borderColor:
        "rgba(255,255,255,0.07)",

      borderRadius: 10,

      padding: 10,

      marginBottom: 11,
    },

    emailIcon: {
      width: 35,

      height: 35,

      borderRadius: 18,

      backgroundColor:
        "rgba(142,255,0,0.09)",

      alignItems: "center",

      justifyContent:
        "center",

      marginRight: 9,
    },

    emailTextContainer: {
      flex: 1,

      minWidth: 0,
    },

    emailLabel: {
      fontFamily:
        "Poppins_600SemiBold",

      color:
        "#69756D",

      letterSpacing: 0.8,

      marginBottom: 1,
    },

    emailText: {
      fontFamily:
        "Poppins_500Medium",

      color:
        "#E7ECE8",
    },


    /*
    ========================================================
    OTP BUTTON
    ========================================================
    */

    otpBtn: {
      backgroundColor:
        "#8EFF00",

      flexDirection: "row",

      alignItems: "center",

      justifyContent:
        "center",

      shadowColor:
        "#8EFF00",

      shadowOffset: {
        width: 0,

        height: 3,
      },

      shadowOpacity: 0.18,

      shadowRadius: 7,

      elevation: 3,
    },

    otpVerifiedBtn: {
      backgroundColor:
        "#6FCC00",
    },

    otpBtnText: {
      fontFamily:
        "Poppins_700Bold",

      color:
        "#07110B",

      marginLeft: 7,
    },


    /*
    ========================================================
    LABEL
    ========================================================
    */

    label: {
      fontFamily:
        "Poppins_600SemiBold",

      color:
        "#B9C3BC",

      marginTop: 10,

      marginBottom: 6,
    },


    /*
    ========================================================
    INPUT
    ========================================================
    */

    inputContainer: {
      flexDirection: "row",

      alignItems: "center",

      backgroundColor:
        "#07110B",

      borderWidth: 1,

      borderColor:
        "rgba(255,255,255,0.09)",

      paddingHorizontal: 12,
    },

    input: {
      flex: 1,

      fontFamily:
        "Poppins_400Regular",

      color:
        "#F5F7F5",

      paddingVertical: 9,

      marginLeft: 9,

      minWidth: 0,
    },

    eyeBtn: {
      width: 38,

      height: 42,

      alignItems: "center",

      justifyContent:
        "center",

      marginLeft: 3,
    },


    /*
    ========================================================
    PASSWORD CRITERIA
    ========================================================
    */

    criteriaBox: {
      backgroundColor:
        "rgba(142,255,0,0.045)",

      borderWidth: 1,

      borderColor:
        "rgba(142,255,0,0.15)",

      padding: 11,

      marginTop: 14,
    },

    criteriaHeader: {
      flexDirection: "row",

      alignItems: "center",

      marginBottom: 8,
    },

    criteriaTitle: {
      fontFamily:
        "Poppins_600SemiBold",

      color:
        "#8EFF00",

      letterSpacing: 0.9,

      marginLeft: 7,
    },

    criteriaGrid: {
      gap: 6,
    },

    criteriaRow: {
      flexDirection: "row",

      alignItems: "center",
    },

    criteriaText: {
      fontFamily:
        "Poppins_400Regular",

      color:
        "#7E8B83",

      marginLeft: 7,
    },

    criteriaOk: {
      color:
        "#8EFF00",

      fontFamily:
        "Poppins_500Medium",
    },


    /*
    ========================================================
    SAVE BUTTON
    ========================================================
    */

    saveBtn: {
      backgroundColor:
        "#8EFF00",

      flexDirection: "row",

      alignItems: "center",

      justifyContent:
        "center",

      marginTop: 17,

      shadowColor:
        "#8EFF00",

      shadowOffset: {
        width: 0,

        height: 4,
      },

      shadowOpacity: 0.18,

      shadowRadius: 8,

      elevation: 4,
    },

    saveBtnDisabled: {
      opacity: 0.35,
    },

    saveBtnText: {
      fontFamily:
        "Poppins_700Bold",

      color:
        "#07110B",

      marginLeft: 7,
    },


    /*
    ========================================================
    WARNING
    ========================================================
    */

    warningBox: {
      flexDirection: "row",

      alignItems: "center",

      backgroundColor:
        "rgba(239,68,68,0.07)",

      borderWidth: 1,

      borderColor:
        "rgba(239,68,68,0.17)",

      borderRadius: 10,

      padding: 10,

      marginTop: 12,
    },

    noteText: {
      flex: 1,

      fontFamily:
        "Poppins_400Regular",

      color:
        "#EF6B6B",

      textAlign: "left",

      marginLeft: 7,

      lineHeight: 15,
    },


    /*
    ========================================================
    VERIFIED
    ========================================================
    */

    verifiedBox: {
      flexDirection: "row",

      alignItems: "center",

      backgroundColor:
        "rgba(142,255,0,0.06)",

      borderWidth: 1,

      borderColor:
        "rgba(142,255,0,0.16)",

      borderRadius: 10,

      padding: 10,

      marginTop: 12,
    },

    verifiedText: {
      flex: 1,

      fontFamily:
        "Poppins_400Regular",

      color:
        "#8FA397",

      marginLeft: 7,

      lineHeight: 15,
    },


    /*
    ========================================================
    FOOTER
    ========================================================
    */

    footer: {
      alignItems: "center",

      justifyContent:
        "center",

      paddingTop: 3,

      paddingBottom: 10,
    },

    footerLogo: {
      width: 72,

      height: 32,

      opacity: 0.75,

      marginBottom: 4,
    },

    footerLine: {
      width: 38,

      height: 2,

      borderRadius: 2,

      backgroundColor:
        "#8EFF00",

      marginBottom: 5,
    },

    footerText: {
      fontFamily:
        "Poppins_500Medium",

      fontSize: 7.5,

      color:
        "#59655D",

      letterSpacing: 1,
    },


    /*
    ========================================================
    OTP MODAL
    ========================================================
    */

    modalOverlay: {
      flex: 1,

      backgroundColor:
        "rgba(0,0,0,0.78)",

      justifyContent:
        "center",

      alignItems: "center",

      paddingHorizontal: 18,
    },

    modalContent: {
      backgroundColor:
        "#0B1610",

      borderWidth: 1,

      borderColor:
        "rgba(142,255,0,0.20)",

      padding: 21,

      alignItems: "center",

      overflow: "hidden",

      shadowColor:
        "#000000",

      shadowOffset: {
        width: 0,

        height: 8,
      },

      shadowOpacity: 0.4,

      shadowRadius: 18,

      elevation: 10,
    },

    modalAccent: {
      position: "absolute",

      top: 0,

      left: 0,

      right: 0,

      height: 4,

      backgroundColor:
        "#8EFF00",
    },

    modalIcon: {
      width: 60,

      height: 60,

      borderRadius: 30,

      backgroundColor:
        "rgba(142,255,0,0.08)",

      borderWidth: 1,

      borderColor:
        "rgba(142,255,0,0.20)",

      alignItems: "center",

      justifyContent:
        "center",

      marginTop: 5,

      marginBottom: 10,
    },

    modalTitle: {
      fontFamily:
        "Poppins_700Bold",

      color:
        "#F5F7F5",

      marginBottom: 2,
    },

    modalSub: {
      fontFamily:
        "Poppins_400Regular",

      color:
        "#7E8B83",

      marginTop: 1,
    },

    modalEmail: {
      fontFamily:
        "Poppins_600SemiBold",

      color:
        "#8EFF00",

      marginTop: 2,

      marginBottom: 16,

      maxWidth: "100%",
    },


    /*
    ========================================================
    OTP INPUT
    ========================================================
    */

    otpInputWrapper: {
      width: "100%",

      minHeight: 57,

      flexDirection: "row",

      alignItems: "center",

      backgroundColor:
        "#07110B",

      borderWidth: 1,

      borderColor:
        "rgba(142,255,0,0.20)",

      borderRadius: 11,

      paddingHorizontal: 13,

      marginBottom: 13,
    },

    otpInput: {
      flex: 1,

      fontFamily:
        "Poppins_700Bold",

      color:
        "#F5F7F5",

      textAlign: "center",

      letterSpacing: 6,

      paddingVertical: 7,

      marginLeft: 7,
    },


    /*
    ========================================================
    MODAL BUTTONS
    ========================================================
    */

    verifyBtn: {
      width: "100%",

      backgroundColor:
        "#8EFF00",

      flexDirection: "row",

      alignItems: "center",

      justifyContent:
        "center",

      shadowColor:
        "#8EFF00",

      shadowOffset: {
        width: 0,

        height: 3,
      },

      shadowOpacity: 0.2,

      shadowRadius: 7,

      elevation: 3,
    },

    verifyBtnText: {
      fontFamily:
        "Poppins_700Bold",

      color:
        "#07110B",

      marginLeft: 7,
    },

    modalLoading: {
      width: "100%",

      minHeight: 51,

      flexDirection: "row",

      alignItems: "center",

      justifyContent:
        "center",
    },

    modalLoadingText: {
      fontFamily:
        "Poppins_500Medium",

      color:
        "#8B978F",

      fontSize: 10,

      marginLeft: 8,
    },

    cancelBtn: {
      paddingVertical: 10,

      paddingHorizontal: 20,

      marginTop: 4,
    },

    cancelBtnText: {
      fontFamily:
        "Poppins_600SemiBold",

      color:
        "#7E8B83",
    },
  });