import React, { useEffect, useState } from "react";
import { buildApiUrl } from "../config/api";

function ProductReviews({ productId }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!productId) return;
    let cancelled = false;

    setLoading(true);
    fetch(buildApiUrl(`/api/products/${productId}/reviews`))
      .then((r) => r.json())
      .then((json) => {
        if (!cancelled) setData(json);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [productId]);

  if (loading) return null;
  if (!data || data.totalReviews === 0) {
    return (
      <div className="pd-pmg-simple-accordion" style={{ padding: "16px 20px" }}>
        <p style={{ margin: 0, color: "#64748b", fontSize: 13 }}>
          No reviews yet for this product.
        </p>
      </div>
    );
  }

  return (
    <div className="pd-pmg-simple-accordion" style={{ padding: "16px 20px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
        <span style={{ fontSize: 20, color: "#f5a623" }}>★</span>
        <strong style={{ fontSize: 18 }}>{data.averageRating.toFixed(1)}</strong>
        <span style={{ color: "#64748b", fontSize: 13 }}>
          ({data.totalReviews} review{data.totalReviews === 1 ? "" : "s"})
        </span>
      </div>

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
    </div>
  );
}

export default ProductReviews;