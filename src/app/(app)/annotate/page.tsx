import type { Metadata } from "next";

import { AnnotateView } from "@/components/annotate/AnnotateView";

export const metadata: Metadata = { title: "Annotate — TaskCanvas" };

export default function AnnotatePage() {
  return <AnnotateView />;
}
