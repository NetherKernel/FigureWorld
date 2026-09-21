/**
 * Formatting utilities for FiguresWorld e-commerce platform
 */

/**
 * Format numerical prices cleanly with Indian Rupee (₹) by default,
 * matching user specification: e.g. ₹2,499, ₹4,998, ₹5,098
 */
export function formatPrice(amount: number, currency: string = "INR"): string {
  if (typeof amount !== "number" || isNaN(amount)) {
    return "₹0";
  }

  // If decimal is 0 or whole integer, don't show trailing .00
  const isInteger = Math.floor(amount) === amount;

  try {
    const formatter = new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: currency === "USD" ? "USD" : "INR",
      minimumFractionDigits: isInteger ? 0 : 2,
      maximumFractionDigits: 2,
    });
    return formatter.format(amount);
  } catch {
    // Fallback if Intl fails
    const symbol = currency === "USD" ? "$" : "₹";
    const formatted = amount.toLocaleString("en-IN", {
      minimumFractionDigits: isInteger ? 0 : 2,
      maximumFractionDigits: 2,
    });
    return `${symbol}${formatted}`;
  }
}
