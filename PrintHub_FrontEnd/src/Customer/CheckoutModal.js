import React, { useEffect, useState } from "react";
import { FaTimes, FaSpinner, FaCheckCircle } from "react-icons/fa";
import "./CheckoutModal.css";
import { extractNumericPrice } from "../utils/appUtils";
import { buildApiUrl } from "../config/api";
import { usePsgcAddress } from "../hooks/usePsgcAddress";

const getCombinedAddress = (addr, type = "shipping") => {
  const prefix = type === "billing" ? "billing_" : "";
  const parts = [
    addr[`${prefix}street`],
    addr[`${prefix}barangay`] && `Brgy. ${addr[`${prefix}barangay`]}`,
    addr[`${prefix}city`],
    addr[`${prefix}province`],
    addr[`${prefix}region`],
  ].filter(Boolean);
  return parts.join(", ");
};

function CheckoutModal({
  userId,
  cartItems,
  total,
  subtotal,
  onClose,
  onSuccess,
}) {
  const [step, setStep] = useState("address");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [formData, setFormData] = useState({
    region: "",
    province: "",
    city: "",
    barangay: "",
    street: "",
    billing_region: "",
    billing_province: "",
    billing_city: "",
    billing_barangay: "",
    billing_street: "",
    sameAddress: true,
  });

  const [orderData, setOrderData] = useState(null);

  const shippingAddr = usePsgcAddress();
  const billingAddr = usePsgcAddress();

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;

    const initAddressData = async () => {
      try {
        const res = await fetch(buildApiUrl(`/api/user-profile/${userId}`));
        const profile = await res.json();
        if (cancelled) return;
        if (!res.ok || !profile.address) return;

        const parts = profile.address.split(",").map((s) => s.trim());
        if (parts.length >= 4) {
          const savedRegionName = parts[parts.length - 1] || "";
          const savedProvinceName = parts[parts.length - 2] || "";
          const savedCityName = parts[parts.length - 3] || "";
          let savedBrgyName = parts[parts.length - 4] || "";
          if (savedBrgyName.toLowerCase().startsWith("brgy.")) {
            savedBrgyName = savedBrgyName.substring(5).trim();
          }
          const savedStreet = parts.slice(0, parts.length - 4).join(", ");

          const shippingResult =
            await shippingAddr.loadSavedAddressSequentially(
              savedRegionName,
              savedProvinceName,
              savedCityName,
              savedBrgyName
            );

          if (cancelled) return;

          if (shippingResult) {
            const matchedProvName = shippingResult.province;
            const matchedBrgyName = shippingResult.barangay;

            setFormData((prev) => ({
              ...prev,
              region: shippingResult.region,
              province: matchedProvName,
              city: shippingResult.city,
              barangay: matchedBrgyName,
              street: savedStreet || matchedBrgyName,
              billing_region: prev.sameAddress
                ? shippingResult.region
                : prev.billing_region,
              billing_province: prev.sameAddress
                ? matchedProvName
                : prev.billing_province,
              billing_city: prev.sameAddress
                ? shippingResult.city
                : prev.billing_city,
              billing_barangay: prev.sameAddress
                ? matchedBrgyName
                : prev.billing_barangay,
              billing_street: prev.sameAddress
                ? savedStreet || matchedBrgyName
                : prev.billing_street,
            }));

            if (formData.sameAddress) {
              billingAddr.setAddressLists(
                shippingResult.provincesData,
                shippingResult.citiesData,
                shippingResult.barangaysData
              );
              billingAddr.setActiveCodes(shippingAddr.activeCodes);
            } else {
              await billingAddr.loadSavedAddressSequentially(
                savedRegionName,
                savedProvinceName,
                savedCityName,
                savedBrgyName
              );
            }
          }
        } else {
          setFormData((prev) => ({
            ...prev,
            street: profile.address,
            billing_street: prev.sameAddress
              ? profile.address
              : prev.billing_street,
          }));
        }
      } catch (err) {
        console.error("Failed to load saved checkout address:", err);
      }
    };

    initAddressData();

    return () => {
      cancelled = true;
    };
  }, [userId]);

  const handleRegionChange = async (e, type = "shipping") => {
    const regionName = e.target.value;
    if (type === "shipping") {
      await shippingAddr.handleRegionChange(regionName, (vals) => {
        setFormData((prev) => ({
          ...prev,
          region: vals.region,
          province: vals.province,
          city: vals.city,
          barangay: vals.barangay,
          ...(prev.sameAddress
            ? {
                billing_region: vals.region,
                billing_province: vals.province,
                billing_city: vals.city,
                billing_barangay: vals.barangay,
              }
            : {}),
        }));
      });
    } else {
      await billingAddr.handleRegionChange(regionName, (vals) => {
        setFormData((prev) => ({
          ...prev,
          billing_region: vals.region,
          billing_province: vals.province,
          billing_city: vals.city,
          billing_barangay: vals.barangay,
        }));
      });
    }
  };

  const handleProvinceChange = async (e, type = "shipping") => {
    const provinceName = e.target.value;
    if (type === "shipping") {
      await shippingAddr.handleProvinceChange(provinceName, (vals) => {
        setFormData((prev) => ({
          ...prev,
          province: vals.province,
          city: vals.city,
          barangay: vals.barangay,
          ...(prev.sameAddress
            ? {
                billing_province: vals.province,
                billing_city: vals.city,
                billing_barangay: vals.barangay,
              }
            : {}),
        }));
      });
    } else {
      await billingAddr.handleProvinceChange(provinceName, (vals) => {
        setFormData((prev) => ({
          ...prev,
          billing_province: vals.province,
          billing_city: vals.city,
          billing_barangay: vals.barangay,
        }));
      });
    }
  };

  const handleCityChange = async (e, type = "shipping") => {
    const cityName = e.target.value;
    if (type === "shipping") {
      await shippingAddr.handleCityChange(cityName, (vals) => {
        setFormData((prev) => ({
          ...prev,
          city: vals.city,
          barangay: vals.barangay,
          ...(prev.sameAddress
            ? {
                billing_city: vals.city,
                billing_barangay: vals.barangay,
              }
            : {}),
        }));
      });
    } else {
      await billingAddr.handleCityChange(cityName, (vals) => {
        setFormData((prev) => ({
          ...prev,
          billing_city: vals.city,
          billing_barangay: vals.barangay,
        }));
      });
    }
  };

  const formatPeso = (n) => {
    let num = typeof n === "number" ? n : parseFloat(n) || 0;
    if (isNaN(num)) num = 0;
    return new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
    }).format(num);
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (name === "sameAddress") {
      const isSame = checked;
      setFormData((prev) => ({
        ...prev,
        sameAddress: isSame,
        billing_region: isSame ? prev.region : prev.billing_region,
        billing_province: isSame ? prev.province : prev.billing_province,
        billing_city: isSame ? prev.city : prev.billing_city,
        billing_barangay: isSame ? prev.barangay : prev.billing_barangay,
        billing_street: isSame ? prev.street : prev.billing_street,
      }));

      if (isSame) {
        billingAddr.setAddressLists(
          shippingAddr.provinces,
          shippingAddr.cities,
          shippingAddr.barangays
        );
        billingAddr.setActiveCodes(shippingAddr.activeCodes);
      }
    } else {
      setFormData((prev) => {
        const next = {
          ...prev,
          [name]: type === "checkbox" ? checked : value,
        };
        if (prev.sameAddress) {
          if (name === "street") {
            next.billing_street = value;
          }
        }
        return next;
      });
    }
  };

  const handleAddressNext = () => {
    const {
      region,
      province,
      city,
      barangay,
      street,
      billing_region,
      billing_province,
      billing_city,
      billing_barangay,
      billing_street,
      sameAddress,
    } = formData;

    if (
      !region.trim() ||
      !province.trim() ||
      !city.trim() ||
      !barangay.trim() ||
      !street.trim()
    ) {
      setError("All shipping address fields are required");
      return;
    }

    if (
      !sameAddress &&
      (!billing_region.trim() ||
        !billing_province.trim() ||
        !billing_city.trim() ||
        !billing_barangay.trim() ||
        !billing_street.trim())
    ) {
      setError("All billing address fields are required");
      return;
    }

    setError("");
    setStep("review");
  };

  const handlePlaceOrder = async () => {
    if (!userId) {
      setError("Please create an account before checking out.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      // Prepare order items from cart (include prices and full customizations)
      const items = cartItems.map((item) => ({
        productId: item.productId,
        quantity: item.qty,
        unitPrice: extractNumericPrice(item.price),
        customizations: item.customizations || {},
        imageUrl:
          item.customizations?.design?.generatedImageUrl ||
          item.productImage ||
          item.images?.[0] ||
          null,
      }));

      // Calculate order total: sum of all item prices (including qty)
      const orderSubtotal = cartItems.reduce(
        (sum, item) => sum + extractNumericPrice(item.price) * item.qty,
        0,
      );
      const shippingCost = 0;
      const orderTotal = orderSubtotal;

      const shippingStr = getCombinedAddress(formData, "shipping");
      const billingStr = formData.sameAddress
        ? shippingStr
        : getCombinedAddress(formData, "billing");

      const payload = {
        userId,
        items,
        shippingCost,
        shipping_address: shippingStr,
        billing_address: billingStr,
      };

      const response = await fetch(buildApiUrl("/api/orders"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to create order");
      }

      // Ensure the order total is correct
      if (data.order && data.order.total < orderTotal * 0.9) {
        console.warn(
          "Backend calculated total seems incorrect, using local calculation",
        );
        data.order.total = orderTotal;
      }

      setOrderData(data.order);
      setStep("success");

      // Callback to parent after 2 seconds
      setTimeout(() => {
        onSuccess(data.order);
      }, 2000);
    } catch (err) {
      setError(err.message || "An error occurred. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="checkout-modal-overlay">
      <div className="checkout-modal">
        {/* HEADER */}
        <div className="checkout-header">
          <h2>Checkout</h2>
          <button className="checkout-close" type="button" onClick={onClose}>
            <FaTimes />
          </button>
        </div>

        {/* STEP 1: ADDRESS */}
        {step === "address" && (
          <div className="checkout-content">
            <div className="checkout-progress">
              Step 1 of 3: Shipping Address
            </div>

            {error && <div className="checkout-error">{error}</div>}

            <div className="checkout-form">
              {/* Shipping Address Fields */}
              <div className="checkout-row-2col">
                <div>
                  <label className="checkout-label">
                    Region <span className="required">*</span>
                  </label>
                  <select
                    name="region"
                    className="checkout-input"
                    value={formData.region}
                    onChange={(e) => handleRegionChange(e, "shipping")}
                  >
                    <option value="">Select Region...</option>
                    {shippingAddr.regions.map((r) => (
                      <option key={r.code} value={r.name}>
                        {r.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="checkout-label">
                    Province <span className="required">*</span>
                  </label>
                  <select
                    name="province"
                    className="checkout-input"
                    value={formData.province}
                    onChange={(e) => handleProvinceChange(e, "shipping")}
                    disabled={
                      !formData.region ||
                      shippingAddr.provinces.length === 0
                    }
                  >
                    {shippingAddr.provinces.length === 0 ? (
                      <option value="N/A">N/A (No provinces)</option>
                    ) : (
                      <>
                        <option value="">Select Province...</option>
                        {shippingAddr.provinces.map((p) => (
                          <option key={p.code} value={p.name}>
                            {p.name}
                          </option>
                        ))}
                      </>
                    )}
                  </select>
                </div>
              </div>

              <div className="checkout-row-2col">
                <div>
                  <label className="checkout-label">
                    City / Municipality <span className="required">*</span>
                  </label>
                  <select
                    name="city"
                    className="checkout-input"
                    value={formData.city}
                    onChange={(e) => handleCityChange(e, "shipping")}
                    disabled={
                      !formData.region ||
                      (shippingAddr.provinces.length > 0 &&
                        !formData.province)
                    }
                  >
                    <option value="">Select City...</option>
                    {shippingAddr.cities.map((c) => (
                      <option key={c.code} value={c.name}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="checkout-label">
                    Barangay <span className="required">*</span>
                  </label>
                  <select
                    name="barangay"
                    className="checkout-input"
                    value={formData.barangay}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        barangay: e.target.value,
                      }))
                    }
                    disabled={!formData.city}
                  >
                    <option value="">Select Barangay...</option>
                    {shippingAddr.barangays.map((b) => (
                      <option key={b.code} value={b.name}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <label className="checkout-label">
                Street / House No. / Lot / Blk / Phase{" "}
                <span className="required">*</span>
              </label>
              <input
                name="street"
                className="checkout-textarea"
                placeholder="Enter street, house no., building, etc."
                rows="2"
                value={formData.street}
                onChange={handleInputChange}
              />

              <label className="checkout-checkbox">
                <input
                  type="checkbox"
                  name="sameAddress"
                  checked={formData.sameAddress}
                  onChange={handleInputChange}
                />
                <span>Billing address is the same as shipping</span>
              </label>

              {!formData.sameAddress && (
                <>
                  <h3
                    className="checkout-section-title"
                    style={{ marginTop: "20px", marginBottom: "15px" }}
                  >
                    Billing Address
                  </h3>
                  <div className="checkout-row-2col">
                    <div>
                      <label className="checkout-label">
                        Billing Region <span className="required">*</span>
                      </label>
                      <select
                        name="billing_region"
                        className="checkout-input"
                        value={formData.billing_region}
                        onChange={(e) => handleRegionChange(e, "billing")}
                      >
                        <option value="">Select Region...</option>
                        {billingAddr.regions.map((r) => (
                          <option key={r.code} value={r.name}>
                            {r.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="checkout-label">
                        Billing Province <span className="required">*</span>
                      </label>
                      <select
                        name="billing_province"
                        className="checkout-input"
                        value={formData.billing_province}
                        onChange={(e) => handleProvinceChange(e, "billing")}
                        disabled={
                          !formData.billing_region ||
                          billingAddr.provinces.length === 0
                        }
                      >
                        {billingAddr.provinces.length === 0 ? (
                          <option value="N/A">N/A (No provinces)</option>
                        ) : (
                          <>
                            <option value="">Select Province...</option>
                            {billingAddr.provinces.map((p) => (
                              <option key={p.code} value={p.name}>
                                {p.name}
                              </option>
                            ))}
                          </>
                        )}
                      </select>
                    </div>
                  </div>

                  <div className="checkout-row-2col">
                    <div>
                      <label className="checkout-label">
                        Billing City / Municipality{" "}
                        <span className="required">*</span>
                      </label>
                      <select
                        name="billing_city"
                        className="checkout-input"
                        value={formData.billing_city}
                        onChange={(e) => handleCityChange(e, "billing")}
                        disabled={
                          !formData.billing_region ||
                          (billingAddr.provinces.length > 0 &&
                            !formData.billing_province)
                        }
                      >
                        <option value="">Select City...</option>
                        {billingAddr.cities.map((c) => (
                          <option key={c.code} value={c.name}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="checkout-label">
                        Billing Barangay <span className="required">*</span>
                      </label>
                      <select
                        name="billing_barangay"
                        className="checkout-input"
                        value={formData.billing_barangay}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            billing_barangay: e.target.value,
                          }))
                        }
                        disabled={!formData.billing_city}
                      >
                        <option value="">Select Barangay...</option>
                        {billingAddr.barangays.map((b) => (
                          <option key={b.code} value={b.name}>
                            {b.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <label className="checkout-label">
                    Billing Street / House No. / Lot / Blk / Phase{" "}
                    <span className="required">*</span>
                  </label>
                  <textarea
                    name="billing_street"
                    className="checkout-textarea"
                    placeholder="Enter street, house no., building, etc."
                    rows="2"
                    value={formData.billing_street}
                    onChange={handleInputChange}
                  />
                </>
              )}
            </div>

            <div className="checkout-actions">
              <button
                className="checkout-btn-cancel"
                type="button"
                onClick={onClose}
              >
                Cancel
              </button>
              <button
                className="checkout-btn-next"
                type="button"
                onClick={handleAddressNext}
              >
                Next
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: REVIEW */}
        {step === "review" && (
          <div className="checkout-content">
            <div className="checkout-progress">Step 2 of 3: Review Order</div>

            {error && <div className="checkout-error">{error}</div>}

            <div className="checkout-review">
              <div className="review-section">
                <h3>Order Items</h3>
                {cartItems.map((item) => (
                  <div key={item.id} className="review-item">
                    <div className="review-item-name">
                      {item.title}{" "}
                      <span className="review-qty">x{item.qty}</span>
                    </div>
                    <div className="review-item-price">
                      {formatPeso(item.price * item.qty)}
                    </div>
                  </div>
                ))}
              </div>

              <div className="review-divider" />

              <div className="review-summary">
                <div className="review-row">
                  <span>Subtotal</span>
                  <span>{formatPeso(subtotal)}</span>
                </div>
                <div className="review-total">
                  <span>Total Amount</span>
                  <span>{formatPeso(total)}</span>
                </div>
              </div>

              <div className="review-divider" />

              <div className="review-section">
                <h3>Shipping Address</h3>
                <p className="review-address">
                  {getCombinedAddress(formData, "shipping")}
                </p>
              </div>

              {!formData.sameAddress && (
                <div className="review-section">
                  <h3>Billing Address</h3>
                  <p className="review-address">
                    {getCombinedAddress(formData, "billing")}
                  </p>
                </div>
              )}
            </div>

            <div className="checkout-actions">
              <button
                className="checkout-btn-cancel"
                type="button"
                onClick={() => setStep("address")}
                disabled={loading}
              >
                Back
              </button>
              <button
                className="checkout-btn-place"
                type="button"
                onClick={handlePlaceOrder}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <FaSpinner className="spinner" /> Placing Order...
                  </>
                ) : (
                  "Place Order"
                )}
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: SUCCESS */}
        {step === "success" && (
          <div className="checkout-content checkout-success">
            <div className="success-icon">
              <FaCheckCircle />
            </div>
            <h2 className="success-title">Order Placed Successfully!</h2>
            <p className="success-message">
              Order ID: <strong>#{orderData?.id}</strong>
            </p>
            <p className="success-amount">
              Total: <strong>{formatPeso(orderData?.total)}</strong>
            </p>
            <p className="success-note">
              Your order was sent to admin for approval. You can pay after the
              design is approved.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default CheckoutModal;
