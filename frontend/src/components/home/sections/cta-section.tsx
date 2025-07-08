'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { siteConfig } from '@/lib/home';
import Link from 'next/link';
import { useTheme } from 'next-themes';
import { HexagonBackground } from '@/components/animate-ui/backgrounds/hexagon';
import { VantaWaves } from '@/components/animate-ui/backgrounds/vanta-waves';
import { Novatrix } from '@/components/eldoraui/novatrix';
import Waves from '@/Backgrounds/Waves/Waves';

export function CTASection() {
  const { ctaSection } = siteConfig;
  const { theme, resolvedTheme } = useTheme();
  
  // Background selection
  const [backgroundType, setBackgroundType] = useState<'waves' | 'hexagon' | 'vanta' | 'novatrix'>('waves');

  // Random background selection on mount
  useEffect(() => {
    let backgrounds: string[];
    
    if (resolvedTheme === 'dark') {
      // Dark mode: waves, vanta, and novatrix
      backgrounds = ['waves', 'vanta', 'novatrix'];
    } else {
      // Light mode: waves, hexagon, and novatrix
      backgrounds = ['waves', 'hexagon', 'novatrix'];
    }
    
    const randomBg = backgrounds[Math.floor(Math.random() * backgrounds.length)] as 'waves' | 'hexagon' | 'vanta' | 'novatrix';
    setBackgroundType(randomBg);
  }, [resolvedTheme]);

  // Dynamic wave colors based on theme - subtle gray lines for less jarring effect
  const isDark = resolvedTheme === 'dark';
  const waveColors = {
    lineColor: isDark ? '#666666' : '#888888',
    backgroundColor: isDark ? 'rgba(0, 0, 0, 0.1)' : 'rgba(255, 255, 255, 0.1)',
  };

  // Render background based on selection
  const renderBackground = () => {
    switch (backgroundType) {
      case 'hexagon':
        return <HexagonBackground className="absolute inset-0" />;
      case 'vanta':
        return <VantaWaves className="absolute inset-0" />;
      case 'novatrix':
        return <div className="absolute inset-0"><Novatrix /></div>;
      case 'waves':
      default:
        return (
          <Waves
            lineColor={waveColors.lineColor}
            backgroundColor={waveColors.backgroundColor}
            waveSpeedX={0.02}
            waveSpeedY={0.01}
            waveAmpX={40}
            waveAmpY={20}
            xGap={12}
            yGap={36}
            friction={0.9}
            tension={0.01}
            maxCursorMove={120}
          />
        );
    }
  };

  return (
    <section
      id="cta"
      className="flex flex-col items-center justify-center w-full pt-12 pb-12"
    >
      <div className="w-full max-w-6xl mx-auto px-6">
        <div className="h-[400px] md:h-[400px] overflow-hidden shadow-xl w-full border border-border rounded-xl relative z-20">
          {/* Dynamic Background */}
          {renderBackground()}
          
          {/* Content Overlay */}
          <div className="absolute inset-0 -top-32 md:-top-40 flex flex-col items-center justify-center relative z-10">
            <h1 className="text-white text-4xl md:text-7xl font-medium tracking-tighter max-w-xs md:max-w-xl text-center">
              {ctaSection.title}
            </h1>
            <div className="absolute bottom-10 flex flex-col items-center justify-center gap-2">
              <Link
                href={ctaSection.button.href}
                className="bg-white text-black font-semibold text-sm h-10 w-fit px-4 rounded-full flex items-center justify-center shadow-md"
              >
                {ctaSection.button.text}
              </Link>
              <span className="text-white text-sm">{ctaSection.subtext}</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
