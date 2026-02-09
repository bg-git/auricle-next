export interface StarterKit {
  slug: string;
  title: string;
  tag: string;
  productLimit: number; // pieces + stand
  description: string;
  image?: string;
}

export const STARTER_KITS: StarterKit[] = [
  {
    slug: 'polished-ti-30pc',
    title: '31pc Polished Titanium Ends & Gems Starter Kit',
    tag: 'polished-ti-starter',
    productLimit: 31,
    description: 'Discover the beauty of polished titanium with our curated collection of 30 best-selling pieces. Each item is dynamically selected based on current sales trends, so your kit always features our most popular items. Plus a display stand.',
    image: '/images/starter-kit-30pc-polished-titanium-ends-gems.jpg',
  },
  {
    slug: 'gold-titanium-30pc',
    title: '31pc Gold Titanium Ends & Gems Starter Kit',
    tag: 'gold-titanium-starter',
    productLimit: 31,
    description: 'A comprehensive introduction to premium gold titanium jewellery. This collection features our 30 best-selling gold titanium pieces, dynamically updated based on current trends. Always current with what your customers love. Plus a display stand.',
    image: '/images/starter-kit-30pc-gold-titanium-ends-gems.jpg',
  },
  {
    slug: 'polished-ti-20pc',
    title: '21pc Polished Titanium Ends & Gems Starter Kit',
    tag: 'polished-ti-starter',
    productLimit: 21,
    description: 'Discover the beauty of polished titanium with our curated collection of 20 best-selling pieces. Each item is dynamically selected based on current sales trends, so your kit always features our most popular items. Plus a display stand.',
    image: '/images/starter-kit-20pc-polished-titanium-ends-gems.jpg',
  },
  {
    slug: 'gold-titanium-20pc',
    title: '21pc Gold Titanium Ends & Gems Starter Kit',
    tag: 'gold-titanium-starter',
    productLimit: 21,
    description: 'A perfect introduction to premium gold titanium jewellery. This collection features our 20 best-selling gold titanium pieces, dynamically updated based on current trends. Always current with what your customers love. Plus a display stand.',
    image: '/images/starter-kit-20pc-gold-titanium-ends-gems.jpg',
  },
  {
    slug: 'white-gold-30pc',
    title: '31pc 14k White Gold Ends & Gems Starter Kit',
    tag: 'white-gold-starter',
    productLimit: 31,
    description: 'Experience the timeless elegance of white gold with our collection of 30 best-selling pieces. Each item is dynamically selected based on current sales trends, ensuring you always get the most popular white gold options. Plus a display stand.',
    image: '/images/starter-kit-30pc-14k-white-gold-ends-gems.jpg',
  },
  {
    slug: 'yellow-gold-30pc',
    title: '31pc 14k Yellow Gold Ends & Gems Starter Kit',
    tag: 'yellow-gold-starter',
    productLimit: 31,
    description: 'Embrace the warmth and luxury of yellow gold with our collection of 30 best-selling pieces. Each item is dynamically selected based on current sales trends, ensuring you always get the most popular yellow gold options. Plus a display stand.',
    image: '/images/starter-kit-30pc-14k-yellow-gold-ends-gems.jpg',
  },
  {
    slug: 'white-gold-20pc',
    title: '21pc 14k White Gold Ends & Gems Starter Kit',
    tag: 'white-gold-starter',
    productLimit: 21,
    description: 'Experience the timeless elegance of white gold with our collection of 20 best-selling pieces. Each item is dynamically selected based on current sales trends, ensuring you always get the most popular white gold options. Plus a display stand.',
    image: '/images/starter-kit-20pc-14k-white-gold-ends-gems.jpg',
  },
  {
    slug: 'yellow-gold-20pc',
    title: '21pc 14k Yellow Gold Ends & Gems Starter Kit',
    tag: 'yellow-gold-starter',
    productLimit: 21,
    description: 'Embrace the warmth and luxury of yellow gold with our collection of 20 best-selling pieces. Each item is dynamically selected based on current sales trends, ensuring you always get the most popular yellow gold options. Plus a display stand.',
    image: '/images/starter-kit-20pc-14k-yellow-gold-ends-gems.jpg',
  },
];

export const getStarterKitBySlug = (slug: string): StarterKit | undefined => {
  return STARTER_KITS.find((kit) => kit.slug === slug);
};
