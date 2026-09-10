import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Linking,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { API_BASE_URL } from "../config";
import { COLORS } from "../theme";

const MAX_REVIEWS = 5;

const safeArray = (value) => {
  if (Array.isArray(value)) return value;
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
};

const getMediaUrl = (value) => {
  if (!value) return null;
  const url = String(value).trim();
  if (!url) return null;
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  return `${API_BASE_URL}${url.startsWith("/") ? "" : "/"}${url}`;
};

const formatReviewDate = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const StarRow = ({ value = 0, size = 17 }) => (
  <View style={styles.starRow}>
    {[1, 2, 3, 4, 5].map((star) => (
      <Ionicons
        key={star}
        name={star <= Number(value) ? "star" : "star-outline"}
        size={size}
        color="#F5B301"
      />
    ))}
  </View>
);

export default function ProductReviewsMobile({
  productId,
  productName,
  onWriteReview,
}) {
  const [loading, setLoading] = useState(true);
  const [reviews, setReviews] = useState([]);
  const [averageRating, setAverageRating] = useState(0);
  const [totalReviews, setTotalReviews] = useState(0);
  const [error, setError] = useState("");
  const [reviewableOrderItemId, setReviewableOrderItemId] = useState(null);

  const loadReviews = useCallback(async () => {
    if (!productId) return;

    setLoading(true);
    setError("");

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/products/${productId}/reviews?limit=${MAX_REVIEWS}&page=1`,
        { headers: { Accept: "application/json" } }
      );

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data?.message || `HTTP ${response.status}`);
      }

      setReviews(Array.isArray(data?.reviews) ? data.reviews : []);
      setAverageRating(Number(data?.averageRating) || 0);
      setTotalReviews(Number(data?.totalReviews) || 0);
    } catch (err) {
      console.error("[ProductReviewsMobile] load reviews:", err);
      setError(err?.message || "Unable to load reviews.");
    } finally {
      setLoading(false);
    }
  }, [productId]);

  const loadReviewableOrderItem = useCallback(async () => {
    try {
      const userStr = await AsyncStorage.getItem("user");
      if (!userStr || !productId) {
        setReviewableOrderItemId(null);
        return;
      }

      const user = JSON.parse(userStr);
      if (!user?.id) return;

      const response = await fetch(
        `${API_BASE_URL}/api/products/${productId}/reviewable-order-items?userId=${encodeURIComponent(user.id)}`,
        { headers: { Accept: "application/json" } }
      );

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setReviewableOrderItemId(null);
        return;
      }

      const items = Array.isArray(data?.items) ? data.items : [];
      setReviewableOrderItemId(items[0]?.id || null);
    } catch (err) {
      console.warn("[ProductReviewsMobile] reviewable item:", err?.message || err);
      setReviewableOrderItemId(null);
    }
  }, [productId]);

  useEffect(() => {
    loadReviews();
    loadReviewableOrderItem();
  }, [loadReviews, loadReviewableOrderItem]);

  const handleWriteReview = () => {
    if (!reviewableOrderItemId) return;

    onWriteReview?.({
      orderItemId: reviewableOrderItemId,
      productId,
      productName,
    });
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.title}>Customer Reviews</Text>
          <Text style={styles.subtitle}>
            {totalReviews === 0
              ? "No reviews yet"
              : `${totalReviews} ${totalReviews === 1 ? "review" : "reviews"}`}
          </Text>
        </View>

        {reviewableOrderItemId && (
          <TouchableOpacity
            style={styles.writeButton}
            onPress={handleWriteReview}
            activeOpacity={0.85}
          >
            <Ionicons name="create-outline" size={17} color="#fff" />
            <Text style={styles.writeButtonText}>Review</Text>
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <View style={styles.centerState}>
          <ActivityIndicator size="small" color={COLORS.primary} />
          <Text style={styles.stateText}>Loading reviews...</Text>
        </View>
      ) : error ? (
        <View style={styles.stateCard}>
          <Ionicons name="alert-circle-outline" size={22} color="#b91c1c" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={loadReviews} style={styles.retryButton}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <View style={styles.summaryCard}>
            <View style={styles.ratingNumberWrap}>
              <Text style={styles.ratingNumber}>{averageRating.toFixed(1)}</Text>
              <StarRow value={averageRating} size={16} />
              <Text style={styles.ratingCount}>
                {totalReviews} {totalReviews === 1 ? "rating" : "ratings"}
              </Text>
            </View>

            <View style={styles.ratingDescription}>
              <Text style={styles.ratingTitle}>Overall Rating</Text>
              <Text style={styles.ratingHint}>
                Ratings from customers who completed their orders.
              </Text>
            </View>
          </View>

          {reviews.length === 0 ? (
            <View style={styles.emptyCard}>
              <Ionicons name="chatbubble-ellipses-outline" size={28} color="#9ca3af" />
              <Text style={styles.emptyTitle}>No reviews yet</Text>
              <Text style={styles.emptyText}>
                Be the first customer to share your experience.
              </Text>
            </View>
          ) : (
            reviews.map((review, index) => {
              const images = safeArray(review?.images);
              const videos = safeArray(review?.videos);

              return (
                <View key={review?.id || `${review?.createdAt || "review"}-${index}`} style={styles.reviewCard}>
                  <View style={styles.reviewHeader}>
                    <View style={styles.avatar}>
                      <Text style={styles.avatarText}>
                        {String(review?.customerName || "C").charAt(0).toUpperCase()}
                      </Text>
                    </View>

                    <View style={styles.reviewerInfo}>
                      <Text style={styles.reviewerName} numberOfLines={1}>
                        {review?.customerName || "Customer"}
                      </Text>
                      <StarRow value={review?.stars} size={14} />
                    </View>

                    <Text style={styles.dateText}>
                      {formatReviewDate(review?.createdAt)}
                    </Text>
                  </View>

                  {!!review?.comment && (
                    <Text style={styles.comment}>{review.comment}</Text>
                  )}

                  {(images.length > 0 || videos.length > 0) && (
                    <View style={styles.mediaRow}>
                      {images.slice(0, 5).map((image, mediaIndex) => {
                        const uri = getMediaUrl(image);
                        if (!uri) return null;
                        return (
                          <TouchableOpacity
                            key={`image-${mediaIndex}`}
                            style={styles.mediaItem}
                            activeOpacity={0.9}
                            onPress={() => Linking.openURL(uri)}
                          >
                            <Image source={{ uri }} style={styles.mediaImage} />
                          </TouchableOpacity>
                        );
                      })}

                      {videos.slice(0, 5).map((video, mediaIndex) => {
                        const uri = getMediaUrl(video);
                        if (!uri) return null;
                        return (
                          <TouchableOpacity
                            key={`video-${mediaIndex}`}
                            style={[styles.mediaItem, styles.videoItem]}
                            activeOpacity={0.9}
                            onPress={() => Linking.openURL(uri)}
                          >
                            <Ionicons name="play-circle" size={34} color="#fff" />
                            <Text style={styles.videoLabel}>Video</Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  )}
                </View>
              );
            })
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 18,
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  title: {
    fontFamily: "Poppins_700Bold",
    fontSize: 18,
    color: "#111827",
  },
  subtitle: {
    marginTop: 2,
    fontFamily: "Poppins_400Regular",
    fontSize: 12,
    color: "#6b7280",
  },
  writeButton: {
    minHeight: 38,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: COLORS.primary,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  writeButtonText: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 12,
    color: "#fff",
  },
  summaryCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    backgroundColor: "#fff",
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  ratingNumberWrap: {
    alignItems: "center",
    minWidth: 92,
  },
  ratingNumber: {
    fontFamily: "Poppins_700Bold",
    fontSize: 28,
    color: "#111827",
    lineHeight: 34,
  },
  starRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 1,
  },
  ratingCount: {
    marginTop: 3,
    fontFamily: "Poppins_400Regular",
    fontSize: 10,
    color: "#6b7280",
  },
  ratingDescription: {
    flex: 1,
    paddingLeft: 12,
  },
  ratingTitle: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 13,
    color: "#374151",
  },
  ratingHint: {
    marginTop: 3,
    fontFamily: "Poppins_400Regular",
    fontSize: 11,
    lineHeight: 16,
    color: "#6b7280",
  },
  reviewCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    backgroundColor: "#fff",
    padding: 14,
    marginBottom: 10,
  },
  reviewHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#dcfce7",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontFamily: "Poppins_700Bold",
    fontSize: 15,
    color: COLORS.primary,
  },
  reviewerInfo: {
    flex: 1,
    paddingHorizontal: 9,
  },
  reviewerName: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 12,
    color: "#111827",
    marginBottom: 2,
  },
  dateText: {
    fontFamily: "Poppins_400Regular",
    fontSize: 10,
    color: "#9ca3af",
  },
  comment: {
    marginTop: 11,
    fontFamily: "Poppins_400Regular",
    fontSize: 12,
    lineHeight: 18,
    color: "#374151",
  },
  mediaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 12,
  },
  mediaItem: {
    width: 64,
    height: 64,
    borderRadius: 9,
    overflow: "hidden",
    backgroundColor: "#f3f4f6",
  },
  mediaImage: {
    width: "100%",
    height: "100%",
  },
  videoItem: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#374151",
  },
  videoLabel: {
    marginTop: 1,
    fontFamily: "Poppins_500Medium",
    fontSize: 8,
    color: "#fff",
  },
  emptyCard: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 28,
    paddingHorizontal: 20,
    borderRadius: 14,
    backgroundColor: "#f9fafb",
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  emptyTitle: {
    marginTop: 8,
    fontFamily: "Poppins_600SemiBold",
    fontSize: 13,
    color: "#374151",
  },
  emptyText: {
    marginTop: 3,
    textAlign: "center",
    fontFamily: "Poppins_400Regular",
    fontSize: 11,
    color: "#6b7280",
  },
  centerState: {
    minHeight: 100,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  stateText: {
    fontFamily: "Poppins_400Regular",
    fontSize: 11,
    color: "#6b7280",
  },
  stateCard: {
    padding: 14,
    borderRadius: 14,
    backgroundColor: "#fef2f2",
    borderWidth: 1,
    borderColor: "#fecaca",
    alignItems: "center",
  },
  errorText: {
    marginTop: 6,
    textAlign: "center",
    fontFamily: "Poppins_400Regular",
    fontSize: 11,
    color: "#991b1b",
  },
  retryButton: {
    marginTop: 9,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: "#fee2e2",
  },
  retryText: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 11,
    color: "#991b1b",
  },
});
