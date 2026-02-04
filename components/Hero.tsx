import React from 'react';

const Hero: React.FC = () => {
  return (
    <div className="pt-24 pb-12 text-center px-6">
      <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-white mb-4 animate-fade-up">
        Production <span className="text-emerald-500">Auto-Sync</span>.
      </h1>
      <p className="text-lg md:text-xl text-slate-400 max-w-2xl mx-auto font-light leading-relaxed animate-fade-up [animation-delay:200ms]">
        Background automation detects your uploads and updates the sheet instantly.
        <br/><span className="text-sm opacity-50">Just name it, upload it, and close the tab.</span>
      </p>
    </div>
  );
};

export default Hero;