export interface CashFlow {
  amount: number;
  day: number;
}

export interface ModifiedDietzInput {
  beginningValue: number;
  endingValue: number;
  periodDays: number;
  cashFlows: CashFlow[];
}

export function calculateModifiedDietz(input: ModifiedDietzInput) {
  assertFinite(input.beginningValue, 'beginningValue');
  assertFinite(input.endingValue, 'endingValue');
  if (!Number.isFinite(input.periodDays) || input.periodDays <= 0) throw new Error('periodDays must be positive');
  let netCashFlow = 0;
  let weightedCashFlow = 0;
  for (const flow of input.cashFlows) {
    assertFinite(flow.amount, 'cash flow amount');
    if (!Number.isFinite(flow.day) || flow.day < 0 || flow.day > input.periodDays) {
      throw new Error('cash flow day must fall inside the period');
    }
    netCashFlow += flow.amount;
    weightedCashFlow += flow.amount * ((input.periodDays - flow.day) / input.periodDays);
  }
  const weightedCapital = input.beginningValue + weightedCashFlow;
  if (weightedCapital === 0) throw new Error('Modified Dietz denominator must not be zero');
  return {
    beginningValue: input.beginningValue,
    endingValue: input.endingValue,
    netCashFlow: round(netCashFlow),
    weightedCashFlow: round(weightedCashFlow),
    weightedCapital: round(weightedCapital),
    returnRate: (input.endingValue - input.beginningValue - netCashFlow) / weightedCapital,
  };
}

export interface PeTemperatureBoundaries {
  freeze: number;
  low: number;
  normal: number;
  high: number;
}

export const DEFAULT_PE_TEMPERATURE_BOUNDARIES: PeTemperatureBoundaries = {
  freeze: 10,
  low: 12,
  normal: 16,
  high: 20,
};

export function peTemperature(peTtm: number, boundaries: PeTemperatureBoundaries = DEFAULT_PE_TEMPERATURE_BOUNDARIES) {
  if (!Number.isFinite(peTtm) || peTtm < 0) throw new Error('PE-TTM must be a non-negative number');
  const { freeze, low, normal, high } = boundaries;
  if (![freeze, low, normal, high].every((value) => Number.isFinite(value) && value >= 0)
    || !(freeze < low && low < normal && normal < high)) throw new Error('PE temperature boundaries must be strictly increasing');
  if (peTtm < freeze) return { zone: 'freeze', suggestion: 'aggressively_add' } as const;
  if (peTtm < low) return { zone: 'low', suggestion: 'moderately_add' } as const;
  if (peTtm < normal) return { zone: 'normal', suggestion: 'normal_dca' } as const;
  if (peTtm <= high) return { zone: 'high', suggestion: 'reduce_investment' } as const;
  return { zone: 'overheat', suggestion: 'pause_or_reduce' } as const;
}

export interface CircuitInput {
  annualDrawdown: number;
  monthlyDrawdown: number;
  maximumPositionLoss: number;
  catiObjection: boolean;
}

export function circuitBreakerState(input: CircuitInput) {
  if (!input || typeof input !== 'object' || typeof input.catiObjection !== 'boolean') {
    throw new Error('Circuit metrics must include a boolean catiObjection');
  }
  for (const name of ['annualDrawdown', 'monthlyDrawdown', 'maximumPositionLoss'] as const) {
    const value = input[name];
    assertFinite(value, name);
    if (value < 0 || value > 1) throw new Error(`${name} must be between 0 and 1`);
  }
  if (input.catiObjection) return { level: 'black', action: 'pause_all' } as const;
  if (input.annualDrawdown > 0.2) return { level: 'red', action: 'route_dca_to_cash' } as const;
  if (input.monthlyDrawdown > 0.1 || input.maximumPositionLoss > 0.2) {
    return { level: 'yellow', action: 'pause_active_additions' } as const;
  }
  return { level: 'none', action: 'normal' } as const;
}

export interface PositionLimits {
  current: number;
  target: number;
  lower: number;
  upper: number;
}

export function positionDeviation(input: PositionLimits) {
  for (const [name, value] of Object.entries(input)) assertFinite(value, name);
  if (input.lower > input.target || input.target > input.upper) throw new Error('Position limits must contain the target');
  const status = input.current > input.upper
    ? 'above_upper'
    : input.current < input.lower
      ? 'below_lower'
      : 'normal';
  return {
    deviation: round(input.current - input.target, 12),
    status,
    suggestedChange: status === 'normal' ? 0 : round(input.target - input.current, 12),
  };
}

export interface ExcessSplitInput {
  currentValue: number;
  historicalMaximumValue: number;
  weightedCapital: number;
  portfolioReturn: number;
  benchmarkRate?: number;
  managerShareRate?: number;
  managerBonusCap?: number;
}

export function calculateExcessSplit(input: ExcessSplitInput) {
  for (const [name, value] of Object.entries(input)) assertFinite(value, name);
  if (input.weightedCapital < 0 || input.historicalMaximumValue < 0 || input.currentValue < 0) {
    throw new Error('Portfolio values must be non-negative');
  }
  const benchmarkRate = input.benchmarkRate ?? 0.03;
  const managerShareRate = input.managerShareRate ?? 0.5;
  const managerBonusCap = input.managerBonusCap ?? Number.POSITIVE_INFINITY;
  if (benchmarkRate < 0 || managerShareRate < 0 || managerShareRate > 1 || managerBonusCap < 0) throw new Error('Invalid split parameters');
  const highWaterMark = round(input.historicalMaximumValue * 1.03);
  const eligible = input.currentValue > highWaterMark && input.portfolioReturn > benchmarkRate;
  const excessReturn = eligible ? round(input.portfolioReturn - benchmarkRate, 12) : 0;
  const excessValue = round(input.weightedCapital * excessReturn);
  return {
    highWaterMark,
    eligible,
    benchmarkRate,
    excessReturn,
    excessValue,
    managerShareRate,
    managerShare: round(Math.min(excessValue * managerShareRate, managerBonusCap)),
  };
}

function assertFinite(value: number, name: string): void {
  if (!Number.isFinite(value)) throw new Error(`${name} must be finite`);
}

function round(value: number, precision = 2): number {
  const scale = 10 ** precision;
  return Math.round((value + Number.EPSILON) * scale) / scale;
}
