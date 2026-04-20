import { clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount, decimals = 2) {
  const number = Number(amount)
  if (Number.isNaN(number)) {
    return amount == null ? "0.00" : String(amount)
  }

  return number.toLocaleString("en-PH", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
}

export function formatOrderId(orderId, sequentialNumber) {
  // If a sequential number is provided (new format), use it
  if (sequentialNumber) {
    return `ORID - ${String(sequentialNumber).padStart(3, "0")}`
  }
  
  // Fall back to the old format for existing orders without sequential number
  if (!orderId) return "ORID - ???"
  const hexValue = orderId.slice(-6)
  const decimalValue = Math.abs(parseInt(hexValue, 16)) % 1000
  return `ORID - ${String(decimalValue).padStart(3, "0")}`
}
