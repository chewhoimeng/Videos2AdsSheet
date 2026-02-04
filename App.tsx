import React from 'react';
import Header from './components/Header';
import Hero from './components/Hero';
import UploadZone from './components/UploadZone';
import Footer from './components/Footer';

const App: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col selection:bg-black selection:text-white">
      <Header />
      <main className="flex-grow">
        <Hero />
        <section className="max-w-4xl mx-auto px-6 pb-24">
          <UploadZone />
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default App;