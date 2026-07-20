const state = { scenarioId: "new-parent", scenario: null, projection: null, intelligence: null, selected: new Set() };
const money = new Intl.NumberFormat("en-SG", { style: "currency", currency: "SGD", maximumFractionDigits: 0 });

const customerDetails = {
  "new-parent": { initials: "AM", fullName: "Amira Malik", age: 34, occupation: "Product Director", tenure: "6y 4m", aum: "S$186,400", income: "S$6,200/mo", tier: "Priority", health: 88, context: "Growing family", products: [
    { name: "Family Protection Plan", type: "PROTECTION", fit: 96, value: "S$2,400/yr", icon: "♢", color: "violet", why: "New dependant detected; current protection gap estimated at S$420K.", impact: "Protects 7 years of household income", action: 480 },
    { name: "SmartSaver Plus", type: "SAVINGS", fit: 91, value: "+2.8% p.a.", icon: "↗", color: "teal", why: "Recurring childcare costs create a need for a dedicated liquid buffer.", impact: "Builds a 4-month family buffer", action: 350 },
    { name: "Education Builder", type: "INVESTMENT", fit: 84, value: "From S$250/mo", icon: "◈", color: "gold", why: "Long time horizon and stable surplus suit a goal-based education plan.", impact: "Potential S$82K by age 18", action: 250 }
  ]},
  "job-loss": { initials: "DT", fullName: "Daniel Tan", age: 42, occupation: "Operations Lead", tenure: "9y 1m", aum: "S$312,800", income: "Income interrupted", tier: "Priority", health: 73, context: "Income transition", products: [
    { name: "Payment Relief Programme", type: "SUPPORT", fit: 98, value: "3 months", icon: "⌁", color: "violet", why: "Salary interruption detected while fixed commitments remain elevated.", impact: "Extends cash runway by 3 months", action: 1200 },
    { name: "FlexiCash Reserve", type: "LIQUIDITY", fit: 89, value: "S$15K limit", icon: "↗", color: "teal", why: "Strong relationship history and short-term liquidity pressure.", impact: "Creates an emergency bridge", action: 420 },
    { name: "Career Transition Cover", type: "PROTECTION", fit: 78, value: "S$68/mo", icon: "♢", color: "gold", why: "Protection review is timely during employment transition.", impact: "Maintains essential coverage", action: 310 }
  ]},
  wedding: { initials: "PS", fullName: "Priya Shah", age: 31, occupation: "Legal Counsel", tenure: "4y 8m", aum: "S$228,600", income: "S$7,800/mo", tier: "Priority", health: 92, context: "Getting married", products: [
    { name: "Premier Joint Account", type: "BANKING", fit: 97, value: "+1.5% bonus", icon: "∞", color: "violet", why: "Shared vendor payments and partner contributions signal joint money management.", impact: "One view of shared finances", action: 900 },
    { name: "Celebration Instalments", type: "CREDIT", fit: 90, value: "0% for 6 mo", icon: "↗", color: "teal", why: "Known wedding expenses cluster over the next five months.", impact: "Smooths peak vendor payments", action: 700 },
    { name: "Couples Wealth Plan", type: "INVESTMENT", fit: 83, value: "From S$500/mo", icon: "◈", color: "gold", why: "High combined surplus supports post-wedding goal planning.", impact: "Starts a shared wealth journey", action: 600 }
  ]}
};

const $ = (selector) => document.querySelector(selector);
const nodes = { scenarioStrip: $("#scenarioStrip"), productList: $("#productList"), chart: $("#chart") };

init();
async function init() {
  const list = await fetchJson("/api/scenarios");
  renderTabs(list.scenarios);
  await loadScenario(state.scenarioId);
  bindActions();
}

function renderTabs(scenarios) {
  nodes.scenarioStrip.innerHTML = scenarios.map((s, i) => `<button class="customer-tab ${s.id === state.scenarioId ? "active" : ""}" data-id="${s.id}"><span class="tab-avatar">${customerDetails[s.id].initials}</span><span><strong>${customerDetails[s.id].fullName}</strong><small>${s.event.label}</small></span><b class="priority-dot ${i === 2 ? "medium" : ""}"></b></button>`).join("");
  nodes.scenarioStrip.querySelectorAll("button").forEach(btn => btn.addEventListener("click", () => loadScenario(btn.dataset.id)));
}

async function loadScenario(id) {
  state.scenarioId = id;
  $("#aiSource").innerHTML = "<i></i> ANALYSING";
  const [payload, intelligence] = await Promise.all([fetchJson(`/api/scenarios/${id}`), fetchJson(`/api/intelligence/${id}`)]);
  state.scenario = payload.scenario; state.projection = payload.projection; state.selected = new Set([0, 1]);
  state.intelligence = intelligence;
  hydrateCustomerDetails();
  $("#aiSource").innerHTML = `<i></i> ${intelligence.source === "openai" ? "OPENAI · LIVE" : "VERIFIED FALLBACK"}`;
  document.querySelectorAll(".customer-tab").forEach(b => b.classList.toggle("active", b.dataset.id === id));
  renderProfile(); renderProducts(); renderSimulation();
}

