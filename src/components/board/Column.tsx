"use client";

import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { Plus } from "lucide-react";

import { SortableTaskCard } from "@/components/board/TaskCard";
import { STATUS_LABELS } from "@/lib/board";
import type { Task, TaskStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

const statusDots: Record<TaskStatus, string> = {
  todo: "bg-priority-low",
  in_progress: "bg-accent",
  done: "bg-success",
};

interface ColumnProps {
  status: TaskStatus;
  tasks: Task[];
  onAdd: (status: TaskStatus) => void;
  onEdit: (task: Task) => void;
  onDelete: (task: Task) => void;
}

export function Column({ status, tasks, onAdd, onEdit, onDelete }: ColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: status, data: { type: "column" } });

  return (
    <section
      ref={setNodeRef}
      aria-label={`${STATUS_LABELS[status]} column`}
      className={cn(
        "flex min-h-[55dvh] flex-col rounded-xl border bg-surface/60 p-3 transition-colors",
        isOver ? "border-accent-strong shadow-[0_0_0_1px_var(--accent-strong)]" : "border-border",
      )}
    >
      <header className="mb-3 flex items-center gap-2 px-1">
        <span aria-hidden className={cn("size-2 rounded-full", statusDots[status])} />
        <h2 className="text-sm font-semibold tracking-wide">{STATUS_LABELS[status]}</h2>
        <span className="ml-auto rounded-full bg-surface-raised px-2 py-0.5 text-xs font-medium text-muted">
          {tasks.length}
        </span>
      </header>

      <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
        <div className="flex flex-1 flex-col gap-2">
          {tasks.map((task) => (
            <SortableTaskCard key={task.id} task={task} onEdit={onEdit} onDelete={onDelete} />
          ))}
          {tasks.length === 0 && (
            <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed border-border p-4">
              <p className="text-center text-xs leading-relaxed text-faint">
                Nothing here yet.
                <br />
                Drag a task over or add one below.
              </p>
            </div>
          )}
        </div>
      </SortableContext>

      <button
        type="button"
        onClick={() => onAdd(status)}
        className="mt-2 flex cursor-pointer items-center justify-center gap-1.5 rounded-md border border-transparent px-3 py-2 text-xs font-medium text-muted transition-colors hover:border-border hover:bg-surface-raised hover:text-foreground"
      >
        <Plus className="size-3.5" />
        Add task
      </button>
    </section>
  );
}
