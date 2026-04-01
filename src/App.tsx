import React, { useState, useEffect, useMemo } from 'react';
import { 
  Shield, 
  Activity, 
  Network, 
  Cpu, 
  FileWarning, 
  AlertTriangle, 
  Terminal, 
  Settings, 
  Lock, 
  UserCheck,
  Search,
  RefreshCw,
  Bell,
  X,
  CheckCircle2,
  Info,
  BrainCircuit,
  Camera,
  Video,
  Image as ImageIcon,
  Sparkles,
  Loader2,
  GitGraph,
  LayoutList
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';
import { cn } from './lib/utils';
import { MOCK_PROCESSES, MOCK_CONNECTIONS, MOCK_EVENTS, MOCK_FILES } from './mockData';
import { Process, NetworkConnection, SystemEvent, FileIntegrity, Severity } from './types';
import { ProcessTree } from './components/ProcessTree';
import { analyzeSystemState, analyzeForensicMedia, generateThreatVisual } from './services/gemini';

// --- Components ---

const StatusBadge = ({ severity }: { severity: Severity }) => {
  const colors = {
    low: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    medium: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
    high: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
    critical: 'bg-red-500/10 text-red-400 border-red-500/20',
  };
  return (
    <span className={cn("px-2 py-0.5 text-[10px] uppercase tracking-wider border rounded-sm font-bold", colors[severity])}>
      {severity}
    </span>
  );
};

const Header = () => (
  <header className="h-16 border-b border-[#2A2A2E] bg-[#0D0D0F] flex items-center justify-between px-6 sticky top-0 z-50">
    <div className="flex items-center gap-3">
      <div className="w-10 h-10 bg-[#00FF41]/10 rounded-sm flex items-center justify-center border border-[#00FF41]/20">
        <Shield className="w-6 h-6 text-[#00FF41]" />
      </div>
      <div>
        <h1 className="text-lg font-bold tracking-tighter terminal-text uppercase">One Man Computer v1.0.0</h1>
        <p className="text-[10px] text-zinc-500 uppercase tracking-[0.2em]">Single Operator Computing Environment</p>
      </div>
    </div>
    
    <div className="flex items-center gap-6">
      <div className="flex items-center gap-4 text-[10px] text-zinc-400">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-[#00FF41] animate-pulse" />
          <span>SYSTEM: ONLINE</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-[#00FF41]" />
          <span>NETWORK: SECURE</span>
        </div>
      </div>
      <div className="h-8 w-px bg-zinc-800" />
      <div className="flex items-center gap-3">
        <button className="p-2 hover:bg-zinc-800 rounded-sm transition-colors relative">
          <Bell className="w-5 h-5 text-zinc-400" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-[#0D0D0F]" />
        </button>
        <button className="p-2 hover:bg-zinc-800 rounded-sm transition-colors">
          <Settings className="w-5 h-5 text-zinc-400" />
        </button>
      </div>
    </div>
  </header>
);

const Sidebar = ({ activeTab, setActiveTab }: { activeTab: string, setActiveTab: (t: string) => void }) => {
  const menuItems = [
    { id: 'overview', icon: Activity, label: 'OVERVIEW' },
    { id: 'processes', icon: Cpu, label: 'PROCESSES' },
    { id: 'network', icon: Network, label: 'NETWORK' },
    { id: 'files', icon: FileWarning, label: 'INTEGRITY' },
    { id: 'forensics', icon: BrainCircuit, label: 'AI FORENSICS' },
    { id: 'terminal', icon: Terminal, label: 'TERMINAL' },
  ];

  return (
    <aside className="w-64 border-r border-[#2A2A2E] bg-[#0D0D0F] flex flex-col">
      <nav className="flex-1 p-4 space-y-1">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-3 text-xs font-bold tracking-widest transition-all duration-200 group",
              activeTab === item.id 
                ? "bg-[#00FF41]/10 text-[#00FF41] border-l-2 border-[#00FF41]" 
                : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50"
            )}
          >
            <item.icon className={cn("w-4 h-4", activeTab === item.id ? "text-[#00FF41]" : "text-zinc-500 group-hover:text-zinc-300")} />
            {item.label}
          </button>
        ))}
      </nav>
      
      <div className="p-6 border-t border-[#2A2A2E]">
        <div className="glass-panel p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-zinc-500">CPU USAGE</span>
            <span className="text-[10px] text-[#00FF41]">12%</span>
          </div>
          <div className="h-1 bg-zinc-800 rounded-full overflow-hidden">
            <div className="h-full bg-[#00FF41] w-[12%]" />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-zinc-500">MEM USAGE</span>
            <span className="text-[10px] text-[#00FF41]">4.2GB</span>
          </div>
          <div className="h-1 bg-zinc-800 rounded-full overflow-hidden">
            <div className="h-full bg-[#00FF41] w-[45%]" />
          </div>
        </div>
      </div>
    </aside>
  );
};

