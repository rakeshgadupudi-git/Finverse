const { success, error } = require('../utils/response');

// ═══════════════════════════════════════════════════════════════════
//  INDIA INCOME TAX ENGINE  —  AY 2025-26
//  All monetary amounts in ₹ (Indian Rupees, integers).
// ═══════════════════════════════════════════════════════════════════

// ─── Slab tables ────────────────────────────────────────────────────────────

// New Regime (Budget 2023, AY 2025-26)
// Standard deduction: ₹75,000  |  Rebate 87A: income ≤ ₹7,00,000
const NEW_SLABS = [
  { from: 0,        to: 300000,   rate: 0.00 },
  { from: 300000,   to: 600000,   rate: 0.05 },
  { from: 600000,   to: 900000,   rate: 0.10 },
  { from: 900000,   to: 1200000,  rate: 0.15 },
  { from: 1200000,  to: 1500000,  rate: 0.20 },
  { from: 1500000,  to: Infinity, rate: 0.30 },
];

// Old Regime — general (age < 60)
// Standard deduction: ₹50,000  |  Rebate 87A: income ≤ ₹5,00,000
const OLD_SLABS_GENERAL = [
  { from: 0,        to: 250000,   rate: 0.00 },
  { from: 250000,   to: 500000,   rate: 0.05 },
  { from: 500000,   to: 1000000,  rate: 0.20 },
  { from: 1000000,  to: Infinity, rate: 0.30 },
];

// Old Regime — senior citizen (60 ≤ age < 80) — basic exemption ₹3L
const OLD_SLABS_SENIOR = [
  { from: 0,        to: 300000,   rate: 0.00 },
  { from: 300000,   to: 500000,   rate: 0.05 },
  { from: 500000,   to: 1000000,  rate: 0.20 },
  { from: 1000000,  to: Infinity, rate: 0.30 },
];

// Old Regime — super senior citizen (age ≥ 80) — basic exemption ₹5L
const OLD_SLABS_SUPER = [
  { from: 0,        to: 500000,   rate: 0.00 },
  { from: 500000,   to: 1000000,  rate: 0.20 },
  { from: 1000000,  to: Infinity, rate: 0.30 },
];

// ─── Constants ───────────────────────────────────────────────────────────────

const STD_DED_OLD = 50000;
const STD_DED_NEW = 75000;

const CAP_80C        = 150000;
const CAP_80D        = 50000;   // combined self + parents; parent limit handled in suggestions
const CAP_NPS        = 50000;
const CAP_HOME_LOAN  = 200000;

// ─── Core tax slab calculator ─────────────────────────────────────────────────
/**
 * Applies progressive slab table to a given income and returns:
 *   tax      — total tax before rebate/surcharge
 *   breakdown — array of per-slab rows for display
 */
function calcSlabTax(income, slabs) {
  let tax = 0;
  const breakdown = [];

  for (const slab of slabs) {
    if (income <= slab.from) break;
    const taxableInSlab = Math.min(income, slab.to) - slab.from;
    const taxInSlab = taxableInSlab * slab.rate;
    tax += taxInSlab;
    breakdown.push({
      slab: slab.to === Infinity
        ? `Above ₹${(slab.from / 100000).toFixed(1)}L`
        : `₹${(slab.from / 100000).toFixed(1)}L – ₹${(slab.to / 100000).toFixed(1)}L`,
      rate: `${(slab.rate * 100).toFixed(0)}%`,
      taxableAmount: Math.round(taxableInSlab),
      taxAmount:     Math.round(taxInSlab),
    });
  }
  return { tax, breakdown };
}

// ─── Section 87A rebate ───────────────────────────────────────────────────────
/**
 * Old regime: full rebate (capped at ₹12,500) if taxable income ≤ ₹5,00,000
 * New regime: full rebate (capped at ₹25,000) if taxable income ≤ ₹7,00,000
 *
 * Important: rebate is applied BEFORE surcharge & cess; it cannot exceed baseTax.
 */
function calcRebate87A(baseTax, taxableIncome, regime) {
  if (regime === 'old' && taxableIncome <= 500000)  return Math.min(baseTax, 12500);
  if (regime === 'new' && taxableIncome <= 700000)  return Math.min(baseTax, 25000);
  return 0;
}

