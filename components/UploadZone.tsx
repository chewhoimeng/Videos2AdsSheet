import React, { useState, useEffect, useRef } from 'react';
import { UploadStatus } from '../types';

const INITIAL_CATEGORIES = [
  "Deo", "LB", "SS", "Mix", "FO", "HO", "LS", "CT", "BS", "EO", 
  "Dodotint", "BO", "Deo Spray", "Shower Oil", "Perfume Oil", 
  "Powder series", "Plushie", "Bag", "Bungkus", "Roll On", "Tea Series"
];

const DRIVE_FOLDER_LINK = "https://drive.google.com/drive/u/0/folders/1AyWWB3MnE-Bp7CxafzBvIt7txifiKOfe";
const DEFAULT_WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbxxk66Ir54a-6iFbAHmgX-Q3jal9fkW5z_uB7Fyx54Y3bdXYZN71n3L_5XAfV75PEJI/exec';

type SyncPhase = 'IDLE' | 'RENAMING' | 'WAITING_FOR_DRIVE' | 'SYNCED';

const UploadZone: React.FC = () => {
  const [webAppUrl, setWebAppUrl] = useState(() => localStorage.getItem('hygr_api_url') || DEFAULT_WEB_APP_URL);
  const [showSettings, setShowSettings] = useState(false);
  
  const [phase, setPhase] = useState<SyncPhase>('IDLE');
  const [category, setCategory] = useState(INITIAL_CATEGORIES[0]);
  const [customName, setCustomName] = useState('');
  const [extension, setExtension] = useState('.mp4');
  const [generatedName, setGeneratedName] = useState('');
  
  // Polling state
  const [pollCount, setPollCount] = useState(0);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    // Auto-generate name when inputs change
    const base = customName.trim() || "Untitled_Scene";
    setGeneratedName(`${category} - ${base}${extension}`);
  }, [category, customName, extension]);

  // Clean up timer
  useEffect(() => {
    return () => stopPolling();
  }, []);

  const handleFileDrop = (e: React.DragEvent | React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    let file: File | undefined;
    
    if ('dataTransfer' in e) {
      file = e.dataTransfer.files?.[0];
    } else {
      file = (e.target as HTMLInputElement).files?.[0];
    }

    if (file) {
      const ext = file.name.substring(file.name.lastIndexOf('.'));
      setExtension(ext);
      // Try to guess name from file if user hasn't typed one
      if (!customName) {
        setCustomName(file.name.replace(ext, '').replace(/_/g, ' '));
      }
      setPhase('RENAMING');
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generatedName);
    // Visual feedback could be added here
  };

  const startWatcher = () => {
    setPhase('WAITING_FOR_DRIVE');
    setPollCount(0);
    // Open Drive in new tab
    window.open(DRIVE_FOLDER_LINK, '_blank');
    
    // Start polling immediately
    timerRef.current = window.setInterval(checkDriveStatus, 5000); // Check every 5s
  };

  const stopPolling = () => {
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const checkDriveStatus = async () => {
    try {
      setPollCount(prev => prev + 1);
      
      const response = await fetch(webAppUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify({
          action: 'scan',
          fileName: generatedName,
          category: category
        })
      });

      const data = await response.json();
      
      if (data.status === 'found') {
        stopPolling();
        setPhase('SYNCED');
      } else if (data.status === 'error') {
        console.error("Backend Error:", data.message);
      }
      
    } catch (e) {
      console.warn("Poll failed, retrying...", e);
    }
  };

  const reset = () => {
    stopPolling();
    setPhase('IDLE');
    setCustomName('');
    setPollCount(0);
  };

  return (
    <div className="space-y-8 animate-fade-up">
      
      {/* --- SETTINGS TOGGLE --- */}
      <div className="flex justify-center">
        <button 
          onClick={() => setShowSettings(!showSettings)}
          className="text-[10px] font-bold uppercase tracking-widest text-slate-600 hover:text-white transition-colors"
        >
          {showSettings ? 'Hide Config' : 'Configure API'}
        </button>
      </div>

      {showSettings && (
        <div className="max-w-md mx-auto glass p-6 rounded-2xl animate-fade-up mb-8">
           <label className="text-[10px] uppercase font-bold text-slate-500 mb-2 block">Web App URL</label>
           <input 
             value={webAppUrl} 
             onChange={(e) => {
               setWebAppUrl(e.target.value);
               localStorage.setItem('hygr_api_url', e.target.value);
             }}
             className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-xs font-mono text-white mb-2" 
           />
           <p className="text-[10px] text-slate-400">Deploy New Version in Apps Script if backend logic changes.</p>
        </div>
      )}


      {/* --- PHASE 1: IDLE (Drag & Drop) --- */}
      {phase === 'IDLE' && (
        <div 
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleFileDrop}
          className="relative glass rounded-[48px] p-12 flex flex-col items-center justify-center min-h-[400px] border-2 border-dashed border-white/10 hover:border-white/30 cursor-pointer transition-all group"
        >
          <div className="w-24 h-24 bg-white text-black rounded-3xl flex items-center justify-center mb-8 shadow-2xl transition-transform group-hover:scale-110 duration-500">
            <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"/></svg>
          </div>
          <h3 className="text-4xl font-bold text-white mb-3">Native Sync</h3>
          <p className="text-slate-400 font-light text-lg">Drop your file to begin robust sync</p>
          <input type="file" onChange={handleFileDrop} className="hidden" id="file-upload" />
          <label htmlFor="file-upload" className="absolute inset-0 cursor-pointer"></label>
        </div>
      )}


      {/* --- PHASE 2: RENAMING (Data Entry) --- */}
      {phase === 'RENAMING' && (
        <div className="max-w-xl mx-auto glass p-8 rounded-[40px] shadow-2xl border-white/5 animate-fade-up">
          <div className="text-center mb-8">
            <h3 className="text-2xl font-bold text-white">Asset Details</h3>
            <p className="text-slate-400 text-sm">Define metadata for the production tracker.</p>
          </div>

          <div className="space-y-6">
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1 mb-2 block">Category</label>
              <select 
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-white/30"
              >
                {INITIAL_CATEGORIES.map(c => <option key={c} value={c} className="text-black">{c}</option>)}
              </select>
            </div>
            
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1 mb-2 block">Scene Name</label>
              <input 
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                placeholder="e.g. Master_Shot_01"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-white/30"
              />
            </div>

            <div className="pt-6 border-t border-white/5">
              <label className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest ml-1 mb-2 block">Generated System Name</label>
              <div className="flex gap-2">
                <div className="flex-grow bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-3 text-emerald-200 font-mono text-sm truncate">
                  {generatedName}
                </div>
                <button 
                  onClick={copyToClipboard}
                  className="bg-white/10 hover:bg-white/20 text-white rounded-xl px-4 transition-colors"
                  title="Copy Name"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>
                </button>
              </div>
            </div>

            <button 
              onClick={startWatcher}
              className="w-full bg-white text-black font-bold py-4 rounded-xl hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl mt-4"
            >
              Start Sync & Open Drive
            </button>
          </div>
        </div>
      )}


      {/* --- PHASE 3: WATCHING (Polling) --- */}
      {phase === 'WAITING_FOR_DRIVE' && (
        <div className="max-w-xl mx-auto text-center py-12 animate-fade-up">
          <div className="mb-8 relative">
            <div className="w-24 h-24 bg-white/5 rounded-full flex items-center justify-center mx-auto border border-white/10 animate-pulse">
               <svg className="w-10 h-10 text-white/50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
            </div>
            <div className="absolute top-0 right-1/2 -mr-12 -mt-2">
              <span className="flex h-4 w-4">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-4 w-4 bg-blue-500"></span>
              </span>
            </div>
          </div>

          <h3 className="text-3xl font-bold text-white mb-2">Watching Drive...</h3>
          <p className="text-slate-400 max-w-sm mx-auto mb-8 font-light leading-relaxed">
            Please rename your file to <br/>
            <span className="text-white font-mono bg-white/10 px-2 rounded mx-1">{generatedName}</span>
            <br/>and upload it to the opened Drive tab.
          </p>

          <div className="inline-flex items-center gap-3 px-6 py-2 rounded-full bg-white/5 border border-white/10">
            <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">
              Scan Attempt: {pollCount}
            </span>
          </div>

          <div className="mt-12">
            <button onClick={() => window.open(DRIVE_FOLDER_LINK, '_blank')} className="text-xs text-blue-400 hover:text-blue-300 underline underline-offset-4">
              Re-open Drive Folder
            </button>
          </div>
        </div>
      )}


      {/* --- PHASE 4: SUCCESS --- */}
      {phase === 'SYNCED' && (
        <div className="text-center animate-fade-up">
           <div className="w-32 h-32 bg-emerald-500 rounded-full flex items-center justify-center mx-auto mb-8 shadow-2xl shadow-emerald-500/20">
              <svg className="w-16 h-16 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"/></svg>
           </div>
           <h2 className="text-5xl font-bold text-white mb-4">Sync Complete</h2>
           <p className="text-slate-400 mb-12">File detected in Drive and registered in Production Sheet.</p>
           
           <button 
             onClick={reset}
             className="px-12 py-4 bg-white text-black font-bold rounded-full hover:scale-105 transition-all"
           >
             Sync Another Asset
           </button>
        </div>
      )}
      
    </div>
  );
};

export default UploadZone;