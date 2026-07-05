import type { Task, TaskStatus } from "@/lib/types";

export const STATUSES: TaskStatus[] = ["todo", "in_progress", "done"];

export const STATUS_LABELS: Record<TaskStatus, string> = {
  todo: "To Do",
  in_progress: "In Progress",
  done: "Done",
};

/** Buckets tasks by status, sorted by position; silently drops malformed rows. */
export function groupByStatus(tasks: Task[]): Record<TaskStatus, Task[]> {
  const groups: Record<TaskStatus, Task[]> = { todo: [], in_progress: [], done: [] };
  for (const task of tasks) groups[task.status]?.push(task);
  for (const status of STATUSES) groups[status].sort((a, b) => a.position - b.position);
  return groups;
}

/**
 * Pure client-side mirror of the backend move semantics: remove the task,
 * insert it at `index` in the target column, densely renumber every column.
 * Used for the optimistic cache update so a drop feels instant.
 */
export function applyMove(
  tasks: Task[],
  id: number,
  status: TaskStatus,
  index: number,
): Task[] {
  const task = tasks.find((t) => t.id === id);
  if (!task) return tasks;

  const groups = groupByStatus(tasks.filter((t) => t.id !== id));
  const target = groups[status];
  target.splice(Math.min(index, target.length), 0, { ...task, status });

  return STATUSES.flatMap((s) => groups[s].map((t, i) => ({ ...t, position: i })));
}
