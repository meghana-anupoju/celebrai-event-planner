import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CelebrAI — Your AI Celebration Planner",
  description: "Plan weddings, birthdays, and community events with personalized ideas, budgets, timelines, and vendor checklists."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
