import { useFavourites } from '@/context/FavouritesContext';
import Link from 'next/link';
import Image from 'next/image';
import Seo from '@/components/Seo';
import FavouriteToggle from '@/components/FavouriteToggle';
import { useState, useCallback, useMemo } from 'react';

type Metafield = {
  key: string;
  value: string;
};


export default function FavouritesPage() {
  const { favourites } = useFavourites();

  const getFieldValue = useCallback(
    (
      item: { metafields?: (Metafield | null)[] },
      key: string
    ): string | null => {
      return (
        item.metafields
          ?.filter((f): f is Metafield => f !== null)
          .find((f) => f.key === key)
          ?.value ?? null
      );
    },
    []
  );


  const extractOptions = useCallback(
    (key: string): string[] => {
      const options = new Set<string>();
      favourites.forEach((item) => {
        const value = getFieldValue(item, key);
        if (value) options.add(value);
      });
      return Array.from(options).sort();
    },
    [favourites, getFieldValue]
  );

  const [selectedMetals, setSelectedMetals] = useState<string[]>([]);
  const [selectedFinishes, setSelectedFinishes] = useState<string[]>([]);
  const [selectedGemColours, setSelectedGemColours] = useState<string[]>([]);
  const [selectedGemTypes, setSelectedGemTypes] = useState<string[]>([]);
  const [selectedFittings, setSelectedFittings] = useState<string[]>([]);
  const [selectedMetalColours, setSelectedMetalColours] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);

  const metalOptions = useMemo(() => extractOptions('metal'), [extractOptions]);
  const finishOptions = useMemo(() => extractOptions('finish'), [extractOptions]);
  const gemColourOptions = useMemo(() => extractOptions('gem_colour'), [extractOptions]);
  const gemTypeOptions = useMemo(() => extractOptions('gem_type'), [extractOptions]);
  const fittingOptions = useMemo(() => extractOptions('fitting'), [extractOptions]);
  const metalColourOptions = useMemo(
    () => extractOptions('metal_colour'),
    [extractOptions]
  );

  const toggle = useCallback(
    (
      value: string,
      selected: string[],
      setFn: React.Dispatch<React.SetStateAction<string[]>>
    ) => {
      setFn(
        selected.includes(value)
          ? selected.filter((v) => v !== value)
          : [...selected, value]
      );
    },
    []
  );

  const renderFilterSection = useCallback(
    (
      label: string,
      options: string[],
      selected: string[],
      setFn: React.Dispatch<React.SetStateAction<string[]>>
    ) => {
      if (options.length === 0) return null;
      return (
        <div style={{ marginBottom: '24px' }}>
          <p style={{ fontSize: '14px', fontWeight: 600, marginBottom: '8px' }}>{label}</p>
          {options.map((option) => (
            <button
              key={option}
              onClick={() => toggle(option, selected, setFn)}
              style={{
                display: 'block',
                width: '100%',
                padding: '8px 12px',
                marginBottom: '6px',
                background: selected.includes(option) ? '#181818' : '#f9f9f9',
                color: selected.includes(option) ? '#fff' : '#181818',
                border: '1px solid #e0e0e0',
                fontSize: '14px',
                cursor: 'pointer',
              }}
            >
              {option}
            </button>
          ))}
        </div>
      );
    },
    [toggle]
  );

  const filteredItems = useMemo(
    () =>
      favourites.filter((item) => {
        const metal = getFieldValue(item, 'metal') || '';
        const finish = getFieldValue(item, 'finish') || '';
        const gemColour = getFieldValue(item, 'gem_colour') || '';
        const gemType = getFieldValue(item, 'gem_type') || '';
        const fitting = getFieldValue(item, 'fitting') || '';
        const metalColour = getFieldValue(item, 'metal_colour') || '';

        const metalMatch = selectedMetals.length ? selectedMetals.includes(metal) : true;
        const finishMatch = selectedFinishes.length ? selectedFinishes.includes(finish) : true;
        const gemColourMatch = selectedGemColours.length ? selectedGemColours.includes(gemColour) : true;
        const gemTypeMatch = selectedGemTypes.length ? selectedGemTypes.includes(gemType) : true;
        const fittingMatch = selectedFittings.length ? selectedFittings.includes(fitting) : true;
        const metalColourMatch = selectedMetalColours.length ? selectedMetalColours.includes(metalColour) : true;

        return (
          metalMatch &&
          finishMatch &&
          gemColourMatch &&
          gemTypeMatch &&
          fittingMatch &&
          metalColourMatch
        );
      }),
    [
      favourites,
      selectedMetals,
      selectedFinishes,
      selectedGemColours,
      selectedGemTypes,
      selectedFittings,
      selectedMetalColours,
      getFieldValue,
    ]
  );

  return (
    <>
      <Seo title="MY FAVOURITES | AURICLE" />

      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '16px 16px 0' }}>
        <h1 style={{ fontSize: '30px', fontWeight: 900 }}>My Favourites</h1>
        {favourites.length === 0 && (
          <p style={{ fontSize: '14px', marginTop: '8px' }}>
            You haven’t added any favourites yet.
          </p>
        )}
      </div>

      <main className="collection-page">
        <aside className="filters-desktop">
          {renderFilterSection('Metal', metalOptions, selectedMetals, setSelectedMetals)}
          {renderFilterSection('Finish', finishOptions, selectedFinishes, setSelectedFinishes)}
          {renderFilterSection('Gem Colour', gemColourOptions, selectedGemColours, setSelectedGemColours)}
          {renderFilterSection('Gem Type', gemTypeOptions, selectedGemTypes, setSelectedGemTypes)}
          {renderFilterSection('Fitting', fittingOptions, selectedFittings, setSelectedFittings)}
          {renderFilterSection('Metal Colour', metalColourOptions, selectedMetalColours, setSelectedMetalColours)}
        </aside>

        <section id="product-grid" className="product-grid">
          {filteredItems.map((item, index) => (
            <Link href={`/product/${item.handle}`} key={item.handle} className="product-card">
              <div className="product-card-inner">
                <div className="product-image-wrapper">
                  <Image
                    src={item.image || '/placeholder.png'}
                    alt={item.title}
                    width={1200}
                    height={1500}
                    priority={index === 0}
                    fetchPriority={index === 0 ? 'high' : undefined}
                    style={{
                      objectFit: 'cover',
                      width: '100%',
                      height: 'auto',
                      display: 'block',
                    }}
                    sizes="(min-width: 1400px) 350px, (min-width: 1024px) 25vw, (min-width: 768px) 50vw, 100vw"
                  />
                  <FavouriteToggle
                    handle={item.handle}
                    title={item.title}
                    image={item.image}
                    price={item.price}
                    metafields={item.metafields}
                  />
                </div>
                <h2 style={{ marginTop: '8px', fontSize: '13px', fontWeight: 400 }}>{item.title}</h2>
              </div>
            </Link>
          ))}
        </section>

        <button
  className="filter-drawer-toggle"
  onClick={() => setShowFilters(true)}
  aria-label="Open filters"
