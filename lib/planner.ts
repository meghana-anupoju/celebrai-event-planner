import type { EventInput, EventPlan } from "./types";

const CATEGORIES = [
  { category: "Venue", share: 0.22, rationale: "Space, seating, and basic facilities" },
  { category: "Food & drinks", share: 0.28, rationale: "Menu and refreshments for guests" },
  { category: "Decor & theme", share: 0.14, rationale: "Theme-led decorations and florals" },
  { category: "Photography", share: 0.10, rationale: "Capture key moments" },
  { category: "Entertainment", share: 0.08, rationale: "Music, activities, or hosting" },
  { category: "Invitations & favors", share: 0.04, rationale: "Digital invitations and small keepsakes" },
  { category: "Logistics", share: 0.06, rationale: "Transport, setup, and supplies" },
  { category: "Contingency", share: 0.08, rationale: "Reserve for unexpected costs" }
];

function dateOffset(date: string, days: number): string {
  const d = new Date(`${date}T12:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function makeBudget(budget: number, cuts: Record<string, number> = {}) {
  const lines = CATEGORIES.map((item) => ({
    category: item.category,
    amount: Math.max(0, Math.round(budget * item.share * (1 - (cuts[item.category] ?? 0)))),
    rationale: item.rationale
  }));
  const total = lines.reduce((sum, line) => sum + line.amount, 0);
  lines[lines.length - 1].amount += budget - total;
  return lines;
}

export function createDemoPlan(input: EventInput): EventPlan {
  const title = input.eventName || `${input.theme} ${input.eventType}`;
  const timeline = [
    { title: "Confirm venue and event requirements", dueDate: dateOffset(input.eventDate, -30), priority: "High" as const, done: false },
    { title: "Request quotes and shortlist vendors", dueDate: dateOffset(input.eventDate, -21), priority: "High" as const, done: false },
    { title: "Finalize menu, theme, and activities", dueDate: dateOffset(input.eventDate, -14), priority: "Medium" as const, done: false },
    { title: "Send invitations and confirm attendance", dueDate: dateOffset(input.eventDate, -10), priority: "High" as const, done: false },
    { title: "Confirm bookings and event-day schedule", dueDate: dateOffset(input.eventDate, -3), priority: "High" as const, done: false },
    { title: "Check setup, supplies, and final guest count", dueDate: dateOffset(input.eventDate, -1), priority: "Medium" as const, done: false }
  ].sort((a, b) => a.dueDate.localeCompare(b.dueDate));

  const vendors = [
    { category: "Venue", task: "Compare at least two suitable spaces", status: "To contact" as const, notes: "Confirm capacity, access, power, parking, and cancellation terms." },
    { category: "Catering", task: "Request menu and per-person quote", status: "To contact" as const, notes: "Ask about dietary needs, allergies, water, and service staff." },
    { category: "Decor", task: "Request theme-matched decor options", status: "To contact" as const, notes: "Prioritize reusable decor and clarify setup/teardown fees." },
    { category: "Photography / media", task: "Check portfolio and deliverables", status: "To contact" as const, notes: "Confirm hours, delivery timeline, and image permissions." },
    { category: "Entertainment", task: "Confirm activities and equipment", status: "To contact" as const, notes: "Check noise limits, power, and an indoor backup option." }
  ];

  const eventSpecific = input.eventType === "Wedding"
    ? ["Create a family photo list and a realistic ceremony-to-reception run sheet.", "Offer a quiet seating area and clear guest wayfinding.", "Choose one focal decor installation and reuse flowers where practical."]
    : input.eventType === "Community event" || input.eventType === "College event"
      ? ["Use volunteer-led activity stations with named owners.", "Publish a clear event map, schedule, and emergency contact point.", "Plan accessible routes, hydration points, and waste sorting."]
      : ["Choose one memorable photo corner that doubles as decor.", "Plan a short welcome moment and two optional group activities.", "Offer a mix of familiar food and one themed treat."];

  return {
    title,
    summary: `A ${input.theme.toLowerCase()} ${input.eventType.toLowerCase()} plan for ${input.guests} guests in ${input.location}, designed around a ${formatMoney(input.budget, input.currency)} budget. Costs are planning estimates and should be confirmed with local vendors.`,
    themeNotes: [
      `Palette direction: ${input.theme.toLowerCase()} tones with one accent color.`,
      `Plan for ${input.guests} guests with clear arrival, food, and activity flow.`,
      `Priorities to emphasize: ${input.priorities.length ? input.priorities.join(", ") : "value, guest comfort, and a contingency reserve"}.`,
      ...(input.notes ? [`Special requests: ${input.notes}`] : [])
    ],
    budget: makeBudget(input.budget),
    timeline,
    vendors,
    ideas: eventSpecific.map((description, i) => ({ category: ["Experience", "Guest care", "Design"][i], title: ["Make it memorable", "Keep guests comfortable", "Spend with intention"][i], description })),
    risks: ["Keep a contingency reserve and confirm all taxes, delivery, and service fees in writing.", "Have a weather or venue disruption backup when any part of the event is outdoors.", "Collect dietary and accessibility requirements before final vendor confirmation."],
    assumptions: ["All amounts are estimates, not live quotes or confirmed vendor prices.", "Vendor availability and local rules have not been verified.", "Dates are planning targets; adjust them for short lead times."],
    generatedBy: "demo"
  };
}

export function formatMoney(amount: number, currency: EventInput["currency"] = "INR") {
  const locale = currency === "INR" ? "en-IN" : "en-US";
  return new Intl.NumberFormat(locale, { style: "currency", currency, maximumFractionDigits: 0 }).format(amount);
}

export function rescueBudget(plan: EventPlan, budget: number, currency: EventInput["currency"]) {
  const total = plan.budget.reduce((sum, line) => sum + line.amount, 0);
  if (total <= budget) return { lines: plan.budget, original: total, revised: total, message: "Your current plan is within budget. Keep the contingency reserve protected." };
  const protectedCategories = new Set(["Food & drinks", "Logistics", "Contingency"]);
  const adjustable = plan.budget.filter((line) => !protectedCategories.has(line.category));
  const protectedTotal = plan.budget.filter((line) => protectedCategories.has(line.category)).reduce((sum, line) => sum + line.amount, 0);
  const available = Math.max(0, budget - protectedTotal);
  const adjustableTotal = adjustable.reduce((sum, line) => sum + line.amount, 0);
  // If even protected categories exceed the target, scale every category rather than creating negative values.
  const scaleAll = protectedTotal >= budget;
  const scale = scaleAll
    ? (total > 0 ? budget / total : 0)
    : (adjustableTotal ? Math.min(1, available / adjustableTotal) : 1);
  const adjusted = plan.budget.map((line) => {
    if (scaleAll) return { ...line, amount: Math.floor(line.amount * scale) };
    return protectedCategories.has(line.category) ? { ...line } : { ...line, amount: Math.floor(line.amount * scale) };
  });
  const sum = adjusted.reduce((s, line) => s + line.amount, 0);
  if (adjusted.length) adjusted[adjusted.length - 1].amount += budget - sum;
  return {
    lines: adjusted,
    original: total,
    revised: adjusted.reduce((sum, line) => sum + line.amount, 0),
    message: `Budget Rescue reduced flexible categories from ${formatMoney(total, currency)} to approximately ${formatMoney(budget, currency)}. Review each change before booking; vendor quotes may require further adjustments.`
  };
}
