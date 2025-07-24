import type { AppProps } from 'next/app';
import Head from 'next/head'; 
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
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { CartProvider } from '@/context/CartContext';
import { AuthProvider } from '@/context/AuthContext';
import CartDrawer from '@/components/CartDrawer';
import { FavouritesProvider } from '@/context/FavouritesContext';
import { ToastProvider } from '@/context/ToastContext';

export default function MyApp({ Component, pageProps }: AppProps) {


  return (
    <ToastProvider>
      <AuthProvider>
        <FavouritesProvider>
          <CartProvider>
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
            <meta name="theme-color" content="#ffffff" />
          </Head>
          <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100dvh' }}>
            <Header />
            <main style={{ flex: '1 0 auto' }}>
              <Component {...pageProps} />
            </main>
            <Footer />
          </div>
          <CartDrawer />
        </CartProvider>
      </FavouritesProvider>
    </AuthProvider>
  </ToastProvider>
  );
}