const AlertModal = ({ isOpen, onClose, event, onAcknowledge, onKill }: { 
  isOpen: boolean, 
  onClose: () => void, 
  event: SystemEvent | null, 
  onAcknowledge: (pid: number, name?: string) => void,
  onKill: (pid: number) => void
}) => {
  if (!isOpen || !event) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="w-full max-w-md glass-panel p-6 border-red-500/30"
      >
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-red-500/10 rounded-sm flex items-center justify-center border border-red-500/20">
              <AlertTriangle className="w-8 h-8 text-red-500" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-red-500">SECURITY ALERT</h2>
              <p className="text-[10px] text-zinc-500 uppercase tracking-widest">Behavioral Anomaly Detected</p>
            </div>
          </div>
          <button onClick={onClose} className="text-zinc-500 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4 mb-8">
          <div className="p-4 bg-zinc-900/50 border border-zinc-800 rounded-sm">
            <p className="text-sm text-zinc-300 font-bold mb-1">{event.message}</p>
            <p className="text-xs text-zinc-500 leading-relaxed">
              A new process with unknown signature has attempted to open a network listener on port 4444. This behavior is consistent with reverse shell payloads.
            </p>
          </div>
          
          <div className="grid grid-cols-2 gap-4 text-[10px]">
            <div className="space-y-1">
              <span className="text-zinc-500 uppercase">TIMESTAMP</span>
              <p className="text-zinc-300">{event.timestamp}</p>
            </div>
            <div className="space-y-1">
              <span className="text-zinc-500 uppercase">SEVERITY</span>
              <p className="text-red-400 font-bold uppercase">{event.severity}</p>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <button 
            onClick={() => {
              onKill(parseInt(event.id));
              onClose();
            }}
            className="w-full py-3 bg-red-600 hover:bg-red-700 text-white text-xs font-bold tracking-widest transition-colors rounded-sm"
          >
            TERMINATE PROCESS
          </button>
          <button 
            onClick={() => {
              onAcknowledge(parseInt(event.id), event.processName);
              onClose();
            }}
            className="w-full py-3 border border-zinc-700 hover:bg-zinc-800 text-zinc-300 text-xs font-bold tracking-widest transition-colors rounded-sm"
          >
            I RECOGNIZE THIS (WHITELIST)
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default function App() {
  const [activeTab, setActiveTab] = useState('overview');
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [currentAlert, setCurrentAlert] = useState<SystemEvent | null>(null);
  const [processes, setProcesses] = useState<Process[]>([]);
  const [connections, setConnections] = useState<NetworkConnection[]>([]);
  const [events, setEvents] = useState<SystemEvent[]>([]);
  const [files, setFiles] = useState<FileIntegrity[]>([]);
  const [loading, setLoading] = useState(true);
  const [dismissedPids, setDismissedPids] = useState<Set<number>>(new Set());
  const [processView, setProcessView] = useState<'table' | 'tree'>('table');

  // AI State
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [forensicResult, setForensicResult] = useState<string | null>(null);
  const [isForensicLoading, setIsForensicLoading] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [imagePrompt, setImagePrompt] = useState('');

  const fetchData = async () => {
    try {
      const [pRes, cRes, eRes, fRes] = await Promise.all([
        fetch('/api/processes'),
        fetch('/api/network'),
        fetch('/api/events'),
        fetch('/api/integrity')
      ]);

      const pData = await pRes.json();
      const cData = await cRes.json();
      const eData = await eRes.json();
      const fData = await fRes.json();

      setProcesses(pData);
      setConnections(cData);
      setEvents(eData);
      setFiles(fData);

      // Check for new unknown processes to trigger alert
      const unknown = pData.find((p: Process) => p.status === 'unknown' && !dismissedPids.has(p.pid));
      if (unknown && !isAlertOpen) {
        setCurrentAlert({
          id: unknown.pid.toString(),
          timestamp: new Date().toLocaleTimeString(),
          type: 'process',
          message: `Unknown Process Detected: ${unknown.name}`,
          severity: 'high',
          processName: unknown.name
        });
        setIsAlertOpen(true);
      }
    } catch (error) {
      console.error('Failed to fetch system data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAiConsult = async () => {
    setIsAnalyzing(true);
    try {
      const analysis = await analyzeSystemState({ processes, connections, files, events });
      setAiAnalysis(analysis);
    } catch (error) {
      console.error('AI Analysis failed:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleForensicUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'image' | 'video') => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsForensicLoading(true);
    try {
      const result = await analyzeForensicMedia(file, type);
      setForensicResult(result);
    } catch (error) {
      console.error('Forensic analysis failed:', error);
    } finally {
      setIsForensicLoading(false);
    }
  };

  const handleGenerateVisual = async () => {
    setIsGenerating(true);
    try {
      const prompt = imagePrompt || "A malicious process spreading through a network grid";
      const img = await generateThreatVisual(prompt);
      setGeneratedImage(img);
    } catch (error) {
      console.error('Image generation failed:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000); // Poll every 5 seconds
    return () => clearInterval(interval);
  }, []);

  const acknowledgeProcess = async (pid: number, name?: string) => {
    setDismissedPids(prev => {
      const next = new Set(prev);
      next.add(pid);
      return next;
    });
    try {
      await fetch('/api/acknowledge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pid, name })
      });
      setIsAlertOpen(false);
      fetchData();
    } catch (error) {
      console.error('Failed to acknowledge process:', error);
    }
  };

  const killProcess = async (pid: number) => {
    try {
      const res = await fetch('/api/kill', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pid })
      });
      if (res.ok) {
        setIsAlertOpen(false);
        fetchData();
      }
    } catch (error) {
      console.error('Failed to kill process:', error);
    }
  };

  const chartData = useMemo(() => {
    return Array.from({ length: 20 }).map((_, i) => ({
      time: i,
      packets: Math.floor(Math.random() * 100) + 20,
      threats: Math.floor(Math.random() * 5),
    }));
  }, []);

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <div className="crt-overlay" />
      <Header />
      
      <div className="flex flex-1 overflow-hidden">
        <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
        
        <main className="flex-1 overflow-y-auto p-6 bg-[#0A0A0B] relative">
          <div className="scanline" />
          
          <AnimatePresence mode="wait">
            {activeTab === 'overview' && (
              <motion.div 
                key="overview"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {[
                    { label: 'ACTIVE PROCESSES', value: processes.length, icon: Cpu, color: 'text-blue-400' },
                    { label: 'NETWORK CONNS', value: MOCK_CONNECTIONS.length, icon: Network, color: 'text-emerald-400' },
                    { label: 'THREATS BLOCKED', value: '14', icon: Shield, color: 'text-[#00FF41]' },
                    { label: 'SYSTEM INTEGRITY', value: '98%', icon: Lock, color: 'text-orange-400' },
                  ].map((stat, i) => (
                    <div key={i} className="glass-panel p-4 flex items-center gap-4">
                      <div className={cn("p-3 bg-zinc-900 rounded-sm border border-zinc-800", stat.color)}>
                        <stat.icon className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-[10px] text-zinc-500 font-bold tracking-widest">{stat.label}</p>
                        <p className="text-xl font-bold terminal-text">{stat.value}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Charts Section */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="lg:col-span-2 glass-panel p-6">
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="text-xs font-bold tracking-widest flex items-center gap-2">
                        <Activity className="w-4 h-4 text-[#00FF41]" />
                        NETWORK TRAFFIC (PPS)
                      </h3>
                      <div className="flex items-center gap-4 text-[10px]">
                        <div className="flex items-center gap-1.5">
                          <div className="w-2 h-2 rounded-full bg-[#00FF41]" />
                          <span className="text-zinc-500">INBOUND</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <div className="w-2 h-2 rounded-full bg-blue-500" />
                          <span className="text-zinc-500">OUTBOUND</span>
                        </div>
                      </div>
                    </div>
                    <div className="h-[240px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData}>
                          <defs>
                            <linearGradient id="colorPackets" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#00FF41" stopOpacity={0.3}/>
                              <stop offset="95%" stopColor="#00FF41" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="#1A1A1E" vertical={false} />
                          <XAxis dataKey="time" hide />
                          <YAxis stroke="#4A4A4E" fontSize={10} tickLine={false} axisLine={false} />
                          <Tooltip 
                            contentStyle={{ backgroundColor: '#121214', border: '1px solid #2A2A2E', fontSize: '10px' }}
                            itemStyle={{ color: '#00FF41' }}
                          />
                          <Area type="monotone" dataKey="packets" stroke="#00FF41" fillOpacity={1} fill="url(#colorPackets)" />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <div className="glass-panel p-6 flex flex-col">
                    <h3 className="text-xs font-bold tracking-widest flex items-center gap-2 mb-6">
                      <Bell className="w-4 h-4 text-orange-400" />
                      RECENT EVENTS
                    </h3>
                    <div className="flex-1 space-y-4 overflow-y-auto pr-2 custom-scrollbar">
                      {events.length > 0 ? events.map((event) => (
                        <div key={event.id} className="flex gap-3 group">
                          <div className={cn(
                            "w-1 h-auto rounded-full shrink-0",
                            event.severity === 'high' ? 'bg-red-500' : 
                            event.severity === 'medium' ? 'bg-orange-500' : 'bg-blue-500'
                          )} />
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-[10px] text-zinc-500 font-bold">{event.timestamp}</span>
                              <StatusBadge severity={event.severity} />
                            </div>
                            <p className="text-[11px] text-zinc-300 leading-tight group-hover:text-white transition-colors">
                              {event.message}
                            </p>
                          </div>
                        </div>
                      )) : (
                        <p className="text-[10px] text-zinc-600 italic">No security events logged.</p>
                      )}
                    </div>
                    <button className="mt-4 w-full py-2 text-[10px] font-bold text-zinc-500 hover:text-[#00FF41] border border-zinc-800 hover:border-[#00FF41]/30 transition-all uppercase tracking-widest">
                      View Audit Log
                    </button>
                  </div>
                </div>

                {/* Bottom Row: Integrity & Connections */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="glass-panel overflow-hidden">
                    <div className="p-4 border-b border-[#2A2A2E] bg-zinc-900/30 flex items-center justify-between">
                      <h3 className="text-xs font-bold tracking-widest flex items-center gap-2">
                        <Lock className="w-4 h-4 text-blue-400" />
                        FILE INTEGRITY MONITOR
                      </h3>
                      <button className="text-[10px] text-zinc-500 hover:text-white flex items-center gap-1">
                        <RefreshCw className="w-3 h-3" /> RESCAN
                      </button>
                    </div>
                    <div className="p-0">
                      <table className="w-full text-left text-[11px]">
                        <thead>
                          <tr className="text-zinc-500 border-b border-[#2A2A2E]">
                            <th className="px-4 py-3 font-medium uppercase tracking-wider">PATH</th>
                            <th className="px-4 py-3 font-medium uppercase tracking-wider">STATUS</th>
                            <th className="px-4 py-3 font-medium uppercase tracking-wider">LAST CHECK</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#2A2A2E]">
                          {files.map((file, i) => (
                            <tr key={i} className="hover:bg-zinc-800/30 transition-colors">
                              <td className="px-4 py-3 font-mono text-zinc-300 truncate max-w-[150px]" title={file.path}>{file.path}</td>
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-2">
                                  <div className={cn(
                                    "w-1.5 h-1.5 rounded-full",
                                    file.status === 'intact' ? 'bg-emerald-500' : 'bg-red-500 animate-pulse'
                                  )} />
                                  <span className={cn(
                                    "uppercase font-bold",
                                    file.status === 'intact' ? 'text-emerald-500' : 'text-red-500'
                                  )}>{file.status}</span>
                                </div>
                              </td>
                              <td className="px-4 py-3 text-zinc-500">{file.lastChecked}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="glass-panel overflow-hidden">
                    <div className="p-4 border-b border-[#2A2A2E] bg-zinc-900/30 flex items-center justify-between">
                      <h3 className="text-xs font-bold tracking-widest flex items-center gap-2">
                        <Network className="w-4 h-4 text-emerald-400" />
                        ACTIVE CONNECTIONS
                      </h3>
                      <div className="relative">
                        <Search className="w-3.5 h-3.5 absolute left-2 top-1/2 -translate-y-1/2 text-zinc-500" />
                        <input 
                          type="text" 
                          placeholder="FILTER..." 
                          className="bg-zinc-900 border border-zinc-800 rounded-sm pl-7 pr-2 py-1 text-[10px] focus:outline-none focus:border-[#00FF41]/50 w-32"
                        />
                      </div>
                    </div>
                    <div className="p-0">
                      <table className="w-full text-left text-[11px]">
                        <thead>
                          <tr className="text-zinc-500 border-b border-[#2A2A2E]">
                            <th className="px-4 py-3 font-medium uppercase tracking-wider">REMOTE ADDR</th>
                            <th className="px-4 py-3 font-medium uppercase tracking-wider">PORT</th>
                            <th className="px-4 py-3 font-medium uppercase tracking-wider">PROCESS</th>
                            <th className="px-4 py-3 font-medium uppercase tracking-wider">AUTH</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#2A2A2E]">
                          {connections.map((conn, i) => (
                            <tr key={i} className="hover:bg-zinc-800/30 transition-colors">
                              <td className="px-4 py-3 font-mono text-zinc-300">{conn.remoteAddress}</td>
                              <td className="px-4 py-3 text-zinc-400">{conn.localPort}</td>
                              <td className="px-4 py-3 text-zinc-300">{conn.processName}</td>
                              <td className="px-4 py-3">
                                {conn.isAuthorized ? (
                                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                                ) : (
                                  <AlertTriangle className="w-4 h-4 text-red-500 animate-pulse" />
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'processes' && (
              <motion.div 
                key="processes"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="glass-panel overflow-hidden"
              >
                <div className="p-6 border-b border-[#2A2A2E] flex items-center justify-between">
                  <div>
                    <h2 className="text-sm font-bold tracking-widest mb-1">PROCESS MONITOR</h2>
                    <p className="text-[10px] text-zinc-500 uppercase">Real-time behavioral tracking of all system processes</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center bg-zinc-900 border border-zinc-800 rounded-sm p-1">
                      <button 
                        onClick={() => setProcessView('table')}
                        className={cn(
                          "p-1.5 rounded-sm transition-all",
                          processView === 'table' ? "bg-zinc-800 text-[#00FF41]" : "text-zinc-500 hover:text-zinc-300"
                        )}
                        title="Table View"
                      >
                        <LayoutList className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => setProcessView('tree')}
                        className={cn(
                          "p-1.5 rounded-sm transition-all",
                          processView === 'tree' ? "bg-zinc-800 text-[#00FF41]" : "text-zinc-500 hover:text-zinc-300"
                        )}
                        title="Tree View"
                      >
                        <GitGraph className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-zinc-900 border border-zinc-800 rounded-sm">
                      <Search className="w-4 h-4 text-zinc-500" />
                      <input type="text" placeholder="SEARCH PID/NAME..." className="bg-transparent text-xs focus:outline-none w-48" />
                    </div>
                    <button className="p-2 bg-zinc-900 border border-zinc-800 hover:border-[#00FF41]/30 rounded-sm transition-all">
                      <RefreshCw className="w-4 h-4 text-zinc-400" />
                    </button>
                  </div>
                </div>
                
                {processView === 'table' ? (
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="text-zinc-500 border-b border-[#2A2A2E] bg-zinc-900/20">
                        <th className="px-6 py-4 font-bold uppercase tracking-wider">PID</th>
                        <th className="px-6 py-4 font-bold uppercase tracking-wider">NAME</th>
                        <th className="px-6 py-4 font-bold uppercase tracking-wider">USER</th>
                        <th className="px-6 py-4 font-bold uppercase tracking-wider">CPU %</th>
                        <th className="px-6 py-4 font-bold uppercase tracking-wider">MEMORY</th>
                        <th className="px-6 py-4 font-bold uppercase tracking-wider">STATUS</th>
                        <th className="px-6 py-4 font-bold uppercase tracking-wider">ACTIONS</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#2A2A2E]">
                      {processes.map((proc) => (
                        <tr key={proc.id} className="hover:bg-zinc-800/30 transition-colors group">
                          <td className="px-6 py-4 font-mono text-zinc-400">{proc.pid}</td>
                          <td className="px-6 py-4">
                            <div className="flex flex-col">
                              <span className="font-bold text-zinc-200">{proc.name}</span>
                              <span className="text-[10px] text-zinc-600 font-mono truncate max-w-[200px]">{proc.path}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-zinc-400">{proc.user}</td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <div className="w-12 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                                <div className="h-full bg-blue-500" style={{ width: `${proc.cpu * 10}%` }} />
                              </div>
                              <span className="text-[10px] text-zinc-500">{proc.cpu}%</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-zinc-400">{proc.memory}MB</td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <div className={cn(
                                "w-1.5 h-1.5 rounded-full",
                                proc.status === 'recognized' ? 'bg-emerald-500' : 
                                proc.status === 'unknown' ? 'bg-yellow-500' : 'bg-red-500 animate-pulse'
                              )} />
                              <span className={cn(
                                "text-[10px] font-bold uppercase tracking-widest",
                                proc.status === 'recognized' ? 'text-emerald-500' : 
                                proc.status === 'unknown' ? 'text-yellow-500' : 'text-red-500'
                              )}>{proc.status}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button className="p-1.5 hover:bg-zinc-700 rounded-sm text-zinc-400 hover:text-white" title="Inspect">
                                <Info className="w-4 h-4" />
                              </button>
                              <button 
                                onClick={() => killProcess(proc.pid)}
                                className="p-1.5 hover:bg-red-900/30 rounded-sm text-zinc-400 hover:text-red-500" 
                                title="Kill Process"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="p-6">
                    <ProcessTree processes={processes} />
                  </div>
                )}
              </motion.div>
            )}

            {activeTab === 'forensics' && (
              <motion.div 
                key="forensics"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-6"
              >
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* AI Consultant */}
                  <div className="glass-panel p-6 flex flex-col">
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="text-sm font-bold tracking-widest flex items-center gap-2">
                        <BrainCircuit className="w-5 h-5 text-[#00FF41]" />
                        AI SECURITY CONSULTANT
                      </h3>
                      <button 
                        onClick={handleAiConsult}
                        disabled={isAnalyzing}
                        className="px-4 py-1.5 bg-[#00FF41]/10 border border-[#00FF41]/30 text-[#00FF41] text-[10px] font-bold tracking-widest rounded-sm hover:bg-[#00FF41]/20 transition-all disabled:opacity-50"
                      >
                        {isAnalyzing ? 'ANALYZING...' : 'RUN SYSTEM AUDIT'}
                      </button>
                    </div>
                    
                    <div className="flex-1 bg-black/40 border border-zinc-800 rounded-sm p-4 font-mono text-xs overflow-y-auto custom-scrollbar min-h-[300px]">
                      {isAnalyzing ? (
                        <div className="flex flex-col items-center justify-center h-full gap-4 text-zinc-500">
                          <Loader2 className="w-8 h-8 animate-spin text-[#00FF41]" />
                          <p className="animate-pulse">CONSULTING GEMINI INTELLIGENCE...</p>
                        </div>
                      ) : aiAnalysis ? (
                        <div className="space-y-4 text-zinc-300 whitespace-pre-wrap">
                          {aiAnalysis}
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center h-full text-zinc-600 text-center px-8">
                          <Sparkles className="w-12 h-12 mb-4 opacity-20" />
                          <p>Click "RUN SYSTEM AUDIT" to have Gemini analyze your current system state for vulnerabilities.</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Media Forensics */}
                  <div className="glass-panel p-6 flex flex-col">
                    <h3 className="text-sm font-bold tracking-widest flex items-center gap-2 mb-6">
                      <Camera className="w-5 h-5 text-blue-400" />
                      MEDIA FORENSICS (PRO)
                    </h3>
                    
                    <div className="grid grid-cols-2 gap-4 mb-6">
                      <label className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-zinc-800 hover:border-blue-500/50 hover:bg-blue-500/5 transition-all cursor-pointer rounded-sm group">
                        <ImageIcon className="w-8 h-8 text-zinc-600 group-hover:text-blue-400 mb-2" />
                        <span className="text-[10px] text-zinc-500 font-bold uppercase">Upload Image</span>
                        <input type="file" accept="image/*" className="hidden" onChange={(e) => handleForensicUpload(e, 'image')} />
                      </label>
                      <label className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-zinc-800 hover:border-blue-500/50 hover:bg-blue-500/5 transition-all cursor-pointer rounded-sm group">
                        <Video className="w-8 h-8 text-zinc-600 group-hover:text-blue-400 mb-2" />
                        <span className="text-[10px] text-zinc-500 font-bold uppercase">Upload Video</span>
                        <input type="file" accept="video/*" className="hidden" onChange={(e) => handleForensicUpload(e, 'video')} />
                      </label>
                    </div>

                    <div className="flex-1 bg-black/40 border border-zinc-800 rounded-sm p-4 font-mono text-xs overflow-y-auto custom-scrollbar min-h-[200px]">
                      {isForensicLoading ? (
                        <div className="flex flex-col items-center justify-center h-full gap-4 text-zinc-500">
                          <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
                          <p className="animate-pulse">GEMINI PRO ANALYZING MEDIA...</p>
                        </div>
                      ) : forensicResult ? (
                        <div className="text-zinc-300 whitespace-pre-wrap">
                          {forensicResult}
                        </div>
                      ) : (
                        <p className="text-zinc-600 text-center mt-12 italic">Upload a screenshot or recording of suspicious activity for AI-powered forensic analysis.</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Threat Visualization */}
                <div className="glass-panel p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-sm font-bold tracking-widest flex items-center gap-2">
                      <ImageIcon className="w-5 h-5 text-purple-400" />
                      UNFILTERED THREAT VISUALIZER (NANO BANANA)
                    </h3>
                    <div className="flex items-center gap-3">
                      <input 
                        type="text" 
                        value={imagePrompt}
                        onChange={(e) => setImagePrompt(e.target.value)}
                        placeholder="Enter security threat description..."
                        className="bg-black/40 border border-zinc-800 rounded-sm px-3 py-1.5 text-xs text-zinc-300 focus:border-purple-500/50 outline-none w-64"
                      />
                      <button 
                        onClick={handleGenerateVisual}
                        disabled={isGenerating}
                        className="px-4 py-1.5 bg-purple-500/10 border border-purple-500/30 text-purple-400 text-[10px] font-bold tracking-widest rounded-sm hover:bg-purple-500/20 transition-all disabled:opacity-50"
                      >
                        {isGenerating ? 'GENERATING...' : 'VISUALIZE'}
                      </button>
                    </div>
                  </div>
                  
                  <div className="aspect-video lg:aspect-[21/9] bg-black/40 border border-zinc-800 rounded-sm flex items-center justify-center overflow-hidden relative">
                    {isGenerating ? (
                      <div className="flex flex-col items-center gap-4 text-zinc-500">
                        <Loader2 className="w-12 h-12 animate-spin text-purple-400" />
                        <p className="animate-pulse tracking-widest text-[10px]">RENDERING AI VISUALIZATION...</p>
                      </div>
                    ) : generatedImage ? (
                      <img src={generatedImage} alt="Threat Visualization" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      <div className="text-center px-12">
                        <Sparkles className="w-16 h-16 text-zinc-800 mx-auto mb-4" />
                        <p className="text-zinc-600 text-xs italic">Generate a visual representation of any security threat using Gemini Flash Image.</p>
                      </div>
                    )}
                    <div className="absolute bottom-4 right-4 bg-black/80 border border-zinc-800 px-3 py-1 rounded-sm text-[8px] text-zinc-500 font-bold tracking-widest uppercase">
                      Forensic Mode: High Latitude
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
            {activeTab === 'terminal' && (
              <motion.div 
                key="terminal"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                className="h-full glass-panel bg-black/40 flex flex-col font-mono text-sm p-6"
              >
                <div className="flex items-center gap-2 mb-4 text-zinc-500 border-b border-zinc-800 pb-2">
                  <Terminal className="w-4 h-4" />
                  <span className="text-[10px] font-bold tracking-widest uppercase">OMC_SHELL v1.0</span>
                </div>
                <div className="flex-1 overflow-y-auto space-y-2 mb-4 custom-scrollbar">
                  <p className="text-zinc-500 italic"># One Man Computer Security Shell initialized.</p>
                  <p className="text-zinc-500 italic"># Type 'help' for available commands.</p>
                  <div className="flex gap-2">
                    <span className="text-[#00FF41]">omc@operator:~$</span>
                    <span className="text-white">omc --status</span>
                  </div>
                  <div className="pl-4 space-y-1 text-zinc-400">
                    <p>[+] Behavioral engine: ACTIVE</p>
                    <p>[+] Network listener: ATTACHED (eth0)</p>
                    <p>[+] File integrity: MONITORING (642 files)</p>
                    <p>[+] Privilege guard: ENABLED</p>
                  </div>
                  <div className="flex gap-2">
                    <span className="text-[#00FF41]">omc@operator:~$</span>
                    <span className="animate-pulse">_</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[#00FF41]">omc@operator:~$</span>
                  <input 
                    type="text" 
                    className="flex-1 bg-transparent border-none focus:ring-0 p-0 text-white outline-none"
                    autoFocus
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>

      <AlertModal 
        isOpen={isAlertOpen} 
        onClose={() => setIsAlertOpen(false)} 
        event={currentAlert} 
        onAcknowledge={acknowledgeProcess}
        onKill={killProcess}
      />

      {/* Footer Info */}
      <footer className="h-8 border-t border-[#2A2A2E] bg-[#0D0D0F] flex items-center justify-between px-6 text-[9px] text-zinc-600 font-bold tracking-widest">
        <div className="flex items-center gap-4">
          <span>UPTIME: 14:22:05</span>
          <span>SENSORS: 12/12 ACTIVE</span>
          <span>LAST SCAN: 02:15:45</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-[#00FF41]/50">ENCRYPTION: AES-256-GCM</span>
          <span>LOCAL_MODE: ENABLED</span>
        </div>
      </footer>
    </div>
  );
}
