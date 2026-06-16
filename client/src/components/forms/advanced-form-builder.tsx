import { useState, useCallback } from "react";
import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Plus, 
  Trash2, 
  Settings, 
  Eye, 
  Save, 
  GripVertical,
  Type,
  Hash,
  User,
  Mail,
  List,
  AlignLeft,
  X,
  Calendar,
  CheckSquare,
  Circle,
  FileText,
  Upload,
  Star,
  Phone,
  MapPin
} from "lucide-react";

export interface FormField {
  id: string;
  type: 'text' | 'textarea' | 'select' | 'checkbox' | 'radio' | 'date' | 'number' | 'email' | 'phone' | 'file' | 'rating';
  label: string;
  placeholder?: string;
  required: boolean;
  options?: string[];
  validation?: {
    minLength?: number;
    maxLength?: number;
    pattern?: string;
    min?: number;
    max?: number;
  };
  conditional?: {
    field: string;
    value: string;
  };
  description?: string;
}

export interface FormTemplate {
  id: string;
  title: string;
  description: string;
  category: 'intake' | 'survey' | 'assessment' | 'consent' | 'feedback';
  fields: FormField[];
  settings: {
    allowAnonymous: boolean;
    requireAuthentication: boolean;
    multiPage: boolean;
    showProgress: boolean;
    autoSave: boolean;
    notifications: boolean;
    branding: boolean;
    submitMessage: string;
    redirectUrl?: string;
  };
  styling: {
    theme: 'default' | 'minimal' | 'medical' | 'modern';
    primaryColor: string;
    backgroundColor: string;
    fontFamily: string;
  };
  createdAt: string;
  updatedAt: string;
  status: 'draft' | 'published' | 'archived';
  responses: number;
}

const fieldTypes = [
  { type: 'text', label: 'Text Input', icon: Type },
  { type: 'textarea', label: 'Text Area', icon: FileText },
  { type: 'select', label: 'Dropdown', icon: Circle },
  { type: 'checkbox', label: 'Checkbox', icon: CheckSquare },
  { type: 'radio', label: 'Radio Button', icon: Circle },
  { type: 'date', label: 'Date Picker', icon: Calendar },
  { type: 'number', label: 'Number', icon: Hash },
  { type: 'email', label: 'Email', icon: Mail },
  { type: 'phone', label: 'Phone', icon: Phone },
  { type: 'file', label: 'File Upload', icon: Upload },
  { type: 'rating', label: 'Rating', icon: Star },
];

interface AdvancedFormBuilderProps {
  form?: FormTemplate;
  onSave: (form: FormTemplate) => void;
  onCancel: () => void;
}

