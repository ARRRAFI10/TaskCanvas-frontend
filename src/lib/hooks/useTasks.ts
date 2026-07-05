"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useToast } from "@/components/ui/Toast";
import { api } from "@/lib/api";
import { applyMove } from "@/lib/board";
import type { Task, TaskInput, TaskMoveInput } from "@/lib/types";

export function useTasks(date: string) {
  return useQuery({
    queryKey: ["tasks", date],
    queryFn: () => api.tasks.list(date),
  });
}

export function useCreateTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: TaskInput) => api.tasks.create(input),
    // The modal can target any date, so invalidate every board.
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tasks"] }),
  });
}

export function useUpdateTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: number; input: Partial<TaskInput> }) =>
      api.tasks.update(id, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tasks"] }),
  });
}

export function useDeleteTask(date: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: (id: number) => api.tasks.remove(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ["tasks", date] });
      const previous = queryClient.getQueryData<Task[]>(["tasks", date]);
      if (previous) {
        queryClient.setQueryData(
          ["tasks", date],
          previous.filter((task) => task.id !== id),
        );
      }
      return { previous };
    },
    onError: (_error, _id, context) => {
      if (context?.previous) queryClient.setQueryData(["tasks", date], context.previous);
      toast({
        title: "Couldn't delete the task",
        description: "It has been restored.",
        variant: "error",
      });
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["tasks", date] }),
  });
}

export function useMoveTask(date: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: ({ id, ...input }: { id: number } & TaskMoveInput) => api.tasks.move(id, input),
    onMutate: async ({ id, status, position }) => {
      await queryClient.cancelQueries({ queryKey: ["tasks", date] });
      const previous = queryClient.getQueryData<Task[]>(["tasks", date]);
      if (previous) {
        queryClient.setQueryData(["tasks", date], applyMove(previous, id, status, position));
      }
      return { previous };
    },
    onError: (_error, _variables, context) => {
      if (context?.previous) queryClient.setQueryData(["tasks", date], context.previous);
      toast({
        title: "Couldn't move the task",
        description: "Your change was rolled back.",
        variant: "error",
      });
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["tasks", date] }),
  });
}
