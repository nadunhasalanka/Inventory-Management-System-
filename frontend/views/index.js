// Registry mapping tab keys to their components
import React from "react"

import DashboardTab from "../tabs/Dashboard"
import InventoryTab from "../tabs/Inventory"
import AddEditItemTab from "../tabs/AddEditItem"
import CashSalesTab from "../tabs/CashSales"
import CreditSalesTab from "../tabs/CreditSales"
import IndebtedClientsTab from "../tabs/IndebtedClients"
import SuppliersTab from "../tabs/Suppliers"
import TodoTab from "../tabs/Todo"
import SubscriptionTab from "../tabs/Subscription"
import SettingsTab from "../tabs/Settings"
import MRACompliance from "../tabs/MRACompliance"
import QuotationsTab from "../tabs/Quotations"
import ReturnsTab from "../tabs/Returns"
import CustomersTab from "../tabs/Customers"

export const views = {
  dashboard: <DashboardTab />,
  inventory: <InventoryTab />,
  addedit: <AddEditItemTab />,
  quotations: <QuotationsTab />,
  cashsales: <CashSalesTab />,
  creditsales: <CreditSalesTab />,
  returns: <ReturnsTab />,
  customers: <CustomersTab />,
  indebted: <IndebtedClientsTab />,
  suppliers: <SuppliersTab />,
  todo: <TodoTab />,
  subscription: <SubscriptionTab />,
  settings: <SettingsTab />,
  mraCompliance: <MRACompliance />,
}

export function getViewByKey(key) {
  return views[key] ?? views.dashboard
}
