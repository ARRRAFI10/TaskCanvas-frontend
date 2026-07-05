"use client";

import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCorners,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import type { DragEndEvent, DragStartEvent } from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { useState } from "react";

import { Column } from "@/components/board/Column";
import { TaskCard } from "@/components/board/TaskCard";
import { useMoveTask } from "@/lib/hooks/useTasks";
import { STATUSES, groupByStatus } from "@/lib/board";
import type { Task, TaskStatus } from "@/lib/types";

interface BoardProps {
  tasks: Task[];
  date: string;
  onAdd: (status: TaskStatus) => void;
  onEdit: (task: Task) => void;
  onDelete: (task: Task) => void;
}

export function Board({ tasks, date, onAdd, onEdit, onDelete }: BoardProps) {
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const moveTask = useMoveTask(date);

  const sensors = useSensors(
    // The distance constraint keeps plain clicks working for "open edit modal".
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const groups = groupByStatus(tasks);

  const handleDragStart = ({ active }: DragStartEvent) => {
    setActiveTask(tasks.find((t) => t.id === active.id) ?? null);
  };

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    setActiveTask(null);
    if (!over) return;
    const task = tasks.find((t) => t.id === active.id);
    if (!task) return;

    let status: TaskStatus;
    let index: number;

    if (over.data.current?.type === "column") {
      status = over.id as TaskStatus;
      index = groups[status].filter((t) => t.id !== task.id).length; // append
    } else {
      const overTask = tasks.find((t) => t.id === over.id);
      if (!overTask || overTask.id === task.id) return;
      status = overTask.status;
      const column = groups[status];
      index = column.filter((t) => t.id !== task.id).findIndex((t) => t.id === overTask.id);
      // Moving down within a column lands *after* the hovered card.
      if (
        task.status === status &&
        column.findIndex((t) => t.id === task.id) < column.findIndex((t) => t.id === overTask.id)
      ) {
        index += 1;
      }
    }

    const currentIndex = groups[task.status].findIndex((t) => t.id === task.id);
    if (status === task.status && index === currentIndex) return;

    moveTask.mutate({ id: task.id, status, position: index });
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={() => setActiveTask(null)}
    >
      <div className="grid flex-1 grid-cols-1 gap-4 md:grid-cols-3">
        {STATUSES.map((status) => (
          <Column
            key={status}
            status={status}
            tasks={groups[status]}
            onAdd={onAdd}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        ))}
      </div>

      <DragOverlay dropAnimation={{ duration: 160 }}>
        {activeTask && <TaskCard task={activeTask} overlay />}
      </DragOverlay>
    </DndContext>
  );
}
