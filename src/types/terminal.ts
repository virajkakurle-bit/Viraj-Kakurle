export type Timeframe = '1m' | '5m' | '15m' | '1H' | '4H' | '1D';

export interface Candle {
  time: string;
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface SMCLevels {
  supplyOB: {
    label: string;
    top: number;
    bottom: number;
  };
  bslSwept: {
    label: string;
    price: number;
  };
  vah: {
    label: string;
    price: number;
  };
  poc: {
    label: string;
    price: number;
  };
  bos: {
    label: string;
    price: number;
  };
  fvg: {
    label: string;
    top: number;
    bottom: number;
  };
  val: {
    label: string;
    price: number;
  };
}

export interface AIStructureData {
  bias: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  biasLabel: string;
  confidence: number;
  strategyName: string;
  description: string;
  mtfBias: {
    '15m': 'BULL' | 'BEAR' | 'NEUTRAL';
    '4H': 'BULL' | 'BEAR' | 'NEUTRAL';
    '1D': 'BULL' | 'BEAR' | 'NEUTRAL';
  };
  levels: {
    triggerEntry: number;
    invalidationSL: number;
    target1: number;
    target2: number;
  };
  reasoningLog: string[];
}

export interface SymbolData {
  symbol: string;
  name: string;
  category: string;
  price: number;
  bid: number;
  ask: number;
  spread: number;
  volume24h: string;
  change24h: number;
  changeAmount: number;
  digits: number;
  candles: Candle[];
  smc: SMCLevels;
  aiStructure: AIStructureData;
}

export interface Position {
  id: string;
  symbol: string;
  side: 'BUY' | 'SELL';
  lots: number;
  entryPrice: number;
  markPrice: number;
  stopLoss: number | string;
  takeProfit: number;
  netPnL: number;
  netPnLPercent: number;
  openTime: string;
}

export interface OrderHistoryItem {
  id: string;
  symbol: string;
  side: 'BUY' | 'SELL';
  lots: number;
  entryPrice: number;
  exitPrice: number;
  pnl: number;
  pnlPercent: number;
  closedAt: string;
  status: 'TP_HIT' | 'SL_HIT' | 'MANUAL_CLOSE';
  notes?: string;
  tags?: string[];
  sentiment?: 'DISCIPLINED' | 'EMOTIONAL' | 'NEUTRAL' | 'REVENGE';
}

export interface AccountState {
  balance: number;
  equity: number;
  margin: number;
  freeMargin: number;
  currency: string;
}

export interface RiskRewardSetup {
  visible: boolean;
  side: 'LONG' | 'SHORT';
  entryPrice: number;
  stopLoss: number;
  takeProfit: number;
  lots: number;
}

export interface PriceAlert {
  id: string;
  symbol: string;
  targetPrice: number;
  condition: 'CROSSES_ABOVE' | 'CROSSES_BELOW' | 'CROSSES';
  note?: string;
  createdAt: string;
  triggered: boolean;
  triggeredAt?: string;
}

