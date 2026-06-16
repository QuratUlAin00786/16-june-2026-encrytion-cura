import { useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { 
  Plus, 
  Trash2, 
  Edit3, 
  Eye, 
  Copy, 
  Settings, 
  FileText, 
  CheckSquare, 
  Calendar,
  Hash,
  Type,
  List,
  ToggleLeft,
  Star,
  Upload,
  Phone,
  Mail,
  MapPin,
  Stethoscope,
  Heart,
  Activity,
  Move,
  Save,
  Send
} from "lucide-react";
import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd";

export interface FormField {
  id: string;
  type: 'text' | 'textarea' | 'number' | 'email' | 'phone' | 'date' | 'select' | 'multiselect' | 'radio' | 'checkbox' | 'rating' | 'file' | 'signature' | 'medical_history' | 'symptom_checker' | 'pain_scale' | 'vitals';
  label: string;
  placeholder?: string;
  required: boolean;
  options?: string[];
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
    message?: string;
  };
  conditional?: {
    showIf: string;
    value: string;
  };
  medicalType?: 'assessment' | 'symptoms' | 'history' | 'prescription' | 'vital_signs';
}

export interface FormTemplate {
  id: string;
  title: string;
  description: string;
  category: 'intake' | 'survey' | 'assessment' | 'consent' | 'feedback' | 'medical' | 'custom';
  fields: FormField[];
  settings: {
    allowAnonymous: boolean;
    requireAuthentication: boolean;
    multiPage: boolean;
    showProgress: boolean;
    autoSave: boolean;
    notifications: boolean;
    branding: boolean;
  };
  styling: {
    theme: 'default' | 'medical' | 'modern' | 'minimal';
    primaryColor: string;
    backgroundColor: string;
    fontFamily: string;
  };
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
}

const fieldTypes = [
  { type: 'text', icon: Type, label: 'Text Input', description: 'Single line text field' },
  { type: 'textarea', icon: FileText, label: 'Text Area', description: 'Multi-line text field' },
  { type: 'number', icon: Hash, label: 'Number', description: 'Numeric input field' },
  { type: 'email', icon: Mail, label: 'Email', description: 'Email address field' },
  { type: 'phone', icon: Phone, label: 'Phone', description: 'Phone number field' },
  { type: 'date', icon: Calendar, label: 'Date', description: 'Date picker field' },
  { type: 'select', icon: List, label: 'Dropdown', description: 'Single selection dropdown' },
  { type: 'multiselect', icon: CheckSquare, label: 'Multi-Select', description: 'Multiple selection field' },
  { type: 'radio', icon: ToggleLeft, label: 'Radio Buttons', description: 'Single choice from options' },
  { type: 'checkbox', icon: CheckSquare, label: 'Checkboxes', description: 'Multiple choice options' },
  { type: 'rating', icon: Star, label: 'Rating', description: 'Star or scale rating' },
  { type: 'file', icon: Upload, label: 'File Upload', description: 'File attachment field' },
  { type: 'signature', icon: Edit3, label: 'Signature', description: 'Digital signature pad' },
  { type: 'medical_history', icon: Heart, label: 'Medical History', description: 'Structured medical history' },
  { type: 'symptom_checker', icon: Stethoscope, label: 'Symptom Checker', description: 'Interactive symptom assessment' },
  { type: 'pain_scale', icon: Activity, label: 'Pain Scale', description: 'Visual pain assessment scale' },
  { type: 'vitals', icon: Activity, label: 'Vital Signs', description: 'Blood pressure, temperature, etc.' }
];

