import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Alert,
  ScrollView,
  Image,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useIsFocused } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "../theme";
import { API_BASE_URL } from "../config";

export default function ProfileScreen({ navigation }) {
  const [user, setUser] = useState(null);
  const [avatarUrl, setAvatarUrl] = useState(null);
  const isFocused = useIsFocused();

  const GetLocalUser = async () => {
    try {
      const savedUser = await AsyncStorage.getItem("user");
      if (savedUser) {
        const parsed = JSON.parse(savedUser);
        setUser(parsed);
        fetchUserProfile(parsed.id);
      } else {
        setUser(null);
        setAvatarUrl(null);
      }
    } catch (err) {
      console.error("[GetLocalUser] {ReadStorage}: " + err.message);
    }
  };

  useEffect(() => {
    if (isFocused) {
      GetLocalUser();
    }
  }, [isFocused]);

  const fetchUserProfile = async (userId) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/user-profile/${userId}`);
      if (res.ok) {
        const data = await res.json();
        setAvatarUrl(data.avatar_url || null);
      }
    } catch (err) {
      console.error("[fetchUserProfile]: " + err.message);
    }
  };

  const PostLogout = async () => {
    try {
      await AsyncStorage.removeItem("user");
      setUser(null);
      Alert.alert("Logged Out", "You have been logged out successfully.");
      navigation.reset({
        index: 0,
        routes: [{ name: "Landing" }],
      });
    } catch (err) {
      console.error("[PostLogout] {ClearStorage}: " + err.message);
    }
  };

  if (!user) {
    return (
      <View style={styles.guestContainer}>
        <Ionicons
          name="person-circle-outline"
          size={72}
          color={COLORS.textMuted}
        />
        <Text style={styles.guestTitle}>Welcome to PrintHub Mobile</Text>
        <Text style={styles.guestSub}>
          Sign in to access your orders, inquiries, and custom profiles.
        </Text>

        <TouchableOpacity
          style={styles.loginBtn}
          onPress={() => navigation.navigate("Login")}
        >
          <Text style={styles.btnText}>Log In to Account</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.landingBtn}
          onPress={() => navigation.navigate("Landing")}
        >
          <Text style={styles.landingBtnText}>View Feature Highlights</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Header Badge */}
      <View style={styles.profileHeader}>
        {avatarUrl ? (
          <Image source={{ uri: avatarUrl }} style={{ width: 80, height: 80, borderRadius: 40, marginBottom: 12, borderWidth: 2, borderColor: COLORS.accentCyan }} />
        ) : (
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarInitial}>
              {user.firstName ? user.firstName[0].toUpperCase() : "U"}
            </Text>
          </View>
        )}
        <Text style={styles.userName}>{user.firstName}</Text>
        <Text style={styles.userEmail}>{user.email}</Text>
        <View style={styles.roleTag}>
          <Text style={styles.roleText}>{user.role || "Customer"}</Text>
        </View>
      </View>

      {/* Menu Options */}
      <View style={styles.menuSection}>
        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => navigation.navigate("EditProfile")}
        >
          <Ionicons
            name="person-outline"
            size={20}
            color={COLORS.accentCyan}
          />
          <Text style={styles.menuText}>Edit Profile</Text>
          <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => navigation.navigate("PasswordSecurity")}
        >
          <Ionicons
            name="lock-closed-outline"
            size={20}
            color={COLORS.danger}
          />
          <Text style={styles.menuText}>Passwords & Security</Text>
          <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => navigation.navigate("Main", { screen: "OrdersTab" })}
        >
          <Ionicons
            name="receipt-outline"
            size={20}
            color={COLORS.accentCyan}
          />
          <Text style={styles.menuText}>Order History & Status</Text>
          <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() =>
            navigation.navigate("Main", { screen: "InquiriesTab" })
          }
        >
          <Ionicons
            name="chatbubbles-outline"
            size={20}
            color={COLORS.accentGold}
          />
          <Text style={styles.menuText}>Custom Quotes & Inquiries</Text>
          <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.logoutBtn} onPress={PostLogout}>
        <Text style={styles.logoutText}>Log Out Account</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.lightBg,
    padding: 16,
  },
  guestContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
    backgroundColor: COLORS.lightBg,
  },
  guestTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: COLORS.textPrimary,
    marginTop: 12,
  },
  guestSub: {
    fontSize: 13,
    color: COLORS.textMuted,
    textAlign: "center",
    marginTop: 6,
    marginBottom: 20,
  },
  loginBtn: {
    backgroundColor: COLORS.accentCyan,
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 24,
    width: "100%",
    alignItems: "center",
    marginBottom: 10,
  },
  btnText: {
    color: COLORS.textLight,
    fontWeight: "800",
    fontSize: 14,
  },
  landingBtn: {
    backgroundColor: COLORS.cardBg,
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    width: "100%",
    alignItems: "center",
  },
  landingBtnText: {
    color: COLORS.textPrimary,
    fontWeight: "700",
    fontSize: 13,
  },
  profileHeader: {
    backgroundColor: COLORS.primaryDark,
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
    marginBottom: 20,
  },
  avatarCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: COLORS.accentCyan,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  avatarInitial: {
    color: COLORS.textLight,
    fontSize: 26,
    fontWeight: "800",
  },
  userName: {
    fontSize: 20,
    fontWeight: "800",
    color: COLORS.textLight,
  },
  userEmail: {
    fontSize: 13,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  roleTag: {
    backgroundColor: "rgba(6, 182, 212, 0.15)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    marginTop: 10,
  },
  roleText: {
    color: COLORS.accentCyan,
    fontSize: 11,
    fontWeight: "800",
  },
  menuSection: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    overflow: "hidden",
    marginBottom: 20,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  menuText: {
    flex: 1,
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.textPrimary,
    marginLeft: 12,
  },
  logoutBtn: {
    backgroundColor: "rgba(239, 68, 68, 0.1)",
    borderWidth: 1,
    borderColor: COLORS.danger,
    borderRadius: 24,
    paddingVertical: 14,
    alignItems: "center",
    marginBottom: 40,
  },
  logoutText: {
    color: COLORS.danger,
    fontWeight: "800",
    fontSize: 14,
  },
});
