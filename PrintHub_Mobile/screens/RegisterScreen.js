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
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { API_BASE_URL } from "../config";
import { COLORS } from "../theme";

export default function RegisterScreen({ navigation }) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("+639");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const criteria = {
    uppercase: /[A-Z]/.test(password),
    number: /\d/.test(password),
    special: /[^A-Za-z0-9]/.test(password),
    length: password.length >= 8 && password.length <= 12,
  };

  const handleRegister = async () => {
    if (!firstName || !lastName || !email || !password || !confirmPassword) {
      Alert.alert("Error", "Please fill in all required fields");
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
      Alert.alert("Error", "Password does not meet criteria requirements");
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert("Error", "Passwords do not match");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/register/send-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Failed to send OTP");
      }

      Alert.alert("Success", "OTP code sent to your email!");
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
      console.error("[Register] {SendOtp}: " + err.message);
      Alert.alert("Error", err.message);
    } finally {
      setLoading(false);
    }
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
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => navigation.goBack()}
          >
            <Ionicons
              name="arrow-back-outline"
              size={20}
              color={COLORS.textPrimary}
            />
            <Text style={styles.backText}>Back to Login</Text>
          </TouchableOpacity>

          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>
            Join PrintHub and start customizing designs in 3D
          </Text>

          <View style={styles.row}>
            <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
              <Text style={styles.label}>First Name</Text>
              <TextInput
                style={styles.input}
                value={firstName}
                onChangeText={setFirstName}
                placeholder="Juan"
                placeholderTextColor={COLORS.textMuted}
              />
            </View>
            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={styles.label}>Last Name</Text>
              <TextInput
                style={styles.input}
                value={lastName}
                onChangeText={setLastName}
                placeholder="Dela Cruz"
                placeholderTextColor={COLORS.textMuted}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email Address</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="juan@example.com"
              placeholderTextColor={COLORS.textMuted}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Phone (+639XXXXXXXXX)</Text>
            <TextInput
              style={styles.input}
              value={phone}
              onChangeText={setPhone}
              placeholder="+639123456789"
              placeholderTextColor={COLORS.textMuted}
              keyboardType="phone-pad"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Password</Text>
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              placeholder="Min 8 characters"
              placeholderTextColor={COLORS.textMuted}
              secureTextEntry
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Confirm Password</Text>
            <TextInput
              style={styles.input}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="Re-enter password"
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
            onPress={handleRegister}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={COLORS.textLight} />
            ) : (
              <Text style={styles.buttonText}>Send Verification OTP</Text>
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
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  backText: {
    color: COLORS.textPrimary,
    fontSize: 14,
    fontWeight: "700",
    marginLeft: 6,
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
  row: {
    flexDirection: "row",
    marginBottom: 4,
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
