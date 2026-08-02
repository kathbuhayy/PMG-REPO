import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  FlatList,
  Alert,
  ActivityIndicator,
  Modal,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useIsFocused } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { API_BASE_URL } from "../config";
import { COLORS } from "../theme";

export default function InquiriesScreen({ navigation }) {
  const isFocused = useIsFocused();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("list"); // "list" or "new"
  const [inquiries, setInquiries] = useState([]);
  const [selectedInquiry, setSelectedInquiry] = useState(null);

  // Form fields
  const [subject, setSubject] = useState("");
  const [productTitle, setProductTitle] = useState("");
  const [quantity, setQuantity] = useState("");
  const [size, setSize] = useState("");
  const [material, setMaterial] = useState("");
  const [finishing, setFinishing] = useState("");
  const [color, setColor] = useState("");
  const [other, setOther] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const checkUserSession = async () => {
    try {
      const userStr = await AsyncStorage.getItem("user");
      if (userStr) {
        const parsed = JSON.parse(userStr);
        setUser(parsed);
        await fetchInquiries(parsed.id);
      } else {
        setUser(null);
        setInquiries([]);
      }
    } catch (err) {
      console.error("[CheckSession]: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchInquiries = async (userId) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/user/${userId}/inquiries`);
      const data = await res.json();
      if (res.ok) {
        setInquiries(data || []);
      }
    } catch (err) {
      console.error("[FetchInquiries]: " + err.message);
    }
  };

  useEffect(() => {
    if (isFocused) {
      setLoading(true);
      checkUserSession();
    }
  }, [isFocused]);

  const handleSubmit = async () => {
    if (!subject.trim()) {
      Alert.alert("Error", "Subject / Product Type is required");
      return;
    }

    setSubmitting(true);
    try {
      const fullName = (
        `${user.first_name || ""} ${user.last_name || ""}`
      ).trim();
      const payload = {
        userId: user.id,
        name: fullName || user.email,
        email: user.email,
        subject,
        product_title: productTitle || null,
        quantity: quantity || null,
        size: size || null,
        material: material || null,
        finishing: finishing || null,
        color: color || null,
        other: other || null,
      };

      const res = await fetch(`${API_BASE_URL}/api/inquiries`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Failed to submit inquiry");
      }

      Alert.alert("Success", "Your quote inquiry has been submitted!");
      setSubject("");
      setProductTitle("");
      setQuantity("");
      setSize("");
      setMaterial("");
      setFinishing("");
      setColor("");
      setOther("");
      await fetchInquiries(user.id);
      setActiveTab("list");
    } catch (err) {
      Alert.alert("Error", err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case "new":
        return COLORS.accentGold;
      case "quoted":
        return COLORS.accentCyan;
      case "converted":
        return COLORS.success;
      case "rejected":
        return COLORS.danger;
      default:
        return COLORS.textMuted;
    }
  };

  const renderInquiryItem = ({ item }) => {
    const dateStr = item.createdAt
      ? new Date(item.createdAt).toLocaleDateString()
      : "";
    return (
      <TouchableOpacity
        style={styles.inquiryCard}
        onPress={() => setSelectedInquiry(item)}
      >
        <View style={styles.cardHeader}>
          <Text style={styles.cardSubject}>{item.subject}</Text>
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: getStatusColor(item.status) + "22" },
            ]}
          >
            <Text
              style={[
                styles.statusText,
                { color: getStatusColor(item.status) },
              ]}
            >
              {item.status?.toUpperCase()}
            </Text>
          </View>
        </View>
        <Text style={styles.cardDate}>Submitted on: {dateStr}</Text>
        {item.quoted_price ? (
          <Text style={styles.cardPrice}>
            Quoted: ₱{Number(item.quoted_price).toLocaleString()}
          </Text>
        ) : (
          <Text style={styles.cardPending}>Awaiting Admin Quote</Text>
        )}
      </TouchableOpacity>
    );
  };

  const renderDetailModal = () => {
    if (!selectedInquiry) return null;
    const dateStr = new Date(selectedInquiry.createdAt).toLocaleDateString();
    return (
      <Modal
        visible={true}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setSelectedInquiry(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Inquiry Details</Text>
              <TouchableOpacity onPress={() => setSelectedInquiry(null)}>
                <Ionicons name="close" size={24} color={COLORS.textPrimary} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.modalScroll}>
              <View style={styles.specRow}>
                <Text style={styles.specLabel}>Status:</Text>
                <Text
                  style={[
                    styles.specVal,
                    {
                      color: getStatusColor(selectedInquiry.status),
                      fontWeight: "800",
                    },
                  ]}
                >
                  {selectedInquiry.status?.toUpperCase()}
                </Text>
              </View>

              <View style={styles.specRow}>
                <Text style={styles.specLabel}>Submitted:</Text>
                <Text style={styles.specVal}>{dateStr}</Text>
              </View>

              <View style={styles.specRow}>
                <Text style={styles.specLabel}>Subject:</Text>
                <Text style={styles.specVal}>{selectedInquiry.subject}</Text>
              </View>

              {selectedInquiry.product_title && (
                <View style={styles.specRow}>
                  <Text style={styles.specLabel}>Product Type:</Text>
                  <Text style={styles.specVal}>
                    {selectedInquiry.product_title}
                  </Text>
                </View>
              )}

              {selectedInquiry.quantity && (
                <View style={styles.specRow}>
                  <Text style={styles.specLabel}>Quantity:</Text>
                  <Text style={styles.specVal}>{selectedInquiry.quantity}</Text>
                </View>
              )}

              {selectedInquiry.size && (
                <View style={styles.specRow}>
                  <Text style={styles.specLabel}>Size:</Text>
                  <Text style={styles.specVal}>{selectedInquiry.size}</Text>
                </View>
              )}

              {selectedInquiry.material && (
                <View style={styles.specRow}>
                  <Text style={styles.specLabel}>Material:</Text>
                  <Text style={styles.specVal}>{selectedInquiry.material}</Text>
                </View>
              )}

              {selectedInquiry.finishing && (
                <View style={styles.specRow}>
                  <Text style={styles.specLabel}>Finishing:</Text>
                  <Text style={styles.specVal}>
                    {selectedInquiry.finishing}
                  </Text>
                </View>
              )}

              {selectedInquiry.color && (
                <View style={styles.specRow}>
                  <Text style={styles.specLabel}>Color:</Text>
                  <Text style={styles.specVal}>{selectedInquiry.color}</Text>
                </View>
              )}

              {selectedInquiry.other && (
                <View style={styles.specCol}>
                  <Text style={styles.specLabelCol}>Additional Details:</Text>
                  <Text style={styles.specValCol}>{selectedInquiry.other}</Text>
                </View>
              )}

              <View style={styles.divider} />

              <View style={styles.priceSection}>
                <Text style={styles.priceLabel}>Quoted Price Estimate:</Text>
                <Text style={styles.priceVal}>
                  {selectedInquiry.quoted_price
                    ? `₱${Number(
                        selectedInquiry.quoted_price
                      ).toLocaleString()}`
                    : "Awaiting Quote"}
                </Text>
              </View>

              {selectedInquiry.admin_notes && (
                <View style={styles.notesSection}>
                  <Text style={styles.notesLabel}>Admin Notes:</Text>
                  <Text style={styles.notesVal}>
                    {selectedInquiry.admin_notes}
                  </Text>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    );
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.accentCyan} />
      </View>
    );
  }

  if (!user) {
    return (
      <View style={styles.guestContainer}>
        <Ionicons
          name="chatbubbles-outline"
          size={64}
          color={COLORS.textMuted}
        />
        <Text style={styles.guestTitle}>Inquiries & Custom Quotes</Text>
        <Text style={styles.guestSubtitle}>
          Log in to request custom quotes, bulk printing rates, and view your
          submitted specifications.
        </Text>
        <TouchableOpacity
          style={styles.loginBtn}
          onPress={() => navigation.navigate("Login")}
        >
          <Text style={styles.loginBtnText}>Log In / Sign Up</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.tabHeader}>
        <TouchableOpacity
          style={[styles.tab, activeTab === "list" && styles.activeTab]}
          onPress={() => setActiveTab("list")}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === "list" && styles.activeTabText,
            ]}
          >
            My Requests ({inquiries.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === "new" && styles.activeTab]}
          onPress={() => setActiveTab("new")}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === "new" && styles.activeTabText,
            ]}
          >
            New Request
          </Text>
        </TouchableOpacity>
      </View>

      {activeTab === "list" ? (
        <FlatList
          data={inquiries}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderInquiryItem}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No inquiries submitted yet.</Text>
            </View>
          }
        />
      ) : (
        <ScrollView contentContainerStyle={styles.scrollForm}>
          <Text style={styles.formTitle}>Request a Custom Quote</Text>
          <Text style={styles.formSubtitle}>
            Specify your custom requirements below. Our admin team will review
            it and assign a quoted price.
          </Text>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Subject / Product Type *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Custom Corporate Tarpaulin"
              placeholderTextColor={COLORS.textMuted}
              value={subject}
              onChangeText={setSubject}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Specific Title (Optional)</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Christmas Event Banner"
              placeholderTextColor={COLORS.textMuted}
              value={productTitle}
              onChangeText={setProductTitle}
            />
          </View>

          <View style={styles.formRow}>
            <View style={[styles.formGroup, { flex: 1, marginRight: 8 }]}>
              <Text style={styles.label}>Quantity</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. 50 pcs"
                placeholderTextColor={COLORS.textMuted}
                value={quantity}
                onChangeText={setQuantity}
              />
            </View>
            <View style={[styles.formGroup, { flex: 1 }]}>
              <Text style={styles.label}>Size / Dimensions</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. 8ft x 4ft"
                placeholderTextColor={COLORS.textMuted}
                value={size}
                onChangeText={setSize}
              />
            </View>
          </View>

          <View style={styles.formRow}>
            <View style={[styles.formGroup, { flex: 1, marginRight: 8 }]}>
              <Text style={styles.label}>Material</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Glossy Tarpaulin"
                placeholderTextColor={COLORS.textMuted}
                value={material}
                onChangeText={setMaterial}
              />
            </View>
            <View style={[styles.formGroup, { flex: 1 }]}>
              <Text style={styles.label}>Finishing</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Eyelets on corners"
                placeholderTextColor={COLORS.textMuted}
                value={finishing}
                onChangeText={setFinishing}
              />
            </View>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Color Specifications</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Full Color CMYK"
              placeholderTextColor={COLORS.textMuted}
              value={color}
              onChangeText={setColor}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Additional Details</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Enter details or special instructions..."
              placeholderTextColor={COLORS.textMuted}
              multiline
              numberOfLines={4}
              value={other}
              onChangeText={setOther}
            />
          </View>

          <TouchableOpacity
            style={styles.submitBtn}
            onPress={handleSubmit}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color={COLORS.textLight} />
            ) : (
              <Text style={styles.submitBtnText}>Submit Quote Request</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      )}

      {renderDetailModal()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.lightBg,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.lightBg,
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
    marginTop: 16,
    marginBottom: 8,
  },
  guestSubtitle: {
    fontSize: 13,
    color: COLORS.textMuted,
    textAlign: "center",
    lineHeight: 18,
    marginBottom: 24,
  },
  loginBtn: {
    backgroundColor: COLORS.accentCyan,
    borderRadius: 24,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  loginBtnText: {
    color: COLORS.textLight,
    fontWeight: "800",
    fontSize: 14,
  },
  tabHeader: {
    flexDirection: "row",
    backgroundColor: COLORS.primaryDark,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  tab: {
    flex: 1,
    paddingVertical: 14,
    alignItems: "center",
  },
  activeTab: {
    borderBottomWidth: 3,
    borderBottomColor: COLORS.accentCyan,
  },
  tabText: {
    fontSize: 13,
    color: COLORS.textMuted,
    fontWeight: "700",
  },
  activeTabText: {
    color: COLORS.accentCyan,
  },
  listContent: {
    padding: 16,
  },
  emptyContainer: {
    padding: 24,
    alignItems: "center",
  },
  emptyText: {
    color: COLORS.textMuted,
    fontSize: 14,
  },
  inquiryCard: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    padding: 16,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  cardSubject: {
    flex: 1,
    fontSize: 15,
    fontWeight: "800",
    color: COLORS.textPrimary,
    marginRight: 10,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 10,
    fontWeight: "800",
  },
  cardDate: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 6,
  },
  cardPrice: {
    fontSize: 14,
    fontWeight: "800",
    color: COLORS.accentCyan,
    marginTop: 6,
  },
  cardPending: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.accentGold,
    marginTop: 6,
  },
  scrollForm: {
    padding: 16,
  },
  formTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  formSubtitle: {
    fontSize: 13,
    color: COLORS.textMuted,
    lineHeight: 18,
    marginBottom: 20,
  },
  formGroup: {
    marginBottom: 14,
  },
  formRow: {
    flexDirection: "row",
  },
  label: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.textPrimary,
    marginBottom: 6,
  },
  input: {
    backgroundColor: COLORS.cardBg,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    borderRadius: 8,
    padding: 10,
    color: COLORS.textPrimary,
    fontSize: 14,
  },
  textArea: {
    height: 90,
    textAlignVertical: "top",
  },
  submitBtn: {
    backgroundColor: COLORS.accentCyan,
    borderRadius: 24,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 10,
    marginBottom: 30,
  },
  submitBtnText: {
    color: COLORS.textLight,
    fontWeight: "800",
    fontSize: 14,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    padding: 20,
  },
  modalContent: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 20,
    padding: 20,
    maxHeight: "80%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
    paddingBottom: 12,
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: COLORS.textPrimary,
  },
  modalScroll: {
    paddingBottom: 10,
  },
  specRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.05)",
  },
  specLabel: {
    fontSize: 13,
    color: COLORS.textMuted,
    fontWeight: "600",
  },
  specVal: {
    fontSize: 13,
    color: COLORS.textPrimary,
    fontWeight: "600",
    textAlign: "right",
    flex: 1,
    marginLeft: 10,
  },
  specCol: {
    paddingVertical: 8,
  },
  specLabelCol: {
    fontSize: 13,
    color: COLORS.textMuted,
    fontWeight: "700",
    marginBottom: 4,
  },
  specValCol: {
    fontSize: 13,
    color: COLORS.textPrimary,
    lineHeight: 18,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.borderLight,
    marginVertical: 14,
  },
  priceSection: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  priceLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.textPrimary,
  },
  priceVal: {
    fontSize: 16,
    fontWeight: "900",
    color: COLORS.accentCyan,
  },
  notesSection: {
    backgroundColor: COLORS.lightBg,
    borderRadius: 8,
    padding: 10,
    marginTop: 14,
  },
  notesLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.accentGold,
    marginBottom: 4,
  },
  notesVal: {
    fontSize: 12,
    color: COLORS.textPrimary,
    lineHeight: 16,
  },
});