function hydrateCustomerDetails(){
  const i=state.intelligence,p=i.persona,d=customerDetails[state.scenarioId];
  Object.assign(d,{initials:p.initials,fullName:p.fullName,age:p.age,occupation:p.occupation,tenure:`${Math.floor(p.tenureMonths/12)}y ${p.tenureMonths%12}m`,aum:money.format(p.totalAssets),income:p.monthlyIncome?`${money.format(p.monthlyIncome)}/mo`:"Income interrupted",tier:p.segment,health:Math.round(70+Math.min(25,p.tenureMonths/12)),context:p.goals[0],products:i.products.map((x,index)=>({name:x.name,type:x.type,fit:x.fit,value:x.annualValue?`${money.format(x.annualValue)}/yr`:"No fee",icon:["♢","↗","◈"][index],color:["violet","teal","gold"][index],why:i.ai.productNarratives[x.name]||x.reason,impact:x.impact,action:x.monthlyImpact,guardrails:x.guardrails}))});
}

function renderProfile() {
  const d = customerDetails[state.scenarioId], s = state.scenario;
  $("#profileInitials").textContent = d.initials; $("#customerName").textContent = d.fullName;
  $("#customerMeta").textContent = `${d.age} years · ${d.occupation}`; $(".tier").textContent = d.tier.toUpperCase();
  $("#healthScore").textContent = d.health; $("#healthBar").style.width = `${d.health}%`;
  $("#profileGrid").innerHTML = [["TOTAL RELATIONSHIP",d.tenure],["ASSETS WITH US",d.aum],["MONTHLY INCOME",d.income],["LIFE STAGE",d.context]].map(([a,b]) => `<div><span>${a}</span><strong>${b}</strong></div>`).join("");
  $("#eventTitle").textContent = s.event.label; $("#eventMeta").textContent = `Detected in ${s.event.detectedMonth} · High relevance`;
  $("#confidence").textContent = `${Math.round(state.intelligence.event.confidence*100)}% CONFIDENCE`;
  $("#signalTrace").innerHTML = state.intelligence.event.evidence.slice(0,3).map(e => `<div><i></i><span><b>${escapeHtml(e.label)}:</b> ${escapeHtml(e.value)} · ${Math.round(e.confidence*100)}% signal confidence</span></div>`).join("");
}

function renderProducts() {
  const products = customerDetails[state.scenarioId].products;
  nodes.productList.innerHTML = products.map((p,i) => `<button class="product ${state.selected.has(i)?"selected":""}" data-index="${i}"><span class="check">✓</span><span class="product-icon ${p.color}">${p.icon}</span><span class="product-copy"><span class="product-top"><small>${p.type}</small><b>${p.fit}% FIT</b></span><strong>${p.name}</strong><span class="why">${p.why}</span><span class="impact"><i>↗</i> ${p.impact}</span></span><span class="product-value"><strong>${p.value}</strong><small>EST. VALUE</small></span></button>`).join("");
  nodes.productList.querySelectorAll(".product").forEach(btn => btn.addEventListener("click", () => { const i=Number(btn.dataset.index); state.selected.has(i)?state.selected.delete(i):state.selected.add(i); renderProducts(); renderSimulation(); }));
}

function renderSimulation() {
  const products = customerDetails[state.scenarioId].products;
  const selectedRatio = [...state.selected].reduce((sum,i)=>sum + products[i].action,0) / products.reduce((sum,p)=>sum+p.action,0);
  const base = state.projection.ignored.trajectory; const full = state.projection.accepted.trajectory;
  const modeled = base.map((p,i)=>p.projectedBalance + (full[i].projectedBalance-p.projectedBalance)*selectedRatio);
  const delta = modeled.at(-1)-base.at(-1); const max = Math.max(...modeled,...base); const min = Math.min(...modeled,...base,0); const range=max-min||1;
  $("#deltaEnding").textContent = money.format(delta); const pct=Math.round(Math.min(99,Math.abs(delta)/(Math.abs(base.at(-1))||1000)*100));
  $("#upliftPercent").textContent=`+${pct}%`; $("#upliftRing").style.setProperty("--progress",`${Math.max(12,pct*3.6)}deg`);
  const low=Math.min(...modeled); $("#lowestBalance").textContent=money.format(low); $("#lowestDelta").textContent=`↑ ${money.format(low-Math.min(...base))} vs current path`;
  $("#riskAvoided").textContent = modeled.some(v=>v<0) ? "Elevated" : "Protected";
  nodes.chart.innerHTML = `<svg viewBox="0 0 600 220" preserveAspectRatio="none" role="img" aria-label="12 month liquidity projection"><defs><linearGradient id="fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6c5ce7" stop-opacity=".22"/><stop offset="1" stop-color="#6c5ce7" stop-opacity="0"/></linearGradient></defs><path class="area" d="${areaPath(modeled,min,range)}"/><path class="line base" d="${linePath(base,min,range)}"/><path class="line solution" d="${linePath(modeled,min,range)}"/>${modeled.map((v,i)=>`<circle cx="${x(i)}" cy="${y(v,min,range)}" r="3"/>`).join("")}</svg><div class="chart-labels">${["NOW","M3","M6","M9","M12"].map(v=>`<span>${v}</span>`).join("")}</div>`;
}
const x=i=>10+i*(580/11); const y=(v,min,range)=>205-((v-min)/range)*180;
function linePath(values,min,range){return values.map((v,i)=>`${i?"L":"M"}${x(i)},${y(v,min,range)}`).join(" ")}
function areaPath(values,min,range){return `${linePath(values,min,range)} L${x(11)},215 L${x(0)},215 Z`}

