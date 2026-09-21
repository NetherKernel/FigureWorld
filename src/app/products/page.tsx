import React from "react";
import ProductListingSkeleton from "@/components/skeletons/ProductListingSkeleton";

export const metadata = {
  title: "All Collectibles & Scale Figures — FiguresWorld",
  description: "Browse our complete catalog of authentic Japanese and western action figures, scale statues, and nendoroids.",
};

export default function ProductsPage() {
  return (
    <main className="min-h-screen py-4">
      <ProductListingSkeleton />
    </main>
  );
}
