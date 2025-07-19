import { GetServerSideProps } from 'next';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

interface Studio {
  id: number;
  name: string;
  slug: string;
  area: string;
  area_slug: string;
  address?: string;
  logo_url?: string;
}

export const getServerSideProps: GetServerSideProps = async ({ params }) => {
  const area = params?.area as string;

  const { data: studios } = await supabase
    .from('studios')
    .select('*')
    .eq('area_slug', area);

  return {
    props: {
      studios: studios ?? [],
    },
  };
};

export default function AreaPage({ studios }: { studios: Studio[] }) {
  const areaName = studios[0]?.area || 'this area';

  return (
    <div className="studio-list">
      <h1>Piercing Studios in {areaName}</h1>

      {studios.length === 0 ? (
        <p>No studios found in this area yet.</p>
      ) : (
        <div className="studio-grid">
          {studios.map((studio) => (
            <div className="studio-card" key={studio.id}>
              <Link href={`/piercing/${studio.area_slug}/${studio.slug}`}>
                <div>
                  {studio.logo_url && (
                    <img
                      src={studio.logo_url}
                      alt={`${studio.name} logo`}
                      className="studio-logo"
                    />
                  )}
                  <h2>{studio.name}</h2>
                  {studio.address && (
                    <p className="studio-address">{studio.address}</p>
                  )}
                </div>
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
