import type { AppProps } from 'next/app';
import '@/styles/globals.css';
import '@/styles/pages/home.scss';
import '@/styles/pages/product.scss';
import '@/styles/pages/collection.scss';
import '@/styles/pages/CartDrawer.scss';
import Header from '@/components/Header';
import { CartProvider } from '@/context/CartContext';
import CartDrawer from '@/components/CartDrawer';


export default function MyApp({ Component, pageProps }: AppProps) {
  return (
    <CartProvider>
      <Header />
      <Component {...pageProps} />
      <CartDrawer />
    </CartProvider>
  );
}
