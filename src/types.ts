export interface SystemState {
  temperature: number;
  humidity: number;
  variasiMode: number;
  r1: number;
  r2: number;
  r3: number;
  r4: number;
}

export interface LogEntry {
  id: string;
  timestamp: Date;
  message: string;
  type: 'system' | 'action' | 'voice' | 'error';
}
