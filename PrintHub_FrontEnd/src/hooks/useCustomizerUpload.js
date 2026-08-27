// src/hooks/useCustomizerUpload.js
import { useState, useCallback } from "react";
import { buildApiUrl } from "../config/api";
import { saveGuestDesign } from "../utils/guestDesigns";
import { assessImageResolution } from "../utils/dpiCheck";

const GUEST_GEN_KEY = "ai_guest_generations";
const GUEST_LIMIT = 3;

function getGuestGenCount() {
  try {
    return parseInt(localStorage.getItem(GUEST_GEN_KEY) || "0", 10) || 0;
  } catch {
    return 0;
  }
}

function incrementGuestGenCount() {
  try {
    const v = getGuestGenCount() + 1;
    localStorage.setItem(GUEST_GEN_KEY, String(v));
  } catch {
    /* ignore */
  }
}

function getUserId() {
  try {
    const u = localStorage.getItem("user");
    if (u) return JSON.parse(u).id;
  } catch {
    /* ignore */
  }
  return parseInt(localStorage.getItem("userId"), 10) || null;
}
function dataURLtoFile(dataurl, filename) {
  try {
    const arr = dataurl.split(",");
    const mime = arr[0].match(/:(.*?);/)[1];
    const bstr = atob(arr[arr.length - 1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new File([u8arr], filename, { type: mime });
  } catch (e) {
    console.error("Failed to parse data URL", e);
    return null;
  }
}

export function useCustomizerUpload(
  productLabel = "Product",
  initialGallery = [],
) {
  const [gallery, setGallery] = useState(initialGallery);
  const [selectedGalleryId, setSelectedGalleryId] = useState(null);
  const [uploadError, setUploadError] = useState("");
  const [uploading, setUploading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState("");
  const [resolutionResults, setResolutionResults] = useState({});

  // Convert file to Base64 asynchronously if it fits within safe localStorage limits
  const convertFileToBase64 = (file, callback) => {
    if (file.size > 1.5 * 1024 * 1024) return; // 1.5MB safe limit for localStorage
    const reader = new FileReader();
    reader.onloadend = () => callback(reader.result);
    reader.readAsDataURL(file);
  };

  const handleFileChange = useCallback((e) => {
    const file = e.target.files?.[0];
    if (!file) return null;

    if (file.size > 5 * 1024 * 1024) {
      setUploadError("File must be 5MB or smaller.");
      return null;
    }

    const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!allowed.includes(file.type)) {
      setUploadError("Only JPG, PNG, WEBP, and GIF images are allowed.");
      return null;
    }

    setUploadError("");
    const url = URL.createObjectURL(file);
    const id = `upload-${Date.now()}`;
    const item = {
      id,
      url,
      originalBlobUrl: url,
      label: file.name.slice(0, 30),
      file,
    };

    setGallery((prev) => [...prev, item]);
    setSelectedGalleryId(id);

    convertFileToBase64(file, (base64Url) => {
      setGallery((prev) =>
        prev.map((g) => (g.id === id ? { ...g, url: base64Url } : g)),
      );
    });

    // Sub-Module 5.1/5.2 — check resolution in the background, non-blocking.
    // Result is looked up by gallery item id via resolutionResults.
    assessImageResolution(file)
      .then((result) => {
        setResolutionResults((prev) => ({ ...prev, [id]: result }));
      })
      .catch(() => {
        // Silently skip — a failed resolution check shouldn't block upload.
      });

    return item;
  }, []);

  const handleGenerate = useCallback(
    async (prompt, activeZone) => {
      if (!prompt.trim()) {
        setGenError("Please enter a prompt.");
        return null;
      }

      const isGuest = !getUserId();
      if (isGuest && getGuestGenCount() >= GUEST_LIMIT) {
        setGenError(
          "Guests are limited to 3 AI generations. Please sign up to continue.",
        );
        return null;
      }

      setGenerating(true);
      setGenError("");

      try {
        // Purely prompt for the graphic design without item context to avoid confusing the AI
        const fullPrompt = `${prompt.trim()}, flat graphic design, transparent background, high quality`;

        const userId = getUserId();
        const res = await fetch(buildApiUrl("/api/builder/generate-image"), {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(userId ? { "X-User-Id": String(userId) } : {}),
          },
          body: JSON.stringify({ prompt: fullPrompt, imageSize: "square_hd" }),
        });
        const data = await res.json();
        if (res.status === 429) {
          setGenError(data.message || "Please wait before generating again.");
          return null;
        }
        if (!res.ok) throw new Error(data.message || "Generation failed");

        const imageUrl = data.imageUrl || data.url;
        if (!imageUrl) throw new Error("No image returned. Please try again.");

        if (isGuest) {
          incrementGuestGenCount();
          saveGuestDesign({
            id: `gen-${Date.now()}`,
            imageUrl,
            prompt: prompt.trim(),
            productLabel,
            generatedAt: new Date().toISOString(),
          });
        }

        const id = `gen-${Date.now()}`;
        const item = {
          id,
          url: imageUrl,
          label: prompt.trim().slice(0, 30),
        };
        setGallery((prev) => [...prev, item]);
        setSelectedGalleryId(id);
        return item;
      } catch (err) {
        setGenError(err.message || "Something went wrong. Please try again.");
        return null;
      } finally {
        setGenerating(false);
      }
    },
    [productLabel],
  );

  const uploadUsedImages = useCallback(
    async (zoneDesigns) => {
      setUploading(true);
      setUploadError("");

      const userId = getUserId();
      const updatedZones = { ...zoneDesigns };

      try {
        for (const [zoneId, zoneData] of Object.entries(updatedZones)) {
          if (!zoneData?.imageUrl) continue;
          const isBlob = zoneData.imageUrl.startsWith("blob:");
          const isData = zoneData.imageUrl.startsWith("data:");

          if (isBlob || isData) {
            const galleryItem = gallery.find(
              (g) =>
                g.url === zoneData.imageUrl ||
                g.originalBlobUrl === zoneData.imageUrl,
            );
            let fileToUpload = galleryItem?.file;

            if (fileToUpload && !(fileToUpload instanceof Blob)) {
              fileToUpload = null;
            }

            if (!fileToUpload && isData) {
              try {
                const filename = galleryItem?.label
                  ? `${galleryItem.label}.png`
                  : `design-${Date.now()}.png`;

                fileToUpload = dataURLtoFile(zoneData.imageUrl, filename);
              } catch (err) {
                console.error("Failed to reconstruct file:", err);
              }
            }

            if (fileToUpload) {
              const formData = new FormData();
              formData.append("file", fileToUpload);

              const res = await fetch(buildApiUrl("/api/builder/upload"), {
                method: "POST",
                headers: userId ? { "X-User-Id": String(userId) } : {},
                body: formData,
              });

              const data = await res.json();
              if (!res.ok) throw new Error(data.message || "Upload failed");

              updatedZones[zoneId] = {
                ...zoneData,
                imageUrl: data.url,
              };
            }
          } else if (
            userId &&
            (zoneData.imageUrl.includes("pollinations.ai") ||
              zoneData.imageUrl.includes("fal.run") ||
              zoneData.imageUrl.includes("fal.media"))
          ) {
            // Late upload of remote AI generated design to Supabase (non-fatal fallback)
            try {
              const res = await fetch(buildApiUrl("/api/builder/upload-url"), {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  "X-User-Id": String(userId),
                },
                body: JSON.stringify({ imageUrl: zoneData.imageUrl }),
              });
              const data = await res.json();

              if (res.ok && data.url) {
                updatedZones[zoneId] = {
                  ...zoneData,
                  imageUrl: data.url,
                };
              } else {
                console.warn(
                  "Supabase late upload failed (non-fatal):",
                  data.message,
                );
              }
            } catch (uploadErr) {
              console.warn(
                "Supabase late upload failed (non-fatal):",
                uploadErr.message,
              );
            }
          }
        }
        return updatedZones;
      } catch (err) {
        setUploadError(err.message || "Upload failed. Please try again.");
        throw err;
      } finally {
        setUploading(false);
      }
    },
    [gallery],
  );

  // Resolves a single image URL to a permanent hosted URL (extracted
  // from uploadUsedImages so both the legacy single-image-per-zone
  // shape and the new multi-layer shape can share this logic).
  const resolveImageUrl = useCallback(
    async (imageUrl) => {
      const userId = getUserId();
      const isBlob = imageUrl.startsWith("blob:");
      const isData = imageUrl.startsWith("data:");

      if (isBlob || isData) {
        const galleryItem = gallery.find(
          (g) => g.url === imageUrl || g.originalBlobUrl === imageUrl,
        );
        let fileToUpload = galleryItem?.file;
        if (fileToUpload && !(fileToUpload instanceof Blob)) fileToUpload = null;

        if (!fileToUpload && isData) {
          try {
            const filename = galleryItem?.label
              ? `${galleryItem.label}.png`
              : `design-${Date.now()}.png`;
            fileToUpload = dataURLtoFile(imageUrl, filename);
          } catch (err) {
            console.error("Failed to reconstruct file:", err);
          }
        }

        if (fileToUpload) {
          const formData = new FormData();
          formData.append("file", fileToUpload);
          const res = await fetch(buildApiUrl("/api/builder/upload"), {
            method: "POST",
            headers: userId ? { "X-User-Id": String(userId) } : {},
            body: formData,
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.message || "Upload failed");
          return data.url;
        }
        return imageUrl;
      }

      if (
        userId &&
        (imageUrl.includes("pollinations.ai") ||
          imageUrl.includes("fal.run") ||
          imageUrl.includes("fal.media"))
      ) {
        try {
          const res = await fetch(buildApiUrl("/api/builder/upload-url"), {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-User-Id": String(userId),
            },
            body: JSON.stringify({ imageUrl }),
          });
          const data = await res.json();
          if (res.ok && data.url) return data.url;
          console.warn("Supabase late upload failed (non-fatal):", data.message);
        } catch (uploadErr) {
          console.warn("Supabase late upload failed (non-fatal):", uploadErr.message);
        }
      }

      return imageUrl;
    },
    [gallery],
  );

  // Multi-layer variant: walks every zone's layer stack and resolves
  // every image-kind layer's imageUrl. Text layers pass through untouched.
  const uploadUsedImagesInLayers = useCallback(
    async (zoneLayers) => {
      setUploading(true);
      setUploadError("");
      try {
        const updated = {};
        for (const [zoneId, layers] of Object.entries(zoneLayers)) {
          const nextLayers = [];
          for (const layer of layers) {
            if (layer.kind === "image" && layer.imageUrl) {
              const resolvedUrl = await resolveImageUrl(layer.imageUrl);
              nextLayers.push({ ...layer, imageUrl: resolvedUrl });
            } else {
              nextLayers.push(layer);
            }
          }
          updated[zoneId] = nextLayers;
        }
        return updated;
      } catch (err) {
        setUploadError(err.message || "Upload failed. Please try again.");
        throw err;
      } finally {
        setUploading(false);
      }
    },
    [resolveImageUrl],
  );

  return {
    gallery,
    setGallery,
    selectedGalleryId,
    setSelectedGalleryId,
    uploading,
    uploadError,
    setUploadError,
    generating,
    genError,
    setGenError,
    handleFileChange,
    handleGenerate,
    uploadUsedImages,
    uploadUsedImagesInLayers,
  };
}