import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { apiSuccess, handleApiError } from "@/lib/api-response";
import { validateRequestBody } from "@/lib/validation";

// Global cache for store settings
declare global {
  // eslint-disable-next-line no-var
  var __figuresWorldStoreSettings: any | undefined;
}

const defaultSettings = {
  storeName: "FiguresWorld Anime Store",
  legalEntity: "FiguresWorld Retail Private Limited",
  gstin: "27AADCF1234F1Z5",
  pan: "AADCF1234F",
  supportEmail: "support@figuresworld.com",
  supportPhone: "+91 98765 43210",
  address: "Shop 42, Akihabara Plaza, Linking Road, Bandra West, Mumbai, MH - 400050",
  merchantUpiId: "figuresworld@icici",
  freeShippingThreshold: 1999,
  flatShippingRate: 100,
  codMaxLimit: 15000,
  whatsappNumber: "+91 98765 43210",
  autoWhatsAppNotifications: true,
  autoEmailNotifications: true,
  inventoryLowStockThreshold: 5,
};

if (!global.__figuresWorldStoreSettings) {
  global.__figuresWorldStoreSettings = { ...defaultSettings };
}

const updateSettingsSchema = z.object({
  storeName: z.string().min(2).optional(),
  legalEntity: z.string().min(2).optional(),
  gstin: z.string().length(15).optional(),
  pan: z.string().length(10).optional(),
  supportEmail: z.string().email().optional(),
  supportPhone: z.string().min(8).optional(),
  address: z.string().min(5).optional(),
  merchantUpiId: z.string().min(5).optional(),
  freeShippingThreshold: z.number().min(0).optional(),
  flatShippingRate: z.number().min(0).optional(),
  codMaxLimit: z.number().min(0).optional(),
  whatsappNumber: z.string().optional(),
  autoWhatsAppNotifications: z.boolean().optional(),
  autoEmailNotifications: z.boolean().optional(),
  inventoryLowStockThreshold: z.number().min(1).optional(),
});

export async function GET(req: Request) {
  try {
    await requireRole(req, "ADMIN", "STAFF");
    return apiSuccess({ settings: global.__figuresWorldStoreSettings });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function PUT(req: Request) {
  try {
    await requireRole(req, "ADMIN");
    const data = await validateRequestBody(req, updateSettingsSchema);

    global.__figuresWorldStoreSettings = {
      ...global.__figuresWorldStoreSettings,
      ...data,
      updatedAt: new Date().toISOString(),
    };

    return apiSuccess({ settings: global.__figuresWorldStoreSettings }, "Store settings updated successfully");
  } catch (err) {
    return handleApiError(err);
  }
}
