import App, { type AppContext, type AppProps } from 'next/app';
import Head from 'next/head';
import dynamic from 'next/dynamic';

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
    [key: string]: unknown;
  };
}

export default function MyApp({ Component, pageProps }: MyAppProps) {
  return (
    <ToastProvider>
      <AuthProvider initialUser={pageProps.customer || null}>
        <AccountValidationProvider>
          <FavouritesProvider>
            <CartProvider>
              <ChatDrawerProvider>
              <Head>
                <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
                <meta name="theme-color" content="#ffffff" />
                <link rel="icon" href="/favicon.ico" />
                <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
                <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
                <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
                <link rel="manifest" href="/site.webmanifest" />
                <link rel="mask-icon" href="/safari-pinned-tab.svg" color="#181818" />
                <meta name="msapplication-TileColor" content="#ffffff" />
              </Head>
              <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100dvh' }}>
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
            </ChatDrawerProvider>
          </CartProvider>
        </FavouritesProvider>
        </AccountValidationProvider>
      </AuthProvider>
    </ToastProvider>
  );
}

MyApp.getInitialProps = async (appContext: AppContext) => {
  const appProps = await App.getInitialProps(appContext)
  const customerHeader = appContext.ctx.req?.headers['x-customer']
  if (customerHeader && typeof customerHeader === 'string') {
    try {
      appProps.pageProps = appProps.pageProps || {}
      appProps.pageProps.customer = JSON.parse(customerHeader)
    } catch {
      // ignore parse errors
    }
  }
  return appProps
}
