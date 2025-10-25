"use server"

// Server-side MRA fiscalization service
// This keeps sensitive credentials secure on the server

export async function fiscalizeInvoice(invoiceData, isCredit = false) {
  const MRA_API_URL = process.env.MRA_API_URL || "https://api.mra.mu/fiscalize"
  const MRA_CLIENT_ID = process.env.MRA_CLIENT_ID
  const MRA_CLIENT_SECRET = process.env.MRA_CLIENT_SECRET

  if (!MRA_CLIENT_ID || !MRA_CLIENT_SECRET) {
    return {
      success: false,
      error: "MRA credentials not configured. Please set MRA_CLIENT_ID and MRA_CLIENT_SECRET in Project Settings.",
    }
  }

  try {
    // Simulate MRA API call
    // In production, this would make a real API call to MRA
    const response = await fetch(MRA_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${MRA_CLIENT_ID}:${MRA_CLIENT_SECRET}`,
      },
      body: JSON.stringify(invoiceData),
    })

    // Simulate successful response
    const irn = `MRA${Date.now()}${Math.random().toString(36).substring(2, 9).toUpperCase()}`
    const qrCode = `https://verify.mra.mu/${irn}`

    return {
      success: true,
      irn,
      qrCode,
      timestamp: new Date().toISOString(),
    }
  } catch (error) {
    return {
      success: false,
      error: error.message || "Failed to fiscalize invoice with MRA",
    }
  }
}

export async function generateInvoiceJSON(items, customer = null, type = "cash") {
  const invoiceNumber = `INV-${Date.now()}`
  const timestamp = new Date().toISOString()

  const subtotal = items.reduce((sum, item) => sum + item.price * item.qty, 0)
  const tax = subtotal * 0.15
  const total = subtotal + tax

  return {
    invoiceNumber,
    timestamp,
    type,
    customer: customer || { name: "Walk-in Customer", phone: null, idNumber: null },
    items: items.map((item) => ({
      sku: item.sku,
      name: item.name,
      quantity: item.qty,
      unitPrice: item.price,
      total: item.price * item.qty,
    })),
    subtotal,
    tax,
    total,
  }
}
