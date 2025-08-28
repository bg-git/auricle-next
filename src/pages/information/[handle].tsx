import type {
  GetStaticPaths,
  GetStaticProps,
  GetStaticPropsContext,
} from 'next';
import { useMemo } from 'react';
import parse from 'html-react-parser';
import DOMPurify from 'dompurify';
import { shopifyFetch } from '@/lib/shopify';
import {
  GET_ALL_PAGES,
  GET_PAGE_BY_HANDLE,
} from '@/lib/shopify-queries';
import Seo from '@/components/Seo';

interface PageSeo {
  title?: string | null;
  description?: string | null;
}

interface PageData {
  title: string;
  bodyHtml: string;
  seo?: PageSeo;
}

interface PageProps {
  page: PageData;
}

export default function InformationPage({ page }: PageProps) {
  const content = useMemo(() => {
    const sanitized =
      typeof window !== 'undefined'
        ? DOMPurify.sanitize(page.bodyHtml)
        : page.bodyHtml;
    return parse(sanitized);
  }, [page.bodyHtml]);

  return (
    <>
      <Seo
        title={page.seo?.title || page.title}
        description={page.seo?.description || undefined}
      />
      <main style={{ padding: '16px' }}>
        <h1 style={{ marginBottom: '16px' }}>{page.title}</h1>
        <div>{content}</div>
      </main>
    </>
  );
}

export const getStaticPaths: GetStaticPaths = async () => {
  const data = await shopifyFetch({ query: GET_ALL_PAGES });

  const paths = data.pages.edges.map(
    (edge: { node: { handle: string } }) => ({
      params: { handle: edge.node.handle },
    })
  );

  return {
    paths,
    fallback: 'blocking',
  };
};

export const getStaticProps: GetStaticProps<PageProps> = async (
  context: GetStaticPropsContext
) => {
  const handle = context.params?.handle;

  if (typeof handle !== 'string') {
    return { notFound: true };
  }

  const data = await shopifyFetch({
    query: GET_PAGE_BY_HANDLE,
    variables: { handle },
  });

  if (!data.pageByHandle) {
    return { notFound: true };
  }

  return {
    props: {
      page: data.pageByHandle,
    },
    revalidate: 60,
  };
};

