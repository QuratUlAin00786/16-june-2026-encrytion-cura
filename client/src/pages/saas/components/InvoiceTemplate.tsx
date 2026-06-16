import { forwardRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { useCurrency } from "@/hooks/use-currency";
import curaLogo from "@assets/cura-logo.png";

interface InvoiceTemplateProps {
  invoice: {
    id: number;
    invoiceNumber: string;
    organizationName: string;
    organizationAddress?: string;
    amount: string;
    currency: string;
    paymentMethod: string;
    paymentStatus: string;
    createdAt: string;
    dueDate: string;
    description?: string;
    lineItems?: Array<{
      description: string;
      quantity: number;
      unitPrice: number;
      total: number;
    }>;
  };
}

const InvoiceTemplate = forwardRef<HTMLDivElement, InvoiceTemplateProps>(
  ({ invoice }, ref) => {
    const { currencyCode } = useCurrency();
    
    const formatCurrency = (
      amount: number | string,
      currency: string = currencyCode,
    ) => {
      const numAmount =
        typeof amount === "string" ? parseFloat(amount) : amount;
      return new Intl.NumberFormat("en-GB", {
        style: "currency",
        currency: currency || currencyCode,
      }).format(numAmount);
    };

    const formatDate = (date: string) => {
      return new Date(date).toLocaleDateString("en-GB", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    };

    const formatDateTime = (date: string) => {
      const d = new Date(date);
      return d.toLocaleDateString("en-GB", {
        year: "numeric",
        month: "long",
        day: "numeric",
      }) + ", " + d.toLocaleTimeString("en-GB", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });
    };

    const getStatusBadge = (status: string) => {
      switch (status.toLowerCase()) {
        case "completed":
          return <Badge className="bg-green-100 text-green-800">Paid</Badge>;
        case "pending":
          return (
            <Badge className="bg-yellow-100 text-yellow-800">Pending</Badge>
          );
        case "overdue":
          return <Badge className="bg-red-100 text-red-800">Overdue</Badge>;
        default:
          return <Badge variant="secondary">{status}</Badge>;
      }
    };

    const subtotal = parseFloat(invoice.amount);
    const vatRate = 0.2; // 20% UK VAT
    const vatAmount = subtotal * vatRate;
    const totalAmount = subtotal + vatAmount;

    return (
      <div ref={ref} className="max-w-4xl mx-auto bg-white p-8 print:p-0" style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}>
        {/* Company Header */}
        <div className="flex justify-between items-start mb-8">
          <div className="flex items-center space-x-4">
            {/* Official Cura Logo */}
            <div className="w-20 h-16">
              <img
                src={curaLogo}
                alt="Cura Logo"
                className="w-full h-full object-contain"
              />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Cura Software Limited
              </h1>
              <p className="text-gray-600">Healthcare Management Solutions</p>
            </div>
          </div>
          <div className="text-right">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">INVOICE</h2>
            <div className="text-sm text-gray-600">
              <p>Invoice #{invoice.invoiceNumber}</p>
              <p>Date: {formatDate(invoice.createdAt)}</p>
              <p>Due: {formatDateTime(invoice.dueDate)}</p>
            </div>
          </div>
        </div>

        {/* Company Details */}
        <div className="grid grid-cols-2 gap-8 mb-8">
          <div>
            <h3 className="font-semibold text-gray-900 mb-2">From:</h3>
            <div className="text-gray-700">
              <p className="font-medium">Cura Software Limited</p>
              <p>Company Registration: 16556912</p>
              <p>Ground Floor Unit 2</p>
              <p>Drayton Court, Drayton Road</p>
              <p>Solihull, England B90 4NG</p>
              <p>United Kingdom</p>
              <p className="mt-2">
                Email: billing@curaemr.ai
                <br />
                Phone: +44 (0) 121 456 7890
              </p>
            </div>
          </div>

          <div>
            <h3 className="font-semibold text-gray-900 mb-2">Bill To:</h3>
            <div className="text-gray-700">
              <p className="font-medium">{invoice.organizationName}</p>
              {invoice.organizationAddress ? (
                <div className="whitespace-pre-line">
                  {invoice.organizationAddress}
                </div>
              ) : (
                <>
                  <p className="font-medium">{invoice.organizationName}</p>
                  <p>Healthcare Organization</p>
                  <p>United Kingdom</p>
                </>
              )}
            </div>

            <div className="mt-4 p-3 bg-gray-50 rounded">
              <div className="flex justify-between items-center mb-2">
                <span className="font-medium">Payment Status:</span>
                {getStatusBadge(invoice.paymentStatus)}
              </div>
              <div className="flex justify-between items-center">
                <span className="font-medium">Payment Method:</span>
                <span className="capitalize">
                  {invoice.paymentMethod.replace("_", " ")}
                </span>
              </div>
            </div>
          </div>
        </div>

        <Separator className="my-6" />

        {/* Invoice Items */}
        <div className="mb-8">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 font-semibold">Description</th>
                <th className="text-right py-3 font-semibold w-24">Qty</th>
                <th className="text-right py-3 font-semibold w-32">
                  Unit Price
                </th>
                <th className="text-right py-3 font-semibold w-32">Total</th>
              </tr>
            </thead>
            <tbody>
              {invoice.lineItems && invoice.lineItems.length > 0 ? (
                invoice.lineItems.map((item, index) => (
                  <tr key={index} className="border-b border-gray-100">
                    <td className="py-3">{item.description}</td>
                    <td className="py-3 text-right">{item.quantity}</td>
                    <td className="py-3 text-right">
                      {formatCurrency(item.unitPrice, invoice.currency)}
                    </td>
                    <td className="py-3 text-right">
                      {formatCurrency(item.total, invoice.currency)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr className="border-b border-gray-100">
                  <td className="py-3">
                    {invoice.description || "Cura EMR Software Subscription"}
                  </td>
                  <td className="py-3 text-right">1</td>
                  <td className="py-3 text-right">
                    {formatCurrency(subtotal, invoice.currency)}
                  </td>
                  <td className="py-3 text-right">
                    {formatCurrency(subtotal, invoice.currency)}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div className="flex justify-end mb-8">
          <div className="w-80">
            <div className="bg-gray-50 p-6 rounded-lg">
              <div className="flex justify-between items-center mb-2">
                <span>Subtotal:</span>
                <span>{formatCurrency(subtotal, invoice.currency)}</span>
              </div>
              <div className="flex justify-between items-center mb-2">
                <span>VAT (20%):</span>
                <span>{formatCurrency(vatAmount, invoice.currency)}</span>
              </div>
              <Separator className="my-3" />
              <div className="flex justify-between items-center font-bold text-lg">
                <span>Total Amount:</span>
                <span>{formatCurrency(totalAmount, invoice.currency)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Payment Information */}
        <div className="grid grid-cols-2 gap-8 mb-8">
          <div>
            <h3 className="font-semibold text-gray-900 mb-2">
              Payment Information
            </h3>
            <div className="text-sm text-gray-700 bg-blue-50 p-4 rounded">
              <p className="font-medium mb-2">Bank Transfer Details:</p>
              <p>Account Name: Cura Software Limited</p>
              <p>Sort Code: 12-34-56</p>
              <p>Account Number: 12345678</p>
              <p>Reference: {invoice.invoiceNumber}</p>
            </div>
          </div>

          <div>
            <h3 className="font-semibold text-gray-900 mb-2">Payment Terms</h3>
            <div className="text-sm text-gray-700">
              <p>• Payment is due within 30 days of invoice date</p>
              <p>• Late payment charges may apply</p>
              <p>• For questions, contact billing@curaemr.ai</p>
              <p>• Online payments available via customer portal</p>
            </div>
          </div>
        </div>

        <Separator className="my-6" />

        {/* Footer */}
        <div className="text-center text-sm text-gray-500">
          <p>
            Cura Software Limited • Registered in England & Wales • Company No.
            16556912
          </p>
          <p>VAT Registration Number: GB123 4567 89 • www.curaemr.ai</p>
          <p className="mt-2">
            Thank you for choosing Cura EMR for your healthcare management
            needs.
          </p>
        </div>
      </div>
    );
  },
);

InvoiceTemplate.displayName = "InvoiceTemplate";

export default InvoiceTemplate;
