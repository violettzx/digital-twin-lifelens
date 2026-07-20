import "dotenv/config";
import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { scenarios } from "./data/scenarios.js";
import { buildBranchingProjection } from "./agents/projection.js";
import { answerAsFutureYou } from "./agents/future_you.js";
import { customerProfiles } from "./data/customer_profiles.js";
import { buildCustomerIntelligence } from "./agents/intelligence.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = Number(process.env.PORT || 3000);

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, aiConnected: Boolean(process.env.OPENAI_API_KEY) });
});

app.get("/api/scenarios", (_req, res) => {
  res.json({
    scenarios: scenarios.map((scenario) => ({
      id: scenario.id,
      title: scenario.title,
      customer: scenario.customer,
      event: scenario.event,
      suggestedQuestions: scenario.suggestedQuestions,
    })),
  });
});

app.get("/api/scenarios/:id", (req, res) => {
  const scenario = findScenario(req.params.id);
  if (!scenario) {
    return res.status(404).json({ error: "Scenario not found." });
  }

  res.json({
    scenario,
    projection: buildBranchingProjection(scenario),
  });
});

app.get("/api/intelligence/:id", async (req, res) => {
  const scenario = findScenario(req.params.id);
  const profile = customerProfiles[req.params.id];
  if (!scenario || !profile) return res.status(404).json({ error: "Customer not found." });
  try {
    res.json(await buildCustomerIntelligence(profile, scenario));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Customer intelligence pipeline failed." });
  }
});

app.post("/api/future-you", async (req, res) => {
  const scenario = findScenario(req.body.scenarioId);
  if (!scenario) {
    return res.status(404).json({ error: "Scenario not found." });
  }

  const branch = req.body.branch === "ignored" ? "ignored" : "accepted";
  const question = String(req.body.question || "").trim();
  if (!question) {
    return res.status(400).json({ error: "Question is required." });
  }

  try {
    const projection = buildBranchingProjection(scenario)[branch];
    const result = await answerAsFutureYou({
      scenario,
      projection,
      question,
      sessionId: req.body.sessionId || "demo",
    });
    res.json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "Future You failed to respond.",
    });
  }
});

function findScenario(id) {
  return scenarios.find((scenario) => scenario.id === id);
}

app.listen(port, () => {
  console.log(`LifeLens running at http://localhost:${port}`);
});
