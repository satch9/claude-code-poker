import { useState, useEffect } from 'react';

export type BreakpointType = 'mobile' | 'tablet' | 'desktop';

export interface BreakpointState {
  breakpoint: BreakpointType;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  width: number;
  height: number;
  isLandscape: boolean;
  isPortrait: boolean;
  isIOS: boolean;
  isSafari: boolean;
}

const getBreakpoint = (width: number): BreakpointType => {
  if (width < 768) return 'mobile';
  if (width < 1024) return 'tablet';
  return 'desktop';
};

// Force mobile detection for iOS devices regardless of width
const forceMobileForIOS = (userAgent: string): boolean => {
  return /iPad|iPhone|iPod/.test(userAgent);
};

export const useBreakpoint = (): BreakpointState => {
  const [breakpointState, setBreakpointState] = useState<BreakpointState>(() => {
    if (typeof window === 'undefined') {
      return {
        breakpoint: 'desktop',
        isMobile: false,
        isTablet: false,
        isDesktop: true,
        width: 1200,
        height: 800,
        isLandscape: true,
        isPortrait: false,
        isIOS: false,
        isSafari: false,
      };
    }

    const width = window.innerWidth;
    const height = window.innerHeight;
    const userAgent = window.navigator.userAgent;
    const isIOS = /iPad|iPhone|iPod/.test(userAgent);
    const isSafari = /Safari/.test(userAgent) && !/Chrome/.test(userAgent);
    
    // Force mobile detection for iOS devices
    const breakpoint = isIOS ? 'mobile' : getBreakpoint(width);
    
    return {
      breakpoint,
      isMobile: breakpoint === 'mobile' || isIOS,
      isTablet: breakpoint === 'tablet' && !isIOS,
      isDesktop: breakpoint === 'desktop' && !isIOS,
      width,
      height,
      isLandscape: width > height,
      isPortrait: height > width,
      isIOS,
      isSafari,
    };
  });

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      const userAgent = window.navigator.userAgent;
      const isIOS = /iPad|iPhone|iPod/.test(userAgent);
      const isSafari = /Safari/.test(userAgent) && !/Chrome/.test(userAgent);
      
      // Force mobile detection for iOS devices
      const breakpoint = isIOS ? 'mobile' : getBreakpoint(width);
      
      setBreakpointState({
        breakpoint,
        isMobile: breakpoint === 'mobile' || isIOS,
        isTablet: breakpoint === 'tablet' && !isIOS,
        isDesktop: breakpoint === 'desktop' && !isIOS,
        width,
        height,
        isLandscape: width > height,
        isPortrait: height > width,
        isIOS,
        isSafari,
      });
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);
    
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, []);

  return breakpointState;
};