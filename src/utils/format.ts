/**
 * Safe numeric & price formatting utilities for institutional terminal
 * Guarantees minimumFractionDigits <= maximumFractionDigits to prevent Intl RangeError.
 */
export function formatPrice(price: number, digits: number = 2): string {
  if (price === null || price === undefined || isNaN(price)) return '0.00';
  const effectiveDigits = Math.max(0, Math.min(10, digits));
  return price.toLocaleString('en-US', {
    minimumFractionDigits: effectiveDigits,
    maximumFractionDigits: effectiveDigits,
  });
}

export function formatCurrency(amount: number, digits: number = 2): string {
  if (amount === null || amount === undefined || isNaN(amount)) return '$0.00';
  const effectiveDigits = Math.max(0, Math.min(10, digits));
  return `$${amount.toLocaleString('en-US', {
    minimumFractionDigits: effectiveDigits,
    maximumFractionDigits: effectiveDigits,
  })}`;
}
