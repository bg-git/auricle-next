import { useRouter } from 'next/router';

const slugToLabel: Record<string, string> = {
  'chains-charms': 'Chains & Charms',
  'ends-gems': 'Ends & Gems',
  'backs-bars': 'Backs & Bars',
  'rings-hoops': 'Rings & Hoops'
};

export default function BreadcrumbSchema() {
  const router = useRouter();
  const { pathname, asPath } = router;

  const excluded = ['/', '/account', '/register', '/sign-in', '/reset-password', '/checkout'];
  if (excluded.some((p) => pathname === p || pathname.startsWith(p + '/'))) {
    return null;
  }

  const pathWithoutQuery = asPath.split('?')[0];
  const segments = pathWithoutQuery.split('/').filter(Boolean);

  const breadcrumbs = segments.map((seg, index) => {
    const label = slugToLabel[seg] || seg.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
    const url = '/' + segments.slice(0, index + 1).join('/');
    return { label, url };
  });

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: breadcrumbs.map((bc, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: bc.label,
      item: `https://www.auricle.co.uk${bc.url}`
    }))
  };

  return (
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
  );
}
