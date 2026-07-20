import { getCustomerBook, PORTFOLIO_SIZE } from "./customer_book.js";

const state = {
  view: "today",
  scenarioId: "new-parent",
  scenario: null,
  projection: null,
  intelligence: null,
  selected: new Set(),
  sim: null,
  customerBook: getCustomerBook(),
  bookFilter: "all",
  bookQuery: "",
  scenariosList: [],
  twinCards: null,
  homePreviewId: "job-loss",
  futureBranch: "ignored",
  futureMessages: [],
  futureBusy: false,
  futureSessionId: `demo-${Date.now()}`,
};

const VIEW_META = {
  today: {
    breadcrumb: "RELATIONSHIP INTELLIGENCE / <span>TODAY</span>",
    title: "Good morning, Jamie.",
    subhead: "Three customers have high-intent life events worth reviewing today.",
  },
  client: {
    breadcrumb: "RELATIONSHIP INTELLIGENCE / <span>DIGITAL TWIN</span>",
    title: "Client twin outlook",
    subhead: "See how this life event changes the next 12 months — then prepare to engage.",
  },
  customers: {
    breadcrumb: "RELATIONSHIP INTELLIGENCE / <span>CUSTOMERS</span>",
    title: "Your customers",
    subhead: "148 relationships · filter to life events, then open the twin.",
  },
  future: {
    breadcrumb: "DIGITAL TWIN / <span>FUTURE YOU</span>",
    title: "Ask the customer’s digital twin",
    subhead: "Grounded in projected cashflow — not today’s balance sheet alone.",
  },
};

const money = new Intl.NumberFormat("en-SG", {
  style: "currency",
  currency: "SGD",
  maximumFractionDigits: 0,
});

const customerDetails = {
  "new-parent": {
    initials: "AM",
    fullName: "Amira Malik",
    age: 34,
    occupation: "Product Director",
    tenure: "6y 4m",
    aum: "S$186,400",
    income: "S$6,200/mo",
    tier: "Priority",
    health: 76,
    context: "Growing family",
    phone: "+65 9123 8841",
    products: [
      { name: "Family Protection Plan", type: "PROTECTION", fit: 96, value: "S$2,400/yr", icon: "♢", color: "blue", why: "New dependant detected; current protection gap estimated at S$420K.", impact: "Protects 7 years of household income", action: 480 },
      { name: "SmartSaver Plus", type: "SAVINGS", fit: 91, value: "+2.8% p.a.", icon: "↗", color: "teal", why: "Recurring childcare costs create a need for a dedicated liquid buffer.", impact: "Builds a 4-month family buffer", action: 350 },
      { name: "Education Builder", type: "INVESTMENT", fit: 84, value: "From S$250/mo", icon: "◈", color: "gold", why: "Long time horizon and stable surplus suit a goal-based education plan.", impact: "Potential S$82K by age 18", action: 250 },
    ],
  },
  "job-loss": {
    initials: "DT",
    fullName: "Daniel Tan",
    age: 42,
    occupation: "Operations Lead",
    tenure: "9y 1m",
    aum: "S$312,800",
    income: "Income interrupted",
    tier: "Priority",
    health: 79,
    context: "Income transition",
    phone: "+65 9782 3306",
    products: [
      { name: "Payment Relief Programme", type: "SUPPORT", fit: 98, value: "3 months", icon: "⌁", color: "blue", why: "Salary interruption detected while fixed commitments remain elevated.", impact: "Extends cash runway by 3 months", action: 1200 },
      { name: "FlexiCash Reserve", type: "LIQUIDITY", fit: 89, value: "S$15K limit", icon: "↗", color: "teal", why: "Strong relationship history and short-term liquidity pressure.", impact: "Creates an emergency bridge", action: 420 },
      { name: "Career Transition Cover", type: "PROTECTION", fit: 78, value: "S$68/mo", icon: "♢", color: "gold", why: "Protection review is timely during employment transition.", impact: "Maintains essential coverage", action: 310 },
    ],
  },
  wedding: {
    initials: "PS",
    fullName: "Priya Shah",
    age: 31,
    occupation: "Legal Counsel",
    tenure: "4y 8m",
    aum: "S$228,600",
    income: "S$7,800/mo",
    tier: "Priority",
    health: 74,
    context: "Getting married",
    phone: "+65 9014 5572",
    products: [
      { name: "Premier Joint Account", type: "BANKING", fit: 97, value: "+1.5% bonus", icon: "∞", color: "blue", why: "Shared vendor payments and partner contributions signal joint money management.", impact: "One view of shared finances", action: 900 },
      { name: "Celebration Instalments", type: "CREDIT", fit: 90, value: "0% for 6 mo", icon: "↗", color: "teal", why: "Known wedding expenses cluster over the next five months.", impact: "Smooths peak vendor payments", action: 700 },
      { name: "Couples Wealth Plan", type: "INVESTMENT", fit: 83, value: "From S$500/mo", icon: "◈", color: "gold", why: "High combined surplus supports post-wedding goal planning.", impact: "Starts a shared wealth journey", action: 600 },
    ],
  },
};

const $ = (selector) => document.querySelector(selector);
const nodes = {
  twinImpactStrip: $("#twinImpactStrip"),
  productList: $("#productList"),
  chart: $("#chart"),
  homeChart: $("#homeChart"),
};

init();

async function init() {
  const list = await fetchJson("/api/scenarios");
  state.scenariosList = list.scenarios;
  await Promise.all([loadTwinImpactStrip(), loadScenario(state.scenarioId)]);
  bindActions();
  setView("today");
  renderFuturePicker();
  renderFutureSuggestions();
  renderFutureThread();
}

function setView(name) {
  state.view = name;
  document.querySelectorAll(".app-view").forEach((panel) => {
    const active = panel.dataset.viewPanel === name;
    panel.hidden = !active;
    panel.classList.toggle("active", active);
  });
  // Client is a drill-in from Today — keep Today highlighted in the nav
  const navView = name === "client" ? "today" : name;
  document.querySelectorAll(".nav-item[data-view]").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.view === navView);
  });

  if (name === "client") {
    const d = customerDetails[state.scenarioId];
    $("#topBreadcrumb").innerHTML = VIEW_META.client.breadcrumb;
    $("#topTitle").textContent = d?.fullName || VIEW_META.client.title;
    $("#topSubhead").textContent = VIEW_META.client.subhead;
  } else {
    const meta = VIEW_META[name] || VIEW_META.today;
    $("#topBreadcrumb").innerHTML = meta.breadcrumb;
    $("#topTitle").textContent = meta.title;
    $("#topSubhead").textContent = meta.subhead;
  }

  if (name === "customers") openCustomerBook();
  if (name === "today" && state.twinCards) {
    renderPortfolioStrip(state.twinCards);
    renderTwinImpactStrip(state.twinCards);
    renderHomeOutlook(state.homePreviewId);
  }
  if (name === "future") {
    renderFuturePicker();
    renderFutureSuggestions();
    renderFutureThread();
  }
}

