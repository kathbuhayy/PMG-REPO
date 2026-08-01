// Skip list for input types that do not require realtime validation
export const REALTIME_VALIDATION_SKIP_TYPES = new Set([
  "button",
  "checkbox",
  "color",
  "file",
  "hidden",
  "image",
  "radio",
  "range",
  "reset",
  "search",
  "submit",
]);

// Extract numeric price from formatted price strings
export const extractNumericPrice = (price) => {
  if (typeof price === "number") return price;
  if (!price) return 0;
  if (price === "Free" || price.toString().toLowerCase() === "free") return 0;

  const numStr = String(price).replace(/[^\d.]/g, "");
  const num = parseFloat(numStr);
  
  return isNaN(num) ? 0 : num;
};

// Format price to PHP currency string
export const formatPrice = (price) => {
  const num = extractNumericPrice(price);
  
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
  }).format(num);
};

// Formats a numeric price into a PHP currency format with thousands separator
export function formatHomePrice(price) {
  if (price === null || price === undefined || price === "") return "";
  
  const numeric = Number(price);
  
  return Number.isFinite(numeric)
    ? `₱${numeric.toLocaleString()}`
    : String(price);
}

// Returns a concatenated key string of attributes for identifying input fields
export function getRealtimeFieldKey(field) {
  return [
    field.name,
    field.id,
    field.getAttribute("aria-label"),
    field.placeholder,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

// Determines if a field should undergo realtime validation
export function isRealtimeValidatedField(field) {
  if (!field?.matches?.("input, textarea, select")) return false;
  if (field.disabled || field.readOnly) return false;
  if (field.dataset.noRealtimeValidation === "true") return false;
  
  return !REALTIME_VALIDATION_SKIP_TYPES.has((field.type || "").toLowerCase());
}

// Finds the corresponding password peer for a confirm password field
export function getConfirmPasswordPeer(field) {
  const form = field.form || field.closest("form") || document;
  
  return form.querySelector(
    'input[type="password"]:not([name*="confirm" i]):not([id*="confirm" i])',
  );
}

// Generates the validation error message for a specific input field
export function getRealtimeValidationMessage(field) {
  const value = String(field.value || "").trim();
  const fieldKey = getRealtimeFieldKey(field);

  if (fieldKey.includes("search") || field.type === "search") {
    return "";
  }

  const isRequired =
    field.required || field.getAttribute("aria-required") === "true";

  if (!value) {
    return isRequired ? "This field is required." : "";
  }

  const validity = field.validity;
  if (validity?.badInput) return "Enter a valid value.";
  if (validity?.typeMismatch) {
    return field.type === "email"
      ? "Enter a valid email address."
      : "Enter a valid value.";
  }
  if (validity?.patternMismatch) return field.title || "Use the required format.";
  if (validity?.tooShort) {
    return `Use at least ${field.minLength} characters.`;
  }
  if (validity?.tooLong) return `Use ${field.maxLength} characters or fewer.`;
  if (validity?.rangeUnderflow) return `Use a value of at least ${field.min}.`;
  if (validity?.rangeOverflow) return `Use a value no more than ${field.max}.`;

  if (field.type === "email" || fieldKey.includes("email")) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
      ? ""
      : "Enter a valid email address.";
  }

  if (
    field.type === "tel" ||
    fieldKey.includes("phone") ||
    fieldKey.includes("mobile") ||
    fieldKey.includes("contact")
  ) {
    const compact = value.replace(/[\s-]/g, "");
    return /^(\+639\d{9}|09\d{9})$/.test(compact)
      ? ""
      : "Use a valid PH mobile number, like 09XXXXXXXXX or +639XXXXXXXXX.";
  }

  if (fieldKey.includes("otp")) {
    return /^\d{6}$/.test(value) ? "" : "Enter the 6-digit OTP.";
  }

  if (field.type === "password" || fieldKey.includes("password")) {
    if (value.length < 6) return "Password must be at least 6 characters.";
    if (fieldKey.includes("new") || fieldKey.includes("register")) {
      if (!/[A-Z]/.test(value)) return "Add at least one uppercase letter.";
      if (!/[a-z]/.test(value)) return "Add at least one lowercase letter.";
      if (!/\d/.test(value)) return "Add at least one number.";
    }
    if (fieldKey.includes("confirm")) {
      const peer = getConfirmPasswordPeer(field);
      if (peer?.value && value !== peer.value) return "Passwords do not match.";
    }
  }

  if (
    field.type === "number" ||
    /\b(price|amount|total|stock|qty|quantity|width|height|depth)\b/.test(
      fieldKey,
    )
  ) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return "Enter a valid number.";
    if (/\b(qty|quantity|stock)\b/.test(fieldKey) && numeric < 1) {
      return "Use a value of at least 1.";
    }
    if (numeric < 0) return "Use a positive value.";
  }

  if (
    /\b(first name|last name|full name|customer name|name)\b/.test(fieldKey) &&
    !fieldKey.includes("username") &&
    !fieldKey.includes("product")
  ) {
    return /^[A-Za-z\s.'-]+$/.test(value)
      ? ""
      : "Names can only use letters, spaces, apostrophes, periods, and hyphens.";
  }

  return "";
}

// Renders the realtime validation message UI for a field
export function renderRealtimeValidation(field, forceTouched = false) {
  if (!isRealtimeValidatedField(field)) return;

  if (forceTouched || field.value) {
    field.dataset.realtimeTouched = "true";
  }

  const touched = field.dataset.realtimeTouched === "true";
  const message = touched ? getRealtimeValidationMessage(field) : "";
  let feedback = field.nextElementSibling;

  if (!feedback?.classList?.contains("realtime-field-error")) {
    feedback = document.createElement("div");
    feedback.className = "realtime-field-error";
    field.insertAdjacentElement("afterend", feedback);
  }

  if (!feedback.id) {
    feedback.id = `field-error-${Math.random().toString(36).slice(2, 10)}`;
  }

  if (message) {
    field.classList.add("realtime-field-invalid");
    field.setAttribute("aria-invalid", "true");
    field.setAttribute("aria-describedby", feedback.id);
    feedback.textContent = message;
    feedback.hidden = false;
  } else {
    field.classList.remove("realtime-field-invalid");
    field.removeAttribute("aria-invalid");
    feedback.textContent = "";
    feedback.hidden = true;
  }
}
