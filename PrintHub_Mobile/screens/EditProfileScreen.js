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
  FlatList,
  Image,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "../theme";
import { API_BASE_URL } from "../config";
import { usePsgcAddress } from "../hooks/usePsgcAddress";

const SelectModal = ({ visible, title, data, onSelect, onClose }) => (
  <Modal visible={visible} animationType="slide" transparent={true}>
    <View style={styles.modalOverlay}>
      <View style={styles.modalContent}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>{title}</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Ionicons name="close" size={24} color={COLORS.textPrimary} />
          </TouchableOpacity>
        </View>
        <FlatList
          data={data}
          keyExtractor={(item) => String(item.code || item.name)}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.modalItem}
              onPress={() => {
                onSelect(item.name);
                onClose();
              }}
            >
              <Text style={styles.modalItemText}>{item.name}</Text>
            </TouchableOpacity>
          )}
        />
      </View>
    </View>
  </Modal>
);

export default function EditProfileScreen({ navigation }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    name: "",
    birthday: "",
    gender: "",
    phone: "+63",
    street: "",
    region: "",
    province: "",
    city: "",
    barangay: "",
    avatar_url: "",
  });

  const [avatarUploading, setAvatarUploading] = useState(false);

  const psgc = usePsgcAddress();

  const [activeModal, setActiveModal] = useState(null); // 'region', 'province', 'city', 'barangay', 'gender'

  useEffect(() => {
    const loadData = async () => {
      try {
        const stored = await AsyncStorage.getItem("user");
        if (!stored) {
          navigation.goBack();
          return;
        }
        const parsed = JSON.parse(stored);
        setUser(parsed);

        const res = await fetch(`${API_BASE_URL}/api/user-profile/${parsed.id}`);
        const data = await res.json();
        
        if (res.ok) {
          const loadedAddress = data.address || "";
          const parts = loadedAddress.split(",").map((s) => s.trim());
          let region = "", province = "", city = "", barangay = "", street = "";

          if (parts.length >= 4) {
            region = parts[parts.length - 1] || "";
            province = parts[parts.length - 2] || "";
            city = parts[parts.length - 3] || "";
            barangay = parts[parts.length - 4] || "";
            if (barangay.toLowerCase().startsWith("brgy.")) {
              barangay = barangay.substring(5).trim();
            }
            street = parts.slice(0, parts.length - 4).join(", ");
          } else {
            street = loadedAddress;
          }

          setForm({
            name: data.name || parsed.firstName || "",
            birthday: data.birthday || "",
            gender: data.gender || "",
            phone: data.phone || "+63",
            street: street || barangay,
            region,
            province,
            city,
            barangay,
            avatar_url: data.avatar_url || "",
          });

          if (region) {
            await psgc.loadSavedAddressSequentially(region, province, city, barangay);
          }
        }
      } catch (err) {
        Alert.alert("Error", "Failed to load profile data.");
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const validate = () => {
    const name = String(form.name || "").trim();
    const phone = String(form.phone || "").trim();
    if (!name) return "Name is required.";
    const nameParts = name.split(/\s+/);
    if (nameParts.length < 2) return "Please provide both first name and surname.";
    if (!/^[A-Za-z.\-\s]+$/.test(name)) return "Name must not contain numbers or special characters.";
    if (!/^\+63\d{10}$/.test(phone)) return "Phone number must be +63 followed by 10 digits.";
    if (form.birthday) {
      const year = new Date(form.birthday).getFullYear();
      if (year > 2011) return "Only users born in 2011 or earlier are allowed.";
    }
    if (!form.region || !form.province || !form.city || !form.barangay || !form.street) {
      return "All address fields are required.";
    }
    return "";
  };

  const handleSave = async () => {
    const errorMsg = validate();
    if (errorMsg) {
      Alert.alert("Validation Error", errorMsg);
      return;
    }

    setSaving(true);
    try {
      const addrParts = [
        form.street,
        form.barangay && `Brgy. ${form.barangay}`,
        form.city,
        form.province && form.province !== "N/A" ? form.province : "",
        form.region,
      ].filter(Boolean);
      const serializedAddress = addrParts.join(", ");

      const payload = {
        name: form.name,
        birthday: form.birthday,
        gender: form.gender,
        phone: form.phone,
        address: serializedAddress,
        avatar_url: form.avatar_url,
      };

      const res = await fetch(`${API_BASE_URL}/api/user-profile/${user.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to update profile");

      const firstName = form.name.split(" ")[0];
      const updatedUser = { ...user, firstName };
      await AsyncStorage.setItem("user", JSON.stringify(updatedUser));
      
      Alert.alert("Success", "Profile updated successfully!", [
        { text: "OK", onPress: () => navigation.goBack() }
      ]);
    } catch (err) {
      Alert.alert("Error", err.message);
    } finally {
      setSaving(false);
    }
  };

  const handlePickAvatar = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission Required", "Sorry, we need camera roll permissions to make this work!");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled) {
      await uploadAvatar(result.assets[0]);
    }
  };

  const uploadAvatar = async (asset) => {
    setAvatarUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", {
        uri: asset.uri,
        name: asset.fileName || "avatar.jpg",
        type: asset.mimeType || "image/jpeg",
      });

      const res = await fetch(`${API_BASE_URL}/api/user/avatar-upload`, {
        method: "POST",
        body: formData,
        headers: { 
          "x-user-id": String(user.id),
          "Content-Type": "multipart/form-data" 
        },
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Upload failed");

      setForm({ ...form, avatar_url: data.url });
    } catch (err) {
      Alert.alert("Error", err.message || "Failed to upload avatar");
    } finally {
      setAvatarUploading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.accentCyan} />
      </View>
    );
  }

  const genderOptions = [
    { name: "Female" },
    { name: "Male" },
    { name: "Prefer not to say" },
    { name: "Other" },
  ];

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
      
      <View style={[styles.card, { alignItems: 'center' }]}>
        <TouchableOpacity style={styles.avatarContainer} onPress={handlePickAvatar}>
          {form.avatar_url ? (
            <Image source={{ uri: form.avatar_url }} style={styles.avatarImage} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Ionicons name="person" size={40} color={COLORS.textMuted} />
            </View>
          )}
          {avatarUploading && (
            <View style={styles.avatarOverlay}>
              <ActivityIndicator color={COLORS.textLight} />
            </View>
          )}
          <View style={styles.editBadge}>
            <Ionicons name="camera" size={14} color={COLORS.textLight} />
          </View>
        </TouchableOpacity>
        <Text style={styles.avatarHint}>Tap to change profile picture</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>Full Name</Text>
        <TextInput
          style={styles.input}
          value={form.name}
          onChangeText={(text) => setForm({ ...form, name: text })}
          placeholder="Enter your full name"
        />

        <Text style={styles.label}>Birthday (YYYY-MM-DD)</Text>
        <TextInput
          style={styles.input}
          value={form.birthday}
          onChangeText={(text) => setForm({ ...form, birthday: text })}
          placeholder="2000-01-01"
        />

        <Text style={styles.label}>Gender</Text>
        <TouchableOpacity style={styles.selectBtn} onPress={() => setActiveModal("gender")}>
          <Text style={[styles.selectText, !form.gender && { color: COLORS.textMuted }]}>
            {form.gender || "Select Gender..."}
          </Text>
          <Ionicons name="chevron-down" size={20} color={COLORS.textMuted} />
        </TouchableOpacity>

        <Text style={styles.label}>Phone Number</Text>
        <TextInput
          style={styles.input}
          value={form.phone}
          onChangeText={(text) => {
            let val = text.replace(/[^0-9+]/g, "");
            if (!val.startsWith("+63")) val = "+63";
            if (val.length > 13) return;
            setForm({ ...form, phone: val });
          }}
          keyboardType="phone-pad"
        />

        <Text style={styles.label}>Region</Text>
        <TouchableOpacity style={styles.selectBtn} onPress={() => setActiveModal("region")}>
          <Text style={[styles.selectText, !form.region && { color: COLORS.textMuted }]}>
            {form.region || "Select Region..."}
          </Text>
          <Ionicons name="chevron-down" size={20} color={COLORS.textMuted} />
        </TouchableOpacity>

        <Text style={styles.label}>Province</Text>
        <TouchableOpacity 
          style={[styles.selectBtn, (!form.region || psgc.provinces.length === 0) && { opacity: 0.5 }]} 
          disabled={!form.region || psgc.provinces.length === 0}
          onPress={() => setActiveModal("province")}
        >
          <Text style={[styles.selectText, !form.province && { color: COLORS.textMuted }]}>
            {psgc.provinces.length === 0 ? "N/A (No provinces)" : (form.province || "Select Province...")}
          </Text>
          <Ionicons name="chevron-down" size={20} color={COLORS.textMuted} />
        </TouchableOpacity>

        <Text style={styles.label}>City / Municipality</Text>
        <TouchableOpacity 
          style={[styles.selectBtn, !form.region && { opacity: 0.5 }]} 
          disabled={!form.region}
          onPress={() => setActiveModal("city")}
        >
          <Text style={[styles.selectText, !form.city && { color: COLORS.textMuted }]}>
            {form.city || "Select City..."}
          </Text>
          <Ionicons name="chevron-down" size={20} color={COLORS.textMuted} />
        </TouchableOpacity>

        <Text style={styles.label}>Barangay</Text>
        <TouchableOpacity 
          style={[styles.selectBtn, !form.city && { opacity: 0.5 }]} 
          disabled={!form.city}
          onPress={() => setActiveModal("barangay")}
        >
          <Text style={[styles.selectText, !form.barangay && { color: COLORS.textMuted }]}>
            {form.barangay || "Select Barangay..."}
          </Text>
          <Ionicons name="chevron-down" size={20} color={COLORS.textMuted} />
        </TouchableOpacity>

        <Text style={styles.label}>Street Address</Text>
        <TextInput
          style={styles.input}
          value={form.street}
          onChangeText={(text) => setForm({ ...form, street: text })}
          placeholder="House No., Street name, etc."
        />

        <TouchableOpacity 
          style={[styles.saveBtn, saving && { opacity: 0.7 }]} 
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color={COLORS.textLight} />
          ) : (
            <Text style={styles.saveBtnText}>Save Changes</Text>
          )}
        </TouchableOpacity>
      </View>

      <SelectModal 
        visible={activeModal === "gender"} 
        title="Select Gender" 
        data={genderOptions}
        onClose={() => setActiveModal(null)}
        onSelect={(val) => setForm({ ...form, gender: val })}
      />
      
      <SelectModal 
        visible={activeModal === "region"} 
        title="Select Region" 
        data={psgc.regions}
        onClose={() => setActiveModal(null)}
        onSelect={(val) => psgc.handleRegionChange(val, (vals) => setForm({ ...form, ...vals }))}
      />

      <SelectModal 
        visible={activeModal === "province"} 
        title="Select Province" 
        data={psgc.provinces}
        onClose={() => setActiveModal(null)}
        onSelect={(val) => psgc.handleProvinceChange(val, (vals) => setForm({ ...form, ...vals }))}
      />

      <SelectModal 
        visible={activeModal === "city"} 
        title="Select City" 
        data={psgc.cities}
        onClose={() => setActiveModal(null)}
        onSelect={(val) => psgc.handleCityChange(val, (vals) => setForm({ ...form, ...vals }))}
      />

      <SelectModal 
        visible={activeModal === "barangay"} 
        title="Select Barangay" 
        data={psgc.barangays}
        onClose={() => setActiveModal(null)}
        onSelect={(val) => setForm({ ...form, barangay: val })}
      />

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
  },
  label: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.textPrimary,
    marginBottom: 6,
    marginTop: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    backgroundColor: COLORS.lightBg,
    color: COLORS.textPrimary,
  },
  selectBtn: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    borderRadius: 8,
    padding: 12,
    backgroundColor: COLORS.lightBg,
  },
  selectText: {
    fontSize: 15,
    color: COLORS.textPrimary,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: COLORS.cardBg,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    height: "60%",
    padding: 16,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
    paddingBottom: 12,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: COLORS.textPrimary,
  },
  closeBtn: {
    padding: 4,
  },
  modalItem: {
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  modalItemText: {
    fontSize: 16,
    color: COLORS.textPrimary,
  },
  avatarContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: COLORS.borderLight,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
    position: "relative",
  },
  avatarImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: COLORS.borderLight,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.5)",
    borderRadius: 50,
    justifyContent: "center",
    alignItems: "center",
  },
  editBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    backgroundColor: COLORS.accentCyan,
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: COLORS.cardBg,
  },
  avatarHint: {
    fontSize: 12,
    color: COLORS.textMuted,
  }
});
