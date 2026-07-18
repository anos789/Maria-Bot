import React, { useState, useEffect, useRef } from 'react';
import { MEXCConfig, TradePosition, RewardTransferLog, BotLog } from './types';
import { 
  Cpu, 
  Wallet, 
  TrendingUp, 
  TrendingDown, 
  RefreshCw, 
  Settings, 
  Terminal, 
  Copy, 
  Check, 
  ShieldAlert, 
  ShieldCheck, 
  Layers, 
  Zap, 
  BookOpen, 
  Lock, 
  Smartphone, 
  DollarSign, 
  History,
  AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function App() {
  const [activeTab, setActiveTab] = useState<'trading' | 'rewards' | 'build' | 'settings'>('trading');
  const [mexcConfig, setMexcConfig] = useState<MEXCConfig>({
    apiKey: '',
    apiSecret: '',
    isSandbox: true,
    autoTransferRewards: true,
    leverage: 20,
    eventDurationMinutes: 10
  });

  // State loaded from API
  const [spotBalance, setSpotBalance] = useState({ USDT: 450.75, BTC: 0.0 });
  const [futuresBalance, setFuturesBalance] = useState({ USDT: 1250.0, BTC: 0.05 });
  const [btcPrice, setBtcPrice] = useState(64250.0);
  const [priceHistory, setPriceHistory] = useState<number[]>([64210, 64230, 64220, 64245, 64235, 64250]);
  const [activePositions, setActivePositions] = useState<TradePosition[]>([]);
  const [closedPositions, setClosedPositions] = useState<TradePosition[]>([]);
  const [rewardLogs, setRewardLogs] = useState<RewardTransferLog[]>([]);
  const [botLogs, setBotLogs] = useState<BotLog[]>([]);

  // Trading Input State
  const [orderAmount, setOrderAmount] = useState<string>('50');
  const [customKeyInput, setCustomKeyInput] = useState({ apiKey: '', apiSecret: '' });

  // GitHub Actions Builder Input State
  const [gitBranch, setGitBranch] = useState('main');
  const [appName, setAppName] = useState('MariaBot');
  const [packageName, setPackageName] = useState('com.mexc.mariabot');
  const [keystorePass, setKeystorePass] = useState('malek-321');
  const [keystoreAlias, setKeystoreAlias] = useState('upload');
  const [actionsYaml, setActionsYaml] = useState('');
  const [copiedYaml, setCopiedYaml] = useState(false);

  // Command generator tool state (for Keystore conversion)
  const [copiedCmd, setCopiedCmd] = useState<string | null>(null);

  // Poll intervals
  useEffect(() => {
    fetchState();
    fetchConfig();
    generateYaml();

    const interval = setInterval(() => {
      fetchState();
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  // Sync price chart historical trends
  useEffect(() => {
    setPriceHistory(prev => {
      const updated = [...prev, btcPrice];
      if (updated.length > 20) updated.shift();
      return updated;
    });
  }, [btcPrice]);

  const fetchState = async () => {
    try {
      const res = await fetch('/api/mexc/state');
      if (res.ok) {
        const data = await res.json();
        setSpotBalance(data.balances.spot);
        setFuturesBalance(data.balances.futures);
        setBtcPrice(data.price);
        setActivePositions(data.activePositions);
        setClosedPositions(data.closedPositions);
        setRewardLogs(data.rewardLogs);
        setBotLogs(data.logs);
      }
    } catch (e) {
      console.error("Failed to fetch state", e);
    }
  };

  const fetchConfig = async () => {
    try {
      const res = await fetch('/api/mexc/config');
      if (res.ok) {
        const data = await res.json();
        setMexcConfig(data);
      }
    } catch (e) {
      console.error("Failed to fetch config", e);
    }
  };

  const handleUpdateConfig = async (newConfig: Partial<MEXCConfig>) => {
    try {
      const res = await fetch('/api/mexc/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...mexcConfig, ...newConfig })
      });
      if (res.ok) {
        const data = await res.json();
        setMexcConfig(data.config);
        fetchState();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const executeOrder = async (type: 'LONG' | 'SHORT') => {
    try {
      const res = await fetch('/api/mexc/order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, amount: parseFloat(orderAmount) })
      });
      if (!res.ok) {
        const err = await res.json();
        alert(`فشل فتح الصفقة: ${err.error}`);
      }
      fetchState();
    } catch (e) {
      console.error(e);
    }
  };

  const closePosition = async (id: string) => {
    try {
      const res = await fetch('/api/mexc/close-position', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      });
      fetchState();
    } catch (e) {
      console.error(e);
    }
  };

  const triggerManualTransfer = async () => {
    try {
      const res = await fetch('/api/mexc/transfer-rewards', { method: 'POST' });
      if (!res.ok) {
        const err = await res.json();
        alert(err.error);
      }
      fetchState();
    } catch (e) {
      console.error(e);
    }
  };

  const resetBalances = async () => {
    try {
      await fetch('/api/mexc/reset-demo', { method: 'POST' });
      fetchState();
    } catch (e) {
      console.error(e);
    }
  };

  const generateYaml = async () => {
    try {
      const res = await fetch('/api/config/generate-yaml', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          branch: gitBranch,
          appName,
          packageName,
          customKeystorePassword: keystorePass,
          customKeystoreAlias: keystoreAlias
        })
      });
      if (res.ok) {
        const data = await res.json();
        setActionsYaml(data.yaml);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Re-generate YAML when inputs change
  useEffect(() => {
    generateYaml();
  }, [gitBranch, appName, packageName, keystorePass, keystoreAlias]);

  const copyToClipboard = (text: string, type: 'yaml' | 'cmd_jks' | 'cmd_base64') => {
    navigator.clipboard.writeText(text);
    if (type === 'yaml') {
      setCopiedYaml(true);
      setTimeout(() => setCopiedYaml(false), 2000);
    } else {
      setCopiedCmd(type);
      setTimeout(() => setCopiedCmd(null), 2000);
    }
  };

  return (
    <div className="min-h-screen bg-[#090b0e] text-[#e2e8f0] font-sans selection:bg-emerald-500/30 selection:text-white" dir="rtl">
      
      {/* Decorative LED Cybertop line */}
      <div className="h-1 w-full bg-gradient-to-l from-emerald-500 via-teal-400 to-emerald-950 animate-pulse shadow-[0_0_15px_rgba(16,185,129,0.5)]" />

      {/* Main Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        
        {/* Futuristic Dashboard Header */}
        <header className="bg-[#0f131a] border border-stone-800/80 rounded-2xl p-5 flex flex-col md:flex-row items-center justify-between gap-4 shadow-xl relative overflow-hidden">
          {/* Subtle grid pattern inside header */}
          <div className="absolute inset-0 bg-[radial-gradient(#10b981_1px,transparent_1px)] [background-size:16px_16px] opacity-5 pointer-events-none" />
          
          <div className="flex items-center gap-4 relative z-10 w-full md:w-auto">
            <div className="p-3 bg-emerald-950/80 text-emerald-400 border border-emerald-500/30 rounded-2xl shadow-lg shadow-emerald-500/5 animate-pulse">
              <Cpu className="w-8 h-8" />
            </div>
            <div className="text-right">
              <div className="flex items-center gap-2">
                <h1 className="text-xl md:text-2xl font-black text-white tracking-wide">تطبيق مارية (Maria-Bot)</h1>
                <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full font-bold">
                  إصدار الأجهزة LT_9904
                </span>
              </div>
              <p className="text-xs text-stone-400 font-medium mt-1">
                لوحة التحكم الذكية لتداول عقود أحداث MEXC وتصميم سير البناء التلقائي
              </p>
            </div>
          </div>

          {/* Quick Stats bar */}
          <div className="flex flex-wrap items-center gap-4 w-full md:w-auto justify-end">
            {/* Device Info */}
            <div className="bg-[#141b24] border border-stone-800/80 px-4 py-2 rounded-xl text-right min-w-[140px]">
              <div className="flex items-center gap-1.5 justify-end">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                <span className="text-[10px] text-stone-400 font-bold uppercase">بيئة الهاتف</span>
              </div>
              <p className="text-xs font-bold text-white mt-0.5 flex items-center gap-1 justify-end">
                <Smartphone className="w-3.5 h-3.5 text-stone-400" />
                <span>LT_9904 (أندرويد 15)</span>
              </p>
            </div>

            {/* Price Indicator */}
            <div className="bg-[#141b24] border border-stone-800/80 px-4 py-2 rounded-xl text-right min-w-[140px]">
              <span className="text-[10px] text-stone-400 font-bold block">مؤشر حدث BTCUSDT</span>
              <p className="text-xs font-mono font-bold text-emerald-400 mt-0.5">
                ${btcPrice.toLocaleString()} USDT
              </p>
            </div>

            {/* Sandbox status */}
            <div className="bg-[#141b24] border border-stone-800/80 px-4 py-2 rounded-xl text-right min-w-[120px]">
              <span className="text-[10px] text-stone-400 font-bold block">حالة الاتصال بـ MEXC</span>
              <p className="text-xs font-bold text-amber-400 mt-0.5 flex items-center justify-end gap-1">
                {mexcConfig.isSandbox ? (
                  <>
                    <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
                    <span>محاكاة تجريبية</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span className="text-emerald-400">اتصال حي حقيقي</span>
                  </>
                )}
              </p>
            </div>
          </div>
        </header>

        {/* Navigation Tabs */}
        <nav className="flex flex-wrap items-center gap-2 p-1.5 bg-[#0f131a] rounded-xl border border-stone-800/60 max-w-fit">
          <button
            onClick={() => setActiveTab('trading')}
            className={`px-5 py-2.5 rounded-lg text-xs md:text-sm font-bold tracking-wide transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'trading'
                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/10'
                : 'text-stone-400 hover:text-white hover:bg-stone-800/30'
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            <span>لوحة التداول والتحليل</span>
          </button>

          <button
            onClick={() => setActiveTab('rewards')}
            className={`px-5 py-2.5 rounded-lg text-xs md:text-sm font-bold tracking-wide transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'rewards'
                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/10'
                : 'text-stone-400 hover:text-white hover:bg-stone-800/30'
            }`}
          >
            <Wallet className="w-4 h-4" />
            <span>توريد المكافآت التلقائي</span>
          </button>

          <button
            onClick={() => setActiveTab('build')}
            className={`px-5 py-2.5 rounded-lg text-xs md:text-sm font-bold tracking-wide transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'build'
                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/10'
                : 'text-stone-400 hover:text-white hover:bg-stone-800/30'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>مولد GitHub Actions لـ أندرويد</span>
          </button>

          <button
            onClick={() => setActiveTab('settings')}
            className={`px-5 py-2.5 rounded-lg text-xs md:text-sm font-bold tracking-wide transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'settings'
                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/10'
                : 'text-stone-400 hover:text-white hover:bg-stone-800/30'
            }`}
          >
            <Settings className="w-4 h-4" />
            <span>إعدادات السير والأمان</span>
          </button>
        </nav>

        {/* Tab Content Rendering */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* MAIN COLUMN (8/12) */}
          <div className="lg:col-span-8 space-y-6">
            
            <AnimatePresence mode="wait">
              {activeTab === 'trading' && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="space-y-6"
                >
                  {/* Event Price Chart Canvas */}
                  <div className="bg-[#0f131a] border border-stone-800/80 rounded-2xl p-5 space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-base font-bold text-white flex items-center gap-2">
                          <Zap className="text-amber-400 w-5 h-5" />
                          <span>تخطيط حدث تذبذب BTC/USDT</span>
                        </h3>
                        <p className="text-xs text-stone-400">تحديث فوري لكل ثانية ونصف يمثل أحداث الـ 10 دقائق الحية</p>
                      </div>

                      <div className="flex items-center gap-2 font-mono">
                        <span className="text-stone-500 text-xs">سعر الدقيقة الحالية:</span>
                        <span className="text-sm font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                          ${btcPrice.toLocaleString()} USDT
                        </span>
                      </div>
                    </div>

                    {/* Styled Micro Chart */}
                    <div className="h-44 bg-[#090b0e] rounded-xl relative border border-stone-800/50 flex items-end overflow-hidden p-2">
                      <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:12px_12px] opacity-15" />
                      
                      {/* Price points renderer */}
                      <svg className="w-full h-full overflow-visible" preserveAspectRatio="none">
                        <g>
                          {priceHistory.map((val, i) => {
                            if (i === 0) return null;
                            const minVal = Math.min(...priceHistory) * 0.9999;
                            const maxVal = Math.max(...priceHistory) * 1.0001;
                            const range = maxVal - minVal;
                            
                            const x1 = ((i - 1) / (priceHistory.length - 1)) * 100;
                            const y1 = 100 - (((priceHistory[i - 1] - minVal) / range) * 80 + 10);
                            const x2 = (i / (priceHistory.length - 1)) * 100;
                            const y2 = 100 - (((val - minVal) / range) * 80 + 10);

                            return (
                              <line
                                key={i}
                                x1={`${x1}%`}
                                y1={`${y1}%`}
                                x2={`${x2}%`}
                                y2={`${y2}%`}
                                stroke="#10b981"
                                strokeWidth="2.5"
                                strokeLinecap="round"
                              />
                            );
                          })}
                        </g>
                      </svg>

                      {/* Sparkles or markers on prices */}
                      <div className="absolute bottom-2 left-2 flex items-center gap-2 text-[10px] text-stone-500 font-mono bg-[#0f131a]/80 px-2 py-1 rounded border border-stone-800">
                        <span>أدنى: ${Math.min(...priceHistory).toLocaleString()}</span>
                        <span>|</span>
                        <span>أعلى: ${Math.max(...priceHistory).toLocaleString()}</span>
                      </div>
                    </div>
                  </div>

                  {/* Manual Quick Futures Entry Block */}
                  <div className="bg-[#0f131a] border border-stone-800/80 rounded-2xl p-5 space-y-4">
                    <div>
                      <h3 className="text-base font-bold text-white">اتخاذ قرار حدث الـ 10 دقائق لـ BTCUSDT</h3>
                      <p className="text-xs text-stone-400 mt-1">
                        سيقوم الروبوت Maria-Bot بفتح صفقة سريعة وإغلاقها تلقائياً بعد مرور 10 دقائق بناءً على توقعك.
                      </p>
                    </div>

                    {/* Order Sizing input */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1.5 text-right">
                        <label className="text-xs font-bold text-stone-400">حجم الصفقة الإجمالي ($ USDT)</label>
                        <div className="flex gap-2">
                          <input
                            type="number"
                            value={orderAmount}
                            onChange={(e) => setOrderAmount(e.target.value)}
                            className="flex-1 bg-[#090b0e] border border-stone-800/80 rounded-xl px-4 py-2.5 text-sm text-white font-mono focus:border-emerald-500 outline-none"
                            placeholder="e.g. 50"
                          />
                          <span className="bg-[#141b24] border border-stone-800/80 rounded-xl px-4 py-2.5 text-xs text-stone-400 flex items-center">
                            USDT
                          </span>
                        </div>
                      </div>

                      <div className="space-y-1.5 text-right">
                        <label className="text-xs font-bold text-stone-400 font-mono">الرافعة الفعالة المحددة</label>
                        <div className="bg-[#090b0e] border border-stone-800/80 p-2.5 rounded-xl flex items-center justify-between">
                          <span className="text-xs font-semibold text-emerald-400">{mexcConfig.leverage}x</span>
                          <span className="text-[11px] text-stone-500">معدلة من لوحة الإعدادات</span>
                        </div>
                      </div>
                    </div>

                    {/* Two Big Action Buttons */}
                    <div className="grid grid-cols-2 gap-4 pt-2">
                      <button
                        onClick={() => executeOrder('LONG')}
                        className="py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl text-sm transition-all duration-200 shadow-lg shadow-emerald-600/10 flex flex-col items-center justify-center gap-1 cursor-pointer hover:scale-[1.01]"
                      >
                        <TrendingUp className="w-6 h-6" />
                        <span>أعلى (توقع صعود السعر) ↗</span>
                        <span className="text-[10px] font-normal opacity-85">شراء عقود آجل صعودية (Long)</span>
                      </button>

                      <button
                        onClick={() => executeOrder('SHORT')}
                        className="py-4 bg-rose-600 hover:bg-rose-700 text-white font-black rounded-xl text-sm transition-all duration-200 shadow-lg shadow-rose-600/10 flex flex-col items-center justify-center gap-1 cursor-pointer hover:scale-[1.01]"
                      >
                        <TrendingDown className="w-6 h-6" />
                        <span>أدنى (توقع هبوط السعر) ↘</span>
                        <span className="text-[10px] font-normal opacity-85">شراء عقود آجل هبوطية (Short)</span>
                      </button>
                    </div>
                  </div>

                  {/* Active Positions */}
                  <div className="bg-[#0f131a] border border-stone-800/80 rounded-2xl p-5 space-y-4">
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      <Layers className="text-emerald-400 w-5 h-5" />
                      <span>الصفقات النشطة قيد المراقبة</span>
                    </h3>

                    <div className="space-y-3">
                      {activePositions.length > 0 ? (
                        activePositions.map((pos) => {
                          const isProfit = pos.pnl >= 0;
                          return (
                            <div key={pos.id} className="bg-[#090b0e] border border-stone-800/50 rounded-xl p-4 flex flex-col md:flex-row items-center justify-between gap-4">
                              <div className="flex items-center gap-3">
                                <span className={`p-2 rounded-lg text-xs font-bold ${
                                  pos.type === 'LONG' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
                                }`}>
                                  {pos.type === 'LONG' ? 'أعلى ↗' : 'أدنى ↘'}
                                </span>
                                <div>
                                  <h4 className="text-xs font-bold text-white">{pos.pair} ({pos.leverage}x)</h4>
                                  <p className="text-[10px] text-stone-500 mt-0.5">الدخول: ${pos.entryPrice} | الحالي: ${pos.currentPrice}</p>
                                </div>
                              </div>

                              {/* PnL indicator */}
                              <div className="text-center font-mono">
                                <span className="text-[10px] text-stone-500 block">العائد والربح المحقق</span>
                                <span className={`text-xs font-bold ${isProfit ? 'text-emerald-400' : 'text-rose-400'}`}>
                                  {isProfit ? '+' : ''}{pos.pnl} USDT ({pos.pnlPercent}%)
                                </span>
                              </div>

                              <button
                                onClick={() => closePosition(pos.id)}
                                className="px-3.5 py-1.5 bg-rose-950/40 hover:bg-rose-900/60 border border-rose-500/20 text-rose-300 rounded-lg text-xs font-bold transition-all cursor-pointer"
                              >
                                إغلاق الصفقة فوراً
                              </button>
                            </div>
                          );
                        })
                      ) : (
                        <div className="text-center py-8 text-stone-500 border border-dashed border-stone-800 rounded-xl">
                          لا توجد صفقات نشطة حالياً. حدد توقعك بالأعلى لتشغيل صفقات الحدث.
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}

              {activeTab === 'rewards' && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="space-y-6"
                >
                  {/* Rewards Dashboard and Transfer panel */}
                  <div className="bg-[#0f131a] border border-stone-800/80 rounded-2xl p-5 space-y-4">
                    <div>
                      <h3 className="text-base font-bold text-white">نظام سحب وتوريد المكافآت التلقائي</h3>
                      <p className="text-xs text-stone-400 mt-1">
                        تتراكم مكافآت الترويج في محفظة الفوري (Spot). يقوم تطبيق "مارية" بتحويلها تلقائياً إلى محفظة الآجل لدعم ميزانية الصفقات الجديدة.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Spot (Rewards waiting area) */}
                      <div className="bg-[#090b0e] border border-stone-800/50 rounded-xl p-4 text-center space-y-2 relative">
                        <div className="absolute top-2 right-2 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 bg-amber-400 rounded-full"></span>
                          <span className="text-[9px] text-amber-400 font-mono">رصيد المكافآت الجديد</span>
                        </div>
                        <h4 className="text-xs text-stone-400 font-bold">محفظة الفوري (Spot Wallet)</h4>
                        <p className="text-xl font-bold font-mono text-amber-400">
                          ${spotBalance.USDT.toFixed(2)} USDT
                        </p>
                        <p className="text-[10px] text-stone-500">رصيد بانتظار التوريد للآجل</p>
                      </div>

                      {/* Futures Balance target */}
                      <div className="bg-[#090b0e] border border-stone-800/50 rounded-xl p-4 text-center space-y-2 relative">
                        <div className="absolute top-2 right-2 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse"></span>
                          <span className="text-[9px] text-emerald-400 font-mono">نشط للآجل</span>
                        </div>
                        <h4 className="text-xs text-stone-400 font-bold">محفظة الآجل (Futures Wallet)</h4>
                        <p className="text-xl font-bold font-mono text-emerald-400">
                          ${futuresBalance.USDT.toFixed(2)} USDT
                        </p>
                        <p className="text-[10px] text-stone-500">رصيد التداول الفعلي المتاح</p>
                      </div>
                    </div>

                    {/* Auto harvest switch and manual button */}
                    <div className="p-4 bg-[#141b24] border border-stone-800/80 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={mexcConfig.autoTransferRewards}
                          onChange={(e) => handleUpdateConfig({ autoTransferRewards: e.target.checked })}
                          className="w-4.5 h-4.5 accent-emerald-500 cursor-pointer"
                          id="auto-transfer-toggle"
                        />
                        <label htmlFor="auto-transfer-toggle" className="text-xs font-bold text-white cursor-pointer">
                          تفعيل التوريد التلقائي الفوري للمكافآت المتراكمة
                        </label>
                      </div>

                      <button
                        onClick={triggerManualTransfer}
                        className="w-full sm:w-auto px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-lg transition shadow-md cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        <RefreshCw className="w-3.5 h-3.5 animate-spin-slow" />
                        <span>تحويل وتوريد المكافآت يدوياً الآن</span>
                      </button>
                    </div>
                  </div>

                  {/* Transfer history list */}
                  <div className="bg-[#0f131a] border border-stone-800/80 rounded-2xl p-5 space-y-4">
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      <History className="text-stone-400 w-5 h-5" />
                      <span>سجل عمليات نقل وتحويل المكافآت</span>
                    </h3>

                    <div className="space-y-2">
                      {rewardLogs.length > 0 ? (
                        rewardLogs.map((log) => (
                          <div key={log.id} className="bg-[#090b0e] border border-stone-800/50 rounded-xl p-3 flex items-center justify-between text-xs">
                            <div className="flex items-center gap-2">
                              <span className="p-1.5 bg-emerald-500/10 text-emerald-400 rounded-lg font-mono font-bold text-[10px]">
                                TRANSFER
                              </span>
                              <div>
                                <p className="text-white font-bold">تحويل رصيد بقيمة ${log.amount} {log.asset}</p>
                                <p className="text-[10px] text-stone-500 mt-0.5">{log.fromAccount} ← {log.toAccount}</p>
                              </div>
                            </div>
                            <div className="text-left font-mono">
                              <span className="text-emerald-400 block font-semibold">مكتملة بنجاح</span>
                              <span className="text-[9px] text-stone-500">{new Date(log.timestamp).toLocaleString('ar-EG')}</span>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-6 text-stone-500 border border-dashed border-stone-800 rounded-xl text-xs">
                          لا توجد عمليات تحويل مسجلة بعد.
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}

              {activeTab === 'build' && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="space-y-6"
                >
                  {/* GitHub Actions workflow interactive configuration */}
                  <div className="bg-[#0f131a] border border-stone-800/80 rounded-2xl p-5 space-y-4">
                    <div>
                      <h3 className="text-base font-bold text-white flex items-center gap-2">
                        <Cpu className="text-emerald-400 w-5 h-5" />
                        <span>مُنظّم ومولّد ملف GitHub Actions لبناء أندرويد 15</span>
                      </h3>
                      <p className="text-xs text-stone-400 mt-1">
                        صمم مخصصات بناء تطبيق Maria-Bot لتتمكن من تجميع كود الاندرويد عبر خوادم جيت هاب تلقائياً وتثبيته على جهازك LT_9904.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Name of App */}
                      <div className="space-y-1 text-right">
                        <label className="text-xs font-bold text-stone-400">اسم التطبيق (AppName)</label>
                        <input
                          type="text"
                          value={appName}
                          onChange={(e) => setAppName(e.target.value)}
                          className="w-full bg-[#090b0e] border border-stone-800/80 rounded-xl px-3 py-2 text-xs text-white focus:border-emerald-500 outline-none"
                          placeholder="e.g. MariaBot"
                        />
                      </div>

                      {/* Package Name */}
                      <div className="space-y-1 text-right">
                        <label className="text-xs font-bold text-stone-400">اسم الحزمة التعريفية (PackageName)</label>
                        <input
                          type="text"
                          value={packageName}
                          onChange={(e) => setPackageName(e.target.value)}
                          className="w-full bg-[#090b0e] border border-stone-800/80 rounded-xl px-3 py-2 text-xs text-white font-mono focus:border-emerald-500 outline-none"
                          placeholder="com.mexc.mariabot"
                        />
                      </div>

                      {/* Git branch */}
                      <div className="space-y-1 text-right">
                        <label className="text-xs font-bold text-stone-400">فرع كود المصدر (Branch)</label>
                        <input
                          type="text"
                          value={gitBranch}
                          onChange={(e) => setGitBranch(e.target.value)}
                          className="w-full bg-[#090b0e] border border-stone-800/80 rounded-xl px-3 py-2 text-xs text-white font-mono focus:border-emerald-500 outline-none"
                        />
                      </div>

                      {/* Key passwords alias */}
                      <div className="space-y-1 text-right">
                        <label className="text-xs font-bold text-stone-400">اسم مستعار للمفتاح المعياري (Alias)</label>
                        <input
                          type="text"
                          value={keystoreAlias}
                          onChange={(e) => setKeystoreAlias(e.target.value)}
                          className="w-full bg-[#090b0e] border border-stone-800/80 rounded-xl px-3 py-2 text-xs text-white font-mono focus:border-emerald-500 outline-none"
                        />
                      </div>
                    </div>

                    {/* Code display Box */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-stone-400">الكود الناتج لـ .github/workflows/main.yml</span>
                        <button
                          onClick={() => copyToClipboard(actionsYaml, 'yaml')}
                          className="flex items-center gap-1 text-[11px] bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-400 border border-emerald-500/20 px-3 py-1 rounded-lg transition-colors cursor-pointer"
                        >
                          {copiedYaml ? (
                            <>
                              <Check className="w-3.5 h-3.5" />
                              <span>تم نسخ الكود!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" />
                              <span>نسخ الكود بالكامل</span>
                            </>
                          )}
                        </button>
                      </div>

                      <div className="bg-[#090b0e] border border-stone-800/80 rounded-xl p-4 overflow-x-auto max-h-[300px] text-right" dir="ltr">
                        <pre className="text-[11px] font-mono text-[#cbd5e1] leading-relaxed whitespace-pre">
                          {actionsYaml}
                        </pre>
                      </div>
                    </div>
                  </div>

                  {/* Ultimate Mobile Signature & Android Setup Guide */}
                  <div className="bg-[#0f131a] border border-stone-800/80 rounded-2xl p-5 space-y-4">
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      <BookOpen className="text-stone-400 w-5 h-5" />
                      <span>دليل التوقيع المخصص وتجهيز الموازنة لأجهزة LT_9904</span>
                    </h3>

                    <div className="space-y-4 text-xs leading-relaxed text-stone-300">
                      
                      {/* Step 1: Keystore generation */}
                      <div className="p-3 bg-[#141b24] border border-stone-800/80 rounded-xl space-y-2">
                        <h4 className="font-bold text-emerald-400 flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-[10px] text-emerald-400">1</span>
                          <span>توليد مفتاح Keystore على الهاتف عبر تطبيق Termux</span>
                        </h4>
                        <p className="text-stone-400">افتح محاكي Termux على جهازك LT_9904 ونفذ الأمر التالي لتوليد مفتاح أمان مخصص لأندرويد 15:</p>
                        <div className="bg-[#090b0e] p-2.5 rounded border border-stone-800 font-mono text-left flex items-center justify-between overflow-x-auto" dir="ltr">
                          <span className="text-[#94a3b8] truncate">keytool -genkey -v -keystore upload-keystore.jks -alias upload -keyalg RSA -keysize 2048 -validity 10000</span>
                          <button
                            onClick={() => copyToClipboard('keytool -genkey -v -keystore upload-keystore.jks -alias upload -keyalg RSA -keysize 2048 -validity 10000', 'cmd_jks')}
                            className="text-stone-400 hover:text-white shrink-0 p-1"
                          >
                            {copiedCmd === 'cmd_jks' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>

                      {/* Step 2: Convert to base64 */}
                      <div className="p-3 bg-[#141b24] border border-stone-800/80 rounded-xl space-y-2">
                        <h4 className="font-bold text-emerald-400 flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-[10px] text-emerald-400">2</span>
                          <span>تحويل ملف jks إلى صيغة Base64 لإضافته إلى أسرار GitHub</span>
                        </h4>
                        <p className="text-stone-400">قم بتحويل الملف upload-keystore.jks إلى صيغة نصية لكي تتمكن من حفظه بأمان في مستودع GitHub Secrets:</p>
                        <div className="bg-[#090b0e] p-2.5 rounded border border-stone-800 font-mono text-left flex items-center justify-between overflow-x-auto" dir="ltr">
                          <span className="text-[#94a3b8] truncate">base64 -w0 upload-keystore.jks &gt; keystore_base64.txt</span>
                          <button
                            onClick={() => copyToClipboard('base64 -w0 upload-keystore.jks > keystore_base64.txt', 'cmd_base64')}
                            className="text-stone-400 hover:text-white shrink-0 p-1"
                          >
                            {copiedCmd === 'cmd_base64' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>

                      {/* Step 3: Setting secrets */}
                      <div className="p-3 bg-[#141b24] border border-stone-800/80 rounded-xl space-y-2">
                        <h4 className="font-bold text-emerald-400 flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-[10px] text-emerald-400">3</span>
                          <span>تكوين الأسرار في GitHub Repository Secrets</span>
                        </h4>
                        <p className="text-stone-400">اذهب إلى مستودع الكود الخاص بك في GitHub &gt; Settings &gt; Secrets and Variables &gt; Actions، وأضف الأسرار التالية:</p>
                        <ul className="list-disc list-inside space-y-1 text-stone-400 pr-2">
                          <li><code className="text-emerald-400 font-mono">KEYSTORE_BASE64</code>: محتوى ملف <code className="font-mono">keystore_base64.txt</code> الناتج من الخطوة السابقة.</li>
                          <li><code className="text-emerald-400 font-mono">STORE_PASSWORD</code>: كلمة المرور التي اخترتها للمفتاح (مثل: {keystorePass}).</li>
                        </ul>
                      </div>

                    </div>
                  </div>
                </motion.div>
              )}

              {activeTab === 'settings' && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="space-y-6"
                >
                  {/* API key configuration and simulation reset */}
                  <div className="bg-[#0f131a] border border-stone-800/80 rounded-2xl p-5 space-y-4">
                    <div>
                      <h3 className="text-base font-bold text-white">إعدادات الاتصال بموقع تداول MEXC</h3>
                      <p className="text-xs text-stone-400 mt-1">
                        يمكنك ربط مفاتيح واجهة برمجة التطبيقات (API Keys) للاتصال المباشر بحسابك على MEXC، أو مواصلة استخدام حساب المحاكاة الافتراضي الآمن.
                      </p>
                    </div>

                    <div className="space-y-3">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1 text-right">
                          <label className="text-xs font-bold text-stone-400">مفتاح API Key</label>
                          <input
                            type="text"
                            value={customKeyInput.apiKey}
                            onChange={(e) => setCustomKeyInput({ ...customKeyInput, apiKey: e.target.value })}
                            className="w-full bg-[#090b0e] border border-stone-800/80 rounded-xl px-3 py-2 text-xs text-white font-mono focus:border-emerald-500 outline-none"
                            placeholder="e.g. mx0v9s8df0sdf8s9df..."
                          />
                        </div>

                        <div className="space-y-1 text-right">
                          <label className="text-xs font-bold text-stone-400">مفتاح السر API Secret</label>
                          <input
                            type="password"
                            value={customKeyInput.apiSecret}
                            onChange={(e) => setCustomKeyInput({ ...customKeyInput, apiSecret: e.target.value })}
                            className="w-full bg-[#090b0e] border border-stone-800/80 rounded-xl px-3 py-2 text-xs text-white font-mono focus:border-emerald-500 outline-none"
                            placeholder="••••••••••••••••••••"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                        {/* Sandbox vs real live toggle */}
                        <div className="bg-[#141b24] border border-stone-800/80 p-3 rounded-xl flex items-center justify-between">
                          <div>
                            <span className="text-xs font-bold text-white block">وضع المحاكاة التجريبية (Sandbox)</span>
                            <span className="text-[10px] text-stone-500">تمكين التداول الافتراضي بدون مخاطرة مالية</span>
                          </div>
                          <input
                            type="checkbox"
                            checked={mexcConfig.isSandbox}
                            onChange={(e) => handleUpdateConfig({ isSandbox: e.target.checked })}
                            className="w-4.5 h-4.5 accent-emerald-500 cursor-pointer"
                          />
                        </div>

                        {/* Leverage factor adjustments */}
                        <div className="bg-[#141b24] border border-stone-800/80 p-3 rounded-xl flex items-center justify-between">
                          <div>
                            <span className="text-xs font-bold text-white block">مستوى الرافعة المالية للتداول</span>
                            <span className="text-[10px] text-stone-500">قيمة تضخيم الصفقات للآجل</span>
                          </div>
                          <select
                            value={mexcConfig.leverage}
                            onChange={(e) => handleUpdateConfig({ leverage: parseInt(e.target.value) })}
                            className="bg-[#090b0e] border border-stone-800/50 rounded-lg text-xs font-bold text-emerald-400 p-1.5 focus:outline-none"
                          >
                            <option value="10">10x (منخفض المخاطر)</option>
                            <option value="20">20x (متوسط موازن)</option>
                            <option value="50">50x (مخاطر مرتفعة)</option>
                            <option value="100">100x (قوة قصوى)</option>
                          </select>
                        </div>
                      </div>

                      <div className="flex gap-3 pt-3 justify-end">
                        <button
                          onClick={() => {
                            if (customKeyInput.apiKey) {
                              handleUpdateConfig({ apiKey: customKeyInput.apiKey, apiSecret: customKeyInput.apiSecret });
                              alert("تمت محاكاة ربط وتفعيل حساب MEXC الخاص بك بنجاح!");
                            } else {
                              alert("يرجى إدخال مفتاح API Key أولاً.");
                            }
                          }}
                          className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition"
                        >
                          ربط وحفظ مفاتيح الاتصال
                        </button>

                        <button
                          onClick={resetBalances}
                          className="px-6 py-2 bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs font-bold rounded-lg transition"
                        >
                          إعادة تعيين رصيد الحساب الافتراضي
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

          </div>

          {/* SIDEBAR LOGS & SYSTEMS EVENTS (4/12) */}
          <div className="lg:col-span-4 space-y-6">
            
            {/* System Status Deck */}
            <div className="bg-[#0f131a] border border-stone-800/80 rounded-2xl p-5 space-y-4 shadow-xl">
              <h3 className="text-xs font-black uppercase tracking-wider text-stone-400 flex items-center justify-between">
                <span>تحديثات النظام الحية</span>
                <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse"></span>
              </h3>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-[#090b0e] border border-stone-800/60 p-3 rounded-xl text-center">
                  <span className="text-[10px] text-stone-500 block">توريد المكافآت التلقائي</span>
                  <span className="text-xs font-bold text-emerald-400 mt-1 block">
                    {mexcConfig.autoTransferRewards ? "مفعّل ونشط" : "متوقف"}
                  </span>
                </div>

                <div className="bg-[#090b0e] border border-stone-800/60 p-3 rounded-xl text-center">
                  <span className="text-[10px] text-stone-500 block">وقت حدث الآجل</span>
                  <span className="text-xs font-bold text-white mt-1 block">
                    {mexcConfig.eventDurationMinutes} دقائق حية
                  </span>
                </div>
              </div>
            </div>

            {/* Live Terminal Console Logs */}
            <div className="bg-[#0f131a] border border-stone-800/80 rounded-2xl p-5 space-y-3 shadow-xl">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-black text-white flex items-center gap-1.5">
                  <Terminal className="w-4 h-4 text-emerald-400" />
                  <span>وحدة السجلات والعمليات الحية (Maria-Logs)</span>
                </h3>
                <span className="text-[9px] text-stone-500 font-mono">15:15 UTC</span>
              </div>

              {/* Logs display container */}
              <div className="bg-[#090b0e] border border-stone-800/80 rounded-xl p-3 h-[320px] overflow-y-auto font-mono space-y-2.5 text-right">
                {botLogs.length > 0 ? (
                  botLogs.map((log) => {
                    let typeColor = 'text-blue-400';
                    if (log.type === 'SUCCESS') typeColor = 'text-emerald-400';
                    if (log.type === 'WARNING') typeColor = 'text-amber-400';
                    if (log.type === 'ERROR') typeColor = 'text-rose-400';

                    return (
                      <div key={log.id} className="text-[10px] leading-relaxed border-b border-stone-900/40 pb-1.5">
                        <div className="flex items-center justify-between text-[9px] text-stone-500 mb-0.5">
                          <span>{new Date(log.timestamp).toLocaleTimeString('ar-EG')}</span>
                          <span className={`font-bold ${typeColor}`}>[{log.type}]</span>
                        </div>
                        <p className="text-stone-300">{log.message}</p>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-12 text-stone-600 text-[11px]">
                    لا توجد سجلات حالية. ابدأ في تنفيذ العمليات لرؤية التحديثات الحية.
                  </div>
                )}
              </div>
            </div>

          </div>

        </div>

        {/* Footer */}
        <footer className="text-center pt-8 pb-4 text-[11px] text-stone-600 border-t border-stone-900 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© 2026 تطبيق مارية لتداول أحداث MEXC وسير بناء Android 15.</p>
          <p className="flex items-center gap-1">
            <span>لوحة تحكم مشفرة ومؤمنة بالكامل</span>
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
          </p>
        </footer>

      </div>
    </div>
  );
}
