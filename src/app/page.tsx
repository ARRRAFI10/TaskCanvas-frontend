import { redirect } from "next/navigation";

export default function Home() {
  // The proxy bounces unauthenticated visitors from /tasks to /login.
  redirect("/tasks");
}
