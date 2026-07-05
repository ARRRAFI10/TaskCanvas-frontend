import { ApiError } from "@/lib/api/client";
import { useAuthStore } from "@/lib/stores/authStore";
import type { ImageItem } from "@/lib/types";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000";

export const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

/** Client-side mirror of the backend upload rules; returns a reason or null. */
export function validateImageFile(file: File): string | null {
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    return "Only JPEG, PNG, and WebP images are supported.";
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return "Images must be 10 MB or smaller.";
  }
  return null;
}

/** fetch() has no upload progress — XHR gives us real per-file progress bars. */
export function uploadImageWithProgress(
  file: File,
  onProgress: (fraction: number) => void,
): Promise<ImageItem> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${API_URL}/api/images/`);
    const { access } = useAuthStore.getState();
    if (access) xhr.setRequestHeader("Authorization", `Bearer ${access}`);

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress(event.loaded / event.total);
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(JSON.parse(xhr.responseText) as ImageItem);
        return;
      }
      try {
        const data = JSON.parse(xhr.responseText);
        const fieldErrors = data.errors ? Object.values<string[]>(data.errors).flat() : [];
        reject(
          new ApiError(xhr.status, fieldErrors[0] ?? data.detail ?? "Upload failed.", data.errors),
        );
      } catch {
        reject(new ApiError(xhr.status, "Upload failed."));
      }
    };
    xhr.onerror = () => reject(new ApiError(0, "Network error during upload."));

    const body = new FormData();
    body.append("file", file);
    xhr.send(body);
  });
}
