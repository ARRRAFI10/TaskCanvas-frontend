"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { TagInput } from "@/components/board/TagInput";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { useToast } from "@/components/ui/Toast";
import { ApiError } from "@/lib/api";
import { STATUS_LABELS, STATUSES } from "@/lib/board";
import { useCreateTask, useUpdateTask } from "@/lib/hooks/useTasks";
import type { Task, TaskStatus } from "@/lib/types";

const taskSchema = z.object({
  title: z.string().trim().min(1, "Title is required.").max(200, "Keep it under 200 characters."),
  description: z.string().max(2000, "Keep it under 2000 characters."),
  status: z.enum(["todo", "in_progress", "done"]),
  priority: z.enum(["low", "medium", "high", "urgent"]),
  due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a valid date."),
});

type TaskValues = z.infer<typeof taskSchema>;

interface TaskModalProps {
  open: boolean;
  /** Editing when set; creating otherwise. */
  task: Task | null;
  defaultStatus: TaskStatus;
  defaultDate: string;
  onClose: () => void;
}

export function TaskModal({ open, task, defaultStatus, defaultDate, onClose }: TaskModalProps) {
  const { toast } = useToast();
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();

  const defaults = useMemo<TaskValues>(
    () => ({
      title: task?.title ?? "",
      description: task?.description ?? "",
      status: task?.status ?? defaultStatus,
      priority: task?.priority ?? "medium",
      due_date: task?.due_date ?? defaultDate,
    }),
    [task, defaultStatus, defaultDate],
  );

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<TaskValues>({ resolver: zodResolver(taskSchema), values: defaults });

  // Tags live outside react-hook-form; reset when the modal retargets
  // (render-time derived-state pattern).
  const resetKey = `${open}-${task?.id ?? "new"}`;
  const [tags, setTags] = useState<string[]>(task?.tags ?? []);
  const [lastResetKey, setLastResetKey] = useState(resetKey);
  if (resetKey !== lastResetKey) {
    setLastResetKey(resetKey);
    setTags(task?.tags ?? []);
  }

  const onSubmit = async (values: TaskValues) => {
    const input = { ...values, tags };
    try {
      if (task) {
        await updateTask.mutateAsync({ id: task.id, input });
        toast({ title: "Task updated", variant: "success" });
      } else {
        await createTask.mutateAsync(input);
        toast({ title: "Task created", variant: "success" });
      }
      onClose();
    } catch (error) {
      if (error instanceof ApiError && error.errors) {
        for (const [field, messages] of Object.entries(error.errors)) {
          if (field in values) {
            setError(field as keyof TaskValues, { message: messages.join(" ") });
          }
        }
        setError("root", { message: "Please fix the highlighted fields." });
      } else {
        setError("root", { message: "Couldn't save the task. Please try again." });
      }
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={task ? "Edit task" : "New task"}>
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
        {errors.root && (
          <p className="rounded-md border border-danger/40 bg-danger-soft px-3 py-2 text-sm text-danger">
            {errors.root.message}
          </p>
        )}

        <Input
          label="Title"
          placeholder="What needs doing?"
          autoFocus
          error={errors.title?.message}
          {...register("title")}
        />

        <Textarea
          label="Description (optional)"
          placeholder="Add context, links, anything useful…"
          rows={3}
          error={errors.description?.message}
          {...register("description")}
        />

        <div className="grid grid-cols-2 gap-3">
          <Select label="Status" error={errors.status?.message} {...register("status")}>
            {STATUSES.map((status) => (
              <option key={status} value={status}>
                {STATUS_LABELS[status]}
              </option>
            ))}
          </Select>
          <Select label="Priority" error={errors.priority?.message} {...register("priority")}>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="urgent">Urgent</option>
          </Select>
        </div>

        <Input
          label="Due date"
          type="date"
          error={errors.due_date?.message}
          {...register("due_date")}
        />

        <TagInput label="Tags" value={tags} onChange={setTags} />

        <div className="mt-1 flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" loading={isSubmitting}>
            {task ? "Save changes" : "Create task"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