async function openClient(scenarioId) {
  await loadScenario(scenarioId);
  setView("client");
}

async function loadScenario(id) {
  state.scenarioId = id;
  $("#aiSource").innerHTML = "<i></i> ANALYSING";
  setTimelineStep(2);
  const [payload, intelligence] = await Promise.all([
    fetchJson(`/api/scenarios/${id}`),
    fetchJson(`/api/intelligence/${id}`),
  ]);
  state.scenario = payload.scenario;
  state.projection = payload.projection;
  state.selected = new Set([0, 1]);
  state.intelligence = intelligence;
  hydrateCustomerDetails();
  $("#aiSource").innerHTML = `<i></i> ${intelligence.source === "openai" ? "OPENAI · LIVE" : "VERIFIED FALLBACK"}`;
  document.querySelectorAll(".triage-card").forEach((b) => b.classList.toggle("active", b.dataset.id === id));
  renderProfile();
  renderProducts();
  await renderSimulation();
  setTimelineStep(3);
  if (state.view === "client") {
    const d = customerDetails[id];
    $("#topTitle").textContent = d?.fullName || VIEW_META.client.title;
  }
  if (state.view === "future") {
    state.futureMessages = [];
    renderFuturePicker();
    renderFutureSuggestions();
    renderFutureThread();
  }
}

function hydrateCustomerDetails() {
  const i = state.intelligence;
  const p = i.persona;
  const d = customerDetails[state.scenarioId];
  Object.assign(d, {
    initials: p.initials,
    fullName: p.fullName,
    age: p.age,
    occupation: p.occupation,
    tenure: `${Math.floor(p.tenureMonths / 12)}y ${p.tenureMonths % 12}m`,
    aum: money.format(p.totalAssets),
    income: p.monthlyIncome ? `${money.format(p.monthlyIncome)}/mo` : "Income interrupted",
    tier: p.segment,
    health: Math.round(70 + Math.min(25, p.tenureMonths / 12)),
    context: p.goals[0],
    phone: p.phone || d.phone,
    products: i.products.map((x, index) => ({
      name: x.name,
      type: x.type,
      fit: x.fit,
      value: x.annualValue ? `${money.format(x.annualValue)}/yr` : "No fee",
      icon: ["♢", "↗", "◈"][index],
      color: ["blue", "teal", "gold"][index],
      why: i.ai.productNarratives[x.name] || x.reason,
      impact: x.impact,
      action: Number(x.monthlyImpact) || 0,
      guardrails: x.guardrails,
    })),
  });
}

function phoneDigits(phone) {
  return String(phone || "").replace(/\D/g, "");
}

function telHref(phone) {
  const digits = phoneDigits(phone);
  return digits ? `tel:+${digits}` : "#";
}

function whatsappHref(phone) {
  const digits = phoneDigits(phone);
  return digits ? `https://wa.me/${digits}` : "#";
}

function renderContactActions(d) {
  const call = $("#callCustomer");
  const wa = $("#whatsappCustomer");
  const phoneEl = $("#customerPhone");
  const phone = d?.phone;
  const hasPhone = Boolean(phoneDigits(phone));

  if (call) {
    call.hidden = !hasPhone;
    call.href = telHref(phone);
    call.setAttribute("aria-label", hasPhone ? `Call ${d.fullName} at ${phone}` : "Call unavailable");
  }
  if (wa) {
    wa.hidden = !hasPhone;
    wa.href = whatsappHref(phone);
    wa.setAttribute("aria-label", hasPhone ? `WhatsApp ${d.fullName}` : "WhatsApp unavailable");
  }
  if (phoneEl) {
    phoneEl.hidden = !hasPhone;
    phoneEl.textContent = phone || "";
  }
}

function renderProfile() {
  const d = customerDetails[state.scenarioId];
  const s = state.scenario;
  $("#profileInitials").textContent = d.initials;
  $("#customerName").textContent = d.fullName;
  $("#customerMeta").textContent = `${d.age} years · ${d.occupation}`;
  $(".tier").textContent = d.tier.toUpperCase();
  renderContactActions(d);
  $("#profileGrid").innerHTML = [
    ["TOTAL RELATIONSHIP", d.tenure],
    ["ASSETS WITH US", d.aum],
    ["MONTHLY INCOME", d.income],
    ["MOBILE", d.phone || "—"],
    ["LIFE STAGE", d.context],
  ]
    .map(([a, b]) => `<div><span>${a}</span><strong>${b}</strong></div>`)
    .join("");
  $("#eventTitle").textContent = s.event.label;
  $("#eventMeta").textContent = `Detected in ${s.event.detectedMonth} · High relevance to financial health`;
  $("#confidence").textContent = `${Math.round(state.intelligence.event.confidence * 100)}%`;
  renderDetectedChanges();
  $("#signalTrace").innerHTML = state.intelligence.event.evidence
    .slice(0, 2)
    .map(
      (e) =>
        `<div><i></i><span><b>${escapeHtml(e.label)}:</b> ${escapeHtml(e.value)}</span></div>`
    )
    .join("");
  const lede = $("#twinLede");
  if (lede) {
    lede.textContent = `If ${s.event.label.toLowerCase()} is left unmanaged, the twin shows where stress appears — and how support changes the path.`;
  }
  updateWellbeingScore(d.health, d.health);
}

