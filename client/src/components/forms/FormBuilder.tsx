import { useState, useMemo, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Trash } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

export type FieldType = "text" | "textarea" | "number" | "email" | "date" | "checkbox" | "radio";

export interface FieldInput {
  id: string;
  label: string;
  type: FieldType;
  required: boolean;
  placeholder?: string;
  options?: string[];
  optionsInput?: string;
}

export interface SectionInput {
  id: string;
  title: string;
  fields: FieldInput[];
}

const fieldTypeOptions: { value: FieldType; label: string }[] = [
  { value: "text", label: "Text Input" },
  { value: "textarea", label: "Paragraph" },
  { value: "number", label: "Numeric" },
  { value: "email", label: "Email" },
  { value: "date", label: "Date" },
  { value: "checkbox", label: "Checkbox Group" },
  { value: "radio", label: "Radio Group" },
];

const createField = (type: FieldType): FieldInput => ({
  id: `field_${crypto.randomUUID()}`,
  type,
  label: `${type.charAt(0).toUpperCase()}${type.slice(1)} field`,
  required: false,
  placeholder: "",
  options: type === "checkbox" || type === "radio" ? ["Option 1", "Option 2"] : [],
  optionsInput: type === "checkbox" || type === "radio" ? "Option 1, Option 2" : "",
});

export interface FormBuilderLoadPayload {
  key: number;
  title?: string;
  description?: string;
  sections?: SectionInput[];
}

export interface FormBuilderProps {
  loadForm?: FormBuilderLoadPayload;
  onLoadComplete?: () => void;
}

