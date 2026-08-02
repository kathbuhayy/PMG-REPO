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

export default function ResetPasswordScreen({ route, navigation }) {
  const { email } = route.params || {};

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!email) {
      Alert.alert("Error", "Invalid session or email context missing");
      navigation.reset({
        index: 0,
        routes: [{ name: "Login" }],
      });
    }
  }, [email]);

  if (!email) return null;

  const criteria = {
    uppercase: /[A-Z]/.test(newPassword),
    number: /\d/.test(newPassword),
    special: /[^A-Za-z0-9]/.test(newPassword),
    length: newPassword.length >= 8 && newPassword.length <= 12,
  };

  const handleResetPassword = async () => {
    if (!newPassword || !confirmPassword) {
      Alert.alert("Error", "Please complete all fields");
      return;
    }

    const passOk =
      criteria.uppercase &&
      criteria.number &&
      criteria.special &&
      criteria.length;

    if (!passOk) {
      Alert.alert("Error", "Password does not meet requirements");
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert("Error", "Passwords do not match");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, newPassword }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Failed to reset password");
      }

      Alert.alert(
        "Success",
        "Password reset successfully! Please log in."
      );
      navigation.reset({
        index: 0,
        routes: [{ name: "Login" }],
      });
    } catch (err) {
      console.error("[ResetPassword] {Submit}: " + err.message);
      Alert.alert("Reset Failed", err.message);
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

          <Text style={styles.title}>Reset Password</Text>
          <Text style={styles.subtitle}>
            Create a strong new password for your account: {email}
          </Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>New Password</Text>
            <TextInput
              style={styles.input}
              value={newPassword}
              onChangeText={setNewPassword}
              placeholder="Enter new password"
              placeholderTextColor={COLORS.textMuted}
              secureTextEntry
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Confirm New Password</Text>
            <TextInput
              style={styles.input}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="Confirm new password"
              placeholderTextColor={COLORS.textMuted}
              secureTextEntry
            />
          </View>

          <View style={styles.criteriaBox}>
            <Text
              style={[
                styles.criteriaText,
                criteria.uppercase && styles.criteriaOk,
              ]}
            >
              • At least 1 uppercase letter
            </Text>
            <Text
              style={[
                styles.criteriaText,
                criteria.number && styles.criteriaOk,
              ]}
            >
              • At least 1 number
            </Text>
            <Text
              style={[
                styles.criteriaText,
                criteria.special && styles.criteriaOk,
              ]}
            >
              • At least 1 special character
            </Text>
            <Text
              style={[
                styles.criteriaText,
                criteria.length && styles.criteriaOk,
              ]}
            >
              • 8–12 characters
            </Text>
          </View>

          <TouchableOpacity
            style={styles.button}
            onPress={handleResetPassword}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={COLORS.textLight} />
            ) : (
              <Text style={styles.buttonText}>Reset Password</Text>
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
    padding: 20,
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
  },
  subtitle: {
    fontSize: 13,
    color: COLORS.textMuted,
    marginBottom: 20,
    lineHeight: 18,
  },
  inputGroup: {
    marginBottom: 12,
  },
  label: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.textPrimary,
    marginBottom: 6,
  },
  input: {
    backgroundColor: COLORS.lightBg,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    borderRadius: 8,
    padding: 10,
    color: COLORS.textPrimary,
    fontSize: 14,
  },
  criteriaBox: {
    padding: 10,
    backgroundColor: COLORS.lightBg,
    borderRadius: 8,
    marginVertical: 10,
  },
  criteriaText: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginBottom: 2,
  },
  criteriaOk: {
    color: COLORS.success,
    fontWeight: "600",
  },
  button: {
    backgroundColor: COLORS.accentCyan,
    borderRadius: 20,
    padding: 12,
    alignItems: "center",
    marginTop: 10,
  },
  buttonText: {
    color: COLORS.textLight,
    fontSize: 14,
    fontWeight: "800",
  },
});
