import React, { useState, useEffect, useCallback } from 'react';
import { 
  Server, Activity, Thermometer, Droplets, Lightbulb, 
  Power, List, Mic, MicOff, AlertCircle, PlayCircle, Wifi
} from 'lucide-react';
import { useVoice } from '../hooks/useVoice';
import type { SystemState, LogEntry } from '../types';

export default function Dashboard() {
  const [ipAddress, setIpAddress] = useState<string>('');
  const [isConfigured, setIsConfigured] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  
  const [state, setState] = useState<SystemState>({
    temperature: 0,
    humidity: 0,
    variasiMode: 0,
    r1: 0,
    r2: 0,
    r3: 0,
    r4: 0
  });
  
  const [logs, setLogs] = useState<LogEntry[]>([]);

  const addLog = useCallback((message: string, type: LogEntry['type']) => {
    setLogs(prev => {
      const newLogs = [{
        id: Math.random().toString(36).substr(2, 9),
        timestamp: new Date(),
        message,
        type
      }, ...prev];
      return newLogs.slice(0, 100); // Keep last 100 logs
    });
  }, []);

  const fetchSync = useCallback(async () => {
    if (!ipAddress || !isConfigured) return;
    const url = ipAddress.startsWith('http') ? `${ipAddress}/sync` : `http://${ipAddress}/sync`;
    
    try {
      const res = await fetch(url);
      if (res.ok) {
        const json = await res.json();
        setState(json as SystemState);
        if (!isConnected) {
          setIsConnected(true);
          addLog('Berhasil terhubung ke ESP32', 'system');
        }
      } else {
        if (isConnected) {
          setIsConnected(false);
          addLog(`Gagal sync data: HTTP ${res.status}`, 'error');
        }
      }
    } catch (err) {
      if (isConnected) {
        setIsConnected(false);
        addLog('Koneksi terputus dari ESP32', 'error');
      }
    }
  }, [ipAddress, isConfigured, isConnected, addLog]);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (isConfigured && ipAddress) {
      fetchSync(); // initial fetch
      interval = setInterval(fetchSync, 3000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [ipAddress, isConfigured, fetchSync]);

  const sendCommand = async (path: string, successMsg: string) => {
    if (!ipAddress) {
      addLog('IP Address ESP32 belum diatur', 'error');
      return;
    }
    const url = ipAddress.startsWith('http') ? `${ipAddress}${path}` : `http://${ipAddress}${path}`;
    
    try {
      const res = await fetch(url);
      if (res.ok) {
        addLog(successMsg, 'action');
        fetchSync(); // immediately refresh state
      } else {
        addLog(`Gagal perintah: HTTP ${res.status}`, 'error');
      }
    } catch (err) {
      addLog(`Koneksi perintah gagal: ${path}`, 'error');
    }
  };

  const parseVoiceCommand = useCallback((text: string) => {
    addLog(`Suara terdeteksi: "${text}"`, 'voice');
    const lowerCmd = text.toLowerCase();
    let matched = false;

    const isOn = lowerCmd.includes('nyala') || lowerCmd.includes('hidup') || lowerCmd.includes('on') || lowerCmd.includes('satu') || lowerCmd.includes('dua');
    const isOff = lowerCmd.includes('mati') || lowerCmd.includes('off') || lowerCmd.includes('stop') || lowerCmd.includes('berhenti');

    if (isOn) {
      if (lowerCmd.includes('variasi 1') || lowerCmd.includes('variasi satu')) {
        sendCommand('/variasi?mode=1', 'Variasi 1 Aktif (Voice)');
        matched = true;
      } else if (lowerCmd.includes('variasi 2') || lowerCmd.includes('variasi dua')) {
        sendCommand('/variasi?mode=2', 'Variasi 2 Aktif (Voice)');
        matched = true;
      } else if (lowerCmd.includes('semua')) {
        sendCommand('/all?state=on', 'Semua Lampu Nyala (Voice)');
        matched = true;
      } else if (lowerCmd.includes('satu') || lowerCmd.includes('1')) {
        sendCommand('/relay?id=1&state=on', 'Lampu 1 Nyala (Voice)');
        matched = true;
      } else if (lowerCmd.includes('dua') || lowerCmd.includes('2')) {
        sendCommand('/relay?id=2&state=on', 'Lampu 2 Nyala (Voice)');
        matched = true;
      } else if (lowerCmd.includes('tiga') || lowerCmd.includes('3')) {
        sendCommand('/relay?id=3&state=on', 'Lampu 3 Nyala (Voice)');
        matched = true;
      } else if (lowerCmd.includes('empat') || lowerCmd.includes('4')) {
        sendCommand('/relay?id=4&state=on', 'Lampu 4 Nyala (Voice)');
        matched = true;
      }
    } else if (isOff) {
      if (lowerCmd.includes('variasi') || lowerCmd.includes('stop') || lowerCmd.includes('berhenti')) {
        sendCommand('/stop', 'Variasi Dihentikan (Voice)');
        matched = true;
      } else if (lowerCmd.includes('semua')) {
        sendCommand('/all?state=off', 'Semua Lampu Mati (Voice)');
        matched = true;
      } else if (lowerCmd.includes('satu') || lowerCmd.includes('1')) {
        sendCommand('/relay?id=1&state=off', 'Lampu 1 Mati (Voice)');
        matched = true;
      } else if (lowerCmd.includes('dua') || lowerCmd.includes('2')) {
        sendCommand('/relay?id=2&state=off', 'Lampu 2 Mati (Voice)');
        matched = true;
      } else if (lowerCmd.includes('tiga') || lowerCmd.includes('3')) {
        sendCommand('/relay?id=3&state=off', 'Lampu 3 Mati (Voice)');
        matched = true;
      } else if (lowerCmd.includes('empat') || lowerCmd.includes('4')) {
        sendCommand('/relay?id=4&state=off', 'Lampu 4 Mati (Voice)');
        matched = true;
      }
    }

    if (!matched) {
      addLog(`Perintah suara tidak dikenali`, 'error');
    }
  }, [ipAddress, addLog]); // Dependencies

  const { isListening, isSupported, toggleListening } = useVoice(parseVoiceCommand);

  const handleConfigSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (ipAddress) {
      setIsConfigured(true);
      addLog(`Menyimpan konfigurasi IP: ${ipAddress}`, 'system');
      fetchSync();
    }
  };

  const getLogIcon = (type: string) => {
    switch (type) {
      case 'system': return <Server className="w-4 h-4 text-gray-400" />;
      case 'action': return <Activity className="w-4 h-4 text-green-400" />;
      case 'voice': return <Mic className="w-4 h-4 text-[#8A7EF7]" />;
      case 'error': return <AlertCircle className="w-4 h-4 text-red-400" />;
      default: return <List className="w-4 h-4 text-gray-400" />;
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-amber-50 font-sans">
      
      {/* HEADER / NAVIGATION BAR (BLACK) */}
      <header className="sticky top-0 z-50 w-full bg-gray-900 shadow-md">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Lightbulb className="w-6 h-6 text-[#6D5EF5]" />
            <h1 className="text-xl font-bold text-white tracking-wide">Kendali Smart Home</h1>
          </div>
          
          <div className="flex flex-1 max-w-xl md:mx-6">
            <form onSubmit={handleConfigSubmit} className="flex flex-1 gap-2">
              <div className="relative flex-1">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                  <Wifi className={`w-4 h-4 ${isConnected ? 'text-green-500' : 'text-red-500'}`} />
                </div>
                <input 
                  type="text" 
                  placeholder="IP ESP32 (http://192.168.x.x)"
                  className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 text-white text-sm rounded-xl focus:outline-none focus:ring-2 focus:ring-[#6D5EF5] transition-shadow placeholder-gray-500"
                  value={ipAddress}
                  onChange={(e) => setIpAddress(e.target.value)}
                  required
                />
              </div>
              <button 
                type="submit"
                className="px-5 py-2 bg-[#6D5EF5] hover:bg-[#5B4EE0] text-white text-sm font-medium rounded-xl transition-colors whitespace-nowrap"
              >
                {isConfigured ? 'Update IP' : 'Hubungkan'}
              </button>
            </form>
          </div>
        </div>
      </header>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 w-full max-w-7xl mx-auto p-4 md:p-8 space-y-8">
        
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          
          {/* LEFT COLUMN: Controls & Sensors */}
            <div className="md:col-span-8 space-y-8">
              
              {/* SENSORS */}
              <section className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex items-center gap-6 group hover:border-[#6D5EF5]/30 transition-colors">
                  <div className="w-14 h-14 rounded-2xl bg-orange-50 flex items-center justify-center text-orange-500 group-hover:scale-110 transition-transform">
                    <Thermometer className="w-7 h-7" />
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider">Suhu Ruangan</h3>
                    <div className="text-3xl font-bold text-gray-900 mt-1">
                      {state.temperature.toFixed(1)}<span className="text-xl text-gray-400 font-medium">°C</span>
                    </div>
                  </div>
                </div>
                
                <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex items-center gap-6 group hover:border-[#6D5EF5]/30 transition-colors">
                  <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-500 group-hover:scale-110 transition-transform">
                    <Droplets className="w-7 h-7" />
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider">Kelembapan</h3>
                    <div className="text-3xl font-bold text-gray-900 mt-1">
                      {state.humidity.toFixed(1)}<span className="text-xl text-gray-400 font-medium">%</span>
                    </div>
                  </div>
                </div>
              </section>

              {/* RELAY CONTROLS */}
              <section>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                    <Lightbulb className="w-6 h-6 text-[#6D5EF5]" />
                    Kendali Lampu
                  </h2>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => sendCommand('/all?state=on', 'Semua lampu dinyalakan')}
                      className="px-4 py-1.5 text-sm font-medium bg-green-50 text-green-700 hover:bg-green-100 rounded-lg transition-colors border border-green-200"
                    >
                      Nyala Semua
                    </button>
                    <button 
                      onClick={() => sendCommand('/all?state=off', 'Semua lampu dimatikan')}
                      className="px-4 py-1.5 text-sm font-medium bg-red-50 text-red-700 hover:bg-red-100 rounded-lg transition-colors border border-red-200"
                    >
                      Mati Semua
                    </button>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[1, 2, 3, 4].map((id) => {
                    // Mapped to specific state variables
                    const relayState = [state.r1, state.r2, state.r3, state.r4][id - 1];
                    const isOn = relayState === 1;
                    
                    return (
                      <div 
                        key={id}
                        className={`p-6 rounded-3xl border-2 transition-all cursor-pointer flex flex-col items-center gap-4 ${
                          isOn 
                            ? 'bg-white border-[#6D5EF5] shadow-md shadow-[#6D5EF5]/10' 
                            : 'bg-gray-50 border-gray-100 hover:border-gray-200'
                        }`}
                        onClick={() => sendCommand(`/relay?id=${id}&state=${isOn ? 'off' : 'on'}`, `Lampu ${id} ${isOn ? 'dimatikan' : 'dinyalakan'} manual`)}
                      >
                        <div className={`w-16 h-16 rounded-full flex items-center justify-center transition-colors ${
                          isOn ? 'bg-[#6D5EF5]/10 text-[#6D5EF5]' : 'bg-white text-gray-400 shadow-sm'
                        }`}>
                          <Power className={`w-8 h-8 ${isOn ? 'drop-shadow-[0_0_8px_rgba(109,94,245,0.8)]' : ''}`} />
                        </div>
                        <div className="text-center">
                          <h4 className="font-semibold text-gray-900">Lampu {id}</h4>
                          <span className={`text-xs font-medium uppercase tracking-wider ${isOn ? 'text-[#6D5EF5]' : 'text-gray-500'}`}>
                            {isOn ? 'Menyala' : 'Mati'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>

              {/* VARIASI CONTROLS FOR 4 LAMPS */}
              <section className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
                 <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2 mb-2">
                    <PlayCircle className="w-6 h-6 text-[#6D5EF5]" />
                    Kontrol 4 Lampu Variasi
                  </h2>
                  <p className="text-sm text-gray-500 mb-6">Aktifkan pola hidup-mati otomatis untuk keempat lampu sekaligus.</p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                     <button
                        onClick={() => sendCommand('/variasi?mode=1', 'Variasi 1 Aktif')}
                        className={`p-4 rounded-xl border-2 font-medium flex items-center justify-center gap-2 transition-colors ${
                          state.variasiMode === 1 
                            ? 'bg-[#6D5EF5]/10 border-[#6D5EF5] text-[#6D5EF5]' 
                            : 'bg-gray-50 border-gray-100 text-gray-600 hover:bg-gray-100'
                        }`}
                     >
                       <Activity className="w-5 h-5" />
                       Pola 1 (Running)
                     </button>
                     <button
                        onClick={() => sendCommand('/variasi?mode=2', 'Variasi 2 Aktif')}
                        className={`p-4 rounded-xl border-2 font-medium flex items-center justify-center gap-2 transition-colors ${
                          state.variasiMode === 2 
                            ? 'bg-[#6D5EF5]/10 border-[#6D5EF5] text-[#6D5EF5]' 
                            : 'bg-gray-50 border-gray-100 text-gray-600 hover:bg-gray-100'
                        }`}
                     >
                       <Activity className="w-5 h-5" />
                       Pola 2 (Bolak-Balik)
                     </button>
                     <button
                        onClick={() => sendCommand('/stop', 'Variasi Dihentikan')}
                        className="p-4 rounded-xl border-2 border-red-100 bg-red-50 text-red-600 hover:bg-red-100 font-medium flex items-center justify-center gap-2 transition-colors"
                     >
                       Berhenti
                     </button>
                  </div>
              </section>

              {/* VOICE CONTROL */}
              <section className="bg-gradient-to-br from-[#6D5EF5]/10 to-transparent p-6 sm:p-8 rounded-3xl border border-[#6D5EF5]/20 flex flex-col items-center text-center relative overflow-hidden">
                 <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#6D5EF5]/50 to-transparent"></div>
                 
                 <h2 className="text-xl font-bold text-gray-900 mb-2">Kendali Suara</h2>
                 <p className="text-gray-600 mb-8 max-w-md">
                   Tekan tombol di bawah lalu ucapkan perintah seperti <br/>
                   <span className="font-mono text-sm text-[#6D5EF5] bg-[#6D5EF5]/10 px-2 py-0.5 rounded">"Lampu satu nyala"</span> atau <span className="font-mono text-sm text-[#6D5EF5] bg-[#6D5EF5]/10 px-2 py-0.5 rounded">"Semua mati"</span>
                 </p>
                 
                 <button
                    onClick={toggleListening}
                    disabled={!isSupported}
                    className={`relative group w-24 h-24 rounded-full flex items-center justify-center transition-all ${
                      isListening 
                        ? 'bg-[#6D5EF5] text-white shadow-xl shadow-[#6D5EF5]/40 scale-110' 
                        : 'bg-white text-[#6D5EF5] shadow-lg hover:shadow-xl hover:scale-105 border border-gray-100'
                    } ${!isSupported ? 'opacity-50 cursor-not-allowed' : ''}`}
                 >
                    {isListening && (
                      <>
                        <span className="absolute inset-0 rounded-full border-4 border-[#6D5EF5] animate-ping opacity-25"></span>
                        <span className="absolute inset-[-12px] rounded-full border border-[#6D5EF5] animate-pulse opacity-50"></span>
                      </>
                    )}
                    {isListening ? <Mic className="w-10 h-10" /> : <MicOff className="w-10 h-10" />}
                 </button>
                 
                 {isListening && (
                   <div className="mt-6 text-[#6D5EF5] font-medium flex items-center gap-2 animate-pulse">
                     <span className="relative flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#6D5EF5] opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-[#6D5EF5]"></span>
                      </span>
                     Mendengarkan...
                   </div>
                 )}
                 {!isSupported && (
                   <div className="mt-4 text-red-500 text-sm">Browser Anda tidak mendukung Web Speech API</div>
                 )}
              </section>

            </div>

            {/* RIGHT COLUMN: Activity Log */}
            <div className="md:col-span-4">
              <div className="bg-gray-900 rounded-3xl shadow-sm border border-gray-800 flex flex-col h-[600px] xl:sticky xl:top-24">
                <div className="p-6 border-b border-gray-800 flex items-center justify-between bg-gray-950/50 rounded-t-3xl">
                  <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    <List className="w-5 h-5 text-[#6D5EF5]" />
                    Log Aktivitas
                  </h2>
                  <span className="text-xs font-medium bg-gray-800 text-gray-300 border border-gray-700 px-2 py-1 rounded-full">
                    {logs.length} events
                  </span>
                </div>
                
                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                  {logs.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center text-gray-500 space-y-3">
                      <Activity className="w-8 h-8 opacity-50" />
                      <p className="text-sm">Belum ada aktivitas yang tercatat</p>
                    </div>
                  ) : (
                    logs.map((log) => (
                      <div key={log.id} className="flex gap-3 text-sm animate-in slide-in-from-right-4 fade-in duration-300">
                        <div className="mt-0.5 shrink-0">
                          {getLogIcon(log.type)}
                        </div>
                        <div>
                          <p className="text-gray-100 leading-tight">{log.message}</p>
                          <p className="text-xs text-gray-500 mt-1">
                            {log.timestamp.toLocaleTimeString('id-ID', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

          </div>
      </main>
    </div>
  );
}
