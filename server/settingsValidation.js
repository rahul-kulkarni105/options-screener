const { z } = require("zod");

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

const optionalDate = z.string().trim().max(20).optional();
const positivePercent = (label) =>
  z.coerce
    .number()
    .positive({ message: `${label} must be greater than 0%.` })
    .max(100);

const settingsSchema = z
  .object({
    universe: z.string().max(1200).optional(),
    expiry: optionalDate,
    manualBlocklist: z.string().max(1200).optional(),
    autoEvents: z.boolean().optional(),
    macroEventMode: z.enum(["warn", "block", "ignore"]).optional(),
    manualMacroEvents: z.string().max(3000).optional(),
    minDelta: z.coerce.number().min(0.01).max(0.8).optional(),
    maxDelta: z.coerce.number().min(0.01).max(0.9).optional(),
    minCreditPct: z.coerce.number().min(0.01).max(0.9).optional(),
    maxSpreadWidth: z.coerce
      .number()
      .positive({ message: "Max spread width must be greater than 0." })
      .max(100)
      .optional(),
    minOpenInterest: z.coerce
      .number()
      .int({ message: "Min open interest must be a whole number." })
      .positive({ message: "Min open interest must be greater than 0." })
      .max(1_000_000)
      .optional(),
    minVolume: z.coerce
      .number()
      .int({ message: "Min volume must be a whole number." })
      .positive({ message: "Min volume must be greater than 0." })
      .max(1_000_000)
      .optional(),
    trendGate: z.boolean().optional(),
    vixGate: z.boolean().optional(),
    accountSize: z.coerce
      .number()
      .positive({ message: "Account size must be greater than 0." })
      .max(1_000_000_000)
      .optional(),
    riskPerIdeaPct: positivePercent("Risk per idea")
      .max(10, {
        message: "Risk per idea must be 10% or less."
      })
      .optional(),
    maxWeeklyRiskPct: positivePercent("Max weekly risk")
      .max(50, {
        message: "Max weekly risk must be 50% or less."
      })
      .optional(),
    correlationGroupCapPct: positivePercent("Correlation cap")
      .max(25, {
        message: "Correlation cap must be 25% or less."
      })
      .optional()
  })
  .superRefine((settings, context) => {
    if (
      settings.minDelta != null &&
      settings.maxDelta != null &&
      settings.minDelta > settings.maxDelta
    ) {
      context.addIssue({
        code: "custom",
        path: ["minDelta"],
        message: "Min short delta must be less than or equal to max short delta."
      });
    }

    if (settings.expiry) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(settings.expiry)) {
        context.addIssue({
          code: "custom",
          path: ["expiry"],
          message: "Expiry must use YYYY-MM-DD format."
        });
      } else if (settings.expiry < todayIso()) {
        context.addIssue({
          code: "custom",
          path: ["expiry"],
          message: "Expiry must not be in the past."
        });
      }
    }

    if (
      settings.riskPerIdeaPct != null &&
      settings.maxWeeklyRiskPct != null &&
      settings.riskPerIdeaPct > settings.maxWeeklyRiskPct
    ) {
      context.addIssue({
        code: "custom",
        path: ["riskPerIdeaPct"],
        message: "Risk per idea must not exceed max weekly risk."
      });
    }

    if (
      settings.riskPerIdeaPct != null &&
      settings.correlationGroupCapPct != null &&
      settings.riskPerIdeaPct > settings.correlationGroupCapPct
    ) {
      context.addIssue({
        code: "custom",
        path: ["riskPerIdeaPct"],
        message: "Risk per idea must not exceed the correlation cap."
      });
    }
  });

module.exports = { settingsSchema };