function renderDetectedChanges() {
  const el = $("#detectedChanges");
  if (!el || !state.intelligence) return;
  const f = state.intelligence.features || {};
  const id = state.scenarioId;
  const changes = [];

  if (id === "job-loss") {
    changes.push({
      kind: "income",
      label: "Salary interrupted",
      detail:
        f.missingPayrollCycles >= 2
          ? `${f.missingPayrollCycles} expected payroll cycles missing`
          : "Payroll pattern broken",
      confidence: 0.98,
    });
    changes.push({
      kind: "spend",
      label: "Fixed commitments remain",
      detail: "Mortgage and insurance still drawing while income is paused",
      confidence: 0.91,
    });
    changes.push({
      kind: "savings",
      label: "Cash runway thinning",
      detail:
        f.emergencyFundMonths != null
          ? `Emergency buffer ~${f.emergencyFundMonths} months at current burn`
          : "Buffer under pressure without support",
      confidence: 0.88,
    });
  } else if (id === "new-parent") {
    changes.push({
      kind: "spend",
      label: "Family spend rising",
      detail:
        f.babySpendGrowth > 0
          ? `Baby-category spend up ~S$${f.babySpendGrowth} vs earlier months`
          : "Child-related spend accelerating",
      confidence: 0.89,
    });
    changes.push({
      kind: "spend",
      label: "Home / childcare costs",
      detail:
        f.childcareRecurringMonths >= 2
          ? `Recurring childcare across ${f.childcareRecurringMonths} months`
          : "Daycare commitments appearing",
      confidence: 0.96,
    });
    changes.push({
      kind: "savings",
      label: "Surplus under pressure",
      detail:
        f.monthlySurplus != null
          ? `Monthly surplus now ~${money.format(f.monthlySurplus)} after new costs`
          : "Discretionary buffer shrinking",
      confidence: 0.84,
    });
  } else {
    changes.push({
      kind: "spend",
      label: "Wedding spend spike",
      detail:
        f.weddingSpend90d > 0
          ? `S$${Number(f.weddingSpend90d).toLocaleString("en-SG")} across wedding merchants (90d)`
          : "Vendor cluster accelerating",
      confidence: 0.95,
    });
    changes.push({
      kind: "income",
      label: "Partner contributions",
      detail:
        f.partnerContributionMonths >= 2
          ? `Shared inflows across ${f.partnerContributionMonths} months`
          : "Joint money patterns emerging",
      confidence: 0.9,
    });
    changes.push({
      kind: "savings",
      label: "Peak payment risk",
      detail: "Large vendor balances still ahead — liquidity window tightens",
      confidence: 0.86,
    });
  }

  el.innerHTML = changes
    .map(
      (c) =>
        `<div class="detected-chip kind-${c.kind}"><em>${Math.round(c.confidence * 100)}%</em><span class="detected-kind">${c.kind}</span><strong>${escapeHtml(c.label)}</strong><small>${escapeHtml(c.detail)}</small></div>`
    )
    .join("");
}

function renderProducts() {
  const products = customerDetails[state.scenarioId].products;
  nodes.productList.innerHTML = products
    .map((p, i) => {
      const why = p.why || p.impact || "Fits the customer's current life-event context.";
      return `<button class="product ${state.selected.has(i) ? "selected" : ""}" data-index="${i}" type="button"><span class="check">✓</span><span class="product-icon ${p.color}">${p.icon}</span><span class="product-copy"><small class="product-type">${p.type}</small><strong>${escapeHtml(p.name)}</strong><span class="impact">${escapeHtml(p.impact)}</span><span class="why"><b>Why this fits</b>${escapeHtml(why)}</span></span><span class="product-meta"><b>${p.fit}%</b><strong>${escapeHtml(p.value)}</strong></span></button>`;
    })
    .join("");
  nodes.productList.querySelectorAll(".product").forEach((btn) =>
    btn.addEventListener("click", async () => {
      const i = Number(btn.dataset.index);
      if (state.selected.has(i)) state.selected.delete(i);
      else state.selected.add(i);
      renderProducts();
      setTimelineStep(3);
      await renderSimulation();
    })
  );
}

async function renderSimulation() {
  const products = customerDetails[state.scenarioId].products;
  const chosen = [...state.selected]
    .map((i) => products[i])
    .filter(Boolean)
    .map((p) => ({
      name: p.name,
      label: p.name,
      monthlyImpact: Number(p.action) || 0,
      startsMonth: 1,
    }));

  const payload = await fetchJson("/api/project", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ scenarioId: state.scenarioId, actions: chosen }),
  });

  const base = payload.ignored.trajectory.map((p) => p.projectedBalance);
  const modeled = payload.modeled.trajectory.map((p) => p.projectedBalance);
  const delta = Number.isFinite(payload.delta.endingBalance) ? payload.delta.endingBalance : 0;
  const baseEnding = base.at(-1) || 0;
  const pct =
    chosen.length === 0
      ? 0
      : Math.round(Math.min(99, Math.abs(delta) / (Math.abs(baseEnding) || 1000) * 100));

  const low = Math.min(...modeled);
  const baseLow = Math.min(...base);
  const lowDelta = low - baseLow;
  const riskElevated = modeled.some((v) => v < 0);
  const riskAvoided = Boolean(payload.ignored.overdraftMonth && !payload.modeled.overdraftMonth);
  const riskLabel = riskElevated ? "Elevated" : riskAvoided || chosen.length ? "Protected" : "Watch";

  state.sim = {
    delta,
    pct,
    low,
    lowDelta,
    riskLabel,
    riskAvoided,
    baseEnding,
    modeledEnding: modeled.at(-1),
    chosen,
    overdraftMonth: payload.modeled.overdraftMonth,
    baseOverdraftMonth: payload.ignored.overdraftMonth,
  };

  $("#deltaEnding").textContent = money.format(delta);
  $("#deltaEnding").classList.toggle("is-zero", delta === 0);
  $("#upliftPercent").textContent = `+${pct}%`;
  $("#upliftRing").style.setProperty("--progress", `${Math.max(12, pct * 3.6)}deg`);
  $("#lowestBalance").textContent = money.format(low);
  $("#lowestDelta").textContent =
    lowDelta === 0 ? "Same as current path" : `↑ ${money.format(lowDelta)} vs current path`;
  $("#riskAvoided").textContent = riskLabel;
  $("#riskAvoided").classList.toggle("risk-elevated", riskElevated);

  renderChart(base, modeled, payload);
  updateProjectedWellbeing(delta, riskAvoided, chosen);
}

