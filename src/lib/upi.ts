import QRCode from "qrcode";

export const MERCHANT_UPI_ID = process.env.MERCHANT_UPI_ID || "figuresworld@icici";
export const MERCHANT_NAME = process.env.MERCHANT_NAME || "FiguresWorld Anime Store";

export interface BuildUpiUriOptions {
  pa?: string;
  pn?: string;
  am: number;
  cu?: string;
  tn: string;
}

/**
 * Builds a standardized NPCI UPI Intent URI for QR codes and deep links.
 * Format: upi://pay?pa={vpa}&pn={name}&am={amount}&cu=INR&tn={note}
 */
export function buildUpiUri(options: BuildUpiUriOptions): string {
  const pa = options.pa || MERCHANT_UPI_ID;
  const pn = options.pn || MERCHANT_NAME;
  const cu = options.cu || "INR";
  const am = options.am.toFixed(2);
  const tn = encodeURIComponent(options.tn);

  return `upi://pay?pa=${pa}&pn=${encodeURIComponent(pn)}&am=${am}&cu=${cu}&tn=${tn}`;
}

/**
 * Generates an SVG string representation of the UPI QR Code
 */
export async function generateUpiQrSvg(uri: string): Promise<string> {
  try {
    return await QRCode.toString(uri, {
      type: "svg",
      margin: 1,
      color: {
        dark: "#1e1b4b", // deep indigo
        light: "#ffffff",
      },
    });
  } catch (err) {
    console.error("Failed to generate QR SVG:", err);
    return "";
  }
}

/**
 * Generates a base64 Data URL representation of the UPI QR Code (PNG)
 */
export async function generateUpiQrDataUrl(uri: string): Promise<string> {
  try {
    return await QRCode.toDataURL(uri, {
      errorCorrectionLevel: "M",
      margin: 2,
      width: 300,
      color: {
        dark: "#1e1b4b",
        light: "#ffffff",
      },
    });
  } catch (err) {
    console.error("Failed to generate QR Data URL:", err);
    return "";
  }
}
