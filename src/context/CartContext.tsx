"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";

export interface ICartItem {
  productId: string;
  name: string;
  slug: string;
  sku: string;
  image: string;
  unitPrice: number;
  quantity: number;
  stock: number;
  isRestricted: boolean;
  ageRequirement?: number;
  shippingRestrictions?: string[];
  stockStatus?: "in_stock" | "insufficient_stock" | "out_of_stock" | "item_unavailable";
  stockWarning?: string;
}

export interface ICartSummary {
  subtotal: number;
  shipping: number;
  total: number;
  currency: string;
  itemCount: number;
  hasStockIssues: boolean;
  hasRestrictedItems: boolean;
  deliveryRule?: string;
  estimatedDeliveryDays?: string;
  isFreeShipping?: boolean;
}

interface CartContextType {
  items: ICartItem[];
  summary: ICartSummary;
  stockWarnings: string[];
  isSyncing: boolean;
  addToCart: (product: any, quantity?: number) => Promise<boolean>;
  removeFromCart: (productId: string) => void;
  increaseQuantity: (productId: string) => void;
  decreaseQuantity: (productId: string) => void;
  clearCart: () => void;
  refreshCart: () => Promise<void>;
  /** Most recent add-to-cart event — drives the "Added to Cart" flyout */
  lastAdded: { item: ICartItem; quantity: number; at: number } | null;
  dismissLastAdded: () => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const CART_STORAGE_KEY = "figures_world_cart_v1";

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ICartItem[]>([]);
  const [summary, setSummary] = useState<ICartSummary>({
    subtotal: 0,
    shipping: 0,
    total: 0,
    currency: "INR",
    itemCount: 0,
    hasStockIssues: false,
    hasRestrictedItems: false,
  });
  const [stockWarnings, setStockWarnings] = useState<string[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [lastAdded, setLastAdded] = useState<CartContextType["lastAdded"]>(null);

  // Authoritative server-side calculation & stock validation
  const syncWithServer = useCallback(async (currentItems: ICartItem[]) => {
    if (currentItems.length === 0) {
      setSummary({
        subtotal: 0,
        shipping: 0,
        total: 0,
        currency: "INR",
        itemCount: 0,
        hasStockIssues: false,
        hasRestrictedItems: false,
      });
      setStockWarnings([]);
      return;
    }

    try {
      setIsSyncing(true);
      const res = await fetch("/api/cart/calculate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: currentItems.map((it) => ({
            productId: it.productId,
            quantity: it.quantity,
          })),
        }),
      });

      const data = await res.json();
      if (data.success && data.data) {
        const verifiedItems = data.data.items;
        const newSummary = data.data.summary;
        const warnings = data.data.stockWarnings || [];

        setSummary(newSummary);
        setStockWarnings(warnings);

        // Update local items with verified prices, available stock, and stockStatus
        setItems((prev) =>
          prev.map((localItem) => {
            const serverItem = verifiedItems.find((v: any) => v.productId === localItem.productId);
            if (!serverItem) return localItem;
            return {
              ...localItem,
              unitPrice: serverItem.unitPrice,
              stock: serverItem.stock,
              stockStatus: serverItem.stockStatus,
              stockWarning: serverItem.stockWarning,
              // If server clamped quantity due to insufficient stock:
              quantity: serverItem.validQuantity > 0 ? serverItem.validQuantity : localItem.quantity,
            };
          })
        );
      }
    } catch (err) {
      console.error("Failed to sync cart with server:", err);
    } finally {
      setIsSyncing(false);
    }
  }, []);

  // Hydrate from localStorage on client mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(CART_STORAGE_KEY);
      if (saved) {
        const parsed: ICartItem[] = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          setItems(parsed);
          syncWithServer(parsed);
        }
      }
    } catch (err) {
      console.error("Failed to load cart from storage", err);
    } finally {
      setIsLoaded(true);
    }
  }, [syncWithServer]);

  // Save to localStorage whenever items change (after initial hydration)
  useEffect(() => {
    if (!isLoaded) return;
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
    } catch (err) {
      console.error("Failed to save cart to storage", err);
    }
  }, [items, isLoaded]);

  // 1. Add to Cart
  const addToCart = async (product: any, quantityToAdd: number = 1): Promise<boolean> => {
    const pId = product._id || product.id || product.productId;
    const availableStock = product.stock ?? 10;

    if (availableStock <= 0) {
      setStockWarnings((prev) => [...prev, `"${product.name}" is out of stock.`]);
      return false;
    }

    const primaryImage =
      product.images?.find((img: any) => img.isPrimary)?.url ||
      product.images?.[0]?.url ||
      product.image ||
      "https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=400";

    const effectivePrice =
      product.discountPrice !== undefined && product.discountPrice !== null && product.discountPrice < product.price
        ? product.discountPrice
        : product.price;

    let updatedItems: ICartItem[];

    const existingIndex = items.findIndex((it) => it.productId === pId);
    if (existingIndex > -1) {
      const currentQty = items[existingIndex].quantity;
      const targetQty = Math.min(availableStock, currentQty + quantityToAdd);

      updatedItems = items.map((it, idx) =>
        idx === existingIndex ? { ...it, quantity: targetQty, stock: availableStock } : it
      );
    } else {
      const initialQty = Math.min(availableStock, Math.max(1, quantityToAdd));
      const newItem: ICartItem = {
        productId: pId,
        name: product.name,
        slug: product.slug || pId,
        sku: product.sku || "N/A",
        image: primaryImage,
        unitPrice: effectivePrice,
        quantity: initialQty,
        stock: availableStock,
        isRestricted: Boolean(product.isRestricted),
        ageRequirement: product.ageRequirement || 0,
        shippingRestrictions: product.shippingRestrictions || [],
        stockStatus: "in_stock",
      };
      updatedItems = [...items, newItem];
    }

    setItems(updatedItems);
    const addedItem = updatedItems.find((it) => it.productId === pId);
    if (addedItem) {
      setLastAdded({ item: addedItem, quantity: quantityToAdd, at: Date.now() });
    }
    await syncWithServer(updatedItems);
    return true;
  };

  // 2. Remove from Cart
  const removeFromCart = (productId: string) => {
    const updated = items.filter((it) => it.productId !== productId);
    setItems(updated);
    syncWithServer(updated);
  };

  // 3. Increase Quantity
  const increaseQuantity = (productId: string) => {
    const updated = items.map((it) => {
      if (it.productId !== productId) return it;
      // Stock limit validation
      if (it.quantity >= it.stock) {
        return it;
      }
      return { ...it, quantity: it.quantity + 1 };
    });
    setItems(updated);
    syncWithServer(updated);
  };

  // 4. Decrease Quantity
  const decreaseQuantity = (productId: string) => {
    const updated = items
      .map((it) => {
        if (it.productId !== productId) return it;
        if (it.quantity <= 1) return null;
        return { ...it, quantity: it.quantity - 1 };
      })
      .filter(Boolean) as ICartItem[];

    setItems(updated);
    syncWithServer(updated);
  };

  // 5. Clear Cart
  const clearCart = () => {
    setItems([]);
    setSummary({
      subtotal: 0,
      shipping: 0,
      total: 0,
      currency: "INR",
      itemCount: 0,
      hasStockIssues: false,
      hasRestrictedItems: false,
    });
    setStockWarnings([]);
    try {
      localStorage.removeItem(CART_STORAGE_KEY);
    } catch (e) {
      // Ignored
    }
  };

  // 6. Refresh Cart (manual trigger)
  const refreshCart = async () => {
    await syncWithServer(items);
  };

  return (
    <CartContext.Provider
      value={{
        items,
        summary,
        stockWarnings,
        isSyncing,
        addToCart,
        removeFromCart,
        increaseQuantity,
        decreaseQuantity,
        clearCart,
        refreshCart,
        lastAdded,
        dismissLastAdded: () => setLastAdded(null),
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
}
