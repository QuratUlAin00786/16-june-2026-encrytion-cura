import { useEffect, useState } from "react";
import { useLocation, useParams, Link as RouterLink } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { FormBuilder, FormBuilderLoadPayload, FieldType } from "@/components/forms/FormBuilder";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Header } from "@/components/layout/header";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { apiRequest } from "@/lib/queryClient";
import { getActiveSubdomain } from "@/lib/subdomain-utils";
import type { FormSummary } from "@/types/forms";

const buildFormPayload = (form: FormSummary): FormBuilderLoadPayload => {
  const normalizedSections = form.sections.map((section) => ({
    id: `section_${section.id}`,
    title: section.title || `Section ${section.order + 1}`,
    fields: section.fields.map((field) => ({
      id: `field_${section.id}_${field.id}`,
      label: field.label || "Untitled field",
      type: field.fieldType as FieldType,
      required: field.required,
      placeholder: field.placeholder || "",
      options: field.fieldOptions ?? [],
    })),
  }));

  return {
    key: Date.now(),
    title: form.title,
    description: form.description || "",
    sections: normalizedSections,
  };
};

export default function SharedFormPage() {
  const { shareId } = useParams<{ shareId?: string }>();
  const [location] = useLocation();
  const [formLoadPayload, setFormLoadPayload] = useState<FormBuilderLoadPayload | null>(null);
  const [copyStatus, setCopyStatus] = useState<"idle" | "copied">("idle");

  const parseJsonResponse = async (response: Response) => {
    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.includes("application/json")) {
      const text = await response.text();
      throw new Error(text ? text.trim().slice(0, 200) : "Unexpected response format");
    }
    return response.json();
  };

  const { data, isLoading, error } = useQuery({
    queryKey: ["/api/forms/shared", shareId],
    queryFn: async () => {
      if (!shareId) {
        throw new Error("Invalid share link");
      }
      const response = await apiRequest("GET", `/api/forms/shared/${shareId}`);
      if (!response.ok) {
        const err = await parseJsonResponse(response).catch(() => null);
        throw new Error(err?.error || "Unable to load shared form");
      }
      return parseJsonResponse(response);
    },
    enabled: Boolean(shareId),
    retry: false,
  });

  const form = data?.form as FormSummary | undefined;

  useEffect(() => {
    if (!form) {
      setFormLoadPayload(null);
      return;
    }
    setFormLoadPayload(buildFormPayload(form));
  }, [form]);

  const shareUrl = typeof window !== "undefined" ? window.location.href : location;

  const copyLink = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopyStatus("copied");
      setTimeout(() => setCopyStatus("idle"), 2000);
    } catch (err) {
      console.error("Failed to copy share link:", err);
    }
  };

  const subdomain = getActiveSubdomain({ ignorePath: true });

  const isInvalid = !shareId || (!form && !isLoading && !error);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#05070e]">
      <div className="flex items-center justify-between border-b border-gray-200 bg-white px-6 py-4 dark:border-[#111827] dark:bg-[#05070e]">
        <Header title="Shared Form" subtitle="Edit this saved form and send it to patients." />
        <div className="flex items-center gap-4">
          <ThemeToggle />
          <Button asChild variant="ghost" size="sm">
            <RouterLink href={`/${subdomain}/forms`}>
              Back to forms
            </RouterLink>
          </Button>
        </div>
      </div>
      <div className="px-6 py-6">
        {isInvalid ? (
          <div className="max-w-3xl rounded-lg border border-red-200 bg-white p-6 text-sm text-red-600">
            <p>Invalid or expired share link.</p>
            <p className="mt-2 text-xs text-gray-500">Generate a new link from your workspace.</p>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex flex-col gap-4 rounded-xl border border-dashed border-gray-300 bg-white/80 p-6 shadow-sm dark:border-[#374151] dark:bg-[#0c1120]">
              <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                Share this URL with your team or patient. It opens the form in the builder so it can be edited or filled.
              </p>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Input value={shareUrl} readOnly className="flex-1 bg-gray-100 dark:bg-[#131c2b]" />
                <Button variant="outline" size="sm" onClick={copyLink}>
                  {copyStatus === "copied" ? "Copied" : "Copy link"}
                </Button>
              </div>
            </div>
            {isLoading ? (
              <div className="rounded-lg border border-gray-200 bg-white p-6 text-sm text-gray-500 shadow-sm">
                Loading form data…
              </div>
            ) : error ? (
              <div className="rounded-lg border border-red-200 bg-white p-6 text-sm text-red-600 shadow-sm">
                {(error as Error).message || "Unable to load the form."}
              </div>
            ) : formLoadPayload ? (
              <FormBuilder
                loadForm={formLoadPayload}
                onLoadComplete={() => setFormLoadPayload(null)}
              />
            ) : (
              <div className="rounded-lg border border-gray-200 bg-white p-6 text-sm text-gray-500 shadow-sm">
                Unable to prepare the form. Please double-check the link.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

