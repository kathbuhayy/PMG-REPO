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
  Dimensions,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { SafeAreaView } from "react-native-safe-area-context";
import { useIsFocused } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { API_BASE_URL } from "../config";

const { width } = Dimensions.get("window");
const scale = Math.min(
  Math.max(width / 390, 0.85),
  1.15
);

const COLORS = {
  // PMG GREEN
  green: "#8FF000",
  greenDark: "#6CC700",
  greenSoft: "rgba(143, 240, 0, 0.12)",
  greenBorder: "rgba(143, 240, 0, 0.30)",

  // DARK SYSTEM
  background: "#070B09",
  background2: "#0A100D",
  card: "#111713",
  card2: "#151C18",
  card3: "#1A211D",

  // TEXT
  white: "#FFFFFF",
  text: "#FFFFFF",
  textSecondary: "#C2C8C4",
  muted: "#858D88",

  // BORDERS
  border: "#252D28",
  borderLight: "#303832",

  // OTHER
  black: "#050806",
  red: "#FF5C5C",
  redSoft: "rgba(255, 92, 92, 0.12)",
  gold: "#FFC107",
  goldSoft: "rgba(255, 193, 7, 0.12)",
};

export default function InquiriesScreen({ route, navigation }) {
  const isFocused = useIsFocused();

  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("list");
  const [inquiries, setInquiries] = useState([]);
  const [selectedInquiry, setSelectedInquiry] = useState(null);

  const [subject, setSubject] = useState("");
  const [productTitle, setProductTitle] = useState("");
  const [quantity, setQuantity] = useState("");
  const [size, setSize] = useState("");
  const [material, setMaterial] = useState("");
  const [finishing, setFinishing] = useState("");
  const [color, setColor] = useState("");
  const [other, setOther] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // =========================================================
  // USER
  // =========================================================

  const checkUserSession = async () => {
    try {
      const userStr = await AsyncStorage.getItem("user");

      if (userStr) {
        const parsed = JSON.parse(userStr);

        setUser(parsed);

        if (parsed.id) {
          await fetchInquiries(parsed.id);
        }
      } else {
        setUser(null);
        setInquiries([]);
      }
    } catch (err) {
      console.error("[CheckSession]:", err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchInquiries = async (userId) => {
    try {
      const res = await fetch(
        `${API_BASE_URL}/api/user/${userId}/inquiries`
      );

      const data = await res.json();

      if (res.ok) {
        setInquiries(Array.isArray(data) ? data : []);
      } else {
        console.error("[FetchInquiries]:", data);
      }
    } catch (err) {
      console.error("[FetchInquiries]:", err.message);
    }
  };

  useEffect(() => {
    if (isFocused) {
      setLoading(true);
      checkUserSession();
    }
  }, [isFocused]);

  // =========================================================
  // BULK INQUIRY PREFILL
  // =========================================================

  useEffect(() => {
    const bulkInquiry = route?.params?.bulkInquiry;

    if (!bulkInquiry) {
      return;
    }

    const customizations = bulkInquiry.customizations || {};
    const product = bulkInquiry.product || {};

    setSubject(product.name || "Bulk Order");
    setProductTitle(product.name || "");

    if (bulkInquiry.quantity) {
      setQuantity(`${bulkInquiry.quantity} pcs`);
    } else if (customizations.quantity) {
      setQuantity(customizations.quantity);
    }

    setSize(customizations.size || "");
    setMaterial(customizations.material || "");
    setFinishing(customizations.finishing || "");
    setColor(customizations.color || "");

    if (customizations.design) {
      const design = customizations.design;

      let designDetails = "3D Custom Design";

      if (design.prompt) {
        designDetails += `\nDesign Prompt: ${design.prompt}`;
      }

      setOther(designDetails);
    }

    setActiveTab("new");

    navigation.setParams({
      bulkInquiry: undefined,
    });
  }, [route?.params?.bulkInquiry, navigation]);

  // =========================================================
  // SUBMIT
  // =========================================================

  const handleSubmit = async () => {
    if (!subject.trim()) {
      Alert.alert(
        "Missing Information",
        "Please enter a subject or product type."
      );
      return;
    }

    if (!user?.id) {
      Alert.alert(
        "Login Required",
        "Please log in before submitting a quote request."
      );
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
        subject: subject.trim(),
        product_title: productTitle || null,
        quantity: quantity || null,
        size: size || null,
        material: material || null,
        finishing: finishing || null,
        color: color || null,
        other: other || null,
      };

      const res = await fetch(
        `${API_BASE_URL}/api/inquiries`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(
          data.message || "Failed to submit inquiry."
        );
      }

      Alert.alert(
        "Request Submitted",
        "Your quote inquiry has been submitted successfully."
      );

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
      Alert.alert(
        "Submission Failed",
        err.message || "Something went wrong."
      );
    } finally {
      setSubmitting(false);
    }
  };

  // =========================================================
  // STATUS
  // =========================================================

  const getStatusColor = (status) => {
    switch (String(status || "").toLowerCase()) {
      case "new":
        return COLORS.green;

      case "quoted":
        return COLORS.green;

      case "converted":
        return "#58D47B";

      case "rejected":
        return COLORS.red;

      default:
        return COLORS.muted;
    }
  };

  const getStatusBackground = (status) => {
    switch (String(status || "").toLowerCase()) {
      case "new":
      case "quoted":
        return COLORS.greenSoft;

      case "converted":
        return "rgba(88, 212, 123, 0.12)";

      case "rejected":
        return COLORS.redSoft;

      default:
        return "rgba(255,255,255,0.06)";
    }
  };

  // =========================================================
  // REQUEST CARD
  // =========================================================

  const renderInquiryItem = ({ item }) => {
    const dateStr = item.createdAt
      ? new Date(item.createdAt).toLocaleDateString()
      : "";

    const status = item.status || "New";
    const statusColor = getStatusColor(status);
    const statusBackground = getStatusBackground(status);

    return (
      <TouchableOpacity
        activeOpacity={0.9}
        style={styles.inquiryCard}
        onPress={() => setSelectedInquiry(item)}
      >
        <View style={styles.cardAccent} />

        <View style={styles.cardContent}>
          <View style={styles.cardTop}>
            <View style={styles.requestIcon}>
              <Ionicons
                name="document-text-outline"
                size={22}
                color={COLORS.green}
              />
            </View>

            <View style={styles.cardTitleArea}>
              <Text
                style={styles.cardSubject}
                numberOfLines={2}
              >
                {item.subject || "Quote Request"}
              </Text>

              <Text style={styles.cardDate}>
                Submitted {dateStr}
              </Text>
            </View>

            <View
              style={[
                styles.statusBadge,
                {
                  backgroundColor: statusBackground,
                },
              ]}
            >
              <View
                style={[
                  styles.statusDot,
                  {
                    backgroundColor: statusColor,
                  },
                ]}
              />

              <Text
                style={[
                  styles.statusText,
                  {
                    color: statusColor,
                  },
                ]}
              >
                {String(status).toUpperCase()}
              </Text>
            </View>
          </View>

          <View style={styles.cardDivider} />

          <View style={styles.cardBottom}>
            <View style={styles.quoteInfo}>
              <Text style={styles.quoteLabel}>
                QUOTE STATUS
              </Text>

              {item.quoted_price ? (
                <Text style={styles.cardPrice}>
                  ₱
                  {Number(
                    item.quoted_price
                  ).toLocaleString()}
                </Text>
              ) : (
                <View style={styles.awaitingRow}>
                  <Ionicons
                    name="time-outline"
                    size={15}
                    color={COLORS.green}
                  />

                  <Text style={styles.cardPending}>
                    Awaiting Admin Quote
                  </Text>
                </View>
              )}
            </View>

            <View style={styles.viewButton}>
              <Text style={styles.viewButtonText}>
                View
              </Text>

              <Ionicons
                name="chevron-forward"
                size={16}
                color={COLORS.black}
              />
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  // =========================================================
  // EMPTY
  // =========================================================

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIcon}>
        <Ionicons
          name="chatbubbles-outline"
          size={38}
          color={COLORS.black}
        />
      </View>

      <Text style={styles.emptyTitle}>
        No Quote Requests Yet
      </Text>

      <Text style={styles.emptyText}>
        Need a custom printing job or bulk order?
        Submit a request and our team will prepare
        a quote for you.
      </Text>

      <TouchableOpacity
        style={styles.emptyButton}
        onPress={() => setActiveTab("new")}
        activeOpacity={0.85}
      >
        <Ionicons
          name="add"
          size={20}
          color={COLORS.black}
        />

        <Text style={styles.emptyButtonText}>
          Create Quote Request
        </Text>
      </TouchableOpacity>
    </View>
  );

  // =========================================================
  // DETAIL MODAL
  // =========================================================

  const renderDetailModal = () => {
    if (!selectedInquiry) {
      return null;
    }

    const dateStr = selectedInquiry.createdAt
      ? new Date(
        selectedInquiry.createdAt
      ).toLocaleDateString()
      : "";

    const status =
      selectedInquiry.status || "New";

    const statusColor = getStatusColor(status);
    const statusBackground =
      getStatusBackground(status);

    return (
      <Modal
        visible={true}
        transparent
        animationType="slide"
        onRequestClose={() =>
          setSelectedInquiry(null)
        }
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHandle} />

            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalEyebrow}>
                  PMG PRINTING HOUSE
                </Text>

                <Text style={styles.modalTitle}>
                  Request Details
                </Text>
              </View>

              <TouchableOpacity
                style={styles.closeButton}
                onPress={() =>
                  setSelectedInquiry(null)
                }
              >
                <Ionicons
                  name="close"
                  size={22}
                  color={COLORS.white}
                />
              </TouchableOpacity>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={
                styles.modalScroll
              }
            >
              {/* STATUS */}
              <View
                style={[
                  styles.modalStatusCard,
                  {
                    backgroundColor:
                      statusBackground,
                    borderColor:
                      statusColor + "35",
                  },
                ]}
              >
                <View
                  style={[
                    styles.modalStatusIcon,
                    {
                      backgroundColor:
                        statusColor + "18",
                    },
                  ]}
                >
                  <Ionicons
                    name={
                      String(status).toLowerCase() ===
                        "rejected"
                        ? "close-circle-outline"
                        : String(
                          status
                        ).toLowerCase() ===
                          "converted"
                          ? "checkmark-circle-outline"
                          : "time-outline"
                    }
                    size={25}
                    color={statusColor}
                  />
                </View>

                <View style={styles.modalStatusInfo}>
                  <Text
                    style={styles.modalStatusLabel}
                  >
                    CURRENT STATUS
                  </Text>

                  <Text
                    style={[
                      styles.modalStatusValue,
                      {
                        color: statusColor,
                      },
                    ]}
                  >
                    {String(status).toUpperCase()}
                  </Text>
                </View>
              </View>

              {/* SUBJECT */}
              <View style={styles.modalSubjectBox}>
                <Text style={styles.modalSectionLabel}>
                  REQUEST
                </Text>

                <Text style={styles.modalSubject}>
                  {selectedInquiry.subject ||
                    "Quote Request"}
                </Text>

                <Text style={styles.modalDate}>
                  Submitted on {dateStr}
                </Text>
              </View>

              {/* SPECIFICATIONS */}
              <Text style={styles.sectionTitle}>
                Specifications
              </Text>

              <View style={styles.specContainer}>
                <SpecRow
                  icon="pricetag-outline"
                  label="Product Type"
                  value={
                    selectedInquiry.product_title
                  }
                />

                <SpecRow
                  icon="layers-outline"
                  label="Quantity"
                  value={
                    selectedInquiry.quantity
                  }
                />

                <SpecRow
                  icon="resize-outline"
                  label="Size / Dimensions"
                  value={selectedInquiry.size}
                />

                <SpecRow
                  icon="cube-outline"
                  label="Material"
                  value={
                    selectedInquiry.material
                  }
                />

                <SpecRow
                  icon="sparkles-outline"
                  label="Finishing"
                  value={
                    selectedInquiry.finishing
                  }
                />

                <SpecRow
                  icon="color-palette-outline"
                  label="Color"
                  value={selectedInquiry.color}
                  last
                />
              </View>

              {/* DETAILS */}
              {selectedInquiry.other ? (
                <>
                  <Text style={styles.sectionTitle}>
                    Additional Details
                  </Text>

                  <View style={styles.detailsBox}>
                    <Text style={styles.detailsText}>
                      {selectedInquiry.other}
                    </Text>
                  </View>
                </>
              ) : null}

              {/* PRICE */}
              <View style={styles.priceCard}>
                <View>
                  <Text style={styles.priceSmall}>
                    QUOTED PRICE
                  </Text>

                  <Text
                    style={styles.priceDescription}
                  >
                    Admin quote estimate
                  </Text>
                </View>

                <Text style={styles.priceValue}>
                  {selectedInquiry.quoted_price
                    ? `₱${Number(
                      selectedInquiry.quoted_price
                    ).toLocaleString()}`
                    : "Pending"}
                </Text>
              </View>

              {/* NOTES */}
              {selectedInquiry.admin_notes ? (
                <View style={styles.notesCard}>
                  <View style={styles.notesHeader}>
                    <Ionicons
                      name="information-circle-outline"
                      size={20}
                      color={COLORS.green}
                    />

                    <Text style={styles.notesTitle}>
                      Admin Notes
                    </Text>
                  </View>

                  <Text style={styles.notesText}>
                    {selectedInquiry.admin_notes}
                  </Text>
                </View>
              ) : null}

              <TouchableOpacity
                style={styles.modalDoneButton}
                onPress={() =>
                  setSelectedInquiry(null)
                }
              >
                <Text style={styles.modalDoneText}>
                  Done
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    );
  };

  // =========================================================
  // LOADING
  // =========================================================

  if (loading) {
    return (
      <View style={styles.center}>
        <View style={styles.loadingCircle}>
          <ActivityIndicator
            size="large"
            color={COLORS.green}
          />
        </View>

        <Text style={styles.loadingText}>
          Loading your requests...
        </Text>
      </View>
    );
  }

  // =========================================================
  // GUEST
  // =========================================================

  if (!user) {
    return (
      <View style={styles.guestContainer}>
        <View style={styles.guestIcon}>
          <Ionicons
            name="chatbubbles-outline"
            size={46}
            color={COLORS.black}
          />
        </View>

        <Text style={styles.guestTitle}>
          Custom Printing?
        </Text>

        <Text style={styles.guestSubtitle}>
          Request a custom quote, bulk printing
          rate, or special printing requirement
          directly from PMG Printing House.
        </Text>

        <TouchableOpacity
          style={styles.guestLoginButton}
          onPress={() =>
            navigation.navigate("Login")
          }
          activeOpacity={0.85}
        >
          <Text style={styles.guestLoginText}>
            Log In / Sign Up
          </Text>

          <Ionicons
            name="arrow-forward"
            size={19}
            color={COLORS.black}
          />
        </TouchableOpacity>
      </View>
    );
  }

  // =========================================================
  // MAIN
  // =========================================================

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={
        Platform.OS === "ios"
          ? "padding"
          : undefined
      }
    >
      {/* ==================================================
    HEADER
================================================== */}

      {/* ==================================================
    HEADER
================================================== */}

      <SafeAreaView
        style={styles.safeArea}
        edges={["top"]}
      >
        <View
          style={[
            styles.header,
            {
              minHeight: 68 * scale,
              paddingHorizontal: 18 * scale,
            },
          ]}
        >

          {/* BACK BUTTON */}

          <TouchableOpacity
            style={[
              styles.backButton,
              {
                width: 44 * scale,
                height: 44 * scale,
              },
            ]}
            onPress={() =>
              navigation.goBack()
            }
            activeOpacity={0.75}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <Ionicons
              name="arrow-back"
              size={26 * scale}
              color={COLORS.white}
            />
          </TouchableOpacity>


          {/* CENTERED TITLE */}

          <View
            style={styles.headerTitleContainer}
            pointerEvents="none"
          >
            <Text
              style={[
                styles.headerTitle,
                {
                  fontSize: 22 * scale,
                  lineHeight: 28 * scale,
                },
              ]}
              numberOfLines={1}
            >
              Custom Quotes
            </Text>
          </View>


          {/* INVISIBLE RIGHT SPACER */}

          <View
            style={[
              styles.headerRightSpacer,
              {
                width: 44 * scale,
                height: 44 * scale,
              },
            ]}
          />

        </View>
      </SafeAreaView>
      {/* TABS */}
      <View style={styles.tabWrapper}>
        <View style={styles.tabHeader}>
          <TouchableOpacity
            activeOpacity={0.8}
            style={[
              styles.tab,
              activeTab === "list" &&
              styles.activeTab,
            ]}
            onPress={() =>
              setActiveTab("list")
            }
          >
            <View style={styles.tabInner}>
              <Ionicons
                name="receipt-outline"
                size={18}
                color={
                  activeTab === "list"
                    ? COLORS.black
                    : COLORS.muted
                }
              />

              <Text
                style={[
                  styles.tabText,
                  activeTab === "list" &&
                  styles.activeTabText,
                ]}
              >
                My Requests
              </Text>

              <View
                style={[
                  styles.countBadge,
                  activeTab === "list" &&
                  styles.activeCountBadge,
                ]}
              >
                <Text
                  style={[
                    styles.countText,
                    activeTab === "list" &&
                    styles.activeCountText,
                  ]}
                >
                  {inquiries.length}
                </Text>
              </View>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.8}
            style={[
              styles.tab,
              activeTab === "new" &&
              styles.activeTab,
            ]}
            onPress={() =>
              setActiveTab("new")
            }
          >
            <View style={styles.tabInner}>
              <Ionicons
                name="add-circle-outline"
                size={18}
                color={
                  activeTab === "new"
                    ? COLORS.black
                    : COLORS.muted
                }
              />

              <Text
                style={[
                  styles.tabText,
                  activeTab === "new" &&
                  styles.activeTabText,
                ]}
              >
                New Request
              </Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>

      {/* REQUEST LIST */}
      {activeTab === "list" ? (
        <FlatList
          data={inquiries}
          keyExtractor={(item) =>
            String(item.id)
          }
          renderItem={renderInquiryItem}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={
            inquiries.length === 0
              ? styles.emptyListContent
              : styles.listContent
          }
          ListHeaderComponent={
            inquiries.length > 0 ? (
              <View style={styles.listIntro}>
                <View>
                  <Text style={styles.listTitle}>
                    My Requests
                  </Text>

                  <Text
                    style={styles.listSubtitle}
                  >
                    Track your custom quote requests
                  </Text>
                </View>

                <View style={styles.totalBadge}>
                  <Text
                    style={styles.totalBadgeText}
                  >
                    {inquiries.length}{" "}
                    {inquiries.length === 1
                      ? "Request"
                      : "Requests"}
                  </Text>
                </View>
              </View>
            ) : null
          }
          ListEmptyComponent={renderEmpty}
        />
      ) : (
        /* NEW REQUEST */
        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={
            styles.formScroll
          }
        >
          {/* FORM HERO */}
          <View style={styles.formHero}>
            <View style={styles.formHeroIcon}>
              <Ionicons
                name="create-outline"
                size={25}
                color={COLORS.black}
              />
            </View>

            <View style={styles.formHeroText}>
              <Text style={styles.formTitle}>
                Request a Custom Quote
              </Text>

              <Text style={styles.formSubtitle}>
                Tell us what you need and our admin
                team will prepare a quote for your
                project.
              </Text>
            </View>
          </View>

          {/* SECTION 1 */}
          <View style={styles.formSection}>
            <View style={styles.formSectionHeader}>
              <View style={styles.sectionNumber}>
                <Text
                  style={styles.sectionNumberText}
                >
                  1
                </Text>
              </View>

              <View>
                <Text
                  style={styles.formSectionTitle}
                >
                  Product Information
                </Text>

                <Text
                  style={styles.formSectionSubtitle}
                >
                  Tell us what you want to print.
                </Text>
              </View>
            </View>

            <FormInput
              label="Subject / Product Type *"
              icon="document-text-outline"
              placeholder="e.g. Custom Corporate Tarpaulin"
              value={subject}
              onChangeText={setSubject}
            />

            <FormInput
              label="Specific Title (Optional)"
              icon="text-outline"
              placeholder="e.g. Christmas Event Banner"
              value={productTitle}
              onChangeText={setProductTitle}
            />
          </View>

          {/* SECTION 2 */}
          <View style={styles.formSection}>
            <View style={styles.formSectionHeader}>
              <View style={styles.sectionNumber}>
                <Text
                  style={styles.sectionNumberText}
                >
                  2
                </Text>
              </View>

              <View>
                <Text
                  style={styles.formSectionTitle}
                >
                  Order Specifications
                </Text>

                <Text
                  style={styles.formSectionSubtitle}
                >
                  Provide quantity and dimensions.
                </Text>
              </View>
            </View>

            <View style={styles.formRow}>
              <View style={styles.formHalfLeft}>
                <FormInput
                  label="Quantity"
                  icon="layers-outline"
                  placeholder="e.g. 50 pcs"
                  value={quantity}
                  onChangeText={setQuantity}
                />
              </View>

              <View style={styles.formHalfRight}>
                <FormInput
                  label="Size / Dimensions"
                  icon="resize-outline"
                  placeholder="e.g. 8ft x 4ft"
                  value={size}
                  onChangeText={setSize}
                />
              </View>
            </View>
          </View>

          {/* SECTION 3 */}
          <View style={styles.formSection}>
            <View style={styles.formSectionHeader}>
              <View style={styles.sectionNumber}>
                <Text
                  style={styles.sectionNumberText}
                >
                  3
                </Text>
              </View>

              <View>
                <Text
                  style={styles.formSectionTitle}
                >
                  Print Specifications
                </Text>

                <Text
                  style={styles.formSectionSubtitle}
                >
                  Add material and finishing details.
                </Text>
              </View>
            </View>

            <View style={styles.formRow}>
              <View style={styles.formHalfLeft}>
                <FormInput
                  label="Material"
                  icon="cube-outline"
                  placeholder="e.g. Glossy"
                  value={material}
                  onChangeText={setMaterial}
                />
              </View>

              <View style={styles.formHalfRight}>
                <FormInput
                  label="Finishing"
                  icon="sparkles-outline"
                  placeholder="e.g. Eyelets"
                  value={finishing}
                  onChangeText={setFinishing}
                />
              </View>
            </View>

            <FormInput
              label="Color Specifications"
              icon="color-palette-outline"
              placeholder="e.g. Full Color CMYK"
              value={color}
              onChangeText={setColor}
            />
          </View>

          {/* SECTION 4 */}
          <View style={styles.formSection}>
            <View style={styles.formSectionHeader}>
              <View style={styles.sectionNumber}>
                <Text
                  style={styles.sectionNumberText}
                >
                  4
                </Text>
              </View>

              <View>
                <Text
                  style={styles.formSectionTitle}
                >
                  Additional Details
                </Text>

                <Text
                  style={styles.formSectionSubtitle}
                >
                  Include special instructions or
                  design requirements.
                </Text>
              </View>
            </View>

            <View style={styles.formGroup}>
              <View
                style={[
                  styles.inputWrapper,
                  styles.textAreaWrapper,
                ]}
              >
                <Ionicons
                  name="chatbox-ellipses-outline"
                  size={19}
                  color={COLORS.green}
                  style={styles.textAreaIcon}
                />

                <TextInput
                  style={[
                    styles.input,
                    styles.textArea,
                  ]}
                  placeholder="Enter details or special instructions..."
                  placeholderTextColor={
                    COLORS.muted
                  }
                  multiline
                  numberOfLines={5}
                  textAlignVertical="top"
                  value={other}
                  onChangeText={setOther}
                />
              </View>
            </View>
          </View>

          {/* SUBMIT */}
          <View style={styles.submitSection}>
            <View style={styles.submitInfo}>
              <Ionicons
                name="shield-checkmark-outline"
                size={19}
                color={COLORS.green}
              />

              <Text style={styles.submitInfoText}>
                Your request will be reviewed by
                the PMG admin team.
              </Text>
            </View>

            <TouchableOpacity
              activeOpacity={0.85}
              style={[
                styles.submitBtn,
                submitting &&
                styles.submitBtnDisabled,
              ]}
              onPress={handleSubmit}
              disabled={submitting}
            >
              {submitting ? (
                <>
                  <ActivityIndicator
                    color={COLORS.black}
                  />

                  <Text
                    style={styles.submitBtnText}
                  >
                    Submitting...
                  </Text>
                </>
              ) : (
                <>
                  <Text
                    style={styles.submitBtnText}
                  >
                    Submit Quote Request
                  </Text>

                  <Ionicons
                    name="arrow-forward"
                    size={20}
                    color={COLORS.black}
                  />
                </>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}

      {renderDetailModal()}
    </KeyboardAvoidingView>
  );
}

// ===========================================================
// FORM INPUT COMPONENT
// ===========================================================

function FormInput({
  label,
  icon,
  placeholder,
  value,
  onChangeText,
}) {
  return (
    <View style={styles.formGroup}>
      <Text style={styles.label}>{label}</Text>

      <View style={styles.inputWrapper}>
        <Ionicons
          name={icon}
          size={19}
          color={COLORS.green}
          style={styles.inputIcon}
        />

        <TextInput
          style={styles.input}
          placeholder={placeholder}
          placeholderTextColor={COLORS.muted}
          value={value}
          onChangeText={onChangeText}
        />
      </View>
    </View>
  );
}

// ===========================================================
// SPEC ROW COMPONENT
// ===========================================================

function SpecRow({
  icon,
  label,
  value,
  last = false,
}) {
  return (
    <View
      style={[
        styles.specRow,
        last && {
          borderBottomWidth: 0,
        },
      ]}
    >
      <View style={styles.specIcon}>
        <Ionicons
          name={icon}
          size={18}
          color={COLORS.green}
        />
      </View>

      <Text style={styles.specLabel}>
        {label}
      </Text>

      <Text style={styles.specVal}>
        {value || "—"}
      </Text>
    </View>
  );
}

// ===========================================================
// STYLES
// ===========================================================

const styles = StyleSheet.create({
  // =========================================================
  // GENERAL
  // =========================================================

  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  center: {
    flex: 1,
    backgroundColor: COLORS.background,
    justifyContent: "center",
    alignItems: "center",
  },

  loadingCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.greenBorder,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 14,
  },

  loadingText: {
    color: COLORS.textSecondary,
    fontSize: 13,
    fontWeight: "600",
  },

  // =========================================================
  // GUEST
  // =========================================================

  guestContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 30,
  },

  guestIcon: {
    width: 86,
    height: 86,
    borderRadius: 28,
    backgroundColor: COLORS.green,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },

  guestTitle: {
    color: COLORS.white,
    fontSize: 25,
    fontWeight: "900",
    textAlign: "center",
  },

  guestSubtitle: {
    color: COLORS.muted,
    fontSize: 14,
    lineHeight: 21,
    textAlign: "center",
    marginTop: 9,
    marginBottom: 28,
  },

  guestLoginButton: {
    width: "100%",
    minHeight: 54,
    borderRadius: 17,
    backgroundColor: COLORS.green,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },

  guestLoginText: {
    color: COLORS.black,
    fontSize: 15,
    fontWeight: "900",
  },

  // =========================================================
  // HEADER
  // =========================================================

  header: {
    width: "100%",
    minHeight: 68,

    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",

    backgroundColor: COLORS.black,

    paddingHorizontal: 18,

    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },

  backButton: {
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 999,
  },

  headerTitleContainer: {
    position: "absolute",

    left: 0,
    right: 0,
    top: 0,
    bottom: 0,

    alignItems: "center",
    justifyContent: "center",

    paddingHorizontal: 60,

    zIndex: 10,
  },

  headerTitle: {
    color: COLORS.white,

    fontSize: 22,
    lineHeight: 28,

    fontWeight: "900",

    textAlign: "center",

    includeFontPadding: false,
  },

  headerRightSpacer: {
    opacity: 0,
  },

  // =========================================================
  // TABS
  // =========================================================

  tabWrapper: {
    paddingHorizontal: 16,
    paddingTop: 14,
    backgroundColor: COLORS.background,
  },

  tabHeader: {
    backgroundColor: COLORS.card,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: COLORS.border,
    flexDirection: "row",
    padding: 4,
  },

  tab: {
    flex: 1,
    minHeight: 50,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },

  activeTab: {
    backgroundColor: COLORS.green,
  },

  tabInner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
  },

  tabText: {
    color: COLORS.muted,
    fontSize: 13,
    fontWeight: "800",
  },

  activeTabText: {
    color: COLORS.black,
    fontWeight: "900",
  },

  countBadge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: COLORS.card3,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 5,
  },

  activeCountBadge: {
    backgroundColor: COLORS.black,
  },

  countText: {
    color: COLORS.muted,
    fontSize: 10,
    fontWeight: "900",
  },

  activeCountText: {
    color: COLORS.green,
  },

  // =========================================================
  // LIST
  // =========================================================

  listContent: {
    padding: 16,
    paddingTop: 15,
    paddingBottom: 40,
  },

  emptyListContent: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 24,
  },

  listIntro: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },

  listTitle: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: "900",
  },

  listSubtitle: {
    color: COLORS.muted,
    fontSize: 11,
    marginTop: 3,
  },

  totalBadge: {
    backgroundColor: COLORS.greenSoft,
    borderWidth: 1,
    borderColor: COLORS.greenBorder,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },

  totalBadgeText: {
    color: COLORS.green,
    fontSize: 10,
    fontWeight: "900",
  },

  // =========================================================
  // REQUEST CARD
  // =========================================================

  inquiryCard: {
    backgroundColor: COLORS.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 13,
    overflow: "hidden",
  },

  cardAccent: {
    height: 4,
    backgroundColor: COLORS.green,
  },

  cardContent: {
    padding: 16,
  },

  cardTop: {
    flexDirection: "row",
    alignItems: "flex-start",
  },

  requestIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: COLORS.greenSoft,
    borderWidth: 1,
    borderColor: COLORS.greenBorder,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 11,
  },

  cardTitleArea: {
    flex: 1,
    paddingRight: 7,
  },

  cardSubject: {
    color: COLORS.white,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: "900",
  },

  cardDate: {
    color: COLORS.muted,
    fontSize: 10,
    marginTop: 5,
    fontWeight: "600",
  },

  statusBadge: {
    minHeight: 27,
    borderRadius: 9,
    paddingHorizontal: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderWidth: 1,
    borderColor: COLORS.greenBorder,
  },

  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },

  statusText: {
    fontSize: 8,
    fontWeight: "900",
    letterSpacing: 0.4,
  },

  cardDivider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: 14,
  },

  cardBottom: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  quoteInfo: {
    flex: 1,
  },

  quoteLabel: {
    color: COLORS.muted,
    fontSize: 8,
    fontWeight: "900",
    letterSpacing: 0.8,
    marginBottom: 3,
  },

  cardPrice: {
    color: COLORS.white,
    fontSize: 19,
    fontWeight: "900",
  },

  awaitingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },

  cardPending: {
    color: COLORS.green,
    fontSize: 11,
    fontWeight: "800",
  },

  viewButton: {
    backgroundColor: COLORS.green,
    borderRadius: 12,
    minHeight: 36,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },

  viewButtonText: {
    color: COLORS.black,
    fontSize: 10,
    fontWeight: "900",
  },

  // =========================================================
  // EMPTY
  // =========================================================

  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 15,
  },

  emptyIcon: {
    width: 82,
    height: 82,
    borderRadius: 28,
    backgroundColor: COLORS.green,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 18,
  },

  emptyTitle: {
    color: COLORS.white,
    fontSize: 20,
    fontWeight: "900",
    textAlign: "center",
  },

  emptyText: {
    color: COLORS.muted,
    fontSize: 13,
    lineHeight: 20,
    textAlign: "center",
    marginTop: 7,
    marginBottom: 22,
  },

  emptyButton: {
    backgroundColor: COLORS.green,
    minHeight: 48,
    borderRadius: 15,
    paddingHorizontal: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
  },

  emptyButtonText: {
    color: COLORS.black,
    fontSize: 12,
    fontWeight: "900",
  },

  // =========================================================
  // FORM
  // =========================================================

  formScroll: {
    padding: 16,
    paddingBottom: 45,
  },

  formHero: {
    backgroundColor: COLORS.green,
    borderRadius: 20,
    padding: 17,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 15,
  },

  formHeroIcon: {
    width: 48,
    height: 48,
    borderRadius: 15,
    backgroundColor: COLORS.black,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },

  formHeroText: {
    flex: 1,
  },

  formTitle: {
    color: COLORS.black,
    fontSize: 17,
    fontWeight: "900",
  },

  formSubtitle: {
    color: "#344900",
    fontSize: 11,
    lineHeight: 17,
    marginTop: 4,
  },

  formSection: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 20,
    padding: 16,
    marginBottom: 14,
  },

  formSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 17,
  },

  sectionNumber: {
    width: 34,
    height: 34,
    borderRadius: 11,
    backgroundColor: COLORS.green,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },

  sectionNumberText: {
    color: COLORS.black,
    fontSize: 13,
    fontWeight: "900",
  },

  formSectionTitle: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: "900",
  },

  formSectionSubtitle: {
    color: COLORS.muted,
    fontSize: 10,
    marginTop: 2,
  },

  formGroup: {
    marginBottom: 14,
  },

  formRow: {
    flexDirection: "row",
  },

  formHalfLeft: {
    flex: 1,
    marginRight: 6,
  },

  formHalfRight: {
    flex: 1,
    marginLeft: 6,
  },

  label: {
    color: COLORS.textSecondary,
    fontSize: 11,
    fontWeight: "900",
    marginBottom: 7,
  },

  inputWrapper: {
    minHeight: 48,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    backgroundColor: COLORS.card2,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
  },

  inputIcon: {
    marginRight: 8,
  },

  input: {
    flex: 1,
    color: COLORS.white,
    fontSize: 12,
    fontWeight: "600",
    paddingVertical: 10,
  },

  textAreaWrapper: {
    minHeight: 115,
    alignItems: "flex-start",
    paddingTop: 12,
  },

  textAreaIcon: {
    marginRight: 8,
    marginTop: 2,
  },

  textArea: {
    minHeight: 90,
    paddingTop: 0,
  },

  // =========================================================
  // SUBMIT
  // =========================================================

  submitSection: {
    marginTop: 2,
  },

  submitInfo: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.greenSoft,
    borderWidth: 1,
    borderColor: COLORS.greenBorder,
    borderRadius: 13,
    padding: 11,
    marginBottom: 11,
  },

  submitInfoText: {
    flex: 1,
    color: "#A8C27C",
    fontSize: 10,
    lineHeight: 15,
    fontWeight: "600",
    marginLeft: 7,
  },

  submitBtn: {
    minHeight: 55,
    borderRadius: 17,
    backgroundColor: COLORS.green,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
  },

  submitBtnDisabled: {
    opacity: 0.6,
  },

  submitBtnText: {
    color: COLORS.black,
    fontSize: 14,
    fontWeight: "900",
  },

  // =========================================================
  // MODAL
  // =========================================================

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.78)",
    justifyContent: "flex-end",
  },

  modalContent: {
    backgroundColor: COLORS.background2,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: "92%",
    paddingTop: 5,
    borderTopWidth: 1,
    borderColor: COLORS.border,
  },

  modalHandle: {
    width: 42,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.borderLight,
    alignSelf: "center",
    marginTop: 7,
  },

  modalHeader: {
    paddingHorizontal: 20,
    paddingTop: 15,
    paddingBottom: 13,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  modalEyebrow: {
    color: COLORS.green,
    fontSize: 8,
    fontWeight: "900",
    letterSpacing: 1.3,
    marginBottom: 3,
  },

  modalTitle: {
    color: COLORS.white,
    fontSize: 21,
    fontWeight: "900",
  },

  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 13,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: "center",
    justifyContent: "center",
  },

  modalScroll: {
    paddingHorizontal: 20,
    paddingBottom: 35,
  },

  modalStatusCard: {
    borderRadius: 16,
    padding: 13,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    borderWidth: 1,
  },

  modalStatusIcon: {
    width: 43,
    height: 43,
    borderRadius: 13,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 11,
  },

  modalStatusInfo: {
    flex: 1,
  },

  modalStatusLabel: {
    color: COLORS.muted,
    fontSize: 8,
    fontWeight: "900",
    letterSpacing: 0.8,
    marginBottom: 3,
  },

  modalStatusValue: {
    fontSize: 14,
    fontWeight: "900",
  },

  modalSubjectBox: {
    backgroundColor: COLORS.card,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 15,
    marginBottom: 17,
  },

  modalSectionLabel: {
    color: COLORS.green,
    fontSize: 8,
    fontWeight: "900",
    letterSpacing: 0.8,
    marginBottom: 5,
  },

  modalSubject: {
    color: COLORS.white,
    fontSize: 17,
    lineHeight: 22,
    fontWeight: "900",
  },

  modalDate: {
    color: COLORS.muted,
    fontSize: 10,
    marginTop: 5,
  },

  sectionTitle: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: "900",
    marginBottom: 9,
  },

  specContainer: {
    backgroundColor: COLORS.card,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: "hidden",
    marginBottom: 17,
  },

  specRow: {
    minHeight: 55,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },

  specIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: COLORS.greenSoft,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 9,
  },

  specLabel: {
    color: COLORS.muted,
    fontSize: 10,
    fontWeight: "700",
    flex: 0.9,
  },

  specVal: {
    color: COLORS.white,
    fontSize: 11,
    fontWeight: "800",
    textAlign: "right",
    flex: 1.1,
  },

  detailsBox: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 14,
    marginBottom: 17,
  },

  detailsText: {
    color: COLORS.textSecondary,
    fontSize: 12,
    lineHeight: 19,
  },

  // =========================================================
  // PRICE
  // =========================================================

  priceCard: {
    backgroundColor: COLORS.green,
    borderRadius: 18,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },

  priceSmall: {
    color: COLORS.black,
    fontSize: 8,
    fontWeight: "900",
    letterSpacing: 1,
  },

  priceDescription: {
    color: "#365000",
    fontSize: 9,
    marginTop: 3,
  },

  priceValue: {
    color: COLORS.black,
    fontSize: 20,
    fontWeight: "900",
  },

  // =========================================================
  // ADMIN NOTES
  // =========================================================

  notesCard: {
    backgroundColor: COLORS.greenSoft,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.greenBorder,
    padding: 14,
    marginBottom: 14,
  },

  notesHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 7,
  },

  notesTitle: {
    color: COLORS.green,
    fontSize: 12,
    fontWeight: "900",
    marginLeft: 7,
  },

  notesText: {
    color: "#B8C9A3",
    fontSize: 11,
    lineHeight: 17,
  },

  modalDoneButton: {
    backgroundColor: COLORS.green,
    minHeight: 50,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 2,
  },

  modalDoneText: {
    color: COLORS.black,
    fontSize: 14,
    fontWeight: "900",
  },
});