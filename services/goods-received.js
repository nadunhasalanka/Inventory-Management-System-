import { getGoodsReceived, addGoodsReceived } from "../utils/db"
import { readData, writeData } from "../utils/db"

export function fetchGoodsReceived() {
  return getGoodsReceived()
}

export function createGoodsReceived(data) {
  const grn = addGoodsReceived(data)

  // Update inventory quantities
  const inventory = readData("inventory") || []
  data.items.forEach((item) => {
    const invIndex = inventory.findIndex((p) => p.id === item.productId)
    if (invIndex !== -1) {
      inventory[invIndex].quantity = (inventory[invIndex].quantity || 0) + item.quantityReceived
      inventory[invIndex].cost = item.unitCost
    }
  })
  writeData("inventory", inventory)

  return grn
}