const predefinedTemplates: Partial<FormTemplate>[] = [
  {
    title: "Patient Intake Form",
    description: "Comprehensive new patient registration and medical history",
    category: "intake",
    fields: [
      { id: "1", type: "text", label: "Full Name", required: true },
      { id: "2", type: "date", label: "Date of Birth", required: true },
      { id: "3", type: "email", label: "Email Address", required: true },
      { id: "4", type: "phone", label: "Phone Number", required: true },
      { id: "5", type: "medical_history", label: "Medical History", required: true, medicalType: "history" },
      { id: "6", type: "textarea", label: "Current Medications", required: false },
      { id: "7", type: "textarea", label: "Known Allergies", required: false },
      { id: "8", type: "checkbox", label: "Insurance Information", options: ["Private Insurance", "NHS", "Self-Pay", "Other"], required: true }
    ]
  },
  {
    title: "Pre-Visit Symptom Assessment",
    description: "Patient symptom screening before appointment",
    category: "assessment",
    fields: [
      { id: "1", type: "symptom_checker", label: "Primary Symptoms", required: true, medicalType: "symptoms" },
      { id: "2", type: "pain_scale", label: "Pain Level", required: false },
      { id: "3", type: "select", label: "Duration of Symptoms", options: ["Less than 24 hours", "1-3 days", "1 week", "2-4 weeks", "More than a month"], required: true },
      { id: "4", type: "radio", label: "Severity Impact", options: ["Mild - No impact on daily activities", "Moderate - Some impact on activities", "Severe - Significant impact", "Critical - Unable to perform normal activities"], required: true },
      { id: "5", type: "textarea", label: "Additional Details", required: false }
    ]
  },
  {
    title: "Patient Satisfaction Survey",
    description: "Post-visit feedback and satisfaction measurement",
    category: "feedback",
    fields: [
      { id: "1", type: "rating", label: "Overall Experience Rating", required: true },
      { id: "2", type: "rating", label: "Provider Communication", required: true },
      { id: "3", type: "rating", label: "Wait Time Satisfaction", required: true },
      { id: "4", type: "rating", label: "Facility Cleanliness", required: true },
      { id: "5", type: "radio", label: "Would you recommend us?", options: ["Definitely", "Probably", "Maybe", "Probably Not", "Definitely Not"], required: true },
      { id: "6", type: "textarea", label: "Comments and Suggestions", required: false }
    ]
  },
  {
    title: "Consent for Treatment",
    description: "Medical treatment consent and authorization form",
    category: "consent",
    fields: [
      { id: "1", type: "text", label: "Patient Name", required: true },
      { id: "2", type: "date", label: "Date", required: true },
      { id: "3", type: "textarea", label: "Proposed Treatment/Procedure", required: true },
      { id: "4", type: "checkbox", label: "Acknowledgments", options: [
        "I understand the nature of the proposed treatment",
        "I understand the risks and benefits",
        "I understand alternative treatments are available",
        "I consent to the proposed treatment"
      ], required: true },
      { id: "5", type: "signature", label: "Patient Signature", required: true },
      { id: "6", type: "signature", label: "Witness Signature", required: false }
    ]
  },
  {
    title: "Mental Health Screening",
    description: "Depression and anxiety screening questionnaire",
    category: "assessment",
    fields: [
      { id: "1", type: "radio", label: "Over the past 2 weeks, how often have you felt down or hopeless?", 
        options: ["Not at all", "Several days", "More than half the days", "Nearly every day"], required: true },
      { id: "2", type: "radio", label: "Little interest or pleasure in doing things?", 
        options: ["Not at all", "Several days", "More than half the days", "Nearly every day"], required: true },
      { id: "3", type: "radio", label: "Feeling nervous, anxious, or on edge?", 
        options: ["Not at all", "Several days", "More than half the days", "Nearly every day"], required: true },
      { id: "4", type: "radio", label: "Not being able to stop or control worrying?", 
        options: ["Not at all", "Several days", "More than half the days", "Nearly every day"], required: true },
      { id: "5", type: "textarea", label: "Additional concerns or details", required: false }
    ]
  }
];

interface FormBuilderProps {
  onSave?: (template: FormTemplate) => void;
  editingTemplate?: FormTemplate;
}

