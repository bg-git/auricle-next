import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

export interface FavouriteItem {
  id: string; // variantId or handle
  title: string;
  image?: string;
  price?: string;
  orderAgain?: boolean;
}

interface FavouritesContextType {
  favourites: FavouriteItem[];
  addFavourite: (item: FavouriteItem) => void;
  removeFavourite: (id: string) => void;
  toggleFavourite: (item: FavouriteItem) => void;
  isFavourite: (id: string) => boolean;
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
    if (!favourites.find((f) => f.id === item.id)) {
      setFavourites([...favourites, item]);
    }
  };

  const removeFavourite = (id: string) => {
    setFavourites(favourites.filter((f) => f.id !== id));
  };

  const toggleFavourite = (item: FavouriteItem) => {
    isFavourite(item.id) ? removeFavourite(item.id) : addFavourite(item);
  };

  const isFavourite = (id: string) => {
    return favourites.some((f) => f.id === id);
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
