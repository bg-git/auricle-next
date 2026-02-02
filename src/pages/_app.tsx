// pages/_app.tsx
import App, { type AppContext, type AppProps } from 'next/app';
import Head from 'next/head';
import dynamic from 'next/dynamic';
import { useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import { Analytics } from '@vercel/analytics/next';

import { RegionProvider } from '@/context/RegionContext';
import { getRegionFromHost, type Region } from '@/lib/region';

import '@/styles/globals.css';
import '@/styles/pages/home.scss';
import '@/styles/pages/footer.scss';
import '@/styles/pages/product.scss';
import '@/styles/pages/collection.scss';
import '@/styles/pages/CartDrawer.scss';
import '@/styles/pages/register.scss';
import '@/styles/pages/sign-in.scss';
import '@/styles/pages/account.scss';
import '@/styles/pages/studio-list.scss';
import '@/styles/pages/studio-page.scss';
import '@/styles/pages/search.scss';
import '@/styles/pages/filters.scss';
import '@/styles/pages/resetPassword.scss';
import '@/styles/pages/blog-page.scss';
import '@/styles/pages/blog.scss';
import '@/styles/pages/information.scss';
import '@/styles/pages/quality-assurance.scss';
import '@/styles/pages/register-modal.scss';
import '@/styles/pages/region-selector.scss';
import '@/styles/pages/vip-membership.scss';
import '@/styles/pages/admin.scss';
import '@/styles/pages/piercing-wholesalers.scss';

import Header from '@/components/Header';
import Footer from '@/components/Footer';
import BreadcrumbSchema from '@/components/BreadcrumbSchema';
import AccountCompletionBanner from '@/components/AccountCompletionBanner';
import { CartProvider } from '@/context/CartContext';
import { AuthProvider } from '@/context/AuthContext';
import { FavouritesProvider } from '@/context/FavouritesContext';
import { ToastProvider } from '@/context/ToastContext';
import { ChatDrawerProvider } from '@/context/ChatDrawerContext';
import { AccountValidationProvider } from '@/context/AccountValidationContext';
import type { ShopifyCustomer } from '@/lib/verifyCustomerSession';

const CartDrawer = dynamic(() => import('@/components/CartDrawer'), { ssr: false });
const ChatDrawer = dynamic(() => import('@/components/ChatDrawer'), { ssr: false });

interface MyAppProps extends AppProps {
  pageProps: {
    customer?: ShopifyCustomer | null;
    region?: Region;
    noLayout?: boolean; // when true, _app.tsx will NOT wrap with header/footer
    [key: string]: unknown;
  };
}

export default function MyApp({ Component, pageProps }: MyAppProps) {
  const initialRegion: Region = pageProps.region ?? 'uk';
  const noLayout = pageProps.noLayout === true;

  // ------------------------------
  // Scroll restoration (fixes: back to "/" not remembering position)
  // ------------------------------
  const router = useRouter();
  const isPopState = useRef(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // We handle restoration ourselves (SSR pages often won't restore reliably otherwise)
    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual';
    }

    router.beforePopState(() => {
      isPopState.current = true;
      return true;
    });

    const keyFor = (asPath: string) => `scroll:${asPath}`;

    const save = (asPath: string) => {
      try {
        sessionStorage.setItem(keyFor(asPath), String(window.scrollY));
      } catch {
        // ignore
      }
    };

    const restore = (asPath: string) => {
      let y: string | null = null;
      try {
        y = sessionStorage.getItem(keyFor(asPath));
      } catch {
        // ignore
      }
      if (y == null) return;

      // Wait for paint (important for SSR + images)
      requestAnimationFrame(() => {
        window.scrollTo(0, Number(y));
      });
    };

    const onRouteChangeStart = () => {
      save(router.asPath);
    };

    const onRouteChangeComplete = (url: string) => {
      if (isPopState.current) restore(url);
      isPopState.current = false;
    };

    router.events.on('routeChangeStart', onRouteChangeStart);
    router.events.on('routeChangeComplete', onRouteChangeComplete);

    return () => {
      router.events.off('routeChangeStart', onRouteChangeStart);
      router.events.off('routeChangeComplete', onRouteChangeComplete);
    };
  }, [router]);
  // ------------------------------

  return (
    <>
      <Analytics />
      <ToastProvider>
        <AuthProvider initialUser={pageProps.customer || null}>
        <AccountValidationProvider>
          <FavouritesProvider>
            <CartProvider>
              <ChatDrawerProvider>
                <RegionProvider initialRegion={initialRegion}>
                  <Head>
                    <meta
                      name="viewport"
                      content="width=device-width, initial-scale=1, viewport-fit=cover"
                    />
                    <meta name="theme-color" content="#ffffff" />
                    <link rel="icon" href="/favicon.ico" />
                    <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
                    <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
                    <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
                    <link rel="manifest" href="/site.webmanifest" />
                    <link rel="mask-icon" href="/safari-pinned-tab.svg" color="#181818" />
                    <meta name="msapplication-TileColor" content="#ffffff" />
                  </Head>

                  {noLayout ? (
                    // Dedicated pages like the .com region selector or /admin
                    <Component {...pageProps} />
                  ) : (
                    <>
                      <div
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          minHeight: '100dvh',
                        }}
                      >
                        <AccountCompletionBanner />
                        <Header />
                        <main style={{ flex: '1 0 auto' }}>
                          <Component {...pageProps} />
                        </main>
                        <BreadcrumbSchema />
                        <Footer />
                      </div>
                      <CartDrawer />
                      <ChatDrawer />
                    </>
                  )}
                </RegionProvider>
              </ChatDrawerProvider>
            </CartProvider>
          </FavouritesProvider>
        </AccountValidationProvider>
      </AuthProvider>
      </ToastProvider>
    </>
  );
}

MyApp.getInitialProps = async (appContext: AppContext) => {
  const appProps = await App.getInitialProps(appContext);
  const myAppProps = appProps as MyAppProps;

  // Ensure pageProps exists
  myAppProps.pageProps = myAppProps.pageProps || {};

  const req = appContext.ctx.req;

  // 1) Figure out which host this request came in on
  const hostHeader = req?.headers['x-forwarded-host'] ?? req?.headers['host'];
  const headerHost = Array.isArray(hostHeader) ? hostHeader[0] : hostHeader;

  // 2) In dev, allow overriding with process.env.HOST so we can simulate domains locally
  const effectiveHost = process.env.HOST || headerHost;

  // 3) Derive region from effective host (auricle.co.uk vs auriclejewelry.com)
  const region = getRegionFromHost(effectiveHost);
  myAppProps.pageProps.region = region;

  // 4) Existing customer logic
  const customerHeader = req?.headers['x-customer'];
  if (customerHeader && typeof customerHeader === 'string') {
    try {
      myAppProps.pageProps.customer = JSON.parse(customerHeader) as ShopifyCustomer;
    } catch {
      // ignore parse errors
    }
  }

  const pathname = appContext.router.pathname;
  if (pathname.startsWith('/admin')) {
    myAppProps.pageProps.noLayout = true;
  }

  return myAppProps;
};