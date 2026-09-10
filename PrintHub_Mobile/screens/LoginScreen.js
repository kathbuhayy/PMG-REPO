import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  Image,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { API_BASE_URL } from "../config";

const COLORS = {
  background: "#06150D",
  card: "#0D2519",
  cardBorder: "#294A32",
  lime: "#A8FF3E",
  limeDark: "#8BEA20",
  white: "#FFFFFF",
  muted: "#89978E",
  input: "#F7F9F7",
  inputText: "#222222",
};

const REMEMBER_ME_KEY = "rememberMe";
const SAVED_EMAIL_KEY = "savedLoginEmail";
const SAVED_PASSWORD_KEY = "savedLoginPassword";

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // LOAD SAVED LOGIN INFORMATION
  useEffect(() => {
    const loadRememberedLogin = async () => {
      try {
        const savedRememberMe =
          await AsyncStorage.getItem(REMEMBER_ME_KEY);

        if (savedRememberMe === "true") {
          const savedEmail =
            await AsyncStorage.getItem(SAVED_EMAIL_KEY);

          const savedPassword =
            await AsyncStorage.getItem(SAVED_PASSWORD_KEY);

          setRememberMe(true);

          if (savedEmail) {
            setEmail(savedEmail);
          }

          if (savedPassword) {
            setPassword(savedPassword);
          }
        }
      } catch (err) {
        console.error(
          "[Login] Failed to load remembered login:",
          err
        );
      }
    };

    loadRememberedLogin();
  }, []);

  // REMEMBER ME TOGGLE
  const toggleRememberMe = () => {
    setRememberMe((previous) => !previous);
  };

  const PostLogin = async () => {
    if (!email || !password) {
      Alert.alert("Error", "Please fill in all fields");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/login`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email,
            password,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        if (
          data.message === "Email not found" ||
          data.message === "User not found"
        ) {
          Alert.alert(
            "Account Not Found",
            "Would you like to register?",
            [
              {
                text: "Cancel",
                style: "cancel",
              },
              {
                text: "Register",
                onPress: () =>
                  navigation.navigate("Register"),
              },
            ]
          );

          return;
        }

        throw new Error(
          data.message || "Failed to log in"
        );
      }

      // PREVENT ADMIN LOGIN
      if (data.user?.role === "admin") {
        Alert.alert(
          "Access Denied",
          "Admins cannot log in via the mobile app. Please use the web dashboard."
        );

        return;
      }

      // SAVE USER SESSION
      await AsyncStorage.setItem(
        "user",
        JSON.stringify(data.user)
      );

      // SAVE OR REMOVE REMEMBER ME INFORMATION
      if (rememberMe) {
        await AsyncStorage.setItem(
          REMEMBER_ME_KEY,
          "true"
        );

        await AsyncStorage.setItem(
          SAVED_EMAIL_KEY,
          email
        );

        await AsyncStorage.setItem(
          SAVED_PASSWORD_KEY,
          password
        );
      } else {
        await AsyncStorage.removeItem(
          REMEMBER_ME_KEY
        );

        await AsyncStorage.removeItem(
          SAVED_EMAIL_KEY
        );

        await AsyncStorage.removeItem(
          SAVED_PASSWORD_KEY
        );
      }

      Alert.alert(
        "Success",
        "Login successful!"
      );

      navigation.reset({
        index: 0,
        routes: [{ name: "Main" }],
      });
    } catch (err) {
      console.error(
        "[PostLogin] {FetchLogin}: " +
          err.message
      );

      Alert.alert(
        "Login Failed",
        err.message
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.screen}>
      <StatusBar
        barStyle="light-content"
        backgroundColor={COLORS.background}
      />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={
          Platform.OS === "ios"
            ? "padding"
            : "height"
        }
      >
        <ScrollView
          style={styles.background}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* PMG LOGO */}
          <View style={styles.logoContainer}>
            <Image
              source={require("../assets/images/pmg-logo-nav.png")}
              style={styles.logo}
              resizeMode="contain"
            />
          </View>

          {/* MAIN CARD */}
          <View style={styles.card}>
            <Text style={styles.eyebrow}>
              CUSTOMER PORTAL
            </Text>

            <Text style={styles.title}>
              Welcome{" "}
              <Text style={styles.titleAccent}>
                Back
              </Text>
            </Text>

            <Text style={styles.subtitle}>
              Sign in and keep your print orders moving.
            </Text>

            {/* EMAIL */}
            <Text style={styles.label}>
              Email Address
            </Text>

            <View style={styles.inputWrapper}>
              <Text style={styles.atIcon}>
                @
              </Text>

              <TextInput
                style={styles.input}
                placeholder="customer@example.com"
                placeholderTextColor="#8F9993"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            {/* PASSWORD */}
            <Text style={styles.label}>
              Password
            </Text>

            <View style={styles.inputWrapper}>
              <Ionicons
                name="lock-closed-outline"
                size={20}
                color={COLORS.limeDark}
                style={styles.inputIcon}
              />

              <TextInput
                style={styles.input}
                placeholder="Enter your password"
                placeholderTextColor="#8F9993"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
              />

              <TouchableOpacity
                onPress={() =>
                  setShowPassword(
                    !showPassword
                  )
                }
              >
                <Ionicons
                  name={
                    showPassword
                      ? "eye-outline"
                      : "eye-off-outline"
                  }
                  size={22}
                  color="#6F7A73"
                />
              </TouchableOpacity>
            </View>

            {/* REMEMBER ME + FORGOT PASSWORD */}
            <View style={styles.optionsRow}>
              <TouchableOpacity
                style={styles.rememberContainer}
                onPress={toggleRememberMe}
                activeOpacity={0.7}
              >
                <View
                  style={[
                    styles.checkbox,
                    rememberMe &&
                      styles.checkboxChecked,
                  ]}
                >
                  {rememberMe && (
                    <Ionicons
                      name="checkmark"
                      size={16}
                      color="#000000"
                    />
                  )}
                </View>

                <Text style={styles.rememberText}>
                  Remember me
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() =>
                  navigation.navigate(
                    "ForgotPassword"
                  )
                }
              >
                <Text style={styles.forgotText}>
                  Forgot password?
                </Text>
              </TouchableOpacity>
            </View>

            {/* LOGIN BUTTON */}
            <TouchableOpacity
              style={styles.loginButton}
              onPress={PostLogin}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator
                  color="#000000"
                />
              ) : (
                <View
                  style={styles.buttonContent}
                >
                  <Text
                    style={styles.loginButtonText}
                  >
                    Log In
                  </Text>

                  <Text style={styles.arrow}>
                    →
                  </Text>
                </View>
              )}
            </TouchableOpacity>

            {/* DIVIDER */}
            <View style={styles.divider} />

            {/* REGISTER */}
            <TouchableOpacity
              onPress={() =>
                navigation.navigate(
                  "Register"
                )
              }
            >
              <Text style={styles.registerText}>
                Don't have an account?{" "}
                <Text
                  style={
                    styles.registerHighlight
                  }
                >
                  Create one here
                </Text>
              </Text>
            </TouchableOpacity>

            {/* GUEST */}
            <TouchableOpacity
              style={styles.guestButton}
              onPress={() =>
                navigation.reset({
                  index: 0,
                  routes: [{ name: "Main" }],
                })
              }
            >
              <Text style={styles.guestText}>
                Continue as Guest
              </Text>
            </TouchableOpacity>
          </View>

          {/* FOOTER */}
          <View style={styles.footer}>
            <View style={styles.footerDot} />

            <Text style={styles.footerText}>
              PRINT. CREATE. DELIVER.
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  flex: {
    flex: 1,
  },

  background: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 35,
    paddingBottom: 40,
  },

  /* LOGO */
  logoContainer: {
    alignItems: "center",
    marginBottom: 28,
  },

  logo: {
    width: 175,
    height: 70,
  },

  /* CARD */
  card: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    borderTopColor: COLORS.lime,
    borderRadius: 28,
    padding: 25,

    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 10,
  },

  eyebrow: {
    color: COLORS.lime,
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 2.2,
    marginBottom: 12,
  },

  title: {
    color: COLORS.white,
    fontSize: 36,
    fontWeight: "900",
    letterSpacing: -1,
  },

  titleAccent: {
    color: COLORS.lime,
  },

  subtitle: {
    color: COLORS.muted,
    fontSize: 14,
    lineHeight: 21,
    marginTop: 7,
    marginBottom: 28,
  },

  /* LABEL */
  label: {
    color: COLORS.white,
    fontSize: 13,
    fontWeight: "800",
    marginBottom: 8,
  },

  /* INPUT */
  inputWrapper: {
    height: 58,
    backgroundColor: COLORS.input,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    marginBottom: 21,
  },

  atIcon: {
    color: COLORS.limeDark,
    fontSize: 23,
    fontWeight: "900",
    marginRight: 12,
  },

  inputIcon: {
    marginRight: 11,
  },

  input: {
    flex: 1,
    color: COLORS.inputText,
    fontSize: 15,
  },

  /* REMEMBER ME */
  optionsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 25,
  },

  rememberContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 4,
    paddingRight: 10,
  },

  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: "#3B5144",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },

  checkboxChecked: {
    backgroundColor: COLORS.lime,
    borderColor: COLORS.lime,
  },

  rememberText: {
    color: COLORS.muted,
    fontSize: 12,
    fontWeight: "600",
  },

  forgotText: {
    color: COLORS.lime,
    fontSize: 12,
    fontWeight: "800",
  },

  /* LOGIN BUTTON */
  loginButton: {
    height: 59,
    backgroundColor: COLORS.lime,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },

  buttonContent: {
    flexDirection: "row",
    alignItems: "center",
  },

  loginButtonText: {
    color: "#000000",
    fontSize: 17,
    fontWeight: "900",
  },

  arrow: {
    color: "#000000",
    fontSize: 24,
    fontWeight: "900",
    marginLeft: 11,
  },

  /* DIVIDER */
  divider: {
    height: 1,
    backgroundColor: "#274333",
    marginVertical: 21,
  },

  /* REGISTER */
  registerText: {
    color: COLORS.muted,
    fontSize: 12,
    textAlign: "center",
  },

  registerHighlight: {
    color: COLORS.lime,
    fontWeight: "900",
  },

  /* GUEST */
  guestButton: {
    alignItems: "center",
    marginTop: 18,
  },

  guestText: {
    color: "#64736A",
    fontSize: 12,
    fontWeight: "700",
  },

  /* FOOTER */
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 25,
  },

  footerDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: COLORS.lime,
    marginRight: 8,
  },

  footerText: {
    color: "#425348",
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1.8,
  },
});