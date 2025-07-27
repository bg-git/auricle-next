import { headers } from 'next/headers';
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
import CartDrawer from '@/components/CartDrawer';
import { CartProvider } from '@/context/CartContext';
import { AuthProvider } from '@/context/AuthContext';
import { FavouritesProvider } from '@/context/FavouritesContext';
import { ToastProvider } from '@/context/ToastContext';
import { ReactNode } from 'react';

export default function RootLayout({ children }: { children: ReactNode }) {
  const headerList = headers();
  const authHeaders = {
    'x-customer-authenticated': headerList.get('x-customer-authenticated') ?? undefined,
    'x-customer-email': headerList.get('x-customer-email') ?? undefined,
  };
  return (
    <html lang="en">
      <head />
      <body>
        <ToastProvider>
          <AuthProvider initialHeaders={authHeaders}>
            <FavouritesProvider>
              <CartProvider>
                <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100dvh' }}>
                  <Header />
                  <main style={{ flex: '1 0 auto' }}>{children}</main>
                  <Footer />
                </div>
                <CartDrawer />
              </CartProvider>
            </FavouritesProvider>
          </AuthProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
