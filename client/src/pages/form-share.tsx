import { FormFill } from "@/components/forms/FormFill";
import { useMemo } from "react";
import { useLocation } from "wouter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

export default function FormSharePage() {
  const queryClient = useQueryClient();
  const [location] = useLocation();
  const token = useMemo(() => {
    const search = location.split("?")[1] ?? "";
    const params = new URLSearchParams(search);
    return params.get("token") ?? "";
  }, [location]);

  const { data: meta } = useQuery({
    queryKey: ["formShareMeta", token],
    queryFn: async () => {
      if (!token) return null;
      const response = await apiRequest("GET", `/api/forms/share/${token}/meta`);
      if (!response.ok) {
        const error = await response.json().catch(() => null);
        throw new Error(error?.error || "Failed to load share metadata");
      }
      return response.json();
    },
    enabled: !!token,
  });
  const header = meta?.header;
  const footer = meta?.footer;

  const handleFormSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ["filledForms"] });
  };

  return (
    <div className="min-h-screen bg-[#edf0ff] dark:bg-slate-900 flex flex-col items-center py-10 px-4 space-y-6">
      {header && (
        <div className="w-full max-w-4xl rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-lg">
          <div className="flex flex-col gap-2 px-6 py-6 md:flex-row md:items-start md:justify-between">
            <div className="flex items-center gap-4">
              {header.logoBase64 && (
                <img
                  src={header.logoBase64}
                  alt="Clinic logo"
                  className="h-16 w-auto object-contain"
                />
              )}
              <div>
                <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">{header.clinicName}</h1>
                {header.address && <p className="text-sm text-slate-600 dark:text-slate-400">{header.address}</p>}
              </div>
            </div>
            <div className="text-sm text-slate-500 dark:text-slate-400">
              {header.phone && <div>{header.phone}</div>}
              {header.email && <div>{header.email}</div>}
            </div>
          </div>
        </div>
      )}

      <div className="w-full max-w-4xl space-y-6">
        <div className="rounded-[32px] bg-gradient-to-b from-white to-[#f5f7ff] dark:from-slate-800 dark:to-slate-900 p-6 shadow-[0_25px_60px_rgba(15,23,42,0.08)]">
          <p className="text-[11px] font-semibold uppercase tracking-[0.4em] text-slate-400 dark:text-slate-500">
            Form Preview - fill your form details
          </p>
          <h2 className="mt-2 text-3xl font-semibold text-slate-900 dark:text-slate-100">Form Preview</h2>
          <div className="mt-6">
            <div className="rounded-[28px] bg-white dark:bg-slate-800 p-4 shadow-[0_15px_35px_rgba(15,23,42,0.08)]">
              <FormFill
                token={token}
                header={header}
                footer={footer}
                onSubmitSuccess={handleFormSuccess}
                className="shadow-none border-0 bg-transparent"
                showClinicHeader={false}
                showClinicFooter={false}
              />
            </div>
          </div>
        </div>
      </div>

      {footer && (
        <div
          className="w-full max-w-4xl rounded-2xl border border-slate-200 px-6 py-6 text-center text-sm font-semibold"
          style={{
            backgroundColor: footer.backgroundColor ?? "#1f2937",
            color: footer.textColor ?? "#fff",
          }}
        >
          {footer.footerText}
          {footer.showSocial && (
            <div className="mt-2 flex items-center justify-center gap-3 text-xs font-normal">
              {footer.facebook && (
                <a href={footer.facebook} className="underline" target="_blank" rel="noreferrer">
                  Facebook
                </a>
              )}
              {footer.twitter && (
                <a href={footer.twitter} className="underline" target="_blank" rel="noreferrer">
                  Twitter
                </a>
              )}
              {footer.linkedin && (
                <a href={footer.linkedin} className="underline" target="_blank" rel="noreferrer">
                  LinkedIn
                </a>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

