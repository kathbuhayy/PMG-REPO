import React, { useEffect, useState, useCallback } from "react";
import { buildApiUrl } from "../config/api";

// Read-only: customers submit reviews from My Orders once an order is
// marked completed (see the "Rate your order" flow in User-orders.js).
// This just shows the aggregate rating and the existing review list.
function ProductReviews({ productId }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchReviews = useCallback(() => {
    if (!productId) return;
    setLoading(true);
    fetch(buildApiUrl(`/api/products/${productId}/reviews`))
      .then((r) => r.json())
      .then((json) => setData(json))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [productId]);

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  if (loading) return null;

  const hasReviews = data && data.totalReviews > 0;

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
