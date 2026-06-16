import { MailService } from '@sendgrid/mail';

const mailService = new MailService();
if (process.env.SENDGRID_API_KEY) {
  mailService.setApiKey(process.env.SENDGRID_API_KEY);
}

interface EmailParams {
  to: string;
  from: string;
  subject: string;
  text?: string;
  html?: string;
  attachments?: Array<{
    content: string;
    filename: string;
    type: string;
    disposition: string;
  }>;
}

interface ClinicHeaderData {
  logoBase64?: string | null;
  logoPosition: string;
  clinicName: string;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  clinicNameFontSize?: string;
  fontSize?: string;
  fontFamily?: string;
  fontWeight?: string;
  fontStyle?: string;
  textDecoration?: string;
}

interface ClinicFooterData {
  footerText: string;
  backgroundColor: string;
  textColor: string;
  showSocial: boolean;
  facebook?: string | null;
  twitter?: string | null;
  linkedin?: string | null;
}

export interface SendEmailResult {
  success: boolean;
  error?: string;
}

const formatSendGridError = (error: any): string => {
  if (error?.response?.body?.errors) {
    const errors = error.response.body.errors;
    if (Array.isArray(errors) && errors.length > 0) {
      return errors
        .map(
          (err: any) =>
            err?.message ?? (err?.detail ? `${err.detail}` : "Unknown SendGrid error"),
        )
        .join(" | ");
    }
  }
  if (error?.message) {
    return error.message;
  }
  return "Unknown SendGrid error";
};

export async function sendEmailDetailed(params: EmailParams): Promise<SendEmailResult> {
  if (!process.env.SENDGRID_API_KEY) {
    const message = "SENDGRID_API_KEY environment variable is not set";
    console.error('SendGrid email error:', message);
    return { success: false, error: message };
  }
  
  try {
    await mailService.send({
      to: params.to,
      from: params.from,
      subject: params.subject,
      text: params.text,
      html: params.html,
      attachments: params.attachments,
    });
    return { success: true };
  } catch (error: any) {
    const errorMessage = formatSendGridError(error);
    console.error('SendGrid email error:', errorMessage, error);
    return { success: false, error: errorMessage };
  }
}

export async function sendEmail(params: EmailParams): Promise<boolean> {
  const result = await sendEmailDetailed(params);
  return result.success;
}

