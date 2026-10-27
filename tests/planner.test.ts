import { describe, expect, it } from "vitest";
import { createDemoPlan, formatMoney, makeBudget, rescueBudget } from "../lib/planner";
import { EventInputSchema, EventPlanSchema } from "../lib/types";

const validInput = EventInputSchema.parse({
  eventType: "Birthday", location: "Hyderabad, India", eventDate: "2026-12-15",
  guests: 50, budget: 25000, currency: "INR", theme: "Elegant", priorities: ["Food"], notes: ""
});

describe("event input validation", () => {
  it("accepts valid event details", () => {
    expect(EventInputSchema.safeParse(validInput).success).toBe(true);
  });
  it("rejects unreasonable guest counts", () => {
    expect(EventInputSchema.safeParse({ ...validInput, guests: 100000 }).success).toBe(false);
  });
  it("rejects unsupported event types", () => {
    expect(EventInputSchema.safeParse({ ...validInput, eventType: "Concert" }).success).toBe(false);
  });
  it("rejects dates that are not real calendar dates", () => {
    expect(EventInputSchema.safeParse({ ...validInput, eventDate: "2026-02-31" }).success).toBe(false);
  });
});

describe("budget planning", () => {
  it("allocates exactly the requested budget", () => {
    for (const amount of [1000, 25000, 99999, 1000000]) {
      expect(makeBudget(amount).reduce((sum, line) => sum + line.amount, 0)).toBe(amount);
    }
  });
  it("keeps amounts non-negative", () => {
    expect(makeBudget(1000).every((line) => line.amount >= 0)).toBe(true);
  });
  it("creates a complete demo plan with actionable tasks", () => {
    const plan = createDemoPlan(validInput);
    expect(plan.timeline.length).toBeGreaterThan(0);
    expect(plan.vendors.length).toBeGreaterThan(0);
    expect(plan.ideas.length).toBeGreaterThan(0);
    expect(plan.budget.reduce((sum, line) => sum + line.amount, 0)).toBe(validInput.budget);
    expect(EventPlanSchema.safeParse(plan).success).toBe(true);
  });
  it("carries special requests into the generated demo plan", () => {
    const plan = createDemoPlan({ ...validInput, notes: "Please include vegan food options." });
    expect(plan.themeNotes).toContain("Special requests: Please include vegan food options.");
  });
  it("formats USD and INR with their expected grouping conventions", () => {
    expect(formatMoney(12345678, "USD")).toContain("12,345,678");
    expect(formatMoney(12345678, "INR")).toContain("1,23,45,678");
  });
  it("returns a budget rescue allocation that totals the target budget", () => {
    const plan = createDemoPlan(validInput);
    const result = rescueBudget(plan, 18000, "INR");
    expect(result.revised).toBe(18000);
    expect(result.lines.reduce((sum, line) => sum + line.amount, 0)).toBe(18000);
  });
  it("does not change a plan already within budget", () => {
    const plan = createDemoPlan(validInput);
    const result = rescueBudget(plan, 30000, "INR");
    expect(result.revised).toBe(validInput.budget);
  });
  it("keeps all allocations non-negative for a very small revised budget", () => {
    const plan = createDemoPlan(validInput);
    const result = rescueBudget(plan, 1000, "INR");
    expect(result.revised).toBe(1000);
    expect(result.lines.every((line) => line.amount >= 0)).toBe(true);
  });
});
