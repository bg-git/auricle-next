import type { AppProps } from 'next/app';
import '@/styles/globals.css';
import Header from '@/components/Header';
import { CartProvider } from '@/context/CartContext'; // ✅ import your Cart context

export default function MyApp({ Component, pageProps }: AppProps) {
  return (
    <CartProvider>
      <Header />
      <Component {...pageProps} />
    </CartProvider>
  );
}
