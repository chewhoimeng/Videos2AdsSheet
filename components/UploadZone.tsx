import React, { useState, useEffect } from 'react';

const INITIAL_CATEGORIES = [
  "Deo", "LB", "SS", "Mix", "FO", "HO", "LS", "CT", "BS", "EO", 
  "Dodotint", "BO", "Deo Spray", "Shower Oil", "Perfume Oil", 
  "Powder series", "Plushie", "Bag", "Bungkus", "Roll On", "Tea Series"
];

const DRIVE_FOLDER_LINK = "https://drive.google.com/drive/u/0/folders/1AyWWB3MnE-Bp7CxafzBvIt7txifiKOfe";
const DEFAULT_WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbxxk66Ir54a-6iFbAHmgX-Q3jal9fkW5z_uB7Fyx54Y3bdXYZN71n3L_5XAfV75PEJI/exec';

type SystemStatus = 'CHECKING' | 'ACTIVE' | 'INACTIVE' | 'ERROR';

const UploadZone: React.FC = () => {
  const [webAppUrl, setWebAppUrl] = useState(() => localStorage.getItem('hygr_api_url') || DEFAULT_WEB_APP_URL);
  const [showSettings, setShowSettings] = useState(false);
  const [systemStatus, setSystemStatus] = useState<SystemStatus>('CHECKING');
  
  // Naming Form State
  const [category, setCategory] = useState(INITIAL_CATEGORIES[0]);
  const [customName, setCustomName] = useState('');
  const [extension, setExtension] = useState('.mp4');
  const [generatedName, setGeneratedName] = useState('');
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);

  useEffect(() => {
    // Generate name: Category - Name.ext
    const base = customName.trim() || "Untitled_Scene";
    const ext = extension.startsWith('.') ? extension : `.${extension}`;
    setGeneratedName(`${category} - ${base}${ext}`);
  }, [category, customName, extension]);

  // Check system status on mount
  useEffect(() => {
    checkStatus();
  }, [webAppUrl]);

  const checkStatus = async () => {
    try {
      setSystemStatus('CHECKING');
      const response = await fetch(webAppUrl, {
        method: 'POST',
        body: JSON.stringify({ action: 'checkStatus' })
      });
      const data = await response.json();
      if (data.status === 'active') {
        setSystemStatus('ACTIVE');
      } else {
        setSystemStatus('INACTIVE');
      }
    } catch (e) {
      console.error(e);
      setSystemStatus('ERROR');
    }
  };

  const toggleService = async (enable: boolean) => {
    try {
      setSystemStatus('CHECKING');
      const action = enable ? 'startSync' : 'stopSync';
      const response = await fetch(webAppUrl, {
        method: 'POST',
        body: JSON.stringify({ action })
      });
      const data = await response.json();
      if (data.status === 'success') {
        checkStatus();
      } else {
        alert("Operation failed: " + data.message);
        setSystemStatus('ERROR');
      }
    } catch (e) {
      alert("Network Error");
      setSystemStatus('ERROR');
    }
  };

  const forceSyncNow = async () => {
    const btn = document.getElementById('force-btn');
    if(btn) btn.innerText = "Scanning...";
    try {
      await fetch(webAppUrl, {
        method: 'POST',
        body: JSON.stringify({ action: 'forceSync' })
      });
      setLastSyncTime(new Date().toLocaleTimeString());
      if(btn) btn.innerText = "Scan Complete";
      setTimeout(() => { if(btn) btn.innerText = "Force Scan Now"; }, 3000);
    } catch (e) {
      if(btn) btn.innerText = "Scan Failed";
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generatedName);
  };

  return (
    <div className="space-y-8 animate-fade-up max-w-3xl mx-auto">
      
      {/* --- STATUS DASHBOARD --- */}
      <div className={`glass rounded-3xl p-6 flex flex-col md:flex-row items-center justify-between gap-6 border-l-4 ${
        systemStatus === 'ACTIVE' ? 'border-l-emerald-500' : 
        systemStatus === 'ERROR' ? 'border-l-red-500' : 'border-l-slate-500'
      }`}>
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className={`w-3 h-3 rounded-full ${
              systemStatus === 'ACTIVE' ? 'bg-emerald-500' : 
              systemStatus === 'CHECKING' ? 'bg-yellow-500 animate-pulse' : 'bg-slate-500'
            }`}></div>
            {systemStatus === 'ACTIVE' && <div className="absolute inset-0 w-3 h-3 bg-emerald-500 rounded-full animate-ping opacity-75"></div>}
          </div>
          <div>
            <h3 className="font-bold text-white text-sm uppercase tracking-widest">
              Auto-Sync Service
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              {systemStatus === 'ACTIVE' && "Running. Checking Drive every minute."}
              {systemStatus === 'INACTIVE' && "Service stopped. No automatic logging."}
              {systemStatus === 'CHECKING' && "Connecting to server..."}
              {systemStatus === 'ERROR' && "Connection Error. Check URL."}
            </p>
          </div>
        </div>

        <div className="flex gap-3">
          {systemStatus === 'INACTIVE' && (
            <button 
              onClick={() => toggleService(true)}
              className="bg-emerald-500 hover:bg-emerald-400 text-white text-xs font-bold px-4 py-2 rounded-lg transition-colors"
            >
              Start Service
            </button>
          )}
          {systemStatus === 'ACTIVE' && (
             <button 
              onClick={() => toggleService(false)}
              className="bg-white/5 hover:bg-red-500/20 text-slate-400 hover:text-red-400 text-xs font-bold px-4 py-2 rounded-lg transition-colors"
            >
              Stop Service
            </button>
          )}
          <button 
            id="force-btn"
            onClick={forceSyncNow}
            className="bg-white/10 hover:bg-white/20 text-white text-xs font-bold px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
            Force Scan Now
          </button>
        </div>
      </div>

      {lastSyncTime && (
        <div className="text-center text-[10px] text-emerald-400 font-mono">
          Last manual scan completed at {lastSyncTime}
        </div>
      )}


      {/* --- NAMING TOOL --- */}
      <div className="glass p-8 md:p-10 rounded-[40px] shadow-2xl border-white/5 animate-fade-up">
        
        <div className="flex items-center gap-3 mb-8 pb-6 border-b border-white/5">
          <div className="w-8 h-8 bg-white text-black rounded-lg flex items-center justify-center font-bold">1</div>
          <h3 className="text-xl font-bold text-white">Generate Filename</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
           <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Category</label>
              <select 
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500/50 cursor-pointer"
              >
                {INITIAL_CATEGORIES.map(c => <option key={c} value={c} className="text-black">{c}</option>)}
              </select>
           </div>
           
           <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Extension</label>
              <select 
                value={extension}
                onChange={(e) => setExtension(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500/50 cursor-pointer"
              >
                {['.mp4','.mov','.png','.jpg'].map(e => <option key={e} value={e} className="text-black">{e}</option>)}
              </select>
           </div>
        </div>

        <div className="space-y-2 mb-8">
           <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Scene Name</label>
           <input 
             value={customName}
             onChange={(e) => setCustomName(e.target.value)}
             placeholder="e.g. Master_Shot_01"
             className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500/50 placeholder:text-slate-600"
           />
        </div>

        <div className="bg-black/40 rounded-xl p-4 border border-white/5 flex flex-col md:flex-row gap-4 items-center">
          <div className="flex-grow w-full">
            <label className="text-[10px] text-slate-500 uppercase font-bold mb-1 block">Your Filename</label>
            <code className="block w-full text-emerald-300 font-mono text-sm truncate select-all">
              {generatedName}
            </code>
          </div>
          <button 
            onClick={copyToClipboard}
            className="w-full md:w-auto bg-emerald-500 hover:bg-emerald-400 text-white font-bold rounded-lg px-6 py-3 transition-colors text-sm shadow-lg shadow-emerald-900/20 whitespace-nowrap"
          >
            Copy Name
          </button>
        </div>

      </div>


      {/* --- ACTION ZONE --- */}
      <div className="glass p-8 rounded-[40px] animate-fade-up [animation-delay:100ms] text-center">
         <div className="flex items-center justify-center gap-3 mb-4">
            <div className="w-8 h-8 bg-white/10 text-white rounded-lg flex items-center justify-center font-bold">2</div>
            <h3 className="text-xl font-bold text-white">Upload to Drive</h3>
         </div>
         <p className="text-slate-400 mb-8 max-w-lg mx-auto font-light">
           Open the folder, rename your file, and upload. <br/>
           <span className="text-emerald-400">The Auto-Sync service will detect it automatically.</span>
         </p>
         
         <button 
           onClick={() => window.open(DRIVE_FOLDER_LINK, '_blank')}
           className="bg-white text-black font-bold text-lg px-12 py-4 rounded-2xl hover:scale-105 transition-all shadow-xl"
         >
           Open Drive Folder
         </button>
      </div>


      {/* --- SETTINGS TOGGLE --- */}
      <div className="flex justify-center pt-8">
        <button 
          onClick={() => setShowSettings(!showSettings)}
          className="text-[10px] font-bold uppercase tracking-widest text-slate-600 hover:text-white transition-colors"
        >
          {showSettings ? 'Hide Config' : 'Configure API'}
        </button>
      </div>

      {showSettings && (
        <div className="glass p-6 rounded-2xl animate-fade-up mb-8">
           <label className="text-[10px] uppercase font-bold text-slate-500 mb-2 block">Script URL</label>
           <input 
             value={webAppUrl} 
             onChange={(e) => {
               setWebAppUrl(e.target.value);
               localStorage.setItem('hygr_api_url', e.target.value);
             }}
             className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-xs font-mono text-white" 
           />
        </div>
      )}

    </div>
  );
};

export default UploadZone;