export function FormBuilder({ onSave, editingTemplate }: FormBuilderProps) {
  const [currentTemplate, setCurrentTemplate] = useState<FormTemplate>(
    editingTemplate || {
      id: `form_${Date.now()}`,
      title: "",
      description: "",
      category: "custom",
      fields: [],
      settings: {
        allowAnonymous: false,
        requireAuthentication: true,
        multiPage: false,
        showProgress: true,
        autoSave: true,
        notifications: true,
        branding: true
      },
      styling: {
        theme: "medical",
        primaryColor: "#3b82f6",
        backgroundColor: "#ffffff",
        fontFamily: "Inter"
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isActive: true
    }
  );

  const [selectedFieldType, setSelectedFieldType] = useState<string>("");
  const [editingField, setEditingField] = useState<FormField | null>(null);
  const [previewMode, setPreviewMode] = useState(false);

  const addField = (type: string) => {
    const newField: FormField = {
      id: `field_${Date.now()}`,
      type: type as FormField['type'],
      label: `New ${type} field`,
      required: false
    };

    if (['select', 'multiselect', 'radio', 'checkbox'].includes(type)) {
      newField.options = ['Option 1', 'Option 2'];
    }

    setCurrentTemplate(prev => ({
      ...prev,
      fields: [...prev.fields, newField],
      updatedAt: new Date().toISOString()
    }));
  };

  const updateField = (fieldId: string, updates: Partial<FormField>) => {
    setCurrentTemplate(prev => ({
      ...prev,
      fields: prev.fields.map(field => 
        field.id === fieldId ? { ...field, ...updates } : field
      ),
      updatedAt: new Date().toISOString()
    }));
  };

  const deleteField = (fieldId: string) => {
    setCurrentTemplate(prev => ({
      ...prev,
      fields: prev.fields.filter(field => field.id !== fieldId),
      updatedAt: new Date().toISOString()
    }));
  };

  const duplicateField = (field: FormField) => {
    const newField = { 
      ...field, 
      id: `field_${Date.now()}`,
      label: `${field.label} (Copy)`
    };
    
    setCurrentTemplate(prev => ({
      ...prev,
      fields: [...prev.fields, newField],
      updatedAt: new Date().toISOString()
    }));
  };

  const onDragEnd = (result: any) => {
    if (!result.destination) return;

    const fields = Array.from(currentTemplate.fields);
    const [reorderedField] = fields.splice(result.source.index, 1);
    fields.splice(result.destination.index, 0, reorderedField);

    setCurrentTemplate(prev => ({
      ...prev,
      fields,
      updatedAt: new Date().toISOString()
    }));
  };

  const loadTemplate = (template: Partial<FormTemplate>) => {
    const fullTemplate: FormTemplate = {
      ...currentTemplate,
      ...template,
      id: `form_${Date.now()}`,
      fields: template.fields || [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    setCurrentTemplate(fullTemplate);
  };

  const saveTemplate = () => {
    onSave?.(currentTemplate);
  };

  const getFieldIcon = (type: string) => {
    const fieldType = fieldTypes.find(ft => ft.type === type);
    return fieldType ? fieldType.icon : Type;
  };

  const renderFieldPreview = (field: FormField) => {
    const commonProps = {
      key: field.id,
      required: field.required,
      placeholder: field.placeholder
    };

    switch (field.type) {
      case 'text':
      case 'email':
      case 'phone':
        return (
          <div className="space-y-2">
            <Label>{field.label} {field.required && <span className="text-red-500">*</span>}</Label>
            <Input {...commonProps} type={field.type} />
          </div>
        );
      
      case 'textarea':
        return (
          <div className="space-y-2">
            <Label>{field.label} {field.required && <span className="text-red-500">*</span>}</Label>
            <Textarea {...commonProps} />
          </div>
        );
      
      case 'number':
        return (
          <div className="space-y-2">
            <Label>{field.label} {field.required && <span className="text-red-500">*</span>}</Label>
            <Input {...commonProps} type="number" />
          </div>
        );
      
      case 'date':
        return (
          <div className="space-y-2">
            <Label>{field.label} {field.required && <span className="text-red-500">*</span>}</Label>
            <Input {...commonProps} type="date" />
          </div>
        );
      
      case 'select':
        return (
          <div className="space-y-2">
            <Label>{field.label} {field.required && <span className="text-red-500">*</span>}</Label>
            <Select>
              <SelectTrigger>
                <SelectValue placeholder="Select an option" />
              </SelectTrigger>
              <SelectContent>
                {field.options?.map((option, index) => (
                  <SelectItem key={index} value={option}>{option}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        );
      
      case 'radio':
        return (
          <div className="space-y-2">
            <Label>{field.label} {field.required && <span className="text-red-500">*</span>}</Label>
            <div className="space-y-2">
              {field.options?.map((option, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <input type="radio" name={field.id} value={option} />
                  <label>{option}</label>
                </div>
              ))}
            </div>
          </div>
        );
      
      case 'checkbox':
        return (
          <div className="space-y-2">
            <Label>{field.label} {field.required && <span className="text-red-500">*</span>}</Label>
            <div className="space-y-2">
              {field.options?.map((option, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <input type="checkbox" value={option} />
                  <label>{option}</label>
                </div>
              ))}
            </div>
          </div>
        );
      
      case 'rating':
        return (
          <div className="space-y-2">
            <Label>{field.label} {field.required && <span className="text-red-500">*</span>}</Label>
            <div className="flex space-x-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star key={star} className="h-6 w-6 text-gray-300 hover:text-yellow-400 cursor-pointer" />
              ))}
            </div>
          </div>
        );
      
      case 'pain_scale':
        return (
          <div className="space-y-2">
            <Label>{field.label} {field.required && <span className="text-red-500">*</span>}</Label>
            <div className="space-y-4">
              <div className="flex justify-between">
                <span className="text-sm text-green-600">No Pain</span>
                <span className="text-sm text-red-600">Worst Possible Pain</span>
              </div>
              <div className="flex space-x-2">
                {Array.from({ length: 11 }, (_, i) => (
                  <button
                    key={i}
                    className="w-8 h-8 rounded-full border-2 border-gray-300 hover:border-blue-500 text-sm"
                  >
                    {i}
                  </button>
                ))}
              </div>
            </div>
          </div>
        );
      
      case 'file':
        return (
          <div className="space-y-2">
            <Label>{field.label} {field.required && <span className="text-red-500">*</span>}</Label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
              <Upload className="h-8 w-8 mx-auto mb-2 text-gray-400" />
              <p className="text-sm text-gray-600">Click to upload or drag and drop</p>
            </div>
          </div>
        );
      
      case 'signature':
        return (
          <div className="space-y-2">
            <Label>{field.label} {field.required && <span className="text-red-500">*</span>}</Label>
            <div className="border-2 border-gray-300 rounded-lg p-6 h-32 bg-gray-50">
              <p className="text-sm text-gray-500 text-center">Signature pad would appear here</p>
            </div>
          </div>
        );
      
      default:
        return (
          <div className="space-y-2">
            <Label>{field.label} {field.required && <span className="text-red-500">*</span>}</Label>
            <Input {...commonProps} />
          </div>
        );
    }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between p-4 border-b">
        <div>
          <h2 className="text-xl font-semibold">Form Builder</h2>
          <p className="text-sm text-gray-600">Create custom forms, surveys, and questionnaires</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => setPreviewMode(!previewMode)}
          >
            <Eye className="h-4 w-4 mr-2" />
            {previewMode ? 'Edit' : 'Preview'}
          </Button>
          <Button onClick={saveTemplate}>
            <Save className="h-4 w-4 mr-2" />
            Save Form
          </Button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar - Tools */}
        {!previewMode && (
          <div className="w-80 border-r bg-gray-50 overflow-y-auto">
            <Tabs defaultValue="fields" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="fields">Fields</TabsTrigger>
                <TabsTrigger value="templates">Templates</TabsTrigger>
                <TabsTrigger value="settings">Settings</TabsTrigger>
              </TabsList>

              <TabsContent value="fields" className="p-4 space-y-4">
                <div>
                  <h3 className="font-medium mb-3">Basic Fields</h3>
                  <div className="grid grid-cols-1 gap-2">
                    {fieldTypes.slice(0, 6).map((fieldType) => {
                      const Icon = fieldType.icon;
                      return (
                        <Button
                          key={fieldType.type}
                          variant="outline"
                          size="sm"
                          className="justify-start h-auto p-3"
                          onClick={() => addField(fieldType.type)}
                        >
                          <Icon className="h-4 w-4 mr-2" />
                          <div className="text-left">
                            <div className="font-medium">{fieldType.label}</div>
                            <div className="text-xs text-gray-500">{fieldType.description}</div>
                          </div>
                        </Button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <h3 className="font-medium mb-3">Selection Fields</h3>
                  <div className="grid grid-cols-1 gap-2">
                    {fieldTypes.slice(6, 11).map((fieldType) => {
                      const Icon = fieldType.icon;
                      return (
                        <Button
                          key={fieldType.type}
                          variant="outline"
                          size="sm"
                          className="justify-start h-auto p-3"
                          onClick={() => addField(fieldType.type)}
                        >
                          <Icon className="h-4 w-4 mr-2" />
                          <div className="text-left">
                            <div className="font-medium">{fieldType.label}</div>
                            <div className="text-xs text-gray-500">{fieldType.description}</div>
                          </div>
                        </Button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <h3 className="font-medium mb-3">Medical Fields</h3>
                  <div className="grid grid-cols-1 gap-2">
                    {fieldTypes.slice(13).map((fieldType) => {
                      const Icon = fieldType.icon;
                      return (
                        <Button
                          key={fieldType.type}
                          variant="outline"
                          size="sm"
                          className="justify-start h-auto p-3"
                          onClick={() => addField(fieldType.type)}
                        >
                          <Icon className="h-4 w-4 mr-2" />
                          <div className="text-left">
                            <div className="font-medium">{fieldType.label}</div>
                            <div className="text-xs text-gray-500">{fieldType.description}</div>
                          </div>
                        </Button>
                      );
                    })}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="templates" className="p-4 space-y-4">
                <div>
                  <h3 className="font-medium mb-3">Pre-built Templates</h3>
                  <div className="space-y-2">
                    {predefinedTemplates.map((template, index) => (
                      <Card key={index} className="cursor-pointer hover:bg-gray-50" onClick={() => loadTemplate(template)}>
                        <CardContent className="p-3">
                          <div className="font-medium text-sm">{template.title}</div>
                          <div className="text-xs text-gray-500 mt-1">{template.description}</div>
                          <Badge variant="outline" className="text-xs mt-2">
                            {template.category}
                          </Badge>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="settings" className="p-4 space-y-4">
                <div className="space-y-4">
                  <div>
                    <Label>Form Title</Label>
                    <Input
                      value={currentTemplate.title}
                      onChange={(e) => setCurrentTemplate(prev => ({ ...prev, title: e.target.value }))}
                      placeholder="Enter form title"
                    />
                  </div>
                  
                  <div>
                    <Label>Description</Label>
                    <Textarea
                      value={currentTemplate.description}
                      onChange={(e) => setCurrentTemplate(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Enter form description"
                    />
                  </div>

                  <div>
                    <Label>Category</Label>
                    <Select
                      value={currentTemplate.category}
                      onValueChange={(value: any) => setCurrentTemplate(prev => ({ ...prev, category: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="intake">Patient Intake</SelectItem>
                        <SelectItem value="survey">Survey</SelectItem>
                        <SelectItem value="assessment">Assessment</SelectItem>
                        <SelectItem value="consent">Consent Form</SelectItem>
                        <SelectItem value="feedback">Feedback</SelectItem>
                        <SelectItem value="medical">Medical Form</SelectItem>
                        <SelectItem value="custom">Custom</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-3">
                    <h4 className="font-medium">Form Settings</h4>
                    
                    <div className="flex items-center justify-between">
                      <Label htmlFor="anonymous">Allow Anonymous Submissions</Label>
                      <Switch
                        id="anonymous"
                        checked={currentTemplate.settings.allowAnonymous}
                        onCheckedChange={(checked) => 
                          setCurrentTemplate(prev => ({
                            ...prev,
                            settings: { ...prev.settings, allowAnonymous: checked }
                          }))
                        }
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <Label htmlFor="multipage">Multi-page Form</Label>
                      <Switch
                        id="multipage"
                        checked={currentTemplate.settings.multiPage}
                        onCheckedChange={(checked) => 
                          setCurrentTemplate(prev => ({
                            ...prev,
                            settings: { ...prev.settings, multiPage: checked }
                          }))
                        }
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <Label htmlFor="progress">Show Progress Bar</Label>
                      <Switch
                        id="progress"
                        checked={currentTemplate.settings.showProgress}
                        onCheckedChange={(checked) => 
                          setCurrentTemplate(prev => ({
                            ...prev,
                            settings: { ...prev.settings, showProgress: checked }
                          }))
                        }
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <Label htmlFor="autosave">Auto-save Responses</Label>
                      <Switch
                        id="autosave"
                        checked={currentTemplate.settings.autoSave}
                        onCheckedChange={(checked) => 
                          setCurrentTemplate(prev => ({
                            ...prev,
                            settings: { ...prev.settings, autoSave: checked }
                          }))
                        }
                      />
                    </div>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        )}

        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto">
          {previewMode ? (
            /* Preview Mode */
            <div className="max-w-2xl mx-auto p-6">
              <div className="bg-white rounded-lg shadow-lg p-6">
                <div className="mb-6">
                  <h1 className="text-2xl font-bold text-gray-900">{currentTemplate.title || "Untitled Form"}</h1>
                  {currentTemplate.description && (
                    <p className="text-gray-600 mt-2">{currentTemplate.description}</p>
                  )}
                </div>

                {currentTemplate.settings.showProgress && (
                  <div className="mb-6">
                    <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
                      <span>Progress</span>
                      <span>1 of {currentTemplate.fields.length}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className="bg-blue-600 h-2 rounded-full" style={{ width: `${(1 / currentTemplate.fields.length) * 100}%` }}></div>
                    </div>
                  </div>
                )}

                <form className="space-y-6">
                  {currentTemplate.fields.map((field) => renderFieldPreview(field))}
                  
                  <div className="flex justify-between pt-6">
                    <Button variant="outline">Save Draft</Button>
                    <Button>
                      <Send className="h-4 w-4 mr-2" />
                      Submit Form
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          ) : (
            /* Edit Mode */
            <div className="p-6">
              <div className="mb-6">
                <h3 className="text-lg font-semibold">
                  {currentTemplate.title || "Untitled Form"}
                </h3>
                <p className="text-sm text-gray-600">
                  {currentTemplate.description || "Add a description to help users understand this form"}
                </p>
              </div>

              <DragDropContext onDragEnd={onDragEnd}>
                <Droppable droppableId="form-fields">
                  {(provided) => (
                    <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-4">
                      {currentTemplate.fields.map((field, index) => (
                        <Draggable key={field.id} draggableId={field.id} index={index}>
                          {(provided, snapshot) => (
                            <Card
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              className={`${snapshot.isDragging ? 'shadow-lg rotate-2' : ''}`}
                            >
                              <CardContent className="p-4">
                                <div className="flex items-center justify-between mb-3">
                                  <div className="flex items-center gap-3">
                                    <div {...provided.dragHandleProps} className="cursor-grab">
                                      <Move className="h-4 w-4 text-gray-400" />
                                    </div>
                                    <div className="flex items-center gap-2">
                                      {(() => {
                                        const Icon = getFieldIcon(field.type);
                                        return <Icon className="h-4 w-4 text-gray-600" />;
                                      })()}
                                      <span className="font-medium">{field.label}</span>
                                      {field.required && <span className="text-red-500 text-sm">*</span>}
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => setEditingField(field)}
                                    >
                                      <Edit3 className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => duplicateField(field)}
                                    >
                                      <Copy className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => deleteField(field.id)}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </div>
                                
                                <div className="ml-7">
                                  {renderFieldPreview(field)}
                                </div>
                              </CardContent>
                            </Card>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                      
                      {currentTemplate.fields.length === 0 && (
                        <div className="text-center py-12 text-gray-500">
                          <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                          <p className="text-lg font-medium">No fields added yet</p>
                          <p className="text-sm">Add fields from the sidebar to build your form</p>
                        </div>
                      )}
                    </div>
                  )}
                </Droppable>
              </DragDropContext>
            </div>
          )}
        </div>
      </div>

      {/* Field Edit Dialog */}
      {editingField && (
        <Dialog open={!!editingField} onOpenChange={() => setEditingField(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Edit Field: {editingField.label}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Field Label</Label>
                <Input
                  value={editingField.label}
                  onChange={(e) => setEditingField({ ...editingField, label: e.target.value })}
                />
              </div>
              
              <div>
                <Label>Placeholder Text</Label>
                <Input
                  value={editingField.placeholder || ""}
                  onChange={(e) => setEditingField({ ...editingField, placeholder: e.target.value })}
                />
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  checked={editingField.required}
                  onCheckedChange={(checked) => setEditingField({ ...editingField, required: checked })}
                />
                <Label>Required field</Label>
              </div>

              {['select', 'multiselect', 'radio', 'checkbox'].includes(editingField.type) && (
                <div>
                  <Label>Options (one per line)</Label>
                  <Textarea
                    value={editingField.options?.join('\n') || ""}
                    onChange={(e) => setEditingField({ 
                      ...editingField, 
                      options: e.target.value.split('\n').filter(opt => opt.trim())
                    })}
                    rows={4}
                  />
                </div>
              )}

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setEditingField(null)}>Cancel</Button>
                <Button onClick={() => {
                  updateField(editingField.id, editingField);
                  setEditingField(null);
                }}>
                  Update Field
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}