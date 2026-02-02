import React from 'react';

const Footer: React.FC = () => {
  return (
    <footer className="bg-black py-16 px-6 border-t border-white/5">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
        <p className="text-slate-600 text-[10px] font-bold uppercase tracking-widest">
          &copy; 2024 HYGR Social Media Team
        </p>
        <div className="flex gap-10 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
          <a href="#" className="hover:text-white transition-colors">Privacy</a>
          <a href="#" className="hover:text-white transition-colors">Terms</a>
          <a href="#" className="hover:text-white transition-colors">Support</a>
        </div>
      </div>
    </footer>
  );
};

export default Footer;