function renderChart(base, modeled, payload, target = nodes.chart, fillId = "fill") {
  if (!target) return;
  const max = Math.max(...modeled, ...base);
  const min = Math.min(...modeled, ...base, 0);
  const range = max - min || 1;
  const dipIndex = payload.ignored.overdraftMonth
    ? payload.ignored.overdraftMonth - 1
    : base.indexOf(Math.min(...base));
  const protectedNow = !payload.modeled.overdraftMonth && Boolean(payload.ignored.overdraftMonth);

  const callout =
    dipIndex >= 0
      ? `<g class="chart-callout"><circle cx="${x(dipIndex)}" cy="${y(base[dipIndex], min, range)}" r="5" class="${protectedNow ? "safe" : "warn"}"/><text x="${x(dipIndex)}" y="${Math.max(14, y(base[dipIndex], min, range) - 10)}" text-anchor="middle">${protectedNow ? "Risk avoided" : "Risk window"}</text></g>`
      : "";

  target.innerHTML = `<svg viewBox="0 0 600 220" preserveAspectRatio="xMidYMid meet" role="img" aria-label="12 month liquidity projection"><defs><linearGradient id="${fillId}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="var(--sc-brand-blue)" stop-opacity=".22"/><stop offset="1" stop-color="var(--sc-brand-blue)" stop-opacity="0"/></linearGradient></defs><path class="area chart-animate" style="fill:url(#${fillId})" d="${areaPath(modeled, min, range)}"/><path class="line base chart-animate" d="${linePath(base, min, range)}"/><path class="line solution chart-animate" d="${linePath(modeled, min, range)}"/>${modeled.map((v, i) => `<circle class="chart-animate" cx="${x(i)}" cy="${y(v, min, range)}" r="3"/>`).join("")}${callout}</svg><div class="chart-labels">${["NOW", "M3", "M6", "M9", "M12"].map((v) => `<span>${v}</span>`).join("")}</div>`;
}

function updateWellbeingScore(base, projected) {
  const scoreEl = $("#healthScore");
  const projectedEl = $("#projectedHealth");
  const noteEl = $("#healthNote");
  const deltaEl = $("#healthDelta");
  const panel = $("#wellbeingPanel");
  const lifted = projected > base;

  if (scoreEl) scoreEl.textContent = String(base);
  if (projectedEl) {
    projectedEl.textContent = lifted ? `→ ${projected}` : "";
    projectedEl.hidden = !lifted;
  }
  const bar = $("#healthBar");
  if (bar) bar.style.width = `${projected}%`;

  if (deltaEl) {
    deltaEl.textContent = lifted ? `+${projected - base} pts` : "";
    deltaEl.hidden = !lifted;
  }
  if (panel) panel.classList.toggle("is-lifted", lifted);

  if (noteEl) {
    noteEl.textContent = lifted
      ? `Projected financial health after recommended actions · +${projected - base} pts`
      : "Select recommended support to see how wellbeing improves";
  }
}

function updateProjectedWellbeing(delta, riskAvoided, chosen) {
  const d = customerDetails[state.scenarioId];
  const base = d.health;
  if (!chosen.length) {
    updateWellbeingScore(base, base);
    return;
  }
  const liquidityBoost = Math.min(12, Math.round(Math.abs(delta) / 2500));
  const fitBoost = Math.min(6, Math.round(chosen.reduce((s, p) => s + (customerDetails[state.scenarioId].products.find((x) => x.name === p.name)?.fit || 0), 0) / chosen.length / 20));
  const riskBoost = riskAvoided ? 5 : 0;
  const projected = Math.min(98, base + liquidityBoost + fitBoost + riskBoost);
  updateWellbeingScore(base, projected);
  state.sim.projectedHealth = projected;
  state.sim.baseHealth = base;
}

function setTimelineStep(active) {
  document.querySelectorAll(".journey-step").forEach((step) => {
    const n = Number(step.dataset.step);
    step.classList.toggle("active", n === active);
    step.classList.toggle("done", n < active);
  });
}

const x = (i) => 10 + i * (580 / 11);
const y = (v, min, range) => 205 - ((v - min) / range) * 180;
function linePath(values, min, range) {
  return values.map((v, i) => `${i ? "L" : "M"}${x(i)},${y(v, min, range)}`).join(" ");
}
function areaPath(values, min, range) {
  return `${linePath(values, min, range)} L${x(11)},215 L${x(0)},215 Z`;
}

async function loadTwinImpactStrip() {
  const strip = nodes.twinImpactStrip;
  if (!strip) return;
  if (state.twinCards) {
    renderPortfolioStrip(state.twinCards);
    renderTwinImpactStrip(state.twinCards);
    renderHomeOutlook(state.homePreviewId);
    return;
  }
  strip.innerHTML = `<p class="book-empty">Loading twin projections…</p>`;
  try {
    const cards = await Promise.all(
      Object.keys(customerDetails).map(async (id) => {
        const payload = await fetchJson(`/api/scenarios/${id}`);
        return {
          id,
          scenario: payload.scenario,
          projection: payload.projection,
          details: customerDetails[id],
        };
      })
    );
    // Prefer the customer with the earliest stress window for the home preview
    const ranked = [...cards].sort((a, b) => {
      const am = a.projection.ignored.overdraftMonth ?? 99;
      const bm = b.projection.ignored.overdraftMonth ?? 99;
      return am - bm;
    });
    state.twinCards = cards;
    state.homePreviewId = ranked[0]?.id || state.scenarioId;
    renderMomentumSpark();
    renderPortfolioStrip(cards);
    renderTwinImpactStrip(cards);
    renderHomeOutlook(state.homePreviewId);
  } catch (error) {
    strip.innerHTML = `<p class="book-empty">Could not load twin impact.</p>`;
    console.error(error);
  }
}

function twinVerdict(projection) {
  const ignored = projection.ignored;
  if (ignored.overdraftMonth) {
    return `Stress in month ${ignored.overdraftMonth} if ignored`;
  }
  if (ignored.minBalance < ignored.startingBalance * 0.35) {
    return `Buffer thins sharply if unmanaged`;
  }
  return `Accepted path +${money.format(projection.delta.endingBalance)} ending balance`;
}

function miniSparkSvg(projection, fillId) {
  const base = projection.ignored.trajectory.map((p) => p.projectedBalance);
  const modeled = projection.accepted.trajectory.map((p) => p.projectedBalance);
  const max = Math.max(...modeled, ...base);
  const min = Math.min(...modeled, ...base, 0);
  const range = max - min || 1;
  const w = 160;
  const h = 40;
  const pad = 2;
  const sx = (i) => pad + (i * (w - pad * 2)) / Math.max(1, base.length - 1);
  const sy = (v) => h - pad - ((v - min) / range) * (h - pad * 2);
  const path = (values) =>
    values.map((v, i) => `${i ? "L" : "M"}${sx(i).toFixed(1)},${sy(v).toFixed(1)}`).join(" ");
  const area = `${path(modeled)} L${sx(modeled.length - 1).toFixed(1)},${h - pad} L${sx(0).toFixed(1)},${h - pad} Z`;
  return `<svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" aria-hidden="true"><defs><linearGradient id="${fillId}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="var(--sc-brand-blue)" stop-opacity=".28"/><stop offset="1" stop-color="var(--sc-brand-blue)" stop-opacity="0"/></linearGradient></defs><path class="area" style="fill:url(#${fillId})" d="${area}"/><path class="line base" d="${path(base)}"/><path class="line solution" d="${path(modeled)}"/></svg>`;
}

