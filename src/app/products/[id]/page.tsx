import React from "react";
import ProductDetailSkeleton from "@/components/skeletons/ProductDetailSkeleton";

export const metadata = {
  title: "Collectible Figure Details — FiguresWorld",
  description: "View specifications, high-definition gallery, and preorder collector figures.",
};

export default function ProductDetailPage() {
  return (
    <main className="min-h-screen py-4">
      <ProductDetailSkeleton />
    </main>
  );
}