// ─── Marginal relief ─────────────────────────────────────────────────────────
/**
 * When income is just above the rebate threshold the "cliff" tax jump can exceed
 * the incremental income. Marginal relief caps extra tax at (income − threshold).
 *
 * Example (new regime): income = ₹7,10,000 → without relief, tax = ~₹26,000
 * but that is MORE than the ₹10,000 earned above ₹7L.
 * Marginal relief = max(0, taxWithoutRebate − incomeAboveThreshold).
 */
function calcMarginalRelief(income, baseTax, regime) {
  const threshold = regime === 'new' ? 700000 : 500000;
  if (income <= threshold) return 0;

  // Tax at threshold (i.e., tax that would be zero with rebate)
  const slabs = regime === 'new' ? NEW_SLABS : OLD_SLABS_GENERAL; // senior slabs handled separately
  const { tax: taxAtThreshold } = calcSlabTax(threshold, slabs);
  const incomeAboveThreshold = income - threshold;
  const taxDiff = baseTax - taxAtThreshold;

  // Relief = amount by which extra tax exceeds extra income
  const relief = Math.max(0, taxDiff - incomeAboveThreshold);
  return relief;
}

// ─── Surcharge ────────────────────────────────────────────────────────────────
/**
 * Surcharge is on TAX (not income). Applied on income slabs:
 *   > ₹50L:  10%
 *   > ₹1Cr:  15%
 *   > ₹2Cr:  25%
 *   > ₹5Cr:  37% (old) / 25% (new — capped by Finance Act 2023)
 *
 * Marginal relief on surcharge also applies (complex; omitted at this level).
 */
function calcSurcharge(taxAfterRebate, taxableIncome, regime) {
  let rate = 0;
  if      (taxableIncome > 50000000) rate = regime === 'new' ? 0.25 : 0.37;
  else if (taxableIncome > 20000000) rate = 0.25;
  else if (taxableIncome > 10000000) rate = 0.15;
  else if (taxableIncome > 5000000)  rate = 0.10;
  return taxAfterRebate * rate;
}

// ─── HRA exemption ───────────────────────────────────────────────────────────
/**
 * HRA exempt = MIN of:
 *   (a) HRA received from employer
 *   (b) Rent paid − 10% of Basic Salary
 *   (c) 50% of basic (metro) or 40% (non-metro)
 *
 * We estimate basic as 40% of CTC — a common HR convention.
 * Actual computation should use the contract basic; this is a planning tool.
 */
function calcHraExemption(annualIncome, hraReceived, rentPaid, cityTier) {
  if (hraReceived <= 0 || rentPaid <= 0) return 0;
  const basic = annualIncome * 0.40;
  const a = hraReceived;
  const b = Math.max(0, rentPaid - basic * 0.10);
  const c = basic * (cityTier === 'metro' ? 0.50 : 0.40);
  return Math.max(0, Math.min(a, b, c));
}

// ─── Capital gains tax ────────────────────────────────────────────────────────
/**
 * Capital gains are taxed separately (outside slab), same for both regimes.
 *   LTCG equity: 10% on gains > ₹1,00,000 (Section 112A)
 *   STCG equity: 15% flat (Section 111A)
 *   LTCG debt/property: 20% with indexation (Section 112)
 */
function calcCapitalGainsTax(ltcg = 0, stcg = 0, ltcgDebt = 0) {
  const ltcgEquityTax = Math.max(0, ltcg - 100000) * 0.10;
  const stcgEquityTax = stcg * 0.15;
  const ltcgDebtTax   = ltcgDebt * 0.20;
  return {
    ltcgEquityTax:  Math.round(ltcgEquityTax),
    stcgEquityTax:  Math.round(stcgEquityTax),
    ltcgDebtTax:    Math.round(ltcgDebtTax),
    total:          Math.round(ltcgEquityTax + stcgEquityTax + ltcgDebtTax),
  };
}

// ─── Slab selector ───────────────────────────────────────────────────────────

function getOldSlabs(age) {
  if (age >= 80) return OLD_SLABS_SUPER;
  if (age >= 60) return OLD_SLABS_SENIOR;
  return OLD_SLABS_GENERAL;
}

// ─── Full tax computation ─────────────────────────────────────────────────────
/**
 * Computes slab tax → rebate → marginal relief → surcharge → cess for a given
 * taxable income + regime + age.  Returns an object with every intermediate value
 * so the API can expose a full breakdown.
 */