function renderPortfolioStrip(cards) {
  const reviewDue = state.customerBook.filter((c) => c.status.key === "review" || c.status.key === "life-event").length;
  const opportunity = cards.reduce((sum, c) => sum + (Number(c.projection?.delta?.endingBalance) || 0), 0);
  const highPriority = cards.length;

  const portfolioEl = $("#statPortfolio");
  const opportunityEl = $("#statOpportunity");
  const reviewEl = $("#statReview");
  const reviewNote = $("#statReviewNote");
  const opportunityDelta = $("#statOpportunityDelta");

  if (portfolioEl) portfolioEl.textContent = String(PORTFOLIO_SIZE);
  if (opportunityEl) {
    opportunityEl.textContent =
      opportunity >= 1000 ? `S$${(opportunity / 1000).toFixed(1)}K` : money.format(opportunity);
  }
  if (opportunityDelta) opportunityDelta.textContent = "↑ twin uplift if supported";
  if (reviewEl) reviewEl.textContent = String(reviewDue);
  if (reviewNote) reviewNote.textContent = `${highPriority} high priority`;
}

function renderMomentumSpark() {
  const el = $("#momentumSpark");
  if (!el) return;
  const points = [6, 9, 8, 12, 11, 14, 13, 17, 16, 19, 18, 22];
  const w = 88;
  const h = 28;
  const max = Math.max(...points);
  const min = Math.min(...points);
  const range = max - min || 1;
  const d = points
    .map((v, i) => {
      const xPos = (i / (points.length - 1)) * w;
      const yPos = h - 3 - ((v - min) / range) * (h - 8);
      return `${i ? "L" : "M"}${xPos.toFixed(1)},${yPos.toFixed(1)}`;
    })
    .join(" ");
  el.innerHTML = `<path d="${d}"/>`;
}

function renderTwinImpactStrip(cards) {
  const strip = nodes.twinImpactStrip;
  if (!strip) return;

  strip.innerHTML = cards
    .map((card) => {
      const { id, scenario, projection, details } = card;
      const conf = Math.round(scenario.event.confidence * 100);
      const active = id === state.homePreviewId;
      return `<button type="button" class="triage-card ${active ? "active" : ""}" data-id="${id}">
        <div class="triage-card-head">
          <span class="tab-avatar">${escapeHtml(details.initials)}</span>
          <span class="triage-card-copy">
            <strong>${escapeHtml(details.fullName)}</strong>
            <small>${escapeHtml(scenario.event.label)}</small>
          </span>
          <span class="confidence">${conf}%</span>
        </div>
        <div class="triage-spark">${miniSparkSvg(projection, `triageFill-${id}`)}</div>
        <p class="twin-verdict">${escapeHtml(twinVerdict(projection))}</p>
        <span class="triage-cta">View outlook <span aria-hidden="true">→</span></span>
      </button>`;
    })
    .join("");

  strip.querySelectorAll(".triage-card").forEach((btn) => {
    btn.addEventListener("click", () => {
      state.homePreviewId = btn.dataset.id;
      renderTwinImpactStrip(cards);
      renderHomeOutlook(btn.dataset.id);
    });
    btn.addEventListener("dblclick", () => openClient(btn.dataset.id));
  });
}

function renderHomeOutlook(scenarioId) {
  const card = state.twinCards?.find((c) => c.id === scenarioId);
  const title = $("#homeOutlookTitle");
  const lede = $("#homeOutlookLede");
  const deltaEl = $("#homeDelta");
  const lowestEl = $("#homeLowest");
  const riskEl = $("#homeRisk");
  if (!card || !nodes.homeChart) {
    if (lede) lede.textContent = "Loading twin projections…";
    return;
  }

  const { scenario, projection, details } = card;
  const base = projection.ignored.trajectory.map((p) => p.projectedBalance);
  const modeled = projection.accepted.trajectory.map((p) => p.projectedBalance);
  const delta = Number(projection.delta.endingBalance) || 0;
  const low = Math.min(...modeled);
  const riskElevated = modeled.some((v) => v < 0) || Boolean(projection.ignored.overdraftMonth);
  const riskLabel = riskElevated
    ? projection.ignored.overdraftMonth
      ? `Elevated · M${projection.ignored.overdraftMonth}`
      : "Elevated"
    : "Protected";

  if (title) title.textContent = `${details.fullName} · projected liquidity`;
  if (lede) {
    lede.textContent = `${scenario.event.label} — ignored vs supported path over the next 12 months.`;
  }
  if (deltaEl) deltaEl.textContent = money.format(delta);
  if (lowestEl) lowestEl.textContent = money.format(low);
  if (riskEl) {
    riskEl.textContent = riskLabel;
    riskEl.classList.toggle("risk-elevated", riskElevated);
  }

  renderChart(
    base,
    modeled,
    {
      ignored: projection.ignored,
      modeled: projection.accepted,
    },
    nodes.homeChart,
    "homeFill"
  );
}

function renderFuturePicker() {
  const el = $("#futurePicker");
  if (!el) return;
  el.innerHTML = Object.entries(customerDetails)
    .map(
      ([id, d]) =>
        `<button type="button" class="future-client ${id === state.scenarioId ? "active" : ""}" data-id="${id}"><span class="tab-avatar">${escapeHtml(d.initials)}</span><span><strong>${escapeHtml(d.fullName)}</strong><small>${escapeHtml(d.context)}</small></span></button>`
    )
    .join("");
  el.querySelectorAll("button").forEach((btn) => {
    btn.addEventListener("click", async () => {
      if (btn.dataset.id === state.scenarioId) return;
      state.futureMessages = [];
      await loadScenario(btn.dataset.id);
      renderFuturePicker();
      renderFutureSuggestions();
      renderFutureThread();
    });
  });
}

