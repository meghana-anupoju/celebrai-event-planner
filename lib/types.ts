import { z } from "zod";

const IsoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((value) => {
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}, "Please enter a valid calendar date.");

export const EventInputSchema = z.object({
  eventType: z.enum(["Wedding", "Birthday", "Community event", "Anniversary", "College event"]),
  eventName: z.string().trim().max(80).optional().default(""),
  location: z.string().trim().min(2).max(100),
  eventDate: IsoDateSchema,
  guests: z.number().int().min(1).max(5000),
  budget: z.number().int().min(1000).max(100000000),
  currency: z.enum(["INR", "USD"]).default("INR"),
  theme: z.enum(["Elegant", "Traditional", "Fun & colorful", "Eco-friendly", "Minimalist", "Cultural"]),
  priorities: z.array(z.enum(["Food", "Decor", "Photography", "Entertainment", "Accessibility", "Sustainability"])).max(6).default([]),
  notes: z.string().trim().max(500).default("")
});

export type EventInput = z.infer<typeof EventInputSchema>;

const PlanContentSchema = z.object({
  title: z.string().min(1).max(120),
  summary: z.string().min(1).max(1200),
  themeNotes: z.array(z.string().max(500)).max(12),
  budget: z.array(z.object({
    category: z.string().min(1).max(80),
    amount: z.number().int().nonnegative(),
    rationale: z.string().max(500)
  })).min(1).max(30),
  timeline: z.array(z.object({
    title: z.string().min(1).max(180),
    dueDate: IsoDateSchema,
    priority: z.enum(["High", "Medium", "Low"]),
    done: z.boolean().default(false)
  })).max(60),
  vendors: z.array(z.object({
    category: z.string().min(1).max(80),
    task: z.string().min(1).max(240),
    status: z.enum(["To contact", "Contacted", "Booked"]).default("To contact"),
    notes: z.string().max(500)
  })).max(40),
  ideas: z.array(z.object({
    category: z.string().max(80),
    title: z.string().min(1).max(120),
    description: z.string().max(700)
  })).max(30),
  risks: z.array(z.string().max(500)).max(20),
  assumptions: z.array(z.string().max(500)).max(20)
});

export const GeneratedPlanSchema = PlanContentSchema;
export const EventPlanSchema = PlanContentSchema.extend({
  generatedBy: z.enum(["gemini", "demo"])
});

export type BudgetLine = z.infer<typeof PlanContentSchema>["budget"][number];
export type PlanTask = z.infer<typeof PlanContentSchema>["timeline"][number];
export type Vendor = z.infer<typeof PlanContentSchema>["vendors"][number];
export type EventPlan = z.infer<typeof EventPlanSchema>;
