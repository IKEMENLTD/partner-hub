import { useState, useEffect } from 'react';

type Breakpoint = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl';

interface ResponsiveState {
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  isWidescreen: boolean;
  isUltrawide: boolean;
  breakpoint: Breakpoint;
}

const breakpoints = {
  xs: 321,
  sm: 481,
  md: 768,
  lg: 1025,
  xl: 1280,
  '2xl': 1441,
  '3xl': 1920,
} as const;

function getBreakpoint(width: number): Breakpoint {
  if (width >= breakpoints['3xl']) return '3xl';
  if (width >= breakpoints['2xl']) return '2xl';
  if (width >= breakpoints.xl) return 'xl';
  if (width >= breakpoints.lg) return 'lg';
  if (width >= breakpoints.md) return 'md';
  if (width >= breakpoints.sm) return 'sm';
  return 'xs';
}

function getState(width: number): ResponsiveState {
  return {
    isMobile: width < breakpoints.lg,
    isTablet: width >= breakpoints.md && width < breakpoints.lg,
    isDesktop: width >= breakpoints.lg,
    isWidescreen: width >= breakpoints['2xl'],
    isUltrawide: width >= breakpoints['3xl'],
    breakpoint: getBreakpoint(width),
  };
}

export function useResponsive(): ResponsiveState {
  const [state, setState] = useState<ResponsiveState>(() => {
    if (typeof window === 'undefined') {
      return getState(1280); // SSR safe default: desktop
    }
    return getState(window.innerWidth);
  });

  useEffect(() => {
    const queries = Object.entries(breakpoints).map(([key, value]) => ({
      key,
      mql: window.matchMedia(`(min-width: ${value}px)`),
    }));

    const update = () => {
      setState(getState(window.innerWidth));
    };

    queries.forEach(({ mql }) => {
      mql.addEventListener('change', update);
    });

    // Sync on mount
    update();

    return () => {
      queries.forEach(({ mql }) => {
        mql.removeEventListener('change', update);
      });
    };
  }, []);

  return state;
}
