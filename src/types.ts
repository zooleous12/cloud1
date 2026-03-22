export type Severity = 'low' | 'medium' | 'high' | 'critical';

export interface Process {
  id: string;
  name: string;
  pid: number;
  user: string;
  cpu: number;
  memory: number;
  startTime: string;
  status: 'recognized' | 'unknown' | 'suspicious';
  path: string;
}

export interface NetworkConnection {
  id: string;
  protocol: 'TCP' | 'UDP';
  localPort: number;
  remoteAddress: string;
  remotePort: number;
  state: string;
  processName: string;
  isAuthorized: boolean;
}

export interface SystemEvent {
  id: string;
  timestamp: string;
  type: 'process' | 'network' | 'file' | 'policy' | 'privilege' | 'termination';
  message: string;
  severity: Severity;
  details?: string;
  processName?: string;
}

export interface FileIntegrity {
  path: string;
  status: 'intact' | 'modified' | 'replaced';
  lastChecked: string;
  hash: string;
}
