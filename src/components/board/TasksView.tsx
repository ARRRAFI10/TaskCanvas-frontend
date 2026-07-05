"use client";

import { format, parseISO } from "date-fns";
import { CalendarPlus, RefreshCw } from "lucide-react";
import { useState } from "react";

import { Board } from "@/components/board/Board";
import { TaskModal } from "@/components/board/TaskModal";
import { DateSelector } from "@/components/date/DateSelector";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Skeleton } from "@/components/ui/Skeleton";
import { useDeleteTask, useTasks } from "@/lib/hooks/useTasks";
import { useDateStore } from "@/lib/stores/dateStore";
import type { Task, TaskStatus } from "@/lib/types";

type ModalState = { open: false } | { open: true; task: Task | null; status: TaskStatus };

export function TasksView() {
  const selectedDate = useDateStore((state) => state.selectedDate);
  const setSelectedDate = useDateStore((state) => state.setSelectedDate);

  const { data: tasks, isPending, isError, refetch, isRefetching } = useTasks(selectedDate);
  const deleteTask = useDeleteTask(selectedDate);

  const [modal, setModal] = useState<ModalState>({ open: false });
  const [deleting, setDeleting] = useState<Task | null>(null);

  const openCreate = (status: TaskStatus = "todo") => setModal({ open: true, task: null, status });
  const openEdit = (task: Task) => setModal({ open: true, task, status: task.status });

  const confirmDelete = () => {
    if (!deleting) return;
    deleteTask.mutate(deleting.id);
    setDeleting(null);
  };

  const heading = format(parseISO(selectedDate), "EEEE, MMMM d");

  return (
    <div className="flex flex-1 flex-col gap-5 p-4 md:p-6">
      <header className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Board</h1>
          <p className="mt-0.5 text-sm text-muted">
            {heading}
            {tasks && (
              <span className="text-faint">
                {" "}
                · {tasks.length} task{tasks.length === 1 ? "" : "s"}
              </span>
            )}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <DateSelector value={selectedDate} onChange={setSelectedDate} />
          <Button onClick={() => openCreate()} className="shrink-0">
            <CalendarPlus className="size-4" />
            New task
          </Button>
        </div>
      </header>

      {isPending ? (
        <BoardSkeleton />
      ) : isError ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 rounded-xl border border-border bg-surface/60 p-8 text-center">
          <p className="text-sm font-medium">Couldn&apos;t load this board.</p>
          <p className="max-w-xs text-xs leading-relaxed text-muted">
            The server may be waking up or unreachable. Your tasks are safe.
          </p>
          <Button variant="outline" onClick={() => refetch()} loading={isRefetching}>
            <RefreshCw className="size-4" />
            Try again
          </Button>
        </div>
      ) : (
        <>
          {tasks.length === 0 && (
            <div className="flex items-center justify-between gap-3 rounded-lg border border-dashed border-border-strong bg-surface/40 px-4 py-3">
              <p className="text-sm text-muted">
                No tasks for this day yet — plan something great.
              </p>
              <Button size="sm" variant="outline" onClick={() => openCreate()}>
                Add your first task
              </Button>
            </div>
          )}
          <Board
            tasks={tasks}
            date={selectedDate}
            onAdd={openCreate}
            onEdit={openEdit}
            onDelete={setDeleting}
          />
        </>
      )}

      <TaskModal
        open={modal.open}
        task={modal.open ? modal.task : null}
        defaultStatus={modal.open ? modal.status : "todo"}
        defaultDate={selectedDate}
        onClose={() => setModal({ open: false })}
      />

      <ConfirmDialog
        open={deleting !== null}
        title="Delete task"
        description={
          deleting
            ? `"${deleting.title}" will be permanently removed. This cannot be undone.`
            : ""
        }
        onConfirm={confirmDelete}
        onClose={() => setDeleting(null)}
      />
    </div>
  );
}

function BoardSkeleton() {
  return (
    <div className="grid flex-1 grid-cols-1 gap-4 md:grid-cols-3">
      {[0, 1, 2].map((column) => (
        <div key={column} className="flex flex-col gap-3 rounded-xl border border-border bg-surface/60 p-3">
          <Skeleton className="h-5 w-24" />
          {[0, 1, 2].map((card) => (
            <Skeleton key={card} className="h-20 w-full" />
          ))}
        </div>
      ))}
    </div>
  );
}
