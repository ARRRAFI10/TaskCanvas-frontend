"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { AlignLeft, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/Badge";
import type { Task, TaskPriority } from "@/lib/types";
import { cn } from "@/lib/utils";

const priorityStyles: Record<TaskPriority, string> = {
  low: "bg-priority-low/10 text-priority-low",
  medium: "bg-priority-medium/10 text-priority-medium",
  high: "bg-priority-high/10 text-priority-high",
  urgent: "bg-priority-urgent/10 text-priority-urgent",
};

const priorityLabels: Record<TaskPriority, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  urgent: "Urgent",
};

const MAX_VISIBLE_TAGS = 3;

interface TaskCardProps {
  task: Task;
  overlay?: boolean;
  onEdit?: (task: Task) => void;
  onDelete?: (task: Task) => void;
}

/** Presentational card; also rendered inside the DragOverlay as a clone. */
export function TaskCard({ task, overlay = false, onEdit, onDelete }: TaskCardProps) {
  const visibleTags = task.tags.slice(0, MAX_VISIBLE_TAGS);
  const hiddenTagCount = task.tags.length - visibleTags.length;

  return (
    <div
      onClick={onEdit ? () => onEdit(task) : undefined}
      className={cn(
        "group rounded-lg border border-border bg-surface-raised p-3 transition-all",
        onEdit && "cursor-pointer hover:-translate-y-0.5 hover:border-border-strong hover:shadow-md hover:shadow-black/20",
        overlay && "rotate-2 border-accent-strong shadow-xl shadow-black/40",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="min-w-0 text-sm leading-snug font-medium text-foreground [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2] overflow-hidden">
          {task.title}
        </p>
        {onDelete && (
          <button
            type="button"
            aria-label={`Delete "${task.title}"`}
            onClick={(event) => {
              event.stopPropagation();
              onDelete(task);
            }}
            onPointerDown={(event) => event.stopPropagation()}
            className="cursor-pointer rounded p-1 text-faint opacity-0 transition-all group-hover:opacity-100 hover:bg-danger-soft hover:text-danger focus-visible:opacity-100"
          >
            <Trash2 className="size-3.5" />
          </button>
        )}
      </div>

      <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
        <span
          className={cn(
            "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium",
            priorityStyles[task.priority] ?? priorityStyles.medium,
          )}
        >
          {priorityLabels[task.priority] ?? task.priority}
        </span>
        {task.description && (
          <AlignLeft aria-label="Has description" className="size-3.5 text-faint" />
        )}
        {visibleTags.map((tag) => (
          <Badge key={tag}>{tag}</Badge>
        ))}
        {hiddenTagCount > 0 && <Badge>+{hiddenTagCount}</Badge>}
      </div>
    </div>
  );
}

interface SortableTaskCardProps {
  task: Task;
  onEdit: (task: Task) => void;
  onDelete: (task: Task) => void;
}

export function SortableTaskCard({ task, onEdit, onDelete }: SortableTaskCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
    data: { type: "task", task },
  });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(isDragging && "opacity-40")}
      {...attributes}
      {...listeners}
    >
      <TaskCard task={task} onEdit={onEdit} onDelete={onDelete} />
    </div>
  );
}
