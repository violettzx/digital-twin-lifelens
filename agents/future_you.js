import OpenAI from "openai";
import { formatMoney } from "./projection.js";

const model = process.env.OPENAI_MODEL || "gpt-4.1-mini";
const client = process.env.OPENAI_API_KEY ? new OpenAI() : null;

const sessionMemory = new Map();

export async function answerAsFutureYou({ scenario, projection, question, sessionId }) {
  const memoryKey = `${sessionId}:${scenario.id}:${projection.branch}`;
  const history = sessionMemory.get(memoryKey) ?? [];

  if (!client) {
    const fallback = goldenAnswer({ scenario, projection, question });
    remember(memoryKey, question, fallback);
    return {
      source: "cached-demo",
      answer: fallback,
      traceability: traceabilityPayload(scenario, projection),
    };
  }

  try {
    const response = await client.responses.create({
      model,
      input: [
        {
          role: "system",
          content: buildSystemPrompt(scenario, projection),
        },
        ...history.slice(-6),
        {
          role: "user",
          content: question,
        },
      ],
      temperature: 0.55,
      max_output_tokens: 450,
    });

    const answer = response.output_text?.trim() || goldenAnswer({ scenario, projection, question });
    remember(memoryKey, question, answer);

    return {
      source: "openai",
      model,
      answer,
      traceability: traceabilityPayload(scenario, projection),
    };
  } catch (error) {
    const fallback = goldenAnswer({ scenario, projection, question });
    remember(memoryKey, question, fallback);
    return {
      source: "cached-demo-fallback",
      warning: error instanceof Error ? error.message : "OpenAI request failed.",
      answer: fallback,
      traceability: traceabilityPayload(scenario, projection),
    };
  }
}

export function buildSystemPrompt(scenario, projection) {
  const facts = projection.trajectory
    .map(
      (point) =>
        `${point.label}: net ${formatMoney(point.monthlyNet)}, balance ${formatMoney(
          point.projectedBalance,
        )}, event ${formatMoney(point.eventAdjustment)}, autopilot ${formatMoney(
          point.actionAdjustment,
        )}`,
    )
    .join("\n");

  return [
    "You are Future You, a digital financial twin narration layer for a bank hackathon demo.",
    "You must ground every claim in the supplied deterministic projection or signal trace.",
    "Open with: 'Simulated projection only, not financial advice.'",
    "Speak in first person narrative as the customer's future self. Do not give prescriptive financial advice.",
    `Customer: ${scenario.customer}.`,
    `Detected event: ${scenario.event.label} (${scenario.event.type}), confidence ${Math.round(
      scenario.event.confidence * 100,
    )}%, detected in ${scenario.event.detectedMonth}.`,
    `Tone: ${scenario.tone}.`,
    `Branch: ${projection.headline}.`,
    `Starting balance: ${formatMoney(projection.startingBalance)}.`,
    `Ending balance: ${formatMoney(projection.endingBalance)}.`,
    `Minimum balance: ${formatMoney(projection.minBalance)}.`,
    `Savings delta: ${formatMoney(projection.savingsDelta)}.`,
    `Overdraft risk month: ${projection.overdraftMonth ? `Month ${projection.overdraftMonth}` : "none"}.`,
    `Accepted actions: ${
      projection.acceptedActions.map((action) => action.label).join("; ") || "none"
    }.`,
    `Declined actions: ${
      projection.declinedActions.map((action) => action.label).join("; ") || "none"
    }.`,
    `Explainer signal trace:\n${scenario.trace.map((item) => `- ${item}`).join("\n")}`,
    `Monthly projection facts:\n${facts}`,
  ].join("\n\n");
}

function remember(memoryKey, question, answer) {
  const history = sessionMemory.get(memoryKey) ?? [];
  history.push({ role: "user", content: question });
  history.push({ role: "assistant", content: answer });
  sessionMemory.set(memoryKey, history.slice(-8));
}

function goldenAnswer({ scenario, projection, question }) {
  const overdraftText = projection.overdraftMonth
    ? `I dipped below zero in month ${projection.overdraftMonth}`
    : "I never crossed into overdraft during the 12-month projection";

  const actionText =
    projection.acceptedActions.length > 0
      ? `What worked was accepting ${projection.acceptedActions
          .map((action) => action.label)
          .join(", ")}.`
      : `I ignored ${projection.declinedActions.map((action) => action.label).join(", ")}, so the pressure stayed in the numbers.`;

  const eventSignal = scenario.trace[0] ?? `The event signal was ${scenario.event.label}.`;

  return [
    "Simulated projection only, not financial advice.",
    `I am ${scenario.customer} a year from now in the "${projection.headline}" future. ${eventSignal}`,
    `When I look back, my balance moved from ${formatMoney(
      projection.startingBalance,
    )} to ${formatMoney(projection.endingBalance)}, with the lowest point at ${formatMoney(
      projection.minBalance,
    )}. ${overdraftText}.`,
    `${actionText} The concrete difference shows up in monthly net cashflow, especially after ${scenario.event.detectedMonth}.`,
    question.toLowerCase().includes("watch")
      ? `The month I watched most closely was ${
          projection.trajectory.reduce((worst, point) =>
            point.projectedBalance < worst.projectedBalance ? point : worst,
          ).label
        }, because that is where the projected balance was thinnest.`
      : "That is why this future feels different: it is not a mood, it is the branch created by the simulator.",
  ].join(" ");
}

function traceabilityPayload(scenario, projection) {
  return {
    event: scenario.event,
    branch: projection.branch,
    summary: projection.summary,
    signalTrace: scenario.trace,
    actions: {
      accepted: projection.acceptedActions.map((action) => action.label),
      declined: projection.declinedActions.map((action) => action.label),
    },
  };
}
