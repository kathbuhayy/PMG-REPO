import React, {
  useCallback,
  useState,
} from "react";

import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Modal,
  ScrollView,
} from "react-native";

import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "@react-navigation/native";

import { API_BASE_URL } from "../config";
import { COLORS } from "../theme";

export default function PaymentLogsScreen({
  navigation,
}) {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [profile, setProfile] = useState(null);

  // FIXED:
  // This state was being used before but was not declared.
  const [selectedReceipt, setSelectedReceipt] = useState(null);

  // ---------------------------------------------------------
  // FETCH PAYMENT LOGS + PROFILE
  // ---------------------------------------------------------

  const fetchPayments = async () => {
    try {
      const userStr = await AsyncStorage.getItem("user");

      if (!userStr) {
        Alert.alert(
          "Error",
          "User session not found. Please login again."
        );
        return;
      }

      const user = JSON.parse(userStr);

      if (!user?.id) {
        Alert.alert(
          "Error",
          "Invalid user session. Please login again."
        );
        return;
      }

      const [paymentsResponse, profileResponse] =
        await Promise.all([
          fetch(
            `${API_BASE_URL}/api/user/${user.id}/payment-logs`
          ),

          fetch(
            `${API_BASE_URL}/api/user-profile/${user.id}`
          ),
        ]);

      const paymentsData =
        await paymentsResponse.json();

      const profileData =
        await profileResponse.json();

      if (!paymentsResponse.ok) {
        throw new Error(
          paymentsData?.message ||
            "Failed to load payment logs"
        );
      }

      if (profileResponse.ok) {
        setProfile(profileData);
      }

      setPayments(
        Array.isArray(paymentsData)
          ? paymentsData
          : []
      );
    } catch (error) {
      console.error(
        "[PaymentLogsScreen] Fetch:",
        error
      );

      Alert.alert(
        "Error",
        error.message ||
          "Failed to load payment logs."
      );
    }
  };

  // ---------------------------------------------------------
  // REFRESH WHEN SCREEN OPENS
  // ---------------------------------------------------------

  useFocusEffect(
    useCallback(() => {
      setLoading(true);

      fetchPayments().finally(() =>
        setLoading(false)
      );
    }, [])
  );

  // ---------------------------------------------------------
  // PULL TO REFRESH
  // ---------------------------------------------------------

  const handleRefresh = useCallback(() => {
    setRefreshing(true);

    fetchPayments().finally(() =>
      setRefreshing(false)
    );
  }, []);

  // ---------------------------------------------------------
  // PAYMENT STATUS
  // ---------------------------------------------------------

  const getPaymentStatus = (item) => {
    const status = String(
      item?.paymentStatus ||
        item?.payment_status ||
        item?.status ||
        "pending"
    ).toLowerCase();

    if (
      status === "paid" ||
      status === "succeeded"
    ) {
      return "PAID";
    }

    if (
      status === "failed" ||
      status === "expired"
    ) {
      return "FAILED";
    }

    return "TO PAY";
  };

  // ---------------------------------------------------------
  // STATUS STYLE
  // ---------------------------------------------------------

  const getStatusStyle = (status) => {
    switch (status) {
      case "PAID":
        return {
          backgroundColor: "#DDF7E8",
          color: "#16A765",
        };

      case "FAILED":
        return {
          backgroundColor: "#FDE2E2",
          color: "#D32F2F",
        };

      default:
        return {
          backgroundColor: "#FFF3C4",
          color: "#B88600",
        };
    }
  };

  // ---------------------------------------------------------
  // RECEIPT NUMBER
  // ---------------------------------------------------------

  const getReceiptNumber = (item) => {
    return (
      item?.receiptNo ||
      `PMG-${String(
        item?.orderId ||
          item?.id ||
          "N/A"
      ).padStart(6, "0")}`
    );
  };

  // ---------------------------------------------------------
  // PAYMENT REFERENCE
  // ---------------------------------------------------------

  const getPaymentId = (item) => {
    return (
      item?.paymentReference ||
      item?.payment_reference ||
      item?.reference ||
      `PM-${item?.orderId || item?.id || "N/A"}`
    );
  };

  // ---------------------------------------------------------
  // ORDER ID
  // ---------------------------------------------------------

  const getOrderId = (item) => {
    return (
      item?.orderId ||
      item?.order?.id ||
      item?.id ||
      "N/A"
    );
  };

  // ---------------------------------------------------------
  // TOTAL AMOUNT
  // ---------------------------------------------------------

  const getAmount = (item) => {
    const amount = Number(
      item?.total ??
        item?.amount ??
        item?.order?.total ??
        0
    );

    return Number.isFinite(amount)
      ? amount
      : 0;
  };

  // ---------------------------------------------------------
  // DATE
  // ---------------------------------------------------------

  const getDate = (item) => {
    const value =
      item?.paidAt ||
      item?.issuedAt ||
      item?.createdAt ||
      item?.created_at ||
      item?.date;

    if (!value) {
      return "Date unavailable";
    }

    const date = new Date(value);

    if (isNaN(date.getTime())) {
      return String(value);
    }

    return date.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  // ---------------------------------------------------------
  // CUSTOMER NAME
  // ---------------------------------------------------------

  const getCustomerName = (receipt) => {
    return (
      receipt?.customerName ||
      receipt?.customer?.name ||
      receipt?.customer?.fullName ||
      receipt?.user?.name ||
      receipt?.user?.fullName ||
      profile?.name ||
      "Customer"
    );
  };

  // ---------------------------------------------------------
  // CUSTOMER EMAIL
  // ---------------------------------------------------------

  const getCustomerEmail = (receipt) => {
    return (
      receipt?.customerEmail ||
      receipt?.customer?.email ||
      receipt?.user?.email ||
      profile?.email ||
      "No email available"
    );
  };

  // ---------------------------------------------------------
  // SHIPPING ADDRESS
  // ---------------------------------------------------------

  const getShippingAddress = (receipt) => {
    return (
      receipt?.shippingAddress ||
      receipt?.shipping_address ||
      receipt?.order?.shippingAddress ||
      receipt?.order?.shipping_address ||
      profile?.address ||
      "No shipping address available"
    );
  };

  // ---------------------------------------------------------
  // PAYMENT METHOD
  // ---------------------------------------------------------

  const getPaymentMethod = (receipt) => {
    return (
      receipt?.paymentMethod ||
      receipt?.payment_method ||
      "Online payment"
    );
  };

  // ---------------------------------------------------------
  // PAYMENT REFERENCE
  // ---------------------------------------------------------

  const getPaymentReference = (receipt) => {
    return (
      receipt?.paymentReference ||
      receipt?.payment_reference ||
      receipt?.reference ||
      "Pending confirmation"
    );
  };

  // ---------------------------------------------------------
  // RENDER PAYMENT CARD
  // ---------------------------------------------------------

  const renderPayment = ({ item }) => {
    const status = getPaymentStatus(item);
    const statusStyle = getStatusStyle(status);
    const isPaid = status === "PAID";

    return (
      <View style={styles.paymentCard}>
        <View style={styles.paymentMain}>
          <View style={styles.leftSection}>
            <View
              style={[
                styles.statusBadge,
                {
                  backgroundColor:
                    statusStyle.backgroundColor,
                },
              ]}
            >
              <Text
                style={[
                  styles.statusText,
                  {
                    color: statusStyle.color,
                  },
                ]}
              >
                {status}
              </Text>
            </View>

            <Text
              style={styles.paymentReference}
              numberOfLines={1}
            >
              {getPaymentId(item)}
            </Text>

            <Text style={styles.orderText}>
              Order #{getOrderId(item)}
            </Text>

            <Text style={styles.dateText}>
              {getDate(item)}
            </Text>
          </View>

          <View style={styles.rightSection}>
            <Text style={styles.amountText}>
              ₱
              {getAmount(item).toLocaleString(
                "en-PH",
                {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                }
              )}
            </Text>

            <TouchableOpacity
              style={styles.invoiceButton}
              onPress={() =>
                setSelectedReceipt(item)
              }
              activeOpacity={0.8}
            >
              <Text style={styles.invoiceButtonText}>
                {isPaid
                  ? "View E-Receipt"
                  : "View Invoice"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  // ---------------------------------------------------------
  // RECEIPT MODAL
  // ---------------------------------------------------------

  const renderReceiptModal = () => {
    if (!selectedReceipt) {
      return null;
    }

    const status =
      getPaymentStatus(selectedReceipt);

    const isPaid = status === "PAID";

    const statusStyle =
      getStatusStyle(status);

    // Backend returns:
    // items: [
    //   {
    //     productName,
    //     quantity,
    //     unitPrice,
    //     totalPrice,
    //     customizationLabel,
    //     pcsCount
    //   }
    // ]

    const items =
      Array.isArray(selectedReceipt?.items)
        ? selectedReceipt.items
        : Array.isArray(
            selectedReceipt?.order?.items
          )
        ? selectedReceipt.order.items
        : [];

    // -------------------------------------------------------
    // CUSTOMER INFORMATION
    // -------------------------------------------------------

    const customerName =
      getCustomerName(selectedReceipt);

    const customerEmail =
      getCustomerEmail(selectedReceipt);

    const shippingAddress =
      getShippingAddress(selectedReceipt);

    // -------------------------------------------------------
    // PAYMENT INFORMATION
    // -------------------------------------------------------

    const paymentMethod =
      getPaymentMethod(selectedReceipt);

    const paymentReference =
      getPaymentReference(selectedReceipt);

    // -------------------------------------------------------
    // RECEIPT NUMBER
    // -------------------------------------------------------

    const receiptNumber =
      getReceiptNumber(selectedReceipt);

    // -------------------------------------------------------
    // DATE
    // -------------------------------------------------------

    const receiptDate =
      getDate(selectedReceipt);

    // -------------------------------------------------------
    // PRICE BREAKDOWN
    //
    // IMPORTANT:
    // The backend already provides:
    // subtotal
    // shippingCost
    // total
    //
    // Do NOT add total + shipping again.
    // -------------------------------------------------------

    const subtotal = Number(
      selectedReceipt?.subtotal ??
        selectedReceipt?.order?.subtotal ??
        0
    );

    const shippingCost = Number(
      selectedReceipt?.shippingCost ??
        selectedReceipt?.shipping_cost ??
        selectedReceipt?.order?.shippingCost ??
        0
    );

    const backendTotal = Number(
      selectedReceipt?.total ??
        selectedReceipt?.order?.total ??
        0
    );

    const totalAmount =
      Number.isFinite(backendTotal) &&
      backendTotal > 0
        ? backendTotal
        : subtotal + shippingCost;

    return (
      <Modal
        visible={true}
        transparent={true}
        animationType="fade"
        onRequestClose={() =>
          setSelectedReceipt(null)
        }
      >
        <View style={styles.invoiceOverlay}>
          <View style={styles.invoiceContainer}>
            {/* -------------------------------------------------
                RECEIPT HEADER
            ------------------------------------------------- */}

            <View style={styles.invoiceHeader}>
              <Text style={styles.invoiceBrand}>
                PrintHub
              </Text>

              <TouchableOpacity
                onPress={() =>
                  setSelectedReceipt(null)
                }
                style={styles.invoiceCloseButton}
              >
                <Ionicons
                  name="close"
                  size={24}
                  color="#FFFFFF"
                />
              </TouchableOpacity>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={
                styles.invoiceScrollContent
              }
            >
              {/* -------------------------------------------------
                  RECEIPT INFORMATION
              ------------------------------------------------- */}

              <View
                style={styles.invoiceTopSection}
              >
                <View
                  style={styles.invoiceTitleRow}
                >
                  <Text
                    style={styles.invoiceTitle}
                  >
                    Receipt: {receiptNumber}
                  </Text>

                  <View
                    style={[
                      styles.invoiceStatusBadge,
                      {
                        backgroundColor:
                          statusStyle.backgroundColor,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.invoiceStatusText,
                        {
                          color:
                            statusStyle.color,
                        },
                      ]}
                    >
                      {status}
                    </Text>
                  </View>
                </View>

                <Text
                  style={styles.invoiceDate}
                >
                  Date: {receiptDate}
                </Text>

                <Text
                  style={styles.invoiceOrderNumber}
                >
                  Order #{getOrderId(
                    selectedReceipt
                  )}
                </Text>
              </View>

              {/* -------------------------------------------------
                  CUSTOMER + PAYMENT DETAILS
              ------------------------------------------------- */}

              <View
                style={styles.detailsSection}
              >
                <View
                  style={styles.detailColumn}
                >
                  <Text
                    style={styles.detailLabel}
                  >
                    CUSTOMER DETAILS
                  </Text>

                  <Text
                    style={styles.detailMainText}
                  >
                    {customerName}
                  </Text>

                  <Text
                    style={styles.detailSubText}
                  >
                    {customerEmail}
                  </Text>
                </View>

                <View
                  style={styles.detailColumn}
                >
                  <Text
                    style={styles.detailLabel}
                  >
                    PAYMENT DETAILS
                  </Text>

                  <Text
                    style={styles.detailMainText}
                  >
                    Method: {paymentMethod}
                  </Text>

                  <Text
                    style={styles.detailSubText}
                  >
                    Ref: {paymentReference}
                  </Text>
                </View>
              </View>

              {/* -------------------------------------------------
                  SHIPPING ADDRESS
              ------------------------------------------------- */}

              <View
                style={styles.shippingSection}
              >
                <Text
                  style={styles.detailLabel}
                >
                  SHIPPING ADDRESS
                </Text>

                <Text
                  style={styles.shippingText}
                >
                  {shippingAddress}
                </Text>
              </View>

              {/* -------------------------------------------------
                  ITEMS
              ------------------------------------------------- */}

              <View
                style={styles.itemsSection}
              >
                <View
                  style={styles.itemsHeader}
                >
                  <Text
                    style={[
                      styles.itemHeaderText,
                      { flex: 2 },
                    ]}
                  >
                    ITEM
                  </Text>

                  <Text
                    style={[
                      styles.itemHeaderText,
                      { flex: 0.7 },
                    ]}
                  >
                    QTY
                  </Text>

                  <Text
                    style={[
                      styles.itemHeaderText,
                      {
                        flex: 1,
                        textAlign: "right",
                      },
                    ]}
                  >
                    PRICE
                  </Text>

                  <Text
                    style={[
                      styles.itemHeaderText,
                      {
                        flex: 1,
                        textAlign: "right",
                      },
                    ]}
                  >
                    TOTAL
                  </Text>
                </View>

                {items.length > 0 ? (
                  items.map(
                    (orderItem, index) => {
                      // FIX:
                      // Backend returns productName,
                      // not necessarily product.name.
                      const name =
                        orderItem?.productName ||
                        orderItem?.product?.name ||
                        orderItem?.name ||
                        "Custom Order";

                      const quantity = Number(
                        orderItem?.quantity ??
                          orderItem?.qty ??
                          1
                      );

                      // FIX:
                      // Backend returns unitPrice.
                      const unitPrice = Number(
                        orderItem?.unitPrice ??
                          orderItem?.unit_price ??
                          orderItem?.price ??
                          0
                      );

                      // FIX:
                      // Backend returns totalPrice.
                      const itemTotal = Number(
                        orderItem?.totalPrice ??
                          orderItem?.total_price ??
                          orderItem?.total ??
                          unitPrice *
                            quantity
                      );

                      const customizationLabel =
                        orderItem?.customizationLabel ||
                        "";

                      const customizations =
                        orderItem?.customizations ||
                        {};

                      const size =
                        customizations?.size;

                      return (
                        <View
                          key={
                            orderItem?.id ??
                            index
                          }
                          style={
                            styles.invoiceItemRow
                          }
                        >
                          <View
                            style={{
                              flex: 2,
                              paddingRight: 5,
                            }}
                          >
                            <Text
                              style={
                                styles.invoiceItemName
                              }
                            >
                              {name}
                            </Text>

                            {/* Show backend
                                customization info */}
                            {customizationLabel ? (
                              <Text
                                style={
                                  styles.invoiceItemDetails
                                }
                              >
                                {
                                  customizationLabel
                                }
                              </Text>
                            ) : size ? (
                              <Text
                                style={
                                  styles.invoiceItemDetails
                                }
                              >
                                Size: {size}
                              </Text>
                            ) : null}

                            {/* Fallback for size */}
                            {!customizationLabel &&
                              size && (
                                <Text
                                  style={
                                    styles.invoiceItemDetails
                                  }
                                >
                                  Size: {size}
                                </Text>
                              )}
                          </View>

                          <Text
                            style={[
                              styles.invoiceItemText,
                              { flex: 0.7 },
                            ]}
                          >
                            {quantity}
                          </Text>

                          <Text
                            style={[
                              styles.invoiceItemText,
                              {
                                flex: 1,
                                textAlign:
                                  "right",
                              },
                            ]}
                          >
                            ₱
                            {unitPrice.toLocaleString(
                              "en-PH",
                              {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              }
                            )}
                          </Text>

                          <Text
                            style={[
                              styles.invoiceItemText,
                              {
                                flex: 1,
                                textAlign:
                                  "right",
                                fontWeight:
                                  "800",
                              },
                            ]}
                          >
                            ₱
                            {itemTotal.toLocaleString(
                              "en-PH",
                              {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              }
                            )}
                          </Text>
                        </View>
                      );
                    }
                  )
                ) : (
                  <View
                    style={styles.noInvoiceItems}
                  >
                    <Text
                      style={styles.noItemsText}
                    >
                      No item details available.
                    </Text>
                  </View>
                )}
              </View>

              {/* -------------------------------------------------
                  TOTALS
              ------------------------------------------------- */}

              <View
                style={styles.totalSection}
              >
                <View
                  style={styles.totalRow}
                >
                  <Text
                    style={
                      styles.totalBreakdownLabel
                    }
                  >
                    Subtotal:
                  </Text>

                  <Text
                    style={
                      styles.totalBreakdownValue
                    }
                  >
                    ₱
                    {subtotal.toLocaleString(
                      "en-PH",
                      {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      }
                    )}
                  </Text>
                </View>

                <View
                  style={styles.totalRow}
                >
                  <Text
                    style={
                      styles.totalBreakdownLabel
                    }
                  >
                    Shipping:
                  </Text>

                  <Text
                    style={
                      styles.totalBreakdownValue
                    }
                  >
                    ₱
                    {shippingCost.toLocaleString(
                      "en-PH",
                      {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      }
                    )}
                  </Text>
                </View>

                <View
                  style={styles.totalDivider}
                />

                <View
                  style={styles.finalTotalRow}
                >
                  <Text
                    style={
                      styles.finalTotalLabel
                    }
                  >
                    {isPaid
                      ? "Total paid:"
                      : "Total:"}
                  </Text>

                  <Text
                    style={
                      styles.finalTotalValue
                    }
                  >
                    ₱
                    {totalAmount.toLocaleString(
                      "en-PH",
                      {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      }
                    )}
                  </Text>
                </View>
              </View>

              {/* -------------------------------------------------
                  EMAIL NOTIFICATION
              ------------------------------------------------- */}

              <View
                style={styles.notificationBox}
              >
                <Ionicons
                  name="mail-outline"
                  size={20}
                  color={COLORS.textMuted}
                />

                <View
                  style={
                    styles.notificationContent
                  }
                >
                  <Text
                    style={
                      styles.notificationTitle
                    }
                  >
                    Mock email notification
                    (SMTP disabled)
                  </Text>

                  <Text
                    style={
                      styles.notificationText
                    }
                  >
                    <Text
                      style={{
                        fontWeight: "800",
                      }}
                    >
                      To:
                    </Text>{" "}
                    {customerEmail}
                  </Text>

                  <Text
                    style={
                      styles.notificationText
                    }
                  >
                    <Text
                      style={{
                        fontWeight: "800",
                      }}
                    >
                      Subject:
                    </Text>{" "}
                    {isPaid
                      ? `Payment successful - ${receiptNumber}`
                      : `Payment update - PMG Order #${getOrderId(
                          selectedReceipt
                        )}`}
                  </Text>

                  <Text
                    style={
                      styles.notificationMessage
                    }
                  >
                    {isPaid
                      ? `Payment for Order #${getOrderId(
                          selectedReceipt
                        )} has been confirmed.`
                      : `Payment for Order #${getOrderId(
                          selectedReceipt
                        )} is not yet confirmed. You can retry payment from My Orders.`}
                  </Text>
                </View>
              </View>
            </ScrollView>

            {/* -------------------------------------------------
                CLOSE BUTTON
            ------------------------------------------------- */}

            <TouchableOpacity
              style={
                styles.invoiceCloseBottomButton
              }
              onPress={() =>
                setSelectedReceipt(null)
              }
            >
              <Text
                style={
                  styles.invoiceCloseBottomText
                }
              >
                Close
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  };

  // ---------------------------------------------------------
  // MAIN SCREEN
  // ---------------------------------------------------------

  return (
    <View style={styles.container}>
      {/* HEADER */}

      <View style={styles.header}>
        <TouchableOpacity
          onPress={() =>
            navigation.goBack()
          }
          style={styles.backButton}
        >
          <Ionicons
            name="arrow-back"
            size={24}
            color="#FFFFFF"
          />
        </TouchableOpacity>

        <View>
          <Text
            style={styles.headerTitle}
          >
            Payments
          </Text>

          <Text
            style={styles.headerSubtitle}
          >
            Payment Logs & Invoices
          </Text>
        </View>
      </View>

      {/* LOADING */}

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator
            size="large"
            color={COLORS.accentCyan}
          />
        </View>
      ) : payments.length === 0 ? (
        /* EMPTY */

        <View
          style={styles.emptyContainer}
        >
          <Ionicons
            name="receipt-outline"
            size={52}
            color={COLORS.textMuted}
          />

          <Text
            style={styles.emptyTitle}
          >
            No payment records
          </Text>

          <Text
            style={styles.emptyText}
          >
            Your payment history and invoices
            will appear here.
          </Text>
        </View>
      ) : (
        /* PAYMENT LIST */

        <FlatList
          data={payments}
          keyExtractor={(item, index) =>
            String(
              item?.orderId ||
                item?.id ||
                index
            )
          }
          renderItem={renderPayment}
          contentContainerStyle={
            styles.listContent
          }
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
            />
          }
          showsVerticalScrollIndicator={false}
        />
      )}

      {renderReceiptModal()}
    </View>
  );
}

// =========================================================
// STYLES
// =========================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.lightBg,
  },

  // -------------------------------------------------------
  // HEADER
  // -------------------------------------------------------

  header: {
    backgroundColor: COLORS.primaryDark,
    paddingTop: 18,
    paddingBottom: 18,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
  },

  backButton: {
    width: 42,
    height: 42,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },

  headerTitle: {
    color: "#FFFFFF",
    fontSize: 21,
    fontWeight: "800",
  },

  headerSubtitle: {
    color: "#B7C3D4",
    fontSize: 12,
    marginTop: 2,
  },

  // -------------------------------------------------------
  // PAYMENT LIST
  // -------------------------------------------------------

  listContent: {
    padding: 16,
    paddingBottom: 30,
  },

  paymentCard: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    marginBottom: 12,
    padding: 16,
  },

  paymentMain: {
    flexDirection: "row",
    justifyContent: "space-between",
  },

  leftSection: {
    flex: 1,
    paddingRight: 12,
  },

  rightSection: {
    alignItems: "flex-end",
    justifyContent: "center",
    minWidth: 125,
  },

  statusBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 7,
    marginBottom: 9,
  },

  statusText: {
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 0.4,
  },

  paymentReference: {
    fontSize: 16,
    fontWeight: "800",
    color: COLORS.textPrimary,
    marginBottom: 3,
  },

  orderText: {
    fontSize: 13,
    color: COLORS.textPrimary,
    marginBottom: 3,
  },

  dateText: {
    fontSize: 12,
    color: COLORS.textMuted,
  },

  amountText: {
    fontSize: 18,
    fontWeight: "900",
    color: COLORS.textPrimary,
    marginBottom: 10,
  },

  invoiceButton: {
    backgroundColor: COLORS.primaryDark,
    borderRadius: 7,
    paddingHorizontal: 11,
    paddingVertical: 9,
  },

  invoiceButtonText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "800",
  },

  // -------------------------------------------------------
  // LOADING / EMPTY
  // -------------------------------------------------------

  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 35,
  },

  emptyTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: COLORS.textPrimary,
    marginTop: 14,
  },

  emptyText: {
    fontSize: 13,
    color: COLORS.textMuted,
    textAlign: "center",
    marginTop: 7,
    lineHeight: 20,
  },

  // -------------------------------------------------------
  // RECEIPT MODAL
  // -------------------------------------------------------

  invoiceOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.55)",
    justifyContent: "center",
    padding: 14,
  },

  invoiceContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    overflow: "hidden",
    maxHeight: "94%",
  },

  invoiceHeader: {
    backgroundColor: COLORS.primaryDark,
    paddingHorizontal: 18,
    paddingVertical: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  invoiceBrand: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "900",
  },

  invoiceCloseButton: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },

  invoiceScrollContent: {
    paddingBottom: 10,
  },

  // -------------------------------------------------------
  // RECEIPT TOP
  // -------------------------------------------------------

  invoiceTopSection: {
    padding: 18,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },

  invoiceTitleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },

  invoiceTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: "900",
    color: COLORS.textPrimary,
    marginRight: 8,
  },

  invoiceDate: {
    fontSize: 13,
    color: COLORS.textMuted,
    marginTop: 8,
  },

  invoiceOrderNumber: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 4,
  },

  invoiceStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
  },

  invoiceStatusText: {
    fontSize: 9,
    fontWeight: "900",
  },

  // -------------------------------------------------------
  // CUSTOMER / PAYMENT DETAILS
  // -------------------------------------------------------

  detailsSection: {
    flexDirection: "row",
    padding: 18,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },

  detailColumn: {
    flex: 1,
    paddingRight: 8,
  },

  detailLabel: {
    fontSize: 10,
    fontWeight: "900",
    color: COLORS.textMuted,
    marginBottom: 7,
  },

  detailMainText: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.textPrimary,
    marginBottom: 3,
  },

  detailSubText: {
    fontSize: 12,
    color: COLORS.textMuted,
    lineHeight: 18,
  },

  // -------------------------------------------------------
  // SHIPPING
  // -------------------------------------------------------

  shippingSection: {
    backgroundColor: "#F8F9FC",
    padding: 18,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },

  shippingText: {
    fontSize: 12,
    color: COLORS.textPrimary,
    lineHeight: 18,
  },

  // -------------------------------------------------------
  // ITEMS
  // -------------------------------------------------------

  itemsSection: {
    paddingHorizontal: 18,
    paddingTop: 16,
  },

  itemsHeader: {
    flexDirection: "row",
    paddingBottom: 9,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },

  itemHeaderText: {
    fontSize: 9,
    fontWeight: "900",
    color: COLORS.textMuted,
  },

  invoiceItemRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#EEF0F5",
  },

  invoiceItemName: {
    fontSize: 13,
    fontWeight: "800",
    color: COLORS.textPrimary,
  },

  invoiceItemDetails: {
    fontSize: 10,
    color: COLORS.textMuted,
    marginTop: 3,
  },

  invoiceItemText: {
    fontSize: 11,
    color: COLORS.textPrimary,
  },

  noInvoiceItems: {
    paddingVertical: 15,
  },

  noItemsText: {
    fontSize: 13,
    color: COLORS.textMuted,
  },

  // -------------------------------------------------------
  // TOTAL
  // -------------------------------------------------------

  totalSection: {
    padding: 18,
    backgroundColor: "#F8F9FC",
  },

  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 9,
  },

  totalBreakdownLabel: {
    fontSize: 13,
    color: COLORS.textMuted,
  },

  totalBreakdownValue: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.textPrimary,
  },

  totalDivider: {
    height: 1,
    backgroundColor: COLORS.borderLight,
    marginVertical: 4,
  },

  finalTotalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 9,
  },

  finalTotalLabel: {
    fontSize: 17,
    fontWeight: "800",
    color: COLORS.textPrimary,
  },

  finalTotalValue: {
    fontSize: 19,
    fontWeight: "900",
    color: COLORS.primaryDark,
  },

  // -------------------------------------------------------
  // EMAIL NOTIFICATION
  // -------------------------------------------------------

  notificationBox: {
    margin: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    borderRadius: 12,
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
  },

  notificationContent: {
    flex: 1,
    marginLeft: 10,
  },

  notificationTitle: {
    fontSize: 12,
    fontWeight: "800",
    color: COLORS.textPrimary,
    marginBottom: 9,
  },

  notificationText: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginBottom: 5,
    lineHeight: 17,
  },

  notificationMessage: {
    fontSize: 11,
    color: COLORS.textMuted,
    lineHeight: 17,
    marginTop: 6,
  },

  // -------------------------------------------------------
  // CLOSE BUTTON
  // -------------------------------------------------------

  invoiceCloseBottomButton: {
    backgroundColor: COLORS.primaryDark,
    marginHorizontal: 18,
    marginBottom: 18,
    borderRadius: 11,
    paddingVertical: 13,
    alignItems: "center",
  },

  invoiceCloseBottomText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },
});