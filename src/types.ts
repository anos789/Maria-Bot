export interface MEXCConfig {
  apiKey: string;
  apiSecret: string;
  isSandbox: boolean;
  autoTransferRewards: boolean;
  leverage: number;
  eventDurationMinutes: number;
}

export interface TradePosition {
  id: string;
  pair: string;
  type: 'LONG' | 'SHORT';
  entryPrice: number;
  currentPrice: number;
  amount: number;
  leverage: number;
  pnl: number;
  pnlPercent: number;
  timestamp: string;
  status: 'ACTIVE' | 'CLOSED';
}

export interface RewardTransferLog {
  id: string;
  amount: number;
  asset: string;
  fromAccount: string;
  toAccount: string;
  status: 'SUCCESS' | 'FAILED';
  timestamp: string;
}

export interface BotLog {
  id: string;
  timestamp: string;
  type: 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR';
  message: string;
}
