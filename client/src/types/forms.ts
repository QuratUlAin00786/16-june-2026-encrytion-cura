export interface FormFieldSummary {
  id: number;
  label: string;
  fieldType: string;
  required: boolean;
  placeholder?: string;
  fieldOptions: string[];
  order: number;
}

export interface FormSectionSummary {
  id: number;
  title: string;
  order: number;
  metadata?: Record<string, any>;
  fields: FormFieldSummary[];
}

export interface FormSummary {
  id: number;
  title: string;
  description?: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  sections: FormSectionSummary[];
}

