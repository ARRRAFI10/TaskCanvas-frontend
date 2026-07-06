"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useToast } from "@/components/ui/Toast";
import { api } from "@/lib/api";
import { useHistoryStore } from "@/lib/stores/historyStore";
import type { ShapeSnapshot } from "@/lib/stores/historyStore";
import type { Annotation, AnnotationInput } from "@/lib/types";

function toSnapshot(annotation: Annotation): ShapeSnapshot {
  return {
    shape_type: annotation.shape_type,
    label: annotation.label,
    color: annotation.color,
    points: annotation.points,
  };
}

/** Field-wise before/after diff for undo/redo of PATCH operations. */
function diffFields(previous: Annotation, input: Partial<AnnotationInput>) {
  const before: Partial<ShapeSnapshot> = {};
  const after: Partial<ShapeSnapshot> = {};
  if (input.points !== undefined) {
    before.points = previous.points;
    after.points = input.points;
  }
  if (input.label !== undefined) {
    before.label = previous.label;
    after.label = input.label;
  }
  if (input.color !== undefined) {
    before.color = previous.color;
    after.color = input.color;
  }
  if (input.shape_type !== undefined) {
    before.shape_type = previous.shape_type;
    after.shape_type = input.shape_type;
  }
  return { before, after };
}

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
    // Optimistic insert with a temporary negative id so the shape sticks to
    // the canvas instantly; the refetch swaps in the server row.
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: ["annotations", imageId] });
      const previous = queryClient.getQueryData<Annotation[]>(["annotations", imageId]);
      if (previous) {
        const temp: Annotation = {
          id: -Date.now(),
          image: imageId as number,
          shape_type: input.shape_type ?? "polygon",
          label: input.label ?? "",
          color: input.color ?? "#22d3ee",
          points: input.points,
          created_at: new Date().toISOString(),
        };
        queryClient.setQueryData(["annotations", imageId], [...previous, temp]);
      }
      return { previous };
    },
    onSuccess: (data) => {
      if (imageId !== null) {
        useHistoryStore
          .getState()
          .record(imageId, { op: "create", id: data.id, snapshot: toSnapshot(data) });
      }
    },
    onError: (_error, _input, context) => {
      if (context?.previous) {
        queryClient.setQueryData(["annotations", imageId], context.previous);
      }
      toast({
        title: "Couldn't save the shape",
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
      const target = previous?.find((annotation) => annotation.id === id);
      if (imageId !== null && target && id > 0) {
        const { before, after } = diffFields(target, input);
        useHistoryStore.getState().record(imageId, { op: "update", id, before, after });
      }
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
        title: "Couldn't update the shape",
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
      const target = previous?.find((annotation) => annotation.id === id);
      if (imageId !== null && target && id > 0) {
        useHistoryStore
          .getState()
          .record(imageId, { op: "delete", id, snapshot: toSnapshot(target) });
      }
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
        title: "Couldn't delete the shape",
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
