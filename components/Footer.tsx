import React from 'react';

const Footer: React.FC = () => {
  return (
    <footer className="bg-white py-16 px-6 border-t border-slate-100">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
        <p className="text-slate-400 text-xs font-light tracking-wide">
          Copyright © 2024 HYGR Social Media Team. Handcrafted for performance.
        </p>
        <div className="flex gap-10 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
          <a href="#" className="hover:text-slate-900 transition-colors">Privacy Policy</a>
          <a href="#" className="hover:text-slate-900 transition-colors">Terms of Use</a>
          <a href="#" className="hover:text-slate-900 transition-colors">Support</a>
        </div>
      </div>
    </footer>
  );
};

export default Footer;