function renderFutureSuggestions() {
  const el = $("#futureSuggestions");
  if (!el) return;
  const fromList = state.scenariosList.find((s) => s.id === state.scenarioId);
  const questions = fromList?.suggestedQuestions || state.scenario?.suggestedQuestions || [
    "What should I watch out for next month?",
    "How different are the two futures?",
  ];
  el.innerHTML = questions
    .map((q, i) => `<button type="button" class="suggest-chip" data-index="${i}">${escapeHtml(q)}</button>`)
    .join("");
  el.querySelectorAll("button").forEach((btn) => {
    btn.addEventListener("click", () => askFutureYou(questions[Number(btn.dataset.index)]));
  });
}

function twinPathLabel(branch) {
  if (branch === "accepted") return "Accepted path";
  if (branch === "ignored") return "Ignored path";
  return null;
}

function twinMetaLabel(message) {
  const d = customerDetails[state.scenarioId];
  const firstName = d?.fullName?.split(" ")[0] || "You";
  const path = twinPathLabel(message.branch);

  if (message.role === "thinking") {
    return `Future ${firstName} · Thinking`;
  }
  if (message.source === "error") {
    return `Future ${firstName} · Unavailable`;
  }
  if (message.source === "openai") {
    return path ? `Future ${firstName} · ${path}` : `Future ${firstName} · Live`;
  }
  // cached-demo / cached-demo-fallback — keep demo plumbing out of the UI
  return path ? `Future ${firstName} · ${path}` : `Future ${firstName}`;
}

function renderFutureThread() {
  const el = $("#futureThread");
  if (!el) return;
  const d = customerDetails[state.scenarioId];
  if (!state.futureMessages.length) {
    const path = twinPathLabel(state.futureBranch)?.toLowerCase() || state.futureBranch;
    el.innerHTML = `<div class="chat-empty"><div class="profile-avatar">${escapeHtml(d.initials)}</div><p><strong>Future ${escapeHtml(d.fullName.split(" ")[0])}</strong> is ready.</p><small>Ask how this life event changes liquidity over the next year on the <b>${escapeHtml(path)}</b>.</small></div>`;
    return;
  }
  el.innerHTML = state.futureMessages
    .map((m) => {
      if (m.role === "user") {
        return `<div class="chat-bubble user"><p>${escapeHtml(m.text)}</p></div>`;
      }
      if (m.role === "thinking") {
        return `<div class="chat-bubble twin thinking" aria-live="polite"><span class="chat-meta">${escapeHtml(twinMetaLabel(m))}</span><p><span class="thinking-dots" aria-hidden="true"><i></i><i></i><i></i></span>${escapeHtml(m.text)}</p></div>`;
      }
      return `<div class="chat-bubble twin"><span class="chat-meta">${escapeHtml(twinMetaLabel(m))}</span><p>${escapeHtml(m.text)}</p></div>`;
    })
    .join("");
  el.scrollTop = el.scrollHeight;
}

function thinkingCue(question) {
  const q = String(question || "").toLowerCase();
  if (q.includes("watch")) return "Scanning next month’s liquidity trough…";
  if (q.includes("different") || q.includes("two futures")) return "Comparing ignored vs accepted branches…";
  if (q.includes("daycare")) return "Tracing daycare’s effect on monthly surplus…";
  if (q.includes("run out") || q.includes("out of cash")) return "Walking the cash runway month by month…";
  if (q.includes("buys") || q.includes("which action")) return "Ranking autopilot levers by impact…";
  if (q.includes("month four") || q.includes("month 4")) return "Zooming into month four cashflow…";
  if (q.includes("afford")) return "Stress-testing wedding spikes against the balance path…";
  if (q.includes("month five") || q.includes("month 5")) return "Opening the month-five ledger…";
  if (q.includes("calm") || q.includes("accepted")) return "Measuring how much calmer the accepted path feels…";
  return "Reading the projection trajectory…";
}

async function askFutureYou(question) {
  const q = String(question || "").trim();
  if (!q || state.futureBusy) return;
  state.futureBusy = true;
  state.futureMessages.push({ role: "user", text: q });
  state.futureMessages.push({ role: "thinking", text: thinkingCue(q) });
  renderFutureThread();
  const send = $("#futureSend");
  if (send) send.disabled = true;
  try {
    const [result] = await Promise.all([
      fetchJson("/api/future-you", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scenarioId: state.scenarioId,
          branch: state.futureBranch,
          question: q,
          sessionId: state.futureSessionId,
        }),
      }),
      new Promise((resolve) => setTimeout(resolve, 700)),
    ]);
    state.futureMessages = state.futureMessages.filter((m) => m.role !== "thinking");
    state.futureMessages.push({
      role: "twin",
      text: result.answer,
      source: result.source,
      branch: state.futureBranch,
    });
  } catch (error) {
    state.futureMessages = state.futureMessages.filter((m) => m.role !== "thinking");
    state.futureMessages.push({
      role: "twin",
      text: "The twin could not answer just now. Try again in a moment.",
      source: "error",
    });
    console.error(error);
  } finally {
    state.futureBusy = false;
    if (send) send.disabled = false;
    renderFutureThread();
  }
}

function bindActions() {
  $("#generateBrief").addEventListener("click", () => {
    setTimelineStep(4);
    openBrief();
  });
  $("#closeBrief").addEventListener("click", () => $("#briefDialog").close());
  $("#doneBrief").addEventListener("click", () => {
    $("#briefDialog").close();
    showToast("Brief added to client timeline ✓");
  });
  $("#copyBrief").addEventListener("click", async () => {
    await navigator.clipboard?.writeText($("#briefContent").innerText);
    showToast("Meeting brief copied ✓");
  });
  $("#showEvidence").addEventListener("click", openEvidence);
  $("#closeEvidence").addEventListener("click", () => $("#evidenceDialog").close());
  $("#viewAllCustomers")?.addEventListener("click", () => setView("customers"));
  $("#backToToday")?.addEventListener("click", () => setView("today"));
  $("#homeOpenTwin")?.addEventListener("click", () => openClient(state.homePreviewId || state.scenarioId));
  $("#brandHome")?.addEventListener("click", (e) => {
    e.preventDefault();
    setView("today");
  });
  $("#customerSearch")?.addEventListener("input", (e) => {
    state.bookQuery = e.target.value.trim().toLowerCase();
    renderCustomerBook();
  });
  $("#customerFilters")?.querySelectorAll(".book-filter").forEach((btn) => {
    btn.addEventListener("click", () => {
      state.bookFilter = btn.dataset.filter;
      $("#customerFilters").querySelectorAll(".book-filter").forEach((b) => b.classList.toggle("active", b === btn));
      renderCustomerBook();
    });
  });
  document.querySelectorAll(".nav-item[data-view]").forEach((btn) => {
    btn.addEventListener("click", () => setView(btn.dataset.view));
  });
  $("#futureBranch")?.querySelectorAll(".branch-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      state.futureBranch = btn.dataset.branch;
      $("#futureBranch").querySelectorAll(".branch-btn").forEach((b) => b.classList.toggle("active", b === btn));
      renderFutureThread();
    });
  });
  $("#futureForm")?.addEventListener("submit", (e) => {
    e.preventDefault();
    const input = $("#futureInput");
    const q = String(input?.value || "").trim();
    if (!q) return;
    if (input) input.value = "";
    askFutureYou(q);
  });
  bindSidebarToggle();
}

