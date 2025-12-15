export type Wholesaler = {
  slug: string
  name: string
  countrySlug: string
  countryName: string
  website: string
  logo: string
  description: string
  about: string
}

export const WHOLESALERS: Wholesaler[] = [
  {
    slug: 'modern-mood-body-jewelry',
    name: 'Modern Mood Body Jewelry',
    countrySlug: 'united-states',
    countryName: 'United States',
    website: 'https://www.modernmoodbodyjewelry.com',
    logo: '/logos/modern-mood-logo.jpg',
    description: 'Fine 14k gold piercing jewellery.',
    about:
      'Modern Mood Body Jewelry is a fine jewellery brand founded by Monica and Michelle, producing 14k gold threadless piercing ends featuring genuine diamonds and coloured gemstones.',
  },
]
