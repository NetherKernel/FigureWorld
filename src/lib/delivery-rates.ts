import { connectToDatabase } from "./db";
import { DeliveryRule, IDeliveryRule, IPincodeRate } from "@/models/DeliveryRule";

// Global cache for delivery settings
declare global {
  // eslint-disable-next-line no-var
  var __figuresWorldDeliverySettings: any | undefined;
  // eslint-disable-next-line no-var
  var __figuresWorldDeliverySettingsTimestamp: number | undefined;
}

export interface CalculateDeliveryItem {
  productId?: string;
  name?: string;
  isRestricted?: boolean;
  quantity?: number;
  weightKg?: number;
  weightGrams?: number;
  weight?: number;
  tags?: string[];
}

export interface CalculateDeliveryOptions {
  subtotal: number;
  items?: CalculateDeliveryItem[];
  address?: {
    postalCode?: string;
    pinCode?: string;
    city?: string;
    state?: string;
    country?: string;
  } | null;
}

export interface DeliveryCalculationResult {
  fee: number;
  ruleApplied:
    | "EMPTY_CART"
    | "FREE_SHIPPING_THRESHOLD"
    | "PINCODE_OVERRIDE"
    | "LOCAL_CITY"
    | "REGIONAL_STATE"
    | "LIGHT_WEIGHT"
    | "LARGE_WEIGHT"
    | "DEFAULT_BASE";
  ruleName: string;
  estimatedDays: string;
  isFreeShipping: boolean;
  baseFee: number;
  heavySurcharge: number;
  partnerSuggestion?: string;
}

export const DEFAULT_DELIVERY_SETTINGS = {
  lightWeightFee: 180, // For katanas, keychains, small action figures (< 2kg)
  largeWeightFee: 299, // For large resin statues, 1/4 scales, heavy orders (≥ 2kg)
  heavyWeightThresholdKg: 2.0, // 2000g threshold
  defaultBaseFee: 180,
  freeShippingThreshold: 1999,
  isFreeShippingActive: false,
  enableLocalDelivery: false,
  localCity: "Mumbai",
  localCityFee: 50,
  localCityEstDays: "Same Day / 4 Hours",
  enableRegionalDelivery: false,
  regionalState: "Maharashtra",
  regionalStateFee: 80,
  regionalStateEstDays: "1-2 Days",
  nationalFee: 180,
  nationalEstDays: "2-4 Days",
  heavyItemSurcharge: 0,
  pincodeRates: [] as IPincodeRate[],
  partnerPresets: [
    {
      id: "porter-bike",
      name: "Porter Bike Delivery",
      type: "PORTER" as const,
      baseRate: 45,
      description: "Local 2-wheeler courier rider (up to 10km)",
    },
    {
      id: "dunzo-express",
      name: "Dunzo Express Local",
      type: "DUNZO" as const,
      baseRate: 55,
      description: "Hyperlocal direct drop (within 60-90 mins)",
    },
    {
      id: "inhouse-rider",
      name: "Store Local Rider",
      type: "LOCAL_RIDER" as const,
      baseRate: 35,
      description: "Own bike rider for nearby customers",
    },
    {
      id: "bluedart-air",
      name: "Standard Air Express",
      type: "STANDARD_COURIER" as const,
      baseRate: 180,
      description: "All-India courier partner (BlueDart / Delhivery / DTDC)",
    },
  ],
};

const CACHE_TTL_MS = 15000; // 15 seconds memory cache

/**
 * Retrieves the store's delivery settings, backed by MongoDB with caching.
 */
export async function getDeliverySettings(): Promise<any> {
  const now = Date.now();
  if (
    global.__figuresWorldDeliverySettings &&
    global.__figuresWorldDeliverySettingsTimestamp &&
    now - global.__figuresWorldDeliverySettingsTimestamp < CACHE_TTL_MS
  ) {
    return global.__figuresWorldDeliverySettings;
  }

  try {
    await connectToDatabase();
    let ruleDoc = await DeliveryRule.findOne().lean();

    if (!ruleDoc) {
      const created = await DeliveryRule.create({
        ...DEFAULT_DELIVERY_SETTINGS,
      });
      ruleDoc = created.toObject();
    }

    global.__figuresWorldDeliverySettings = ruleDoc;
    global.__figuresWorldDeliverySettingsTimestamp = now;
    return ruleDoc;
  } catch (err) {
    console.error("Failed to load delivery settings from DB, falling back to cache or defaults:", err);
    if (global.__figuresWorldDeliverySettings) {
      return global.__figuresWorldDeliverySettings;
    }
    return { ...DEFAULT_DELIVERY_SETTINGS };
  }
}

