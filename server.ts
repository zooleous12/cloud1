import express from 'express';
import { createServer as createViteServer } from 'vite';
import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs';

async function startServer() {
  const app = express();
  const PORT = 3000;

  // In-memory state for behavioral monitoring
  let knownProcesses: Set<number> = new Set();
  let knownProcessNames: Set<string> = new Set();
  let events: any[] = [];
  let authorizedPorts: Set<number> = new Set([22, 80, 443, 3000]);
  let suspiciousPorts: Set<number> = new Set([4444, 6667, 1337, 31337]);
  
  // System whitelist for common Kali/Linux services
  const systemWhitelist = [
    'rtkit-daemon',
    'systemd',
    'dbus-daemon',
    'gnome-shell',
    'Xorg',
    'sshd',
    'networkmanager',
    'avahi-daemon',
    'udisksd',
    'polkitd',
    'accounts-daemon',
    'cron',
    'wpa_supplicant',
    'atd',
    'irqbalance',
    'rsyslogd',
    'smartd',
    'agetty',
    'systemd-journal',
    'systemd-logind',
    'systemd-udevd',
    'systemd-resolved',
    'systemd-timesyn',
    'systemd-network',
    'kworker',
    'ksoftirqd',
    'migration',
    'rcu_sched',
    'rcu_bh',
    'kauditd',
    'bash',
    'sh',
    'zsh',
    'tmux',
    'screen',
    'sudo',
    'su',
    'ps',
    'grep',
    'sed',
    'awk',
    'ls',
    'cat',
    'tail',
    'head',
    'sleep',
    'watch',
    'top',
    'htop',
    'btop',
    'npm',
    'node',
    'tsx',
    'vite'
  ];

  // Blacklist for automatic termination
  let blacklist: string[] = ['rtkit-daemon', 'nc', 'netcat', 'ncat', 'socat'];

  // Helper to run shell commands safely
  const runCommand = (cmd: string) => {
    try {
      return execSync(cmd, { encoding: 'utf8' });
    } catch (e) {
      return '';
    }
  };

  // API: Get Processes
  app.get('/api/processes', (req, res) => {
    const output = runCommand('ps -eo pid,user,%cpu,%mem,start,comm,args --sort=-%cpu | head -n 50');
    const lines = output.trim().split('\n').slice(1);
    
    const currentProcesses = lines.map(line => {
      const parts = line.trim().split(/\s+/);
      const pid = parseInt(parts[0]);
      const name = parts[5] || 'unknown';
      
      let status: 'recognized' | 'unknown' | 'suspicious' = 'recognized';
      
      // Check if it's in the system whitelist or already known
      const isWhitelisted = systemWhitelist.some(w => 
        name.toLowerCase().includes(w.toLowerCase()) || 
        (parts.slice(6).join(' ').toLowerCase().includes(w.toLowerCase()))
      );

      // Automatic termination for blacklisted processes
      const isBlacklisted = blacklist.some(b => name.includes(b));
      if (isBlacklisted) {
        try {
          runCommand(`kill -9 ${pid}`);
          const event = {
            id: Math.random().toString(36).substr(2, 9),
            timestamp: new Date().toLocaleTimeString(),
            type: 'termination',
            message: `AUTO-KILL: Terminated blacklisted process ${name} (PID: ${pid})`,
            severity: 'high'
          };
          if (!events.find(e => e.message === event.message)) {
            events.unshift(event);
          }
          return null; // Don't include in process list
        } catch (e) {}
      }
      
      if (!isWhitelisted && !knownProcesses.has(pid) && !knownProcessNames.has(name) && knownProcesses.size > 0) {
        status = 'unknown';
        // Auto-log new process event
        const event = {
          id: Math.random().toString(36).substr(2, 9),
          timestamp: new Date().toLocaleTimeString(),
          type: 'process',
          message: `New process detected: ${name} (PID: ${pid})`,
          severity: 'medium'
        };
        if (!events.find(e => e.message === event.message)) {
          events.unshift(event);
        }
      }
      
      return {
        id: pid.toString(),
        pid,
        user: parts[1],
        cpu: parseFloat(parts[2]),
        memory: parseFloat(parts[3]),
        startTime: parts[4],
        name,
        path: parts.slice(6).join(' '),
        status
      };
    }).filter((p): p is any => p !== null);

    // Update known processes after first run
    if (knownProcesses.size === 0) {
      currentProcesses.forEach(p => {
        knownProcesses.add(p.pid);
        knownProcessNames.add(p.name);
      });
    }

    res.json(currentProcesses);
  });

  // API: Get Network Connections
  app.get('/api/network', (req, res) => {
    // ss -tulpn is ideal for Kali, but netstat is more universal
    const output = runCommand('netstat -tulpn 2>/dev/null || netstat -an');
    const lines = output.trim().split('\n');
    
    const connections = lines.filter(l => l.includes('LISTEN') || l.includes('ESTABLISHED')).map((line, i) => {
      const parts = line.trim().split(/\s+/);
      const localAddr = parts[3] || '';
      const port = parseInt(localAddr.split(':').pop() || '0');
      const processPart = parts[6] || 'unknown';
      const pidMatch = processPart.match(/(\d+)\//);
      const pid = pidMatch ? parseInt(pidMatch[1]) : null;

      // Auto-kill suspicious ports
      if (suspiciousPorts.has(port) && pid) {
        try {
          runCommand(`kill -9 ${pid}`);
          const event = {
            id: Math.random().toString(36).substr(2, 9),
            timestamp: new Date().toLocaleTimeString(),
            type: 'termination',
            message: `AUTO-KILL: Terminated process (PID: ${pid}) listening on suspicious port ${port}`,
            severity: 'high'
          };
          if (!events.find(e => e.message === event.message)) {
            events.unshift(event);
          }
        } catch (e) {}
      }
      
      return {
        id: `c${i}`,
        protocol: line.includes('tcp') ? 'TCP' : 'UDP',
        localPort: port,
        remoteAddress: parts[4] || '0.0.0.0',
        remotePort: 0,
        state: line.includes('LISTEN') ? 'LISTEN' : 'ESTABLISHED',
        processName: processPart,
        isAuthorized: authorizedPorts.has(port)
      };
    });

    res.json(connections);
  });

  // API: Get File Integrity
  app.get('/api/integrity', (req, res) => {
    const criticalFiles = [
      '/etc/passwd',
      '/etc/shadow',
      '/etc/sudoers',
      '/etc/crontab',
      '/bin/bash',
      '/usr/bin/sudo'
    ];

    const integrity = criticalFiles.map(file => {
      let status = 'intact';
      let hash = 'N/A';
      
      try {
        if (fs.existsSync(file)) {
          hash = runCommand(`sha256sum ${file}`).split(' ')[0];
        } else {
          status = 'replaced'; // Or missing
        }
      } catch (e) {
        status = 'modified';
      }

      return {
        path: file,
        status,
        lastChecked: new Date().toLocaleTimeString(),
        hash
      };
    });

    res.json(integrity);
  });

  // API: Events
  app.get('/api/events', (req, res) => {
    res.json(events.slice(0, 50));
  });

  // API: Acknowledge/Whitelist
  app.post('/api/acknowledge', express.json(), (req, res) => {
    const { pid, name } = req.body;
    const pidNum = parseInt(pid);
    if (!isNaN(pidNum)) knownProcesses.add(pidNum);
    if (name) knownProcessNames.add(name);
    
    // Remove any events related to this PID or Name to stop "wigging out"
    events = events.filter(e => 
      !e.message.includes(`(PID: ${pidNum})`) && 
      !(name && e.message.includes(`detected: ${name}`))
    );
    
    res.json({ success: true });
  });

  // API: Kill Process
  app.post('/api/kill', express.json(), (req, res) => {
    const { pid } = req.body;
    const pidNum = parseInt(pid);
    
    if (isNaN(pidNum)) {
      return res.status(400).json({ error: 'Invalid PID' });
    }

    try {
      // Use SIGKILL for "killer" behavior
      runCommand(`kill -9 ${pidNum}`);
      
      // Remove from known processes and events
      knownProcesses.delete(pidNum);
      events = events.filter(e => !e.message.includes(`(PID: ${pidNum})`));
      
      res.json({ success: true, message: `Process ${pidNum} terminated.` });
    } catch (e) {
      res.status(500).json({ error: `Failed to kill process ${pidNum}` });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Sentry Backend active on port ${PORT}`);
  });
}

startServer();
