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
} from "react-native";
import { API_BASE_URL } from "../config";
import { COLORS } from "../theme";

export default function OtpScreen({ route, navigation }) {
  const { email, fromRegister, fromForgotPassword, regData } =
    route.params || {};

  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!email) {
      Alert.alert("Error", "Session expired or invalid email");
      navigation.reset({
        index: 0,
        routes: [{ name: "Login" }],
      });
    }
  }, [email]);

  if (!email) return null;

  const handleVerify = async () => {
    if (!otp || otp.length !== 6) {
      Alert.alert("Error", "Please enter a valid 6-digit OTP code");
      return;
    }

    setLoading(true);
    try {
      if (fromRegister) {
        // Verify registration OTP
        const verifyRes = await fetch(
          `${API_BASE_URL}/api/register/verify-otp`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, otp }),
          }
        );

        const verifyData = await verifyRes.json();
        if (!verifyRes.ok) {
          throw new Error(verifyData.message || "OTP verification failed");
        }

        // Complete registration
        const registerRes = await fetch(
          `${API_BASE_URL}/api/register/complete`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(regData),
          }
        );

        const registerData = await registerRes.json();
        if (!registerRes.ok) {
          throw new Error(registerData.message || "Registration failed");
        }

        Alert.alert(
          "Success",
          "Account created successfully! Please log in."
        );
        navigation.reset({
          index: 0,
          routes: [{ name: "Login" }],
        });
      } else if (fromForgotPassword) {
        // Verify forgot password OTP
        const verifyRes = await fetch(
          `${API_BASE_URL}/api/password/verify-otp`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, otp }),
          }
        );

        const verifyData = await verifyRes.json();
        if (!verifyRes.ok) {
          throw new Error(verifyData.message || "OTP verification failed");
        }

        // Redirect to ResetPassword and reset stack
        navigation.reset({
          index: 0,
          routes: [{ name: "ResetPassword", params: { email } }],
        });
      }
    } catch (err) {
      console.error("[OtpScreen] {Verify}: " + err.message);
      Alert.alert("Verification Failed", err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    navigation.reset({
      index: 0,
      routes: [{ name: "Login" }],
    });
  };

  return (
    <KeyboardAvoidingView
      style={styles.keyboardContainer}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.card}>
          <TouchableOpacity style={styles.backBtn} onPress={handleBack}>
            <Text style={styles.backBtnText}>← Back to Login</Text>
          </TouchableOpacity>

          <Text style={styles.title}>Verify Identity</Text>
          <Text style={styles.subtitle}>
            Enter the 6-digit OTP code sent to your email: {email}
          </Text>

          <TextInput
            style={styles.otpInput}
            keyboardType="number-pad"
            maxLength={6}
            value={otp}
            onChangeText={(text) => setOtp(text.replace(/\D/g, ""))}
            placeholder="000000"
            placeholderTextColor={COLORS.textMuted}
          />

          <TouchableOpacity
            style={styles.button}
            onPress={handleVerify}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={COLORS.textLight} />
            ) : (
              <Text style={styles.buttonText}>Verify OTP Code</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  keyboardContainer: {
    flex: 1,
    backgroundColor: COLORS.primaryDark,
  },
  scrollContainer: {
    flexGrow: 1,
    backgroundColor: COLORS.primaryDark,
    justifyContent: "center",
    padding: 16,
  },
  card: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
    elevation: 4,
  },
  backBtn: {
    alignSelf: "flex-start",
    marginBottom: 16,
  },
  backBtnText: {
    color: COLORS.textMuted,
    fontWeight: "700",
    fontSize: 14,
  },
  title: {
    fontSize: 22,
    fontWeight: "900",
    color: COLORS.textPrimary,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 13,
    color: COLORS.textMuted,
    textAlign: "center",
    marginBottom: 24,
    lineHeight: 18,
  },
  otpInput: {
    width: "100%",
    backgroundColor: COLORS.lightBg,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    borderRadius: 8,
    padding: 12,
    fontSize: 22,
    textAlign: "center",
    letterSpacing: 8,
    color: COLORS.textPrimary,
    fontWeight: "700",
    marginBottom: 20,
  },
  button: {
    backgroundColor: COLORS.accentCyan,
    borderRadius: 20,
    width: "100%",
    padding: 12,
    alignItems: "center",
  },
  buttonText: {
    color: COLORS.textLight,
    fontSize: 14,
    fontWeight: "800",
  },
});
