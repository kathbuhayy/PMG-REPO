import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
} from "react-native";
import { COLORS } from "../theme";

export default function InquiriesScreen() {
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = () => {
    if (!subject.trim() || !message.trim()) {
      Alert.alert("Error", "Please fill in all inquiry fields.");
      return;
    }

    try {
      setSubmitted(true);
      setSubject("");
      setMessage("");
      Alert.alert("Success", "Your inquiry has been submitted!");
    } catch (err) {
      console.error("[InquiriesScreen] {SubmitInquiry}: " + err.message);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.pageTitle}>Custom Quotes & Inquiries</Text>
      <Text style={styles.subtitle}>
        Need special bulk orders, custom dimensions, or custom design quotes?
        Send us your request below.
      </Text>

      <View style={styles.formCard}>
        <Text style={styles.label}>Subject / Product Type</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. Bulk Tarpaulin 50 pcs"
          value={subject}
          onChangeText={setSubject}
        />

        <Text style={styles.label}>Details & Specifications</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Describe your dimensions, material preference, and quantity"
          multiline
          numberOfLines={4}
          value={message}
          onChangeText={setMessage}
        />

        <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit}>
          <Text style={styles.submitBtnText}>Submit Inquiry</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.lightBg,
    padding: 16,
  },
  pageTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: COLORS.textPrimary,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 13,
    color: COLORS.textMuted,
    marginBottom: 16,
    lineHeight: 18,
  },
  formCard: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    padding: 18,
  },
  label: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.textPrimary,
    marginBottom: 6,
    marginTop: 10,
  },
  input: {
    backgroundColor: COLORS.lightBg,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    color: COLORS.textPrimary,
  },
  textArea: {
    height: 100,
    textAlignVertical: "top",
  },
  submitBtn: {
    backgroundColor: COLORS.accentCyan,
    borderRadius: 24,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 20,
  },
  submitBtnText: {
    color: COLORS.textLight,
    fontWeight: "800",
    fontSize: 14,
  },
});
