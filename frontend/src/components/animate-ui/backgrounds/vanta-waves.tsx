'use client';

import { useEffect, useRef } from 'react';
import { useSidebar } from '@/components/ui/sidebar';

declare global {
  interface Window {
    VANTA: any;
    THREE: any;
  }
}

interface VantaWavesProps {
  children?: React.ReactNode;
  className?: string;
}

export function VantaWaves({ children, className }: VantaWavesProps) {
  const vantaRef = useRef<HTMLDivElement>(null);
  const vantaEffect = useRef<any>(null);
  const observerRef = useRef<MutationObserver | null>(null);
  const { state, open } = useSidebar();

  useEffect(() => {
    // Load Three.js
    const threeScript = document.createElement('script');
    threeScript.src = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r134/three.min.js';
    
    // Load Vanta waves
    const vantaScript = document.createElement('script');
    vantaScript.src = 'https://cdn.jsdelivr.net/npm/vanta@latest/dist/vanta.waves.min.js';
    
    const initVanta = () => {
      if (vantaRef.current && window.VANTA && window.THREE) {
        vantaEffect.current = window.VANTA.WAVES({
          el: vantaRef.current,
          mouseControls: true,
          touchControls: true,
          gyroControls: false,
          minHeight: 200.00,
          minWidth: 200.00,
          scale: 1.00,
          scaleMobile: 1.00,
          color: 0x070707,
          shininess: 32.00,
          waveHeight: 20.00,
          waveSpeed: 1.00,
          zoom: 0.65
        });
      }
    };

    // Handle resize events to update Vanta
    const handleResize = () => {
      if (vantaEffect.current && vantaEffect.current.resize) {
        // Small delay to ensure layout has updated
        setTimeout(() => {
          vantaEffect.current.resize();
        }, 100);
      }
    };

    // Load scripts sequentially
    document.head.appendChild(threeScript);
    
    threeScript.onload = () => {
      document.head.appendChild(vantaScript);
      vantaScript.onload = () => {
        initVanta();
        // Add resize listener after Vanta is initialized
        window.addEventListener('resize', handleResize);
        
        // Create mutation observer with better targeting
        observerRef.current = new MutationObserver((mutations) => {
          let shouldResize = false;
          
          mutations.forEach((mutation) => {
            // Check for sidebar-related changes
            if (mutation.type === 'attributes') {
              const target = mutation.target as Element;
              
              // Monitor data-state changes on sidebar elements
              if (mutation.attributeName === 'data-state' && 
                  target.matches('[data-slot="sidebar"]')) {
                shouldResize = true;
              }
              
              // Monitor class changes that might affect layout
              if (mutation.attributeName === 'class') {
                const classList = target.classList;
                // Check for sidebar-related class changes
                if (Array.from(classList).some(className => 
                    className.includes('sidebar') || 
                    className.includes('collapsed') || 
                    className.includes('expanded'))) {
                  shouldResize = true;
                }
              }
              
              // Monitor style changes that might affect layout
              if (mutation.attributeName === 'style') {
                shouldResize = true;
              }
            }
          });
          
          if (shouldResize) {
            handleResize();
          }
        });
        
        if (observerRef.current) {
          // Observe the entire document for sidebar changes
          observerRef.current.observe(document.documentElement, {
            attributes: true,
            attributeFilter: ['class', 'style', 'data-state', 'data-collapsible'],
            subtree: true
          });
        }
        
        // Additional listener for CSS transitions end
        const handleTransitionEnd = (event: TransitionEvent) => {
          if (event.propertyName === 'width' || event.propertyName === 'left' || event.propertyName === 'right') {
            handleResize();
          }
        };
        
        document.addEventListener('transitionend', handleTransitionEnd);
        
        // Cleanup function for transition listener
        return () => {
          document.removeEventListener('transitionend', handleTransitionEnd);
        };
      };
    };

    return () => {
      if (vantaEffect.current) {
        vantaEffect.current.destroy();
      }
      window.removeEventListener('resize', handleResize);
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
      // Clean up scripts
      if (document.head.contains(threeScript)) {
        document.head.removeChild(threeScript);
      }
      if (document.head.contains(vantaScript)) {
        document.head.removeChild(vantaScript);
      }
    };
  }, []);

  // Effect to handle sidebar state changes
  useEffect(() => {
    if (vantaEffect.current && vantaEffect.current.resize) {
      // Delay to ensure CSS transitions have time to complete
      const timer = setTimeout(() => {
        vantaEffect.current.resize();
      }, 300); // Slightly longer delay for transitions
      
      return () => clearTimeout(timer);
    }
  }, [state, open]);

  return (
    <div 
      ref={vantaRef} 
      className={`absolute inset-0 ${className || ''}`}
      style={{ zIndex: 0 }}
    >
      {children}
    </div>
  );
} 