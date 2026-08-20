import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { RootLayout } from '@/components/layout/RootLayout'
import { ToastHost } from '@/components/ui/toast'
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
import { CookiesPage } from '@/pages/CookiesPage'
import { PrivacyPage } from '@/pages/PrivacyPage'
import { SalesTermsPage } from '@/pages/SalesTermsPage'
import { TermsPage } from '@/pages/TermsPage'
import {
  AdminLayout,
  AdminRequireAuth,
} from '@/pages/admin/AdminLayout'
import { AdminLoginPage } from '@/pages/admin/AdminLoginPage'
import { AdminDashboardPage } from '@/pages/admin/AdminDashboardPage'
import { AdminProductsPage } from '@/pages/admin/AdminProductsPage'
import { AdminProductEditPage } from '@/pages/admin/AdminProductEditPage'
import { AdminArticlesPage } from '@/pages/admin/AdminArticlesPage'
import { AdminArticleEditPage } from '@/pages/admin/AdminArticleEditPage'
import { AdminDeliveryPage } from '@/pages/admin/AdminDeliveryPage'
import { AdminHomepagePage } from '@/pages/admin/AdminHomepagePage'
import { AdminOrdersPage } from '@/pages/admin/AdminOrdersPage'
import { AdminOrderDetailPage } from '@/pages/admin/AdminOrderDetailPage'

export default function App() {
  return (
    <BrowserRouter>
      <ToastHost />
      <Routes>
        <Route path="/admin/login" element={<AdminLoginPage />} />
        <Route path="/admin" element={<AdminRequireAuth />}>
          <Route element={<AdminLayout />}>
            <Route index element={<AdminDashboardPage />} />
            <Route path="orders" element={<AdminOrdersPage />} />
            <Route path="orders/:id" element={<AdminOrderDetailPage />} />
            <Route path="products" element={<AdminProductsPage />} />
            <Route path="products/new" element={<AdminProductEditPage />} />
            <Route path="products/:id" element={<AdminProductEditPage />} />
            <Route path="articles" element={<AdminArticlesPage />} />
            <Route path="articles/new" element={<AdminArticleEditPage />} />
            <Route path="articles/:id" element={<AdminArticleEditPage />} />
            <Route path="delivery" element={<AdminDeliveryPage />} />
            <Route path="homepage" element={<AdminHomepagePage />} />
          </Route>
        </Route>

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
          <Route path="vilkar" element={<SalesTermsPage />} />
          <Route path="personvern" element={<PrivacyPage />} />
          <Route path="informasjonskapsler" element={<CookiesPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
