import React, { useState, useEffect, useMemo, Component, ReactNode, ErrorInfo } from 'react';
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
  LayoutList,
  MessageSquare,
  LogOut,
  Send,
  Zap,
  Maximize2
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
import { 
  analyzeSystemState, 
  generateChatResponse, 
  analyzeMedia, 
  generateHighQualityImage, 
  editOrCreateImage 
} from './services/gemini';
import { auth, db, signInWithGoogle, logout } from './firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { collection, addDoc, query, where, orderBy, onSnapshot, serverTimestamp } from 'firebase/firestore';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public props: ErrorBoundaryProps;
  public state: ErrorBoundaryState = {
    hasError: false,
    error: null
  };

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.props = props;
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary caught an error", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      let errorMessage = "An unexpected error occurred.";
      try {
        const parsed = JSON.parse(this.state.error?.message || "");
        if (parsed.error) errorMessage = `Firestore Error: ${parsed.error} (${parsed.operationType} on ${parsed.path})`;
      } catch (e) {
        errorMessage = this.state.error?.message || errorMessage;
      }

      return (
        <div className="min-h-screen bg-[#050505] flex items-center justify-center p-6 relative overflow-hidden">
          <div className="crt-overlay" />
          <div className="scanline" />
          <div className="glass-panel p-8 max-w-md w-full border-red-500/30 text-center relative z-10">
            <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-white mb-2 uppercase tracking-widest">System Failure</h2>
            <p className="text-zinc-400 text-sm mb-6 leading-relaxed">
              {errorMessage}
            </p>
            <button 
              onClick={() => window.location.reload()}
              className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold tracking-widest transition-colors rounded-sm"
            >
              REBOOT SYSTEM
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

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

const Header = ({ user }: { user: User | null }) => (
  <header className="h-16 border-b border-[#1A1A1C] bg-[#0D0D0F] flex items-center justify-between px-6 sticky top-0 z-50">
    <div className="flex items-center gap-3">
      <div className="w-10 h-10 bg-[#C5A059]/10 rounded-sm flex items-center justify-center border border-[#C5A059]/20">
        <Shield className="w-6 h-6 text-[#C5A059]" />
      </div>
      <div>
        <h1 className="text-lg font-bold tracking-tighter terminal-text uppercase">Context Forge v2.0.0</h1>
        <p className="text-[10px] text-zinc-500 uppercase tracking-[0.2em]">Neural Context Orchestration Platform</p>
      </div>
    </div>
    
    <div className="flex items-center gap-6">
      <div className="flex items-center gap-4 text-[10px] text-zinc-400">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-[#C5A059] animate-pulse" />
          <span>NEURAL: ACTIVE</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-[#C5A059]" />
          <span>VAULT: SECURE</span>
        </div>
      </div>
      <div className="h-8 w-px bg-zinc-800" />
      <div className="flex items-center gap-3">
        {user && (
          <div className="flex items-center gap-3 mr-2">
            <img src={user.photoURL || ''} alt="" className="w-8 h-8 rounded-full border border-[#C5A059]/30" />
            <div className="hidden md:block text-right">
              <p className="text-[10px] font-bold text-zinc-200 uppercase">{user.displayName}</p>
              <button onClick={logout} className="text-[9px] text-[#C5A059] hover:underline uppercase tracking-widest">Disconnect</button>
            </div>
          </div>
        )}
        <button className="p-2 hover:bg-zinc-800 rounded-sm transition-colors relative">
          <Bell className="w-5 h-5 text-zinc-400" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#C5A059] rounded-full border-2 border-[#0D0D0F]" />
        </button>
        <button className="p-2 hover:bg-zinc-800 rounded-sm transition-colors">
          <Settings className="w-5 h-5 text-zinc-400" />
        </button>
      </div>
    </div>
  </header>
);

const Sidebar = ({ activeTab, setActiveTab, user }: { activeTab: string, setActiveTab: (t: string) => void, user: User | null }) => {
  const menuItems = [
    { id: 'overview', icon: Activity, label: 'OVERVIEW' },
    { id: 'processes', icon: Cpu, label: 'PROCESSES' },
    { id: 'network', icon: Network, label: 'NETWORK' },
    { id: 'files', icon: FileWarning, label: 'INTEGRITY' },
    { id: 'chat', icon: MessageSquare, label: 'NEURAL CHAT' },
    { id: 'forensics', icon: BrainCircuit, label: 'AI FORENSICS' },
    { id: 'terminal', icon: Terminal, label: 'TERMINAL' },
  ];

  return (
    <aside className="w-64 border-r border-[#1A1A1C] bg-[#0D0D0F] flex flex-col">
      <nav className="flex-1 p-4 space-y-1">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-3 text-xs font-bold tracking-widest transition-all duration-200 group",
              activeTab === item.id 
                ? "bg-[#C5A059]/10 text-[#C5A059] border-l-2 border-[#C5A059]" 
                : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50"
            )}
          >
            <item.icon className={cn("w-4 h-4", activeTab === item.id ? "text-[#C5A059]" : "text-zinc-500 group-hover:text-zinc-300")} />
            {item.label}
          </button>
        ))}
      </nav>
      
      <div className="p-6 border-t border-[#1A1A1C]">
        <div className="glass-panel p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-zinc-500 uppercase">Neural Load</span>
            <span className="text-[10px] text-[#C5A059]">24%</span>
          </div>
          <div className="h-1 bg-zinc-800 rounded-full overflow-hidden">
            <div className="h-full bg-[#C5A059] w-[24%]" />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-zinc-500 uppercase">Context Depth</span>
            <span className="text-[10px] text-[#C5A059]">8.4K</span>
          </div>
          <div className="h-1 bg-zinc-800 rounded-full overflow-hidden">
            <div className="h-full bg-[#C5A059] w-[65%]" />
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
  const [user, setUser] = useState<User | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
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
  const [imageSize, setImageSize] = useState<'1K' | '2K' | '4K'>('1K');

  // Chat State
  const [chatInput, setChatInput] = useState('');
  const [chatHistory, setChatHistory] = useState<{ role: 'user' | 'model', content: string }[]>([]);
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [useThinking, setUseThinking] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setIsAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;

    // Fetch chat history from Firestore
    const q = query(
      collection(db, 'chat_messages'),
      where('userId', '==', user.uid),
      orderBy('timestamp', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const messages = snapshot.docs.map(doc => ({
        role: doc.data().role as 'user' | 'model',
        content: doc.data().text || doc.data().content
      }));
      setChatHistory(messages);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'chat_messages');
    });

    return () => unsubscribe();
  }, [user]);

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

  const handleChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || !user) return;

    const userMessage = chatInput;
    setChatInput('');
    setIsChatLoading(true);

    try {
      // Save user message to Firestore
      await addDoc(collection(db, 'chat_messages'), {
        userId: user.uid,
        role: 'user',
        content: userMessage,
        timestamp: serverTimestamp()
      });

      const messages = [...chatHistory, { role: 'user', content: userMessage }];
      const response = await generateChatResponse(messages, 'general', useThinking);
      
      setChatHistory(prev => [...prev, { role: 'user', content: userMessage }, { role: 'model', content: response }]);
    } catch (error) {
      console.error('Chat failed:', error);
      if (error instanceof Error && error.message.includes('permission-denied')) {
        handleFirestoreError(error, OperationType.WRITE, 'chat_messages');
      }
    } finally {
      setIsChatLoading(false);
    }
  };

  const handleForensicUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'image' | 'video') => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsForensicLoading(true);
    try {
      const result = await analyzeMedia(file, type, `Analyze this ${type} for security threats, anomalies, or hidden data. Provide a detailed forensic report.`);
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
      const img = await generateHighQualityImage(prompt, imageSize);
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

  if (isAuthLoading) {
    return (
      <div className="h-screen bg-[#050505] flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-[#C5A059]" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="h-screen bg-[#050505] flex flex-col items-center justify-center p-6 relative overflow-hidden">
        <div className="crt-overlay" />
        <div className="scanline" />
        
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md glass-panel p-8 text-center space-y-8 relative z-10"
        >
          <div className="flex justify-center">
            <div className="w-20 h-20 bg-[#C5A059]/10 rounded-sm flex items-center justify-center border border-[#C5A059]/20">
              <Shield className="w-12 h-12 text-[#C5A059]" />
            </div>
          </div>
          
          <div>
            <h1 className="text-2xl font-bold tracking-tighter terminal-text uppercase mb-2">Context Forge</h1>
            <p className="text-xs text-zinc-500 uppercase tracking-[0.2em]">Neural Context Orchestration Platform</p>
          </div>

          <div className="space-y-4">
            <p className="text-xs text-zinc-400 leading-relaxed">
              Access restricted to authorized operators. Neural bridging requires biometric synchronization.
            </p>
            <button 
              onClick={signInWithGoogle}
              className="w-full py-4 bg-[#C5A059] hover:bg-[#D4AF37] text-black text-xs font-bold tracking-[0.2em] transition-all rounded-sm flex items-center justify-center gap-3"
            >
              <UserCheck className="w-4 h-4" />
              INITIALIZE NEURAL LINK
            </button>
          </div>

          <div className="pt-4 border-t border-zinc-800/50">
            <p className="text-[9px] text-zinc-600 uppercase tracking-widest">Secure Protocol v2.0.4 // encrypted_session_active</p>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="flex flex-col h-screen overflow-hidden">
      <div className="crt-overlay" />
      <Header user={user} />
      
      <div className="flex flex-1 overflow-hidden">
        <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} user={user} />
        
        <main className="flex-1 overflow-y-auto p-6 bg-[#050505] relative">
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
                      { label: 'THREATS BLOCKED', value: '14', icon: Shield, color: 'text-[#C5A059]' },
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
                        <Activity className="w-4 h-4 text-[#C5A059]" />
                        NETWORK TRAFFIC (PPS)
                      </h3>
                      <div className="flex items-center gap-4 text-[10px]">
                        <div className="flex items-center gap-1.5">
                          <div className="w-2 h-2 rounded-full bg-[#C5A059]" />
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
                              <stop offset="5%" stopColor="#C5A059" stopOpacity={0.3}/>
                              <stop offset="95%" stopColor="#C5A059" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="#1A1A1E" vertical={false} />
                          <XAxis dataKey="time" hide />
                          <YAxis stroke="#4A4A4E" fontSize={10} tickLine={false} axisLine={false} />
                          <Tooltip 
                            contentStyle={{ backgroundColor: '#121214', border: '1px solid #1A1A1C', fontSize: '10px' }}
                            itemStyle={{ color: '#C5A059' }}
                          />
                          <Area type="monotone" dataKey="packets" stroke="#C5A059" fillOpacity={1} fill="url(#colorPackets)" />
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
                    <button className="mt-4 w-full py-2 text-[10px] font-bold text-zinc-500 hover:text-[#C5A059] border border-zinc-800 hover:border-[#C5A059]/30 transition-all uppercase tracking-widest">
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
                          <tr className="text-zinc-500 border-b border-[#1A1A1C]">
                            <th className="px-4 py-3 font-medium uppercase tracking-wider">PATH</th>
                            <th className="px-4 py-3 font-medium uppercase tracking-wider">STATUS</th>
                            <th className="px-4 py-3 font-medium uppercase tracking-wider">LAST CHECK</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#1A1A1C]">
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
                    <div className="p-4 border-b border-[#1A1A1C] bg-zinc-900/30 flex items-center justify-between">
                      <h3 className="text-xs font-bold tracking-widest flex items-center gap-2">
                        <Network className="w-4 h-4 text-emerald-400" />
                        ACTIVE CONNECTIONS
                      </h3>
                      <div className="relative">
                        <Search className="w-3.5 h-3.5 absolute left-2 top-1/2 -translate-y-1/2 text-zinc-500" />
                        <input 
                          type="text" 
                          placeholder="FILTER..." 
                          className="bg-zinc-900 border border-zinc-800 rounded-sm pl-7 pr-2 py-1 text-[10px] focus:outline-none focus:border-[#C5A059]/50 w-32"
                        />
                      </div>
                    </div>
                    <div className="p-0">
                      <table className="w-full text-left text-[11px]">
                        <thead>
                          <tr className="text-zinc-500 border-b border-[#1A1A1C]">
                            <th className="px-4 py-3 font-medium uppercase tracking-wider">REMOTE ADDR</th>
                            <th className="px-4 py-3 font-medium uppercase tracking-wider">PORT</th>
                            <th className="px-4 py-3 font-medium uppercase tracking-wider">PROCESS</th>
                            <th className="px-4 py-3 font-medium uppercase tracking-wider">AUTH</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#1A1A1C]">
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

            {activeTab === 'chat' && (
              <motion.div 
                key="chat"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                className="h-full flex flex-col glass-panel overflow-hidden"
              >
                <div className="p-6 border-b border-[#1A1A1C] flex items-center justify-between bg-zinc-900/20">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-[#C5A059]/10 rounded-sm border border-[#C5A059]/20">
                      <MessageSquare className="w-5 h-5 text-[#C5A059]" />
                    </div>
                    <div>
                      <h2 className="text-sm font-bold tracking-widest uppercase">Neural Chat Interface</h2>
                      <p className="text-[10px] text-zinc-500 uppercase tracking-widest">Multi-turn Context Orchestration</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <button 
                      onClick={() => setUseThinking(!useThinking)}
                      className={cn(
                        "flex items-center gap-2 px-3 py-1.5 rounded-sm border text-[10px] font-bold transition-all",
                        useThinking 
                          ? "bg-[#C5A059]/20 border-[#C5A059] text-[#C5A059]" 
                          : "bg-zinc-900 border-zinc-800 text-zinc-500 hover:text-zinc-300"
                      )}
                    >
                      <Zap className={cn("w-3.5 h-3.5", useThinking && "fill-[#C5A059]")} />
                      HIGH-THINKING MODE
                    </button>
                    <button 
                      onClick={() => setChatHistory([])}
                      className="text-[10px] text-zinc-500 hover:text-white uppercase tracking-widest"
                    >
                      Clear Session
                    </button>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar bg-black/20">
                  {chatHistory.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center space-y-4 opacity-30">
                      <BrainCircuit className="w-16 h-16 text-[#C5A059]" />
                      <div className="max-w-xs">
                        <p className="text-xs font-bold uppercase tracking-widest mb-2">Neural Link Ready</p>
                        <p className="text-[10px] leading-relaxed uppercase">Initialize conversation to begin context orchestration. System persona: Context Forge AI.</p>
                      </div>
                    </div>
                  ) : (
                    chatHistory.map((msg, i) => (
                      <div key={i} className={cn("flex flex-col", msg.role === 'user' ? "items-end" : "items-start")}>
                        <div className={cn(
                          "max-w-[80%] p-4 rounded-sm text-xs leading-relaxed",
                          msg.role === 'user' 
                            ? "bg-[#C5A059]/10 border border-[#C5A059]/20 text-zinc-200" 
                            : "bg-zinc-900/80 border border-zinc-800 text-zinc-300"
                        )}>
                          <div className="flex items-center gap-2 mb-2 opacity-50">
                            {msg.role === 'user' ? <UserCheck className="w-3 h-3" /> : <Sparkles className="w-3 h-3" />}
                            <span className="text-[9px] font-bold uppercase tracking-widest">{msg.role === 'user' ? 'Operator' : 'Context Forge AI'}</span>
                          </div>
                          <div className="whitespace-pre-wrap">{msg.content}</div>
                        </div>
                      </div>
                    ))
                  )}
                  {isChatLoading && (
                    <div className="flex flex-col items-start">
                      <div className="bg-zinc-900/80 border border-zinc-800 p-4 rounded-sm">
                        <div className="flex items-center gap-2 text-[#C5A059] animate-pulse">
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span className="text-[10px] font-bold uppercase tracking-widest">Processing Neural Context...</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <form onSubmit={handleChatSubmit} className="p-6 border-t border-[#1A1A1C] bg-zinc-900/20">
                  <div className="relative">
                    <input 
                      type="text" 
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      placeholder="Enter command or query..."
                      className="w-full bg-black/40 border border-zinc-800 rounded-sm pl-4 pr-12 py-4 text-xs text-zinc-200 focus:border-[#C5A059]/50 outline-none transition-all"
                    />
                    <button 
                      type="submit"
                      disabled={isChatLoading || !chatInput.trim()}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-[#C5A059] hover:bg-[#C5A059]/10 rounded-sm transition-all disabled:opacity-30"
                    >
                      <Send className="w-5 h-5" />
                    </button>
                  </div>
                </form>
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
                        <BrainCircuit className="w-5 h-5 text-[#C5A059]" />
                        AI SECURITY CONSULTANT
                      </h3>
                      <button 
                        onClick={handleAiConsult}
                        disabled={isAnalyzing}
                        className="px-4 py-1.5 bg-[#C5A059]/10 border border-[#C5A059]/30 text-[#C5A059] text-[10px] font-bold tracking-widest rounded-sm hover:bg-[#C5A059]/20 transition-all disabled:opacity-50"
                      >
                        {isAnalyzing ? 'ANALYZING...' : 'RUN SYSTEM AUDIT'}
                      </button>
                    </div>
                    
                    <div className="flex-1 bg-black/40 border border-zinc-800 rounded-sm p-4 font-mono text-xs overflow-y-auto custom-scrollbar min-h-[300px]">
                      {isAnalyzing ? (
                        <div className="flex flex-col items-center justify-center h-full gap-4 text-zinc-500">
                          <Loader2 className="w-8 h-8 animate-spin text-[#C5A059]" />
                          <p className="animate-pulse uppercase tracking-widest">Consulting Neural Core...</p>
                        </div>
                      ) : aiAnalysis ? (
                        <div className="space-y-4 text-zinc-300 whitespace-pre-wrap">
                          {aiAnalysis}
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center h-full text-zinc-600 text-center px-8">
                          <Sparkles className="w-12 h-12 mb-4 opacity-20" />
                          <p className="uppercase tracking-widest text-[10px]">Initialize system audit to analyze current neural state.</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Media Forensics */}
                  <div className="glass-panel p-6 flex flex-col">
                    <h3 className="text-sm font-bold tracking-widest flex items-center gap-2 mb-6">
                      <Camera className="w-5 h-5 text-blue-400" />
                      NEURAL MEDIA FORENSICS
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
                          <p className="animate-pulse uppercase tracking-widest">Analyzing Media Stream...</p>
                        </div>
                      ) : forensicResult ? (
                        <div className="text-zinc-300 whitespace-pre-wrap">
                          {forensicResult}
                        </div>
                      ) : (
                        <p className="text-zinc-600 text-center mt-12 italic text-[10px] uppercase tracking-widest">Upload suspicious media for neural analysis.</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Threat Visualization */}
                <div className="glass-panel p-6">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                    <h3 className="text-sm font-bold tracking-widest flex items-center gap-2">
                      <ImageIcon className="w-5 h-5 text-purple-400" />
                      HIGH-FIDELITY THREAT VISUALIZER
                    </h3>
                    <div className="flex flex-wrap items-center gap-3">
                      <div className="flex items-center bg-black/40 border border-zinc-800 rounded-sm p-1">
                        {(['1K', '2K', '4K'] as const).map((size) => (
                          <button
                            key={size}
                            onClick={() => setImageSize(size)}
                            className={cn(
                              "px-3 py-1 text-[9px] font-bold rounded-sm transition-all",
                              imageSize === size ? "bg-[#C5A059] text-black" : "text-zinc-500 hover:text-zinc-300"
                            )}
                          >
                            {size}
                          </button>
                        ))}
                      </div>
                      <input 
                        type="text" 
                        value={imagePrompt}
                        onChange={(e) => setImagePrompt(e.target.value)}
                        placeholder="Enter threat description..."
                        className="bg-black/40 border border-zinc-800 rounded-sm px-3 py-1.5 text-xs text-zinc-300 focus:border-[#C5A059]/50 outline-none w-64"
                      />
                      <button 
                        onClick={handleGenerateVisual}
                        disabled={isGenerating}
                        className="px-4 py-1.5 bg-purple-500/10 border border-purple-500/30 text-purple-400 text-[10px] font-bold tracking-widest rounded-sm hover:bg-purple-500/20 transition-all disabled:opacity-50 flex items-center gap-2"
                      >
                        {isGenerating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                        GENERATE
                      </button>
                    </div>
                  </div>

                  <div className="aspect-video bg-black/40 border border-zinc-800 rounded-sm overflow-hidden relative group">
                    {isGenerating ? (
                      <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-black/60 backdrop-blur-sm z-10">
                        <Loader2 className="w-12 h-12 animate-spin text-purple-400" />
                        <div className="text-center">
                          <p className="text-xs font-bold text-purple-400 animate-pulse uppercase tracking-widest">Synthesizing Neural Imagery...</p>
                          <p className="text-[10px] text-zinc-500 mt-1 uppercase">Resolution: {imageSize}</p>
                        </div>
                      </div>
                    ) : generatedImage ? (
                      <>
                        <img src={generatedImage} alt="Threat Visual" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                          <button className="p-3 bg-white/10 hover:bg-white/20 rounded-full backdrop-blur-md transition-all border border-white/20">
                            <Maximize2 className="w-6 h-6 text-white" />
                          </button>
                        </div>
                      </>
                    ) : (
                      <div className="absolute inset-0 flex flex-col items-center justify-center text-zinc-600">
                        <ImageIcon className="w-16 h-16 mb-4 opacity-10" />
                        <p className="text-[10px] uppercase tracking-widest">No visual data synthesized</p>
                      </div>
                    )}
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
                  <span className="text-[10px] font-bold tracking-widest uppercase">FORGE_SHELL v2.0</span>
                </div>
                <div className="flex-1 overflow-y-auto space-y-2 mb-4 custom-scrollbar">
                  <p className="text-zinc-500 italic"># Context Forge Neural Shell initialized.</p>
                  <p className="text-zinc-500 italic"># Neural link established with operator: {user.displayName}</p>
                  <div className="flex gap-2">
                    <span className="text-[#C5A059]">forge@operator:~$</span>
                    <span className="text-white">forge --status</span>
                  </div>
                  <div className="pl-4 space-y-1 text-zinc-400">
                    <p>[+] Neural bridging: ACTIVE</p>
                    <p>[+] Context depth: 8.4K tokens</p>
                    <p>[+] Steganographic vault: LOCKED</p>
                    <p>[+] Multi-modal sync: READY</p>
                  </div>
                  <div className="flex gap-2">
                    <span className="text-[#C5A059]">forge@operator:~$</span>
                    <span className="animate-pulse">_</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[#C5A059]">forge@operator:~$</span>
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
      <footer className="h-8 border-t border-[#1A1A1C] bg-[#0D0D0F] flex items-center justify-between px-6 text-[9px] text-zinc-600 font-bold tracking-widest">
        <div className="flex items-center gap-4">
          <span>UPTIME: 14:22:05</span>
          <span>NEURAL CORES: 128/128 ACTIVE</span>
          <span>CONTEXT SYNC: 100%</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-[#C5A059]/50">ENCRYPTION: NEURAL-256-GCM</span>
          <span>OPERATOR: {user.displayName?.toUpperCase()}</span>
        </div>
      </footer>
    </div>
    </ErrorBoundary>
  );
}
