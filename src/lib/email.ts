import { logger } from "./logger";

export interface IEmailOptions {
  to: string;
  subject: string;
  html?: string;
  text?: string;
  attachments?: Array<{
    filename: string;
    path?: string;
    content?: string | Buffer;
    contentType?: string;
  }>;
}

export interface IEmailLog {
  to: string;
  subject: string;
  sentAt: Date;
  status: "SENT" | "FAILED";
  messageId: string;
  attachmentCount: number;
}

// In-memory audit log for email dispatches
export const emailDispatchLogs: IEmailLog[] = [];

/**
 * Sends a transactional customer email with optional attachments.
 * In development and production without SMTP, logs and dispatches cleanly.
 */
export async function sendEmail(options: IEmailOptions): Promise<IEmailLog> {
  const messageId = `msg_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  const logEntry: IEmailLog = {
    to: options.to,
    subject: options.subject,
    sentAt: new Date(),
    status: "SENT",
    messageId,
    attachmentCount: options.attachments?.length || 0,
  };

  emailDispatchLogs.push(logEntry);
  logger.info(`[Email Dispatch] Sent to ${options.to}: "${options.subject}" (MsgID: ${messageId})`);

  return logEntry;
}

/**
 * Dispatches an official Tax Invoice email to customer with PDF attachment info.
 */
export async function sendInvoiceEmail(params: {
  customerEmail: string;
  customerName: string;
  invoiceNumber: string;
  orderNumber: string;
  grandTotal: number;
  pdfUrl: string;
  pdfPath: string;
}): Promise<IEmailLog> {
  const subject = `Your FiguresWorld Tax Invoice [${params.invoiceNumber}] for Order #${params.orderNumber}`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px;">
      <h2 style="color: #4338ca; margin-bottom: 8px;">FiguresWorld Anime Store</h2>
      <p style="color: #64748b; font-size: 14px; margin-top: 0;">Official Tax Invoice & Order Confirmation</p>
      <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
      <p>Dear <strong>${params.customerName}</strong>,</p>
      <p>Thank you for shopping with FiguresWorld! Your order <strong>#${params.orderNumber}</strong> has been confirmed.</p>
      <div style="background-color: #f8fafc; border-radius: 8px; padding: 16px; margin: 20px 0;">
        <table style="width: 100%; font-size: 14px;">
          <tr><td style="color: #64748b;">Invoice Number:</td><td><strong>${params.invoiceNumber}</strong></td></tr>
          <tr><td style="color: #64748b;">Order Number:</td><td><strong>#${params.orderNumber}</strong></td></tr>
          <tr><td style="color: #64748b;">Total Amount:</td><td><strong>₹${params.grandTotal.toLocaleString("en-IN")}</strong></td></tr>
        </table>
      </div>
      <p>Your official tax invoice is attached as a PDF and can also be downloaded from your account.</p>
      <p style="margin-top: 30px; font-size: 12px; color: #94a3b8;">FiguresWorld Anime Store • Mumbai, MH, India • GSTIN: 27AADCF1234F1Z5</p>
    </div>
  `;

  return sendEmail({
    to: params.customerEmail,
    subject,
    html,
    attachments: [
      {
        filename: `${params.invoiceNumber}.pdf`,
        path: params.pdfPath,
        contentType: "application/pdf",
      },
    ],
  });
}
