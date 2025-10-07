import type { GetServerSideProps, GetServerSidePropsContext } from 'next';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import Image from 'next/image';

interface Studio {
  id: number;
  name: string;
  slug: string;
  area: string;
  area_slug: string;
  address?: string;
  logo_url?: string;
}

export const getServerSideProps: GetServerSideProps<{ studios: Studio[] }> = async (
  { params }: GetServerSidePropsContext
) => {
  const area = params?.area as string;

  const { data: studios } = await supabase
    .from('studios')
    .select('*')
    .eq('area_slug', area);

  return {
    props: { studios: studios ?? [] },
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
                    <Image
                      src={studio.logo_url}
                      alt={`${studio.name} logo`}
                      width={160}
                      height={160}
                      sizes="160px"
                      className="studio-logo"
                      // Allows any external logo URLs without configuring next.config images
                      unoptimized
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