>
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#181818" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" xmlns="http://www.w3.org/2000/svg">
    <line x1="4" y1="21" x2="4" y2="14"/>
    <line x1="4" y1="10" x2="4" y2="3"/>
    <line x1="12" y1="21" x2="12" y2="12"/>
    <line x1="12" y1="8" x2="12" y2="3"/>
    <line x1="20" y1="21" x2="20" y2="16"/>
    <line x1="20" y1="12" x2="20" y2="3"/>
    <circle cx="4" cy="12" r="2"/>
    <circle cx="12" cy="10" r="2"/>
    <circle cx="20" cy="14" r="2"/>
  </svg>
</button>

        <div
  className={`filter-drawer-backdrop ${showFilters ? 'open' : ''}`}
  onClick={() => setShowFilters(false)}
>
  <div
    className={`filter-drawer ${showFilters ? 'open' : ''}`}
    onClick={(e) => e.stopPropagation()}
  >
    <div style={{ marginBottom: '24px' }}>
      <button
        className="filter-drawer-close"
        onClick={() => setShowFilters(false)}
      >
        Done
      </button>
    </div>

    {renderFilterSection('Metal', metalOptions, selectedMetals, setSelectedMetals)}
    {renderFilterSection('Finish', finishOptions, selectedFinishes, setSelectedFinishes)}
    {renderFilterSection('Gem Colour', gemColourOptions, selectedGemColours, setSelectedGemColours)}
    {renderFilterSection('Gem Type', gemTypeOptions, selectedGemTypes, setSelectedGemTypes)}
    {renderFilterSection('Fitting', fittingOptions, selectedFittings, setSelectedFittings)}
    {renderFilterSection('Metal Colour', metalColourOptions, selectedMetalColours, setSelectedMetalColours)}
  </div>
</div>

      </main>
    </>
  );
}
