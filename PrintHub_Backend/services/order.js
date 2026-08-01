// Formats a numeric value into Philippine Peso (PHP) currency string.
const money = (value) =>
  new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
  }).format(Number(value || 0));

// Extracts and returns the full name or fallback email for an order's user.
const getCustomerName = (order) => {
  const parts = [order.user?.first_name, order.user?.last_name];
  return parts.filter(Boolean).join(" ") ||
    order.user?.email ||
    "Customer";
};

// Human-readable labels for various order statuses.
const ORDER_STATUS_LABELS = {
  pending: "Order placed",
  confirmed: "Ordered/Paid",
  processing: "In process",
  completed: "Done",
  delivered: "Delivered",
  cancelled: "Cancelled",
  return_requested: "Return requested",
};

// Order status values that indicate active production.
const PRODUCTION_STATUSES = ["confirmed", "processing", "completed"];

module.exports = {
  money,
  getCustomerName,
  ORDER_STATUS_LABELS,
  PRODUCTION_STATUSES,
};