/**
 * Saves delivery settings to database and updates cache immediately.
 */
export async function saveDeliverySettings(
  data: Partial<IDeliveryRule>,
  updatedBy?: string
): Promise<any> {
  await connectToDatabase();
  const existing = await DeliveryRule.findOne();

  let saved;
  if (existing) {
    Object.assign(existing, data);
    if (updatedBy) existing.updatedBy = updatedBy;
    saved = await existing.save();
  } else {
    saved = await DeliveryRule.create({
      ...DEFAULT_DELIVERY_SETTINGS,
      ...data,
      updatedBy,
    });
  }

  const plain = saved.toObject ? saved.toObject() : saved;
  global.__figuresWorldDeliverySettings = plain;
  global.__figuresWorldDeliverySettingsTimestamp = Date.now();
  return plain;
}

/**
 * Authoritatively calculates delivery fee for any cart, checkout, or quote.
 */
export async function calculateDeliveryFee(
  options: CalculateDeliveryOptions
): Promise<DeliveryCalculationResult> {
  const { subtotal, items = [], address } = options;

  // Empty cart has zero delivery
  if (subtotal <= 0) {
    return {
      fee: 0,
      ruleApplied: "EMPTY_CART",
      ruleName: "Cart is empty",
      estimatedDays: "-",
      isFreeShipping: false,
      baseFee: 0,
      heavySurcharge: 0,
    };
  }

  const settings = await getDeliverySettings();

  // 1. Heavy item or restricted katana surcharge check
  let heavySurcharge = 0;
  if (settings.heavyItemSurcharge > 0 && items && items.length > 0) {
    const hasHeavyOrRestricted = items.some(
      (it) => it.isRestricted || (it.weightKg && it.weightKg > 1.5)
    );
    if (hasHeavyOrRestricted) {
      heavySurcharge = settings.heavyItemSurcharge;
    }
  }

  const postalCode = (address?.postalCode || address?.pinCode || "").trim();
  const city = (address?.city || "").trim().toLowerCase();
  const state = (address?.state || "").trim().toLowerCase();

  // 2. Pincode-specific custom override (Hyperlocal / Area Pricing takes highest priority)
  if (postalCode && Array.isArray(settings.pincodeRates) && settings.pincodeRates.length > 0) {
    const matchedPin = settings.pincodeRates.find((p: IPincodeRate) => {
      if (!p.isActive) return false;
      const target = p.pincode.trim();
      if (target.endsWith("*")) {
        return postalCode.startsWith(target.slice(0, -1));
      }
      return target.toLowerCase() === postalCode.toLowerCase();
    });

    if (matchedPin) {
      const totalFee = matchedPin.fee + heavySurcharge;
      return {
        fee: totalFee,
        ruleApplied: "PINCODE_OVERRIDE",
        ruleName: `${matchedPin.areaName} (PIN: ${matchedPin.pincode})`,
        estimatedDays: matchedPin.estimatedDays || "1-2 Days",
        isFreeShipping: false,
        baseFee: matchedPin.fee,
        heavySurcharge,
        partnerSuggestion: matchedPin.fee < 60 ? "Porter Bike / Local Rider" : "Standard Courier",
      };
    }
  }

  // 3. Free Shipping Threshold Check (for non-overridden standard destinations)
  if (
    settings.isFreeShippingActive &&
    settings.freeShippingThreshold > 0 &&
    subtotal >= settings.freeShippingThreshold
  ) {
    return {
      fee: 0,
      ruleApplied: "FREE_SHIPPING_THRESHOLD",
      ruleName: `Free Shipping (Orders ₹${settings.freeShippingThreshold}+)`,
      estimatedDays: settings.nationalEstDays || "3-5 Days",
      isFreeShipping: true,
      baseFee: 0,
      heavySurcharge: 0,
      partnerSuggestion: "Standard Courier",
    };
  }

  // 4. Local City Rule (e.g. Mumbai local delivery)
  if (
    settings.enableLocalDelivery &&
    settings.localCity &&
    city &&
    city === settings.localCity.trim().toLowerCase()
  ) {
    const totalFee = settings.localCityFee + heavySurcharge;
    return {
      fee: totalFee,
      ruleApplied: "LOCAL_CITY",
      ruleName: `Local City Delivery (${settings.localCity})`,
      estimatedDays: settings.localCityEstDays || "Same Day / Next Day",
      isFreeShipping: false,
      baseFee: settings.localCityFee,
      heavySurcharge,
      partnerSuggestion: "Porter Bike / Local Rider",
    };
  }

  // 5. Regional State Rule (Legacy/Dedicated single-state toggle, e.g. Maharashtra)
  if (
    settings.enableRegionalDelivery &&
    settings.regionalState &&
    state &&
    (state.trim().toLowerCase() === settings.regionalState.trim().toLowerCase() ||
     state.trim().toLowerCase().includes(settings.regionalState.trim().toLowerCase()))
  ) {
    const totalFee = settings.regionalStateFee + heavySurcharge;
    return {
      fee: totalFee,
      ruleApplied: "REGIONAL_STATE",
      ruleName: `Regional Delivery (${settings.regionalState})`,
      estimatedDays: settings.regionalStateEstDays || "1-2 Days",
      isFreeShipping: false,
      baseFee: settings.regionalStateFee,
      heavySurcharge,
      partnerSuggestion: "Regional Express / Porter Intercity",
    };
  }

  // 5. Weight-Based Delivery Pricing (Light Weight ₹180 vs Large Weight ₹299)
  const lightFee = Number(settings.lightWeightFee ?? settings.defaultBaseFee ?? 180);
  const largeFee = Number(settings.largeWeightFee ?? 299);
  const thresholdKg = Number(settings.heavyWeightThresholdKg ?? 2.0);
  const thresholdGrams = thresholdKg * 1000; // e.g. 2000g

  let isLargeWeight = false;
  let totalWeightGrams = 0;

  if (items && items.length > 0) {
    for (const it of items) {
      const qty = it.quantity || 1;
      const itemWeightGrams =
        it.weightGrams ??
        it.weight ??
        (it.weightKg ? it.weightKg * 1000 : 500);
      totalWeightGrams += itemWeightGrams * qty;

      const nameLower = (it.name || "").toLowerCase();
      const tagsLower = Array.isArray(it.tags) ? it.tags.map((t: string) => t.toLowerCase()) : [];

      // Large weight / heavy order indicators:
      // Weight >= threshold (2.0kg) OR explicit large resin statue / diorama / 1/4 scale / 3-sword set
      const isExplicitLargeItem =
        itemWeightGrams >= thresholdGrams ||
        tagsLower.includes("statue") ||
        tagsLower.includes("resin") ||
        tagsLower.includes("diorama") ||
        tagsLower.includes("large-statue") ||
        nameLower.includes("statue") ||
        nameLower.includes("diorama") ||
        nameLower.includes("3-sword complete set");

      if (isExplicitLargeItem) {
        isLargeWeight = true;
      }
    }

    if (totalWeightGrams >= thresholdGrams) {
      isLargeWeight = true;
    }
  }

  if (isLargeWeight) {
    return {
      fee: largeFee,
      ruleApplied: "LARGE_WEIGHT",
      ruleName: "Large Weight Order Delivery (Statues & Heavy Orders)",
      estimatedDays: "3-5 Business Days",
      isFreeShipping: false,
      baseFee: largeFee,
      heavySurcharge: 0,
      partnerSuggestion: "Heavy Surface Cargo / BlueDart Express",
    };
  }

  // Light Weight Orders (Katanas, Keychains, Small Action Figures < 2.0kg)
  return {
    fee: lightFee,
    ruleApplied: "LIGHT_WEIGHT",
    ruleName: "Light Weight Order Delivery (Katanas, Keychains & Small Figures)",
    estimatedDays: settings.nationalEstDays || "2-4 Business Days",
    isFreeShipping: false,
    baseFee: lightFee,
    heavySurcharge: 0,
    partnerSuggestion: "Standard Air Express / Courier",
  };
}