function computeSlabTax(taxableIncome, income, regime, age) {
  const slabs = regime === 'new' ? NEW_SLABS : getOldSlabs(age);
  const { tax: baseTax, breakdown } = calcSlabTax(taxableIncome, slabs);

  // Rebate 87A
  const rebate = calcRebate87A(baseTax, taxableIncome, regime);
  let taxAfterRebate = Math.max(0, baseTax - rebate);

  // Marginal relief — only relevant when income is just above rebate threshold
  // For simplicity we apply relief on the slab tax before surcharge.
  // This is the standard CA practice for planning estimates.
  const marginalRelief = rebate === 0 ? calcMarginalRelief(taxableIncome, baseTax, regime) : 0;
  taxAfterRebate = Math.max(0, taxAfterRebate - marginalRelief);

  const surcharge = calcSurcharge(taxAfterRebate, taxableIncome, regime);
  const cess      = (taxAfterRebate + surcharge) * 0.04;
  const total     = taxAfterRebate + surcharge + cess;

  return {
    baseTax:        Math.round(baseTax),
    rebate:         Math.round(rebate),
    marginalRelief: Math.round(marginalRelief),
    taxAfterRebate: Math.round(taxAfterRebate),
    surcharge:      Math.round(surcharge),
    cess:           Math.round(cess),
    total:          Math.round(total),
    breakdown,
  };
}

// ─── Smart suggestions engine ─────────────────────────────────────────────────
/**
 * Generates actionable, quantified suggestions for the user's specific situation.
 * Rules:
 *  - Only suggest actions in the applicable regime
 *  - Always include the rupee saving amount
 *  - Flag regime switch if it saves > ₹1,000
 *  - Surface rebate cliff warning (new regime: crossing ₹7L)
 *  - Surface deduction headroom (80C, 80D, NPS)
 */
function buildSuggestions({
  regime,
  betterRegime,
  taxSaving,
  oldRegimeTax,
  newRegimeTax,
  deductions,
  annualIncome,
  taxableIncomeNew,
  marginalRate,
}) {
  const suggestions = [];
  const { section80C = 0, section80D = 0, section80CCD1B = 0, homeLoanInterest = 0 } = deductions;

  // 1. Rebate cliff warning (new regime)
  // If taxable income is ₹7,00,001 – ₹7,50,000, user may be paying large tax
  // just because they crossed the ₹7L rebate threshold.
  if (regime === 'new' && taxableIncomeNew > 700000 && taxableIncomeNew <= 750000) {
    const gap = taxableIncomeNew - 700000;
    suggestions.push(
      `⚠️ Your taxable income (new regime) is just ₹${gap.toLocaleString('en-IN')} above the ₹7L rebate limit. ` +
      `If you can reduce income or increase exemptions by ₹${gap.toLocaleString('en-IN')}, your new-regime tax could drop to ₹0.`,
    );
  }

  // 2. Regime switch recommendation
  if (betterRegime !== regime && taxSaving > 1000) {
    const betterLabel = betterRegime === 'old' ? 'Old Regime' : 'New Regime';
    suggestions.push(
      `💰 Switching to the ${betterLabel} saves you ₹${Math.round(taxSaving).toLocaleString('en-IN')} in taxes this year.`,
    );
  }

  // 3. Old regime specific savings headroom
  const isOldRelevant = regime === 'old' || betterRegime === 'old';
  if (isOldRelevant) {
    // 80C headroom
    const used80C     = Math.min(section80C, CAP_80C);
    const headroom80C = CAP_80C - used80C;
    if (headroom80C > 0) {
      // Tax saving = headroom * marginal rate * 1.04 (cess)
      const saving = Math.round(headroom80C * (marginalRate / 100) * 1.04);
      if (saving > 500) {
        suggestions.push(
          `📈 Invest ₹${headroom80C.toLocaleString('en-IN')} more in 80C instruments ` +
          `(ELSS, PPF, LIC, EPF) to save ~₹${saving.toLocaleString('en-IN')} in tax.`,
        );
      }
    }

    // 80D headroom — basic ₹25k (self); ₹50k for senior parents
    const used80D     = Math.min(section80D, CAP_80D);
    const headroom80D = 25000 - Math.min(used80D, 25000); // base self limit
    if (headroom80D > 0) {
      const saving = Math.round(headroom80D * (marginalRate / 100) * 1.04);
      if (saving > 200) {
        suggestions.push(
          `🏥 Pay ₹${headroom80D.toLocaleString('en-IN')} more in health insurance premium ` +
          `(Section 80D) to save ~₹${saving.toLocaleString('en-IN')}.`,
        );
      }
    }

    // NPS 80CCD(1B) headroom
    const usedNPS    = Math.min(section80CCD1B, CAP_NPS);
    const headroomNPS = CAP_NPS - usedNPS;
    if (headroomNPS > 0) {
      const saving = Math.round(headroomNPS * (marginalRate / 100) * 1.04);
      if (saving > 500) {
        suggestions.push(
          `🏦 Contribute ₹${headroomNPS.toLocaleString('en-IN')} more to NPS under 80CCD(1B) ` +
          `(separate from 80C limit) to save ~₹${saving.toLocaleString('en-IN')}.`,
        );
      }
    }

    // Home loan interest — if not claimed
    if (homeLoanInterest === 0 && annualIncome > 500000) {
      suggestions.push(
        `🏠 If you have a home loan, claim up to ₹2,00,000 interest deduction under Section 24(b).`,
      );
    }
  }

  // 4. High income — inform about surcharge
  if (annualIncome > 5000000) {
    suggestions.push(
      `📌 Your income exceeds ₹50L — surcharge applies. Consider income-splitting or ELSS / long-term instruments to manage the effective tax rate.`,
    );
  }

  return suggestions;
}

