import { useFavourites } from '@/context/FavouritesContext';
import { useEffect, useState, memo } from 'react';

interface FavouriteToggleProps {
  handle: string;
  title: string;
  image?: string;
  price?: string;
  metafields?: { key: string; value: string }[];
}

function FavouriteToggle({
  handle,
  title,
  image,
  price,
  metafields,
}: FavouriteToggleProps) {
  const { isFavourite, toggleFavourite } = useFavourites();
  const [active, setActive] = useState(false);

  useEffect(() => {
    setActive(isFavourite(handle));
  }, [handle, isFavourite]);

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    toggleFavourite({ handle, title, image, price, metafields });
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
        width="20"
        height="20"
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

export default memo(FavouriteToggle);

