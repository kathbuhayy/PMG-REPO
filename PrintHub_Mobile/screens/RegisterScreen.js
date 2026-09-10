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

export default function RegisterScreen({ navigation }) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("+639");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] =
    useState("");
  const [loading, setLoading] = useState(false);

  const criteria = {
    uppercase: /[A-Z]/.test(password),
    number: /\d/.test(password),
    special: /[^A-Za-z0-9]/.test(password),
    length:
      password.length >= 8 &&
      password.length <= 12,
  };

  const handleRegister = async () => {
    if (
      !firstName ||
      !lastName ||
      !email ||
      !password ||
      !confirmPassword
    ) {
      Alert.alert(
        "Error",
        "Please fill in all required fields"
      );
      return;
    }

    if (!/^\+639\d{9}$/.test(phone)) {
      Alert.alert(
        "Error",
        "Phone number must match format: +639 followed by 9 digits"
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
        "Password does not meet criteria requirements"
      );
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert(
        "Error",
        "Passwords do not match"
      );
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/register/send-otp`,
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
        "OTP code sent to your email!"
      );

      navigation.navigate("Otp", {
        fromRegister: true,
        email,
        regData: {
          firstName,
          lastName,
          email,
          phone,
          password,
        },
      });
    } catch (err) {
      console.error(
        "[Register] {SendOtp}: " + err.message
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
          Platform.OS === "ios" ? "padding" : "height"
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

          {/* CARD */}
          <View style={styles.card}>
            <Text style={styles.eyebrow}>
              CUSTOMER PORTAL
            </Text>

            <Text style={styles.title}>
              Create{" "}
              <Text style={styles.titleAccent}>
                Account
              </Text>
            </Text>

            <Text style={styles.subtitle}>
              Join us and start bringing your ideas to
              print.
            </Text>

            {/* FIRST / LAST NAME */}
            <View style={styles.nameRow}>
              <View style={styles.nameField}>
                <Text style={styles.label}>
                  First Name
                </Text>

                <View style={styles.inputWrapper}>
                  <Ionicons
                    name="person-outline"
                    size={19}
                    color={COLORS.limeDark}
                    style={styles.inputIcon}
                  />

                  <TextInput
                    style={styles.input}
                    value={firstName}
                    onChangeText={setFirstName}
                    placeholder="Juan"
                    placeholderTextColor="#8F9993"
                  />
                </View>
              </View>

              <View style={styles.nameField}>
                <Text style={styles.label}>
                  Last Name
                </Text>

                <View style={styles.inputWrapper}>
                  <Ionicons
                    name="person-outline"
                    size={19}
                    color={COLORS.limeDark}
                    style={styles.inputIcon}
                  />

                  <TextInput
                    style={styles.input}
                    value={lastName}
                    onChangeText={setLastName}
                    placeholder="Dela Cruz"
                    placeholderTextColor="#8F9993"
                  />
                </View>
              </View>
            </View>

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
                placeholder="juan@example.com"
                placeholderTextColor="#8F9993"
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            {/* PHONE */}
            <Text style={styles.label}>
              Phone Number
            </Text>

            <View style={styles.inputWrapper}>
              <Ionicons
                name="call-outline"
                size={20}
                color={COLORS.limeDark}
                style={styles.inputIcon}
              />

              <TextInput
                style={styles.input}
                value={phone}
                onChangeText={setPhone}
                placeholder="+639123456789"
                placeholderTextColor="#8F9993"
                keyboardType="phone-pad"
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
                value={password}
                onChangeText={setPassword}
                placeholder="Min 8 characters"
                placeholderTextColor="#8F9993"
                secureTextEntry
              />
            </View>

            {/* CONFIRM PASSWORD */}
            <Text style={styles.label}>
              Confirm Password
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
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="Re-enter password"
                placeholderTextColor="#8F9993"
                secureTextEntry
              />
            </View>

            {/* PASSWORD REQUIREMENTS */}
            <View style={styles.criteriaBox}>
              <Text style={styles.criteriaTitle}>
                Password Requirements
              </Text>

              <Text
                style={[
                  styles.criteriaText,
                  criteria.uppercase &&
                    styles.criteriaOk,
                ]}
              >
                • At least 1 uppercase letter
              </Text>

              <Text
                style={[
                  styles.criteriaText,
                  criteria.number &&
                    styles.criteriaOk,
                ]}
              >
                • At least 1 number
              </Text>

              <Text
                style={[
                  styles.criteriaText,
                  criteria.special &&
                    styles.criteriaOk,
                ]}
              >
                • At least 1 special character
              </Text>

              <Text
                style={[
                  styles.criteriaText,
                  criteria.length &&
                    styles.criteriaOk,
                ]}
              >
                • 8–12 characters
              </Text>
            </View>

            {/* OTP BUTTON */}
            <TouchableOpacity
              style={styles.button}
              onPress={handleRegister}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color="#000000" />
              ) : (
                <View style={styles.buttonContent}>
                  <Text style={styles.buttonText}>
                    Send Verification OTP
                  </Text>

                  <Text style={styles.arrow}>
                    →
                  </Text>
                </View>
              )}
            </TouchableOpacity>

            <View style={styles.divider} />

            <TouchableOpacity
              onPress={() =>
                navigation.navigate("Login")
              }
            >
              <Text style={styles.loginText}>
                Already have an account?{" "}
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
    paddingTop: 30,
    paddingBottom: 40,
  },

  logoContainer: {
    alignItems: "center",
    marginBottom: 25,
  },

  logo: {
    width: 175,
    height: 70,
  },

  card: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    borderTopColor: COLORS.lime,
    borderRadius: 28,
    padding: 24,

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
    fontSize: 33,
    fontWeight: "900",
  },

  titleAccent: {
    color: COLORS.lime,
  },

  subtitle: {
    color: COLORS.muted,
    fontSize: 13,
    lineHeight: 20,
    marginTop: 7,
    marginBottom: 23,
  },

  nameRow: {
    flexDirection: "row",
    gap: 10,
  },

  nameField: {
    flex: 1,
  },

  label: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: "800",
    marginBottom: 7,
  },

  inputWrapper: {
    height: 53,
    backgroundColor: COLORS.input,
    borderRadius: 13,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 13,
    marginBottom: 16,
  },

  inputIcon: {
    marginRight: 9,
  },

  input: {
    flex: 1,
    color: COLORS.inputText,
    fontSize: 13,
  },

  criteriaBox: {
    backgroundColor: "#10291C",
    borderWidth: 1,
    borderColor: "#2C4D36",
    borderRadius: 15,
    padding: 15,
    marginTop: 1,
    marginBottom: 20,
  },

  criteriaTitle: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: "800",
    marginBottom: 7,
  },

  criteriaText: {
    color: "#738078",
    fontSize: 11,
    lineHeight: 21,
  },

  criteriaOk: {
    color: COLORS.lime,
    fontWeight: "700",
  },

  button: {
    height: 58,
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
    fontSize: 14,
    fontWeight: "900",
  },

  arrow: {
    color: "#000000",
    fontSize: 23,
    fontWeight: "900",
    marginLeft: 10,
  },

  divider: {
    height: 1,
    backgroundColor: "#274333",
    marginVertical: 19,
  },

  loginText: {
    color: COLORS.muted,
    fontSize: 11,
    textAlign: "center",
  },

  loginHighlight: {
    color: COLORS.lime,
    fontWeight: "900",
  },

  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 24,
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