// ─── POST /api/tax/calculate ──────────────────────────────────────────────────

const calculateTax = async (req, res, next) => {
  try {
    const {
      regime          = 'new',
      annualIncome    = 0,
      hraReceived     = 0,
      rentPaid        = 0,
      cityTier        = 'non-metro',
      deductions      = {},
      capitalGains    = {},
      age             = 30,
    } = req.body;

    // ── Validation ────────────────────────────────────────────────
    if (!annualIncome || annualIncome <= 0) {
      return error(res, 'annualIncome must be a positive number', 400);
    }
    if (!['old', 'new'].includes(regime)) {
      return error(res, 'regime must be "old" or "new"', 400);
    }
    if (age < 0 || age > 120) {
      return error(res, 'age must be between 0 and 120', 400);
    }

    // ── Destructure inputs ────────────────────────────────────────
    const {
      section80C            = 0,
      section80D            = 0,
      section80CCD1B        = 0,
      homeLoanInterest      = 0,
      educationLoanInterest = 0,
      otherDeductions       = 0,
    } = deductions;

    const {
      ltcg               = 0,
      stcg               = 0,
      ltcgDebtOrProperty = 0,
    } = capitalGains;

    // ── OLD REGIME ────────────────────────────────────────────────
    const hraExempt    = calcHraExemption(annualIncome, hraReceived, rentPaid, cityTier);
    const cap80C       = Math.min(Math.max(0, section80C), CAP_80C);
    const cap80D       = Math.min(Math.max(0, section80D), CAP_80D);
    const capNPS       = Math.min(Math.max(0, section80CCD1B), CAP_NPS);
    const capHomeLoan  = Math.min(Math.max(0, homeLoanInterest), CAP_HOME_LOAN);
    const capEduLoan   = Math.max(0, educationLoanInterest);   // no upper limit
    const capOther     = Math.max(0, otherDeductions);

    const totalDeductionsOld =
      STD_DED_OLD + hraExempt + cap80C + cap80D + capNPS +
      capHomeLoan + capEduLoan + capOther;

    const taxableIncomeOld = Math.max(0, annualIncome - totalDeductionsOld);
    const oldResult = computeSlabTax(taxableIncomeOld, annualIncome, 'old', age);

    // ── NEW REGIME ────────────────────────────────────────────────
    // Only standard deduction ₹75,000 is allowed; all other deductions ignored.
    const taxableIncomeNew = Math.max(0, annualIncome - STD_DED_NEW);
    const newResult = computeSlabTax(taxableIncomeNew, annualIncome, 'new', age);

    // ── CAPITAL GAINS (regime-agnostic) ──────────────────────────
    const cgTax = calcCapitalGainsTax(ltcg, stcg, ltcgDebtOrProperty);
    // Cess on CG tax (Section 4 Health & Education Cess applies to CG tax too)
    const cgTaxWithCess = Math.round(cgTax.total * 1.04);

    // ── CHOSEN REGIME ────────────────────────────────────────────
    const isOld         = regime === 'old';
    const chosenResult  = isOld ? oldResult : newResult;
    const chosenTaxable = isOld ? taxableIncomeOld : taxableIncomeNew;
    const chosenTotalDed= isOld ? totalDeductionsOld : STD_DED_NEW;

    const totalTaxPayable = Math.round(chosenResult.total + cgTaxWithCess);

    // Effective rate on gross income
    const effectiveRate = annualIncome > 0
      ? parseFloat(((totalTaxPayable / annualIncome) * 100).toFixed(2))
      : 0;

    // Marginal rate — rate of the highest slab with non-zero taxable amount
    const lastActiveSlab = [...chosenResult.breakdown].reverse().find((s) => s.taxableAmount > 0);
    const marginalRate   = lastActiveSlab ? parseFloat(lastActiveSlab.rate) : 0;

    // ── COMPARISON ───────────────────────────────────────────────
    const oldTotal = Math.round(oldResult.total + cgTaxWithCess);
    const newTotal = Math.round(newResult.total + cgTaxWithCess);
    const betterRegime = oldTotal <= newTotal ? 'old' : 'new';
    const taxSaving    = Math.abs(oldTotal - newTotal);

    // ── SUGGESTIONS ──────────────────────────────────────────────
    const suggestions = buildSuggestions({
      regime,
      betterRegime,
      taxSaving,
      oldRegimeTax: oldTotal,
      newRegimeTax: newTotal,
      deductions: { section80C, section80D, section80CCD1B, homeLoanInterest },
      annualIncome,
      taxableIncomeNew,
      marginalRate,
    });

    return success(res, {
      // Input echo
      regime,
      grossIncome:      annualIncome,

      // Chosen regime computation
      totalDeductions:  Math.round(chosenTotalDed),
      taxableIncome:    Math.round(chosenTaxable),
      slabWiseTax:      chosenResult.breakdown,
      baseTax:          chosenResult.baseTax,
      rebate:           chosenResult.rebate,
      marginalRelief:   chosenResult.marginalRelief,
      surcharge:        chosenResult.surcharge,
      cess:             chosenResult.cess,

      // Capital gains detail
      capitalGainsTaxDetail: {
        ltcgEquityTax: cgTax.ltcgEquityTax,
        stcgEquityTax: cgTax.stcgEquityTax,
        ltcgDebtTax:   cgTax.ltcgDebtTax,
        subtotal:      cgTax.total,
        withCess:      cgTaxWithCess,
      },

      // Final numbers
      capitalGainsTax:  cgTaxWithCess,
      totalTaxPayable,
      effectiveRate,
      marginalRate,

      // Comparison
      comparison: {
        oldRegimeTax:  oldTotal,
        newRegimeTax:  newTotal,
        betterRegime,
        taxSaving:     Math.round(taxSaving),
        oldBreakdown:  {
          taxableIncome: taxableIncomeOld,
          baseTax:       oldResult.baseTax,
          rebate:        oldResult.rebate,
          surcharge:     oldResult.surcharge,
          cess:          oldResult.cess,
        },
        newBreakdown: {
          taxableIncome: taxableIncomeNew,
          baseTax:       newResult.baseTax,
          rebate:        newResult.rebate,
          surcharge:     newResult.surcharge,
          cess:          newResult.cess,
        },
      },

      suggestions,
    });
  } catch (err) {
    next(err);
  }
};

