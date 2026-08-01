import {
  extractNumericPrice,
  formatPrice,
  formatHomePrice,
  getRealtimeFieldKey,
  isRealtimeValidatedField,
  getRealtimeValidationMessage,
} from "./appUtils";

describe("appUtils unified utility tests", () => {
  // Tests extractNumericPrice for various inputs
  test("extractNumericPrice parses numeric and formatted price values", () => {
    expect(extractNumericPrice("₱1,270.50")).toBe(1270.5);
    expect(extractNumericPrice("+ ₱462.00")).toBe(462.0);
    expect(extractNumericPrice("Free")).toBe(0);
    expect(extractNumericPrice("free")).toBe(0);
    expect(extractNumericPrice(500)).toBe(500);
    expect(extractNumericPrice(null)).toBe(0);
    expect(extractNumericPrice(undefined)).toBe(0);
    expect(extractNumericPrice("")).toBe(0);
  });

  // Tests formatPrice output formats
  test("formatPrice formats numbers to PHP currency style", () => {
    const formattedVal = formatPrice(1270.5);
    expect(formattedVal).toContain("1,270.50");
    expect(formattedVal).toMatch(/PHP|₱/);
    
    expect(formatPrice("Free")).toContain("0.00");
    expect(formatPrice(0)).toContain("0.00");
  });

  // Tests formatting behavior for numeric inputs in formatHomePrice
  test("formatHomePrice formats finite numbers with Peso symbol and localized grouping", () => {
    expect(formatHomePrice(1270)).toBe("₱1,270");
    expect(formatHomePrice(0)).toBe("₱0");
    expect(formatHomePrice(9999999)).toBe("₱9,999,999");
  });

  // Tests null safety and empty value cases in formatHomePrice
  test("formatHomePrice returns empty string for null, undefined, or empty string", () => {
    expect(formatHomePrice(null)).toBe("");
    expect(formatHomePrice(undefined)).toBe("");
    expect(formatHomePrice("")).toBe("");
  });

  // Tests fallback mechanism when non-finite/string is passed in formatHomePrice
  test("formatHomePrice returns string representation when input is non-numeric", () => {
    expect(formatHomePrice("already-formatted")).toBe("already-formatted");
    expect(formatHomePrice(NaN)).toBe("NaN");
  });

  // Tests generating identifiers from field properties in validation helpers
  test("getRealtimeFieldKey combines field properties into a key string", () => {
    const input = document.createElement("input");
    input.name = "testName";
    input.id = "testId";
    input.placeholder = "testPlaceholder";
    input.setAttribute("aria-label", "testLabel");

    const key = getRealtimeFieldKey(input);
    expect(key).toContain("testname");
    expect(key).toContain("testid");
    expect(key).toContain("testplaceholder");
    expect(key).toContain("testlabel");
  });

  // Tests determining whether field requires validation
  test("isRealtimeValidatedField checks field validity status", () => {
    const input = document.createElement("input");
    input.type = "text";
    expect(isRealtimeValidatedField(input)).toBe(true);

    input.disabled = true;
    expect(isRealtimeValidatedField(input)).toBe(false);

    input.disabled = false;
    input.type = "button";
    expect(isRealtimeValidatedField(input)).toBe(false);
  });

  // Tests validation output messages for empty, required and invalid formats
  test("getRealtimeValidationMessage generates appropriate validation warnings", () => {
    const input = document.createElement("input");
    input.type = "text";
    
    input.required = false;
    input.value = "";
    expect(getRealtimeValidationMessage(input)).toBe("");

    input.required = true;
    expect(getRealtimeValidationMessage(input)).toBe("This field is required.");

    input.required = true;
    input.type = "email";
    input.value = "test@example.com";
    expect(getRealtimeValidationMessage(input)).toBe("");

    input.value = "invalid-email";
    expect(getRealtimeValidationMessage(input)).toBe("Enter a valid email address.");

    input.type = "tel";
    input.name = "phone";
    input.value = "09123456789";
    expect(getRealtimeValidationMessage(input)).toBe("");

    input.value = "12345";
    expect(getRealtimeValidationMessage(input)).toBe(
      "Use a valid PH mobile number, like 09XXXXXXXXX or +639XXXXXXXXX."
    );

    input.type = "password";
    input.name = "registerPassword";
    input.value = "abc";
    expect(getRealtimeValidationMessage(input)).toBe(
      "Password must be at least 6 characters."
    );
  });
});
