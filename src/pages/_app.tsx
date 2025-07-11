import type { AppProps } from 'next/app';
import '@/styles/globals.css';
import '@/styles/pages/home.scss';
import '@/styles/pages/product.scss';
import '@/styles/pages/collection.scss';
import Header from '@/components/Header';
import { CartProvider } from '@/context/CartContext';

export default function MyApp({ Component, pageProps }: AppProps) {
  return (
    <CartProvider>
      <Header />
      <Component {...pageProps} />
    </CartProvider>
  );
}
