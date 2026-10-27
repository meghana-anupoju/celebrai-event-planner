import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { EventInputSchema, GeneratedPlanSchema } from "@/lib/types";
import { createDemoPlan } from "@/lib/planner";
import type { EventPlan } from "@/lib/types";

export const runtime = "nodejs";

function safeJsonFromText(text: string): unknown {
  const cleaned = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  return JSON.parse(cleaned);
}

export async function POST(request: NextRequest) {
  try {
    const contentLength = Number(request.headers.get("content-length") || 0);
    if (contentLength > 20_000) {
      return NextResponse.json({ error: "Request is too large. Please shorten your event notes." }, { status: 413 });
    }
    let raw: unknown;
    try {
      raw = await request.json();
    } catch {
      return NextResponse.json({ error: "Please send valid JSON event details." }, { status: 400 });
    }

    const parsed = EventInputSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json({ error: "Please check the event details and try again.", details: parsed.error.flatten().fieldErrors }, { status: 400 });
    }

    const input = parsed.data;
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === "your_gemini_api_key_here") {
      return NextResponse.json({ plan: createDemoPlan(input), mode: "demo", notice: "Demo plan returned. Add GEMINI_API_KEY to enable live AI generation." });
    }

    const modelName = process.env.GEMINI_MODEL || "gemini-2.5-flash";
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: modelName,
      generationConfig: { responseMimeType: "application/json", temperature: 0.65 }
    });
    const prompt = `You are CelebrAI, a careful event-planning assistant. Create an actionable plan using the event data below. Return JSON only with keys: title, summary, themeNotes (string[]), budget (array of {category,amount,rationale}), timeline (array of {title,dueDate,priority,done}), vendors (array of {category,task,status,notes}), ideas (array of {category,title,description}), risks (string[]), assumptions (string[]). Use priority High/Medium/Low, done false, vendor status To contact/Contacted/Booked. Budget amounts must be nonnegative integers and their sum must equal exactly ${input.budget} ${input.currency}. Never claim that vendor prices, availability, or bookings are verified. Use ISO dates. Include contingency and practical alternatives. User event data: ${JSON.stringify(input)}`;

    const result = await model.generateContent(prompt);
    const parsedPlan = GeneratedPlanSchema.safeParse(safeJsonFromText(result.response.text()));
    if (!parsedPlan.success) throw new Error("The AI returned an invalid plan format.");
    const rawPlan = parsedPlan.data;
    const rawAmounts = rawPlan.budget.map((line) => Math.max(0, Math.floor(line.amount)));
    const rawTotal = rawAmounts.reduce((sum, amount) => sum + amount, 0);
    const normalizedBudget = rawPlan.budget.map((line, index) => ({
      ...line,
      amount: rawTotal > 0 ? Math.floor(rawAmounts[index] / rawTotal * input.budget) : 0
    }));
    if (rawTotal <= 0) {
      const fallback = createDemoPlan(input);
      return NextResponse.json({ plan: { ...fallback, title: rawPlan.title, summary: rawPlan.summary, themeNotes: rawPlan.themeNotes, ideas: rawPlan.ideas, risks: rawPlan.risks, assumptions: rawPlan.assumptions, generatedBy: "gemini" }, mode: "gemini" });
    }
    const difference = input.budget - normalizedBudget.reduce((sum, line) => sum + line.amount, 0);
    normalizedBudget[normalizedBudget.length - 1].amount += difference;
    const plan: EventPlan = { ...rawPlan, budget: normalizedBudget, generatedBy: "gemini" };
    return NextResponse.json({ plan, mode: "gemini" });
  } catch (error) {
    console.error("CelebrAI plan generation failed:", error instanceof Error ? error.message : "Unknown error");
    return NextResponse.json({ error: "We couldn't generate an AI plan right now. Please try again or use demo mode." }, { status: 502 });
  }
}
