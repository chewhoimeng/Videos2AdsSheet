import React, { useState, useRef } from 'react';
import { UploadStatus } from '../types';

const INITIAL_CATEGORIES = [
  "Deo", "LB", "SS", "Mix", "FO", "HO", "LS", "CT", "BS", "EO", 
  "Dodotint", "BO", "Deo Spray", "Shower Oil", "Perfume Oil", 
  "Powder series", "Plushie", "Bag", "Bungkus", "Roll On", "Tea Series"
];

// Google Apps Script has a strict payload limit. 
// Files larger than ~50MB will likely fail or timeout.
const MAX_FILE_SIZE_MB = 45;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

const UploadZone: React.FC = () => {
  // --- SETTINGS ---
  // Replace this with the URL you got from Google Apps Script "Deploy"
  const WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbyOkmKG17LZKeAj4mlBP7w-rS2O2pVw02zxSq_dUAT34qLQ4eDEVGj-ptP8RCurSrbK/exec'; 

  const [status, setStatus] = useState<UploadStatus>(UploadStatus.IDLE);
  const [progress, setProgress] = useState(0);
  const [customName, setCustomName] = useState('');
  const [categories, setCategories] = useState<string[]>(INITIAL_CATEGORIES);
  const [category, setCategory] = useState(INITIAL_CATEGORIES[0]);
  const [isAddingNewCategory, setIsAddingNewCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [finalFileName, setFinalFileName] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleError = (msg: string) => {
    setErrorMessage(msg);
    setStatus(UploadStatus.IDLE);
    // Auto-clear error after 5 seconds if desired, currently sticking until next action
    // setTimeout(() => setErrorMessage(null), 5000); 
  };

  const startUploadProcess = async (file: File) => {
    setErrorMessage(null); // Clear previous errors

    // Size check
    if (file.size > MAX_FILE_SIZE_BYTES) {
      handleError(`File is too large (${(file.size / 1024 / 1024).toFixed(1)}MB). The limit is ${MAX_FILE_SIZE_MB}MB.`);
      return;
    }

    const reader = new FileReader();
    
    reader.onload = async () => {
      const base64Data = reader.result as string;
      const extension = file.name.split('.').pop();
      const baseName = customName.trim() || file.name.split('.').slice(0, -1).join('.');
      const nameToUseForDrive = `${category} - ${baseName}.${extension}`;

      setFinalFileName(nameToUseForDrive);
      setStatus(UploadStatus.UPLOADING);
      setProgress(20); // Initial progress jump

      try {
        // The real connection to Google Drive and Sheets
        await fetch(WEB_APP_URL, {
          method: 'POST',
          mode: 'no-cors', // Essential for cross-site Google Script calls
          headers: { 'Content-Type': 'text/plain' },
          body: JSON.stringify({
            base64Data: base64Data,
            fileName: nameToUseForDrive,
            category: category
          })
        });

        // Since no-cors doesn't give a response body, we finish the UI here
        setProgress(100);
        setTimeout(() => setStatus(UploadStatus.SUCCESS), 500);

      } catch (err) {
        console.error("Upload failed", err);
        handleError("Connection to Drive failed. Please check your internet or the Script URL.");
      }
    };
    
    reader.onerror = () => {
        handleError("Failed to read the file. It might be corrupted.");
    };
    
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMessage(null); // Clear error on new attempt
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
    setErrorMessage(null); // Clear error on new attempt
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
          <div>
            <div className="flex justify-between items-end mb-3 ml-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Category</label>
              <button 
                onClick={() => setIsAddingNewCategory(!isAddingNewCategory)} 
                className="text-[10px] text-blue-600 font-bold uppercase hover:text-blue-700 transition-colors"
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
                  className="flex-grow border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 transition-all bg-white text-slate-900" 
                  placeholder="New category..." 
                  autoFocus 
                  onKeyDown={(e) => e.key === 'Enter' && handleAddNewCategory()}
                />
                <button onClick={handleAddNewCategory} className="px-5 py-2 bg-slate-900 text-white text-xs font-bold rounded-xl hover:bg-slate-800 transition-all">Save</button>
              </div>
            ) : (
              <div className="relative">
                <select 
                  value={category} 
                  onChange={(e) => setCategory(e.target.value)} 
                  className="w-full border border-slate-200 rounded-xl px-5 py-4 text-base shadow-sm appearance-none focus:outline-none focus:ring-2 focus:ring-slate-900 transition-all bg-white cursor-pointer text-slate-900"
                >
                  {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center px-4 pointer-events-none text-slate-400">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            )}
          </div>

          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 block ml-1">Video Name</label>
            <input 
              type="text" 
              value={customName} 
              onChange={(e) => setCustomName(e.target.value)} 
              placeholder="e.g. Campaign_Clip_01" 
              className="w-full border border-slate-200 rounded-xl px-5 py-4 text-base shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-900 transition-all bg-white text-slate-900" 
            />
          </div>
        </div>
      )}

      {/* Error Message Banner */}
      {errorMessage && (
        <div className="max-w-xl mx-auto animate-fade-up">
          <div className="bg-red-50 border border-red-100 rounded-2xl p-4 flex items-start gap-3 shadow-sm">
            <div className="text-red-500 mt-0.5">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-bold text-red-800">Upload Issue</h3>
              <p className="text-sm text-red-700 mt-1 leading-snug">{errorMessage}</p>
            </div>
            <button onClick={() => setErrorMessage(null)} className="text-red-400 hover:text-red-600">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        </div>
      )}

      <div className="relative group">
        <div className={`absolute -inset-1 bg-gradient-to-r from-blue-100 to-indigo-100 rounded-[24px] blur opacity-25 group-hover:opacity-40 transition duration-1000 ${errorMessage ? 'hidden' : 'block'}`}></div>
        <div 
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          className={`relative glass rounded-[24px] p-12 flex flex-col items-center justify-center min-h-[340px] border-2 border-dashed transition-all duration-500 ${status === UploadStatus.IDLE ? 'border-slate-200 hover:border-slate-900 cursor-pointer' : 'border-transparent'} ${errorMessage ? 'border-red-200 bg-red-50/10' : ''}`}
          onClick={() => status === UploadStatus.IDLE && fileInputRef.current?.click()}
        >
          {status === UploadStatus.IDLE && (
            <div className="text-center">
              <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl transition-transform group-hover:scale-110 duration-500 ${errorMessage ? 'bg-red-500 text-white' : 'bg-slate-900 text-white'}`}>
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
              <h3 className={`text-2xl font-bold mb-2 tracking-tight ${errorMessage ? 'text-red-900' : 'text-slate-900'}`}>
                {errorMessage ? 'Try Again' : 'Ready to Sync'}
              </h3>
              <p className="text-slate-400 font-light">
                {errorMessage ? 'Click to upload a valid file' : 'Drag video here or click to browse'}
              </p>
              <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="video/*" className="hidden" />
              <p className="text-slate-300 text-[10px] mt-4">Max file size: {MAX_FILE_SIZE_MB}MB</p>
            </div>
          )}

          {status === UploadStatus.UPLOADING && (
            <div className="w-full max-w-sm text-center">
              <div className="mb-8">
                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-100">
                  <svg className="animate-spin h-6 w-6 text-slate-900" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                </div>
                <h3 className="text-xl font-bold mb-1 text-slate-900">Syncing with Drive</h3>
                <p className="text-slate-500 text-xs truncate px-4 font-mono">{finalFileName}</p>
              </div>
              
              <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden mb-3">
                <div className="h-full bg-slate-900 transition-all duration-300 ease-out" style={{ width: `${progress}%` }}></div>
              </div>
              <div className="flex justify-between items-center px-1">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Uploading</span>
                <span className="text-xs text-slate-900 font-semibold">{progress}%</span>
              </div>
            </div>
          )}

          {status === UploadStatus.SUCCESS && (
            <div className="text-center animate-fade-up">
              <div className="w-20 h-20 bg-emerald-500 rounded-full flex items-center justify-center mx-auto mb-8 shadow-2xl shadow-emerald-100">
                <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"/>
                </svg>
              </div>
              <h3 className="text-3xl font-bold mb-3 tracking-tight text-slate-900">Sync Successful</h3>
              <p className="text-slate-500 mb-4 font-light italic">Stored in Drive as:</p>
              <div className="bg-slate-50 px-6 py-3 rounded-2xl inline-block mb-10 border border-slate-100">
                <span className="text-slate-900 font-bold text-sm">{finalFileName}</span>
              </div>
              <br/>
              <button 
                onClick={reset} 
                className="px-12 py-4 bg-slate-900 text-white text-sm font-bold rounded-full hover:scale-105 active:scale-95 transition-all shadow-xl shadow-slate-200"
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