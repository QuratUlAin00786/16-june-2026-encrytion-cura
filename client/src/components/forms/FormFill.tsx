import { useEffect, useMemo, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { CheckCircle } from "lucide-react";

interface ClinicHeaderData {
  logoBase64?: string | null;
  clinicName: string;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
}

interface ClinicFooterData {
  footerText: string;
}

interface FormFillProps {
  token?: string;
  header?: ClinicHeaderData | null;
  footer?: ClinicFooterData | null;
  onSubmitSuccess?: () => void;
  className?: string;
  showClinicHeader?: boolean;
  showClinicFooter?: boolean;
}

const formTypesWithOptions = new Set(["checkbox", "radio", "select"]);

const getTokenFromQuery = () => {
  if (typeof window === "undefined") return "";
  const params = new URLSearchParams(window.location.search);
  return params.get("token") ?? "";
};

export function FormFill({
  token: explicitToken,
  header,
  footer,
  onSubmitSuccess,
  className,
  showClinicHeader = true,
  showClinicFooter = true,
}: FormFillProps) {
  const { toast } = useToast();
  const token = useMemo(() => explicitToken || getTokenFromQuery(), [explicitToken]);

  const { data, isLoading } = useQuery({
    queryKey: ["formShare", token],
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/forms/share/${token}`);
      if (!response.ok) {
        throw new Error("Unable to load form");
      }
      return response.json();
    },
    enabled: !!token,
    retry: false,
  });

  const { control, register, handleSubmit, reset } = useForm<Record<string, any>>({
    defaultValues: {},
  });
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showAlreadySubmitted, setShowAlreadySubmitted] = useState(false);

  useEffect(() => {
    if (data?.form) {
      const defaults: Record<string, any> = {};
      data.form.sections.forEach((section: any) => {
        section.fields.forEach((field: any) => {
          const fieldName = String(field.id);
          defaults[fieldName] = field.fieldType === "checkbox" ? [] : "";
        });
      });
      reset(defaults);
    }
  }, [data, reset]);

  useEffect(() => {
    if (data?.share?.status === "submitted") {
      setShowAlreadySubmitted(true);
    }
  }, [data]);

  const mutation = useMutation({
    mutationFn: async (answers: { fieldId: number; value: any }[]) => {
      const response = await apiRequest("POST", `/api/forms/share/${token}/responses`, {
        answers,
      });
      if (!response.ok) {
        const error = await response.json().catch(() => null);
        throw new Error(error?.error || "Failed to submit form");
      }
      return response.json();
    },
    onSuccess() {
      toast({
        title: "Form submitted",
        description: "We created a secured PDF and notified the care team.",
      });
      setShowSuccessModal(true);
      onSubmitSuccess?.();
    },
    onError(error) {
      if (
        error instanceof Error &&
        error.message.toLowerCase().includes("already submitted")
      ) {
        setShowAlreadySubmitted(true);
        return;
      }
      window.location.href = "https://app.curaemr.ai/";
    },
  });

  const onSubmit = async (values: Record<string, any>) => {
    if (!data?.form) return;
    const answers = data.form.sections.flatMap((section: any) =>
      section.fields.map((field: any) => {
        const fieldName = String(field.id);
        return {
          fieldId: field.id,
          value: values[fieldName],
        };
      }),
    );
    await mutation.mutateAsync(answers);
  };

  if (isLoading) {
    return (
      <Card className="dark:bg-slate-800 dark:border-slate-700">
        <CardHeader>
          <CardTitle className="dark:text-slate-100">Loading form…</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="dark:text-slate-400">Please wait while we verify the link.</p>
        </CardContent>
      </Card>
    );
  }

  if (!data?.form) {
    return (
      <Card className="dark:bg-slate-800 dark:border-slate-700">
        <CardHeader>
          <CardTitle className="dark:text-slate-100">Form unavailable</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="dark:text-slate-400">This link is invalid or expired.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      {showSuccessModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="mx-4 max-w-sm rounded-2xl bg-white dark:bg-slate-800 p-6 text-center shadow-xl">
        <CheckCircle className="mx-auto h-12 w-12 text-emerald-500 dark:text-emerald-400" />
        <h3 className="mt-4 text-lg font-semibold text-slate-900 dark:text-slate-100">
          Form submitted
        </h3>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          We created a secured PDF and notified the care team.
        </p>
        <button
          type="button"
          className="mt-6 inline-flex min-w-[120px] items-center justify-center rounded-full border border-slate-200 dark:border-slate-700 px-5 py-2 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:border-slate-300 dark:hover:border-slate-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 dark:focus-visible:ring-slate-500"
          onClick={() => {
            window.location.href = "https://app.curaemr.ai/";
          }}
        >
          OK
        </button>
      </div>
        </div>
      )}
      {showAlreadySubmitted && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="mx-4 max-w-md rounded-2xl bg-white dark:bg-slate-800 p-6 text-center shadow-xl">
            <CheckCircle className="mx-auto h-12 w-12 text-slate-900 dark:text-slate-100" />
            <h3 className="mt-4 text-lg font-semibold text-slate-900 dark:text-slate-100">
              Form already submitted
            </h3>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              Form is already filled and sent to Cura HealthCare.
            </p>
            <button
              type="button"
              className="mt-6 inline-flex min-w-[140px] items-center justify-center rounded-full border border-slate-200 dark:border-slate-700 px-5 py-2 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:border-slate-300 dark:hover:border-slate-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 dark:focus-visible:ring-slate-500"
              onClick={() => {
                window.location.href = "https://app.curaemr.ai/";
              }}
            >
              Go to Cura HealthCare
            </button>
          </div>
        </div>
      )}
      <Card className={cn("space-y-4 dark:bg-slate-800 dark:border-slate-700", className)}>
      <CardHeader>
        <CardTitle className="dark:text-slate-100">{data.form.title}</CardTitle>
        <p className="text-sm text-muted-foreground dark:text-slate-400">{data.form.description}</p>
      </CardHeader>
      <CardContent className="space-y-6">
        {showClinicHeader && header && (
          <div className="rounded-lg border border-dashed border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 shadow-sm">
            <div className="flex items-center gap-4">
              {header.logoBase64 && (
                <img src={header.logoBase64} alt="Clinic logo" className="h-16 w-auto object-contain" />
              )}
              <div>
                <p className="text-lg font-semibold dark:text-slate-100">{header.clinicName}</p>
                <p className="text-xs text-muted-foreground dark:text-slate-400">
                  {header.address}
                  {(header.address && (header.phone || header.email)) && " · "}
                  {header.phone && `Phone: ${header.phone}`}
                  {header.phone && header.email && " · "}
                  {header.email && `Email: ${header.email}`}
                </p>
              </div>
            </div>
          </div>
        )}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {data.form.sections.map((section: any) => (
            <div key={section.id} className="space-y-4">
              <h3 className="text-lg font-semibold dark:text-slate-100">{section.title}</h3>
              {section.fields.map((field: any) => {
                const fieldName = String(field.id);
                return (
                  <div key={field.id} className="space-y-2">
                    <Label className="text-sm font-medium dark:text-slate-200">
                      {field.label}
                      {field.required && <span className="text-red-500 dark:text-red-400 ml-1">*</span>}
                    </Label>
                    {(() => {
                      switch (field.fieldType) {
                        case "textarea":
                          return (
                            <Textarea
                              {...register(fieldName, { required: field.required })}
                              placeholder={field.placeholder}
                            />
                          );
                        case "number":
                          return (
                            <Input
                              type="number"
                              {...register(fieldName, { required: field.required })}
                              placeholder={field.placeholder}
                            />
                          );
                        case "email":
                          return (
                            <Input
                              type="email"
                              {...register(fieldName, { required: field.required })}
                              placeholder={field.placeholder}
                            />
                          );
                        case "date":
                          return (
                            <Input
                              type="date"
                              {...register(fieldName, { required: field.required })}
                            />
                          );
                        case "checkbox":
                          return (
                            <Controller
                              control={control}
                              name={fieldName}
                              rules={{ required: field.required }}
                              defaultValue={[]}
                              render={({ field: controllerField }) => (
                                <div className="space-y-2">
                                  {field.fieldOptions?.map((option: string) => (
                            <label key={option} className="flex items-center gap-2 text-sm">
                              <Checkbox
                                checked={controllerField.value?.includes(option)}
                                onCheckedChange={(checked) => {
                                  const next = controllerField.value ?? [];
                                  const exists = next.includes(option);
                                  if (checked && !exists) {
                                    controllerField.onChange([...next, option]);
                                  } else if (!checked && exists) {
                                    controllerField.onChange(next.filter((item) => item !== option));
                                  }
                                }}
                                className="h-4 w-4"
                              />
                              <span className="text-sm text-slate-900 dark:text-slate-100">
                                {option}
                              </span>
                            </label>
                                  ))}
                                </div>
                              )}
                            />
                          );
                        case "radio":
                          return (
                            <div className="space-y-2">
                              {field.fieldOptions?.map((option: string) => (
                                <label
                                  key={option}
                                  className={cn(
                                    "flex items-center gap-2 rounded-md border px-3 py-2 text-sm",
                                    "border-border hover:border-primary",
                                  )}
                                >
                                  <input
                                    type="radio"
                                    value={option}
                                    {...register(fieldName, { required: field.required })}
                                    className="accent-primary"
                                  />
                                  <span>{option}</span>
                                </label>
                              ))}
                            </div>
                          );
                        default:
                          return (
                            <Input
                              {...register(fieldName, { required: field.required })}
                              placeholder={field.placeholder}
                            />
                          );
                      }
                    })()}
                  </div>
                );
              })}
            </div>
          ))}
          {showClinicFooter && footer && (
            <div className="rounded-lg border border-dashed border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-4 text-sm text-muted-foreground dark:text-slate-400">
              {footer.footerText}
            </div>
          )}
          <div className="flex justify-end">
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? "Submitting…" : "Submit form"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
    </>
  );
}

