import type { Metadata } from "next";

import { TasksView } from "@/components/board/TasksView";

export const metadata: Metadata = { title: "Tasks — TaskCanvas" };

export default function TasksPage() {
  return <TasksView />;
}
