# 📦 How to Receive Goods - Step by Step Guide

## Prerequisites ✅
Before you can receive goods, make sure you have:
1. ✅ Products in the Inventory tab
2. ✅ Suppliers created
3. ✅ Warehouse locations set up
4. ✅ Backend server running (`cd backend && npm start`)
5. ✅ Frontend running (`cd frontend && npm run dev`)

---

## Step 1: Create a Purchase Order

1. **Go to:** Suppliers Tab → Purchase Orders (first sub-tab)
2. **Click:** "+ New Purchase Order" button (top right)
3. **Fill in the form:**
   - **Supplier:** Select from dropdown
   - **Expected Delivery:** Pick a date (optional)
   - **Products:** Click "+" to add items
     - Select Product (shows name + SKU)
     - Enter Quantity
     - Unit Cost (auto-filled, can edit)
   - **Notes:** Optional
4. **Click:** "Submit" button
5. **Result:** New PO appears in table with status "Draft" or "Sent"

---

## Step 2: Receive Goods (Create GRN)

1. **Find your PO** in the Purchase Orders table
2. **Look for:** "Receive Goods" button (green button in Actions column)
   - This button only shows for POs with status "Draft" or "Sent"
3. **Click:** "Receive Goods" button
4. **A dialog should open** with title "Receive Goods (GRN)"

### In the Dialog:

**Top Section (Auto-filled):**
- ✅ Supplier: Already filled
- 📍 **Location:** SELECT A WAREHOUSE (required)
- 📅 Receipt Date: Today (can change)
- 📄 PO Number: Shows your PO number

**Products Table:**
Each row shows:
- 📦 Product Name (disabled, from PO)
- 🔢 Quantity Ordered (shown below product)
- ✏️ **Quantity Received:** ENTER THE ACTUAL QUANTITY YOU RECEIVED
- 🏷️ Status Chip:
  - Green "Complete" if received = ordered
  - Orange "Short" if received < ordered

**Bottom Buttons:**
- ❌ Cancel: Close dialog
- ✅ **Receive Goods:** Submit the receipt

5. **Enter quantities** for each product
6. **Click:** "Receive Goods" button
7. **Result:** 
   - Success message appears
   - Dialog closes
   - PO status changes to "Received" or "Partially Received"
   - Inventory updated with weighted average cost

---

## What Happens Behind the Scenes

When you click "Receive Goods":

```
Frontend → Backend → Database
```

**Backend Process:**
1. ✅ Validates PO exists and not already fully received
2. ✅ Checks you're not receiving more than ordered
3. ✅ Calculates weighted average cost:
   - Old Stock: 100 units @ Rs 10 = Rs 1000
   - New Stock: 50 units @ Rs 12 = Rs 600
   - New Average: Rs 1600 / 150 = Rs 10.67 per unit
4. ✅ Creates a new BATCH in inventory with:
   - Batch number (auto-generated)
   - Quantity received
   - Unit cost from PO
   - Received date
   - Links to GRN and Supplier
5. ✅ Updates Product cost history
6. ✅ Creates transaction log
7. ✅ Updates PO status

---

## Troubleshooting 🔧

### Dialog doesn't open when clicking "Receive Goods"?
1. **Open browser console (F12)**
2. Click "Receive Goods" button
3. Look for console logs starting with "=== RECEIVE GOODS CLICKED ==="
4. Check if there's an error about "No line items"

### "This PO has no line items" error?
- The PO was created incorrectly
- Delete it and create a new one
- Make sure to add products when creating PO

### "Please select a warehouse location" error?
- You need to create warehouse locations first
- Go to Inventory → Locations
- Add at least one location

### Backend errors?
1. Check backend terminal for error messages
2. Make sure MongoDB is running
3. Check if user is authenticated (logged in)

---

## Testing Checklist ☑️

- [ ] Backend server running on port 3001
- [ ] Frontend running on port 3000 (or 5173)
- [ ] Logged in as Admin or Manager
- [ ] Have at least 1 product in Inventory
- [ ] Have at least 1 supplier
- [ ] Have at least 1 warehouse location
- [ ] Create a new PO with products
- [ ] See "Receive Goods" green button on PO
- [ ] Click button → Dialog opens
- [ ] Select location from dropdown
- [ ] Enter quantities
- [ ] Click "Receive Goods" → Success message
- [ ] Check inventory updated with new stock

---

## Quick Debug Steps

1. **Open Console (F12)**
2. **Click "Receive Goods"** - Should see:
   ```
   === RECEIVE GOODS CLICKED ===
   PO Data: {_id: "...", po_number: "...", line_items: [...]}
   PO Line Items: [{product_id: {...}, quantity_ordered: 10}]
   Locations available: [{_id: "...", name: "Main Warehouse"}]
   Mapped GRN Items: [...]
   ✅ Opening GRN dialog...
   ```

3. **If you see "❌ No line items found in PO!":**
   - The PO is missing products
   - Create a new PO properly

4. **When submitting, should see:**
   ```
   Receiving goods with data: {location_id: "...", received_items: [...]}
   ```

5. **On success:**
   ```
   ✅ Goods received successfully!
   ```

---

## Next Steps After Receiving

After successfully receiving goods:
1. Go to **"Goods Received" tab** - See your GRN
2. Go to **Inventory tab** - See updated stock quantities
3. Check **product costs** - Should show new weighted average
4. Go to **"Supplier Payments" tab** - Record payment for the supplier

