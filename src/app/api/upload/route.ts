import path from "path";
import fs from "fs/promises";
import crypto from "crypto";
import { requireRole } from "@/lib/auth";
import { apiSuccess, apiError, handleApiError } from "@/lib/api-response";
import { logAdminAudit } from "@/lib/audit";

const ALLOWED_EXTENSIONS = ["jpg", "jpeg", "png", "webp", "gif"];
const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const DANGEROUS_EXTENSIONS = [
  "exe", "php", "phtml", "sh", "bat", "cmd", "js", "mjs", "html", "htm", "svg", "py", "pl", "cgi"
];

function validateImageMagicBytes(buffer: Buffer): boolean {
  if (buffer.length < 4) return false;

  // JPEG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return true;
  }

  // PNG: 89 50 4E 47
  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47
  ) {
    return true;
  }

  // GIF: GIF8 (47 49 46 38)
  if (
    buffer[0] === 0x47 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x38
  ) {
    return true;
  }

  // WEBP: RIFF ... WEBP (52 49 46 46 ... 57 45 42 50)
  if (
    buffer.length >= 12 &&
    buffer[0] === 0x52 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x46 &&
    buffer[8] === 0x57 &&
    buffer[9] === 0x45 &&
    buffer[10] === 0x42 &&
    buffer[11] === 0x50
  ) {
    return true;
  }

  return false;
}

export async function POST(req: Request) {
  try {
    // Admin or Staff role required
    const user = await requireRole(req, "ADMIN", "STAFF", "DEVELOPER");

    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return apiError("No file provided", 400);
    }

    // 1. Strict MIME type validation
    if (!ALLOWED_MIME_TYPES.includes(file.type.toLowerCase())) {
      return apiError(
        "Invalid file MIME type. Only JPEG, PNG, WEBP, and GIF images are accepted.",
        400
      );
    }

    // 2. Strict Extension Whitelist & Anti-Double-Extension Check
    const filenameLower = file.name.toLowerCase();
    const extension = filenameLower.split(".").pop() || "";

    if (!ALLOWED_EXTENSIONS.includes(extension)) {
      return apiError(
        `Invalid file extension ".${extension}". Only jpg, jpeg, png, webp, and gif are permitted.`,
        400
      );
    }

    // Block double extensions (e.g. evil.php.png or test.exe.jpg)
    for (const dangerous of DANGEROUS_EXTENSIONS) {
      if (filenameLower.includes(`.${dangerous}.`) || filenameLower.endsWith(`.${dangerous}`)) {
        return apiError("Executable or script extension detected in filename.", 400);
      }
    }

    // 3. Strict Size Limit (5MB)
    const MAX_SIZE = 5 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      return apiError("File size exceeds the maximum allowed 5MB limit.", 400);
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // 4. Magic Bytes Signature Verification (Deep Header Inspection)
    if (!validateImageMagicBytes(buffer)) {
      return apiError(
        "File content signature does not match valid image headers (corrupted or spoofed file).",
        400
      );
    }

    // 5. Cryptographically Randomized Safe Storage Name
    const randomHash = crypto.randomBytes(16).toString("hex");
    const safeName = `${Date.now()}_${randomHash}.${extension}`;

    const uploadsDir = path.join(process.cwd(), "public", "uploads");
    await fs.mkdir(uploadsDir, { recursive: true });

    const filePath = path.join(uploadsDir, safeName);
    await fs.writeFile(filePath, buffer);

    const publicUrl = `/uploads/${safeName}`;

    // Audit Log
    await logAdminAudit({
      action: "IMAGE_UPLOAD",
      actor: user,
      resource: {
        type: "UPLOAD",
        identifier: safeName,
      },
      details: {
        originalName: file.name,
        size: file.size,
        mimeType: file.type,
      },
      req,
    });

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