export function generatePrescriptionEmailHTML(
  patientName: string,
  clinicHeader?: ClinicHeaderData,
  clinicFooter?: ClinicFooterData
): string {
  // Default values if no clinic header provided
  const headerData = clinicHeader || {
    logoPosition: 'center',
    clinicName: 'Cura EMR',
    clinicNameFontSize: '24pt',
    fontSize: '12pt',
    fontFamily: 'verdana',
    fontWeight: 'normal',
    fontStyle: 'normal',
    textDecoration: 'none'
  };

  // Default footer if not provided
  const footerData = clinicFooter || {
    footerText: 'Cura EMR Platform',
    backgroundColor: '#4A7DFF',
    textColor: '#FFFFFF',
    showSocial: false
  };

  // Logo HTML based on position
  let logoHTML = '';
  if (headerData.logoBase64) {
    const logoSrc = headerData.logoBase64.startsWith('data:') 
      ? headerData.logoBase64 
      : `data:image/png;base64,${headerData.logoBase64}`;
    
    logoHTML = `<img src="${logoSrc}" alt="Clinic Logo" style="max-width: 120px; max-height: 80px; margin-bottom: 10px;" />`;
  }

  // Header layout based on position
  let headerHTML = '';
  const textAlign = headerData.logoPosition === 'left' ? 'left' : headerData.logoPosition === 'right' ? 'right' : 'center';
  
  const clinicInfoHTML = `
    <div style="text-align: ${textAlign}; font-family: ${headerData.fontFamily || 'verdana'};">
      ${logoHTML}
      <div style="
        font-size: ${headerData.clinicNameFontSize || '24pt'}; 
        font-weight: ${headerData.fontWeight || 'normal'};
        font-style: ${headerData.fontStyle || 'normal'};
        text-decoration: ${headerData.textDecoration || 'none'};
        color: #4CAF50;
        margin-bottom: 8px;
      ">${headerData.clinicName}</div>
      ${headerData.address ? `<div style="font-size: ${headerData.fontSize || '12pt'}; color: #666;">${headerData.address}</div>` : ''}
      <div style="font-size: ${headerData.fontSize || '12pt'}; color: #666;">
        ${headerData.phone ? `${headerData.phone}` : ''}${headerData.phone && headerData.email ? ' • ' : ''}${headerData.email ? headerData.email : ''}
      </div>
      ${headerData.website ? `<div style="font-size: ${headerData.fontSize || '12pt'}; color: #666;">${headerData.website}</div>` : ''}
    </div>
    <hr style="border: none; border-top: 2px solid #4CAF50; margin: 20px 0;" />
  `;

  headerHTML = `
    <div style="padding: 30px; background-color: #f9f9f9;">
      ${clinicInfoHTML}
    </div>
  `;

  // Footer HTML
  const footerHTML = `
    <div style="
      background-color: ${footerData.backgroundColor};
      color: ${footerData.textColor};
      padding: 20px;
      text-align: center;
      font-size: 14px;
    ">
      ${footerData.footerText}
    </div>
  `;

  // Complete email HTML
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f5f5f5;">
      <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
        ${headerHTML}
        
        <div style="padding: 30px;">
          <h2 style="color: #333; margin-top: 0;">Prescription Document</h2>
          
          <p style="color: #666; line-height: 1.6;">Dear Halo Health,</p>
          
          <p style="color: #666; line-height: 1.6;">
            Please find attached the electronic prescription for <strong>${patientName}</strong>. 
            This document has been digitally generated and contains all necessary prescription details with electronic signature verification.
          </p>
          
          <div style="
            background-color: #f0f7ff;
            border-left: 4px solid #4A7DFF;
            padding: 15px;
            margin: 20px 0;
          ">
            <h3 style="margin-top: 0; color: #333; font-size: 16px;">Prescription Details</h3>
            <p style="margin: 5px 0; color: #666;">
              This prescription has been electronically verified and approved by the prescribing physician.
              Please process this prescription according to standard protocols.
            </p>
          </div>
          
          <p style="color: #666; line-height: 1.6;">
            If you have any questions or require additional information, please do not hesitate to contact our clinic.
          </p>
          
          <p style="color: #666; line-height: 1.6;">Best regards,<br>Medical Team</p>
        </div>
        
        ${footerHTML}
      </div>
    </body>
    </html>
  `;
}

function buildLogoHTML(logoBase64?: string | null) {
  if (!logoBase64) return "";
  const logoSrc = logoBase64.startsWith("data:")
    ? logoBase64
    : `data:image/png;base64,${logoBase64}`;
  return `<img src="${logoSrc}" alt="Clinic Logo" style="max-width: 80px; max-height: 80px; display:block;" />`;
}

function buildFooterHTML(footerData?: ClinicFooterData) {
  const footer = footerData || {
    footerText: "Cura EMR Platform",
    backgroundColor: "#4A7DFF",
    textColor: "#FFFFFF",
    showSocial: false,
  };
  return `
    <div style="
      background-color: ${footer.backgroundColor};
      color: ${footer.textColor};
      padding: 18px 20px;
      text-align: center;
      font-size: 13px;
    ">
      ${footer.footerText}
    </div>
  `;
}

function buildBrandedHeaderHTML(clinicHeader?: ClinicHeaderData) {
  const h = clinicHeader || {
    logoPosition: "left",
    clinicName: "Cura EMR",
    clinicNameFontSize: "22pt",
    fontSize: "12pt",
    fontFamily: "verdana",
    fontWeight: "bold",
    fontStyle: "normal",
    textDecoration: "none",
  };

  const logo = buildLogoHTML(h.logoBase64);
  const line1 = h.address ? `<div style="opacity:0.95; margin-top:4px;">${h.address}</div>` : "";
  const line2 =
    h.phone || h.email
      ? `<div style="opacity:0.95; margin-top:6px;">
          ${h.phone ? `Phone: ${h.phone}` : ""}${h.phone && h.email ? "<br/>" : ""}${h.email ? `Email: ${h.email}` : ""}
        </div>`
      : "";
  const line3 = h.website ? `<div style="opacity:0.95; margin-top:6px;">Website: ${h.website}</div>` : "";

  return `
    <div style="padding: 0; background: linear-gradient(135deg, #5B21B6 0%, #6D28D9 55%, #7C3AED 100%);">
      <div style="padding: 24px 26px; display:flex; gap:18px; align-items:flex-start;">
        ${logo ? `<div style="background:#ffffff; border-radius:10px; padding:10px; width:100px; display:flex; align-items:center; justify-content:center;">${logo}</div>` : ""}
        <div style="color:#ffffff; font-family:${h.fontFamily || "verdana"};">
          <div style="
            font-size: ${h.clinicNameFontSize || "22pt"};
            font-weight: ${h.fontWeight || "bold"};
            font-style: ${h.fontStyle || "normal"};
            text-decoration: ${h.textDecoration || "none"};
            line-height: 1.15;
          ">${h.clinicName || "Clinic"}</div>
          <div style="font-size: 12px; margin-top: 6px; opacity:0.95;">
            ${line1}
            ${line2}
            ${line3}
          </div>
        </div>
      </div>
    </div>
  `;
}

export function generateBookingLinkEmailHTML(args: {
  link: string;
  clinicHeader?: ClinicHeaderData;
  clinicFooter?: ClinicFooterData;
}) {
  const headerHTML = buildBrandedHeaderHTML(args.clinicHeader);
  const footerHTML = buildFooterHTML(args.clinicFooter);
  const safeLink = args.link;

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin:0; padding:0; font-family: Arial, sans-serif; background-color:#f5f5f5;">
      <div style="max-width:600px; margin:0 auto; background-color:#ffffff;">
        ${headerHTML}
        <div style="padding: 26px;">
          <h2 style="color:#111827; margin: 0 0 10px 0;">Your appointment booking link</h2>
          <p style="color:#4B5563; line-height:1.6; margin-top:0;">Hello,</p>
          <p style="color:#4B5563; line-height:1.6;">
            Please use the link below to book your appointment. This link will expire in 48 hours.
          </p>

          <div style="
            background-color: #f0f7ff;
            border-left: 4px solid #4A7DFF;
            border-radius: 12px;
            padding: 16px;
            margin: 18px 0;
            word-break: break-word;
          ">
            <div style="font-weight:700; color:#1F3A8A; margin-bottom:10px;">Booking Link</div>
            <div style="margin-bottom:12px;">
              <a href="${safeLink}" style="color:#2563EB; text-decoration:underline; font-size: 14px;">${safeLink}</a>
            </div>
            <div>
              <a href="${safeLink}" style="
                display:inline-block;
                background:#4A7DFF;
                color:#ffffff;
                padding:10px 14px;
                border-radius:10px;
                text-decoration:none;
                font-weight:700;
                font-size: 14px;
              ">Book Appointment</a>
            </div>
          </div>

          <div style="margin-top: 16px;">
            <div style="font-weight:700; color:#111827; margin-bottom:6px;">Important Notes:</div>
            <ul style="margin: 0; padding-left: 18px; color:#4B5563; font-size: 13px; line-height:1.6;">
              <li>This link can only be used once.</li>
              <li>This link will expire in 48 hours.</li>
              <li>If you did not request this, you can ignore this email.</li>
            </ul>
          </div>
        </div>
        ${footerHTML}
      </div>
    </body>
    </html>
  `;
}

