import nodemailer from "nodemailer";
import { env } from "@/env/server";

let transporter: nodemailer.Transporter | null = null;

export const getTransporter = () => {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_SECURE, // true for 465, false for other ports
      ...(env.SMTP_USER && env.SMTP_PASSWORD
        ? {
          auth: {
            user: env.SMTP_USER,
            pass: env.SMTP_PASSWORD,
          },
        }
        : {}),
    });
  }
  return transporter;
};

export interface EmailData {
  to: string | string[];
  cc?: string | string[];
  bcc?: string | string[];
  subject: string;
  template?: string;
  html?: string;
  text?: string;
  data?: Record<string, unknown>;
  userId?: string;
  context?: string;
  eventProperties?: Record<string, unknown>;
  attachments?: Array<{
    filename: string;
    content: Buffer;
    contentType?: string;
  }>;
}

export async function sendEmail(
  emailData: EmailData,
): Promise<{ success: boolean; error?: string }> {
  try {
    const transporter = getTransporter();

    // If template is provided, generate HTML from template
    let html = emailData.html;
    if (emailData.template && !html) {
      html = await generateEmailTemplate(emailData.template, emailData.data || {});
    }

    const mailOptions = {
      from: `"${env.EMAIL_FROM_NAME}" <${env.EMAIL_FROM}>`,
      to: Array.isArray(emailData.to) ? emailData.to.join(", ") : emailData.to,
      cc: emailData.cc
        ? Array.isArray(emailData.cc)
          ? emailData.cc.join(", ")
          : emailData.cc
        : undefined,
      bcc: emailData.bcc
        ? Array.isArray(emailData.bcc)
          ? emailData.bcc.join(", ")
          : emailData.bcc
        : undefined,
      subject: emailData.subject,
      html,
      text: emailData.text,
      attachments: emailData.attachments,
    };

    await transporter.sendMail(mailOptions);

    return { success: true };
  } catch (error) {
    console.error("Failed to send email:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// Basic email templates
async function generateEmailTemplate(
  template: string,
  data: Record<string, unknown>,
): Promise<string> {
  const templates: Record<string, (data: Record<string, unknown>) => string> = {
    welcome: (data) => `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Welcome to TanStack SaaS Template</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #3b82f6; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9fafb; }
          .button { display: inline-block; background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Welcome to TanStack SaaS Template!</h1>
          </div>
          <div class="content">
            <p>Hi ${data.userName || "there"},</p>
            <p>Thank you for signing up for our platform. We're excited to have you on board!</p>
            <p>Your email address: ${data.userEmail}</p>
            <p>If you have any questions, feel free to reach out to our support team.</p>
            <a href="${env.VITE_BASE_URL}" class="button">Get Started</a>
            <p>Best regards,<br>The TanStack Team</p>
          </div>
        </div>
      </body>
      </html>
    `,

    "email-verification": (data) => `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Verify Your Email</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #3b82f6; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9fafb; }
          .button { display: inline-block; background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Verify Your Email Address</h1>
          </div>
          <div class="content">
            <p>Hi ${data.userName || "there"},</p>
            <p>Please click the button below to verify your email address:</p>
            <a href="${data.verificationUrl}" class="button">Verify Email</a>
            <p>If you didn't request this verification, you can safely ignore this email.</p>
            <p>This link will expire in 24 hours.</p>
            <p>Best regards,<br>The TanStack Team</p>
          </div>
        </div>
      </body>
      </html>
    `,

    "password-reset": (data) => `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Reset Your Password</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #ef4444; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9fafb; }
          .button { display: inline-block; background: #ef4444; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; margin: 20px 0; }
          .warning { background: #fef2f2; border: 1px solid #fecaca; padding: 10px; border-radius: 4px; margin: 10px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Reset Your Password</h1>
          </div>
          <div class="content">
            <p>Hi ${data.userName || "there"},</p>
            <p>We received a request to reset your password. Click the button below to proceed:</p>
            <a href="${data.resetUrl}" class="button">Reset Password</a>
            <div class="warning">
              <p><strong>Security Notice:</strong> This link will expire in 1 hour. If you didn't request this password reset, please ignore this email.</p>
            </div>
            <p>Best regards,<br>The TanStack Team</p>
          </div>
        </div>
      </body>
      </html>
    `,

    "magic-link": (data) => `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Sign in with Magic Link</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #3b82f6; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9fafb; }
          .button { display: inline-block; background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; margin: 20px 0; }
          .warning { background: #eff6ff; border: 1px solid #bfdbfe; padding: 10px; border-radius: 4px; margin: 10px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Sign in</h1>
          </div>
          <div class="content">
            <p>Click the button below to sign in:</p>
            <a href="${data.magicLinkUrl}" class="button">Sign in</a>
            <div class="warning">
              <p><strong>Security Notice:</strong> If you did not request this link, you can safely ignore this email.</p>
            </div>
            <p>If the button doesn't work, paste this into your browser:</p>
            <p style="word-break: break-all; font-size: 12px;">${data.magicLinkUrl}</p>
            <p>Best regards,<br>The TanStack Team</p>
          </div>
        </div>
      </body>
      </html>
    `,

    "otp-verification": (data) => `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Your Verification Code</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #f59e0b; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9fafb; }
          .otp { font-size: 24px; font-weight: bold; letter-spacing: 4px; background: #fef3c7; padding: 15px; border-radius: 4px; margin: 20px 0; text-align: center; }
          .warning { background: #fef2f2; border: 1px solid #fecaca; padding: 10px; border-radius: 4px; margin: 10px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Verification Code</h1>
          </div>
          <div class="content">
            <p>Hi ${data.userName || "there"},</p>
            <p>Your verification code is:</p>
            <div class="otp">${data.otp}</div>
            <div class="warning">
              <p><strong>Security Notice:</strong> This code will expire in 10 minutes. Never share this code with anyone.</p>
            </div>
            <p>If you didn't request this code, you can safely ignore this email.</p>
            <p>Best regards,<br>The TanStack Team</p>
          </div>
        </div>
      </body>
      </html>
    `,

    "organization-invitation": (data) => `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Organization Invitation</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #8b5cf6; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9fafb; }
          .button { display: inline-block; background: #8b5cf6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; margin: 20px 0; }
          .invitation { background: #f3e8ff; border: 1px solid #d8b4fe; padding: 15px; border-radius: 4px; margin: 10px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>You're Invited!</h1>
          </div>
          <div class="content">
            <p>Hi,</p>
            <div class="invitation">
              <p><strong>${data.inviterName}</strong> has invited you to join <strong>${data.organizationName}</strong>.</p>
              <p>Click the button below to accept the invitation and get started.</p>
            </div>
            <a href="${data.invitationUrl}" class="button">Accept Invitation</a>
            <p>If you don't want to join this organization, you can safely ignore this email.</p>
            <p>Best regards,<br>The TanStack Team</p>
          </div>
        </div>
      </body>
      </html>
    `,

    // =========================================================================
    // E-Commerce Email Templates
    // =========================================================================

    "order-confirmation": (data) => {
      const items = (data.items as Array<{ name: string; quantity: number; price: string; total: string }>) || [];
      return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Order Confirmation</title>
        <style>
          body { font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #2d2d2d; margin: 0; padding: 0; background: #faf5f0; }
          .container { max-width: 600px; margin: 0 auto; }
          .header { background: linear-gradient(135deg, #e11d48, #fb923c); color: white; padding: 32px 24px; text-align: center; border-radius: 0 0 24px 24px; }
          .header h1 { margin: 0; font-size: 24px; }
          .header p { margin: 8px 0 0; opacity: 0.9; font-size: 14px; }
          .content { padding: 24px; }
          .order-box { background: white; border-radius: 16px; border: 1px solid #f0e6dc; padding: 24px; margin-bottom: 16px; }
          .order-number { font-size: 18px; font-weight: bold; color: #e11d48; }
          .items-table { width: 100%; border-collapse: collapse; margin-top: 16px; }
          .items-table th { text-align: left; padding: 8px 0; border-bottom: 2px solid #f0e6dc; font-size: 12px; text-transform: uppercase; color: #888; }
          .items-table td { padding: 12px 0; border-bottom: 1px solid #f8f0e8; font-size: 14px; }
          .total-row { font-weight: bold; font-size: 16px; color: #e11d48; }
          .button { display: inline-block; background: #e11d48; color: white; padding: 14px 28px; text-decoration: none; border-radius: 12px; font-weight: 600; margin: 16px 0; }
          .footer { text-align: center; padding: 24px; color: #888; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Order Confirmed!</h1>
            <p>Thank you for your purchase</p>
          </div>
          <div class="content">
            <div class="order-box">
              <p class="order-number">Order ${data.orderNumber}</p>
              <p style="color: #888; font-size: 14px;">${data.itemCount} item${Number(data.itemCount) !== 1 ? "s" : ""}</p>
              <table class="items-table">
                <thead>
                  <tr><th>Item</th><th>Qty</th><th style="text-align:right">Price</th></tr>
                </thead>
                <tbody>
                  ${items.map((item) => `<tr><td>${item.name}</td><td>${item.quantity}</td><td style="text-align:right">${item.total}</td></tr>`).join("")}
                  <tr class="total-row"><td colspan="2">Total</td><td style="text-align:right">${data.total}</td></tr>
                </tbody>
              </table>
            </div>
            <div style="text-align: center;">
              <a href="${data.orderUrl}" class="button">View Order</a>
            </div>
            <p style="text-align: center; color: #888; font-size: 13px;">
              You'll receive another email when your order ships with tracking information.
            </p>
          </div>
          <div class="footer">
            <p>If you have any questions, reply to this email or contact our support team.</p>
          </div>
        </div>
      </body>
      </html>
    `;
    },

    "order-shipped": (data) => `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Your Order Has Shipped</title>
        <style>
          body { font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #2d2d2d; margin: 0; padding: 0; background: #faf5f0; }
          .container { max-width: 600px; margin: 0 auto; }
          .header { background: linear-gradient(135deg, #7c3aed, #3b82f6); color: white; padding: 32px 24px; text-align: center; border-radius: 0 0 24px 24px; }
          .header h1 { margin: 0; font-size: 24px; }
          .content { padding: 24px; }
          .tracking-box { background: white; border-radius: 16px; border: 1px solid #f0e6dc; padding: 24px; margin-bottom: 16px; text-align: center; }
          .tracking-number { font-size: 20px; font-weight: bold; letter-spacing: 2px; color: #7c3aed; background: #f3e8ff; padding: 12px 20px; border-radius: 8px; display: inline-block; margin: 12px 0; }
          .carrier { font-size: 14px; color: #888; text-transform: uppercase; letter-spacing: 1px; }
          .button { display: inline-block; background: #7c3aed; color: white; padding: 14px 28px; text-decoration: none; border-radius: 12px; font-weight: 600; margin: 16px 0; }
          .button-outline { display: inline-block; border: 2px solid #e11d48; color: #e11d48; padding: 12px 24px; text-decoration: none; border-radius: 12px; font-weight: 600; margin: 8px 8px; }
          .footer { text-align: center; padding: 24px; color: #888; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Your Order Is On Its Way!</h1>
          </div>
          <div class="content">
            <div class="tracking-box">
              <p style="font-size: 14px; color: #666;">Order ${data.orderNumber}</p>
              <p class="carrier">${data.carrier}</p>
              <div class="tracking-number">${data.trackingNumber}</div>
              <br>
              <a href="${data.trackingUrl}" class="button">Track Package</a>
            </div>
            <div style="text-align: center;">
              <a href="${data.orderUrl}" class="button-outline">View Order Details</a>
            </div>
          </div>
          <div class="footer">
            <p>You'll receive a confirmation when your package is delivered.</p>
          </div>
        </div>
      </body>
      </html>
    `,

    "order-delivered": (data) => `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Your Order Has Been Delivered</title>
        <style>
          body { font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #2d2d2d; margin: 0; padding: 0; background: #faf5f0; }
          .container { max-width: 600px; margin: 0 auto; }
          .header { background: linear-gradient(135deg, #059669, #34d399); color: white; padding: 32px 24px; text-align: center; border-radius: 0 0 24px 24px; }
          .header h1 { margin: 0; font-size: 24px; }
          .content { padding: 24px; }
          .delivered-box { background: white; border-radius: 16px; border: 1px solid #f0e6dc; padding: 32px 24px; margin-bottom: 16px; text-align: center; }
          .check-icon { display: inline-block; width: 64px; height: 64px; background: #d1fae5; border-radius: 50%; line-height: 64px; font-size: 32px; margin-bottom: 16px; }
          .button { display: inline-block; background: #e11d48; color: white; padding: 14px 28px; text-decoration: none; border-radius: 12px; font-weight: 600; margin: 16px 0; }
          .footer { text-align: center; padding: 24px; color: #888; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Package Delivered!</h1>
          </div>
          <div class="content">
            <div class="delivered-box">
              <div class="check-icon">&#10003;</div>
              <h2 style="margin: 0 0 8px;">Order ${data.orderNumber}</h2>
              <p style="color: #888; font-size: 14px;">Your order has been delivered successfully.</p>
              <p style="color: #666; font-size: 14px; margin-top: 24px;">
                We'd love to hear about your experience! Leave a review to help other shoppers.
              </p>
              <a href="${data.reviewUrl}" class="button">Leave a Review</a>
            </div>
          </div>
          <div class="footer">
            <p>Having issues with your delivery? Reply to this email and we'll help you out.</p>
          </div>
        </div>
      </body>
      </html>
    `,

    "low-stock-alert": (data) => `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Low Stock Alert</title>
        <style>
          body { font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #2d2d2d; margin: 0; padding: 0; background: #faf5f0; }
          .container { max-width: 600px; margin: 0 auto; }
          .header { background: linear-gradient(135deg, #d97706, #f59e0b); color: white; padding: 32px 24px; text-align: center; border-radius: 0 0 24px 24px; }
          .header h1 { margin: 0; font-size: 24px; }
          .content { padding: 24px; }
          .alert-box { background: white; border-radius: 16px; border: 2px solid #fbbf24; padding: 24px; margin-bottom: 16px; }
          .stock-badge { display: inline-block; background: #fef3c7; color: #92400e; padding: 4px 12px; border-radius: 20px; font-weight: 600; font-size: 13px; }
          .stat { display: inline-block; text-align: center; margin: 0 16px; }
          .stat-value { font-size: 28px; font-weight: bold; }
          .stat-label { font-size: 11px; text-transform: uppercase; color: #888; letter-spacing: 1px; }
          .button { display: inline-block; background: #d97706; color: white; padding: 14px 28px; text-decoration: none; border-radius: 12px; font-weight: 600; margin: 16px 0; }
          .footer { text-align: center; padding: 24px; color: #888; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Low Stock Alert</h1>
          </div>
          <div class="content">
            <div class="alert-box">
              <span class="stock-badge">Action Required</span>
              <h2 style="margin: 16px 0 4px;">${data.productName}</h2>
              <p style="color: #888; font-size: 14px; margin: 0;">SKU: ${data.sku}</p>
              <div style="text-align: center; margin: 24px 0;">
                <div class="stat">
                  <div class="stat-value" style="color: #dc2626;">${data.currentStock}</div>
                  <div class="stat-label">Current Stock</div>
                </div>
                <div class="stat">
                  <div class="stat-value" style="color: #d97706;">${data.threshold}</div>
                  <div class="stat-label">Threshold</div>
                </div>
              </div>
              <div style="text-align: center;">
                <a href="${data.inventoryUrl}" class="button">Manage Inventory</a>
              </div>
            </div>
          </div>
          <div class="footer">
            <p>This is an automated alert from your inventory management system.</p>
          </div>
        </div>
      </body>
      </html>
    `,

    "abandoned-cart": (data) => {
      const items = (data.items as Array<{ name: string; variant: string; quantity: number; price: string }>) || [];
      return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>You left something behind!</title>
        <style>
          body { font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #2d2d2d; margin: 0; padding: 0; background: #faf5f0; }
          .container { max-width: 600px; margin: 0 auto; }
          .header { background: linear-gradient(135deg, #e11d48, #fb923c); color: white; padding: 32px 24px; text-align: center; border-radius: 0 0 24px 24px; }
          .header h1 { margin: 0; font-size: 24px; }
          .header p { margin: 8px 0 0; opacity: 0.9; font-size: 14px; }
          .content { padding: 24px; }
          .cart-box { background: white; border-radius: 16px; border: 1px solid #f0e6dc; padding: 24px; margin-bottom: 16px; }
          .item-row { display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid #f8f0e8; }
          .item-name { font-weight: 600; font-size: 14px; }
          .item-variant { font-size: 12px; color: #888; }
          .item-price { font-weight: 600; color: #e11d48; }
          .total { text-align: right; font-size: 18px; font-weight: bold; color: #e11d48; margin-top: 16px; }
          .button { display: inline-block; background: #e11d48; color: white; padding: 14px 28px; text-decoration: none; border-radius: 12px; font-weight: 600; margin: 16px 0; }
          .footer { text-align: center; padding: 24px; color: #888; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>You Left Something Behind!</h1>
            <p>Your cart is waiting for you</p>
          </div>
          <div class="content">
            <div class="cart-box">
              <p style="font-size: 14px; color: #666; margin-top: 0;">${data.itemCount} item${Number(data.itemCount) !== 1 ? "s" : ""} in your cart</p>
              ${items.map((item) => `
                <div style="display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid #f8f0e8;">
                  <div>
                    <div style="font-weight: 600; font-size: 14px;">${item.name}</div>
                    ${item.variant ? `<div style="font-size: 12px; color: #888;">${item.variant}</div>` : ""}
                    <div style="font-size: 12px; color: #888;">Qty: ${item.quantity}</div>
                  </div>
                  <div style="font-weight: 600; color: #e11d48;">${item.price}</div>
                </div>
              `).join("")}
              <div class="total">Total: ${data.total}</div>
            </div>
            <div style="text-align: center;">
              <a href="${data.cartUrl}" class="button">Complete Your Purchase</a>
              <p style="color: #888; font-size: 13px;">Items in your cart may sell out soon!</p>
            </div>
          </div>
          <div class="footer">
            <p>If you no longer wish to receive these emails, you can unsubscribe at any time.</p>
          </div>
        </div>
      </body>
      </html>
    `;
    },

    // =========================================================================
    // Billing Email Templates
    // =========================================================================

    "subscription-activated": (data) => `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Subscription Activated</title>
        <style>
          body { font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #2d2d2d; margin: 0; padding: 0; background: #faf5f0; }
          .container { max-width: 600px; margin: 0 auto; }
          .header { background: linear-gradient(135deg, #059669, #34d399); color: white; padding: 32px 24px; text-align: center; border-radius: 0 0 24px 24px; }
          .header h1 { margin: 0; font-size: 24px; }
          .content { padding: 24px; }
          .plan-box { background: white; border-radius: 16px; border: 1px solid #f0e6dc; padding: 32px 24px; margin-bottom: 16px; text-align: center; }
          .plan-name { font-size: 22px; font-weight: bold; color: #059669; text-transform: capitalize; }
          .button { display: inline-block; background: #059669; color: white; padding: 14px 28px; text-decoration: none; border-radius: 12px; font-weight: 600; margin: 16px 0; }
          .footer { text-align: center; padding: 24px; color: #888; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Welcome to Your New Plan!</h1>
          </div>
          <div class="content">
            <div class="plan-box">
              <p style="color: #888; font-size: 14px; margin: 0;">Hi ${data.userName},</p>
              <p style="margin: 16px 0 4px; font-size: 14px; color: #666;">You're now subscribed to</p>
              <div class="plan-name">${data.planName}</div>
              <p style="color: #666; font-size: 14px; margin-top: 16px;">
                All features of your plan are now active. Start exploring!
              </p>
              <a href="${env.VITE_BASE_URL}/dashboard" class="button">Go to Dashboard</a>
            </div>
          </div>
          <div class="footer">
            <p>Need help? Reply to this email and we'll be happy to assist.</p>
          </div>
        </div>
      </body>
      </html>
    `,

    "subscription-canceled": (data) => `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Subscription Canceled</title>
        <style>
          body { font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #2d2d2d; margin: 0; padding: 0; background: #faf5f0; }
          .container { max-width: 600px; margin: 0 auto; }
          .header { background: linear-gradient(135deg, #6b7280, #9ca3af); color: white; padding: 32px 24px; text-align: center; border-radius: 0 0 24px 24px; }
          .header h1 { margin: 0; font-size: 24px; }
          .content { padding: 24px; }
          .message-box { background: white; border-radius: 16px; border: 1px solid #f0e6dc; padding: 32px 24px; margin-bottom: 16px; text-align: center; }
          .button { display: inline-block; background: #e11d48; color: white; padding: 14px 28px; text-decoration: none; border-radius: 12px; font-weight: 600; margin: 16px 0; }
          .footer { text-align: center; padding: 24px; color: #888; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>We're Sorry to See You Go</h1>
          </div>
          <div class="content">
            <div class="message-box">
              <p style="font-size: 14px; color: #666;">Hi ${data.userName},</p>
              <p style="color: #666; font-size: 14px;">
                Your subscription has been canceled. You'll still have access to your current plan features until the end of your billing period.
              </p>
              ${data.reason ? `<p style="color: #888; font-size: 13px; font-style: italic;">Reason: ${data.reason}</p>` : ""}
              <p style="color: #666; font-size: 14px; margin-top: 24px;">
                Changed your mind? You can resubscribe anytime.
              </p>
              <a href="${env.VITE_BASE_URL}/dashboard" class="button">Resubscribe</a>
            </div>
          </div>
          <div class="footer">
            <p>We'd love your feedback to help us improve. Reply to this email anytime.</p>
          </div>
        </div>
      </body>
      </html>
    `,

    "trial-ended": (data) => `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Your Trial Has Ended</title>
        <style>
          body { font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #2d2d2d; margin: 0; padding: 0; background: #faf5f0; }
          .container { max-width: 600px; margin: 0 auto; }
          .header { background: linear-gradient(135deg, #d97706, #f59e0b); color: white; padding: 32px 24px; text-align: center; border-radius: 0 0 24px 24px; }
          .header h1 { margin: 0; font-size: 24px; }
          .content { padding: 24px; }
          .message-box { background: white; border-radius: 16px; border: 1px solid #f0e6dc; padding: 32px 24px; margin-bottom: 16px; text-align: center; }
          .plan-name { font-weight: bold; color: #d97706; text-transform: capitalize; }
          .button { display: inline-block; background: #e11d48; color: white; padding: 14px 28px; text-decoration: none; border-radius: 12px; font-weight: 600; margin: 16px 0; }
          .footer { text-align: center; padding: 24px; color: #888; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Your Trial Has Ended</h1>
          </div>
          <div class="content">
            <div class="message-box">
              <p style="font-size: 14px; color: #666;">Hi ${data.userName},</p>
              <p style="color: #666; font-size: 14px;">
                Your trial of the <span class="plan-name">${data.planName}</span> plan has ended.
                Subscribe now to keep all your features and data.
              </p>
              <a href="${env.VITE_BASE_URL}/dashboard" class="button">Subscribe Now</a>
              <p style="color: #888; font-size: 13px;">
                Don't worry, all your data is safe and will be waiting for you.
              </p>
            </div>
          </div>
          <div class="footer">
            <p>Questions? Reply to this email and we'll help you out.</p>
          </div>
        </div>
      </body>
      </html>
    `,

    "credits-purchased": (data) => `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Credits Added</title>
        <style>
          body { font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #2d2d2d; margin: 0; padding: 0; background: #faf5f0; }
          .container { max-width: 600px; margin: 0 auto; }
          .header { background: linear-gradient(135deg, #7c3aed, #a78bfa); color: white; padding: 32px 24px; text-align: center; border-radius: 0 0 24px 24px; }
          .header h1 { margin: 0; font-size: 24px; }
          .content { padding: 24px; }
          .credits-box { background: white; border-radius: 16px; border: 1px solid #f0e6dc; padding: 32px 24px; margin-bottom: 16px; text-align: center; }
          .credits-added { font-size: 36px; font-weight: bold; color: #7c3aed; }
          .balance { font-size: 14px; color: #888; margin-top: 8px; }
          .button { display: inline-block; background: #7c3aed; color: white; padding: 14px 28px; text-decoration: none; border-radius: 12px; font-weight: 600; margin: 16px 0; }
          .footer { text-align: center; padding: 24px; color: #888; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Credits Added!</h1>
          </div>
          <div class="content">
            <div class="credits-box">
              <p style="font-size: 14px; color: #666; margin: 0;">Hi ${data.userName},</p>
              <p style="color: #888; font-size: 14px; margin-top: 16px;">Credits purchased</p>
              <div class="credits-added">+${data.credits}</div>
              <div class="balance">New balance: ${data.newBalance} credits</div>
              <a href="${env.VITE_BASE_URL}/dashboard" class="button">Go to Dashboard</a>
            </div>
          </div>
          <div class="footer">
            <p>Thank you for your purchase!</p>
          </div>
        </div>
      </body>
      </html>
    `,
  };

  const templateFunction = templates[template];
  if (!templateFunction) {
    throw new Error(`Email template '${template}' not found`);
  }

  return templateFunction(data);
}
