import { NextResponse } from "next/server";
import path from "path";
import fs from "fs/promises";
import crypto from "crypto";
import { requireRole } from "@/lib/auth";
import { apiSuccess, apiError, handleApiError } from "@/lib/api-response";

export async function POST(req: Request) {
  try {
    // Admin or Staff can upload product images
    await requireRole(req, "ADMIN", "STAFF");

    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return apiError("No file provided", 400);
    }

    const validMimeTypes = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/svg+xml"];
    if (!validMimeTypes.includes(file.type)) {
      return apiError("Invalid file type. Only JPEG, PNG, WEBP, and GIF images are accepted.", 400);
    }

    // Max 10MB
    if (file.size > 10 * 1024 * 1024) {
      return apiError("File size exceeds maximum allowed 10MB limit.", 400);
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Create unique filename
    const extension = file.name.split(".").pop() || "png";
    const randomHash = crypto.randomBytes(8).toString("hex");
    const safeName = `${Date.now()}_${randomHash}.${extension}`;

    const uploadsDir = path.join(process.cwd(), "public", "uploads");
    await fs.mkdir(uploadsDir, { recursive: true });

    const filePath = path.join(uploadsDir, safeName);
    await fs.writeFile(filePath, buffer);

    const publicUrl = `/uploads/${safeName}`;

    return apiSuccess(
      {
        url: publicUrl,
        filename: safeName,
        originalName: file.name,
        size: file.size,
        mimeType: file.type,
      },
      "Image uploaded successfully",
      201
    );
  } catch (error) {
    return handleApiError(error);
  }
}