// ─── POST /api/tax/gst ────────────────────────────────────────────────────────

const calculateGST = async (req, res, next) => {
  try {
    const { baseAmount, gstRate, transactionType = 'B2C' } = req.body;

    if (!baseAmount || baseAmount <= 0) {
      return error(res, 'baseAmount must be a positive number', 400);
    }
    if (![5, 12, 18, 28].includes(Number(gstRate))) {
      return error(res, 'gstRate must be one of: 5, 12, 18, 28', 400);
    }
    if (!['B2B', 'B2C'].includes(transactionType)) {
      return error(res, 'transactionType must be B2B or B2C', 400);
    }

    const rate        = Number(gstRate);
    const base        = Number(baseAmount);
    const totalGST    = base * rate / 100;
    const totalAmount = base + totalGST;

    const cgst = transactionType === 'B2C' ? totalGST / 2 : 0;
    const sgst = transactionType === 'B2C' ? totalGST / 2 : 0;
    const igst = transactionType === 'B2B' ? totalGST     : 0;

    return success(res, {
      baseAmount:   Math.round(base * 100) / 100,
      gstRate:      rate,
      transactionType,
      cgst:         Math.round(cgst * 100) / 100,
      sgst:         Math.round(sgst * 100) / 100,
      igst:         Math.round(igst * 100) / 100,
      totalGST:     Math.round(totalGST * 100) / 100,
      totalAmount:  Math.round(totalAmount * 100) / 100,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { calculateTax, calculateGST };