function openCustomerBook() {
  state.bookQuery = "";
  state.bookFilter = "all";
  const search = $("#customerSearch");
  if (search) search.value = "";
  $("#customerFilters")?.querySelectorAll(".book-filter").forEach((b) => {
    b.classList.toggle("active", b.dataset.filter === "all");
  });
  renderCustomerBook();
  search?.focus();
}

function filteredCustomerBook() {
  const q = state.bookQuery;
  const filter = state.bookFilter;
  return state.customerBook.filter((c) => {
    const matchesFilter =
      filter === "all" ||
      c.status.key === filter ||
      c.segment === filter;
    if (!matchesFilter) return false;
    if (!q) return true;
    const hay = `${c.fullName} ${c.occupation} ${c.segment} ${c.status.label} ${c.eventLabel || ""} ${c.phone || ""}`.toLowerCase();
    return hay.includes(q);
  });
}

function renderCustomerBook() {
  const list = filteredCustomerBook();
  const lifeEvents = state.customerBook.filter((c) => c.status.key === "life-event").length;
  const reviewDue = state.customerBook.filter((c) => c.status.key === "review").length;
  $("#customerBookMeta").innerHTML = `<span><strong>${PORTFOLIO_SIZE}</strong> active relationships</span><span><strong>${lifeEvents}</strong> life events</span><span><strong>${reviewDue}</strong> review due</span><span>Showing <strong>${list.length}</strong></span>`;

  if (!list.length) {
    $("#customerBook").innerHTML = `<p class="book-empty">No customers match this search.</p>`;
    return;
  }

  $("#customerBook").innerHTML = list
    .map((c) => {
      const interactive = Boolean(c.scenarioId);
      const aum = money.format(c.aum);
      const contact =
        c.lastContactDays === 0 ? "Today" : c.lastContactDays === 1 ? "1 day ago" : `${c.lastContactDays} days ago`;
      const digits = phoneDigits(c.phone);
      const reach = digits
        ? `<span class="book-reach"><a class="book-reach-btn call" href="${telHref(c.phone)}" title="Call ${escapeHtml(c.fullName)}" aria-label="Call ${escapeHtml(c.fullName)}"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6A19.79 19.79 0 012.12 4.18 2 2 0 014.11 2h3a2 2 0 012 1.72c.13.96.36 1.9.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0122 16.92z"/></svg></a><a class="book-reach-btn whatsapp" href="${whatsappHref(c.phone)}" target="_blank" rel="noopener noreferrer" title="WhatsApp ${escapeHtml(c.fullName)}" aria-label="WhatsApp ${escapeHtml(c.fullName)}"><svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M17.47 14.38c-.3-.15-1.77-.87-2.04-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.95 1.17-.17.2-.35.22-.65.07-.3-.15-1.26-.46-2.4-1.48-.89-.79-1.48-1.77-1.66-2.07-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.67-1.61-.92-2.21-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.48s1.07 2.87 1.22 3.07c.15.2 2.1 3.2 5.08 4.49.71.31 1.26.49 1.69.63.71.23 1.36.2 1.87.12.57-.09 1.77-.72 2.02-1.42.25-.7.25-1.3.17-1.42-.07-.12-.27-.2-.57-.35z"/><path d="M12.04 2C6.5 2 2.01 6.48 2.01 12c0 1.77.46 3.45 1.28 4.92L2 22l5.25-1.38A9.96 9.96 0 0012.04 22C17.56 22 22 17.52 22 12S17.56 2 12.04 2zm0 18.15c-1.59 0-3.08-.43-4.36-1.18l-.31-.19-3.11.82.83-3.04-.2-.32A8.12 8.12 0 013.9 12c0-4.48 3.65-8.12 8.14-8.12 4.48 0 8.12 3.64 8.12 8.12 0 4.49-3.64 8.15-8.12 8.15z"/></svg></a></span>`
        : `<span class="book-reach"></span>`;
      return `<div class="book-row ${interactive ? "interactive" : ""} ${c.scenarioId === state.scenarioId ? "current" : ""}" data-id="${c.id}" data-scenario="${c.scenarioId || ""}" ${interactive ? 'role="button" tabindex="0"' : 'title="No open life-event workspace for this client yet"'}>
        <span class="book-avatar">${escapeHtml(c.initials)}</span>
        <span class="book-main"><strong>${escapeHtml(c.fullName)}</strong><small>${c.age} · ${escapeHtml(c.occupation)}${c.phone ? ` · ${escapeHtml(c.phone)}` : ""}</small></span>
        <span class="book-seg">${escapeHtml(c.segment)}</span>
        <span class="book-aum">${aum}</span>
        <span class="book-status status-${c.status.key}">${escapeHtml(c.eventLabel || c.status.label)}</span>
        <span class="book-contact">${contact}</span>
        ${reach}
        ${interactive ? '<span class="book-open">Open →</span>' : '<span class="book-open muted">No workspace</span>'}
      </div>`;
    })
    .join("");

  $("#customerBook").querySelectorAll(".book-row").forEach((row) => {
    const open = async () => {
      const scenarioId = row.dataset.scenario;
      if (!scenarioId) {
        showToast("Client is in your book · no life-event workspace yet");
        return;
      }
      await openClient(scenarioId);
      showToast(`Opened ${customerDetails[scenarioId].fullName}'s twin`);
    };
    row.addEventListener("click", (e) => {
      if (e.target.closest(".book-reach-btn")) return;
      open();
    });
    row.addEventListener("keydown", (e) => {
      if (e.target.closest(".book-reach-btn")) return;
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        open();
      }
    });
  });
}