function bindActions(){
  $("#generateBrief").addEventListener("click", openBrief); $("#closeBrief").addEventListener("click",()=>$("#briefDialog").close());
  $("#doneBrief").addEventListener("click",()=>{ $("#briefDialog").close(); showToast("Brief added to client timeline ✓"); });
  $("#copyBrief").addEventListener("click",async()=>{ await navigator.clipboard?.writeText($("#briefContent").innerText); showToast("Meeting brief copied ✓"); });
  $("#showEvidence").addEventListener("click",openEvidence); $("#closeEvidence").addEventListener("click",()=>$("#evidenceDialog").close());
}
function openBrief(){ const d=customerDetails[state.scenarioId], s=state.scenario, ai=state.intelligence.ai, chosen=[...state.selected].map(i=>d.products[i]); $("#briefContent").innerHTML=`<div class="brief-client"><div class="profile-avatar">${d.initials}</div><div><strong>${d.fullName}</strong><span>${s.event.label} · ${Math.round(state.intelligence.event.confidence*100)}% confidence</span></div></div><section><p class="eyebrow">AI SUMMARY</p><p>${escapeHtml(ai.executiveSummary)}</p></section><section><p class="eyebrow">OPEN WITH</p><p>“${escapeHtml(ai.conversationOpener)}”</p></section><section><p class="eyebrow">EXPLORE</p><ul>${ai.discoveryQuestions.map(q=>`<li>${escapeHtml(q)}</li>`).join("")}</ul></section><section><p class="eyebrow">RELEVANT SOLUTIONS</p>${chosen.length?chosen.map((p,i)=>`<div class="brief-product"><b>${i+1}</b><span><strong>${p.name}</strong><small>${p.impact} · ${p.fit}% fit</small></span></div>`).join(""):"<p>Select at least one solution to include.</p>"}</section><div class="compliance-note">Generated via ${state.intelligence.source}. Keep the conversation needs-led. Confirm circumstances and suitability before presenting any product.</div>`; $("#briefDialog").showModal(); }
function openEvidence(){const i=state.intelligence,p=i.persona,f=i.features;$("#evidenceContent").innerHTML=`<div class="pipeline"><span>TRANSACTIONS</span><b>→</b><span>DERIVED FEATURES</span><b>→</b><span>EVENT MODEL</span><b>→</b><span>SUITABILITY</span></div><section><p class="eyebrow">CUSTOMER PERSONA · BANK RECORD</p><div class="persona-facts"><div><span>Employer</span><b>${p.employer}</b></div><div><span>Risk profile</span><b>${p.riskProfile}</b></div><div><span>Dependants</span><b>${p.dependants}</b></div><div><span>Products held</span><b>${p.productsHeld.join(", ")}</b></div></div></section><section><p class="eyebrow">MODEL EVIDENCE</p>${i.event.evidence.map(e=>`<div class="evidence-row"><span><b>${e.label}</b><small>${e.source.replaceAll("_"," ")}</small></span><strong>${e.value}</strong><em>${Math.round(e.confidence*100)}%</em></div>`).join("")}<p class="alternative"><b>Alternative considered:</b> ${i.event.alternativeHypothesis}</p></section><section><p class="eyebrow">SOURCE TRANSACTIONS · ${f.transactionCount} RECORDS / ${f.transactionWindowDays} DAYS</p><div class="transaction-table">${i.transactions.map(t=>`<div><span>${t.date}</span><b>${t.description}</b><small>${t.category}</small><strong class="${t.amount>=0?"credit":""}">${t.amount>=0?"+":""}${money.format(t.amount)}</strong></div>`).join("")}</div></section><section><p class="eyebrow">SUITABILITY CHECKS</p>${i.products.map(p=>`<div class="suitability-row"><b>${p.name}</b><span>${p.guardrails.map(g=>`${g.passed?"✓":"×"} ${g.name}`).join(" · ")}</span><strong>${p.fit}% fit</strong></div>`).join("")}</section><div class="compliance-note">AI source: ${i.source}${i.model?` (${i.model})`:""}. Event confidence is derived from weighted, independent evidence. Product eligibility is rules-based; AI only explains eligible results.</div>`;$("#evidenceDialog").showModal()}
function showToast(text){$("#toast").textContent=text;$("#toast").classList.add("show");setTimeout(()=>$("#toast").classList.remove("show"),2400)}
async function fetchJson(url){const r=await fetch(url);if(!r.ok)throw new Error(await r.text());return r.json()}
function escapeHtml(v){return v.replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;")}
