import { NextResponse } from "next/server";
import {
  User,
  Admin,
  Product,
  Category,
  Order,
  OrderItem,
  Payment,
  Address,
  Invoice,
  Shipment,
  Coupon,
  Result,
} from "@/models";
import { apiSuccess } from "@/lib/api-response";

export async function GET() {
  const models = [
    { name: "User", model: User, requiredFields: ["name", "email"] },
    { name: "Admin", model: Admin, requiredFields: ["user", "permissions"] },
    { name: "Product", model: Product, requiredFields: ["title", "slug", "description", "sku", "price", "stock", "category"] },
    { name: "Category", model: Category, requiredFields: ["name", "slug"] },
    { name: "Order", model: Order, requiredFields: ["orderNumber", "customer", "pricing", "shippingAddress"] },
    { name: "OrderItem", model: OrderItem, requiredFields: ["order", "product", "productTitle", "productSku", "unitPrice", "quantity", "total"] },
    { name: "Payment", model: Payment, requiredFields: ["order", "customer", "amount", "provider"] },
    { name: "Address", model: Address, requiredFields: ["user", "fullName", "phone", "streetLine1", "city", "state", "postalCode"] },
    { name: "Invoice", model: Invoice, requiredFields: ["invoiceNumber", "order", "customer", "dueDate", "subtotal", "totalAmount"] },
    { name: "Shipment", model: Shipment, requiredFields: ["order", "trackingNumber", "carrier"] },
    { name: "Coupon", model: Coupon, requiredFields: ["code", "discountType", "discountValue", "validUntil"] },
    { name: "Result", model: Result, requiredFields: ["operation", "status", "message"] },
  ];

  const verificationResults = models.map(({ name, model, requiredFields }) => {
    const schemaPaths = Object.keys(model.schema.paths);
    const missingFields = requiredFields.filter((f) => !schemaPaths.includes(f));
    return {
      collection: name,
      modelName: model.modelName,
      registered: Boolean(model.modelName),
      totalFields: schemaPaths.length,
      sampleFields: schemaPaths.slice(0, 6),
      requiredFieldsValidated: missingFields.length === 0,
      missingFields,
    };
  });

  const allPassed = verificationResults.every((r) => r.registered && r.requiredFieldsValidated);

  return apiSuccess(
    {
      totalCollections: models.length,
      allPassed,
      collections: verificationResults,
    },
    allPassed ? "All 12 collections verified successfully" : "Some collections failed verification"
  );
}
