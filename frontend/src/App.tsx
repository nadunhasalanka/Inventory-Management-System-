import { Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import QueryProvider from './components/QueryProvider'

// Import route components
import RootLayout from './layouts/RootLayout'
import AuthLayout from './layouts/AuthLayout'
import AppLayout from './layouts/AppLayout'

// Public routes
import LoginPage from './pages/public/login/page'
import SignupPage from './pages/public/signup/page'

// App routes
import DashboardPage from './pages/app/dashboard/page'
import InventoryPage from './pages/app/inventory/page'
import CustomersPage from './pages/app/customers/page'
import SuppliersPage from './pages/app/suppliers/page'
import CashSalesPage from './pages/app/cashsales/page'
import CreditSalesPage from './pages/app/creditsales/page'
import CreditPaymentsPage from './pages/app/creditpayments/page'
import IndebtedPage from './pages/app/indebted/page'
import ReturnsPage from './pages/app/returns/page'
import QuotationsPage from './pages/app/quotations/page'
import LocationPage from './pages/app/location/page'
import SettingsPage from './pages/app/settings/page'
import ProfilePage from './pages/app/profile/page'
import TodoPage from './pages/app/todo/page'
import SubscriptionPage from './pages/app/subscription/page'
import MraCompliancePage from './pages/app/mra-compliance/page'
import AddEditPage from './pages/app/addedit/page'
import TransactionLogsPage from './pages/app/transactions/page'
import AllPaymentsPage from './pages/app/payments/page'

function App() {
  return (
    <QueryProvider>
      <Suspense fallback={
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
        </div>
      }>
        <Routes>
          {/* Root redirect */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          
          {/* Public routes */}
          <Route element={<AuthLayout />}>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />
          </Route>

          {/* Protected app routes */}
          <Route element={<AppLayout />}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/inventory" element={<InventoryPage />} />
            <Route path="/customers" element={<CustomersPage />} />
            <Route path="/suppliers" element={<SuppliersPage />} />
            <Route path="/cashsales" element={<CashSalesPage />} />
            <Route path="/creditsales" element={<CreditSalesPage />} />
            <Route path="/creditpayments" element={<CreditPaymentsPage />} />
            <Route path="/indebted" element={<IndebtedPage />} />
            <Route path="/returns" element={<ReturnsPage />} />
            <Route path="/quotations" element={<QuotationsPage />} />
            <Route path="/location" element={<LocationPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/todo" element={<TodoPage />} />
            <Route path="/subscription" element={<SubscriptionPage />} />
            <Route path="/mra-compliance" element={<MraCompliancePage />} />
            <Route path="/addedit" element={<AddEditPage />} />
            <Route path="/transactions" element={<TransactionLogsPage />} />
            <Route path="/payments" element={<AllPaymentsPage />} />
          </Route>

          {/* Catch all - redirect to dashboard */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </Suspense>
    </QueryProvider>
  )
}

export default App
