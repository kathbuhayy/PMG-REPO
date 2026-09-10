import React, { useEffect, useState, useCallback } from "react";
import { buildApiUrl } from "../config/api";

function getCurrentUser() {
  try {
    return JSON.parse(localStorage.getItem("user")) || null;
  } catch {
    return null;
  }
}

function StarPicker({ value, onChange }) {
  return (
    <div style={{ display: "flex", gap: 4 }}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          aria-label={`${n} star${n > 1 ? "s" : ""}`}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            fontSize: 26,
            lineHeight: 1,
            color: n <= value ? "#f5a623" : "#cbd5e1",
            padding: 2,
          }}
        >
          ★
        </button>
      ))}
    </div>
  );
}

function ProductReviews({ productId }) {
  const currentUser = getCurrentUser();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const [reviewableItems, setReviewableItems] = useState([]);
  const [selectedItemId, setSelectedItemId] = useState("");
  const [showForm, setShowForm] = useState(false);

  const [stars, setStars] = useState(0);
  const [comment, setComment] = useState("");
  const [files, setFiles] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [formError, setFormError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const fetchReviews = useCallback(() => {
    if (!productId) return;
    setLoading(true);
    fetch(buildApiUrl(`/api/products/${productId}/reviews`))
      .then((r) => r.json())
      .then((json) => setData(json))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [productId]);

  const fetchReviewableItems = useCallback(() => {
    if (!productId || !currentUser?.id) {
      setReviewableItems([]);
      return;
    }
    fetch(
      buildApiUrl(
        `/api/products/${productId}/reviewable-order-items?userId=${currentUser.id}`
      )
    )
      .then((r) => r.json())
      .then((json) => {
        const items = json.items || [];
        setReviewableItems(items);
        setSelectedItemId(items[0]?.id ? String(items[0].id) : "");
      })
      .catch(() => {});
  }, [productId, currentUser?.id]);

  useEffect(() => {
    fetchReviews();
    fetchReviewableItems();
  }, [fetchReviews, fetchReviewableItems]);

  const handleFilesChange = (e) => {
    const picked = Array.from(e.target.files || []);
    setFiles((prev) => [...prev, ...picked].slice(0, 5));
    e.target.value = "";
  };

  const removeFile = (idx) => {
    setFiles((prev) => prev.filter((_, i) => i !== idx));
  };

  const resetForm = () => {
    setStars(0);
    setComment("");
    setFiles([]);
    setFormError("");
    setShowForm(false);
  };

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    if (!selectedItemId || !stars) return;

    setSubmitting(true);
    setFormError("");

    try {
      let imageUrls = [];
      let videoUrls = [];

      if (files.length > 0) {
        setUploadingMedia(true);
        const formData = new FormData();
        files.forEach((file) => formData.append("files", file));

        const uploadRes = await fetch(buildApiUrl("/api/reviews/upload"), {
          method: "POST",
          body: formData,
        });
        const uploadData = await uploadRes.json();

        if (!uploadRes.ok) {
          throw new Error(uploadData.message || "Failed to upload media");
        }

        imageUrls = uploadData.imageUrls || [];
        videoUrls = uploadData.videoUrls || [];
        setUploadingMedia(false);
      }

      const res = await fetch(
        buildApiUrl(`/api/order-items/${selectedItemId}/review`),
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: currentUser.id,
            stars,
            comment,
            images: imageUrls,
            videos: videoUrls,
          }),
        }
      );

      const resData = await res.json();

      if (!res.ok) {
        throw new Error(resData.message || "Failed to submit review.");
      }

      resetForm();
      setSuccessMsg("Thanks for your review!");
      fetchReviews();
      fetchReviewableItems();

      setTimeout(() => setSuccessMsg(""), 4000);
    } catch (err) {
      setFormError(err.message || "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
      setUploadingMedia(false);
    }
  };

  if (loading) return null;

  const hasReviews = data && data.totalReviews > 0;
  const canReview = reviewableItems.length > 0;

  return (
    <div className="pd-pmg-simple-accordion" style={{ padding: "16px 20px" }}>
      {hasReviews ? (
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
          <span style={{ fontSize: 20, color: "#f5a623" }}>★</span>
          <strong style={{ fontSize: 18 }}>{data.averageRating.toFixed(1)}</strong>
          <span style={{ color: "#64748b", fontSize: 13 }}>
            ({data.totalReviews} review{data.totalReviews === 1 ? "" : "s"})
          </span>
        </div>
      ) : (
        <p style={{ margin: "0 0 14px", color: "#64748b", fontSize: 13 }}>
          No reviews yet for this product.
        </p>
      )}

      {successMsg && (
        <div
          style={{
            background: "#ecfdf5",
            border: "1px solid #6ee7b7",
            color: "#047857",
            borderRadius: 8,
            padding: "8px 12px",
            fontSize: 13,
            marginBottom: 14,
          }}
        >
          {successMsg}
        </div>
      )}

      {canReview && !showForm && (
        <button
          type="button"
          onClick={() => setShowForm(true)}
          style={{
            marginBottom: 16,
            padding: "8px 16px",
            borderRadius: 8,
            border: "1px solid #16a34a",
            background: "#fff",
            color: "#16a34a",
            fontWeight: 600,
            fontSize: 13,
            cursor: "pointer",
          }}
        >
          ✎ Write a Review
        </button>
      )}

      {canReview && showForm && (
        <form
          onSubmit={handleSubmitReview}
          style={{
            border: "1px solid #e2e8f0",
            borderRadius: 10,
            padding: 16,
            marginBottom: 20,
            background: "#f8fafc",
          }}
        >
          <h4 style={{ margin: "0 0 12px", fontSize: 14 }}>Write your review</h4>

          {reviewableItems.length > 1 && (
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: "block", fontSize: 12, color: "#475569", marginBottom: 4 }}>
                Which purchase are you reviewing?
              </label>
              <select
                value={selectedItemId}
                onChange={(e) => setSelectedItemId(e.target.value)}
                style={{ width: "100%", padding: "6px 8px", borderRadius: 6, border: "1px solid #cbd5e1" }}
              >
                {reviewableItems.map((it) => (
                  <option key={it.id} value={it.id}>
                    Order #{it.orderId} — Qty {it.quantity} —{" "}
                    {new Date(it.createdAt).toLocaleDateString("en-PH", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div style={{ marginBottom: 12 }}>
            <label style={{ display: "block", fontSize: 12, color: "#475569", marginBottom: 4 }}>
              Your rating
            </label>
            <StarPicker value={stars} onChange={setStars} />
          </div>

          <div style={{ marginBottom: 12 }}>
            <label style={{ display: "block", fontSize: 12, color: "#475569", marginBottom: 4 }}>
              Comments (optional)
            </label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={4}
              placeholder="What did you think of this product?"
              style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid #cbd5e1", fontFamily: "inherit" }}
            />
          </div>

          <div style={{ marginBottom: 12 }}>
            <label style={{ display: "block", fontSize: 12, color: "#475569", marginBottom: 4 }}>
              Add photos or videos (optional, up to 5)
            </label>
            <input
              type="file"
              accept="image/*,video/*"
              multiple
              onChange={handleFilesChange}
            />
          </div>

          {files.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
              {files.map((file, idx) => (
                <div key={idx} style={{ position: "relative" }}>
                  {file.type.startsWith("video/") ? (
                    <video
                      src={URL.createObjectURL(file)}
                      style={{ width: 64, height: 64, objectFit: "cover", borderRadius: 6 }}
                      muted
                    />
                  ) : (
                    <img
                      src={URL.createObjectURL(file)}
                      alt={`preview ${idx}`}
                      style={{ width: 64, height: 64, objectFit: "cover", borderRadius: 6 }}
                    />
                  )}
                  <button
                    type="button"
                    onClick={() => removeFile(idx)}
                    style={{
                      position: "absolute",
                      top: -6,
                      right: -6,
                      width: 20,
                      height: 20,
                      borderRadius: "50%",
                      border: "none",
                      background: "#ef4444",
                      color: "#fff",
                      cursor: "pointer",
                      fontSize: 12,
                      lineHeight: "20px",
                    }}
                    aria-label="Remove file"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}

          {formError && (
            <div style={{ color: "#dc2626", fontSize: 13, marginBottom: 12 }}>
              {formError}
            </div>
          )}

          <div style={{ display: "flex", gap: 8 }}>
            <button
              type="submit"
              disabled={submitting || !stars}
              style={{
                padding: "8px 18px",
                borderRadius: 8,
                border: "none",
                background: !stars ? "#94a3b8" : "#16a34a",
                color: "#fff",
                fontWeight: 600,
                fontSize: 13,
                cursor: !stars ? "not-allowed" : "pointer",
              }}
            >
              {uploadingMedia
                ? "Uploading media..."
                : submitting
                ? "Submitting..."
                : "Submit review"}
            </button>

            <button
              type="button"
              onClick={resetForm}
              disabled={submitting}
              style={{
                padding: "8px 18px",
                borderRadius: 8,
                border: "1px solid #cbd5e1",
                background: "#fff",
                color: "#475569",
                fontWeight: 600,
                fontSize: 13,
                cursor: "pointer",
              }}
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {hasReviews && (
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {data.reviews.map((r) => (
          <div
            key={r.id}
            style={{
              paddingBottom: 12,
              borderBottom: "1px solid #e2e8f0",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <strong style={{ fontSize: 13 }}>{r.customerName}</strong>
              <span style={{ color: "#f5a623", fontSize: 13, letterSpacing: 1 }}>
                {"★".repeat(r.stars)}
                {"☆".repeat(5 - r.stars)}
              </span>
            </div>
            {r.comment && (
              <p style={{ margin: "6px 0 0", fontSize: 13, color: "#475569" }}>
                {r.comment}
              </p>
            )}
            {(r.images?.length > 0 || r.videos?.length > 0) && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
                {r.images?.map((src, i) => (
                  <img
                    key={`img-${i}`}
                    src={src}
                    alt={`Review photo ${i + 1}`}
                    style={{ width: 72, height: 72, objectFit: "cover", borderRadius: 6, cursor: "pointer" }}
                    onClick={() => window.open(src, "_blank")}
                  />
                ))}
                {r.videos?.map((src, i) => (
                  <video
                    key={`vid-${i}`}
                    src={src}
                    controls
                    style={{ width: 96, height: 72, objectFit: "cover", borderRadius: 6 }}
                  />
                ))}
              </div>
            )}
            <p style={{ margin: "4px 0 0", fontSize: 11, color: "#94a3b8" }}>
              {new Date(r.createdAt).toLocaleDateString("en-PH", {
                year: "numeric",
                month: "short",
                day: "numeric",
              })}
            </p>
          </div>
        ))}
      </div>
      )}
    </div>
  );
}

export default ProductReviews;