export function AdvancedFormBuilder({ form, onSave, onCancel }: AdvancedFormBuilderProps) {
  const [formData, setFormData] = useState<FormTemplate>(form || {
    id: '',
    title: 'Patient Information Form',
    description: 'Please fill out your information to help us provide better care',
    category: 'intake',
    fields: [],
    settings: {
      allowAnonymous: false,
      requireAuthentication: true,
      multiPage: false,
      showProgress: true,
      autoSave: true,
      notifications: true,
      branding: true,
      submitMessage: 'Thank you for your submission!'
    },
    styling: {
      theme: 'medical',
      primaryColor: '#0ea5e9',
      backgroundColor: '#ffffff',
      fontFamily: 'Inter'
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    status: 'draft',
    responses: 0
  });

  const [selectedField, setSelectedField] = useState<FormField | null>(null);
  const [previewMode, setPreviewMode] = useState(false);

  const addField = (type: FormField['type']) => {
    const fieldLabels: Record<string, string> = {
      text: 'Full Name',
      email: 'Email Address',
      phone: 'Phone Number',
      date: 'Date of Birth',
      textarea: 'Additional Notes',
      select: 'Gender',
      checkbox: 'Consent Agreement',
      radio: 'Preferred Contact Method',
      number: 'Age',
      file: 'Upload Document'
    };

    const fieldPlaceholders: Record<string, string> = {
      text: 'Enter your full name',
      email: 'Enter your email address',
      phone: 'Enter your phone number',
      textarea: 'Enter additional notes',
      number: 'Enter your age'
    };

    const newField: FormField = {
      id: `field_${Date.now()}`,
      type,
      label: fieldLabels[type] || `${type} Field`,
      placeholder: fieldPlaceholders[type] || '',
      required: false
    };

    if (type === 'select' || type === 'radio') {
      const optionSets: Record<string, string[]> = {
        select: ['Male', 'Female', 'Other'],
        radio: ['Email', 'Phone', 'Text']
      };
      newField.options = optionSets[type] || ['Option 1', 'Option 2'];
    }

    if (type === 'checkbox') {
      newField.options = ['I agree to the terms and conditions'];
    }

    setFormData(prev => ({
      ...prev,
      fields: [...prev.fields, newField]
    }));
    setSelectedField(newField);
  };

  const updateField = (fieldId: string, updates: Partial<FormField>) => {
    setFormData(prev => ({
      ...prev,
      fields: prev.fields.map(field => 
        field.id === fieldId ? { ...field, ...updates } : field
      )
    }));
    if (selectedField?.id === fieldId) {
      setSelectedField(prev => prev ? { ...prev, ...updates } : null);
    }
  };

  const removeField = (fieldId: string) => {
    setFormData(prev => ({
      ...prev,
      fields: prev.fields.filter(field => field.id !== fieldId)
    }));
    if (selectedField?.id === fieldId) {
      setSelectedField(null);
    }
  };

  const onDragEnd = (result: any) => {
    if (!result.destination) return;

    const items = Array.from(formData.fields);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    setFormData(prev => ({
      ...prev,
      fields: items
    }));
  };

  const renderFieldIcon = (type: FormField['type']) => {
    const fieldType = fieldTypes.find(ft => ft.type === type);
    const Icon = fieldType?.icon || Type;
    return <Icon className="h-4 w-4" />;
  };

  const renderPreviewField = (field: FormField) => {
    switch (field.type) {
      case 'text':
      case 'email':
      case 'phone':
        return <Input placeholder={field.placeholder} className="w-full" />;
      case 'textarea':
        return <Textarea placeholder={field.placeholder} className="w-full" />;
      case 'select':
        return (
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
        );
      case 'checkbox':
        return (
          <div className="space-y-2">
            {field.options?.map((option, index) => (
              <div key={index} className="flex items-center space-x-2">
                <input type="checkbox" id={`${field.id}_${index}`} />
                <label htmlFor={`${field.id}_${index}`}>{option}</label>
              </div>
            ))}
          </div>
        );
      case 'radio':
        return (
          <div className="space-y-2">
            {field.options?.map((option, index) => (
              <div key={index} className="flex items-center space-x-2">
                <input type="radio" name={field.id} id={`${field.id}_${index}`} />
                <label htmlFor={`${field.id}_${index}`}>{option}</label>
              </div>
            ))}
          </div>
        );
      case 'date':
        return <Input type="date" className="w-full" />;
      case 'number':
        return <Input type="number" placeholder={field.placeholder} className="w-full" />;
      case 'file':
        return <Input type="file" className="w-full" />;
      case 'rating':
        return (
          <div className="flex space-x-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <Star key={star} className="h-6 w-6 text-gray-300 hover:text-yellow-400 cursor-pointer" />
            ))}
          </div>
        );
      default:
        return <Input placeholder={field.placeholder} className="w-full" />;
    }
  };

  return (
    <div className="h-full flex">
      {/* Left Panel - Form Builder */}
      <div className="flex-1 overflow-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold">{formData.title}</h2>
              <p className="text-gray-600">{formData.description}</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setPreviewMode(!previewMode)}>
                <Eye className="h-4 w-4 mr-2" />
                {previewMode ? 'Edit' : 'Preview'}
              </Button>
              <Button onClick={() => onSave(formData)}>
                <Save className="h-4 w-4 mr-2" />
                Save Form
              </Button>
            </div>
          </div>

          {!previewMode ? (
            <div className="space-y-6">
              {/* Simple Form Builder */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Build Your Form</CardTitle>
                  <p className="text-sm text-gray-600">Add fields to create your custom form</p>
                </CardHeader>
                <CardContent>
                  {/* Quick Add Buttons */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                    <Button
                      variant="outline"
                      className="h-16 flex-col gap-1"
                      onClick={() => addField('text')}
                    >
                      <Type className="h-5 w-5" />
                      <span className="text-xs">Text Field</span>
                    </Button>
                    <Button
                      variant="outline"
                      className="h-16 flex-col gap-1"
                      onClick={() => addField('email')}
                    >
                      <Mail className="h-5 w-5" />
                      <span className="text-xs">Email</span>
                    </Button>
                    <Button
                      variant="outline"
                      className="h-16 flex-col gap-1"
                      onClick={() => addField('select')}
                    >
                      <List className="h-5 w-5" />
                      <span className="text-xs">Dropdown</span>
                    </Button>
                    <Button
                      variant="outline"
                      className="h-16 flex-col gap-1"
                      onClick={() => addField('textarea')}
                    >
                      <AlignLeft className="h-5 w-5" />
                      <span className="text-xs">Text Area</span>
                    </Button>
                  </div>

                  {/* Form Fields List */}
                  <div className="space-y-3">
                    {formData.fields.map((field, index) => (
                      <Card key={field.id} className="border border-gray-200">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              {renderFieldIcon(field.type)}
                              <span className="font-medium">{field.label}</span>
                              <Badge variant="outline" className="text-xs">{field.type}</Badge>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeField(field.id)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                          
                          {/* Simple Field Editor */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div>
                              <Label className="text-xs text-gray-600">Field Label</Label>
                              <Input
                                value={field.label}
                                onChange={(e) => updateField(field.id, { label: e.target.value })}
                                placeholder="Enter field label"
                                className="mt-1"
                              />
                            </div>
                            <div>
                              <Label className="text-xs text-gray-600">Placeholder</Label>
                              <Input
                                value={field.placeholder || ''}
                                onChange={(e) => updateField(field.id, { placeholder: e.target.value })}
                                placeholder="Enter placeholder text"
                                className="mt-1"
                              />
                            </div>
                            <div className="flex items-center space-x-2">
                              <Switch
                                checked={field.required}
                                onCheckedChange={(checked) => updateField(field.id, { required: checked })}
                              />
                              <Label className="text-xs text-gray-600">Required field</Label>
                            </div>
                          </div>

                          {/* Options for select/radio/checkbox */}
                          {(field.type === 'select' || field.type === 'radio' || field.type === 'checkbox') && (
                            <div className="mt-3">
                              <Label className="text-xs text-gray-600">Options</Label>
                              <div className="space-y-2 mt-1">
                                {field.options?.map((option, optIndex) => (
                                  <div key={optIndex} className="flex items-center gap-2">
                                    <Input
                                      value={option}
                                      onChange={(e) => {
                                        const newOptions = [...(field.options || [])];
                                        newOptions[optIndex] = e.target.value;
                                        updateField(field.id, { options: newOptions });
                                      }}
                                      placeholder={`Option ${optIndex + 1}`}
                                      className="flex-1"
                                    />
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => {
                                        const newOptions = field.options?.filter((_, i) => i !== optIndex);
                                        updateField(field.id, { options: newOptions });
                                      }}
                                    >
                                      <X className="h-4 w-4" />
                                    </Button>
                                  </div>
                                ))}
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    const newOptions = [...(field.options || []), `Option ${(field.options?.length || 0) + 1}`];
                                    updateField(field.id, { options: newOptions });
                                  }}
                                >
                                  <Plus className="h-4 w-4 mr-1" />
                                  Add Option
                                </Button>
                              </div>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>

                  {formData.fields.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">No fields added yet</h3>
                      <p className="text-gray-600">Click the buttons above to add fields to your form</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          ) : (
            /* Preview Mode */
            <Card className="max-w-2xl mx-auto">
              <CardHeader className="text-center">
                <CardTitle className="text-2xl">{formData.title}</CardTitle>
                {formData.description && (
                  <p className="text-gray-600">{formData.description}</p>
                )}
              </CardHeader>
              <CardContent className="space-y-6">
                {formData.fields.map((field) => (
                  <div key={field.id} className="space-y-2">
                    <Label className="text-sm font-medium">
                      {field.label}
                      {field.required && <span className="text-red-500 ml-1">*</span>}
                    </Label>
                    
                    {field.type === 'text' && (
                      <Input 
                        placeholder={field.placeholder || `Enter ${field.label.toLowerCase()}`}
                        className="w-full"
                        disabled
                      />
                    )}
                    
                    {field.type === 'email' && (
                      <Input 
                        type="email"
                        placeholder={field.placeholder || "Enter your email"}
                        className="w-full"
                        disabled
                      />
                    )}
                    
                    {field.type === 'textarea' && (
                      <Textarea 
                        placeholder={field.placeholder || `Enter ${field.label.toLowerCase()}`}
                        className="w-full"
                        rows={3}
                        disabled
                      />
                    )}
                    
                    {field.type === 'select' && (
                      <Select disabled>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder={field.placeholder || `Select ${field.label.toLowerCase()}`} />
                        </SelectTrigger>
                        <SelectContent>
                          {field.options?.map((option, index) => (
                            <SelectItem key={index} value={option.toLowerCase().replace(/\s+/g, '-')}>
                              {option}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                    
                    {field.type === 'checkbox' && (
                      <div className="space-y-2">
                        {field.options?.map((option, index) => (
                          <div key={index} className="flex items-center space-x-2">
                            <input type="checkbox" disabled id={`${field.id}-${index}`} />
                            <Label htmlFor={`${field.id}-${index}`} className="text-sm">{option}</Label>
                          </div>
                        ))}
                      </div>
                    )}
                    
                    {field.type === 'radio' && (
                      <div className="space-y-2">
                        {field.options?.map((option, index) => (
                          <div key={index} className="flex items-center space-x-2">
                            <input type="radio" disabled name={field.id} id={`${field.id}-${index}`} />
                            <Label htmlFor={`${field.id}-${index}`} className="text-sm">{option}</Label>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
                
                {formData.fields.length === 0 && (
                  <div className="text-center py-12 text-gray-500">
                    <FileText className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                    <h3 className="text-xl font-medium text-gray-900 mb-2">Form Preview</h3>
                    <p className="text-gray-600">Add fields to see how your form will look</p>
                  </div>
                )}
                
                {formData.fields.length > 0 && (
                  <Button className="w-full mt-8" size="lg" disabled>
                    Submit Form
                  </Button>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Right Panel - Field Settings */}
      {selectedField && !previewMode && (
        <div className="w-80 border-l bg-gray-50 overflow-auto">
          <div className="p-4">
            <h3 className="text-lg font-semibold mb-4">Field Settings</h3>
            
            <Tabs defaultValue="basic" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="basic">Basic</TabsTrigger>
                <TabsTrigger value="advanced">Advanced</TabsTrigger>
              </TabsList>
              
              <TabsContent value="basic" className="space-y-4">
                <div>
                  <Label>Field Label</Label>
                  <Input
                    value={selectedField.label}
                    onChange={(e) => updateField(selectedField.id, { label: e.target.value })}
                  />
                </div>
                
                <div>
                  <Label>Placeholder</Label>
                  <Input
                    value={selectedField.placeholder || ''}
                    onChange={(e) => updateField(selectedField.id, { placeholder: e.target.value })}
                  />
                </div>
                
                <div>
                  <Label>Description</Label>
                  <Input
                    value={selectedField.description || ''}
                    onChange={(e) => updateField(selectedField.id, { description: e.target.value })}
                    placeholder="Help text for this field"
                  />
                </div>
                
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={selectedField.required}
                    onCheckedChange={(checked) => updateField(selectedField.id, { required: checked })}
                  />
                  <Label>Required field</Label>
                </div>
                
                {(selectedField.type === 'select' || selectedField.type === 'radio' || selectedField.type === 'checkbox') && (
                  <div>
                    <Label>Options</Label>
                    <div className="space-y-2">
                      {selectedField.options?.map((option, index) => (
                        <div key={index} className="flex gap-2">
                          <Input
                            value={option}
                            onChange={(e) => {
                              const newOptions = [...(selectedField.options || [])];
                              newOptions[index] = e.target.value;
                              updateField(selectedField.id, { options: newOptions });
                            }}
                          />
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              const newOptions = selectedField.options?.filter((_, i) => i !== index);
                              updateField(selectedField.id, { options: newOptions });
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                      <Button
                        variant="outline"
                        onClick={() => {
                          const newOptions = [...(selectedField.options || []), `Option ${(selectedField.options?.length || 0) + 1}`];
                          updateField(selectedField.id, { options: newOptions });
                        }}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Option
                      </Button>
                    </div>
                  </div>
                )}
              </TabsContent>
              
              <TabsContent value="advanced" className="space-y-4">
                <div>
                  <Label>Validation Rules</Label>
                  <div className="space-y-2 mt-2">
                    {(selectedField.type === 'text' || selectedField.type === 'textarea') && (
                      <>
                        <div className="flex gap-2">
                          <Input
                            type="number"
                            placeholder="Min length"
                            value={selectedField.validation?.minLength || ''}
                            onChange={(e) => updateField(selectedField.id, {
                              validation: { ...selectedField.validation, minLength: parseInt(e.target.value) || undefined }
                            })}
                          />
                          <Input
                            type="number"
                            placeholder="Max length"
                            value={selectedField.validation?.maxLength || ''}
                            onChange={(e) => updateField(selectedField.id, {
                              validation: { ...selectedField.validation, maxLength: parseInt(e.target.value) || undefined }
                            })}
                          />
                        </div>
                      </>
                    )}
                    
                    {selectedField.type === 'number' && (
                      <div className="flex gap-2">
                        <Input
                          type="number"
                          placeholder="Min value"
                          value={selectedField.validation?.min || ''}
                          onChange={(e) => updateField(selectedField.id, {
                            validation: { ...selectedField.validation, min: parseInt(e.target.value) || undefined }
                          })}
                        />
                        <Input
                          type="number"
                          placeholder="Max value"
                          value={selectedField.validation?.max || ''}
                          onChange={(e) => updateField(selectedField.id, {
                            validation: { ...selectedField.validation, max: parseInt(e.target.value) || undefined }
                          })}
                        />
                      </div>
                    )}
                  </div>
                </div>
                
                <div>
                  <Label>Conditional Logic</Label>
                  <p className="text-sm text-gray-600 mb-2">Show this field only when:</p>
                  <Select
                    value={selectedField.conditional?.field || ''}
                    onValueChange={(value) => updateField(selectedField.id, {
                      conditional: value ? { ...selectedField.conditional, field: value, value: selectedField.conditional?.value || "" } : undefined
                    })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select field" />
                    </SelectTrigger>
                    <SelectContent>
                      {formData.fields
                        .filter(f => f.id !== selectedField.id)
                        .map(field => (
                          <SelectItem key={field.id} value={field.id}>{field.label}</SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  
                  {selectedField.conditional?.field && (
                    <Input
                      className="mt-2"
                      placeholder="equals value"
                      value={selectedField.conditional?.value || ''}
                      onChange={(e) => updateField(selectedField.id, {
                        conditional: { ...selectedField.conditional!, value: e.target.value }
                      })}
                    />
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      )}
    </div>
  );
}