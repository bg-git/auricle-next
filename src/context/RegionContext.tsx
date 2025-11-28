// src/context/RegionContext.tsx
import React, { createContext, useContext, type ReactNode } from 'react';
import type { Region } from '@/lib/region';

const RegionContext = createContext<Region>('uk');

interface RegionProviderProps {
  children: ReactNode;
  initialRegion: Region;
}

export const RegionProvider: React.FC<RegionProviderProps> = ({
  children,
  initialRegion,
}) => {
  // Just pass through the region from SSR – no client override
  return (
    <RegionContext.Provider value={initialRegion}>
      {children}
    </RegionContext.Provider>
  );
};

export const useRegion = (): Region => useContext(RegionContext);
