import { logger } from "./logger";

export interface ICarrierOption {
  id: string;
  name: string;
  code: string;
  website: string;
  trackingUrlTemplate: (trackingNumber: string) => string;
  logo?: string;
  typicalDeliveryDays: number;
}

export const SUPPORTED_COURIERS: ICarrierOption[] = [
  {
    id: "bluedart",
    name: "Blue Dart Express",
    code: "BLUEDART",
    website: "https://www.bluedart.com",
    trackingUrlTemplate: (track) => `https://www.bluedart.com/tracking?track=${encodeURIComponent(track)}`,
    typicalDeliveryDays: 3,
  },
  {
    id: "delhivery",
    name: "Delhivery",
    code: "DELHIVERY",
    website: "https://www.delhivery.com",
    trackingUrlTemplate: (track) => `https://www.delhivery.com/track/package/${encodeURIComponent(track)}`,
    typicalDeliveryDays: 4,
  },
  {
    id: "dtdc",
    name: "DTDC",
    code: "DTDC",
    website: "https://www.dtdc.in",
    trackingUrlTemplate: (track) => `https://www.dtdc.in/tracking/tracking_results.asp?trno=${encodeURIComponent(track)}`,
    typicalDeliveryDays: 4,
  },
  {
    id: "shiprocket",
    name: "Shiprocket",
    code: "SHIPROCKET",
    website: "https://shiprocket.co",
    trackingUrlTemplate: (track) => `https://shiprocket.co/tracking/${encodeURIComponent(track)}`,
    typicalDeliveryDays: 3,
  },
  {
    id: "shadowfax",
    name: "Shadowfax",
    code: "SHADOWFAX",
    website: "https://www.shadowfax.in",
    trackingUrlTemplate: (track) => `https://tracker.shadowfax.in/#/track?awb=${encodeURIComponent(track)}`,
    typicalDeliveryDays: 4,
  },
  {
    id: "xpressbees",
    name: "Xpressbees",
    code: "XPRESSBEES",
    website: "https://www.xpressbees.com",
    trackingUrlTemplate: (track) => `https://www.xpressbees.com/track?awb=${encodeURIComponent(track)}`,
    typicalDeliveryDays: 4,
  },
  {
    id: "indiapost",
    name: "India Post Speed Post",
    code: "INDIAPOST",
    website: "https://www.indiapost.gov.in",
    trackingUrlTemplate: (track) => `https://www.indiapost.gov.in/_layouts/15/dpt.cept.tracking/trackconsignment.aspx`,
    typicalDeliveryDays: 5,
  },
];

/**
 * Automatically computes live tracking URL given courier name and AWB tracking number.
 */
export function generateTrackingUrl(courier: string, trackingNumber: string): string {
  if (!trackingNumber) return "";
  const cleanTrack = trackingNumber.trim();
  const cleanCourier = (courier || "").toLowerCase().trim();

  const matched = SUPPORTED_COURIERS.find(
    (c) =>
      cleanCourier.includes(c.id) ||
      cleanCourier.includes(c.code.toLowerCase()) ||
      cleanCourier.includes(c.name.toLowerCase())
  );

  if (matched) {
    return matched.trackingUrlTemplate(cleanTrack);
  }

  // Fallback to Blue Dart standard or Google Tracking Search
  if (cleanCourier.includes("blue") || cleanCourier.includes("dart")) {
    return `https://www.bluedart.com/tracking?track=${encodeURIComponent(cleanTrack)}`;
  }
  return `https://www.google.com/search?q=${encodeURIComponent(`${courier} tracking ${cleanTrack}`)}`;
}

/**
 * Calculates expected doorstep delivery date (default: +4 business days from dispatch).
 */
export function calculateExpectedDelivery(
  dispatchDate: Date = new Date(),
  courierName?: string
): Date {
  const date = new Date(dispatchDate);
  let daysToAdd = 4;

  if (courierName) {
    const courier = SUPPORTED_COURIERS.find((c) =>
      courierName.toLowerCase().includes(c.id)
    );
    if (courier) daysToAdd = courier.typicalDeliveryDays;
  }

  date.setDate(date.getDate() + daysToAdd);
  return date;
}

/**
 * Pluggable Carrier Provider Interface
 */
export interface IShippingCarrierProvider {
  readonly providerName: string;
  createShipment(params: {
    orderNumber: string;
    customerName: string;
    customerPhone: string;
    shippingAddress: any;
    items: any[];
    weightGrams?: number;
    dimensions?: { length: number; width: number; height: number };
  }): Promise<{
    trackingNumber: string;
    trackingUrl: string;
    courierName: string;
    labelUrl?: string;
  }>;
  trackShipment(trackingNumber: string): Promise<{
    status: string;
    location?: string;
    updatedAt: Date;
  }>;
}

/**
 * Manual Shipping Provider (Default):
 * Admin enters courier and AWB details directly.
 */
export class ManualShippingProvider implements IShippingCarrierProvider {
  readonly providerName = "MANUAL";

  async createShipment(params: any) {
    const trackingNumber = `AWB-${params.orderNumber}-${Date.now().toString().slice(-6)}`;
    const courierName = "Blue Dart Express";
    return {
      trackingNumber,
      trackingUrl: generateTrackingUrl(courierName, trackingNumber),
      courierName,
    };
  }

  async trackShipment(trackingNumber: string) {
    return {
      status: "IN_TRANSIT",
      location: "Central Warehouse Hub, Mumbai",
      updatedAt: new Date(),
    };
  }
}

/**
 * Pluggable Stub: Shiprocket Carrier Provider
 */
export class ShiprocketShippingProvider implements IShippingCarrierProvider {
  readonly providerName = "SHIPROCKET";

  async createShipment(params: any) {
    logger.info(`[Shiprocket API Adapter] Generated consignment for Order #${params.orderNumber}`);
    const trackingNumber = `SR-${Date.now().toString().slice(-8)}`;
    return {
      trackingNumber,
      trackingUrl: `https://shiprocket.co/tracking/${trackingNumber}`,
      courierName: "Shiprocket (Delhivery Surface)",
      labelUrl: `/uploads/labels/SR-${params.orderNumber}.pdf`,
    };
  }

  async trackShipment(trackingNumber: string) {
    return {
      status: "PICKED_UP",
      location: "Mumbai Gateway Hub",
      updatedAt: new Date(),
    };
  }
}

/**
 * Pluggable Stub: Delhivery Carrier Provider
 */
export class DelhiveryShippingProvider implements IShippingCarrierProvider {
  readonly providerName = "DELHIVERY";

  async createShipment(params: any) {
    logger.info(`[Delhivery API Adapter] Waybill created for Order #${params.orderNumber}`);
    const trackingNumber = `DLV-${Date.now().toString().slice(-8)}`;
    return {
      trackingNumber,
      trackingUrl: `https://www.delhivery.com/track/package/${trackingNumber}`,
      courierName: "Delhivery Express",
    };
  }

  async trackShipment(trackingNumber: string) {
    return {
      status: "IN_TRANSIT",
      location: "Bhiwandi Sorting Facility",
      updatedAt: new Date(),
    };
  }
}

/**
 * Provider Registry / Factory
 */
export function getShippingProvider(
  provider: "MANUAL" | "SHIPROCKET" | "DELHIVERY" | "BLUEDART" | "DTDC" = "MANUAL"
): IShippingCarrierProvider {
  switch (provider) {
    case "SHIPROCKET":
      return new ShiprocketShippingProvider();
    case "DELHIVERY":
      return new DelhiveryShippingProvider();
    default:
      return new ManualShippingProvider();
  }
}
