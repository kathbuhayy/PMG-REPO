import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "../theme";

export default function LandingScreen({ navigation }) {
  const services = [
    { id: 1, title: "Custom Apparel", desc: "T-shirts, hoodies, and jerseys with crisp print finishes", icon: "shirt-outline", tone: COLORS.accentCyan },
    { id: 2, title: "Marketing Materials", desc: "Business cards, flyers, and promotional items", icon: "megaphone-outline", tone: "#8b5cf6" },
    { id: 3, title: "Packaging Design", desc: "Custom boxes, labels, and branded product packaging", icon: "cube-outline", tone: "#f97316" },
    { id: 4, title: "Large Format", desc: "Posters, banners, and outdoor tarpaulin displays", icon: "image-outline", tone: "#22c55e" },
  ];

  const howToSteps = [
    { step: 1, title: "Choose your product", text: "Select your desired print item, dimensions, and quantity." },
    { step: 2, title: "Customize design", text: "Upload your artwork or configure in our online customizer." },
    { step: 3, title: "Quality check", text: "We review specs to guarantee crisp, high-resolution output." },
    { step: 4, title: "Precision printing", text: "Your project enters production on professional machinery." },
    { step: 5, title: "Secure payment", text: "Complete checkout with trusted digital payment options." },
    { step: 6, title: "Pickup or delivery", text: "Receive your items via delivery or visit our shop." },
  ];

  const popular = [
    { label: "Business Cards", icon: "id-card-outline" },
    { label: "T-Shirts", icon: "shirt-outline" },
    { label: "Posters", icon: "image-outline" },
    { label: "Notebooks", icon: "book-outline" },
    { label: "Stickers", icon: "pricetag-outline" },
    { label: "Banners", icon: "flag-outline" },
  ];

  const features = [
    { icon: "rocket-outline", title: "Fast Turnaround", text: "Ready for pickup within 24-48 hours" },
    { icon: "shield-checkmark-outline", title: "Quality Guaranteed", text: "100% satisfaction or your money back" },
    { icon: "headset-outline", title: "24/7 Support", text: "We're here whenever you need us" },
  ];

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Hero Header */}
      <View style={styles.hero}>
        <View style={styles.badgeRow}>
          <Text style={styles.heroBadge}>PMG PRINTING HOUSE</Text>
        </View>
        <Text style={styles.heroTitle}>
          Print Your Ideas{"\n"}
          <Text style={{ color: COLORS.accentCyan }}>With PMG</Text>
        </Text>
        <Text style={styles.heroSubtitle}>
          High-precision custom prints, branded merchandise, and packaging built for businesses, events, and personal brands.
        </Text>

        <View style={styles.heroBtnRow}>
          <TouchableOpacity
            style={styles.heroBtnPrimary}
            onPress={() => navigation.navigate("Main")}
          >
            <Text style={styles.heroBtnText}>Explore Products</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.heroBtnSecondary}
            onPress={() => navigation.navigate("Login")}
          >
            <Text style={styles.heroBtnSecondaryText}>Customer Sign In</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Core Services Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Our Core Services</Text>
          <Text style={styles.sectionSubtitle}>High-quality print solutions tailored for your business</Text>
        </View>
        <View style={styles.servicesGrid}>
          {services.map((item) => (
            <View key={item.id} style={styles.serviceCard}>
              <View style={[styles.serviceIconWrap, { backgroundColor: `${item.tone}1A` }]}>
                <Ionicons name={item.icon} size={28} color={item.tone} />
              </View>
              <Text style={styles.serviceTitle}>{item.title}</Text>
              <Text style={styles.serviceDesc}>{item.desc}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* How to Order Section */}
      <View style={[styles.section, styles.darkSection]}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: COLORS.textLight }]}>Order in 6 Easy Steps</Text>
          <Text style={styles.sectionSubtitle}>A simple, transparent process from initial design to final output.</Text>
        </View>
        <View style={styles.howToContainer}>
          {howToSteps.map((item, index) => (
            <View key={item.step} style={styles.howToStep}>
              <View style={styles.stepIndicator}>
                <Text style={styles.stepNum}>{item.step}</Text>
              </View>
              <View style={styles.stepContent}>
                <Text style={styles.stepTitle}>{item.title}</Text>
                <Text style={styles.stepDesc}>{item.text}</Text>
              </View>
              {index !== howToSteps.length - 1 && (
                <View style={styles.stepConnector} />
              )}
            </View>
          ))}
        </View>
      </View>

      {/* Popular Print Categories */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Popular Categories</Text>
          <Text style={styles.sectionSubtitle}>Explore our most requested custom printing options</Text>
        </View>
        <View style={styles.popularGrid}>
          {popular.map((item, idx) => (
            <TouchableOpacity key={idx} style={styles.popularCard} onPress={() => navigation.navigate("Login")}>
              <Ionicons name={item.icon} size={24} color={COLORS.textPrimary} style={{ marginBottom: 8 }} />
              <Text style={styles.popularText}>{item.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Features */}
      <View style={[styles.section, { paddingBottom: 60 }]}>
        <View style={styles.featuresGrid}>
          {features.map((item, idx) => (
            <View key={idx} style={styles.featureCard}>
              <Ionicons name={item.icon} size={32} color={COLORS.accentGold} style={{ marginBottom: 12 }} />
              <Text style={styles.featureTitle}>{item.title}</Text>
              <Text style={styles.featureDesc}>{item.text}</Text>
            </View>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.lightBg,
  },
  hero: {
    backgroundColor: COLORS.primaryDark,
    padding: 24,
    paddingTop: 48,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  badgeRow: {
    marginBottom: 12,
  },
  heroBadge: {
    color: COLORS.accentGold,
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 1.5,
  },
  heroTitle: {
    fontSize: 32,
    fontWeight: "900",
    color: COLORS.textLight,
    lineHeight: 40,
  },
  heroSubtitle: {
    fontSize: 15,
    color: COLORS.textMuted,
    marginTop: 12,
    lineHeight: 22,
  },
  heroBtnRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 24,
    marginBottom: 10,
  },
  heroBtnPrimary: {
    backgroundColor: COLORS.accentCyan,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 24,
    flex: 1,
    alignItems: "center",
  },
  heroBtnText: {
    color: COLORS.textLight,
    fontWeight: "800",
    fontSize: 14,
  },
  heroBtnSecondary: {
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.15)",
    flex: 1,
    alignItems: "center",
  },
  heroBtnSecondaryText: {
    color: COLORS.textLight,
    fontWeight: "700",
    fontSize: 14,
  },
  section: {
    padding: 24,
  },
  darkSection: {
    backgroundColor: COLORS.primaryDark,
    marginHorizontal: 16,
    borderRadius: 24,
    padding: 24,
  },
  sectionHeader: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: "900",
    color: COLORS.textPrimary,
    marginBottom: 6,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: COLORS.textMuted,
    lineHeight: 20,
  },
  servicesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 16,
  },
  serviceCard: {
    backgroundColor: COLORS.cardBg,
    width: "47%",
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  serviceIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  serviceTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: COLORS.textPrimary,
    marginBottom: 6,
  },
  serviceDesc: {
    fontSize: 12,
    color: COLORS.textMuted,
    lineHeight: 18,
  },
  howToContainer: {
    marginTop: 10,
  },
  howToStep: {
    flexDirection: "row",
    marginBottom: 24,
    position: "relative",
  },
  stepIndicator: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.accentCyan,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
    zIndex: 2,
  },
  stepNum: {
    color: COLORS.textLight,
    fontSize: 14,
    fontWeight: "900",
  },
  stepConnector: {
    position: "absolute",
    left: 15,
    top: 32,
    bottom: -24,
    width: 2,
    backgroundColor: "rgba(255,255,255,0.1)",
    zIndex: 1,
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: COLORS.textLight,
    marginBottom: 4,
  },
  stepDesc: {
    fontSize: 13,
    color: COLORS.textMuted,
    lineHeight: 18,
  },
  popularGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  popularCard: {
    backgroundColor: COLORS.cardBg,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    width: "31%",
  },
  popularText: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.textPrimary,
    textAlign: "center",
  },
  featuresGrid: {
    gap: 16,
  },
  featureCard: {
    backgroundColor: COLORS.cardBg,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    borderRadius: 16,
    padding: 20,
    alignItems: "flex-start",
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: COLORS.textPrimary,
    marginBottom: 6,
  },
  featureDesc: {
    fontSize: 13,
    color: COLORS.textMuted,
    lineHeight: 20,
  },
});
