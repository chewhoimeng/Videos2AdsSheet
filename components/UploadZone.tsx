import React, { useState, useRef } from 'react';
import { UploadStatus } from '../types';

const INITIAL_CATEGORIES = [
  "Deo", "LB", "SS", "Mix", "FO", "HO", "LS", "CT", "BS", "EO", 
  "Dodotint", "BO", "Deo Spray", "Shower Oil", "Perfume Oil", 
  "Powder series", "Plushie", "Bag", "Bungkus", "Roll On", "Tea Series"
];

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
  const fileInputRef = useRef<HTMLInputElement>(null);

  const startUploadProcess = async (file: File) => {
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
        alert("Upload failed. Verify your Script URL and Permissions.");
        setStatus(UploadStatus.IDLE);
      }
    };
    
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file?.type.startsWith('video/')) startUploadProcess(file);
    else if (file) alert('Please upload a video file.');
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file?.type.startsWith('video/')) startUploadProcess(file);
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

      <div className="relative group">
        <div className="absolute -inset-1 bg-gradient-to-r from-blue-100 to-indigo-100 rounded-[24px] blur opacity-25 group-hover:opacity-40 transition duration-1000"></div>
        <div 
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          className={`relative glass rounded-[24px] p-12 flex flex-col items-center justify-center min-h-[340px] border-2 border-dashed transition-all duration-500 ${status === UploadStatus.IDLE ? 'border-slate-200 hover:border-slate-900 cursor-pointer' : 'border-transparent'}`}
          onClick={() => status === UploadStatus.IDLE && fileInputRef.current?.click()}
        >
          {status === UploadStatus.IDLE && (
            <div className="text-center">
              <div className="w-16 h-16 bg-slate-900 rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl transition-transform group-hover:scale-110 duration-500">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"/>
                </svg>
              </div>
              <h3 className="text-2xl font-bold mb-2 tracking-tight text-slate-900">Ready to Sync</h3>
              <p className="text-slate-400 font-light">Drag video here or click to browse</p>
              <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="video/*" className="hidden" />
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