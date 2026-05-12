function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function addError(errors, name, message) {
  if (!errors[name]) errors[name] = [];
  errors[name].push(message);
}

function positiveNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0;
}

function positiveInteger(value) {
  const number = Number(value);
  return Number.isInteger(number) && number > 0;
}

function pushBoundedPercentError(errors, settings, name, label, max) {
  const value = Number(settings[name]);
  if (!Number.isFinite(value) || value <= 0) {
    addError(errors, name, `${label} must be greater than 0%.`);
    return;
  }
  if (value > max) addError(errors, name, `${label} must be ${max}% or less.`);
}

export function validateSettings(settings) {
  const errors = {};
  const minDelta = Number(settings.minDelta);
  const maxDelta = Number(settings.maxDelta);

  if (!Number.isFinite(minDelta) || minDelta < 0.01 || minDelta > 0.8) {
    addError(errors, "minDelta", "Min short delta must be between 0.01 and 0.80.");
  }
  if (!Number.isFinite(maxDelta) || maxDelta < 0.01 || maxDelta > 0.9) {
    addError(errors, "maxDelta", "Max short delta must be between 0.01 and 0.90.");
  }
  if (Number.isFinite(minDelta) && Number.isFinite(maxDelta) && minDelta > maxDelta) {
    addError(errors, "minDelta", "Min short delta must be less than or equal to max short delta.");
  }

  if (settings.expiry) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(settings.expiry)) {
      addError(errors, "expiry", "Expiry must use YYYY-MM-DD format.");
    } else if (settings.expiry < todayIso()) {
      addError(errors, "expiry", "Expiry must not be in the past.");
    }
  }

  if (!positiveNumber(settings.minCreditPct) || Number(settings.minCreditPct) > 0.9) {
    addError(errors, "minCreditPct", "Min credit must be between 0.01 and 0.90.");
  }
  if (!positiveNumber(settings.maxSpreadWidth) || Number(settings.maxSpreadWidth) > 100) {
    addError(
      errors,
      "maxSpreadWidth",
      "Max spread width must be greater than 0 and no more than 100."
    );
  }
  if (!positiveInteger(settings.minOpenInterest)) {
    addError(errors, "minOpenInterest", "Min open interest must be a positive whole number.");
  }
  if (!positiveInteger(settings.minVolume)) {
    addError(errors, "minVolume", "Min volume must be a positive whole number.");
  }
  if (!positiveNumber(settings.accountSize)) {
    addError(errors, "accountSize", "Account size must be greater than 0.");
  }
  if (!["warn", "block", "ignore"].includes(settings.macroEventMode || "warn")) {
    addError(errors, "macroEventMode", "Macro events must be set to warn, block, or ignore.");
  }

  pushBoundedPercentError(errors, settings, "riskPerIdeaPct", "Risk per idea", 10);
  pushBoundedPercentError(errors, settings, "maxWeeklyRiskPct", "Max weekly risk", 50);
  pushBoundedPercentError(errors, settings, "correlationGroupCapPct", "Correlation cap", 25);

  if (
    positiveNumber(settings.riskPerIdeaPct) &&
    positiveNumber(settings.maxWeeklyRiskPct) &&
    Number(settings.riskPerIdeaPct) > Number(settings.maxWeeklyRiskPct)
  ) {
    addError(errors, "riskPerIdeaPct", "Risk per idea must not exceed max weekly risk.");
  }
  if (
    positiveNumber(settings.riskPerIdeaPct) &&
    positiveNumber(settings.correlationGroupCapPct) &&
    Number(settings.riskPerIdeaPct) > Number(settings.correlationGroupCapPct)
  ) {
    addError(errors, "riskPerIdeaPct", "Risk per idea must not exceed the correlation cap.");
  }

  return errors;
}

export function firstSettingsError(errors) {
  return Object.values(errors).find((messages) => messages.length)?.[0] || "";
}
