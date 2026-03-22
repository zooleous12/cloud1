import { Process, NetworkConnection, SystemEvent, FileIntegrity } from './types';

export const MOCK_PROCESSES: Process[] = [
  { id: '1', name: 'systemd', pid: 1, user: 'root', cpu: 0.1, memory: 12, startTime: '2026-03-17 00:00:01', status: 'recognized', path: '/sbin/init' },
  { id: '2', name: 'Xorg', pid: 842, user: 'root', cpu: 1.2, memory: 156, startTime: '2026-03-17 00:05:12', status: 'recognized', path: '/usr/lib/xorg/Xorg' },
  { id: '3', name: 'gnome-shell', pid: 1204, user: 'kali', cpu: 2.5, memory: 412, startTime: '2026-03-17 00:05:15', status: 'recognized', path: '/usr/bin/gnome-shell' },
  { id: '4', name: 'msfconsole', pid: 4521, user: 'kali', cpu: 0.5, memory: 89, startTime: '2026-03-17 02:10:00', status: 'recognized', path: '/usr/bin/msfconsole' },
  { id: '5', name: 'nc', pid: 9982, user: 'kali', cpu: 0.1, memory: 4, startTime: '2026-03-17 02:15:30', status: 'unknown', path: '/usr/bin/nc' },
];

export const MOCK_CONNECTIONS: NetworkConnection[] = [
  { id: 'c1', protocol: 'TCP', localPort: 22, remoteAddress: '192.168.1.50', remotePort: 54321, state: 'ESTABLISHED', processName: 'sshd', isAuthorized: true },
  { id: 'c2', protocol: 'TCP', localPort: 443, remoteAddress: '104.18.25.12', remotePort: 443, state: 'ESTABLISHED', processName: 'firefox', isAuthorized: true },
  { id: 'c3', protocol: 'UDP', localPort: 53, remoteAddress: '8.8.8.8', remotePort: 53, state: 'CLOSED', processName: 'systemd-resolved', isAuthorized: true },
  { id: 'c4', protocol: 'TCP', localPort: 4444, remoteAddress: '45.33.22.11', remotePort: 80, state: 'SYN_SENT', processName: 'unknown', isAuthorized: false },
];

export const MOCK_EVENTS: SystemEvent[] = [
  { id: 'e1', timestamp: '02:10:00', type: 'process', message: 'Metasploit console started', severity: 'low' },
  { id: 'e2', timestamp: '02:15:30', type: 'process', message: 'New unknown process: nc (PID 9982)', severity: 'medium' },
  { id: 'e3', timestamp: '02:15:35', type: 'network', message: 'Unauthorized connection attempt on port 4444', severity: 'high' },
  { id: 'e4', timestamp: '02:15:40', type: 'privilege', message: 'SUDO execution by kali: /usr/bin/nc -l -p 4444', severity: 'high' },
];

export const MOCK_FILES: FileIntegrity[] = [
  { path: '/etc/passwd', status: 'intact', lastChecked: '02:15:00', hash: 'a1b2c3d4...' },
  { path: '/etc/shadow', status: 'intact', lastChecked: '02:15:00', hash: 'e5f6g7h8...' },
  { path: '/usr/bin/sudo', status: 'intact', lastChecked: '02:15:00', hash: 'i9j0k1l2...' },
  { path: '/etc/crontab', status: 'modified', lastChecked: '02:15:45', hash: 'm3n4o5p6...' },
];
