"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { createDemoPlan, formatMoney, rescueBudget } from "@/lib/planner";
import { EventInputSchema, EventPlanSchema, type EventInput, type EventPlan } from "@/lib/types";

const initialInput: EventInput = {
  eventType: "Birthday", eventName: "", location: "Hyderabad, India", eventDate: "2026-12-15",
  guests: 50, budget: 25000, currency: "INR", theme: "Elegant", priorities: ["Food", "Decor"], notes: ""
};
const STORAGE_KEY = "celebrai.saved-plan.v1";
const priorityOptions = ["Food", "Decor", "Photography", "Entertainment", "Accessibility", "Sustainability"] as const;
const SavedPlanSchema = z.object({ input: EventInputSchema, plan: EventPlanSchema });
const PlanResponseSchema = z.object({
  plan: EventPlanSchema,
  mode: z.enum(["demo", "gemini"]),
  notice: z.string().optional()
});
const ErrorResponseSchema = z.object({ error: z.string() });

function Icon({ name }: { name: string }) {
  const paths: Record<string, string> = {
    spark: "M12 3l1.7 5.3L19 10l-5.3 1.7L12 17l-1.7-5.3L5 10l5.3-1.7L12 3z M19 16l.8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8L19 16z",
    calendar: "M8 2v4m8-4v4M3 10h18M5 4h14a2 2 0 012 2v14H3V6a2 2 0 012-2z",
    wallet: "M3 6.5A2.5 2.5 0 015.5 4H20v16H5.5A2.5 2.5 0 013 17.5v-11zM3 8h17m-4 5h.01",
    check: "M5 12l4 4L19 6",
    bulb: "M9 18h6m-5 4h4m-6-8a7 7 0 1110 0c-1.2 1-2 2.2-2 4h-6c0-1.8-.8-3-2-4z",
    users: "M16 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2m6-10a4 4 0 100-8 4 4 0 000 8zm7-3a4 4 0 010 8m5 5v-2a4 4 0 00-3-3.87",
    arrow: "M5 12h14m-7-7l7 7-7 7",
    heart: "M20.8 4.6a5.5 5.5 0 00-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 00-7.8 7.8l1.1 1.1L12 21l7.8-7.5 1.1-1.1a5.5 5.5 0 00-.1-7.8z"
  };
  return <svg aria-hidden="true" viewBox="0 0 24 24" className="icon" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d={paths[name] || paths.spark}/></svg>;
}