export function FormBuilder({ loadForm, onLoadComplete }: FormBuilderProps = {}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [sections, setSections] = useState<SectionInput[]>([
    { id: `section_${Date.now()}`, title: "General", fields: [] },
  ]);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const previewSections = useMemo(
    () =>
      sections.map((section, sectionIndex) => ({
        title: section.title || `Section ${sectionIndex + 1}`,
        fields: section.fields.map((field) => ({
          label: field.label || "Untitled field",
          type: field.type,
          required: field.required,
        })),
      })),
    [sections],
  );
  const hasPreviewContent = previewSections.some((section) => section.fields.length > 0);

  const { user } = useAuth();
  const metadata = useMemo(() => {
    if (!user) return { source: "dynamic-form-builder" };
    return {
      source: "dynamic-form-builder",
      userId: user.id,
      userEmail: user.email,
    };
  }, [user]);

  const mutation = useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const response = await apiRequest("POST", "/api/forms", payload);
      if (!response.ok) {
        const error = await response.json().catch(() => null);
        throw new Error(error?.error || "Failed to save form");
      }
      return response.json();
    },
    onSuccess() {
      toast({
        title: "Form saved",
        description: "Your dynamic form was persisted and is ready to share.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/forms"] });
    },
    onError(error) {
      toast({
        title: "Save failed",
        description: error instanceof Error ? error.message : "Unable to create the form",
        variant: "destructive",
      });
    },
  });

  const addSection = () => {
    setSections((prev) => [
      ...prev,
      {
        id: `section_${Date.now()}`,
        title: `Section ${prev.length + 1}`,
        fields: [],
      },
    ]);
  };

  const addField = (sectionId: string, type: FieldType) => {
    setSections((prev) =>
      prev.map((section) =>
        section.id === sectionId
          ? {
              ...section,
              fields: [...section.fields, createField(type)],
            }
          : section,
      ),
    );
  };

  const clearFieldError = (fieldId: string) => {
    setFieldErrors((prev) => {
      if (!prev[fieldId]) return prev;
      const next = { ...prev };
      delete next[fieldId];
      return next;
    });
  };

  const updateField = (sectionId: string, fieldId: string, updates: Partial<FieldInput>) => {
    setSections((prev) =>
      prev.map((section) => {
        if (section.id !== sectionId) return section;
        return {
          ...section,
          fields: section.fields.map((field) =>
            field.id === fieldId ? { ...field, ...updates } : field,
          ),
        };
      }),
    );
    clearFieldError(fieldId);
  };

  const removeSection = (sectionId: string) => {
    setSections((prev) => prev.filter((section) => section.id !== sectionId));
  };

  const removeField = (sectionId: string, fieldId: string) => {
    setSections((prev) =>
      prev.map((section) => {
        if (section.id !== sectionId) return section;
        return {
          ...section,
          fields: section.fields.filter((field) => field.id !== fieldId),
        };
      }),
    );
  };

  useEffect(() => {
    if (!loadForm) return;
    setTitle(loadForm.title ?? "");
    setDescription(loadForm.description ?? "");
    if (loadForm.sections && loadForm.sections.length) {
      setSections(
        loadForm.sections.map((section) => ({
          ...section,
          fields: section.fields.map((field) => ({
            ...field,
            optionsInput:
              field.options?.length && !field.optionsInput
                ? field.options.join(", ")
                : field.optionsInput ?? "",
          })),
        })),
      );
    } else {
      setSections([{ id: `section_${Date.now()}`, title: "General", fields: [] }]);
    }
    onLoadComplete?.();
  }, [loadForm, onLoadComplete]);

  const payload = useMemo(
    () => ({
      title: title.trim() || "Untitled form",
      description: description.trim(),
    metadata,
    sections: sections.map((section, sectionIndex) => ({
        title: section.title || `Section ${sectionIndex + 1}`,
        order: sectionIndex,
        fields: section.fields.map((field, fieldIndex) => ({
          label: field.label,
          fieldType: field.type,
          required: field.required,
          placeholder: field.placeholder || undefined,
              fieldOptions: (field.optionsInput ?? (field.options ?? []).join(", "))
                .split(",")
                .map((opt) => opt.trim())
                .filter(Boolean),
          order: fieldIndex,
        })),
      })),
    }),
    [sections, title, description],
  );

  const validateForm = () => {
    for (const section of sections) {
      for (const field of section.fields) {
        if (!field.label.trim()) {
          setFieldErrors((prev) => ({
            ...prev,
            [field.id]: "Label is required.",
          }));
          toast({
            title: "Missing field label",
            description: "Each field needs a label so clinicians know what information to collect.",
            variant: "destructive",
          });
          return false;
        }

        if (field.type === "checkbox" || field.type === "radio") {
          const options = (field.optionsInput ?? (field.options ?? []).join(", "))
            .split(",")
            .map((opt) => opt.trim())
            .filter(Boolean);
          if (options.length < 2) {
            setFieldErrors((prev) => ({
              ...prev,
              [field.id]: "Please add at least two comma-separated options (e.g. Male, Female).",
            }));
            toast({
              title: "Configure options",
              description: "Checkbox and radio fields need at least two comma-separated options (e.g. Male, Female).",
              variant: "destructive",
            });
            return false;
          }
        }
      }
    }
    setFieldErrors({});
    return true;
  };

  const handleSaveForm = () => {
    if (!validateForm()) return;
    mutation.mutate(payload);
  };

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
      <div className="overflow-y-auto max-h-[790px]">
        <Card className="space-y-3">
      <CardHeader>
        <CardTitle>Form Builder</CardTitle>
        <p className="text-sm text-muted-foreground">
          Build multi-section medical forms with the fields your team needs. Save and share securely.
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <Label>Form title</Label>
            <Input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="New form title" />
          </div>
          <div>
            <Label>Form description</Label>
            <Textarea
              rows={3}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Explain how the form will be used"
            />
          </div>
        </div>

        <div className="space-y-4">
          {sections.map((section, index) => (
            <div key={section.id} className="border rounded-lg p-4 space-y-3 bg-white dark:bg-gray-900">
              <div className="flex items-center justify-between gap-3">
                <Input
                  className="flex-1"
                  placeholder={`Section ${index + 1} title`}
                  value={section.title}
                  onChange={(event) =>
                    setSections((prev) =>
                      prev.map((item) =>
                        item.id === section.id ? { ...item, title: event.target.value } : item,
                      ),
                    )
                  }
                />
                <Button variant="destructive" size="sm" onClick={() => removeSection(section.id)}>
                  Remove
                </Button>
              </div>
              <div className="space-y-3">
                {section.fields.map((field) => (
                  <div key={field.id} className="space-y-2">
                    <div className="flex items-end gap-3 flex-nowrap">
                      <div className="flex-1 min-w-0 space-y-1">
                        <Label className={fieldErrors[field.id] ? "text-destructive" : ""}>
                          Label
                        </Label>
                        <Input
                          value={field.label}
                          onChange={(event) => updateField(section.id, field.id, { label: event.target.value })}
                          placeholder="Field label"
                          className="w-full"
                        />
                        {fieldErrors[field.id] && (
                          <p className="text-[11px] text-destructive mt-1">
                            {fieldErrors[field.id]}
                          </p>
                        )}
                      </div>
                      <div className="flex-shrink-0 w-[200px] space-y-1">
                        <Label>Type</Label>
                        <Select
                          value={field.type}
                          onValueChange={(value) =>
                            updateField(section.id, field.id, { type: value as FieldType })
                          }
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Choose type" />
                          </SelectTrigger>
                          <SelectContent>
                            {fieldTypeOptions.map((option) => (
                              <SelectItem key={option.value} value={option.value}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex-shrink-0 w-[120px] space-y-1">
                        <Label>Required</Label>
                        <div className="flex items-center h-10">
                          <Switch
                            checked={field.required}
                            onCheckedChange={(checked) => updateField(section.id, field.id, { required: checked })}
                          />
                        </div>
                      </div>
                      <div className="flex-shrink-0 flex items-end pb-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => removeField(section.id, field.id)}
                          className="px-2.5 py-1 h-10 text-xs bg-gray-100 text-red-600 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700"
                          aria-label="Remove field"
                        >
                          <Trash className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    {(field.type === "checkbox" || field.type === "radio") && (
                      <div className="space-y-1">
                        <Label className={fieldErrors[field.id] ? "text-destructive" : ""}>
                          Options (comma separated)
                        </Label>
                        <Textarea
                          rows={2}
                          value={field.optionsInput ?? (field.options ?? []).join(", ")}
                          onChange={(event) =>
                            updateField(section.id, field.id, {
                              optionsInput: event.target.value,
                            })
                          }
                        />
                        <p className="text-xs text-muted-foreground">
                          Enter at least two comma-separated values that will render as individual choices (e.g. Male, Female, Other). Empty values will be ignored.
                        </p>
                        {fieldErrors[field.id] && (
                          <p className="text-[11px] text-destructive mt-1">
                            {fieldErrors[field.id]}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {fieldTypeOptions.map((option) => (
                  <Button
                    key={`${section.id}-${option.value}`}
                    variant="outline"
                    size="sm"
                    className="bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-200 dark:bg-gray-900/70 dark:text-gray-100 dark:border-gray-700 dark:hover:bg-gray-800/80"
                    onClick={() => addField(section.id, option.value)}
                  >
                    Add {option.label}
                  </Button>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap gap-2">
          <Button variant="ghost" onClick={addSection}>
            Add section
          </Button>
          <Button
            disabled={mutation.isPending}
            onClick={handleSaveForm}
          >
            {mutation.isPending ? "Saving…" : "Save form"}
          </Button>
          <Badge>{sections.length} section{sections.length === 1 ? "" : "s"}</Badge>
        </div>
      </CardContent>
      </Card>
    </div>
      <Card className="bg-gradient-to-b from-white/80 to-slate-200 border border-slate-200 shadow-lg dark:from-[#05070f] dark:to-[#0b0c16] dark:border-gray-800 dark:shadow-black/30">
        <CardHeader className="dark:border-b dark:border-gray-800">
          <CardTitle className="text-slate-900 dark:text-slate-100">Live Form Preview</CardTitle>
          <p className="text-sm text-muted-foreground dark:text-slate-400">
            Scroll through your form as if it were rendered inside a PDF page. Every section and field updates instantly.
          </p>
        </CardHeader>
        <CardContent className="dark:bg-transparent">
          <div className="h-[520px] overflow-y-auto">
            <div className="relative mx-auto max-w-[540px] rounded-2xl border border-slate-200 bg-white/90 p-6 shadow-lg shadow-slate-600/10 dark:border-[#1f2933] dark:bg-[#05070f] dark:shadow-black/50">
              <div className="h-[2px] w-14 bg-slate-400/80 mb-4 rounded-full dark:bg-slate-500/70" />
              <div className="space-y-2">
                <p className="text-lg font-semibold text-slate-800 dark:text-slate-100">{title || "Untitled form"}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">{description || "Describe the purpose of the medical form here."}</p>
              </div>
              <div className="mt-5 space-y-4">
                {hasPreviewContent ? (
                  previewSections.map((section, sectionIndex) => (
                    <div
                      key={`section-${sectionIndex}-${section.title}`}
                      className="space-y-2 rounded bg-slate-50/80 p-4 shadow-inner dark:bg-white/5 dark:text-slate-200"
                    >
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold text-slate-700 dark:text-slate-100">{section.title}</p>
                        <Badge variant="outline" className="text-[11px] py-0.5 px-2">
                          {section.fields.length} field{section.fields.length === 1 ? "" : "s"}
                        </Badge>
                      </div>
                      <div className="space-y-2">
                        {section.fields.map((field, fieldIndex) => (
                          <div
                            key={`field-${sectionIndex}-${fieldIndex}-${field.type}-${field.label}`}
                            className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-300"
                          >
                            <span className="line-clamp-1">{field.label}</span>
                            <Badge variant="secondary" className="text-[11px] py-0.5 px-2">
                              {field.type}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="rounded-lg border-2 border-dashed border-slate-300/80 p-6 text-center text-sm text-slate-600 dark:border-slate-700/60 dark:text-slate-300">
                    <p className="font-semibold text-slate-800 dark:text-slate-100">Nothing to preview yet</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Add a field to any section and see the “PDF” update instantly.</p>
                  </div>
                )}
              </div>
              <div className="mt-6 flex justify-between text-[11px] text-slate-500 dark:text-slate-400">
                <span>Live preview · Auto-updates</span>
                <span>PDF-like layout</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

