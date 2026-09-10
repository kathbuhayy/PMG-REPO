import React, { useState } from "react";
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

export default function ForgotPasswordScreen({
  navigation,
}) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const handleRequestOtp = async () => {
    if (!email) {
      Alert.alert(
        "Error",
        "Please enter your email address"
      );
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/password/request-otp`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Failed to send OTP"
        );
      }

      Alert.alert(
        "Success",
        "OTP code sent. Please check your email."
      );

      navigation.navigate("Otp", {
        fromForgotPassword: true,
        email,
      });
    } catch (err) {
      console.error(
        "[ForgotPassword] {RequestOtp}: " +
          err.message
      );

      Alert.alert("Error", err.message);
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
              Forgot{" "}
              <Text style={styles.titleAccent}>
                Password
              </Text>
            </Text>

            <Text style={styles.subtitle}>
              No worries. Enter your email address and
              we'll send you a verification code to
              reset your password.
            </Text>

            {/* EMAIL */}
            <Text style={styles.label}>
              Email Address
            </Text>

            <View style={styles.inputWrapper}>
              <Ionicons
                name="mail-outline"
                size={20}
                color={COLORS.limeDark}
                style={styles.inputIcon}
              />

              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder="customer@example.com"
                placeholderTextColor="#8F9993"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            {/* SEND OTP */}
            <TouchableOpacity
              style={styles.button}
              onPress={handleRequestOtp}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color="#000000" />
              ) : (
                <View style={styles.buttonContent}>
                  <Text style={styles.buttonText}>
                    Send Reset OTP
                  </Text>

                  <Text style={styles.arrow}>
                    →
                  </Text>
                </View>
              )}
            </TouchableOpacity>

            {/* DIVIDER */}
            <View style={styles.divider} />

            {/* RETURN TO LOGIN */}
            <TouchableOpacity
              onPress={() =>
                navigation.navigate("Login")
              }
            >
              <Text style={styles.loginText}>
                Remember your password?{" "}
                <Text style={styles.loginHighlight}>
                  Log in here
                </Text>
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
    fontSize: 34,
    fontWeight: "900",
    letterSpacing: -0.8,
  },

  titleAccent: {
    color: COLORS.lime,
  },

  subtitle: {
    color: COLORS.muted,
    fontSize: 14,
    lineHeight: 21,
    marginTop: 8,
    marginBottom: 24,
  },

  /* ICON */
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: "rgba(168, 255, 62, 0.08)",
    borderWidth: 1,
    borderColor: "#315232",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },

  /* INPUT */
  label: {
    color: COLORS.white,
    fontSize: 13,
    fontWeight: "800",
    marginBottom: 8,
  },

  inputWrapper: {
    height: 58,
    backgroundColor: COLORS.input,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    marginBottom: 23,
  },

  inputIcon: {
    marginRight: 11,
  },

  input: {
    flex: 1,
    color: COLORS.inputText,
    fontSize: 15,
  },

  /* BUTTON */
  button: {
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

  buttonText: {
    color: "#000000",
    fontSize: 15,
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

  /* LOGIN LINK */
  loginText: {
    color: COLORS.muted,
    fontSize: 12,
    textAlign: "center",
  },

  loginHighlight: {
    color: COLORS.lime,
    fontWeight: "900",
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