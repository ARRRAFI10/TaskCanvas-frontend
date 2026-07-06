// Mirrors the Django API contract (PLAN.md §5). Keep in sync with backend serializers.

export interface User {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
}

export interface LoginResponse {
  access: string;
  refresh: string;
  user: User;
}

export type TaskStatus = "todo" | "in_progress" | "done";
export type TaskPriority = "low" | "medium" | "high" | "urgent";

export interface Task {
  id: number;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  due_date: string; // YYYY-MM-DD
  tags: string[];
  position: number;
  created_at: string;
  updated_at: string;
}

export interface TaskInput {
  title: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  due_date: string;
  tags?: string[];
}

export interface TaskMoveInput {
  status: TaskStatus;
  position: number;
}

export interface ImageItem {
  id: number;
  file: string; // absolute media URL
  original_name: string;
  width: number;
  height: number;
  annotation_count: number;
  uploaded_at: string;
}

/** Vertices normalized to 0..1 of the image dimensions. */
export type NormalizedPoint = [number, number];

/** Rectangles store two opposite corners; points store a single pair. */
export type ShapeType = "polygon" | "rectangle" | "point" | "polyline";

export interface Annotation {
  id: number;
  image: number;
  shape_type: ShapeType;
  label: string;
  color: string;
  points: NormalizedPoint[];
  created_at: string;
}

export interface AnnotationInput {
  shape_type?: ShapeType;
  label?: string;
  color?: string;
  points: NormalizedPoint[];
}
