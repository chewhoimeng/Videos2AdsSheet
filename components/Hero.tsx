import React from 'react';

const Hero: React.FC = () => {
  return (
    <div className="pt-24 pb-12 text-center px-6">
      <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-white mb-4 animate-fade-up">
        Creative Flow. <br />
        <span className="text-slate-600">Seamlessly Crafted.</span>
      </h1>
      <p className="text-lg md:text-xl text-slate-400 max-w-2xl mx-auto font-light leading-relaxed animate-fade-up [animation-delay:200ms]">
        The ultimate video portal for HYGR. Upload high-fidelity content directly to Drive, 
        automatically synced to your production trackers.
      </p>
    </div>
  );
};

export default Hero;