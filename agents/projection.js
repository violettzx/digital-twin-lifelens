const currency = new Intl.NumberFormat("en-SG", {
  style: "currency",
  currency: "SGD",
  maximumFractionDigits: 0,
});

export function formatMoney(value) {
  return currency.format(Math.round(value));
}

export function projectScenario(scenario, { acceptActions = false, months = 12 } = {}) {
  let balance = scenario.startingBalance;
  const acceptedActions = acceptActions ? scenario.autopilotActions : [];
  const declinedActions = acceptActions ? [] : scenario.autopilotActions;

  const trajectory = [];

  for (let month = 1; month <= months; month += 1) {
    const eventAdjustment = scenario.monthlyEvents
      .filter((event) => appliesInMonth(event, month))
      .reduce((sum, event) => sum + event.amount, 0);

    const actionAdjustment = acceptedActions
      .filter((action) => appliesInMonth(action, month))
      .reduce((sum, action) => sum + action.monthlyImpact, 0);

    const monthlyNet =
      scenario.income - scenario.recurringExpenses + eventAdjustment + actionAdjustment;

    balance += monthlyNet;

    trajectory.push({
      month,
      label: `Month ${month}`,
      income: scenario.income,
      recurringExpenses: scenario.recurringExpenses,
      eventAdjustment,
      actionAdjustment,
      monthlyNet,
      projectedBalance: balance,
      eventLabels: scenario.monthlyEvents
        .filter((event) => appliesInMonth(event, month))
        .map((event) => event.label),
      actionLabels: acceptedActions
        .filter((action) => appliesInMonth(action, month))
        .map((action) => action.label),
    });
  }

  const overdraftMonth = trajectory.find((point) => point.projectedBalance < 0)?.month ?? null;
  const minBalance = Math.min(...trajectory.map((point) => point.projectedBalance));
  const endingBalance = trajectory.at(-1).projectedBalance;
  const savingsDelta = endingBalance - scenario.startingBalance;

  return {
    branch: acceptActions ? "accepted" : "ignored",
    headline: acceptActions ? "Autopilot accepted" : "Autopilot ignored",
    startingBalance: scenario.startingBalance,
    endingBalance,
    minBalance,
    savingsDelta,
    overdraftMonth,
    acceptedActions,
    declinedActions,
    trajectory,
    summary: {
      startingBalance: formatMoney(scenario.startingBalance),
      endingBalance: formatMoney(endingBalance),
      minBalance: formatMoney(minBalance),
      savingsDelta: formatMoney(savingsDelta),
      overdraftMonth: overdraftMonth ? `Month ${overdraftMonth}` : "None in 12 months",
    },
  };
}

export function buildBranchingProjection(scenario, months = 12) {
  const accepted = projectScenario(scenario, { acceptActions: true, months });
  const ignored = projectScenario(scenario, { acceptActions: false, months });
  return {
    scenarioId: scenario.id,
    months,
    accepted,
    ignored,
    delta: {
      endingBalance: accepted.endingBalance - ignored.endingBalance,
      minBalance: accepted.minBalance - ignored.minBalance,
      overdraftAvoided: Boolean(ignored.overdraftMonth && !accepted.overdraftMonth),
      formattedEndingBalance: formatMoney(accepted.endingBalance - ignored.endingBalance),
      formattedMinBalance: formatMoney(accepted.minBalance - ignored.minBalance),
    },
  };
}

function appliesInMonth(item, month) {
  const starts = item.startsMonth ?? item.month ?? 1;
  const isAutopilotAction = "monthlyImpact" in item;
  const ends = item.endsMonth ?? (isAutopilotAction || item.repeats ? Infinity : item.month ?? starts);
  return month >= starts && month <= ends;
}
