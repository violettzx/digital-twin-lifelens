# LifeLens — Relationship Intelligence

An internal relationship-manager workspace that turns detected customer life events into timely, needs-led conversations.

## Product experience

- **Client 360:** relationship health, tenure, assets, income, life stage, and recent event signals in one view.
- **Life-event detection:** explainable evidence and confidence for new-parent, income-interruption, and wedding scenarios.
- **Next best conversation:** products ranked by need, eligibility, suitability, and projected customer value.
- **Digital twin simulator:** select or remove solutions and see their modeled 12-month liquidity impact immediately.
- **Meeting brief:** generates a needs-led opener, discovery questions, relevant solutions, and a compliance reminder.

## Intelligence pipeline

Raw demo transactions are converted into auditable features such as payroll interruption, recurring merchant counts, category acceleration, protection gaps, and cashflow surplus. A weighted detector derives the life-event hypothesis and retains an alternative explanation. Deterministic eligibility rules then remove unsuitable products before OpenAI generates grounded explanations and RM conversation guidance. OpenAI never calculates projection values or overrides suitability decisions.

Click **View signal evidence** in the dashboard to inspect the customer persona, source transactions, derived evidence, alternative hypothesis, product guardrails, model name, and whether the result came from live OpenAI or the verified fallback.

Set a valid `OPENAI_API_KEY` in `.env` to enable live insight narration. If the key is absent or rejected, the same endpoint returns deterministic evidence-backed copy and the UI explicitly displays **Verified fallback**.

The simulation is deterministic and continues to work without external AI. The interface is responsive for desktop and tablet demos.

## Environment variables

Create a `.env` file in the project root before starting the app:

```env
OPENAI_API_KEY=your_openai_api_key
OPENAI_MODEL=gpt-4.1-mini
PORT=3000
```

- `OPENAI_API_KEY` is optional. Add it to enable live AI-generated insight narration; without it, the app uses its deterministic verified fallback.
- `OPENAI_MODEL` is optional and defaults to `gpt-4.1-mini`.
- `PORT` is optional and defaults to `3000`.

The `.env` file is ignored by Git because it can contain secrets. Do not commit real API keys to the repository.

## Run

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Structure

- `data/scenarios.js` — customer event signals and cashflow inputs
- `agents/projection.js` — deterministic 12-month scenario engine
- `public/app.js` — RM dashboard interactions and live solution modeling
- `public/styles.css` — responsive visual system
- `server.js` — Express API and static app server

## Compliance framing

Recommendations are presented as conversation prompts rather than automatic sales decisions. The UI surfaces evidence, confidence, suitability guardrails, and reminds the RM to reconfirm customer circumstances before presenting any product.
