
import React, { useState, useRef } from 'react';
import { UploadStatus } from '../types';

const INITIAL_CATEGORIES = [
  "Deo", "LB", "SS", "Mix", "FO", "HO", "LS", "CT", "BS", "EO", 
  "Dodotint", "BO", "Deo Spray", "Shower Oil", "Perfume Oil", 
  "Powder series", "Plushie", "Bag", "Bungkus", "Roll On", "Tea Series"
];

const CHUNK_SIZE = 2 * 1024 * 1024; // 2MB chunks for smooth progress
const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024 * 1024; // 20GB limit

// REPLACE THIS LINK with your actual Apps Script Web App URL for a permanent fix
const DEFAULT_WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbxxk66Ir54a-6iFbAHmgX-Q3jal9fkW5z_uB7Fyx54Y3bdXYZN71n3L_5XAfV75PEJI/exec';

type SyncPhase = 'IDLE' | 'INITIALIZING' | 'TRANSFERRING' | 'FINALIZING';

const UploadZone: React.FC = () => {
  const [webAppUrl, setWebAppUrl] = useState(() => localStorage.getItem('hygr_api_url') || DEFAULT_WEB_APP_URL);
  const [showSettings, setShowSettings] = useState(false);
  const [testStatus, setTestStatus] = useState<'IDLE' | 'TESTING' | 'OK' | 'FAIL'>('IDLE');
  
  const [status, setStatus] = useState<UploadStatus>(UploadStatus.IDLE);
  const [phase, setPhase] = useState<SyncPhase>('IDLE');
  const [progress, setProgress] = useState(0);
  const [customName, setCustomName] = useState('');
  const [category, setCategory] = useState(INITIAL_CATEGORIES[0]);
  const [finalFileName, setFinalFileName] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const testConnection = async () => {
    setTestStatus('TESTING');
    try {
      const res = await fetch(webAppUrl);
      if (res.ok) setTestStatus('OK');
      else throw new Error();
    } catch {
      setTestStatus('FAIL');
    }
    setTimeout(() => setTestStatus('IDLE'), 3000);
  };

  const saveUrl = (url: string) => {
    const cleanUrl = url.trim();
    setWebAppUrl(cleanUrl);
    localStorage.setItem('hygr_api_url', cleanUrl);
  };

  const uploadChunk = (chunk: Blob, start: number, end: number, total: number, url: string): Promise<any> => {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('PUT', url, true);
      xhr.setRequestHeader('Content-Range', `bytes ${start}-${end - 1}/${total}`);
      
      xhr.onload = () => {
        if (xhr.status === 308) {
          resolve({ complete: false });
        } else if (xhr.status === 200 || xhr.status === 201) {
          try {
            const responseData = JSON.parse(xhr.responseText);
            resolve({ complete: true, data: responseData });
          } catch (e) {
            // If Drive returns success but no JSON, we try to recover the ID from elsewhere or just assume it worked
            resolve({ complete: true, data: { id: "UNKNOWN_ID" } });
          }
        } else {
          reject(new Error(`Drive Server Error: ${xhr.status}`));
        }
      };
      
      xhr.onerror = () => reject(new Error("Upload interrupted. Check your internet connection."));
      xhr.send(chunk);
    });
  };

  const startSync = async (file: File) => {
    setErrorMessage(null);
    if (file.size > MAX_FILE_SIZE_BYTES) {
      setErrorMessage("File exceeds the 20GB threshold.");
      return;
    }

    const extension = file.name.split('.').pop();
    const cleanBaseName = customName.trim() || file.name.split('.').slice(0, -1).join('.');
    const fileNameForCloud = `${category} - ${cleanBaseName}.${extension}`;
    setFinalFileName(fileNameForCloud);
    
    setStatus(UploadStatus.UPLOADING);
    setPhase('INITIALIZING');
    setProgress(2);

    try {
      // 1. Establish Session
      const initReq = await fetch(webAppUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' }, // Avoids CORS preflight
        body: JSON.stringify({ 
          action: 'initialize', 
          fileName: fileNameForCloud, 
          mimeType: file.type || 'video/mp4' 
        })
      });
      
      const initRes = await initReq.json();
      if (initRes.status === 'error') throw new Error(initRes.message);

      // 2. Resumable Upload
      setPhase('TRANSFERRING');
      let start = 0;
      let driveFileId = "";
      
      while (start < file.size) {
        const end = Math.min(start + CHUNK_SIZE, file.size);
        const chunk = file.slice(start, end);
        
        const result = await uploadChunk(chunk, start, end, file.size, initRes.uploadUrl);
        
        if (result.complete) {
          driveFileId = result.data.id;
        }
        
        start = end;
        // Progress: starts at 10%, ends at 90%
        const percent = Math.floor(10 + (start / file.size) * 80);
        setProgress(percent);
      }

      // 3. Log to Sheet
      setPhase('FINALIZING');
      setProgress(95);
      
      const logReq = await fetch(webAppUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify({ 
          action: 'log', 
          fileId: driveFileId, 
          category: category 
        })
      });
      
      const logRes = await logReq.json();
      if (logRes.status === 'error') throw new Error(logRes.message);

      setProgress(100);
      setTimeout(() => {
        setStatus(UploadStatus.SUCCESS);
        setPhase('IDLE');
      }, 800);

    } catch (err: any) {
      console.error("Sync Error:", err);
      setStatus(UploadStatus.IDLE);
      setPhase('IDLE');
      setErrorMessage(err.message || "An unexpected error occurred. Verify your Apps Script URL.");
    }
  };

  const resetPortal = () => {
    setStatus(UploadStatus.IDLE);
    setErrorMessage(null);
    setCustomName('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="space-y-10 animate-fade-up">
      {/* Configuration Panel */}
      <div className="flex justify-center">
        <button 
          onClick={() => setShowSettings(!showSettings)}
          className={`flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] px-5 py-2.5 rounded-full border transition-all duration-300 ${showSettings ? 'bg-white text-black border-white shadow-lg' : 'text-slate-500 border-white/10 hover:border-white/30 hover:bg-white/5'}`}
        >
          <svg className={`w-3.5 h-3.5 transition-transform duration-500 ${showSettings ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37a1.724 1.724 0 002.572-1.065z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
          {showSettings ? 'Close Setup' : 'Configure Connection'}
        </button>
      </div>

      {showSettings && (
        <div className="max-w-md mx-auto glass p-8 rounded-[32px] border-blue-500/30 animate-fade-up shadow-2xl">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center">
              <span className="text-blue-400 text-xs font-bold">API</span>
            </div>
            <h4 className="text-sm font-bold text-white tracking-tight">Sync Endpoint</h4>
          </div>
          
          <div className="space-y-4">
            <input 
              type="text" 
              value={webAppUrl} 
              onChange={(e) => saveUrl(e.target.value)}
              className="w-full bg-black/40 border border-white/10 rounded-2xl px-5 py-4 text-[11px] font-mono text-blue-100/70 outline-none focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/10 transition-all"
              placeholder="Paste Google Apps Script Web App URL..."
            />
            
            <button 
              onClick={testConnection}
              disabled={testStatus === 'TESTING'}
              className={`w-full py-4 rounded-2xl text-[10px] font-bold uppercase tracking-[0.2em] transition-all duration-300 flex items-center justify-center gap-2 ${
                testStatus === 'OK' ? 'bg-emerald-500 text-white' : 
                testStatus === 'FAIL' ? 'bg-red-500 text-white' : 
                'bg-white text-black hover:bg-slate-200 shadow-xl'
              }`}
            >
              {testStatus === 'IDLE' && 'Verify API Status'}
              {testStatus === 'TESTING' && (
                <>
                  <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg>
                  Connecting...
                </>
              )}
              {testStatus === 'OK' && 'Status: Operational'}
              {testStatus === 'FAIL' && 'Status: Unreachable'}
            </button>
          </div>
          
          <div className="mt-6 flex gap-3 p-4 bg-white/5 rounded-2xl border border-white/5">
            <svg className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
            <p className="text-[10px] text-slate-400 leading-relaxed">
              Ensure you have clicked <strong>Deploy > New Deployment</strong> and authorized the script by running <code>setupPermissions</code> in the editor.
            </p>
          </div>
        </div>
      )}

      {/* Main Upload Form */}
      {status === UploadStatus.IDLE && !showSettings && (
        <div className="max-w-md mx-auto space-y-6">
          {errorMessage && (
            <div className="bg-red-500/10 border border-red-500/30 p-5 rounded-3xl text-red-200 text-[11px] flex gap-4 animate-fade-up shadow-xl">
              <div className="w-6 h-6 rounded-full bg-red-500/20 flex items-center justify-center shrink-0">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
              </div>
              <div>
                <p className="font-bold mb-1 uppercase tracking-wider">Sync Blocked</p>
                <p className="opacity-80 leading-relaxed">{errorMessage}</p>
              </div>
            </div>
          )}

          <div className="glass p-8 rounded-[40px] space-y-8 border-white/5 shadow-2xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 blur-3xl rounded-full -mr-16 -mt-16 group-hover:bg-white/10 transition-colors"></div>
            
            <div className="relative">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.25em] block mb-4 ml-1">Asset Category</label>
              <div className="relative">
                <select 
                  value={category} 
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-5 text-white appearance-none focus:border-white/30 outline-none cursor-pointer transition-all hover:bg-white/[0.08]"
                >
                  {INITIAL_CATEGORIES.map(c => <option key={c} value={c} className="bg-slate-900">{c}</option>)}
                </select>
                <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7"/></svg>
                </div>
              </div>
            </div>

            <div className="relative">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.25em] block mb-4 ml-1">Label / Scene Name</label>
              <input 
                type="text" 
                value={customName} 
                onChange={(e) => setCustomName(e.target.value)}
                placeholder="e.g. Master_Bungkus_Shot_02"
                className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-5 text-white focus:border-white/30 outline-none placeholder:text-white/20 transition-all hover:bg-white/[0.08]"
              />
            </div>
          </div>
        </div>
      )}

      {/* Dropzone / Progress Area */}
      <div className="max-w-2xl mx-auto">
        <div 
          onClick={() => status === UploadStatus.IDLE && fileInputRef.current?.click()}
          className={`relative glass rounded-[56px] p-12 flex flex-col items-center justify-center min-h-[440px] border-2 border-dashed transition-all duration-1000 ${status === UploadStatus.IDLE ? 'border-white/10 hover:border-white/50 cursor-pointer shadow-[0_40px_100px_rgba(0,0,0,0.4)] hover:scale-[1.01] bg-gradient-to-b from-white/[0.02] to-transparent' : 'border-transparent'}`}
        >
          {status === UploadStatus.IDLE && (
            <div className="text-center group">
              <div className="w-28 h-28 rounded-[40px] bg-white text-black flex items-center justify-center mx-auto mb-10 transition-all duration-700 group-hover:scale-110 group-hover:rotate-6 shadow-[0_20px_50px_rgba(255,255,255,0.2)]">
                <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"/></svg>
              </div>
              <h3 className="text-5xl font-bold text-white mb-4 tracking-tighter">Drop Video</h3>
              <p className="text-slate-400 font-light mb-14 text-xl tracking-tight">Tap to browse or drop production media</p>
              
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={(e) => e.target.files?.[0] && startSync(e.target.files[0])} 
                accept="video/*" 
                className="hidden" 
              />
              
              <div className="flex gap-4 justify-center">
                <div className="text-[10px] font-bold border border-white/10 rounded-full px-6 py-2.5 bg-white/5 text-slate-500 uppercase tracking-[0.2em]">MAX 20GB</div>
                <div className="text-[10px] font-bold border border-white/10 rounded-full px-6 py-2.5 bg-white/5 text-slate-500 uppercase tracking-[0.2em]">AES-256</div>
              </div>
            </div>
          )}

          {status === UploadStatus.UPLOADING && (
            <div className="w-full max-w-md text-center">
              <div className="mb-16">
                <div className="relative w-32 h-32 mx-auto mb-10">
                   <div className="absolute inset-0 rounded-full border-[8px] border-white/5"></div>
                   <div className="absolute inset-0 rounded-full border-[8px] border-white border-t-transparent animate-spin shadow-[0_0_40px_rgba(255,255,255,0.15)]"></div>
                   <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-2xl font-bold font-mono text-white tracking-tighter">{progress}%</span>
                   </div>
                </div>
                
                <h3 className="text-3xl font-bold text-white mb-4 tracking-tight">Pushing Stream</h3>
                
                <div className="inline-flex items-center gap-3 px-5 py-2 rounded-full bg-white/5 border border-white/10">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse shadow-[0_0_10px_rgba(59,130,246,0.8)]"></span>
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.25em]">
                    {phase === 'INITIALIZING' && 'Allocating Cloud Storage'}
                    {phase === 'TRANSFERRING' && 'Streaming Binary Blocks'}
                    {phase === 'FINALIZING' && 'Verifying Integrity'}
                  </span>
                </div>
              </div>
              
              <div className="h-4 w-full bg-white/5 rounded-full overflow-hidden mb-8 shadow-inner relative">
                <div 
                  className="h-full bg-gradient-to-r from-blue-600 via-indigo-500 to-white transition-all duration-700 ease-out shadow-[0_0_30px_rgba(59,130,246,0.6)]" 
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
              
              <div className="flex justify-center items-center gap-3">
                 <svg className="w-4 h-4 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"/></svg>
                 <p className="text-[11px] font-mono text-slate-500 uppercase tracking-[0.25em] truncate max-w-[280px]">{finalFileName}</p>
              </div>
            </div>
          )}

          {status === UploadStatus.SUCCESS && (
            <div className="text-center animate-fade-up">
              <div className="w-32 h-32 bg-emerald-500 rounded-full flex items-center justify-center mx-auto mb-12 shadow-[0_0_120px_rgba(16,185,129,0.4)] transition-transform hover:scale-105 duration-700">
                <svg className="w-16 h-16 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M5 13l4 4L19 7"/></svg>
              </div>
              <h2 className="text-6xl font-bold text-white mb-6 tracking-tighter">Sync Verified</h2>
              <p className="text-slate-400 mb-16 text-xl max-w-sm mx-auto font-light leading-relaxed">
                The asset has been securely staged in Drive and registered in the production master.
              </p>
              <button 
                onClick={resetPortal} 
                className="px-24 py-6 bg-white text-black text-sm font-bold rounded-3xl hover:scale-105 active:scale-95 transition-all shadow-2xl tracking-widest uppercase"
              >
                New Sync
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UploadZone;
