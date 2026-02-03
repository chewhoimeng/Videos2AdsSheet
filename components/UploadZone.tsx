import React, { useState, useRef, useEffect } from 'react';
import { UploadStatus } from '../types';

const INITIAL_CATEGORIES = [
  "Deo", "LB", "SS", "Mix", "FO", "HO", "LS", "CT", "BS", "EO", 
  "Dodotint", "BO", "Deo Spray", "Shower Oil", "Perfume Oil", 
  "Powder series", "Plushie", "Bag", "Bungkus", "Roll On", "Tea Series"
];

// Effectively unlimited (1TB)
const MAX_FILE_SIZE_MB = 1000000; 
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

// Default URL - Replace this in code if you want it permanent, 
// otherwise use the UI config that appears on error.
const DEFAULT_WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbzk-eBfjRhYwomYEJgBLs4yc98J1fykdbbAtB3NI8AUaDng6mF1aKdqj8LklrvRpS4/exec';

const UploadZone: React.FC = () => {
  // Load URL from local storage if available, else default
  const [webAppUrl, setWebAppUrl] = useState(() => {
    return localStorage.getItem('hygr_api_url') || DEFAULT_WEB_APP_URL;
  });
  
  const [status, setStatus] = useState<UploadStatus>(UploadStatus.IDLE);
  const [progress, setProgress] = useState(0);
  const [customName, setCustomName] = useState('');
  const [categories, setCategories] = useState<string[]>(INITIAL_CATEGORIES);
  const [category, setCategory] = useState(INITIAL_CATEGORIES[0]);
  const [isAddingNewCategory, setIsAddingNewCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [finalFileName, setFinalFileName] = useState<string | null>(null);
  
  // Specific error state to toggle the Config UI
  const [errorType, setErrorType] = useState<'GENERIC' | 'CONFIG'>('GENERIC');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUrlUpdate = (newUrl: string) => {
    setWebAppUrl(newUrl);
    localStorage.setItem('hygr_api_url', newUrl);
    setErrorMessage(null); // Clear error to try again
  };

  const handleError = (msg: string, isConfigIssue: boolean = false) => {
    setErrorMessage(msg);
    setErrorType(isConfigIssue ? 'CONFIG' : 'GENERIC');
    setStatus(UploadStatus.IDLE);
    setProgress(0);
  };

  const startUploadProcess = async (file: File) => {
    setErrorMessage(null);

    if (file.size > MAX_FILE_SIZE_BYTES) {
      handleError(`File is too large.`);
      return;
    }

    const extension = file.name.split('.').pop();
    const baseName = customName.trim() || file.name.split('.').slice(0, -1).join('.');
    const nameToUseForDrive = `${category} - ${baseName}.${extension}`;
    setFinalFileName(nameToUseForDrive);

    setStatus(UploadStatus.UPLOADING);
    setProgress(1);

    try {
      // --- STEP 1: INITIALIZE ---
      const initResponse = await fetch(webAppUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify({
          action: 'initialize',
          fileName: nameToUseForDrive,
          mimeType: file.type || 'application/octet-stream'
        })
      });

      if (!initResponse.ok) {
        throw new Error(`Connection failed (${initResponse.status}). Check API URL.`);
      }
      
      const initData = await initResponse.json();
      
      // Catch "SCRIPT_OUTDATED" or "split" errors
      if (initData.status === 'error') {
        if (initData.message.includes('split') || initData.message.includes('SCRIPT_OUTDATED')) {
          throw new Error('SCRIPT_OUTDATED');
        }
        throw new Error(initData.message);
      }
      
      const uploadUrl = initData.uploadUrl;
      
      // --- STEP 2: DIRECT UPLOAD ---
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('PUT', uploadUrl);
        
        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const percentComplete = (event.loaded / event.total) * 95;
            setProgress(Math.max(5, Math.floor(percentComplete)));
          }
        };

        xhr.onload = () => {
          if (xhr.status === 200 || xhr.status === 201) {
            const responseData = JSON.parse(xhr.responseText);
            resolve(responseData.id); 
          } else {
            reject(new Error(`Drive Upload failed (Status ${xhr.status})`));
          }
        };

        xhr.onerror = () => reject(new Error("Network error during upload to Drive."));
        xhr.send(file);
      })
      .then(async (fileId) => {
         // --- STEP 3: LOGGING ---
         setProgress(98);
         await fetch(webAppUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain' },
            body: JSON.stringify({
              action: 'log',
              fileId: fileId,
              category: category
            })
         });
         
         setProgress(100);
         setTimeout(() => setStatus(UploadStatus.SUCCESS), 500);
      });

    } catch (err: any) {
      console.error("Process failed", err);
      if (err.message === 'SCRIPT_OUTDATED' || (err.message && err.message.includes('split'))) {
         handleError("Backend Script Mismatch. Please Deploy New Version and update URL below.", true);
      } else {
         handleError(err.message || "An unexpected error occurred.");
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMessage(null);
    const file = e.target.files?.[0];
    if (file) {
      if (file.type.startsWith('video/')) {
        startUploadProcess(file);
      } else {
        handleError('Invalid file type. Please upload a video file.');
      }
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      if (file.type.startsWith('video/')) {
        startUploadProcess(file);
      } else {
        handleError('Invalid file type. Please upload a video file.');
      }
    }
  };

  const handleAddNewCategory = () => {
    const trimmed = newCategoryName.trim();
    if (trimmed && !categories.includes(trimmed)) {
      setCategories([...categories, trimmed]);
      setCategory(trimmed);
      setNewCategoryName('');
      setIsAddingNewCategory(false);
    }
  };

  const reset = () => {
    setStatus(UploadStatus.IDLE);
    setProgress(0);
    setCustomName('');
    setFinalFileName(null);
    setErrorMessage(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="space-y-8 animate-fade-up [animation-delay:400ms]">
      {status === UploadStatus.IDLE && (
        <div className="max-w-md mx-auto space-y-6">
          {/* Config Error Section */}
          {errorMessage && errorType === 'CONFIG' && (
            <div className="bg-orange-500/10 border border-orange-500/30 rounded-2xl p-6 backdrop-blur-sm animate-fade-up">
              <h3 className="text-orange-200 font-bold mb-2 flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Action Required: Update API
              </h3>
              <p className="text-orange-200/70 text-xs mb-4">
                The Google Script backend is older than this app. 
                <br/>1. Go to Apps Script Editor.
                <br/>2. Click <strong>Deploy &gt; New Deployment</strong>.
                <br/>3. Copy the <strong>Web app URL</strong> and paste it below.
              </p>
              <div className="flex gap-2">
                <input 
                  type="text" 
                  value={webAppUrl}
                  onChange={(e) => setWebAppUrl(e.target.value)}
                  className="flex-1 bg-black/40 border border-orange-500/30 rounded-lg px-3 py-2 text-xs text-white font-mono"
                  placeholder="https://script.google.com/..."
                />
                <button 
                  onClick={() => handleUrlUpdate(webAppUrl)}
                  className="bg-orange-500 text-black px-4 py-2 rounded-lg text-xs font-bold hover:bg-orange-400"
                >
                  Save & Retry
                </button>
              </div>
            </div>
          )}

          <div>
            <div className="flex justify-between items-end mb-3 ml-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Category</label>
              <button 
                onClick={() => setIsAddingNewCategory(!isAddingNewCategory)} 
                className="text-[10px] text-blue-400 font-bold uppercase hover:text-blue-300 transition-colors"
              >
                {isAddingNewCategory ? 'Cancel' : '+ Add New'}
              </button>
            </div>
            {isAddingNewCategory ? (
              <div className="flex gap-2">
                <input 
                  type="text" 
                  value={newCategoryName} 
                  onChange={(e) => setNewCategoryName(e.target.value)} 
                  className="flex-grow border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-white/40 transition-all bg-white/5 text-white" 
                  placeholder="New category..." 
                  autoFocus 
                  onKeyDown={(e) => e.key === 'Enter' && handleAddNewCategory()}
                />
                <button onClick={handleAddNewCategory} className="px-5 py-2 bg-white text-black text-xs font-bold rounded-xl hover:bg-slate-200 transition-all">Save</button>
              </div>
            ) : (
              <div className="relative">
                <select 
                  value={category} 
                  onChange={(e) => setCategory(e.target.value)} 
                  className="w-full border border-white/10 rounded-xl px-5 py-4 text-base shadow-sm appearance-none focus:outline-none focus:ring-1 focus:ring-white/40 transition-all bg-white/5 cursor-pointer text-white"
                >
                  {categories.map(cat => <option key={cat} value={cat} className="bg-slate-900">{cat}</option>)}
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center px-4 pointer-events-none text-slate-500">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            )}
          </div>

          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3 block ml-1">Video Name</label>
            <input 
              type="text" 
              value={customName} 
              onChange={(e) => setCustomName(e.target.value)} 
              placeholder="e.g. Campaign_Clip_01" 
              className="w-full border border-white/10 rounded-xl px-5 py-4 text-base shadow-sm focus:outline-none focus:ring-1 focus:ring-white/40 transition-all bg-white/5 text-white placeholder:text-slate-600" 
            />
          </div>
        </div>
      )}

      {errorMessage && errorType === 'GENERIC' && (
        <div className="max-w-xl mx-auto animate-fade-up">
          <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4 flex items-start gap-3 shadow-sm backdrop-blur-sm">
            <div className="text-red-400 mt-0.5">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-bold text-red-200">Upload Issue</h3>
              <p className="text-sm text-red-300/80 mt-1 leading-snug">{errorMessage}</p>
            </div>
            <button onClick={() => setErrorMessage(null)} className="text-red-400/50 hover:text-red-400">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        </div>
      )}

      <div className="relative group">
        <div className={`absolute -inset-1 bg-gradient-to-r from-blue-500/10 to-indigo-500/10 rounded-[24px] blur-xl opacity-25 group-hover:opacity-40 transition duration-1000 ${errorMessage ? 'hidden' : 'block'}`}></div>
        <div 
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          className={`relative glass rounded-[24px] p-12 flex flex-col items-center justify-center min-h-[340px] border-2 border-dashed transition-all duration-500 ${status === UploadStatus.IDLE ? 'border-white/10 hover:border-white/40 cursor-pointer' : 'border-transparent'} ${errorMessage ? 'border-red-500/20 bg-red-500/5' : ''}`}
          onClick={() => status === UploadStatus.IDLE && fileInputRef.current?.click()}
        >
          {status === UploadStatus.IDLE && (
            <div className="text-center">
              <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6 shadow-2xl transition-transform group-hover:scale-110 duration-500 ${errorMessage ? 'bg-red-500 text-white' : 'bg-white text-black'}`}>
                {errorMessage ? (
                   <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                   </svg>
                ) : (
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"/>
                  </svg>
                )}
              </div>
              <h3 className={`text-2xl font-bold mb-2 tracking-tight ${errorMessage ? 'text-red-200' : 'text-white'}`}>
                {errorMessage ? 'Try Again' : 'Ready to Sync'}
              </h3>
              <p className="text-slate-500 font-light">
                {errorMessage ? 'Click to upload a valid file' : 'Drag video here or click to browse'}
              </p>
              <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="video/*" className="hidden" />
              <p className="text-slate-600 text-[10px] mt-4 font-mono uppercase tracking-tighter">Capacity: Unlimited (Drive Storage)</p>
            </div>
          )}

          {status === UploadStatus.UPLOADING && (
            <div className="w-full max-w-sm text-center">
              <div className="mb-8">
                <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4 border border-white/10">
                  <svg className="animate-spin h-6 w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-80" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                </div>
                <h3 className="text-xl font-bold mb-1 text-white">Syncing Large Asset</h3>
                <p className="text-slate-500 text-[10px] truncate px-4 font-mono">{finalFileName}</p>
                <p className="text-slate-600 text-[9px] mt-2 italic animate-pulse">Processing large file. Do not close tab.</p>
              </div>
              
              <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden mb-3 shadow-inner">
                <div className="h-full bg-white transition-all duration-300 ease-out" style={{ width: `${progress}%` }}></div>
              </div>
              <div className="flex justify-between items-center px-1">
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Progress</span>
                <span className="text-xs text-white font-semibold">{progress}%</span>
              </div>
            </div>
          )}

          {status === UploadStatus.SUCCESS && (
            <div className="text-center animate-fade-up">
              <div className="w-20 h-20 bg-emerald-500 rounded-full flex items-center justify-center mx-auto mb-8 shadow-2xl shadow-emerald-500/20">
                <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"/>
                </svg>
              </div>
              <h3 className="text-3xl font-bold mb-3 tracking-tight text-white">Sync Successful</h3>
              <p className="text-slate-500 mb-4 font-light italic text-sm">Large file successfully mapped to Drive.</p>
              <div className="bg-white/5 px-6 py-3 rounded-2xl inline-block mb-10 border border-white/10">
                <span className="text-white font-bold text-sm tracking-tight">{finalFileName}</span>
              </div>
              <br/>
              <button 
                onClick={reset} 
                className="px-12 py-4 bg-white text-black text-sm font-bold rounded-full hover:scale-105 active:scale-95 transition-all shadow-xl shadow-white/5"
              >
                Upload Another Asset
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UploadZone;