export function generateAppointmentConfirmationEmailHTML(args: {
  visitorName: string;
  appointmentId: string;
  patientId?: string | null;
  clinicName: string;
  doctorName: string;
  type: string;
  service: string;
  date: string;
  time: string;
  durationLabel: string;
  clinicHeader?: ClinicHeaderData;
  clinicFooter?: ClinicFooterData;
}) {
  const headerHTML = buildBrandedHeaderHTML(args.clinicHeader);
  const footerHTML = buildFooterHTML(args.clinicFooter);

  const rows = [
    ["Appointment ID", args.appointmentId],
    ["Patient ID", args.patientId || "—"],
    ["Clinic", args.clinicName],
    ["Doctor", args.doctorName],
    ["Type", args.type],
    ["Service", args.service],
    ["Date", args.date],
    ["Time", args.time],
    ["Duration", args.durationLabel],
  ];

  const detailsHTML = rows
    .map(
      ([k, v]) => `
        <tr>
          <td style="padding:10px 12px; font-weight:600; color:#374151; width:45%; border-top:1px solid #E5E7EB;">${k}:</td>
          <td style="padding:10px 12px; color:#111827; text-align:left; border-top:1px solid #E5E7EB;">${v}</td>
        </tr>
      `,
    )
    .join("");

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin:0; padding:0; font-family: Arial, sans-serif; background-color:#f5f5f5;">
      <div style="max-width:600px; margin:0 auto; background-color:#ffffff;">
        ${headerHTML}
        <div style="padding: 26px;">
          <h2 style="color:#111827; margin: 0 0 10px 0;">Appointment Confirmation</h2>
          <p style="color:#4B5563; line-height:1.6; margin-top:0;">
            Hello ${args.visitorName || "Qura-visitor"},
          </p>
          <p style="color:#4B5563; line-height:1.6;">
            Your appointment has been booked successfully. Here is your summary:
          </p>
          <div style="background:#EEF2FF; border:1px solid #E0E7FF; border-radius:14px; padding: 0; overflow:hidden;">
            <div style="padding: 12px 14px; background:#E0E7FF; color:#3730A3; font-weight:700;">
              Appointment Details
            </div>
            <table style="width:100%; border-collapse:collapse; font-size: 14px;">
              <tbody>
                ${detailsHTML}
              </tbody>
            </table>
          </div>
          <div style="margin-top: 16px; color:#4B5563; font-size: 13px; line-height: 1.6;">
            If you need to make changes, please contact the clinic.
          </div>
        </div>
        ${footerHTML}
      </div>
    </body>
    </html>
  `;
}