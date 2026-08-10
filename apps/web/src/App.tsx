import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { RootLayout } from '@/components/layout/RootLayout'
import { AboutPage } from '@/pages/AboutPage'
import { ArticleDetailPage } from '@/pages/ArticleDetailPage'
import { ArticlesPage } from '@/pages/ArticlesPage'
import { CartPage } from '@/pages/CartPage'
import { CheckoutPage } from '@/pages/CheckoutPage'
import { ContactPage } from '@/pages/ContactPage'
import { DesignPage } from '@/pages/DesignPage'
import { FaqPage } from '@/pages/FaqPage'
import { HomePage } from '@/pages/HomePage'
import { OrderConfirmPage } from '@/pages/OrderConfirmPage'
import { ProductPage } from '@/pages/ProductPage'
import { ProductsPage } from '@/pages/ProductsPage'
import { TermsPage } from '@/pages/TermsPage'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<RootLayout />}>
          <Route index element={<HomePage />} />
          <Route path="produkter" element={<ProductsPage />} />
          <Route path="produkter/:slug" element={<ProductPage />} />
          <Route path="produkter/:slug/design" element={<DesignPage />} />
          <Route path="handlekurv" element={<CartPage />} />
          <Route path="kasse" element={<CheckoutPage />} />
          <Route path="ordre/bekreftelse" element={<OrderConfirmPage />} />
          <Route path="om-oss" element={<AboutPage />} />
          <Route path="faq" element={<FaqPage />} />
          <Route path="kontakt" element={<ContactPage />} />
          <Route path="artikler" element={<ArticlesPage />} />
          <Route path="artikler/:slug" element={<ArticleDetailPage />} />
          <Route path="angrerett" element={<TermsPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
