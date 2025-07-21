import { useFavourites } from '@/context/FavouritesContext';
import { useEffect, useState } from 'react';

interface FavouriteToggleProps {
  id: string;
  title: string;
  image?: string;
  price?: string;
  size?: number; // Optional icon size
}

export default function FavouriteToggle({ id, title, image, price, size = 20 }: FavouriteToggleProps) {
  const { isFavourite, toggleFavourite } = useFavourites();
  const [active, setActive] = useState(false);

  useEffect(() => {
    setActive(isFavourite(id));
  }, [id, isFavourite]);

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault(); // Prevent navigation if inside a link
    toggleFavourite({ id, title, image, price });
    setActive(!active);
  };

  return (
    <button
      className="favourite-toggle"
      onClick={handleClick}
      aria-label={active ? 'Remove from favourites' : 'Add to favourites'}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        fill={active ? 'red' : 'none'}
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth="2"
        width={size}
        height={size}
        style={{
          display: 'block',
          pointerEvents: 'none',
        }}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 21c-1.1-1.04-5.55-5.08-7.62-7.51C2.64 11.21 2 9.66 2 8.25 2 5.4 4.4 3 7.25 3c1.49 0 2.94.68 3.75 1.75A5.48 5.48 0 0116.75 3C19.6 3 22 5.4 22 8.25c0 1.41-.64 2.96-2.38 5.24C17.55 15.92 13.1 19.96 12 21z"
        />
      </svg>
    </button>
  );
}
