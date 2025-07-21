import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

export interface FavouriteItem {
  handle: string; // ✅ used for linking to /product/[handle]
  title: string;
  image?: string;
  price?: string;
  orderAgain?: boolean;
  metafields?: { key: string; value: string }[];
}

interface FavouritesContextType {
  favourites: FavouriteItem[];
  addFavourite: (item: FavouriteItem) => void;
  removeFavourite: (handle: string) => void;
  toggleFavourite: (item: FavouriteItem) => void;
  isFavourite: (handle: string) => boolean;
}

const FavouritesContext = createContext<FavouritesContextType | undefined>(undefined);

const STORAGE_KEY = 'auricle-favourites';

export const FavouritesProvider = ({ children }: { children: ReactNode }) => {
  const [favourites, setFavourites] = useState<FavouriteItem[]>([]);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        setFavourites(JSON.parse(stored));
      } catch {
        setFavourites([]);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(favourites));
  }, [favourites]);

  const addFavourite = (item: FavouriteItem) => {
    if (!favourites.find((f) => f.handle === item.handle)) {
      setFavourites([...favourites, item]);
    }
  };

  const removeFavourite = (handle: string) => {
    setFavourites(favourites.filter((f) => f.handle !== handle));
  };

  const toggleFavourite = (item: FavouriteItem) => {
  if (isFavourite(item.handle)) {
    removeFavourite(item.handle);
  } else {
    addFavourite(item);
  }
};



  const isFavourite = (handle: string) => {
    return favourites.some((f) => f.handle === handle);
  };

  return (
    <FavouritesContext.Provider
      value={{ favourites, addFavourite, removeFavourite, toggleFavourite, isFavourite }}
    >
      {children}
    </FavouritesContext.Provider>
  );
};

export const useFavourites = () => {
  const ctx = useContext(FavouritesContext);
  if (!ctx) throw new Error('useFavourites must be used inside FavouritesProvider');
  return ctx;
};
