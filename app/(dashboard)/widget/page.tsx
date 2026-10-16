import type { Metadata } from "next";
import { WidgetView } from "@/components/widget/widget-view";

export const metadata: Metadata = { title: "Widget & Embed" };

export default function WidgetPage() {
  return <WidgetView />;
}
