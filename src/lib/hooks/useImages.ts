"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useState } from "react";

import { useToast } from "@/components/ui/Toast";
import { api, ApiError } from "@/lib/api";
import { uploadImageWithProgress, validateImageFile } from "@/lib/api/upload";
import type { ImageItem } from "@/lib/types";

export function useImages() {
  return useQuery({ queryKey: ["images"], queryFn: api.images.list });
}

export interface UploadEntry {
  key: string;
  name: string;
  progress: number; // 0..1
  error?: string;
}

/** Parallel uploads with per-file progress; entries vanish on success. */
export function useImageUploads() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [uploads, setUploads] = useState<UploadEntry[]>([]);

  const handleFiles = useCallback(
    (files: File[]) => {
      for (const file of files) {
        const reason = validateImageFile(file);
        if (reason) {
          toast({ title: file.name, description: reason, variant: "error" });
          continue;
        }
        const key = `${file.name}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
        setUploads((current) => [...current, { key, name: file.name, progress: 0 }]);

        uploadImageWithProgress(file, (progress) =>
          setUploads((current) =>
            current.map((entry) => (entry.key === key ? { ...entry, progress } : entry)),
          ),
        )
          .then(() => {
            setUploads((current) => current.filter((entry) => entry.key !== key));
            queryClient.invalidateQueries({ queryKey: ["images"] });
          })
          .catch((error) => {
            const message =
              error instanceof ApiError ? error.detail : "Upload failed. Please try again.";
            setUploads((current) =>
              current.map((entry) => (entry.key === key ? { ...entry, error: message } : entry)),
            );
            setTimeout(
              () => setUploads((current) => current.filter((entry) => entry.key !== key)),
              5000,
            );
          });
      }
    },
    [queryClient, toast],
  );

  return { uploads, handleFiles };
}

export function useDeleteImage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: (id: number) => api.images.remove(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ["images"] });
      const previous = queryClient.getQueryData<ImageItem[]>(["images"]);
      if (previous) {
        queryClient.setQueryData(
          ["images"],
          previous.filter((image) => image.id !== id),
        );
      }
      return { previous };
    },
    onError: (_error, _id, context) => {
      if (context?.previous) queryClient.setQueryData(["images"], context.previous);
      toast({
        title: "Couldn't delete the image",
        description: "It has been restored.",
        variant: "error",
      });
    },
    onSuccess: (_data, id) => {
      queryClient.removeQueries({ queryKey: ["annotations", id] });
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["images"] }),
  });
}
