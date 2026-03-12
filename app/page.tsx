'use client';

import { useState, useEffect } from 'react';
import SplashScreen from '@/components/SplashScreen';
import HeroContent from '@/components/HeroContent';
import HeroGraphic from '@/components/HeroGraphic';

export default function Home() {
  const [isLoading, setIsLoading] = useState(true);
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    const fadeTimer = setTimeout(() => setFadeOut(true), 2000);
    const hideTimer = setTimeout(() => setIsLoading(false), 3000);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(hideTimer);
    };
  }, []);

  if (isLoading) {
    return <SplashScreen fadeOut={fadeOut} />;
  }

  return (
    <main className="min-h-screen bg-[#050505] flex items-center relative overflow-hidden font-sans">
      <div className="max-w-7xl mx-auto px-6 lg:px-12 w-full flex flex-col md:flex-row items-center justify-between z-10">
        <HeroContent />
        <HeroGraphic />
      </div>
    </main>
  );
}