export default function Home() {
  const [input, setInput] = useState<EventInput>(initialInput);
  const [plan, setPlan] = useState<EventPlan | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [showRescue, setShowRescue] = useState(false);
  const [activeTab, setActiveTab] = useState("Overview");
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = SavedPlanSchema.safeParse(JSON.parse(saved));
        if (parsed.success) {
          setInput(parsed.data.input);
          setPlan(parsed.data.plan);
        } else {
          setNotice("A saved plan could not be loaded. You can create a new plan.");
        }
      }
    } catch {
      setNotice("A saved plan could not be loaded. You can create a new plan.");
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      if (plan) localStorage.setItem(STORAGE_KEY, JSON.stringify({ input, plan }));
    } catch {
      setNotice("This browser could not save the plan. You can still use it in this session.");
    }
  }, [input, plan, hydrated]);

  const total = useMemo(() => plan?.budget.reduce((sum, line) => sum + line.amount, 0) ?? 0, [plan]);
  const completed = plan?.timeline.filter((task) => task.done).length ?? 0;
  const rescue = useMemo(() => plan ? rescueBudget(plan, input.budget, input.currency) : null, [plan, input.budget, input.currency]);

  function update<K extends keyof EventInput>(key: K, value: EventInput[K]) {
    setInput((previous) => ({ ...previous, [key]: value }));
  }

  function togglePriority(value: (typeof priorityOptions)[number]) {
    setInput((previous) => ({ ...previous, priorities: previous.priorities.includes(value) ? previous.priorities.filter((item) => item !== value) : [...previous.priorities, value] }));
  }

  async function generate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(""); setNotice("");
    const checked = EventInputSchema.safeParse(input);
    if (!checked.success) {
      setError(checked.error.issues[0]?.message || "Please check your event details.");
      return;
    }
    setBusy(true);
    try {
      const response = await fetch("/api/plan", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(checked.data) });
      const payload: unknown = await response.json();
      if (!response.ok) {
        const errorPayload = ErrorResponseSchema.safeParse(payload);
        throw new Error(errorPayload.success ? errorPayload.data.error : "Unable to generate your plan.");
      }
      const planPayload = PlanResponseSchema.safeParse(payload);
      if (!planPayload.success) throw new Error("The generated plan was invalid. Please try again.");
      setPlan(planPayload.data.plan);
      setNotice(planPayload.data.notice || (planPayload.data.mode === "gemini" ? "Your personalized AI plan is ready." : "Your sample plan is ready."));
      setShowRescue(false); setActiveTab("Overview");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong. Please try again.");
    } finally { setBusy(false); }
  }

  function useDemo() {
    const checked = EventInputSchema.safeParse(input);
    if (!checked.success) { setError(checked.error.issues[0]?.message || "Please check your event details."); return; }
    setPlan(createDemoPlan(checked.data)); setNotice("Demo plan created locally. Add a Gemini API key to enable live AI generation."); setError(""); setShowRescue(false);
  }

  function toggleTask(index: number) {
    if (!plan) return;
    setPlan({ ...plan, timeline: plan.timeline.map((task, i) => i === index ? { ...task, done: !task.done } : task) });
  }
  function updateVendor(index: number, status: "To contact" | "Contacted" | "Booked") {
    if (!plan) return;
    setPlan({ ...plan, vendors: plan.vendors.map((vendor, i) => i === index ? { ...vendor, status } : vendor) });
  }
  function exportPlan() {
    if (!plan) return;
    const blob = new Blob([JSON.stringify({ input, plan }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob); const link = document.createElement("a");
    link.href = url; link.download = "celebrai-event-plan.json"; link.click(); URL.revokeObjectURL(url);
  }

  return <main className="app-shell">
    <aside className="sidebar">
      <a className="brand" href="#top" aria-label="CelebrAI home"><span className="brand-mark"><Icon name="spark"/></span><span>Celebr<span>AI</span></span></a>
      <p className="side-label">WORKSPACE</p>
      <nav aria-label="Main navigation" className="side-nav">
        {[{name:"Overview",icon:"spark"},{name:"Budget planner",icon:"wallet"},{name:"Timeline",icon:"calendar"},{name:"Vendors",icon:"users"},{name:"Ideas studio",icon:"bulb"}].map((item) => <button key={item.name} className={`nav-item ${activeTab === item.name ? "selected" : ""}`} onClick={() => { setActiveTab(item.name); if (item.name === "Budget planner") setShowRescue(true); }}><Icon name={item.icon}/>{item.name}</button>)}
      </nav>
      <div className="sidebar-bottom"><div className="help-icon"><Icon name="heart"/></div><p className="side-help-title">Made for your moments</p><p className="side-help-copy">Thoughtful plans. Less stress. More celebration.</p><span className="version-pill">PROMPTWARS · CHALLENGE 05</span></div>
    </aside>

    <section className="main-area" id="top">
      <header className="topbar"><div className="breadcrumb">Workspace <span>/</span> <strong>{activeTab}</strong></div><div className="topbar-right"><span className="secure-pill"><span className="status-dot"/> Your plans stay in this browser</span><div className="avatar" aria-label="CelebrAI account">C</div></div></header>
      <div className="content-wrap">
        <section className="welcome-row"><div><div className="eyebrow"><span className="eyebrow-star">✳</span> YOUR PERSONAL EVENT CO-PILOT</div><h1>Make room for <em>the magic.</em></h1><p className="welcome-copy">Dream up a celebration. We’ll help you bring every detail together.</p></div><div className="welcome-art" aria-hidden="true"><span className="art-sun">✳</span><span className="art-circle circle-one"/><span className="art-circle circle-two"/><span className="art-spark">✦</span></div></section>

        <section className="planner-grid">
          <div className="panel form-panel">
            <div className="panel-heading"><div className="heading-icon pink"><Icon name="spark"/></div><div><h2>Let’s plan your event</h2><p>A few details help us make it yours.</p></div></div>
            <form onSubmit={generate} className="event-form">
              <div className="field"><label htmlFor="eventType">What are we celebrating?</label><select id="eventType" value={input.eventType} onChange={(e) => update("eventType", e.target.value as EventInput["eventType"])}><option>Wedding</option><option>Birthday</option><option>Community event</option><option>Anniversary</option><option>College event</option></select></div>
              <div className="field"><label htmlFor="eventName">Give it a name <span className="optional">OPTIONAL</span></label><input id="eventName" value={input.eventName} maxLength={80} onChange={(e) => update("eventName", e.target.value)} placeholder="e.g. Ananya’s garden birthday"/></div>
              <div className="form-two"><div className="field"><label htmlFor="eventDate">Event date</label><input id="eventDate" type="date" value={input.eventDate} onChange={(e) => update("eventDate", e.target.value)}/></div><div className="field"><label htmlFor="guests">Guest count</label><input id="guests" type="number" min={1} max={5000} value={input.guests} onChange={(e) => update("guests", Number(e.target.value))}/></div></div>
              <div className="field"><label htmlFor="location">Where is it happening?</label><input id="location" value={input.location} maxLength={100} onChange={(e) => update("location", e.target.value)} placeholder="City or neighborhood"/></div>
              <div className="form-two"><div className="field"><label htmlFor="budget">Your total budget</label><div className="money-input"><span>{input.currency === "INR" ? "₹" : "$"}</span><input id="budget" type="number" min={1000} max={100000000} step={500} value={input.budget} onChange={(e) => update("budget", Number(e.target.value))}/></div></div><div className="field"><label htmlFor="currency">Currency</label><select id="currency" value={input.currency} onChange={(e) => update("currency", e.target.value as EventInput["currency"])}><option value="INR">INR · Rupee</option><option value="USD">USD · Dollar</option></select></div></div>
              <fieldset className="field priority-field"><legend>Pick your vibe</legend><div className="theme-grid">{[{label:"Elegant",emoji:"✧"},{label:"Traditional",emoji:"❋"},{label:"Fun & colorful",emoji:"✿"},{label:"Eco-friendly",emoji:"♧"},{label:"Minimalist",emoji:"◌"},{label:"Cultural",emoji:"✺"}].map((theme) => <button type="button" key={theme.label} aria-pressed={input.theme === theme.label} onClick={() => update("theme", theme.label as EventInput["theme"])} className={`theme-chip ${input.theme === theme.label ? "active" : ""}`}><span>{theme.emoji}</span>{theme.label}</button>)}</div></fieldset>
              <fieldset className="field priority-field"><legend>What matters most?</legend><div className="priority-grid">{priorityOptions.map((priority) => <label key={priority} className="check-chip"><input type="checkbox" checked={input.priorities.includes(priority)} onChange={() => togglePriority(priority)}/><span>{priority}</span></label>)}</div></fieldset>
              <div className="field"><label htmlFor="notes">Any special requests? <span className="optional">OPTIONAL</span></label><textarea id="notes" rows={3} maxLength={500} value={input.notes} onChange={(e) => update("notes", e.target.value)} placeholder="Dietary needs, must-have moments, or ideas you love…"/></div>
              {error && <p className="alert error" role="alert">{error}</p>}
              {notice && <p className="alert info" role="status">{notice}</p>}
              <button className="primary-button" type="submit" disabled={busy}>{busy ? <><span className="spinner"/> Creating your plan…</> : <><Icon name="spark"/> Generate my event plan <Icon name="arrow"/></>}</button>
              <button className="text-button" type="button" onClick={useDemo}>Try with instant demo data</button>
              <p className="privacy-note">Your plan is saved in this browser. With live AI enabled, event details are sent to Google Gemini. Use the demo to keep planning local.</p>
            </form>
          </div>

          <div className="results-column">
            {!plan ? <section className="empty-state panel"><div className="empty-illustration"><div className="illustration-card card-back">✿</div><div className="illustration-card card-front"><span>✧</span><strong>Your next<br/>great memory</strong><small>starts here</small></div><span className="float-star star-a">✦</span><span className="float-star star-b">✳</span></div><div className="empty-copy"><span className="small-kicker">A LITTLE INSPIRATION</span><h2>Every great event<br/>starts with a <em>feeling.</em></h2><p>Tell us what you’re dreaming of. Your budget, timeline, and personalized ideas will come together right here.</p><div className="empty-features"><span><Icon name="wallet"/> Smart budget</span><span><Icon name="calendar"/> Clear timeline</span><span><Icon name="bulb"/> Fresh ideas</span></div></div><div className="empty-footer"><span>✧</span> Thoughtfully planned, uniquely yours.</div></section> : <>
              <div className="results-topline"><div><span className="small-kicker">YOUR CELEBRATION BLUEPRINT</span><h2>{plan.title}</h2><p>{plan.summary}</p></div><button className="outline-button" onClick={exportPlan} type="button">Export plan <span>↗</span></button></div>
              <div className="stats-grid"><div className="stat-card"><div className="stat-label"><span>Estimated budget</span><span className="stat-icon lilac"><Icon name="wallet"/></span></div><strong>{formatMoney(total, input.currency)}</strong><small>of {formatMoney(input.budget, input.currency)} planned</small><div className="progress-track"><span style={{width:`${Math.min(100, input.budget ? total / input.budget * 100 : 0)}%`}}/></div></div><div className="stat-card"><div className="stat-label"><span>Tasks completed</span><span className="stat-icon mint"><Icon name="check"/></span></div><strong>{completed}<small className="stat-muted"> / {plan.timeline.length}</small></strong><small>Keep the momentum going</small><div className="progress-track mint-track"><span style={{width:`${plan.timeline.length ? completed / plan.timeline.length * 100 : 0}%`}}/></div></div></div>
              <nav className="tab-row" aria-label="Event plan sections">{["Overview", "Budget planner", "Timeline", "Vendors", "Ideas studio"].map((tab) => <button key={tab} type="button" aria-current={activeTab === tab ? "page" : undefined} className={activeTab === tab ? "tab active-tab" : "tab"} onClick={() => { setActiveTab(tab); setShowRescue(tab === "Budget planner"); }}>{tab}</button>)}</nav>
              {activeTab === "Overview" && <>
                <section className="panel detail-panel"><div className="section-heading"><div><h3>Your event at a glance</h3><p>A thoughtful starting point, ready to personalize.</p></div><span className="status-tag"><span/> {plan.generatedBy === "gemini" ? "AI generated" : "Demo plan"}</span></div><div className="overview-details"><div className="overview-tile"><span className="tile-icon">✳</span><div><small>EVENT DATE</small><strong>{new Date(`${input.eventDate}T12:00:00`).toLocaleDateString("en-IN", {day:"numeric",month:"short",year:"numeric"})}</strong></div></div><div className="overview-tile"><span className="tile-icon">♧</span><div><small>LOCATION</small><strong>{input.location}</strong></div></div><div className="overview-tile"><span className="tile-icon">♡</span><div><small>GUESTS</small><strong>{input.guests.toLocaleString("en-IN")} people</strong></div></div></div><div className="note-list">{plan.themeNotes.map((note, i) => <p key={i}><span>✦</span>{note}</p>)}</div></section>
                <section className="panel detail-panel"><div className="section-heading"><div><h3>Coming up next</h3><p>Your first steps toward a stress-free event.</p></div><button className="link-button" onClick={() => setActiveTab("Timeline")}>View timeline <Icon name="arrow"/></button></div><div className="next-task-list">{plan.timeline.slice(0, 3).map((task, i) => <div className="next-task" key={`${task.title}-${i}`}><span className={`task-number ${task.done ? "done" : ""}`}>{task.done ? "✓" : `0${i+1}`}</span><div><strong>{task.title}</strong><small>{task.dueDate}</small></div><span className={`priority ${task.priority.toLowerCase()}`}>{task.priority}</span></div>)}</div></section>
              </>}
              {activeTab === "Budget planner" && <section className="panel detail-panel"><div className="section-heading"><div><h3>Smart budget planner</h3><p>Estimates to help you allocate your budget intentionally.</p></div><span className="status-tag">{formatMoney(total, input.currency)}</span></div><div className="budget-list">{(showRescue && rescue ? rescue.lines : plan.budget).map((line) => <div className="budget-line" key={line.category}><div className="budget-line-top"><strong>{line.category}</strong><b>{formatMoney(line.amount, input.currency)}</b></div><div className="budget-bar"><span style={{width:`${input.budget ? Math.min(100, line.amount / input.budget * 100 * 4) : 0}%`}}/></div><small>{line.rationale}</small></div>)}</div><div className="budget-total"><span>Total planned</span><strong>{formatMoney(showRescue && rescue ? rescue.revised : total, input.currency)}</strong></div><button className="primary-button rescue-button" onClick={() => setShowRescue(!showRescue)} type="button"><Icon name="spark"/>{showRescue ? "View original allocation" : "Rebalance my budget"}<Icon name="arrow"/></button>{showRescue && rescue && <p className="rescue-note" role="status">{rescue.message} Protect essential guest needs and confirm revised costs before booking.</p>}<p className="fine-print">All amounts are estimates, not live vendor quotes. Confirm taxes, service charges, and availability directly with vendors.</p></section>}
              {activeTab === "Timeline" && <section className="panel detail-panel"><div className="section-heading"><div><h3>Your planning timeline</h3><p>Check off tasks as you make progress.</p></div><span className="status-tag">{completed}/{plan.timeline.length} done</span></div><div className="timeline-list">{plan.timeline.map((task, i) => <label className={`timeline-task ${task.done ? "task-complete" : ""}`} key={`${task.title}-${i}`}><input type="checkbox" checked={task.done} onChange={() => toggleTask(i)}/><span className="timeline-dot"/><span className="timeline-task-content"><strong>{task.title}</strong><small>{task.dueDate}</small></span><span className={`priority ${task.priority.toLowerCase()}`}>{task.priority}</span></label>)}</div><p className="fine-print">Dates are suggested planning targets based on the event date. Adjust them for your lead time.</p></section>}
              {activeTab === "Vendors" && <section className="panel detail-panel"><div className="section-heading"><div><h3>Vendor checklist</h3><p>Keep important conversations and bookings organized.</p></div><span className="status-tag">{plan.vendors.filter(v => v.status === "Booked").length} booked</span></div><div className="vendor-list">{plan.vendors.map((vendor, i) => <div className="vendor-row" key={`${vendor.category}-${i}`}><div className="vendor-icon"><Icon name={vendor.category === "Venue" ? "heart" : vendor.category === "Catering" ? "spark" : "users"}/></div><div className="vendor-main"><strong>{vendor.category}</strong><p>{vendor.task}</p><small>{vendor.notes}</small></div><label className="sr-only" htmlFor={`vendor-${i}`}>{vendor.category} status</label><select id={`vendor-${i}`} value={vendor.status} onChange={(e) => updateVendor(i, e.target.value as "To contact" | "Contacted" | "Booked")}><option>To contact</option><option>Contacted</option><option>Booked</option></select></div>)}</div><p className="fine-print">No vendor is verified or booked by CelebrAI. Confirm credentials, pricing, availability, and terms directly.</p></section>}
              {activeTab === "Ideas studio" && <section className="panel detail-panel"><div className="section-heading"><div><h3>Ideas made for your moment</h3><p>Personalized starting points for your celebration.</p></div><span className="status-tag">{input.theme}</span></div><div className="ideas-grid">{plan.ideas.map((idea, i) => <article className="idea-card" key={`${idea.title}-${i}`}><span className={`idea-art idea-art-${i % 3}`}>{["✿", "✧", "♧"][i % 3]}</span><small>{idea.category}</small><h4>{idea.title}</h4><p>{idea.description}</p></article>)}</div><div className="subsection"><h3>Keep in mind</h3>{plan.risks.map((risk, i) => <p className="risk-item" key={i}><span>!</span>{risk}</p>)}</div></section>}
              <section className="panel assumption-panel"><span className="assumption-icon">i</span><div><strong>A little note on estimates</strong><p>{plan.assumptions.join(" ")}</p></div></section>
            </>}
            <footer className="page-footer"><span>Celebr<span className="pink-text">AI</span> <span className="footer-dot">·</span> Made for moments that matter.</span><span>PromptWars Virtual · Challenge 05</span></footer>
          </div>
        </section>
      </div>
    </section>
  </main>;
}