function bindSidebarToggle() {
  const sidebar = $("#sidebar");
  const controls = $("#sidebarControls");
  const collapse = $("#sidebarCollapse");
  const expand = $("#sidebarExpand");
  if (!sidebar || !controls || !collapse || !expand) return;

  const setMode = (mode) => {
    document.body.dataset.sidebar = mode;
    sidebar.dataset.mode = mode;
    controls.dataset.mode = mode;
    collapse.setAttribute("aria-label", mode === "fat" ? "Show thin navigation" : "Hide navigation");
    expand.setAttribute("aria-label", mode === "hidden" ? "Show navigation" : "Expand navigation");
  };

  collapse.addEventListener("click", () => {
    const mode = document.body.dataset.sidebar || "thin";
    setMode(mode === "fat" ? "thin" : "hidden");
  });
  expand.addEventListener("click", () => {
    const mode = document.body.dataset.sidebar || "thin";
    setMode(mode === "hidden" ? "thin" : "fat");
  });

  setMode("thin");
}

function openBrief() {
  const d = customerDetails[state.scenarioId];
  const s = state.scenario;
  const ai = state.intelligence.ai;
  const chosen = [...state.selected].map((i) => d.products[i]).filter(Boolean);
  const sim = state.sim;
  const twinBlock = sim
    ? `<section><p class="eyebrow">DIGITAL TWIN OUTLOOK</p><div class="brief-twin"><div><span>12-month uplift</span><strong>${money.format(sim.delta)}</strong></div><div><span>Lowest balance</span><strong>${money.format(sim.low)}</strong><small>${sim.lowDelta === 0 ? "Same as current" : `↑ ${money.format(sim.lowDelta)} vs current`}</small></div><div><span>Risk window</span><strong>${escapeHtml(sim.riskLabel)}</strong><small>${sim.riskAvoided ? "Overdraft avoided with selected solutions" : "Modeled from observed cashflow"}</small></div><div><span>Wellbeing</span><strong>${sim.baseHealth ?? d.health}${sim.projectedHealth && sim.projectedHealth !== (sim.baseHealth ?? d.health) ? ` → ${sim.projectedHealth}` : ""}</strong></div></div></section>`
    : "";

  const contactBlock = d.phone
    ? `<section><p class="eyebrow">REACH CUSTOMER</p><div class="brief-contact"><a class="contact-btn call" href="${telHref(d.phone)}">Call ${escapeHtml(d.phone)}</a><a class="contact-btn whatsapp" href="${whatsappHref(d.phone)}" target="_blank" rel="noopener noreferrer">WhatsApp</a></div></section>`
    : "";

  $("#briefContent").innerHTML = `<div class="brief-client"><div class="profile-avatar">${d.initials}</div><div><strong>${d.fullName}</strong><span>${s.event.label} · ${Math.round(state.intelligence.event.confidence * 100)}% confidence</span>${d.phone ? `<span class="brief-phone">${escapeHtml(d.phone)}</span>` : ""}</div></div><section><p class="eyebrow">AI SUMMARY</p><p>${escapeHtml(ai.executiveSummary)}</p></section><section><p class="eyebrow">OPEN WITH</p><p>“${escapeHtml(ai.conversationOpener)}”</p></section>${twinBlock}${contactBlock}<section><p class="eyebrow">EXPLORE</p><ul>${ai.discoveryQuestions.map((q) => `<li>${escapeHtml(q)}</li>`).join("")}</ul></section><section><p class="eyebrow">RELEVANT SOLUTIONS</p>${chosen.length ? chosen.map((p, i) => `<div class="brief-product"><b>${i + 1}</b><span><strong>${p.name}</strong><small>${p.impact} · ${p.fit}% fit</small></span></div>`).join("") : "<p>Select at least one solution to include.</p>"}</section><div class="compliance-note">Generated via ${state.intelligence.source}. Keep the conversation needs-led. Confirm circumstances and suitability before presenting any product.</div>`;
  $("#briefDialog").showModal();
}

function openEvidence() {
  const i = state.intelligence;
  const p = i.persona;
  const f = i.features;
  $("#evidenceContent").innerHTML = `<div class="pipeline"><span>TRANSACTIONS</span><b>→</b><span>DERIVED FEATURES</span><b>→</b><span>EVENT MODEL</span><b>→</b><span>SUITABILITY</span></div><section><p class="eyebrow">CUSTOMER PERSONA · BANK RECORD</p><div class="persona-facts"><div><span>Employer</span><b>${p.employer}</b></div><div><span>Risk profile</span><b>${p.riskProfile}</b></div><div><span>Dependants</span><b>${p.dependants}</b></div><div><span>Products held</span><b>${p.productsHeld.join(", ")}</b></div></div></section><section><p class="eyebrow">MODEL EVIDENCE</p>${i.event.evidence.map((e) => `<div class="evidence-row"><span><b>${e.label}</b><small>${e.source.replaceAll("_", " ")}</small></span><strong>${e.value}</strong><em>${Math.round(e.confidence * 100)}%</em></div>`).join("")}<p class="alternative"><b>Alternative considered:</b> ${i.event.alternativeHypothesis}</p></section><section><p class="eyebrow">SOURCE TRANSACTIONS · ${f.transactionCount} RECORDS / ${f.transactionWindowDays} DAYS</p><div class="transaction-table">${i.transactions.map((t) => `<div><span>${t.date}</span><b>${t.description}</b><small>${t.category}</small><strong class="${t.amount >= 0 ? "credit" : ""}">${t.amount >= 0 ? "+" : ""}${money.format(t.amount)}</strong></div>`).join("")}</div></section><section><p class="eyebrow">SUITABILITY CHECKS</p>${i.products.map((p) => `<div class="suitability-row"><b>${p.name}</b><span>${p.guardrails.map((g) => `${g.passed ? "✓" : "×"} ${g.name}`).join(" · ")}</span><strong>${p.fit}% fit</strong></div>`).join("")}</section><div class="compliance-note">AI source: ${i.source}${i.model ? ` (${i.model})` : ""}. Event confidence is derived from weighted, independent evidence. Product eligibility is rules-based; AI only explains eligible results.</div>`;
  $("#evidenceDialog").showModal();
}

function showToast(text) {
  $("#toast").textContent = text;
  $("#toast").classList.add("show");
  setTimeout(() => $("#toast").classList.remove("show"), 2400);
}

async function fetchJson(url, options) {
  const r = await fetch(url, options);
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

function escapeHtml(v) {
  return String(v).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}
