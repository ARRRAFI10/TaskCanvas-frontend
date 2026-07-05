"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useToast } from "@/components/ui/Toast";
import { api } from "@/lib/api";
import type { Annotation, AnnotationInput } from "@/lib/types";

export function useAnnotations(imageId: number | null) {
  return useQuery({
    queryKey: ["annotations", imageId],
    queryFn: () => api.annotations.list(imageId as number),
    enabled: imageId !== null,
  });
}

export function useCreateAnnotation(imageId: number | null) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: (input: AnnotationInput) => api.annotations.create(imageId as number, input),
    // Optimistic insert with a temporary negative id so the polygon sticks
    // to the canvas instantly; the refetch swaps in the server row.
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: ["annotations", imageId] });
      const previous = queryClient.getQueryData<Annotation[]>(["annotations", imageId]);
      if (previous) {
        const temp: Annotation = {
          id: -Date.now(),
          image: imageId as number,
          label: input.label ?? "",
          color: input.color ?? "#22d3ee",
          points: input.points,
          created_at: new Date().toISOString(),
        };
        queryClient.setQueryData(["annotations", imageId], [...previous, temp]);
      }
      return { previous };
    },
    onError: (_error, _input, context) => {
      if (context?.previous) {
        queryClient.setQueryData(["annotations", imageId], context.previous);
      }
      toast({
        title: "Couldn't save the polygon",
        description: "Your drawing was rolled back.",
        variant: "error",
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["annotations", imageId] });
      queryClient.invalidateQueries({ queryKey: ["images"] }); // filmstrip badge counts
    },
  });
}

export function useUpdateAnnotation(imageId: number | null) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: ({ id, input }: { id: number; input: Partial<AnnotationInput> }) =>
      api.annotations.update(id, input),
    onMutate: async ({ id, input }) => {
      await queryClient.cancelQueries({ queryKey: ["annotations", imageId] });
      const previous = queryClient.getQueryData<Annotation[]>(["annotations", imageId]);
      if (previous) {
        queryClient.setQueryData(
          ["annotations", imageId],
          previous.map((annotation) =>
            annotation.id === id ? { ...annotation, ...input } : annotation,
          ),
        );
      }
      return { previous };
    },
    onError: (_error, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(["annotations", imageId], context.previous);
      }
      toast({
        title: "Couldn't update the polygon",
        description: "Your change was rolled back.",
        variant: "error",
      });
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["annotations", imageId] }),
  });
}

export function useDeleteAnnotation(imageId: number | null) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: (id: number) => api.annotations.remove(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ["annotations", imageId] });
      const previous = queryClient.getQueryData<Annotation[]>(["annotations", imageId]);
      if (previous) {
        queryClient.setQueryData(
          ["annotations", imageId],
          previous.filter((annotation) => annotation.id !== id),
        );
      }
      return { previous };
    },
    onError: (_error, _id, context) => {
      if (context?.previous) {
        queryClient.setQueryData(["annotations", imageId], context.previous);
      }
      toast({
        title: "Couldn't delete the polygon",
        description: "It has been restored.",
        variant: "error",
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["annotations", imageId] });
      queryClient.invalidateQueries({ queryKey: ["images"] });
    },
  });
}
