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
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "../theme";
import { API_BASE_URL } from "../config";

export default function PasswordSecurityScreen({ navigation }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");

  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false);

  const [otpModalOpen, setOtpModalOpen] = useState(false);
  const [otp, setOtp] = useState("");
  const [otpVerified, setOtpVerified] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const stored = await AsyncStorage.getItem("user");
        if (!stored) {
          navigation.goBack();
          return;
        }
        setUser(JSON.parse(stored));
      } catch (err) {
        Alert.alert("Error", "Failed to load user session");
      } finally {
        setLoading(false);
      }
    };
    loadUser();
  }, []);

  const criteria = {
    uppercase: /[A-Z]/.test(newPassword),
    number: /\d/.test(newPassword),
    special: /[^A-Za-z0-9]/.test(newPassword),
    length: newPassword.length >= 8 && newPassword.length <= 12,
  };

  const openOtpModal = async () => {
    if (!user?.email) return;
    setOtpLoading(true);
    setOtpModalOpen(true);
    setOtp("");
    
    try {
      const res = await fetch(`${API_BASE_URL}/api/password/request-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: user.email }),
      });
      const data = await res.json();
      if (!res.ok) {
        Alert.alert("Error", data.message || "Failed to send OTP");
        setOtpModalOpen(false);
        return;
      }
      Alert.alert("Success", "OTP sent. Please check your email.");
    } catch (err) {
      Alert.alert("Error", "Network error while requesting OTP");
      setOtpModalOpen(false);
    } finally {
      setOtpLoading(false);
    }
  };

  const verifyOtp = async () => {
    if (!otp || otp.length !== 6) {
      Alert.alert("Error", "Please enter the 6-digit OTP");
      return;
    }
    
    setOtpLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/password/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: user.email, otp }),
      });
      const data = await res.json();
      if (!res.ok) {
        Alert.alert("Error", data.message || "OTP verification failed");
        return;
      }
      setOtpVerified(true);
      setOtpModalOpen(false);
      setOtp("");
      Alert.alert("Success", "OTP verified. You can now change your password.");
    } catch (err) {
      Alert.alert("Error", "Network error");
    } finally {
      setOtpLoading(false);
    }
  };

  const handleChangePassword = async () => {
    if (!otpVerified) {
      Alert.alert("Error", "Please verify OTP first.");
      return;
    }
    if (!currentPassword || !newPassword || !confirmNewPassword) {
      Alert.alert("Error", "Please complete all fields.");
      return;
    }
    if (newPassword !== confirmNewPassword) {
      Alert.alert("Error", "New password and confirm password do not match.");
      return;
    }
    const passOk = criteria.uppercase && criteria.number && criteria.special && criteria.length;
    if (!passOk) {
      Alert.alert("Error", "Password must meet the requirements.");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/profile/${user.id}/password`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        Alert.alert("Error", data.message || "Failed to change password");
        return;
      }
      
      Alert.alert("Success", "Password changed successfully!", [
        { text: "OK", onPress: () => navigation.goBack() }
      ]);
    } catch (err) {
      Alert.alert("Error", "Network error");
    } finally {
      setSaving(false);
    }
  };

  if (loading || !user) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.accentCyan} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
      
      <View style={styles.card}>
        <Text style={styles.title}>Email Verification</Text>
        <Text style={styles.subtitle}>Email: {user.email}</Text>
        <TouchableOpacity style={styles.otpBtn} onPress={openOtpModal}>
          <Text style={styles.otpBtnText}>
            {otpVerified ? "OTP Verified ✅" : "Send OTP"}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>Current Password</Text>
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            secureTextEntry={!showCurrentPassword}
            value={currentPassword}
            onChangeText={setCurrentPassword}
            placeholder="Enter current password"
          />
          <TouchableOpacity onPress={() => setShowCurrentPassword(!showCurrentPassword)} style={styles.eyeBtn}>
            <Ionicons name={showCurrentPassword ? "eye-off" : "eye"} size={20} color={COLORS.textMuted} />
          </TouchableOpacity>
        </View>

        <Text style={styles.label}>New Password</Text>
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            secureTextEntry={!showNewPassword}
            value={newPassword}
            onChangeText={setNewPassword}
            placeholder="Create a new password"
          />
          <TouchableOpacity onPress={() => setShowNewPassword(!showNewPassword)} style={styles.eyeBtn}>
            <Ionicons name={showNewPassword ? "eye-off" : "eye"} size={20} color={COLORS.textMuted} />
          </TouchableOpacity>
        </View>

        <Text style={styles.label}>Confirm New Password</Text>
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            secureTextEntry={!showConfirmNewPassword}
            value={confirmNewPassword}
            onChangeText={setConfirmNewPassword}
            placeholder="Confirm new password"
          />
          <TouchableOpacity onPress={() => setShowConfirmNewPassword(!showConfirmNewPassword)} style={styles.eyeBtn}>
            <Ionicons name={showConfirmNewPassword ? "eye-off" : "eye"} size={20} color={COLORS.textMuted} />
          </TouchableOpacity>
        </View>

        <View style={styles.criteriaBox}>
          <Text style={[styles.criteriaText, criteria.uppercase && styles.criteriaOk]}>• At least 1 uppercase letter</Text>
          <Text style={[styles.criteriaText, criteria.number && styles.criteriaOk]}>• At least 1 number</Text>
          <Text style={[styles.criteriaText, criteria.special && styles.criteriaOk]}>• At least 1 special character</Text>
          <Text style={[styles.criteriaText, criteria.length && styles.criteriaOk]}>• 8–12 characters</Text>
        </View>

        <TouchableOpacity 
          style={[styles.saveBtn, (!otpVerified || saving) && { opacity: 0.5 }]} 
          onPress={handleChangePassword}
          disabled={!otpVerified || saving}
        >
          {saving ? (
            <ActivityIndicator color={COLORS.textLight} />
          ) : (
            <Text style={styles.saveBtnText}>Change Password</Text>
          )}
        </TouchableOpacity>
        {!otpVerified && (
          <Text style={styles.noteText}>You must verify OTP first to change password.</Text>
        )}
      </View>

      {/* OTP MODAL */}
      <Modal visible={otpModalOpen} transparent={true} animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Enter OTP</Text>
            <Text style={styles.modalSub}>Sent to {user.email}</Text>
            
            <TextInput
              style={styles.otpInput}
              keyboardType="number-pad"
              maxLength={6}
              value={otp}
              onChangeText={(text) => setOtp(text.replace(/\D/g, ""))}
              placeholder="000000"
            />
            
            {otpLoading ? (
              <ActivityIndicator style={{ marginVertical: 10 }} color={COLORS.accentCyan} />
            ) : (
              <TouchableOpacity style={styles.verifyBtn} onPress={verifyOtp}>
                <Text style={styles.verifyBtnText}>Verify OTP</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity style={styles.cancelBtn} onPress={() => setOtpModalOpen(false)}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.lightBg,
    padding: 16,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  card: {
    backgroundColor: COLORS.cardBg,
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: "800",
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.textMuted,
    marginBottom: 16,
  },
  otpBtn: {
    backgroundColor: COLORS.primaryDark,
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  otpBtnText: {
    color: COLORS.textLight,
    fontWeight: "700",
  },
  label: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.textPrimary,
    marginBottom: 6,
    marginTop: 12,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    borderRadius: 8,
    backgroundColor: COLORS.lightBg,
  },
  input: {
    flex: 1,
    padding: 12,
    fontSize: 15,
    color: COLORS.textPrimary,
  },
  eyeBtn: {
    padding: 12,
  },
  criteriaBox: {
    marginTop: 16,
    padding: 12,
    backgroundColor: COLORS.lightBg,
    borderRadius: 8,
  },
  criteriaText: {
    fontSize: 13,
    color: COLORS.textMuted,
    marginBottom: 4,
  },
  criteriaOk: {
    color: COLORS.success,
    fontWeight: "600",
  },
  saveBtn: {
    backgroundColor: COLORS.accentCyan,
    padding: 14,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 24,
  },
  saveBtnText: {
    color: COLORS.textLight,
    fontWeight: "700",
    fontSize: 16,
  },
  noteText: {
    fontSize: 12,
    color: COLORS.danger,
    marginTop: 12,
    textAlign: "center",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: COLORS.cardBg,
    width: "85%",
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: COLORS.textPrimary,
    marginBottom: 8,
  },
  modalSub: {
    fontSize: 14,
    color: COLORS.textMuted,
    marginBottom: 20,
  },
  otpInput: {
    width: "100%",
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    borderRadius: 8,
    padding: 14,
    fontSize: 20,
    textAlign: "center",
    letterSpacing: 4,
    marginBottom: 20,
  },
  verifyBtn: {
    backgroundColor: COLORS.accentCyan,
    width: "100%",
    padding: 14,
    borderRadius: 8,
    alignItems: "center",
    marginBottom: 12,
  },
  verifyBtnText: {
    color: COLORS.textLight,
    fontWeight: "700",
    fontSize: 16,
  },
  cancelBtn: {
    padding: 8,
  },
  cancelBtnText: {
    color: COLORS.textMuted,
    fontWeight: "600",
  }
});
