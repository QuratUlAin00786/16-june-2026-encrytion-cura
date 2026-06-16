import React from "react";
import { Badge } from "@/components/ui/badge";
import { Receipt } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";

export const invoiceStatusVariant: Record<string, string> = {
  paid: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300 border-0",
  unpaid: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300 border-0",
  overdue: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300 border-0",
  draft: "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300 border-0",
  sent: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 border-0",
  cancelled: "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400 border-0",
};

/**
 * Shows invoice number and status for an appointment when user is doctor or nurse.
 * Fetches from /api/invoices/by-service?serviceType=appointments&appointmentId=<id>.
 */
export function AppointmentInvoiceInfo({ appointmentId }: { appointmentId: string | null | undefined }) {
  const { user } = useAuth();
  const isDoctorOrNurse = user?.role === "doctor" || user?.role === "nurse";
  const { data: invoice, isLoading } = useQuery({
    queryKey: ["/api/invoices/by-service", "appointments", appointmentId],
    enabled: !!appointmentId && isDoctorOrNurse,
    retry: false,
    queryFn: async () => {
      if (!appointmentId) return null;
      try {
        const params = new URLSearchParams({ serviceType: "appointments", appointmentId });
        const response = await apiRequest("GET", `/api/invoices/by-service?${params.toString()}`);
        const data = await response.json();
        return data;
      } catch (err: any) {
        if (err?.message?.includes("404") || err?.message?.includes("not found")) return null;
        throw err;
      }
    },
  });

  if (!isDoctorOrNurse || !appointmentId || isLoading || !invoice) return null;

  const status = String(invoice.status ?? "").toLowerCase();
  const variant = invoiceStatusVariant[status] ?? "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300 border-0";
  const invoiceLabel = invoice.invoiceNumber ?? `#${invoice.id}`;

  return (
    <div className="flex flex-wrap items-center gap-2 text-sm">
      <span className="flex items-center gap-1.5 text-gray-700 dark:text-gray-300">
        <Receipt className="h-4 w-4 text-gray-500" />
        <span className="font-medium">Invoice No.:</span>
        <span>{invoiceLabel}</span>
      </span>
      <Badge className={`text-xs font-medium ${variant}`}>
        {status || "—"}
      </Badge>
    </div>
  );
}
