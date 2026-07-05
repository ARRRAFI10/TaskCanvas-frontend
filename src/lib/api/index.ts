import { apiFetch } from "@/lib/api/client";
import type {
  Annotation,
  AnnotationInput,
  ImageItem,
  LoginResponse,
  Task,
  TaskInput,
  TaskMoveInput,
  User,
} from "@/lib/types";

export { ApiError } from "@/lib/api/client";

export const api = {
  auth: {
    login: (payload: { email: string; password: string }) =>
      apiFetch<LoginResponse>("/api/auth/login/", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    me: () => apiFetch<User>("/api/auth/me/"),
  },

  tasks: {
    list: (date: string) => apiFetch<Task[]>(`/api/tasks/?date=${encodeURIComponent(date)}`),
    create: (input: TaskInput) =>
      apiFetch<Task>("/api/tasks/", { method: "POST", body: JSON.stringify(input) }),
    update: (id: number, input: Partial<TaskInput>) =>
      apiFetch<Task>(`/api/tasks/${id}/`, { method: "PATCH", body: JSON.stringify(input) }),
    remove: (id: number) => apiFetch<void>(`/api/tasks/${id}/`, { method: "DELETE" }),
    move: (id: number, input: TaskMoveInput) =>
      apiFetch<Task>(`/api/tasks/${id}/move/`, { method: "POST", body: JSON.stringify(input) }),
  },

  images: {
    list: () => apiFetch<ImageItem[]>("/api/images/"),
    upload: (file: File) => {
      const body = new FormData();
      body.append("file", file);
      return apiFetch<ImageItem>("/api/images/", { method: "POST", body });
    },
    remove: (id: number) => apiFetch<void>(`/api/images/${id}/`, { method: "DELETE" }),
  },

  annotations: {
    list: (imageId: number) => apiFetch<Annotation[]>(`/api/images/${imageId}/annotations/`),
    create: (imageId: number, input: AnnotationInput) =>
      apiFetch<Annotation>(`/api/images/${imageId}/annotations/`, {
        method: "POST",
        body: JSON.stringify(input),
      }),
    update: (id: number, input: Partial<AnnotationInput>) =>
      apiFetch<Annotation>(`/api/annotations/${id}/`, {
        method: "PATCH",
        body: JSON.stringify(input),
      }),
    remove: (id: number) => apiFetch<void>(`/api/annotations/${id}/`, { method: "DELETE" }),
  },
};
