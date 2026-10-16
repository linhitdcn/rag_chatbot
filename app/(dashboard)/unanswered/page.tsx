import type { Metadata } from "next";
import { UnansweredView } from "@/components/unanswered/unanswered-view";

export const metadata: Metadata = { title: "Unanswered Questions" };

export default function UnansweredPage() {
  return <UnansweredView />;
}
