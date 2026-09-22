import { connectToDatabase } from "@/lib/db";
import { Order } from "@/models/Order";
import { Product } from "@/models/Product";
import { Category } from "@/models/Category";
import { requireRole } from "@/lib/auth";
import { apiSuccess, handleApiError } from "@/lib/api-response";

export async function GET(req: Request) {
  try {
    // Require ADMIN or STAFF role
    await requireRole(req, "ADMIN", "STAFF");
    await connectToDatabase();

    const { searchParams } = new URL(req.url);
    const timeframeDays = parseInt(searchParams.get("days") || "14", 10);

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);

    // Fetch all orders and products
    const [allOrders, allProducts, allCategories] = await Promise.all([
      Order.find({}).sort({ createdAt: -1 }),
      Product.find({}),
      Category.find({}),
    ]);

    // 1. KPI Calculations
    let todayOrders = 0;
    let todayRevenue = 0;
    let pendingPaymentsCount = 0;
    let pendingPaymentsAmount = 0;
    let codOrdersCount = 0;
    let codOrdersAmount = 0;
    let pendingDispatchCount = 0;
    let deliveredOrdersCount = 0;
    let cancelledOrdersCount = 0;

    const categoryMap = new Map<string, string>();
    allCategories.forEach((cat: any) => {
      categoryMap.set(cat._id.toString(), cat.name);
    });

    // Product Sales Map
    const productSalesMap = new Map<string, { title: string; sku: string; unitsSold: number; revenue: number; stock: number; categoryName: string }>();

    // Category Sales Map
    const categorySalesMap = new Map<string, { name: string; count: number; revenue: number }>();
    allCategories.forEach((cat: any) => {
      categorySalesMap.set(cat.name, { name: cat.name, count: 0, revenue: 0 });
    });

    // Payment Methods Split
    const paymentMethodsMap = {
      UPI: { count: 0, revenue: 0 },
      COD: { count: 0, revenue: 0 },
    };

    // Date range buckets for charts (last N days)
    const dailyMap = new Map<string, { date: string; label: string; revenue: number; totalOrders: number; delivered: number; dispatched: number; processing: number; cancelled: number }>();
    for (let i = timeframeDays - 1; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 24 * 3600 * 1000);
      const key = d.toISOString().split("T")[0];
      const label = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      dailyMap.set(key, {
        date: key,
        label,
        revenue: 0,
        totalOrders: 0,
        delivered: 0,
        dispatched: 0,
        processing: 0,
        cancelled: 0,
      });
    }

    allOrders.forEach((order: any) => {
      const placedDate = new Date(order.placedAt || order.createdAt || now);
      const isToday = placedDate >= todayStart;
      const grandTotal = Number(order.pricing?.grandTotal || 0);
      const status = (order.orderStatus || "").toUpperCase();
      const pStatus = (order.paymentStatus || "").toUpperCase();
      const pMethod = (order.paymentMethod || "").toUpperCase();

      // Today's metrics
      if (isToday) {
        todayOrders++;
        if (status !== "CANCELLED" && status !== "REFUNDED") {
          todayRevenue += grandTotal;
        }
      }

      // Pending Payments
      if (
        status === "PENDING_PAYMENT" ||
        status === "PAYMENT_REVIEW" ||
        pStatus === "PENDING" ||
        pStatus === "UNDER_REVIEW"
      ) {
        pendingPaymentsCount++;
        pendingPaymentsAmount += grandTotal;
      }

      // COD Orders
      if (pMethod === "COD") {
        codOrdersCount++;
        codOrdersAmount += grandTotal;
      }

      // Pending Dispatch (CONFIRMED, PROCESSING, PACKED)
      if (
        status === "CONFIRMED" ||
        status === "PROCESSING" ||
        status === "PACKED"
      ) {
        pendingDispatchCount++;
      }

      // Delivered Orders
      if (status === "DELIVERED") {
        deliveredOrdersCount++;
      }

      // Cancelled Orders
      if (status === "CANCELLED") {
        cancelledOrdersCount++;
      }

      // Payment Method Analytics
      if (pMethod === "UPI") {
        paymentMethodsMap.UPI.count++;
        if (status !== "CANCELLED") paymentMethodsMap.UPI.revenue += grandTotal;
      } else if (pMethod === "COD") {
        paymentMethodsMap.COD.count++;
        if (status !== "CANCELLED") paymentMethodsMap.COD.revenue += grandTotal;
      }

      // Chart: Daily trends
      const dayKey = placedDate.toISOString().split("T")[0];
      const dailyBucket = dailyMap.get(dayKey);
      if (dailyBucket) {
        dailyBucket.totalOrders++;
        if (status !== "CANCELLED" && status !== "REFUNDED") {
          dailyBucket.revenue += grandTotal;
        }
        if (status === "DELIVERED") dailyBucket.delivered++;
        else if (status === "DISPATCHED" || status === "OUT_FOR_DELIVERY") dailyBucket.dispatched++;
        else if (status === "CONFIRMED" || status === "PROCESSING" || status === "PACKED") dailyBucket.processing++;
        else if (status === "CANCELLED") dailyBucket.cancelled++;
      }

      // Product sales breakdown
      if (Array.isArray(order.items)) {
        order.items.forEach((item: any) => {
          const itemTitle = item.title || item.name || "Collector Figure";
          const itemSku = item.sku || "FIGURE-SKU";
          const itemQty = Number(item.quantity || 1);
          const itemTotal = Number(item.total || item.totalPrice || item.price * itemQty || 0);

          const existing = productSalesMap.get(itemTitle) || {
            title: itemTitle,
            sku: itemSku,
            unitsSold: 0,
            revenue: 0,
            stock: 0,
            categoryName: "Anime Figures",
          };

          existing.unitsSold += itemQty;
          if (status !== "CANCELLED") {
            existing.revenue += itemTotal;
          }
          productSalesMap.set(itemTitle, existing);
        });
      }
    });

    // Match products with live stock
    allProducts.forEach((prod: any) => {
      const catName = categoryMap.get(prod.category?.toString()) || "Collectibles";
      const existing = productSalesMap.get(prod.title || prod.name);
      if (existing) {
        existing.stock = prod.stock;
        existing.categoryName = catName;
      } else {
        productSalesMap.set(prod.title || prod.name, {
          title: prod.title || prod.name,
          sku: prod.sku,
          unitsSold: 0,
          revenue: 0,
          stock: prod.stock,
          categoryName: catName,
        });
      }

      // Category aggregation
      const catBucket = categorySalesMap.get(catName) || { name: catName, count: 0, revenue: 0 };
      catBucket.count += 1;
      categorySalesMap.set(catName, catBucket);
    });

    // Populate category revenues from sold products
    for (const p of productSalesMap.values()) {
      const c = categorySalesMap.get(p.categoryName);
      if (c) {
        c.revenue += p.revenue;
      }
    }

    // Low Stock Products
    const lowStockItems = allProducts
      .filter((p: any) => p.stock <= (p.lowStockThreshold || 5))
      .map((p: any) => ({
        id: p._id.toString(),
        title: p.title || p.name,
        sku: p.sku,
        stock: p.stock,
        lowStockThreshold: p.lowStockThreshold || 5,
        price: p.price,
        category: categoryMap.get(p.category?.toString()) || "Anime Figures",
      }))
      .sort((a: any, b: any) => a.stock - b.stock);

    // Top Selling Products (Sorted by revenue or units sold)
    const topProducts = Array.from(productSalesMap.values())
      .sort((a, b) => b.revenue - a.revenue || b.unitsSold - a.unitsSold)
      .slice(0, 8);

    // Categories breakdown
    const totalCategoryRevenue = Array.from(categorySalesMap.values()).reduce((acc, c) => acc + c.revenue, 0) || 1;
    const categoriesBreakdown = Array.from(categorySalesMap.values())
      .map((cat) => ({
        name: cat.name,
        count: cat.count,
        revenue: cat.revenue,
        percentage: Math.round((cat.revenue / totalCategoryRevenue) * 100),
      }))
      .sort((a, b) => b.revenue - a.revenue || b.count - a.count);

    // Payment methods total
    const totalPaymentsCount = (paymentMethodsMap.UPI.count + paymentMethodsMap.COD.count) || 1;
    const paymentMethodsBreakdown = [
      {
        method: "UPI",
        label: "Direct UPI",
        count: paymentMethodsMap.UPI.count,
        revenue: paymentMethodsMap.UPI.revenue,
        percentage: Math.round((paymentMethodsMap.UPI.count / totalPaymentsCount) * 100),
      },
      {
        method: "COD",
        label: "Cash on Delivery",
        count: paymentMethodsMap.COD.count,
        revenue: paymentMethodsMap.COD.revenue,
        percentage: Math.round((paymentMethodsMap.COD.count / totalPaymentsCount) * 100),
      },
    ];

    // Recent 6 orders
    const recentOrders = allOrders.slice(0, 6).map((o: any) => ({
      orderNumber: o.orderNumber,
      customerName: o.shippingAddress?.fullName || o.customerEmail,
      customerEmail: o.customerEmail,
      grandTotal: o.pricing?.grandTotal || 0,
      orderStatus: o.orderStatus,
      paymentMethod: o.paymentMethod,
      paymentStatus: o.paymentStatus,
      placedAt: o.placedAt || o.createdAt,
      itemsCount: Array.isArray(o.items) ? o.items.length : 1,
    }));

    return apiSuccess({
      metrics: {
        todayOrders,
        todayRevenue,
        pendingPayments: {
          count: pendingPaymentsCount,
          amount: pendingPaymentsAmount,
        },
        codOrders: {
          count: codOrdersCount,
          amount: codOrdersAmount,
        },
        pendingDispatch: pendingDispatchCount,
        deliveredOrders: deliveredOrdersCount,
        cancelledOrders: cancelledOrdersCount,
        lowStockCount: lowStockItems.length,
      },
      charts: {
        revenue: Array.from(dailyMap.values()),
        orders: Array.from(dailyMap.values()),
        products: topProducts,
        categories: categoriesBreakdown,
        paymentMethods: paymentMethodsBreakdown,
      },
      lowStockItems: lowStockItems.slice(0, 10),
      recentOrders,
    });
  } catch (err) {
    return handleApiError(err);
  }
}
