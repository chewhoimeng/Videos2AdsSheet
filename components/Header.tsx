import React from 'react';

const Header: React.FC = () => {
  return (
    <nav className="sticky top-0 z-50 glass h-14 flex items-center justify-between px-6 md:px-12">
      <div className="flex items-center gap-6">
        <a href="#" className="font-bold text-lg tracking-tight text-slate-900">HYGR</a>
        <div className="hidden md:flex gap-6 text-xs font-bold text-slate-500 uppercase tracking-widest">
          <span className="cursor-pointer hover:text-slate-900 transition-colors">Workspace</span>
          <span className="cursor-pointer hover:text-slate-900 transition-colors">Archive</span>
          <span className="cursor-pointer hover:text-slate-900 transition-colors">Settings</span>
        </div>
      </div>
      <div className="flex items-center">
        <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center overflow-hidden border border-white shadow-sm">
          <img src="https://picsum.photos/64/64" alt="Avatar" className="w-full h-full object-cover" />
        </div>
      </div>
    </nav>
  );
};

export default Header;