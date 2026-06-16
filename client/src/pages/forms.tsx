import { ChangeEvent, useState, useEffect, useMemo } from "react";
import { format } from "date-fns";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest, getTenantSubdomain, buildUrl } from "@/lib/queryClient";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import type { User, Patient } from "@shared/schema";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { useRolePermissions } from "@/hooks/use-role-permissions";
import { useCurrency } from "@/hooks/use-currency";
import { Toaster } from "@/components/ui/toaster";
import { isDoctorLike } from "@/lib/role-utils";
import { Header } from "@/components/layout/header";
import { NotificationBell } from "@/components/layout/notification-bell";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import {
  FormBuilder,
  FormBuilderLoadPayload,
  SectionInput,
  FieldType,
} from "@/components/forms/FormBuilder";
import { FORM_TEMPLATES, cloneTemplateAsPayload, type FormTemplate } from "@/data/form-templates";
import { FormFill } from "@/components/forms/FormFill";
import {
  buildExcelHtmlTable,
  buildFormResponseExportRows,
  downloadExcelHtml,
  formatFormResponseScalar,
  resolveSignatureDataUrl,
} from "@/lib/form-response-export";
import { isSignatureStrokeData } from "@/lib/signature-export";
import {
  Bold,
  Italic,
  Underline,
  List,
  ListOrdered,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Type,
  Table,
  Paperclip,
  Image,
  Link,
  MoreHorizontal,
  MoreVertical,
  Clock,
  Palette,
  Highlighter,
  Minus,
  Plus,
  Eye,
  Download,
  Printer,
  Settings,
  FileText,
  Calculator,
  Search,
  ChevronDown,
  ChevronUp,
  Edit,
  AlertCircle,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  ChevronsUpDown,
  Trash2,
  Share2,
  LogOut,
} from "lucide-react";

interface FormFieldSummary {
  id: number;
  label: string;
  fieldType: string;
  required: boolean;
  placeholder?: string;
  fieldOptions: string[];
  order: number;
}

interface FormSectionSummary {
  id: number;
  title: string;
  order: number;
  metadata?: Record<string, any>;
  fields: FormFieldSummary[];
}

interface FormSummary {
  id: number;
  title: string;
  description?: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  sections: FormSectionSummary[];
}

const ALLOWED_CLINIC_LOGO_TYPES = ["image/png", "image/jpeg", "image/jpg", "image/svg+xml"];
const ALLOWED_CLINIC_LOGO_EXTENSIONS = ["png", "jpg", "jpeg", "svg"];
const CLINIC_LOGO_MAX_SIZE_BYTES = 2 * 1024 * 1024;
const CLINIC_LOGO_MIN_DIMENSION = 200;
const CLINIC_LOGO_MAX_DIMENSION = 2000;

const getFileExtension = (filename: string) => filename.split(".").pop()?.toLowerCase();

const validateClinicLogoMetadata = (file: File): string | null => {
  const fileType = file.type?.toLowerCase() ?? "";
  if (
    !ALLOWED_CLINIC_LOGO_TYPES.includes(fileType) &&
    !ALLOWED_CLINIC_LOGO_EXTENSIONS.includes(getFileExtension(file.name) ?? "")
  ) {
    return "Logo must be PNG, JPG/JPEG, or SVG format.";
  }
  if (file.size > CLINIC_LOGO_MAX_SIZE_BYTES) {
    return "Logo must be smaller than 2 MB.";
  }
  return null;
};

const validateClinicLogoDimensions = (width: number, height: number): string | null => {
  if (width < CLINIC_LOGO_MIN_DIMENSION || height < CLINIC_LOGO_MIN_DIMENSION) {
    return `Logo must be at least ${CLINIC_LOGO_MIN_DIMENSION}×${CLINIC_LOGO_MIN_DIMENSION} pixels.`;
  }
  if (width > CLINIC_LOGO_MAX_DIMENSION || height > CLINIC_LOGO_MAX_DIMENSION) {
    return `Logo must not exceed ${CLINIC_LOGO_MAX_DIMENSION}×${CLINIC_LOGO_MAX_DIMENSION} pixels.`;
  }
  const ratio = width / height;
  if (Math.abs(ratio - 1) > 0.01) {
    return "Logo must maintain a 1:1 aspect ratio (square).";
  }
  return null;
};

interface FormResponseAnswer {
  fieldId: number;
  label: string;
  value: any;
}

interface FormResponseRecord {
  responseId: number;
  shareId: number;
  submittedAt: string | null;
  patient: {
    id: number;
    firstName?: string | null;
    lastName?: string | null;
    email?: string | null;
    phone?: string | null;
    nhsNumber?: string | null;
  } | null;
  answers: FormResponseAnswer[];
}

interface FormResponsesPayload {
  formId: number;
  formTitle: string;
  fields: Array<{ id: number; label: string; fieldType?: string }>;
  responses: FormResponseRecord[];
}

// View Clinic Info Component
function ViewClinicInfo({ user, onLoadHeader, onLoadFooter }: { user: any; onLoadHeader: (header: any, footer: any) => void; onLoadFooter: (footer: any) => void }) {
  const { toast } = useToast();
  const { canEdit } = useRolePermissions();
  const [isEditingHeader, setIsEditingHeader] = useState(false);
  const [isEditingFooter, setIsEditingFooter] = useState(false);
  const [editHeaderData, setEditHeaderData] = useState<any>(null);
  const [editFooterData, setEditFooterData] = useState<any>(null);

  const { data: savedHeader, isLoading: headerLoading } = useQuery({
    queryKey: ['/api/clinic-headers'],
    enabled: !!user,
  });

  const { data: savedFooter, isLoading: footerLoading } = useQuery({
    queryKey: ['/api/clinic-footers'],
    enabled: !!user,
  });

  const updateHeaderMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest('POST', '/api/clinic-headers', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/clinic-headers'] });
      setIsEditingHeader(false);
      toast({
        title: "Success",
        description: "Clinic header updated successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update clinic header",
        variant: "destructive",
      });
    },
  });

  const updateFooterMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest('POST', '/api/clinic-footers', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/clinic-footers'] });
      setIsEditingFooter(false);
      toast({
        title: "Success",
        description: "Clinic footer updated successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update clinic footer",
        variant: "destructive",
      });
    },
  });

  if (headerLoading || footerLoading) {
    return <div className="flex items-center justify-center p-8">
      <p className="text-gray-500">Loading saved clinic information...</p>
    </div>;
  }

  if (!savedHeader && !savedFooter) {
    return <div className="flex items-center justify-center p-8">
      <p className="text-gray-500">No saved clinic information found. Please create one first.</p>
    </div>;
  }

  const handleEditHeader = () => {
    setEditHeaderData({ ...savedHeader });
    setIsEditingHeader(true);
  };

  const handleSaveHeader = () => {
    const { id, createdAt, updatedAt, organizationId, ...headerDataToSend } = editHeaderData;
    const dataWithDefaults = {
      ...headerDataToSend,
      logoPosition: headerDataToSend.logoPosition || 'center',
      clinicNameFontSize: headerDataToSend.clinicNameFontSize || '24pt',
      fontSize: headerDataToSend.fontSize || '12pt',
      fontFamily: headerDataToSend.fontFamily || 'verdana',
      fontWeight: headerDataToSend.fontWeight || 'normal',
      fontStyle: headerDataToSend.fontStyle || 'normal',
      textDecoration: headerDataToSend.textDecoration || 'none',
      isActive: headerDataToSend.isActive !== undefined ? headerDataToSend.isActive : true,
    };
    updateHeaderMutation.mutate(dataWithDefaults);
  };

  const handleEditFooter = () => {
    setEditFooterData({ ...savedFooter });
    setIsEditingFooter(true);
  };

  const handleSaveFooter = () => {
    const { id, createdAt, updatedAt, organizationId, ...footerDataToSend } = editFooterData;
    updateFooterMutation.mutate(footerDataToSend);
  };

  return (
    <div className="space-y-6 py-4">
      {/* Display Saved Header with Logo - Saved Position */}
      {savedHeader && (
        <div className="border rounded-lg p-6 bg-white dark:bg-[hsl(var(--cura-midnight))]">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-[hsl(var(--cura-bluewave))] flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Saved Clinic Header ({savedHeader.logoPosition})
            </h3>
            <div className="flex gap-2">
              {canEdit('forms') && (
                <Button
                  onClick={handleEditHeader}
                  className="bg-gray-600 hover:bg-gray-700 text-white"
                  data-testid="button-edit-header"
                >
                  <Edit className="h-4 w-4 mr-1" />
                  Edit
                </Button>
              )}
              <Button
                onClick={() => onLoadHeader(savedHeader, savedFooter)}
                className="bg-[hsl(var(--cura-bluewave))] hover:bg-[hsl(var(--cura-electric-lilac))] text-light"
                data-testid="button-load-header"
              >
                Load
              </Button>
            </div>
          </div>
          <div className="space-y-4">
            {/* Left Position */}
            {savedHeader.logoPosition === 'left' && (
              <div className="border rounded-lg p-6 bg-gray-50 dark:bg-gray-800">
                <div style={{ borderBottom: '3px solid ' + (savedFooter?.backgroundColor || '#4A7DFF'), paddingBottom: '20px' }}>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: "20px" }}>
                    {savedHeader.logoBase64 && (
                      <img
                        src={savedHeader.logoBase64}
                        alt="Clinic Logo - Left"
                        style={{ maxHeight: "80px", objectFit: "contain" }}
                      />
                    )}
                    <div style={{ flex: 1 }}>
                      <h1 style={{
                        margin: 0,
                        fontSize: savedHeader.clinicNameFontSize || "24pt",
                        fontFamily: savedHeader.fontFamily || "verdana",
                        fontWeight: savedHeader.fontWeight || "normal",
                        fontStyle: savedHeader.fontStyle || "normal",
                        textDecoration: savedHeader.textDecoration || "none",
                        color: savedFooter?.backgroundColor || '#4A7DFF'
                      }}>
                        {savedHeader.clinicName}
                      </h1>
                      {savedHeader.address && (
                        <p style={{
                          margin: "5px 0",
                          fontSize: savedHeader.fontSize || "12pt",
                          fontFamily: savedHeader.fontFamily || "verdana",
                          fontWeight: savedHeader.fontWeight || "normal",
                          fontStyle: savedHeader.fontStyle || "normal",
                          textDecoration: savedHeader.textDecoration || "none",
                          color: "#666"
                        }}>{savedHeader.address}</p>
                      )}
                      {(savedHeader.phone || savedHeader.email) && (
                        <p style={{
                          margin: "5px 0",
                          fontSize: savedHeader.fontSize || "12pt",
                          fontFamily: savedHeader.fontFamily || "verdana",
                          fontWeight: savedHeader.fontWeight || "normal",
                          fontStyle: savedHeader.fontStyle || "normal",
                          textDecoration: savedHeader.textDecoration || "none",
                          color: "#666"
                        }}>
                          {savedHeader.phone}
                          {savedHeader.phone && savedHeader.email && " • "}
                          {savedHeader.email}
                        </p>
                      )}
                      {savedHeader.website && (
                        <p style={{
                          margin: "5px 0",
                          fontSize: savedHeader.fontSize || "12pt",
                          fontFamily: savedHeader.fontFamily || "verdana",
                          fontWeight: savedHeader.fontWeight || "normal",
                          fontStyle: savedHeader.fontStyle || "normal",
                          textDecoration: savedHeader.textDecoration || "none",
                          color: "#666"
                        }}>{savedHeader.website}</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Center Position */}
            {savedHeader.logoPosition === 'center' && (
              <div className="border rounded-lg p-6 bg-gray-50 dark:bg-gray-800">
                <div style={{ borderBottom: '3px solid ' + (savedFooter?.backgroundColor || '#4A7DFF'), paddingBottom: '20px' }}>
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "center", gap: "20px" }}>
                    {savedHeader.logoBase64 && (
                      <img
                        src={savedHeader.logoBase64}
                        alt="Clinic Logo - Center"
                        style={{ maxHeight: "80px", objectFit: "contain" }}
                      />
                    )}
                    <div style={{ textAlign: "center" }}>
                      <h1 style={{
                        margin: 0,
                        fontSize: savedHeader.clinicNameFontSize || "24pt",
                        fontFamily: savedHeader.fontFamily || "verdana",
                        fontWeight: savedHeader.fontWeight || "normal",
                        fontStyle: savedHeader.fontStyle || "normal",
                        textDecoration: savedHeader.textDecoration || "none",
                        color: savedFooter?.backgroundColor || '#4A7DFF'
                      }}>
                        {savedHeader.clinicName}
                      </h1>
                      {savedHeader.address && (
                        <p style={{
                          margin: "5px 0",
                          fontSize: savedHeader.fontSize || "12pt",
                          fontFamily: savedHeader.fontFamily || "verdana",
                          fontWeight: savedHeader.fontWeight || "normal",
                          fontStyle: savedHeader.fontStyle || "normal",
                          textDecoration: savedHeader.textDecoration || "none",
                          color: "#666"
                        }}>{savedHeader.address}</p>
                      )}
                      {(savedHeader.phone || savedHeader.email) && (
                        <p style={{
                          margin: "5px 0",
                          fontSize: savedHeader.fontSize || "12pt",
                          fontFamily: savedHeader.fontFamily || "verdana",
                          fontWeight: savedHeader.fontWeight || "normal",
                          fontStyle: savedHeader.fontStyle || "normal",
                          textDecoration: savedHeader.textDecoration || "none",
                          color: "#666"
                        }}>
                          {savedHeader.phone}
                          {savedHeader.phone && savedHeader.email && " • "}
                          {savedHeader.email}
                        </p>
                      )}
                      {savedHeader.website && (
                        <p style={{
                          margin: "5px 0",
                          fontSize: savedHeader.fontSize || "12pt",
                          fontFamily: savedHeader.fontFamily || "verdana",
                          fontWeight: savedHeader.fontWeight || "normal",
                          fontStyle: savedHeader.fontStyle || "normal",
                          textDecoration: savedHeader.textDecoration || "none",
                          color: "#666"
                        }}>{savedHeader.website}</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Right Position */}
            {savedHeader.logoPosition === 'right' && (
              <div className="border rounded-lg p-6 bg-gray-50 dark:bg-gray-800">
                <div style={{ borderBottom: '3px solid ' + (savedFooter?.backgroundColor || '#4A7DFF'), paddingBottom: '20px' }}>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: "20px", flexDirection: "row-reverse" }}>
                    {savedHeader.logoBase64 && (
                      <img
                        src={savedHeader.logoBase64}
                        alt="Clinic Logo - Right"
                        style={{ maxHeight: "80px", objectFit: "contain" }}
                      />
                    )}
                    <div style={{ flex: 1, textAlign: "right" }}>
                      <h1 style={{
                        margin: 0,
                        fontSize: savedHeader.clinicNameFontSize || "24pt",
                        fontFamily: savedHeader.fontFamily || "verdana",
                        fontWeight: savedHeader.fontWeight || "normal",
                        fontStyle: savedHeader.fontStyle || "normal",
                        textDecoration: savedHeader.textDecoration || "none",
                        color: savedFooter?.backgroundColor || '#4A7DFF'
                      }}>
                        {savedHeader.clinicName}
                      </h1>
                      {savedHeader.address && (
                        <p style={{
                          margin: "5px 0",
                          fontSize: savedHeader.fontSize || "12pt",
                          fontFamily: savedHeader.fontFamily || "verdana",
                          fontWeight: savedHeader.fontWeight || "normal",
                          fontStyle: savedHeader.fontStyle || "normal",
                          textDecoration: savedHeader.textDecoration || "none",
                          color: "#666"
                        }}>{savedHeader.address}</p>
                      )}
                      {(savedHeader.phone || savedHeader.email) && (
                        <p style={{
                          margin: "5px 0",
                          fontSize: savedHeader.fontSize || "12pt",
                          fontFamily: savedHeader.fontFamily || "verdana",
                          fontWeight: savedHeader.fontWeight || "normal",
                          fontStyle: savedHeader.fontStyle || "normal",
                          textDecoration: savedHeader.textDecoration || "none",
                          color: "#666"
                        }}>
                          {savedHeader.phone}
                          {savedHeader.phone && savedHeader.email && " • "}
                          {savedHeader.email}
                        </p>
                      )}
                      {savedHeader.website && (
                        <p style={{
                          margin: "5px 0",
                          fontSize: savedHeader.fontSize || "12pt",
                          fontFamily: savedHeader.fontFamily || "verdana",
                          fontWeight: savedHeader.fontWeight || "normal",
                          fontStyle: savedHeader.fontStyle || "normal",
                          textDecoration: savedHeader.textDecoration || "none",
                          color: "#666"
                        }}>{savedHeader.website}</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Display Saved Footer */}
      {savedFooter && (
        <div className="border rounded-lg p-6 bg-white dark:bg-[hsl(var(--cura-midnight))]">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-[hsl(var(--cura-bluewave))] flex items-center gap-2">
              <Palette className="h-5 w-5" />
              Saved Clinic Footer
            </h3>
            <div className="flex gap-2">
              {canEdit('forms') && (
                <Button
                  onClick={handleEditFooter}
                  className="bg-gray-600 hover:bg-gray-700 text-white"
                  data-testid="button-edit-footer"
                >
                  <Edit className="h-4 w-4 mr-1" />
                  Edit
                </Button>
              )}
              <Button
                onClick={() => onLoadFooter(savedFooter)}
                className="bg-[hsl(var(--cura-bluewave))] hover:bg-[hsl(var(--cura-electric-lilac))] text-light"
                data-testid="button-load-footer"
              >
                Load
              </Button>
            </div>
          </div>
          <div
            className="rounded-lg p-6 text-center"
            style={{
              backgroundColor: savedFooter.backgroundColor,
              color: savedFooter.textColor
            }}
          >
            <p className="text-sm font-medium">{savedFooter.footerText}</p>
            {savedFooter.showSocial && (savedFooter.facebook || savedFooter.twitter || savedFooter.linkedin) && (
              <div className="flex justify-center gap-4 mt-3">
                {savedFooter.facebook && <span className="text-xs">📘 Facebook</span>}
                {savedFooter.twitter && <span className="text-xs">🐦 Twitter</span>}
                {savedFooter.linkedin && <span className="text-xs">💼 LinkedIn</span>}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Edit Header Dialog */}
      <Dialog open={isEditingHeader} onOpenChange={setIsEditingHeader}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Clinic Header</DialogTitle>
          </DialogHeader>
          {editHeaderData && (
            <div className="space-y-4 py-4">
              <div>
                <Label>Clinic Logo</Label>
                <div className="space-y-3">
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onloadend = () => {
                          setEditHeaderData({ ...editHeaderData, logoBase64: reader.result as string });
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                    className="flex-1"
                  />
                  <div className="border rounded-lg p-4 bg-gray-50 dark:bg-gray-800 min-h-[120px] flex items-center justify-center">
                    {editHeaderData.logoBase64 ? (
                      <img
                        src={editHeaderData.logoBase64}
                        alt="Logo Preview"
                        className="max-h-[100px] object-contain"
                      />
                    ) : (
                      <p className="text-gray-400 dark:text-gray-500 text-sm italic">logo will preview here</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Clinic Name</Label>
                  <Input
                    value={editHeaderData.clinicName || ''}
                    onChange={(e) => setEditHeaderData({ ...editHeaderData, clinicName: e.target.value })}
                    placeholder="Enter clinic name"
                  />
                </div>
                <div>
                  <Label>Clinic Name Font Size</Label>
                  <Select
                    value={editHeaderData.clinicNameFontSize || '24pt'}
                    onValueChange={(value) => setEditHeaderData({ ...editHeaderData, clinicNameFontSize: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="18pt">18pt</SelectItem>
                      <SelectItem value="20pt">20pt</SelectItem>
                      <SelectItem value="22pt">22pt</SelectItem>
                      <SelectItem value="24pt">24pt</SelectItem>
                      <SelectItem value="26pt">26pt</SelectItem>
                      <SelectItem value="28pt">28pt</SelectItem>
                      <SelectItem value="30pt">30pt</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Address</Label>
                  <Input
                    value={editHeaderData.address || ''}
                    onChange={(e) => setEditHeaderData({ ...editHeaderData, address: e.target.value })}
                    placeholder="Enter address"
                  />
                </div>
                <div>
                  <Label>Phone</Label>
                  <Input
                    value={editHeaderData.phone || ''}
                    onChange={(e) => setEditHeaderData({ ...editHeaderData, phone: e.target.value })}
                    placeholder="Enter phone"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Email</Label>
                  <Input
                    value={editHeaderData.email || ''}
                    onChange={(e) => setEditHeaderData({ ...editHeaderData, email: e.target.value })}
                    placeholder="Enter email"
                  />
                </div>
                <div>
                  <Label>Website</Label>
                  <Input
                    value={editHeaderData.website || ''}
                    onChange={(e) => setEditHeaderData({ ...editHeaderData, website: e.target.value })}
                    placeholder="Enter website"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Font Family</Label>
                  <Select
                    value={editHeaderData.fontFamily || 'verdana'}
                    onValueChange={(value) => setEditHeaderData({ ...editHeaderData, fontFamily: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="arial">Arial</SelectItem>
                      <SelectItem value="calibri">Calibri</SelectItem>
                      <SelectItem value="cambria">Cambria</SelectItem>
                      <SelectItem value="comic-sans">Comic Sans MS</SelectItem>
                      <SelectItem value="courier">Courier New</SelectItem>
                      <SelectItem value="georgia">Georgia</SelectItem>
                      <SelectItem value="helvetica">Helvetica</SelectItem>
                      <SelectItem value="lucida">Lucida Sans</SelectItem>
                      <SelectItem value="tahoma">Tahoma</SelectItem>
                      <SelectItem value="times">Times New Roman</SelectItem>
                      <SelectItem value="trebuchet">Trebuchet MS</SelectItem>
                      <SelectItem value="verdana">Verdana</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Font Size</Label>
                  <Select
                    value={editHeaderData.fontSize || '12pt'}
                    onValueChange={(value) => setEditHeaderData({ ...editHeaderData, fontSize: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="8pt">8pt</SelectItem>
                      <SelectItem value="10pt">10pt</SelectItem>
                      <SelectItem value="12pt">12pt</SelectItem>
                      <SelectItem value="14pt">14pt</SelectItem>
                      <SelectItem value="16pt">16pt</SelectItem>
                      <SelectItem value="18pt">18pt</SelectItem>
                      <SelectItem value="20pt">20pt</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label>Text Styling</Label>
                <div className="flex gap-2 mt-2">
                  <Button
                    type="button"
                    variant={editHeaderData.fontWeight === 'bold' ? 'default' : 'outline'}
                    onClick={() => setEditHeaderData({ ...editHeaderData, fontWeight: editHeaderData.fontWeight === 'bold' ? 'normal' : 'bold' })}
                    className="flex items-center gap-1"
                  >
                    <Bold className="h-4 w-4" />
                    Bold
                  </Button>
                  <Button
                    type="button"
                    variant={editHeaderData.fontStyle === 'italic' ? 'default' : 'outline'}
                    onClick={() => setEditHeaderData({ ...editHeaderData, fontStyle: editHeaderData.fontStyle === 'italic' ? 'normal' : 'italic' })}
                    className="flex items-center gap-1"
                  >
                    <Italic className="h-4 w-4" />
                    Italic
                  </Button>
                  <Button
                    type="button"
                    variant={editHeaderData.textDecoration === 'underline' ? 'default' : 'outline'}
                    onClick={() => setEditHeaderData({ ...editHeaderData, textDecoration: editHeaderData.textDecoration === 'underline' ? 'none' : 'underline' })}
                    className="flex items-center gap-1"
                  >
                    <Underline className="h-4 w-4" />
                    Underline
                  </Button>
                </div>
              </div>

              <div>
                <Label>Logo Position</Label>
                <Select
                  value={editHeaderData.logoPosition || 'center'}
                  onValueChange={(value) => setEditHeaderData({ ...editHeaderData, logoPosition: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="left">Left</SelectItem>
                    <SelectItem value="center">Center</SelectItem>
                    <SelectItem value="right">Right</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex justify-end gap-2 mt-6">
                <Button variant="outline" onClick={() => setIsEditingHeader(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleSaveHeader}
                  disabled={updateHeaderMutation.isPending}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  {updateHeaderMutation.isPending ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Footer Dialog */}
      <Dialog open={isEditingFooter} onOpenChange={setIsEditingFooter}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Clinic Footer</DialogTitle>
          </DialogHeader>
          {editFooterData && (
            <div className="space-y-4 py-4">
              <div>
                <Label>Footer Text</Label>
                <Input
                  value={editFooterData.footerText || ''}
                  onChange={(e) => setEditFooterData({ ...editFooterData, footerText: e.target.value })}
                  placeholder="Enter footer text"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Background Color</Label>
                  <Input
                    type="color"
                    value={editFooterData.backgroundColor || '#4A7DFF'}
                    onChange={(e) => setEditFooterData({ ...editFooterData, backgroundColor: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Text Color</Label>
                  <Input
                    type="color"
                    value={editFooterData.textColor || '#FFFFFF'}
                    onChange={(e) => setEditFooterData({ ...editFooterData, textColor: e.target.value })}
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 mt-6">
                <Button variant="outline" onClick={() => setIsEditingFooter(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleSaveFooter}
                  disabled={updateFooterMutation.isPending}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  {updateFooterMutation.isPending ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function stripHtmlFromUserMessage(message: string): string {
  const trimmed = message.trim();
  if (!trimmed) return trimmed;
  const htmlIdx = trimmed.search(/<!doctype|<html/i);
  if (htmlIdx >= 0) {
    const prefix = trimmed.slice(0, htmlIdx).trim().replace(/:\s*$/, "");
    return prefix || "The server returned an error page instead of a useful message.";
  }
  return trimmed.length > 500 ? `${trimmed.slice(0, 497)}...` : trimmed;
}

/** POST form share — parse JSON errors (avoid HTML from throwIfResNotOk). */
async function postFormShareApi(
  formId: number,
  body: { recipientEmail: string },
): Promise<Record<string, unknown>> {
  const token = localStorage.getItem("auth_token");
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "X-Tenant-Subdomain": getTenantSubdomain(),
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(buildUrl(`/api/forms/${formId}/share`), {
    method: "POST",
    headers,
    body: JSON.stringify(body),
    credentials: "include",
  });

  const text = await res.text();
  let parsed: Record<string, unknown> | null = null;
  if (text) {
    try {
      parsed = JSON.parse(text) as Record<string, unknown>;
    } catch {
      parsed = null;
    }
  }

  if (!res.ok) {
    const apiError = typeof parsed?.error === "string" ? parsed.error : null;
    let message =
      apiError ||
      (text.includes("<!DOCTYPE") || text.includes("<html")
        ? "Server returned an invalid response. Restart the app (npm run dev) and try again."
        : text.slice(0, 300) || `Failed to share form (${res.status})`);
    if (message.includes("BACKEND_DATAKEY_FAILED") || message.includes("<!DOCTYPE")) {
      message =
        "Could not reach the encryption vault for new patient records. Form sharing to custom emails no longer requires that—restart the server and try again. If it persists, check VAULT_API_ENDPOINT in .sdk-metadata.";
    }
    throw new Error(stripHtmlFromUserMessage(message));
  }

  return parsed ?? {};
}

async function postFormSharePreviewApi(
  formId: number,
  body: { recipientEmail: string },
): Promise<Record<string, unknown>> {
  const token = localStorage.getItem("auth_token");
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "X-Tenant-Subdomain": getTenantSubdomain(),
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(buildUrl(`/api/forms/${formId}/share/preview`), {
    method: "POST",
    headers,
    body: JSON.stringify(body),
    credentials: "include",
  });

  const text = await res.text();
  let parsed: Record<string, unknown> | null = null;
  if (text) {
    try {
      parsed = JSON.parse(text) as Record<string, unknown>;
    } catch {
      parsed = null;
    }
  }

  if (!res.ok) {
    const apiError = typeof parsed?.error === "string" ? parsed.error : null;
    throw new Error(
      apiError ||
        (text.includes("<!DOCTYPE")
          ? "Server returned an invalid response. Restart the app and try again."
          : text.slice(0, 300) || `Failed to preview email (${res.status})`),
    );
  }

  return parsed ?? {};
}

/** `apiRequest` failures look like `400: {"error":"...","detail":"..."}`. */
function parseApiFailurePayload(message: string): { error?: string; detail?: string } {
  const m = /^(\d{3}):\s*([\s\S]+)$/.exec(message.trim());
  if (!m) return {};
  try {
    const body = JSON.parse(m[2]) as { error?: string; detail?: string };
    return {
      error: typeof body?.error === "string" ? body.error : undefined,
      detail: typeof body?.detail === "string" ? body.detail : undefined,
    };
  } catch {
    return {};
  }
}

export default function Forms() {
  const { currencySymbol } = useCurrency();
  const { user, logout } = useAuth();
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [documentContent, setDocumentContent] = useState("");
  const [fontFamily, setFontFamily] = useState("verdana");
  const [fontSize, setFontSize] = useState("12pt");
  const [textStyle, setTextStyle] = useState("heading2");
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [textColor, setTextColor] = useState("#000000");
  const [showFormFields, setShowFormFields] = useState(true);
  const [textareaRef, setTextareaRef] = useState<HTMLTextAreaElement | null>(
    null,
  );
  const [selectedHeader, setSelectedHeader] = useState("your-clinic");
  const [showEditClinic, setShowEditClinic] = useState(false);
  const [showLinkDialog, setShowLinkDialog] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const [linkText, setLinkText] = useState("");
  const [savedSelection, setSavedSelection] = useState<Range | null>(null);
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);
  const [showLogoDialog, setShowLogoDialog] = useState(false);
  const [showClinicDialog, setShowClinicDialog] = useState(false);
  const [showEditClinicDialog, setShowEditClinicDialog] = useState(false);
  const [showPatientDialog, setShowPatientDialog] = useState(false);
  const [showRecipientDialog, setShowRecipientDialog] = useState(false);
  const [showAppointmentsDialog, setShowAppointmentsDialog] = useState(false);
  const [showLabsDialog, setShowLabsDialog] = useState(false);
  const [showPatientRecordsDialog, setShowPatientRecordsDialog] =
    useState(false);
  const [showAllTemplatesDialog, setShowAllTemplatesDialog] = useState(false);
  const [showInsertProductDialog, setShowInsertProductDialog] = useState(false);
  const [showMoreOptionsDialog, setShowMoreOptionsDialog] = useState(false);
  const [showSavedTemplatesDialog, setShowSavedTemplatesDialog] =
    useState(false);
  const [showEmptyContentDialog, setShowEmptyContentDialog] = useState(false);
  const [showDocumentPreviewDialog, setShowDocumentPreviewDialog] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [showFormShareDialog, setShowFormShareDialog] = useState(false);
  const [showShareLinksDialog, setShowShareLinksDialog] = useState(false);
  const [formToDelete, setFormToDelete] = useState<FormSummary | null>(null);
  const [showDeleteFormDialog, setShowDeleteFormDialog] = useState(false);
  const [filledFormToDelete, setFilledFormToDelete] = useState<any>(null);
  const [showDeleteFilledFormDialog, setShowDeleteFilledFormDialog] = useState(false);
  const [showFilledFormFileMissingDialog, setShowFilledFormFileMissingDialog] = useState(false);
  const [formLoadPayload, setFormLoadPayload] = useState<FormBuilderLoadPayload | undefined>(undefined);
  type FormsTab = "dynamic" | "saved" | "filled" | "forms" | "editor";
  const userIsPatient = Boolean(user && user.role === "patient");
  const initialTab: FormsTab = userIsPatient ? "filled" : "dynamic";
  const [activeFormsTab, setActiveFormsTab] = useState<FormsTab>(initialTab);
  useEffect(() => {
    if (userIsPatient) {
      setActiveFormsTab("filled");
    }
  }, [userIsPatient]);
  const [selectedFormForShare, setSelectedFormForShare] = useState<FormSummary | null>(null);
  const [shareRecipientInput, setShareRecipientInput] = useState("");
  const [latestLinks, setLatestLinks] = useState<Record<number, string>>({});
  const [currentLinkForm, setCurrentLinkForm] = useState<FormSummary | null>(null);
  const [responseDialogOpen, setResponseDialogOpen] = useState(false);
  const [selectedFormForResponses, setSelectedFormForResponses] = useState<FormSummary | null>(null);
  const [formResponsesData, setFormResponsesData] = useState<FormResponsesPayload | null>(null);
  const [formResponsesLoading, setFormResponsesLoading] = useState(false);
  const [filledViewMode, setFilledViewMode] = useState<"grid" | "list">("list");
  const [savedViewMode, setSavedViewMode] = useState<"grid" | "list">("list");
  const [templatePreview, setTemplatePreview] = useState<FormTemplate | null>(null);
  const [templateViewMode, setTemplateViewMode] = useState<"grid" | "list">("list");
  const [templateSearchQuery, setTemplateSearchQuery] = useState("");
  const [customTemplateTab, setCustomTemplateTab] = useState<"custom" | "templates">("custom");
  const filteredFormTemplates = useMemo(() => {
    if (!templateSearchQuery.trim()) return FORM_TEMPLATES;
    const q = templateSearchQuery.trim().toLowerCase();
    return FORM_TEMPLATES.filter(
      (t) => t.title.toLowerCase().includes(q) || t.category.toLowerCase().includes(q)
    );
  }, [templateSearchQuery]);

  const categoryOrder = ["Doctor-Related", "Patient-Related", "Nurse-Related", "Admin-Related"];
  const templatesByCategory = useMemo(() => {
    const map = new Map<string, FormTemplate[]>();
    for (const t of filteredFormTemplates) {
      const list = map.get(t.category) ?? [];
      list.push(t);
      map.set(t.category, list);
    }
    const ordered: { category: string; templates: FormTemplate[] }[] = [];
    for (const cat of categoryOrder) {
      const list = map.get(cat);
      if (list?.length) ordered.push({ category: cat, templates: list });
    }
    for (const [cat, list] of Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]))) {
      if (!categoryOrder.includes(cat)) ordered.push({ category: cat, templates: list });
    }
    return ordered;
  }, [filteredFormTemplates]);
  const openShareLinksDialog = (form: FormSummary) => {
    setCurrentLinkForm(form);
    setShowShareLinksDialog(true);
  };
  const closeShareLinksDialog = () => {
    setShowShareLinksDialog(false);
    setCurrentLinkForm(null);
  };
  const [emailPreview, setEmailPreview] = useState<{ subject: string; html: string; text: string; link: string } | null>(null);
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
  const [formSharedSuccessfully, setFormSharedSuccessfully] = useState(false);
  const [showTemplateSaveSuccessModal, setShowTemplateSaveSuccessModal] = useState(false);
  const [savedTemplateName, setSavedTemplateName] = useState("");
  const [showShareFormErrorModal, setShowShareFormErrorModal] = useState(false);
  const [shareFormErrorMessage, setShareFormErrorMessage] = useState("");
  const [selectedDoctorId, setSelectedDoctorId] = useState("");
  const [shareFormData, setShareFormData] = useState({
    subject: "",
    recipient: "",
    location: "",
    copiedRecipients: "",
    doctor: "",
    header: "your-clinic"
  });
  const [doctorDropdownOpen, setDoctorDropdownOpen] = useState(false);

  // Patient template states
  const [showPatientTemplateDialog, setShowPatientTemplateDialog] = useState(false);
  const [selectedTemplateCategory, setSelectedTemplateCategory] = useState("");
  const [showCategoryOptionsDialog, setShowCategoryOptionsDialog] = useState(false);
  const [selectedCategoryData, setSelectedCategoryData] = useState<any>(null);

  // Doctor template states
  const [showDoctorTemplateDialog, setShowDoctorTemplateDialog] = useState(false);
  const [selectedDoctorTemplateCategory, setSelectedDoctorTemplateCategory] = useState("");
  const [showDoctorCategoryOptionsDialog, setShowDoctorCategoryOptionsDialog] = useState(false);
  const [selectedDoctorCategoryData, setSelectedDoctorCategoryData] = useState<any>(null);

  // Template preview states
  const [showTemplatePreviewDialog, setShowTemplatePreviewDialog] = useState(false);
  const [previewTemplate, setPreviewTemplate] = useState<any>(null);
  const [previewTemplateName, setPreviewTemplateName] = useState("");
  const [addLogo, setAddLogo] = useState(false);
  const [logoPosition, setLogoPosition] = useState("right"); // left, right, center
  const [selectedLogoTemplate, setSelectedLogoTemplate] = useState("");
  const [customLogoData, setCustomLogoData] = useState("");
  const [addClinicHeader, setAddClinicHeader] = useState(false);
  const [selectedClinicHeaderType, setSelectedClinicHeaderType] = useState("");
  const [showLogoTemplatesDialog, setShowLogoTemplatesDialog] = useState(false);
  const [showClinicHeaderDialog, setShowClinicHeaderDialog] = useState(false);
  const [tempLogoPosition, setTempLogoPosition] = useState("right");
  const [clinicHeaderPosition, setClinicHeaderPosition] = useState("center");
  const [addFooter, setAddFooter] = useState(false);
  const [showClinicPositionDialog, setShowClinicPositionDialog] = useState(false);
  const [tempClinicHeaderType, setTempClinicHeaderType] = useState("");
  const [isComingFromClinicButton, setIsComingFromClinicButton] = useState(false);
  const [showClinicalHeaderDialog, setShowClinicalHeaderDialog] = useState(false);
  const [showAddClinicInfoDialog, setShowAddClinicInfoDialog] = useState(false);
  const [showClinicDisplayDialog, setShowClinicDisplayDialog] = useState(false);
  const [selectedClinicalHeader, setSelectedClinicalHeader] = useState("");

  // Additional preview states for other template types
  const [showOtherTemplatePreviewDialog, setShowOtherTemplatePreviewDialog] = useState(false);
  const [previewOtherTemplate, setPreviewOtherTemplate] = useState<any>(null);
  const [previewOtherTemplateName, setPreviewOtherTemplateName] = useState("");
  const [previewTemplateType, setPreviewTemplateType] = useState("");

  // Saved template preview states
  const [showSavedTemplatePreviewDialog, setShowSavedTemplatePreviewDialog] = useState(false);
  const [selectedSavedTemplate, setSelectedSavedTemplate] = useState<any>(null);

  // Draft functionality states
  const [showDraftsDialog, setShowDraftsDialog] = useState(false);
  const [showDraftDetailsDialog, setShowDraftDetailsDialog] = useState(false);
  const [selectedDraft, setSelectedDraft] = useState<any>(null);

  // Create Clinic Information states
  const [showCreateClinicInfoDialog, setShowCreateClinicInfoDialog] = useState(false);
  const [showViewClinicInfoDialog, setShowViewClinicInfoDialog] = useState(false);
  const [clinicLogoFile, setClinicLogoFile] = useState<File | null>(null);
  const [clinicLogoPreview, setClinicLogoPreview] = useState<string>("");
  const [clinicLogoError, setClinicLogoError] = useState<string>("");
  const [clinicLogoSuccess, setClinicLogoSuccess] = useState<string>("");
  const [selectedLogoPosition, setSelectedLogoPosition] = useState<"left" | "right" | "center">("center");
  const [activeClinicTab, setActiveClinicTab] = useState<string>("header");
  const [clinicHeaderInfo, setClinicHeaderInfo] = useState({
    clinicName: "",
    address: "",
    phone: "",
    email: "",
    website: "",
    clinicNameFontSize: "24pt",
    fontSize: "12pt",
    fontFamily: "verdana",
    fontWeight: "normal",
    fontStyle: "normal",
    textDecoration: "none",
  });
  const [clinicFooterInfo, setClinicFooterInfo] = useState({
    footerText: "",
    backgroundColor: "#4A7DFF",
    textColor: "#FFFFFF",
    showSocial: false,
    facebook: "",
    twitter: "",
    linkedin: "",
  });

  const handleClinicLogoChange = (event: ChangeEvent<HTMLInputElement>) => {
    const input = event.target;
    const file = input.files?.[0] ?? null;

    if (!file) {
      setClinicLogoFile(null);
      setClinicLogoPreview("");
      setClinicLogoError("");
      setClinicLogoSuccess("");
      return;
    }

    const metadataError = validateClinicLogoMetadata(file);
    if (metadataError) {
      setClinicLogoFile(null);
      setClinicLogoPreview("");
      setClinicLogoError(metadataError);
      setClinicLogoSuccess("");
      input.value = "";
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const dataUrl = reader.result as string;
      const img = document.createElement("img");
      img.onload = () => {
        const dimensionError = validateClinicLogoDimensions(img.width, img.height);
        if (dimensionError) {
          setClinicLogoFile(null);
          setClinicLogoPreview("");
          setClinicLogoError(dimensionError);
          setClinicLogoSuccess("");
          input.value = "";
          return;
        }

        setClinicLogoError("");
        setClinicLogoPreview(dataUrl);
        setClinicLogoFile(file);
        setClinicLogoSuccess("Logo uploaded successfully.");
      };
      img.onerror = () => {
        setClinicLogoFile(null);
        setClinicLogoPreview("");
        setClinicLogoError("Unable to read logo dimensions. Please try another image.");
        input.value = "";
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  };

  // Patient letter templates data
  const patientTemplates = {
    "1. Appointment-Related": {
      options: [
        "a) Request for a new appointment",
        "b) Rescheduling or canceling an appointment",
        "c) Confirmation of an upcoming appointment"
      ],
      templates: {
        "a) Request for a new appointment": {
          subject: "Request for Appointment",
          body: `Dear Dr. [Doctor's Name],

I would like to schedule a new appointment at your earliest availability. Please let me know a convenient date and time.

Thank you for your assistance.

Sincerely,
[Patient Name]`
        },
        "b) Rescheduling or canceling an appointment": {
          subject: "Request to Reschedule Appointment",
          body: `Dear Dr. [Doctor's Name],

I am unable to attend my appointment on [original date/time]. Could you kindly reschedule it to another suitable time?

Thank you for your understanding.

Best regards,
[Patient Name]`
        },
        "c) Confirmation of an upcoming appointment": {
          subject: "Appointment Confirmation",
          body: `Dear Dr. [Doctor's Name],

I am writing to confirm my appointment scheduled for [date/time]. Please let me know if any preparation is required beforehand.

Sincerely,
[Patient Name]`
        }
      }
    },
    "2. Prescription & Medication": {
      options: [
        "a) Requesting prescription refills",
        "b) Questions about dosage, side effects, or alternatives",
        "c) Reporting issues with prescribed medication"
      ],
      templates: {
        "a) Requesting prescription refills": {
          subject: "Prescription Refill Request",
          body: `Dear Dr. [Doctor's Name],

I am running low on my prescribed medication ([medication name]). Could you please provide me with a refill prescription?

Thank you,
[Patient Name]`
        },
        "b) Questions about dosage, side effects, or alternatives": {
          subject: "Medication Inquiry",
          body: `Dear Dr. [Doctor's Name],

I have some concerns about the dosage and possible side effects of my current medication ([medication name]). Could you please provide guidance or suggest alternatives?

Best regards,
[Patient Name]`
        },
        "c) Reporting issues with prescribed medication": {
          subject: "Medication Side Effects",
          body: `Dear Dr. [Doctor's Name],

Since starting [medication name], I have been experiencing [describe symptoms]. Should I continue this medication or consider alternatives?

Sincerely,
[Patient Name]`
        }
      }
    },
    "3. Lab Results & Reports": {
      options: [
        "a) Request for lab/test results",
        "b) Questions about interpretation of results",
        "c) Follow-up on pending results"
      ],
      templates: {
        "a) Request for lab/test results": {
          subject: "Request for Lab Results",
          body: `Dear Dr. [Doctor's Name],

I recently underwent [test name] on [date]. Could you please share my results with me at your earliest convenience?

Thank you,
[Patient Name]`
        },
        "b) Questions about interpretation of results": {
          subject: "Clarification on Lab Results",
          body: `Dear Dr. [Doctor's Name],

I have received my lab results but would like your explanation regarding [specific test/parameter]. Could you help me understand what this means for my health?

Sincerely,
[Patient Name]`
        },
        "c) Follow-up on pending results": {
          subject: "Pending Lab Results",
          body: `Dear Dr. [Doctor's Name],

I am following up to check the status of my [test name] conducted on [date]. Could you kindly update me on when the results will be available?

Thank you,
[Patient Name]`
        }
      }
    },
    "4. Medical Condition Updates": {
      options: [
        "a) Reporting new symptoms",
        "b) Providing updates on ongoing treatment progress",
        "c) Sharing self-monitoring data (BP, sugar, etc.)"
      ],
      templates: {
        "a) Reporting new symptoms": {
          subject: "New Symptoms Report",
          body: `Dear Dr. [Doctor's Name],

I have recently started experiencing [describe symptoms]. Please advise me on whether I should schedule an appointment or adjust my treatment.

Sincerely,
[Patient Name]`
        },
        "b) Providing updates on ongoing treatment progress": {
          subject: "Treatment Progress Update",
          body: `Dear Dr. [Doctor's Name],

I would like to update you on my current treatment for [condition]. I have noticed [improvements/symptoms/concerns] over the past [timeframe]. Please advise on the next steps.

Best regards,
[Patient Name]`
        },
        "c) Sharing self-monitoring data (BP, sugar, etc.)": {
          subject: "Self-Monitoring Data Submission",
          body: `Dear Dr. [Doctor's Name],

I am sharing my recent self-monitoring data:

Blood Pressure: [value]

Blood Sugar: [value]

Weight: [value]

Please let me know if these values require any adjustments to my treatment.

Thank you,
[Patient Name]`
        }
      }
    },
    "5. Treatment & Follow-up": {
      options: [
        "a) Request for treatment plan details",
        "b) Asking about post-surgery/post-treatment care",
        "c) Request for follow-up visit scheduling"
      ],
      templates: {
        "a) Request for treatment plan details": {
          subject: "Treatment Plan Request",
          body: `Dear Dr. [Doctor's Name],

Could you please share more details regarding my treatment plan for [condition]? I would like to better understand the steps involved and expected outcomes.

Sincerely,
[Patient Name]`
        },
        "b) Asking about post-surgery/post-treatment care": {
          subject: "Post-Treatment Care Guidance",
          body: `Dear Dr. [Doctor's Name],

Following my [surgery/treatment], I would like your guidance on recovery, diet, activity, and follow-up visits.

Best regards,
[Patient Name]`
        },
        "c) Request for follow-up visit scheduling": {
          subject: "Request for Follow-up Appointment",
          body: `Dear Dr. [Doctor's Name],

I would like to schedule a follow-up visit regarding my recent [treatment/consultation]. Please suggest a suitable time.

Thank you,
[Patient Name]`
        }
      }
    },
    "6. Administrative / Documentation": {
      options: [
        "a) Request for medical records",
        "b) Insurance or claim-related queries",
        "c) Request for referral letters or medical certificates"
      ],
      templates: {
        "a) Request for medical records": {
          subject: "Request for Medical Records",
          body: `Dear Dr. [Doctor's Name],

I would like to request a copy of my medical records for personal use and future reference. Please let me know the procedure.

Thank you,
[Patient Name]`
        },
        "b) Insurance or claim-related queries": {
          subject: "Insurance/Claim Assistance",
          body: `Dear Dr. [Doctor's Name],

I require documentation regarding my recent treatment for insurance purposes. Could you kindly provide the necessary details?

Sincerely,
[Patient Name]`
        },
        "c) Request for referral letters or medical certificates": {
          subject: "Request for Referral/Certificate",
          body: `Dear Dr. [Doctor's Name],

I would like to request a referral letter for [specialist/clinic] or a medical certificate for [reason]. Please let me know the next steps.

Thank you,
[Patient Name]`
        }
      }
    },
    "7. Emergency / Urgent Care": {
      options: [
        "a) Urgent symptoms needing immediate advice",
        "b) Questions about whether to visit ER",
        "c) Reporting sudden deterioration in health"
      ],
      templates: {
        "a) Urgent symptoms needing immediate advice": {
          subject: "Urgent Medical Concern",
          body: `Dear Dr. [Doctor's Name],

I am experiencing urgent symptoms including [describe symptoms]. Please advise if I should seek immediate medical attention.

Sincerely,
[Patient Name]`
        },
        "b) Questions about whether to visit ER": {
          subject: "ER Visit Guidance",
          body: `Dear Dr. [Doctor's Name],

I am unsure whether my current condition ([briefly describe]) requires an ER visit. Could you please advise urgently?

Thank you,
[Patient Name]`
        },
        "c) Reporting sudden deterioration in health": {
          subject: "Health Condition Worsening",
          body: `Dear Dr. [Doctor's Name],

My health condition has suddenly worsened with [describe changes]. Please advise me on immediate steps to take.

Sincerely,
[Patient Name]`
        }
      }
    },
    "8. General Health Advice": {
      options: [
        "a) Lifestyle, diet, or exercise questions",
        "b) Preventive care inquiries (vaccinations, screenings)",
        "c) Clarification about chronic condition management"
      ],
      templates: {
        "a) Lifestyle, diet, or exercise questions": {
          subject: "Lifestyle & Wellness Guidance",
          body: `Dear Dr. [Doctor's Name],

I would like your advice regarding lifestyle improvements including diet, exercise, and daily habits to better manage my health.

Thank you,
[Patient Name]`
        },
        "b) Preventive care inquiries (vaccinations, screenings)": {
          subject: "Preventive Care Inquiry",
          body: `Dear Dr. [Doctor's Name],

Could you please advise me regarding recommended preventive care such as vaccinations and regular screenings for my age group?

Sincerely,
[Patient Name]`
        },
        "c) Clarification about chronic condition management": {
          subject: "Chronic Condition Management",
          body: `Dear Dr. [Doctor's Name],

I have some questions about the long-term management of my [condition]. Could you provide guidance on medication, monitoring, and lifestyle changes?

Thank you,
[Patient Name]`
        }
      }
    }
  };

  // Doctor letter templates data
  const doctorTemplates = {
    "1. Appointment & Scheduling": {
      options: [
        "a) Appointment Confirmation",
        "b) Appointment Rescheduling Notice",
        "c) Missed Appointment Follow-up"
      ],
      templates: {
        "a) Appointment Confirmation": {
          subject: "Appointment Confirmation – [Date/Time]",
          body: `Dear [Patient Name],

This is to confirm your appointment with Dr. [Doctor Name] on [Date, Time] at [Clinic/Hospital Name]. Please arrive 10–15 minutes early for check-in.

Sincerely,
Dr. [Name]`
        },
        "b) Appointment Rescheduling Notice": {
          subject: "Appointment Rescheduled – [New Date/Time]",
          body: `Dear [Patient Name],

Your appointment originally scheduled for [Old Date/Time] has been rescheduled to [New Date/Time] due to unforeseen circumstances. Please confirm your availability.

Thank you,
Dr. [Name]`
        },
        "c) Missed Appointment Follow-up": {
          subject: "Missed Appointment – Please Reschedule",
          body: `Dear [Patient Name],

We noticed you missed your appointment on [Date]. It is important to continue your care without delays. Please contact us to reschedule at your earliest convenience.

Best regards,
Dr. [Name]`
        }
      }
    },
    "2. Prescription & Medication": {
      options: [
        "a) New Prescription Instructions",
        "b) Prescription Refill Confirmation",
        "c) Dosage Adjustment"
      ],
      templates: {
        "a) New Prescription Instructions": {
          subject: "Prescription for [Medication Name]",
          body: `Dear [Patient Name],

I have prescribed [Medication Name, Dosage, Frequency] for your condition. Please take it as directed and report any side effects immediately.

Regards,
Dr. [Name]`
        },
        "b) Prescription Refill Confirmation": {
          subject: "Prescription Refill Approved",
          body: `Dear [Patient Name],

Your request for a refill of [Medication Name] has been approved. You may collect it from [Pharmacy Name/Clinic].

Stay well,
Dr. [Name]`
        },
        "c) Dosage Adjustment": {
          subject: "Updated Dosage for [Medication Name]",
          body: `Dear [Patient Name],

After reviewing your recent progress, I recommend adjusting your dosage of [Medication Name] to [New Dosage]. Please start this from [Date].

Sincerely,
Dr. [Name]`
        }
      }
    },
    "3. Lab Results & Reports": {
      options: [
        "a) Normal Lab Results",
        "b) Abnormal Lab Results with Recommendations",
        "c) Pending/Delayed Results"
      ],
      templates: {
        "a) Normal Lab Results": {
          subject: "Lab Results – Normal",
          body: `Dear [Patient Name],

Your recent lab results for [Test Name] are within normal range. No further action is required at this time. Please continue your current treatment.

Sincerely,
Dr. [Name]`
        },
        "b) Abnormal Lab Results with Recommendations": {
          subject: "Lab Results – Follow-up Needed",
          body: `Dear [Patient Name],

Your lab results for [Test Name] indicate [Abnormal Finding]. I recommend scheduling a follow-up appointment to discuss treatment options.

Sincerely,
Dr. [Name]`
        },
        "c) Pending/Delayed Results": {
          subject: "Update on Pending Lab Results",
          body: `Dear [Patient Name],

Your test results for [Test Name] are still pending due to [Reason: lab delay, technical issue, etc.]. We will notify you immediately once they are available.

Sincerely,
Dr. [Name]`
        }
      }
    },
    "4. Treatment & Care Instructions": {
      options: [
        "a) Treatment Plan Explanation",
        "b) Post-Surgery / Post-Treatment Care",
        "c) Follow-up Visit Requirement"
      ],
      templates: {
        "a) Treatment Plan Explanation": {
          subject: "Your Treatment Plan – [Condition Name]",
          body: `Dear [Patient Name],

Your treatment plan includes [Details: medications, therapies, lifestyle changes]. Please follow these instructions closely and contact me if you face any issues.

Sincerely,
Dr. [Name]`
        },
        "b) Post-Surgery / Post-Treatment Care": {
          subject: "Post-Treatment Care Instructions",
          body: `Dear [Patient Name],

Following your recent [Surgery/Treatment], please adhere to the following care guidelines:

[Instruction 1]

[Instruction 2]

[Instruction 3]

Contact us if you notice unusual pain, swelling, or fever.

Best wishes for recovery,
Dr. [Name]`
        },
        "c) Follow-up Visit Requirement": {
          subject: "Follow-up Appointment Needed",
          body: `Dear [Patient Name],

A follow-up visit is required in [X days/weeks] to monitor your progress. Please schedule this at your earliest convenience.

Sincerely,
Dr. [Name]`
        }
      }
    },
    "5. Medical Condition Updates": {
      options: [
        "a) Explanation of Diagnosis",
        "b) Treatment Progress Update",
        "c) Lifestyle Modification Advice"
      ],
      templates: {
        "a) Explanation of Diagnosis": {
          subject: "Diagnosis Report – [Condition Name]",
          body: `Dear [Patient Name],

Based on your recent evaluation, the diagnosis is [Condition Name]. I will discuss treatment options and lifestyle modifications during your next visit.

Sincerely,
Dr. [Name]`
        },
        "b) Treatment Progress Update": {
          subject: "Progress Report on Your Treatment",
          body: `Dear [Patient Name],

Your recent assessments show [Improvement/Stable/Concerns] in your condition. Please continue your current regimen and follow-up as scheduled.

Sincerely,
Dr. [Name]`
        },
        "c) Lifestyle Modification Advice": {
          subject: "Lifestyle Recommendations for Better Health",
          body: `Dear [Patient Name],

To support your treatment, I recommend:

• Healthy diet (low in [sugar/salt/fat])

• Regular physical activity

• Avoiding [smoking/alcohol/etc.]

These changes will help improve your overall health.

Sincerely,
Dr. [Name]`
        }
      }
    },
    "6. Administrative / Documentation": {
      options: [
        "a) Medical Record Request Fulfillment",
        "b) Insurance / Claim Support",
        "c) Referral Letter"
      ],
      templates: {
        "a) Medical Record Request Fulfillment": {
          subject: "Your Medical Records",
          body: `Dear [Patient Name],

As requested, attached are your [Medical Records / Test Reports / Discharge Summary]. Please keep them safe for your records.

Sincerely,
Dr. [Name]`
        },
        "b) Insurance / Claim Support": {
          subject: "Insurance Documentation for Treatment",
          body: `Dear [Patient Name],

Please find the attached documents required for your insurance/claim process. Contact our office if additional paperwork is needed.

Sincerely,
Dr. [Name]`
        },
        "c) Referral Letter": {
          subject: "Referral to Specialist – [Specialty]",
          body: `Dear [Patient Name],

I am referring you to Dr. [Specialist Name], a specialist in [Field], for further evaluation of your condition. Please carry your medical records.

Sincerely,
Dr. [Name]`
        }
      }
    },
    "7. Emergency / Urgent Notices": {
      options: [
        "a) Critical Results Notification",
        "b) Emergency Care Instructions",
        "c) Post-Emergency Follow-up"
      ],
      templates: {
        "a) Critical Results Notification": {
          subject: "Urgent – Critical Test Results",
          body: `Dear [Patient Name],

Your recent results show [Critical Finding]. Please seek emergency care immediately or visit the ER.

Sincerely,
Dr. [Name]`
        },
        "b) Emergency Care Instructions": {
          subject: "Emergency Health Advisory",
          body: `Dear [Patient Name],

Based on your symptoms ([Symptoms]), I strongly advise immediate emergency medical attention. Do not delay.

Sincerely,
Dr. [Name]`
        },
        "c) Post-Emergency Follow-up": {
          subject: "Follow-up After Emergency Visit",
          body: `Dear [Patient Name],

I was informed of your recent ER visit for [Condition]. Please schedule a follow-up with me to review your care and next steps.

Sincerely,
Dr. [Name]`
        }
      }
    },
    "8. Preventive & General Health Advice": {
      options: [
        "a) Preventive Care Recommendations",
        "b) Lifestyle & Wellness Guidance",
        "c) Chronic Condition Management Reminder"
      ],
      templates: {
        "a) Preventive Care Recommendations": {
          subject: "Preventive Health Reminders",
          body: `Dear [Patient Name],

It is time for your [Screening / Vaccination]. Preventive care is essential for long-term health. Please schedule an appointment soon.

Sincerely,
Dr. [Name]`
        },
        "b) Lifestyle & Wellness Guidance": {
          subject: "Healthy Living Recommendations",
          body: `Dear [Patient Name],

I recommend incorporating the following habits for better health:

• Balanced nutrition

• Regular exercise

• Adequate sleep

• Stress management

These will help prevent complications.

Sincerely,
Dr. [Name]`
        },
        "c) Chronic Condition Management Reminder": {
          subject: "Ongoing Care for [Chronic Condition]",
          body: `Dear [Patient Name],

As part of managing your [Condition], please ensure:

• Regular monitoring (e.g., BP, blood sugar)

• Adherence to medication

• Routine follow-up visits

This will help avoid future complications.

Sincerely,
Dr. [Name]`
        }
      }
    }
  };

  // Convert template to semantic HTML with proper formatting
  const templateToHtml = (template: { subject: string; body: string }) => {
    const paragraphs = template.body.split(/\n\n+/);
    const bodyHtml = paragraphs
      .map(para => `<p style="margin: 0 0 12px; line-height: 1.6; white-space: normal;">${para.replace(/\n/g, '<br>')}</p>`)
      .join('');

    return `<p style="margin: 0 0 12px; line-height: 1.6;"><strong>Subject:</strong> ${template.subject}</p>${bodyHtml}`;
  };

  // Handler functions for patient templates
  const handlePatientTemplateSelect = (category: string) => {
    setSelectedTemplateCategory(category);
    setSelectedCategoryData(patientTemplates[category as keyof typeof patientTemplates]);
    setShowPatientTemplateDialog(false);
    setShowCategoryOptionsDialog(true);
  };

  const handleTemplateOptionSelect = (option: string) => {
    const categoryData = selectedCategoryData;
    if (categoryData && categoryData.templates[option]) {
      const template = categoryData.templates[option];

      // Show preview dialog instead of directly loading
      setPreviewTemplate(template);
      setPreviewTemplateName(option);
      setShowCategoryOptionsDialog(false);
      setShowTemplatePreviewDialog(true);
    }
  };

  // Handler functions for doctor templates
  const handleDoctorTemplateSelect = (category: string) => {
    setSelectedDoctorTemplateCategory(category);
    setSelectedDoctorCategoryData(doctorTemplates[category as keyof typeof doctorTemplates]);
    setShowDoctorTemplateDialog(false);
    setShowDoctorCategoryOptionsDialog(true);
  };

  const handleDoctorTemplateOptionSelect = (option: string) => {
    const categoryData = selectedDoctorCategoryData;
    if (categoryData && categoryData.templates[option]) {
      const template = categoryData.templates[option];

      // Show preview dialog instead of directly loading
      setPreviewTemplate(template);
      setPreviewTemplateName(option);
      setShowDoctorCategoryOptionsDialog(false);
      setShowTemplatePreviewDialog(true);
    }
  };

  // Handler for loading template from preview
  // Helper functions to generate template content for each type
  const getPatientTemplateContent = (infoType: string) => {
    switch (infoType) {
      case "full-details":
        return `Patient Name: [Patient Name]
Date of Birth: [Date of Birth]
Patient ID: [Patient ID]
Address: [Patient Address]
Phone: [Patient Phone]
Email: [Patient Email]`;
      case "name-dob":
        return `Patient: [Patient Name] | DOB: [Date of Birth]`;
      case "contact-info":
        return `Patient Contact Information:
Name: [Patient Name]
Phone: [Patient Phone]
Email: [Patient Email]
Address: [Patient Address]`;
      case "demographics":
        return `Patient Demographics:
Name: [Patient Name]
Age: [Patient Age]
Gender: [Patient Gender]
Date of Birth: [Date of Birth]
Insurance: [Insurance Information]`;
      case "emergency-contact":
        return `Emergency Contact Information:
Contact Name: [Emergency Contact Name]
Relationship: [Emergency Contact Relationship]
Phone: [Emergency Contact Phone]
Address: [Emergency Contact Address]`;
      default:
        return "Patient Information Template";
    }
  };

  const getRecipientTemplateContent = (infoType: string) => {
    switch (infoType) {
      case "doctor-details":
        return `Doctor Information:
Name: [Doctor Name]
Specialty: [Doctor Specialty]
Address: [Doctor Address]
Phone: [Doctor Phone]
Email: [Doctor Email]`;
      case "specialist-referral":
        return `Specialist Referral:
To: [Specialist Name]
Department: [Department Name]
Specialty: [Specialty]
Reason for Referral: [Referral Reason]
Contact: [Specialist Contact]`;
      case "insurance-company":
        return `Insurance Company Information:
Company: [Insurance Company]
Policy Number: [Policy Number]
Group Number: [Group Number]
Member ID: [Member ID]
Contact: [Insurance Contact]`;
      case "patient-family":
        return `Patient Family Member:
Name: [Family Member Name]
Relationship: [Relationship to Patient]
Phone: [Family Member Phone]
Email: [Family Member Email]
Address: [Family Member Address]`;
      case "pharmacy":
        return `Pharmacy Information:
Name: [Pharmacy Name]
Address: [Pharmacy Address]
Phone: [Pharmacy Phone]
Fax: [Pharmacy Fax]
License: [Pharmacy License]`;
      default:
        return "Recipient Information Template";
    }
  };

  const getAppointmentTemplateContent = (infoType: string) => {
    switch (infoType) {
      case "appointment-details":
        return `Appointment Details:
Date: [Appointment Date]
Time: [Appointment Time]
Provider: [Provider Name]
Department: [Department]
Location: [Location]
Purpose: [Visit Purpose]`;
      case "next-appointment":
        return `Next Appointment:
Date: [Appointment Date]
Time: [Appointment Time]
Doctor: [Doctor Name]
Purpose: [Appointment Purpose]
Location: [Appointment Location]`;
      case "appointment-history":
        return `Appointment History:
Last Visit: [Last Visit Date]
Next Visit: [Next Visit Date]
Frequency: [Visit Frequency]
Notes: [Appointment Notes]`;
      case "follow-up":
        return `Follow-up Appointment:
Scheduled Date: [Follow-up Date]
Recommended Time: [Follow-up Time]
Reason: [Follow-up Reason]
Instructions: [Follow-up Instructions]`;
      case "appointment-reminder":
        return `Appointment Reminder:
Patient: [Patient Name]
Date: [Appointment Date]
Time: [Appointment Time]
Provider: [Provider Name]
Please arrive 15 minutes early for check-in.`;
      default:
        return "Appointment Information Template";
    }
  };

  const getLaboratoryTemplateContent = (infoType: string) => {
    switch (infoType) {
      case "lab-results":
        return `Laboratory Test Results:
Test Name: [Test Name]
Result: [Test Result]
Reference Range: [Reference Range]
Status: [Test Status]
Date Collected: [Collection Date]
Date Reported: [Report Date]`;
      case "blood-work":
        return `Blood Work Results:
Complete Blood Count: [CBC Results]
Glucose: [Glucose Level]
Cholesterol: [Cholesterol Level]
Hemoglobin: [Hemoglobin Level]
Additional Tests: [Other Results]`;
      case "urine-analysis":
        return `Urinalysis Results:
Color: [Urine Color]
Clarity: [Urine Clarity]
Protein: [Protein Level]
Glucose: [Glucose Level]
White Blood Cells: [WBC Count]
Red Blood Cells: [RBC Count]`;
      case "culture-results":
        return `Culture Results:
Specimen Type: [Specimen Type]
Organism Identified: [Organism Name]
Sensitivity: [Antibiotic Sensitivity]
Resistance: [Antibiotic Resistance]
Collection Date: [Collection Date]
Final Report Date: [Report Date]`;
      case "pending-labs":
        return `Pending Laboratory Tests:
Ordered Tests: [Test Names]
Order Date: [Order Date]
Priority: [Test Priority]
Expected Results: [Expected Date]
Special Instructions: [Lab Instructions]`;
      default:
        return "Laboratory Information Template";
    }
  };

  const getPatientRecordsTemplateContent = (infoType: string) => {
    switch (infoType) {
      case "medical-history":
        return `Complete Medical History:
Chief Complaint: [Chief Complaint]
Present Illness: [Present Illness]
Past Medical History: [Past Medical History]
Surgical History: [Surgical History]
Family History: [Family History]
Social History: [Social History]
Allergies: [Known Allergies]`;
      case "current-medications":
        return `Current Medications:
Medication 1: [Medication Name] - [Dosage] - [Frequency]
Medication 2: [Medication Name] - [Dosage] - [Frequency]
Medication 3: [Medication Name] - [Dosage] - [Frequency]
Additional Medications: [Other Medications]
Over-the-Counter: [OTC Medications]`;
      case "allergies":
        return `Allergies & Reactions:
Drug Allergies: [Drug Allergies]
Food Allergies: [Food Allergies]
Environmental Allergies: [Environmental Allergies]
Reaction Type: [Reaction Severity]
Previous Reactions: [Previous Reaction History]`;
      case "vital-signs":
        return `Latest Vital Signs:
Blood Pressure: [BP Reading]
Heart Rate: [Heart Rate]
Temperature: [Temperature]
Respiratory Rate: [Respiratory Rate]
Oxygen Saturation: [O2 Saturation]
Weight: [Patient Weight]
Height: [Patient Height]
Date Taken: [Vital Signs Date]`;
      case "diagnosis-history":
        return `Diagnosis History:
Primary Diagnosis: [Primary Diagnosis] - ICD-10: [ICD Code]
Secondary Diagnoses: [Secondary Diagnoses]
Past Diagnoses: [Previous Diagnoses]
Treatment History: [Treatment History]
Current Status: [Current Treatment Status]`;
      default:
        return "Patient Records Template";
    }
  };

  const getProductTemplateContent = (infoType: string) => {
    switch (infoType) {
      case "medication":
        return `Medication Information:
Product Name: [Medication Name]
Generic Name: [Generic Name]
Strength: [Medication Strength]
Form: [Dosage Form]
Manufacturer: [Manufacturer]
NDC Number: [NDC Number]
Pricing: [Unit Price]`;
      case "medical-device":
        return `Medical Device Information:
Device Name: [Device Name]
Model Number: [Model Number]
Manufacturer: [Manufacturer]
Category: [Device Category]
FDA Approval: [FDA Status]
Warranty: [Warranty Information]`;
      case "medical-supplies":
        return `Medical Supplies Information:
Product: [Supply Name]
Brand: [Brand Name]
Quantity: [Quantity]
Unit Pricing: [Unit Price]
Sterility: [Sterility Status]
Expiration: [Expiration Date]`;
      case "laboratory-test":
        return `Laboratory Test Information:
Test Name: [Test Name]
Test Code: [Test Code]
Test Type: [Test Type]
Processing Time: [Processing Time]
Pricing: [Test Price]
Special Requirements: [Special Requirements]`;
      case "treatment-package":
        return `Treatment Package Information:
Package Name: [Package Name]
Services: [Included Services]
Duration: [Treatment Duration]
Provider: [Healthcare Provider]
Pricing: [Package Price]
Coverage Details: [Insurance Coverage]`;
      default:
        return "Product Information Template";
    }
  };

  const handlePreviewOtherTemplate = (infoType: string, templateName: string, templateType: string) => {
    // Create template object based on type and infoType
    let template: any = { subject: templateName, body: "" };

    switch (templateType) {
      case "patient":
        template.body = getPatientTemplateContent(infoType);
        break;
      case "recipient":
        template.body = getRecipientTemplateContent(infoType);
        break;
      case "appointment":
        template.body = getAppointmentTemplateContent(infoType);
        break;
      case "laboratory":
        template.body = getLaboratoryTemplateContent(infoType);
        break;
      case "patient-records":
        template.body = getPatientRecordsTemplateContent(infoType);
        break;
      case "product":
        template.body = getProductTemplateContent(infoType);
        break;
      default:
        template.body = "Template content";
    }

    setPreviewOtherTemplate(template);
    setPreviewOtherTemplateName(templateName);
    setPreviewTemplateType(templateType);
    setShowOtherTemplatePreviewDialog(true);
  };

  const handleLoadTemplateFromPreview = () => {
    if (previewTemplate) {
      let finalHtml = '';

      // Add header section with logo and clinic header if selected
      if (addLogo || addClinicHeader) {
        const getClinicHeaderContent = () => {
          const textAlign = clinicHeaderPosition;
          switch (selectedClinicHeaderType) {
            case "full-header":
              return `
                <div style="text-align: ${textAlign};">
                  <h1 style="font-size: 24px; font-weight: bold; margin: 0; color: #2563eb;">Demo Healthcare Clinic</h1>
                  <p style="margin: 5px 0; color: #666;">123 Healthcare Street, Medical City, MC 12345</p>
                  <p style="margin: 5px 0; color: #666;">+44 20 1234 5678 • info@yourdlinic.com</p>
                  <p style="margin: 5px 0; color: #666;">www.yourdlinic.com</p>
                </div>
              `;
            case "letterhead":
              return `
                <div style="text-align: ${textAlign}; border-bottom: 2px solid #2563eb; padding-bottom: 10px;">
                  <h1 style="font-size: 28px; font-weight: bold; margin: 0; color: #2563eb;">Demo Healthcare Clinic</h1>
                  <p style="margin: 5px 0; color: #666; font-style: italic;">Excellence in Healthcare</p>
                </div>
              `;
            case "name-only":
              return `
                <div style="text-align: ${textAlign};">
                  <h1 style="font-size: 24px; font-weight: bold; margin: 0; color: #2563eb;">Demo Healthcare Clinic</h1>
                </div>
              `;
            case "contact-info":
              return `
                <div style="text-align: ${textAlign}; background-color: #f8fafc; padding: 10px; border-radius: 8px;">
                  <p style="margin: 2px 0; color: #666;"><strong>Phone:</strong> +44 20 1234 5678</p>
                  <p style="margin: 2px 0; color: #666;"><strong>Email:</strong> info@yourdlinic.com</p>
                  <p style="margin: 2px 0; color: #666;"><strong>Address:</strong> 123 Healthcare Street, Medical City, MC 12345</p>
                </div>
              `;
            default:
              return "";
          }
        };


        const getLogoContent = () => {
          switch (selectedLogoTemplate) {
            case "modern-clinic":
              return `
                <div style="width: 80px; height: 80px; background-color: #ddd6fe; border-radius: 8px; display: flex; align-items: center; justify-content: center;">
                  <span style="color: #7c3aed; font-weight: bold; font-size: 12px;">🏥</span>
                </div>
              `;
            case "professional":
              return `
                <div style="width: 80px; height: 80px; border: 2px solid #14b8a6; border-radius: 8px; display: flex; align-items: center; justify-content: center; background-color: white;">
                  <span style="color: #14b8a6; font-weight: bold; font-size: 10px;">MEDICAL</span>
                </div>
              `;
            case "minimal":
              return `
                <div style="width: 80px; height: 80px; background-color: #e5e7eb; border-radius: 8px; display: flex; align-items: center; justify-content: center;">
                  <span style="color: #6b7280; font-weight: bold; font-size: 8px;">PRACTICE</span>
                </div>
              `;
            case "medical-cross":
              return `
                <div style="width: 80px; height: 80px; background-color: #fecaca; border-radius: 8px; display: flex; align-items: center; justify-content: center;">
                  <span style="color: #dc2626; font-size: 20px;">✚</span>
                </div>
              `;
            case "health-plus":
              return `
                <div style="width: 80px; height: 80px; background-color: #dbeafe; border-radius: 8px; display: flex; align-items: center; justify-content: center;">
                  <span style="color: #2563eb; font-size: 24px;">⚕️</span>
                </div>
              `;
            case "custom":
              if (customLogoData) {
                return `
                  <div style="width: 80px; height: 80px; border-radius: 8px; display: flex; align-items: center; justify-content: center;">
                    <img src="${customLogoData}" alt="Custom Logo" style="max-width: 80px; max-height: 80px; object-fit: contain;" />
                  </div>
                `;
              }
              return `
                <div style="width: 80px; height: 80px; background-color: #fef3c7; border-radius: 8px; display: flex; align-items: center; justify-content: center;">
                  <span style="color: #d97706; font-size: 24px;">📁</span>
                </div>
              `;
            default:
              return `
                <div style="width: 80px; height: 80px; background-color: #2563eb; border-radius: 8px; display: flex; align-items: center; justify-content: center;">
                  <span style="color: white; font-weight: bold; font-size: 14px;">LOGO</span>
                </div>
              `;
          }
        };

        const logoContent = getLogoContent();

        if (logoPosition === "center" && addLogo && !addClinicHeader) {
          finalHtml += `<div style="text-align: center; margin-bottom: 20px;">${logoContent}</div>`;
        } else if (logoPosition === "center" && addClinicHeader && !addLogo) {
          finalHtml += `<div style="margin-bottom: 20px;">${getClinicHeaderContent()}</div>`;
        } else if (logoPosition === "center" && addLogo && addClinicHeader) {
          // Logo and clinic header in a row when center is selected
          finalHtml += `
            <div style="display: flex; justify-content: center; align-items: center; margin-bottom: 20px; gap: 20px;">
              <div>${logoContent}</div>
              <div>${getClinicHeaderContent()}</div>
            </div>
          `;
        } else {
          finalHtml += '<div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">';

          // Left side
          if (logoPosition === "left" && addLogo) {
            finalHtml += `<div style="text-align: left;">${logoContent}</div>`;
          } else {
            finalHtml += '<div style="flex: 1;"></div>';
          }

          // Center
          if (addClinicHeader) {
            finalHtml += `<div style="flex: 2;">${getClinicHeaderContent()}</div>`;
          } else if (logoPosition === "center" && addLogo) {
            finalHtml += `<div style="flex: 2; text-align: center;">${logoContent}</div>`;
          } else {
            finalHtml += '<div style="flex: 2;"></div>';
          }

          // Right side
          if (logoPosition === "right" && addLogo) {
            finalHtml += `<div style="text-align: right;">${logoContent}</div>`;
          } else {
            finalHtml += '<div style="flex: 1;"></div>';
          }

          finalHtml += '</div>';
        }

        finalHtml += '<hr style="margin: 20px 0; border: 1px solid #e5e7eb;">';
      }

      // Add the main template content
      const templateHtml = templateToHtml(previewTemplate);
      finalHtml += templateHtml;

      // Add footer if selected
      if (addFooter) {
        finalHtml += `
          <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center; font-size: 12px; color: #666;">
            <p style="margin: 2px 0;"><strong>Demo Healthcare Clinic</strong></p>
            <p style="margin: 2px 0;">123 Healthcare Street, Medical City, MC 12345</p>
            <p style="margin: 2px 0;">Phone: +44 20 1234 5678 | Email: info@yourdlinic.com</p>
            <p style="margin: 2px 0;">www.yourdlinic.com</p>
          </div>
        `;
      }

      // Load template into editor with proper HTML formatting
      if (textareaRef) {
        textareaRef.innerHTML = finalHtml;
        setDocumentContent(finalHtml);
      }

      setShowTemplatePreviewDialog(false);
      setAddLogo(false);
      setAddClinicHeader(false);
      setSelectedClinicHeaderType("");
      setLogoPosition("right");
      setAddFooter(false);
      setClinicHeaderPosition("center");
      setSelectedLogoTemplate("");

      setSuccessMessage(`${previewTemplateName} template has been loaded into the editor.`);
      setShowSuccessModal(true);
    }
  };

  const tenantSubdomainForApi = localStorage.getItem("user_subdomain") || "";
  const authToken = localStorage.getItem("auth_token");
  const subdomainHeaders = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${authToken}`,
    "X-Tenant-Subdomain": tenantSubdomainForApi,
  };

  // Fetch doctors from database
  const { data: users = [], isLoading: usersLoading } = useQuery<User[]>({
    queryKey: ["/api/users"],
    queryFn: async () => {
      const response = await fetch("/api/users", {
        headers: subdomainHeaders,
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json();
    },
    enabled: true,
  });
  const creatorsById = useMemo(() => {
    const map = new Map<number, { name: string; email?: string }>();
    users.forEach((user) => {
      map.set(user.id, {
        name: `${user.firstName} ${user.lastName}`.trim() || user.email || "Unknown user",
        email: user.email,
      });
    });
    return map;
  }, [users]);
  const userIsDoctor = Boolean(user && isDoctorLike(user.role));
  const currentUserId = user?.id;
  const resolveFormCreatorId = (form: FormSummary) => {
    const id =
      form.createdBy ??
      form.metadata?.createdBy ??
      form.metadata?.created_by ??
      form.metadata?.userId ??
      null;
    const numeric = Number(id);
    return Number.isNaN(numeric) ? null : numeric;
  };

  // Fetch patients from patients table
  const { data: patientsFromTable = [], isLoading: patientsLoading } = useQuery<Patient[]>({
    queryKey: ["/api/patients"],
    queryFn: async () => {
      const response = await fetch("/api/patients", {
        headers: subdomainHeaders,
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json();
    },
  });
  const currentPatientRecord = useMemo(
    () => patientsFromTable.find((patient) => patient.userId === user?.id),
    [patientsFromTable, user?.id],
  );
  const currentPatientId = currentPatientRecord?.id ?? null;

  const { data: savedForms = [], isLoading: formsLoading } = useQuery<FormSummary[]>({
    queryKey: ["/api/forms"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/forms");
      if (!response.ok) {
        const error = await response.json().catch(() => null);
        throw new Error(error?.error || "Failed to load forms");
      }
      return response.json();
    },
  });

  // Fetch shares for all forms to determine if they've been shared
  const { data: formSharesMap = {} } = useQuery<Record<number, any[]>>({
    queryKey: ["formSharesMap", savedForms.map(f => f.id).join(",")],
    queryFn: async () => {
      const sharesMap: Record<number, any[]> = {};
      await Promise.all(
        savedForms.map(async (form) => {
          try {
            const response = await apiRequest("GET", `/api/forms/${form.id}/shares`);
            if (response.ok) {
              const shares = await response.json();
              sharesMap[form.id] = shares || [];
            }
          } catch (error) {
            console.error(`Error fetching shares for form ${form.id}:`, error);
            sharesMap[form.id] = [];
          }
        })
      );
      return sharesMap;
    },
    enabled: savedForms.length > 0,
  });
  const savedFormsToDisplay = useMemo(() => {
    if (!userIsDoctor || !currentUserId) return savedForms;
    return savedForms.filter((form) => resolveFormCreatorId(form) === currentUserId);
  }, [savedForms, userIsDoctor, currentUserId]);

  const closeFormShareDialog = () => {
    setShowFormShareDialog(false);
    setSelectedFormForShare(null);
    setShareRecipientInput("");
    setFormSharedSuccessfully(false);
  };

  const openFormShareDialog = (form: FormSummary) => {
    setSelectedFormForShare(form);
    setShareRecipientInput("");
    setShowFormShareDialog(true);
  };

  const { data: shareRecipientEmails = [], isLoading: shareRecipientEmailsLoading } = useQuery<
    Array<{ patientId: number; email: string }>
  >({
    queryKey: ["/api/patients/share-recipient-emails"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/patients/share-recipient-emails");
      if (!response.ok) {
        const error = await response.json().catch(() => null);
        throw new Error(error?.error || "Failed to load patient emails");
      }
      return response.json();
    },
    enabled: showFormShareDialog,
    staleTime: 60_000,
  });

  const SHARE_EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;

  const filteredShareRecipientEmails = useMemo(() => {
    const q = shareRecipientInput.trim().toLowerCase();
    if (!q) return shareRecipientEmails;
    return shareRecipientEmails.filter((row) => row.email.toLowerCase().includes(q));
  }, [shareRecipientEmails, shareRecipientInput]);

  const buildFormShareRequestBody = (): { recipientEmail: string } | null => {
    const email = shareRecipientInput.trim();
    if (!SHARE_EMAIL_RE.test(email)) {
      return null;
    }
    return { recipientEmail: email };
  };

  const canSendFormShare = SHARE_EMAIL_RE.test(shareRecipientInput.trim());

  const shareRecipientPreviewLabel = useMemo(() => {
    const email = shareRecipientInput.trim();
    return SHARE_EMAIL_RE.test(email) ? email : "the recipient";
  }, [shareRecipientInput]);

  const loadFormIntoBuilder = (form: FormSummary) => {
    const normalizedSections: SectionInput[] = form.sections.length
      ? form.sections.map((section) => ({
        id: `section_${form.id}_${section.id}`,
        title: section.title || `Section ${section.order + 1}`,
        fields: section.fields.map((field) => ({
          id: `field_${section.id}_${field.id}`,
          label: field.label || `Field ${field.id}`,
          type: field.fieldType as FieldType,
          required: field.required,
          placeholder: field.placeholder ?? "",
          options: field.fieldOptions ?? [],
        })),
      }))
      : [{ id: `section_${form.id}_0`, title: "Section 1", fields: [] }];

    setFormLoadPayload({
      key: Date.now(),
      title: form.title,
      description: form.description ?? "",
      sections: normalizedSections,
    });

    toast({
      title: "Form loaded",
      description: `“${form.title}” is now editable in the builder.`,
    });
    setActiveFormsTab("dynamic");
  };

  const loadTemplateIntoBuilder = (template: FormTemplate) => {
    const payload = cloneTemplateAsPayload(template);
    setFormLoadPayload(payload);
    setTemplatePreview(null);
    toast({
      title: "Template loaded",
      description: `"${template.title}" is now in the builder. Edit and save as a new Custom Form—the original template is unchanged.`,
    });
    setActiveFormsTab("dynamic");
  };

  const handleViewFormResponses = async (form: FormSummary) => {
    setSelectedFormForResponses(form);
    setFormResponsesData(null);
    setResponseDialogOpen(true);
    setFormResponsesLoading(true);
    try {
      const response = await apiRequest("GET", `/api/forms/${form.id}/responses`);
      const rawText = await response.text();
      if (!rawText) {
        throw new Error("Received empty response from server");
      }
      const trimmed = rawText.trim();
      if (trimmed.startsWith("<!DOCTYPE") || trimmed.startsWith("<html")) {
        toast({
          title: "Unable to load responses",
          description:
            "Server returned HTML instead of JSON. Please ensure the API is reachable and the form exists.",
          variant: "destructive",
        });
        setResponseDialogOpen(false);
        return;
      }
      let parsed: FormResponsesPayload;
      try {
        parsed = JSON.parse(rawText);
      } catch (parseError) {
        throw new Error(`Failed to parse responses: ${rawText.slice(0, 200)}`);
      }
      setFormResponsesData(parsed);
    } catch (error) {
      toast({
        title: "Unable to load responses",
        description: error instanceof Error ? error.message : "Check the console for details",
        variant: "destructive",
      });
      setResponseDialogOpen(false);
    } finally {
      setFormResponsesLoading(false);
    }
  };

  const [isExportingResponses, setIsExportingResponses] = useState(false);

  const downloadResponsesExcel = () => {
    if (!formResponsesData || isExportingResponses) return;

    setIsExportingResponses(true);
    try {
      const headers = [
        "Patient Name",
        "Email",
        "Phone",
        "NHS Number",
        "Submitted at",
        ...formResponsesData.fields.map((field) => field.label),
      ];

      const rows = formResponsesData.responses.map((response) => {
        const name = response.patient
          ? `${response.patient.firstName ?? ""} ${response.patient.lastName ?? ""}`.trim()
          : "Unknown patient";
        const submitted = response.submittedAt
          ? new Date(response.submittedAt).toLocaleString()
          : "—";
        const answerMap = new Map(response.answers.map((answer) => [answer.fieldId, answer.value]));
        const fieldValues = formResponsesData.fields.map((field) => answerMap.get(field.id) ?? "—");

        return buildFormResponseExportRows(
          [
            name,
            response.patient?.email ?? "",
            response.patient?.phone ?? "",
            response.patient?.nhsNumber ?? "",
            submitted,
          ],
          fieldValues,
        );
      });

      const html = buildExcelHtmlTable(
        formResponsesData.formTitle || "Form Responses",
        headers,
        rows,
      );
      downloadExcelHtml(`${formResponsesData.formTitle || "form"}-responses`, html);
    } finally {
      setIsExportingResponses(false);
    }
  };

  const shareFormMutation = useMutation({
    mutationFn: async () => {
      if (!selectedFormForShare) {
        throw new Error("Select a form first");
      }
      const shareBody = buildFormShareRequestBody();
      if (!shareBody) {
        throw new Error("Enter a valid email address to send the form");
      }

      return postFormShareApi(selectedFormForShare.id, shareBody);
    },
    onSuccess(data) {
      const link = typeof data.link === "string" ? data.link : "";
      setEmailPreview({
        subject: String(data.emailPreview?.subject ?? ""),
        html: String(data.emailPreview?.html ?? ""),
        text: String(data.emailPreview?.text ?? ""),
        link,
      });
      setLatestLinks((prev) => ({
        ...prev,
        [selectedFormForShare?.id ?? 0]: link,
      }));
      queryClient.invalidateQueries({ queryKey: ["/api/forms"] });
      setFormSharedSuccessfully(true);
      const emailSent = Boolean(data.emailSent);
      toast({
        title: emailSent ? "Form sent" : "Link created — email not sent",
        description: emailSent
          ? `The secure form link was emailed to ${shareRecipientInput.trim()}.`
          : `Copy the patient form link below and send it manually${data.emailError ? `: ${stripHtmlFromUserMessage(String(data.emailError))}` : ""}.`,
        variant: emailSent ? undefined : "destructive",
      });
      if (emailSent) {
        closeFormShareDialog();
      }
    },
    onError(error) {
      const errorMessage = stripHtmlFromUserMessage(
        error instanceof Error && error.message.trim()
          ? error.message.trim()
          : "Unable to share the form. Please try again.",
      );
      setShareFormErrorMessage(errorMessage);
      setShowShareFormErrorModal(true);
    },
  });

  const previewEmailMutation = useMutation({
    mutationFn: async () => {
      if (!selectedFormForShare) {
        throw new Error("Select a form first");
      }
      const shareBody = buildFormShareRequestBody();
      if (!shareBody) {
        throw new Error("Enter a valid email address to preview the email");
      }

      return postFormSharePreviewApi(selectedFormForShare.id, shareBody);
    },
    onSuccess(data) {
      setEmailPreview({
        subject: data.subject,
        html: data.html,
        text: data.text,
        link: data.link,
      });
      setPreviewDialogOpen(true);
    },
    onError(error) {
      toast({
        title: "Preview failed",
        description: error instanceof Error ? error.message : "Unable to preview email",
        variant: "destructive",
      });
    },
  });

  const deleteFormMutation = useMutation({
    mutationFn: async (formId: number) => {
      const response = await apiRequest("DELETE", `/api/forms/${formId}`);
      if (!response.ok) {
        const error = await response.json().catch(() => null);
        throw new Error(error?.error || "Failed to delete form");
      }
      return formId;
    },
    onSuccess(formId) {
      toast({
        title: "Form deleted",
        description: "The form has been removed from your workspace.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/forms"] });
    },
    onError(error) {
      toast({
        title: "Delete failed",
        description: error instanceof Error ? error.message : "Unable to delete the form",
        variant: "destructive",
      });
    },
  });

  const deleteFilledFormMutation = useMutation({
    mutationFn: async (doc: any) => {
      const response = await apiRequest("DELETE", `/api/documents/${doc.id}`);
      if (!response.ok) {
        const error = await response.json().catch(() => null);
        throw new Error(error?.error || "Failed to delete filled form PDF");
      }
      return doc;
    },
    onSuccess(doc) {
      toast({
        title: "PDF deleted",
        description: `Removed ${doc.name || "filled form"} from records.`,
      });
      queryClient.invalidateQueries({ queryKey: ["filledForms"] });
    },
    onError(error) {
      toast({
        title: "Delete failed",
        description: error instanceof Error ? error.message : "Unable to delete the filled form PDF",
        variant: "destructive",
      });
    },
  });

  const confirmDeleteForm = () => {
    if (!formToDelete) return;
    deleteFormMutation.mutate(formToDelete.id);
    setShowDeleteFormDialog(false);
    setFormToDelete(null);
  };

  const confirmDeleteFilledForm = () => {
    if (!filledFormToDelete) return;
    deleteFilledFormMutation.mutate(filledFormToDelete);
    setShowDeleteFilledFormDialog(false);
    setFilledFormToDelete(null);
  };

  // Filter users to get only doctors and patients
  const doctors = users.filter((user) => isDoctorLike(user.role) && user.isActive);
  const patients = users.filter((user) => user.role === 'patient' && user.isActive);
  /** Plaintext patient email, linked user inbox from API (`linkedUserEmail`), or empty when still unknown. */
  const getPatientShareEmailHint = (p: (typeof patientsFromTable)[number] | undefined): string => {
    if (!p) return "";
    const e = typeof p.email === "string" ? p.email.trim() : "";
    if (e.includes("@") && !e.startsWith("{")) return e;
    const linked = (p as { linkedUserEmail?: string }).linkedUserEmail?.trim();
    if (linked && linked.includes("@")) return linked;
    return "";
  };

  const {
    data: shareLinks = [],
    refetch: refetchShareLinks,
    isFetching: shareLinksLoading,
  } = useQuery({
    queryKey: ["formShareLinks", currentLinkForm?.id],
    queryFn: async () => {
      if (!currentLinkForm) return [];
      const response = await apiRequest("GET", `/api/forms/${currentLinkForm.id}/shares`);
      if (!response.ok) {
        const error = await response.json().catch(() => null);
        throw new Error(error?.error || "Failed to fetch share links");
      }
      return response.json();
    },
    enabled: !!currentLinkForm && showShareLinksDialog,
  });
  const [resendingLogId, setResendingLogId] = useState<number | null>(null);

  const {
    data: filledForms = [],
    isFetching: filledFormsLoading,
  } = useQuery({
    queryKey: ["filledForms"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/documents");
      const documents = await response.json();
      return documents.filter((doc: any) => doc.type === "medical_form");
    },
  });
  const [filterFormName, setFilterFormName] = useState("");
  const [filterPatientEmail, setFilterPatientEmail] = useState("");
  const [filterPatientId, setFilterPatientId] = useState("");
  const [filterDate, setFilterDate] = useState("");
  const [filterFormId, setFilterFormId] = useState("");
  const [showPatientEmailDropdown, setShowPatientEmailDropdown] = useState(false);
  const [showPatientIdDropdown, setShowPatientIdDropdown] = useState(false);
  const [activeFilledDropdown, setActiveFilledDropdown] = useState<"formName" | "formId" | null>(null);

  const formNames = useMemo(
    () => Array.from(new Set(filledForms.map((doc: any) => doc.name || "").filter(Boolean))),
    [filledForms],
  );
  const patientEmailsFromTable = useMemo(
    () =>
      Array.from(
        new Set(
          patientsFromTable
            .map((patient: any) => patient.email || "")
            .filter((value: string) => value),
        ),
      ),
    [patientsFromTable],
  );
  const patientIdsFromTable = useMemo(
    () =>
      Array.from(
        new Set(
          patientsFromTable
            .map((patient: any) => String(patient.id))
            .filter((value) => value),
        ),
      ),
    [patientsFromTable],
  );
  const formIds = useMemo(
    () =>
      Array.from(
        new Set(
          filledForms
            .map((doc: any) => doc.metadata?.formId)
            .filter((value) => value !== undefined && value !== null)
            .map((value) => String(value)),
        ),
      ),
    [filledForms],
  );
  const closeCommandMenu = () => {
    setTimeout(() => {
      const active = document.activeElement as HTMLElement | null;
      active?.blur();
    }, 0);
  };
  const closeAllFilledDropdowns = () => {
    setActiveFilledDropdown(null);
  };

  const openDropdown = (type: "formName" | "patientEmail" | "patientId" | "formId") => {
    closeAllFilledDropdowns();
    if (type === "formName") {
      setActiveFilledDropdown("formName");
      setFilterFormId("");
    } else if (type === "formId") {
      setActiveFilledDropdown("formId");
      setFilterFormName("");
    } else {
      if (type === "patientEmail") setShowPatientEmailDropdown(true);
      if (type === "patientId") setShowPatientIdDropdown(true);
    }
  };
  const closeDropdown = (type: "formName" | "patientEmail" | "patientId" | "formId") => {
    setTimeout(() => {
      if (type === "formName" || type === "formId") {
        if (activeFilledDropdown === type) {
          setActiveFilledDropdown(null);
        }
      }
      if (type === "patientEmail") setShowPatientEmailDropdown(false);
      if (type === "patientId") setShowPatientIdDropdown(false);
    }, 150);
  };
  const resetFilters = () => {
    setFilterFormName("");
    setFilterPatientEmail("");
    setFilterPatientId("");
    setFilterDate("");
    setFilterFormId("");
  };
  const handleCommandFocus = (key: string) => setActiveCommand(key);
  const handleCommandBlur = (key: string) => {
    setTimeout(() => {
      setActiveCommand((current) => (current === key ? null : current));
    }, 150);
  };

  const resolveFormCreator = (doc: any) => {
    const creatorId =
      doc.userId ??
      doc.createdBy ??
      doc.metadata?.createdBy ??
      doc.metadata?.created_by ??
      doc.metadata?.userId;
    if (!creatorId) return null;
    const normalizedId = Number(creatorId);
    if (Number.isNaN(normalizedId)) return null;
    const creator = creatorsById.get(normalizedId);
    return creator ?? { name: `User #${normalizedId}` };
  };

  const filteredFilledForms = useMemo(() => {
    return filledForms.filter((doc: any) => {
      const name = String(doc.name || "").toLowerCase();
      const metadata = doc.metadata || {};
      const patientEmail = String(metadata.patientEmail || "").toLowerCase();
      const patientId = metadata.patientId ? String(metadata.patientId) : "";
      const formId = metadata.formId ? String(metadata.formId) : "";
      const createdAt = doc.createdAt ? new Date(doc.createdAt).toISOString().split("T")[0] : "";

      const matchesName = filterFormName
        ? name.includes(filterFormName.trim().toLowerCase())
        : true;
      const matchesEmail = filterPatientEmail
        ? patientEmail.includes(filterPatientEmail.trim().toLowerCase())
        : true;
      const matchesPatientId = filterPatientId
        ? patientId === filterPatientId.trim()
        : true;
      const matchesDate = filterDate ? createdAt === filterDate : true;
      const matchesFormId = filterFormId ? formId === filterFormId : true;

      if (userIsDoctor && currentUserId) {
        const docCreatorIdRaw =
          doc.createdBy ??
          doc.metadata?.createdBy ??
          doc.metadata?.created_by ??
          doc.metadata?.userId ??
          doc.userId ??
          null;
        const docCreatorId = Number(docCreatorIdRaw);
        if (Number.isNaN(docCreatorId) || docCreatorId !== currentUserId) {
          return false;
        }
      }

      if (userIsPatient && currentPatientId) {
        const metadataPatientId =
          doc.metadata?.patientId ??
          doc.metadata?.patient?.id ??
          doc.patientId ??
          null;
        const numericId = metadataPatientId ? Number(metadataPatientId) : null;
        if (numericId !== currentPatientId) {
          return false;
        }
      }
      return matchesName && matchesEmail && matchesPatientId && matchesDate && matchesFormId;
    });
  }, [filledForms, filterFormName, filterPatientEmail, filterPatientId, filterDate, filterFormId]);

  const openDeleteFilledFormDialog = (doc: any) => {
    setFilledFormToDelete(doc);
    setShowDeleteFilledFormDialog(true);
  };

  /** Build PDF URL from document metadata. Uses API base URL so in dev/proxy the request hits the server that serves /uploads. */
  const getFilledFormPdfUrl = (doc: any): string | null => {
    const raw = doc.metadata?.pdfPath;
    if (!raw || typeof raw !== "string") return null;
    const path = raw.replace(/\\/g, "/").replace(/^\/+/, "");
    const slug = path.startsWith("uploads") ? path : `uploads/${path}`;
    return buildUrl(`/${slug}`);
  };

  /** Check if the filled form PDF exists on the server: HEAD request to the PDF URL (same origin as API). */
  const checkFilledFormFileExists = async (doc: any): Promise<boolean> => {
    const url = getFilledFormPdfUrl(doc);
    if (!url) return false;
    try {
      const token = localStorage.getItem("auth_token");
      const headers: Record<string, string> = { "X-Tenant-Subdomain": getTenantSubdomain() };
      if (token) headers["Authorization"] = `Bearer ${token}`;
      const response = await fetch(url, { method: "HEAD", credentials: "include", headers });
      return response.ok;
    } catch {
      return false;
    }
  };

  const loadFilledForm = async (doc: any) => {
    const link = getFilledFormPdfUrl(doc);
    if (!link) {
      setShowFilledFormFileMissingDialog(true);
      return;
    }
    const exists = await checkFilledFormFileExists(doc);
    if (!exists) {
      setShowFilledFormFileMissingDialog(true);
      return;
    }
    window.open(link, "_blank");
  };

  const downloadFilledForm = async (doc: any) => {
    const link = getFilledFormPdfUrl(doc);
    if (!link) {
      setShowFilledFormFileMissingDialog(true);
      return;
    }
    const exists = await checkFilledFormFileExists(doc);
    if (!exists) {
      setShowFilledFormFileMissingDialog(true);
      return;
    }
    const anchor = document.createElement("a");
    anchor.href = link;
    anchor.download = doc.name || `form-${doc.id}.pdf`;
    anchor.target = "_blank";
    anchor.click();
  };

  const handleDeleteFilledFormClick = async (doc: any) => {
    const link = getFilledFormPdfUrl(doc);
    if (!link) {
      setShowFilledFormFileMissingDialog(true);
      return;
    }
    const exists = await checkFilledFormFileExists(doc);
    if (!exists) {
      setShowFilledFormFileMissingDialog(true);
      return;
    }
    openDeleteFilledFormDialog(doc);
  };

  const filledFormCardContent = (doc: any) => {
    const link = doc.metadata?.pdfPath ? `/${doc.metadata.pdfPath}` : null;
    const creatorInfo = resolveFormCreator(doc);
    return (
      <>
        <div className="space-y-1">
          <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">
            {doc.name || "Form response"}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Patient: {doc.metadata?.patientName || "Unknown patient"}
          </p>
          {(doc.metadata?.patientEmail || doc.patientEmail || doc.metadata?.patient?.email) && (
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Email: {doc.metadata?.patientEmail || doc.patientEmail || doc.metadata?.patient?.email}
            </p>
          )}
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Form ID: {doc.metadata?.formId ?? "—"} • Response #{doc.metadata?.responseId ?? "—"}
          </p>
          <p className="text-[11px] text-muted-foreground">
            Created {new Date(doc.createdAt).toLocaleString()}
          </p>
          {creatorInfo && (
            <p className="text-[11px] text-muted-foreground">
              Created by {creatorInfo.name}
              {creatorInfo.email ? ` (${creatorInfo.email})` : ""}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 min-w-0">
          <Button size="sm" variant="outline" onClick={() => loadFilledForm(doc)} className="flex-shrink-0">
            View Form
          </Button>
          {doc.metadata?.headerName && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span 
                    className="text-[10px] text-muted-foreground truncate min-w-0 max-w-[200px] sm:max-w-[300px] cursor-default"
                  >
              Clinic: {doc.metadata.headerName}
            </span>
                </TooltipTrigger>
                <TooltipContent className="text-[10px]">
                  <p>Clinic: {doc.metadata.headerName}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
          <Button
            size="sm"
            variant="ghost"
            onClick={() => handleDeleteFilledFormClick(doc)}
            className="text-rose-500 hover:bg-rose-50/70 dark:text-rose-400 dark:hover:bg-rose-500/10 flex-shrink-0"
            title="Delete PDF"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </>
    );
  };

  const resendShareEmailMutation = useMutation({
    mutationFn: async (logId: number) => {
      const response = await apiRequest("POST", `/api/forms/share-logs/${logId}/resend`);
      if (!response.ok) {
        const error = await response.json().catch(() => null);
        throw new Error(error?.error || "Failed to resend share link");
      }
      return response.json();
    },
    onSuccess() {
      toast({
        title: "Email resent",
        description: "Another copy of the secure link was sent to the patient.",
      });
      refetchShareLinks();
    },
    onError(error) {
      toast({
        title: "Resend failed",
        description: error instanceof Error ? error.message : "Failed to resend link",
        variant: "destructive",
      });
    },
  });

  const handleResendShareLink = (logId: number) => {
    setResendingLogId(logId);
    resendShareEmailMutation.mutate(logId, {
      onSettled() {
        setResendingLogId((current) => (current === logId ? null : current));
      },
    });
  };

  useEffect(() => {
    if (showShareLinksDialog && currentLinkForm) {
      refetchShareLinks();
    }
  }, [showShareLinksDialog, currentLinkForm, refetchShareLinks]);
  const [editingClinicInfo, setEditingClinicInfo] = useState({
    name: "",
    address: "",
    phone: "",
    email: "",
    website: "",
  });
  const [clinicInfo, setClinicInfo] = useState({
    name: "",
    address: "",
    phone: "",
    email: "",
    website: "",
  });
  const { toast } = useToast();

  // Fetch organization data (for fallback)
  const { data: organization } = useQuery({
    queryKey: ["/api/tenant/info"],
    queryFn: async () => {
      const response = await fetch("/api/tenant/info", {
        headers: { "Content-Type": "application/json" },
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json();
    },
  });

  // Fetch user document preferences
  const { data: userPreferences, refetch: refetchPreferences } = useQuery({
    queryKey: ["/api/me/preferences"],
    queryFn: async () => {
      const response = await fetch("/api/me/preferences", {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
          "X-Tenant-Subdomain": tenantSubdomainForApi,
        },
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json();
    },
  });

  // Fetch saved templates
  const { data: templates = [] } = useQuery({
    queryKey: ["/api/documents/templates"],
    queryFn: async () => {
      const response = await fetch("/api/documents?templates=true", {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("auth_token")}`,
          "X-Tenant-Subdomain": localStorage.getItem("user_subdomain") || "",
        },
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json();
    },
  });

  // Fetch letter drafts
  const { data: drafts = [], refetch: refetchDrafts } = useQuery({
    queryKey: ["/api/letter-drafts"],
    queryFn: async () => {
      const response = await fetch("/api/letter-drafts", {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("auth_token")}`,
          "X-Tenant-Subdomain": localStorage.getItem("user_subdomain") || "",
        },
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json();
    },
  });

  // Update clinic info when user preferences or organization data loads
  useEffect(() => {
    if (userPreferences) {
      // Use user preferences first
      setClinicInfo({
        name: userPreferences.clinicName || "Your Clinic",
        address: userPreferences.clinicAddress || "123 Healthcare Street, Medical City, MC 12345",
        phone: userPreferences.clinicPhone || "+44 20 1234 5678",
        email: userPreferences.clinicEmail || "info@yourclinic.com",
        website: userPreferences.clinicWebsite || "www.yourclinic.com",
      });
      setEditingClinicInfo({
        name: userPreferences.clinicName || "",
        address: userPreferences.clinicAddress || "",
        phone: userPreferences.clinicPhone || "",
        email: userPreferences.clinicEmail || "",
        website: userPreferences.clinicWebsite || "",
      });
    } else if (organization) {
      // Fallback to organization data if no user preferences
      setClinicInfo({
        name: organization.name || "Your Clinic",
        address: organization.address || "123 Healthcare Street, Medical City, MC 12345",
        phone: organization.phone || "+44 20 1234 5678",
        email: organization.email || "info@yourclinic.com",
        website: organization.website || "www.yourclinic.com",
      });
      setEditingClinicInfo({
        name: organization.name || "",
        address: organization.address || "",
        phone: organization.phone || "",
        email: organization.email || "",
        website: organization.website || "",
      });
    }
  }, [userPreferences, organization]);

  // NUCLEAR OPTION: Force bluewave color on all toolbar buttons with data-bluewave attribute
  useEffect(() => {
    const timer = setTimeout(() => {
      const buttons = document.querySelectorAll('[data-bluewave="true"]');
      buttons.forEach((button: any) => {
        button.style.setProperty("background-color", "white", "important");
        button.style.setProperty("border-color", "#e5e7eb", "important");
        button.style.setProperty("color", "black", "important");
        button.style.setProperty("border-width", "1px", "important");
        button.style.setProperty("border-style", "solid", "important");
        // Remove any conflicting classes
        button.className = button.className
          .replace(/bg-\w+/g, "")
          .replace(/border-\w+/g, "")
          .replace(/text-\w+/g, "");
      });
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  const handleSaveClinicInfo = async () => {
    try {
      const response = await fetch("/api/me/preferences", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
          "X-Tenant-Subdomain": tenantSubdomainForApi,
        },
        body: JSON.stringify({
          clinicName: editingClinicInfo.name,
          clinicAddress: editingClinicInfo.address,
          clinicPhone: editingClinicInfo.phone,
          clinicEmail: editingClinicInfo.email,
          clinicWebsite: editingClinicInfo.website,
        }),
      });

      if (response.ok) {
        // Update the clinic info state with the new values
        setClinicInfo({
          name: editingClinicInfo.name,
          address: editingClinicInfo.address,
          phone: editingClinicInfo.phone,
          email: editingClinicInfo.email,
          website: editingClinicInfo.website,
        });

        // Refetch user preferences to stay in sync
        refetchPreferences();

        setSuccessMessage("Your clinic information has been saved successfully.");
        setShowSuccessModal(true);
        setShowEditClinic(false);
        setShowEditClinicDialog(false);
      } else {
        throw new Error("Failed to update clinic information");
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update clinic information. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handlePreview = () => {
    if (
      !documentContent ||
      documentContent.trim() === "" ||
      documentContent.replace(/<[^>]*>/g, "").trim() === ""
    ) {
      setShowEmptyContentDialog(true);
      return;
    }

    setShowDocumentPreviewDialog(true);
  };

  const handleSaveAsDraft = () => {
    refetchDrafts(); // Refresh drafts list
    setShowDraftsDialog(true); // Open drafts dialog to show all saved drafts
  };

  const handleBold = () => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) {
      toast({
        title: "Select Text",
        description: "Please select text to apply bold formatting",
        duration: 3000,
      });
      return;
    }

    const range = selection.getRangeAt(0);
    const selectedText = range.toString();

    if (!selectedText) {
      toast({
        title: "Select Text",
        description: "Please select text to apply bold formatting",
        duration: 3000,
      });
      return;
    }

    try {
      document.execCommand('bold', false);

      if (textareaRef) {
        setDocumentContent(textareaRef.innerHTML);
        textareaRef.focus();
      }
    } catch (error) {
      console.error("Error in handleBold:", error);
      toast({
        title: "Error",
        description: "Failed to apply bold formatting",
        duration: 3000,
      });
    }
  };

  const handleItalic = () => {
    console.log("🎯 handleItalic called!");

    const selection = window.getSelection();
    console.log("Selection object:", selection);

    if (!selection || selection.rangeCount === 0) {
      console.log("❌ No selection found");
      toast({
        title: "Select Text",
        description: "Please select text to apply italic formatting",
        duration: 3000,
      });
      return;
    }

    const range = selection.getRangeAt(0);
    const selectedText = range.toString();

    console.log("Selected text for italic:", selectedText);

    if (!selectedText) {
      console.log("❌ Empty selected text");
      toast({
        title: "Select Text",
        description: "Please select text to apply italic formatting",
        duration: 3000,
      });
      return;
    }

    try {
      // Create a span with italic styling
      const span = document.createElement("span");
      span.style.fontStyle = "italic";
      span.textContent = selectedText;

      console.log("Created italic span:", span);

      // Replace the selected content with the new span
      range.deleteContents();
      range.insertNode(span);

      console.log("Inserted italic span successfully");

      // Update the document content state
      if (textareaRef) {
        const updatedContent = textareaRef.innerHTML;
        setDocumentContent(updatedContent);
        console.log("Updated content after italic:", updatedContent);
      }

      // Keep the text selected - select the newly created span
      const newRange = document.createRange();
      newRange.selectNodeContents(span);
      selection.removeAllRanges();
      selection.addRange(newRange);

      if (textareaRef) {
        textareaRef.focus();
      }
    } catch (error) {
      console.error("Error in handleItalic:", error);
      toast({
        title: "Error",
        description: "Failed to apply italic formatting",
        duration: 3000,
      });
    }
  };

  const handleUnderline = () => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) {
      toast({
        title: "Select Text",
        description: "Please select text to apply underline formatting",
        duration: 3000,
      });
      return;
    }

    const range = selection.getRangeAt(0);
    const selectedText = range.toString();

    if (!selectedText) {
      toast({
        title: "Select Text",
        description: "Please select text to apply underline formatting",
        duration: 3000,
      });
      return;
    }

    // Create a span with underline styling
    const span = document.createElement("span");
    span.style.textDecoration = "underline";
    span.textContent = selectedText;

    // Replace the selected content with the new span
    range.deleteContents();
    range.insertNode(span);

    // Update the document content state
    if (textareaRef) {
      setDocumentContent(textareaRef.innerHTML);
    }

    // Keep the text selected - select the newly created span
    const newRange = document.createRange();
    newRange.selectNodeContents(span);
    selection.removeAllRanges();
    selection.addRange(newRange);

    if (textareaRef) {
      textareaRef.focus();
    }
  };
  const handleBulletList = () => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) {
      toast({
        title: "Select Text",
        description: "Please select text to apply bullet list formatting",
        duration: 3000,
      });
      return;
    }

    const range = selection.getRangeAt(0);

    // Get the container element and extract all text nodes
    const fragment = range.cloneContents();
    const tempDiv = document.createElement("div");
    tempDiv.appendChild(fragment);

    // Get all direct child nodes to preserve line structure
    const childNodes = Array.from(tempDiv.childNodes);
    const lines: string[] = [];

    // Process each child node to extract text while preserving line breaks
    childNodes.forEach((node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        const text = node.textContent?.trim();
        if (text) {
          // Split text node by line breaks if any exist
          const textLines = text
            .split("\n")
            .filter((line) => line.trim() !== "");
          lines.push(...textLines);
        }
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        const element = node as Element;
        const text = element.textContent?.trim();
        if (text) {
          lines.push(text);
        }
      }
    });

    // If we still don't have multiple lines, try a different approach
    if (lines.length <= 1) {
      const selectedText = range.toString();
      if (selectedText) {
        // Check for line breaks in the original selection
        const textLines = selectedText
          .split(/\r?\n/)
          .filter((line) => line.trim() !== "");
        if (textLines.length > 1) {
          lines.splice(0, lines.length, ...textLines);
        } else {
          // As fallback, use the single line
          if (selectedText.trim()) {
            lines.splice(0, lines.length, selectedText.trim());
          }
        }
      }
    }

    if (lines.length === 0) {
      toast({
        title: "No Content",
        description: "No text found to convert to bullet list",
        duration: 3000,
      });
      return;
    }

    const ul = document.createElement("ul");
    ul.style.marginLeft = "20px";
    ul.style.listStyleType = "disc";
    ul.style.paddingLeft = "20px";

    lines.forEach((line) => {
      const li = document.createElement("li");
      li.textContent = line.trim();
      li.style.marginBottom = "4px";
      li.style.lineHeight = "1.5";
      ul.appendChild(li);
    });

    // Replace the selected content with the bullet list
    range.deleteContents();
    range.insertNode(ul);

    // Update the document content state
    if (textareaRef) {
      setDocumentContent(textareaRef.innerHTML);
    }

    // Clear selection
    selection.removeAllRanges();
  };
  const handleNumberedList = () => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) {
      toast({
        title: "Select Text",
        description: "Please select text to apply numbered list formatting",
        duration: 3000,
      });
      return;
    }

    const range = selection.getRangeAt(0);

    // Get the container element and extract all text nodes
    const fragment = range.cloneContents();
    const tempDiv = document.createElement("div");
    tempDiv.appendChild(fragment);

    // Get all direct child nodes to preserve line structure
    const childNodes = Array.from(tempDiv.childNodes);
    const lines: string[] = [];

    // Process each child node to extract text while preserving line breaks
    childNodes.forEach((node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        const text = node.textContent?.trim();
        if (text) {
          // Split text node by line breaks if any exist
          const textLines = text
            .split("\n")
            .filter((line) => line.trim() !== "");
          lines.push(...textLines);
        }
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        const element = node as Element;
        const text = element.textContent?.trim();
        if (text) {
          lines.push(text);
        }
      }
    });

    // If we still don't have multiple lines, try a different approach
    if (lines.length <= 1) {
      const selectedText = range.toString();
      if (selectedText) {
        // Check for line breaks in the original selection
        const textLines = selectedText
          .split(/\r?\n/)
          .filter((line) => line.trim() !== "");
        if (textLines.length > 1) {
          lines.splice(0, lines.length, ...textLines);
        } else {
          // As fallback, use the single line
          if (selectedText.trim()) {
            lines.splice(0, lines.length, selectedText.trim());
          }
        }
      }
    }

    if (lines.length === 0) {
      toast({
        title: "No Content",
        description: "No text found to convert to numbered list",
        duration: 3000,
      });
      return;
    }

    const ol = document.createElement("ol");
    ol.style.marginLeft = "20px";
    ol.style.paddingLeft = "40px";
    ol.style.listStyleType = "decimal";
    ol.style.listStylePosition = "outside";

    lines.forEach((line) => {
      const li = document.createElement("li");
      li.textContent = line.trim();
      li.style.marginBottom = "4px";
      li.style.lineHeight = "1.5";
      ol.appendChild(li);
    });

    // Replace the selected content with the numbered list
    range.deleteContents();
    range.insertNode(ol);

    // Update the document content state
    if (textareaRef) {
      setDocumentContent(textareaRef.innerHTML);
    }

    // Clear selection
    selection.removeAllRanges();
  };
  const handleAlignLeft = () => {
    const selection = window.getSelection();
    if (
      !selection ||
      selection.rangeCount === 0 ||
      selection.toString().trim() === ""
    ) {
      toast({
        title: "Select Text",
        description: "Please select text to apply left alignment",
        duration: 3000,
      });
      return;
    }

    try {
      // Use document.execCommand for reliable alignment
      document.execCommand("justifyLeft", false);

      // Update the document content state
      if (textareaRef) {
        setDocumentContent(textareaRef.innerHTML);
      }
    } catch (error) {
      console.error("Left alignment error:", error);
      toast({
        title: "Error",
        description: "Failed to apply left alignment",
        duration: 3000,
      });
    }
  };

  const handleAlignCenter = () => {
    const selection = window.getSelection();
    if (
      !selection ||
      selection.rangeCount === 0 ||
      selection.toString().trim() === ""
    ) {
      toast({
        title: "Select Text",
        description: "Please select text to apply center alignment",
        duration: 3000,
      });
      return;
    }

    try {
      // Use document.execCommand for reliable alignment
      document.execCommand("justifyCenter", false);

      // Update the document content state
      if (textareaRef) {
        setDocumentContent(textareaRef.innerHTML);
      }
    } catch (error) {
      console.error("Center alignment error:", error);
      toast({
        title: "Error",
        description: "Failed to apply center alignment",
        duration: 3000,
      });
    }
  };

  const handleAlignRight = () => {
    const selection = window.getSelection();
    if (
      !selection ||
      selection.rangeCount === 0 ||
      selection.toString().trim() === ""
    ) {
      toast({
        title: "Select Text",
        description: "Please select text to apply right alignment",
        duration: 3000,
      });
      return;
    }

    try {
      // Use document.execCommand for reliable alignment
      document.execCommand("justifyRight", false);

      // Update the document content state
      if (textareaRef) {
        setDocumentContent(textareaRef.innerHTML);
      }
    } catch (error) {
      console.error("Right alignment error:", error);
      toast({
        title: "Error",
        description: "Failed to apply right alignment",
        duration: 3000,
      });
    }
  };

  const handleAlignJustify = () => {
    const selection = window.getSelection();
    if (
      !selection ||
      selection.rangeCount === 0 ||
      selection.toString().trim() === ""
    ) {
      toast({
        title: "Select Text",
        description: "Please select text to apply justify alignment",
        duration: 3000,
      });
      return;
    }

    try {
      // Use document.execCommand for reliable alignment
      document.execCommand("justifyFull", false);

      // Update the document content state
      if (textareaRef) {
        setDocumentContent(textareaRef.innerHTML);
      }
    } catch (error) {
      console.error("Justify alignment error:", error);
      toast({
        title: "Error",
        description: "Failed to apply justify alignment",
        duration: 3000,
      });
    }
  };
  const handleTable = () => {
    try {
      // Create a basic 3x3 table HTML structure with empty cells and ensure cursor positioning after table
      const tableHTML = `
        <table border="1" style="border-collapse: collapse; width: 100%; margin: 10px 0;">
          <tr>
            <td style="padding: 8px; border: 1px solid #ccc; min-height: 20px;">&nbsp;</td>
            <td style="padding: 8px; border: 1px solid #ccc; min-height: 20px;">&nbsp;</td>
            <td style="padding: 8px; border: 1px solid #ccc; min-height: 20px;">&nbsp;</td>
          </tr>
          <tr>
            <td style="padding: 8px; border: 1px solid #ccc; min-height: 20px;">&nbsp;</td>
            <td style="padding: 8px; border: 1px solid #ccc; min-height: 20px;">&nbsp;</td>
            <td style="padding: 8px; border: 1px solid #ccc; min-height: 20px;">&nbsp;</td>
          </tr>
          <tr>
            <td style="padding: 8px; border: 1px solid #ccc; min-height: 20px;">&nbsp;</td>
            <td style="padding: 8px; border: 1px solid #ccc; min-height: 20px;">&nbsp;</td>
            <td style="padding: 8px; border: 1px solid #ccc; min-height: 20px;">&nbsp;</td>
          </tr>
        </table>
        <p><br></p>
      `;

      // Insert the table at cursor position
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        range.deleteContents();

        // Create a temporary div to hold the table HTML
        const tempDiv = document.createElement("div");
        tempDiv.innerHTML = tableHTML;

        // Insert all elements (table and paragraph)
        const fragment = document.createDocumentFragment();
        while (tempDiv.firstChild) {
          fragment.appendChild(tempDiv.firstChild);
        }

        range.insertNode(fragment);

        // Position cursor in the paragraph after the table
        range.collapse(false);
        selection.removeAllRanges();
        selection.addRange(range);

        // Ensure the editor maintains focus
        if (textareaRef) {
          textareaRef.focus();
        }
      } else {
        // If no selection, insert at the end of the content
        if (textareaRef) {
          const currentContent = textareaRef.innerHTML || "";
          textareaRef.innerHTML = currentContent + tableHTML;
          setDocumentContent(textareaRef.innerHTML);
        }
      }

      // Update the document content state
      if (textareaRef) {
        setDocumentContent(textareaRef.innerHTML);
      }

      toast({
        title: "✓ Table Inserted",
        description: "3x3 empty table successfully inserted",
        duration: 2000,
      });
    } catch (error) {
      console.error("Insert table error:", error);
      toast({
        title: "Error",
        description: "Failed to insert table",
        duration: 3000,
      });
    }
  };
  const handleAttachFile = () => {
    try {
      // Create a hidden file input element
      const fileInput = document.createElement("input");
      fileInput.type = "file";
      fileInput.accept = ".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png,.gif";
      fileInput.style.display = "none";

      // Handle file selection
      fileInput.onchange = (event: any) => {
        const file = event.target.files?.[0];
        if (file) {
          // Create a proper inline file attachment with styling
          const fileSize = (file.size / 1024).toFixed(1);
          const fileAttachmentHTML = `
            <span style="display: inline-block; background: #f0f9ff; border: 1px solid #0ea5e9; border-radius: 4px; padding: 4px 8px; margin: 0 2px; color: #0369a1; font-size: 12px; vertical-align: middle;">
              <span style="margin-right: 4px;">📎</span>
              <strong>${file.name}</strong>
              <span style="color: #64748b; margin-left: 4px;">(${fileSize} KB)</span>
            </span>
          `;

          // Insert the file attachment at cursor position
          const selection = window.getSelection();
          if (selection && selection.rangeCount > 0) {
            const range = selection.getRangeAt(0);
            range.deleteContents();

            // Create a temporary div to hold the attachment HTML
            const tempDiv = document.createElement("div");
            tempDiv.innerHTML = fileAttachmentHTML;
            const attachmentElement = tempDiv.firstElementChild;

            if (attachmentElement) {
              range.insertNode(attachmentElement);

              // Move cursor after the attachment
              range.setStartAfter(attachmentElement);
              range.collapse(true);
              selection.removeAllRanges();
              selection.addRange(range);
            }
          } else {
            // If no selection, insert at the end of the content
            if (textareaRef) {
              const currentContent = textareaRef.innerHTML || "";
              textareaRef.innerHTML = currentContent + fileAttachmentHTML;
              setDocumentContent(textareaRef.innerHTML);
            }
          }

          // Update the document content state
          if (textareaRef) {
            setDocumentContent(textareaRef.innerHTML);
          }

          toast({
            title: "✓ File Attached",
            description: `File "${file.name}" attached successfully`,
            duration: 2000,
          });
        }

        // Clean up
        document.body.removeChild(fileInput);
      };

      // Add to DOM and trigger click
      document.body.appendChild(fileInput);
      fileInput.click();
    } catch (error) {
      console.error("Attach file error:", error);
      toast({
        title: "Error",
        description: "Failed to attach file",
        duration: 3000,
      });
    }
  };
  const handleInsertTemplate = () => {
    setShowTemplateDialog(true);
  };

  const insertTemplate = (templateText: string) => {
    if (!textareaRef) {
      toast({
        title: "Error",
        description: "Document editor not ready",
        duration: 3000,
      });
      return;
    }

    try {
      // Get current cursor position or create a new range at the end
      const selection = window.getSelection();
      let range;

      if (selection && selection.rangeCount > 0) {
        range = selection.getRangeAt(0);
      } else {
        // Create range at the end of content
        range = document.createRange();
        if (textareaRef && textareaRef.childNodes.length > 0) {
          range.setStartAfter(textareaRef.lastChild!);
        } else if (textareaRef) {
          range.setStart(textareaRef, 0);
        }
        range.collapse(true);
      }

      // Create template content as HTML
      const templateDiv = document.createElement("div");
      templateDiv.innerHTML = templateText;
      templateDiv.style.marginBottom = "30px";

      // Insert template
      range.insertNode(templateDiv);

      // Move cursor after the template
      range.setStartAfter(templateDiv);
      range.collapse(true);

      // Update selection
      selection?.removeAllRanges();
      selection?.addRange(range);

      // Update document content
      setDocumentContent(textareaRef.innerHTML);

      // Focus editor
      textareaRef.focus();

      // Close dialog
      setShowTemplateDialog(false);

      toast({
        title: "✓ Template Inserted",
        description: "Template has been added to your document",
        duration: 2000,
      });
    } catch (error) {
      console.error("Template insertion error:", error);
      toast({
        title: "Error",
        description: "Failed to insert template",
        duration: 3000,
      });
    }
  };
  const handleInsertLogo = () => {
    setShowLogoDialog(true);
  };

  const insertLogo = (logoType: string, logoData?: string) => {
    if (!textareaRef) {
      toast({
        title: "Error",
        description: "Document editor not ready",
        duration: 3000,
      });
      return;
    }

    try {
      // Get current cursor position or create a new range at the end
      const selection = window.getSelection();
      let range;

      if (selection && selection.rangeCount > 0) {
        range = selection.getRangeAt(0);
      } else {
        // Create range at the end of content
        range = document.createRange();
        if (textareaRef && textareaRef.childNodes.length > 0) {
          range.setStartAfter(textareaRef.lastChild!);
        } else if (textareaRef) {
          range.setStart(textareaRef, 0);
        }
        range.collapse(true);
      }

      let logoHTML = "";

      if (logoType === "custom" && logoData) {
        // Custom uploaded logo
        logoHTML = `<div style="text-align: center; margin: 20px 0;"><img src="${logoData}" alt="Custom Logo" style="max-width: 200px; max-height: 100px; object-fit: contain;" /></div>`;
      } else {
        // Predefined clinic logos
        switch (logoType) {
          case "clinic-modern":
            logoHTML = `<div style="text-align: center; margin: 20px 0; color: #0D9488; font-size: 24px; font-weight: bold;">🏥 ${clinicInfo.name || "Healthcare Clinic"}</div>`;
            break;
          case "clinic-professional":
            logoHTML = `<div style="text-align: center; margin: 20px 0; border: 2px solid #0D9488; padding: 15px; border-radius: 8px;"><div style="color: #0D9488; font-size: 20px; font-weight: bold;">${clinicInfo.name || "Medical Center"}</div><div style="color: #666; font-size: 12px; margin-top: 5px;">Healthcare Excellence</div></div>`;
            break;
          case "clinic-minimal":
            logoHTML = `<div style="text-align: center; margin: 20px 0; color: #1F2937; font-size: 18px; font-weight: 600; text-transform: uppercase; letter-spacing: 2px;">${clinicInfo.name || "Medical Practice"}</div>`;
            break;
          case "medical-cross":
            logoHTML = `<div style="text-align: center; margin: 20px 0;"><div style="display: inline-block; width: 60px; height: 60px; background: #DC2626; position: relative; margin-bottom: 10px;"><div style="position: absolute; top: 15px; left: 25px; width: 10px; height: 30px; background: white;"></div><div style="position: absolute; top: 25px; left: 15px; width: 30px; height: 10px; background: white;"></div></div><div style="color: #DC2626; font-size: 16px; font-weight: bold;">${clinicInfo.name || "Medical Services"}</div></div>`;
            break;
          case "health-plus":
            logoHTML = `<div style="text-align: center; margin: 20px 0;"><div style="color: #059669; font-size: 32px; margin-bottom: 8px;">⚕️</div><div style="color: #059669; font-size: 18px; font-weight: bold;">${clinicInfo.name || "Health Plus"}</div></div>`;
            break;
        }
      }

      // Create logo element
      const logoDiv = document.createElement("div");
      logoDiv.innerHTML = logoHTML;

      // Insert logo
      range.insertNode(logoDiv);

      // Move cursor after the logo
      range.setStartAfter(logoDiv);
      range.collapse(true);

      // Update selection
      selection?.removeAllRanges();
      selection?.addRange(range);

      // Update document content
      setDocumentContent(textareaRef.innerHTML);

      // Focus editor
      textareaRef.focus();

      // Close dialog
      setShowLogoDialog(false);

      toast({
        title: "✓ Logo Inserted",
        description: "Logo has been added to your document",
        duration: 2000,
      });
    } catch (error) {
      console.error("Logo insertion error:", error);
      toast({
        title: "Error",
        description: "Failed to insert logo",
        duration: 3000,
      });
    }
  };
  const handleClinic = () => {
    setIsComingFromClinicButton(true);
    setShowClinicDialog(true);
  };

  const handleClinicalHeader = () => {
    setShowClinicalHeaderDialog(true);
  };

  const handleSaveClinicalHeader = async () => {
    try {
      const response = await fetch("/api/me/preferences", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
          "X-Tenant-Subdomain": tenantSubdomainForApi,
        },
        body: JSON.stringify({
          clinicName: editingClinicInfo.name || "Clinic",
          clinicAddress: editingClinicInfo.address || "123 Healthcare Street, Medical City, MC 12345",
          clinicPhone: editingClinicInfo.phone || "+44 20 1234 5678",
          clinicEmail: editingClinicInfo.email || "info@yourclinic.com",
          clinicWebsite: editingClinicInfo.website || "www.yourclinic.com",
        }),
      });

      if (response.ok) {
        // Update clinic info state with saved values
        setClinicInfo({
          name: editingClinicInfo.name,
          address: editingClinicInfo.address,
          phone: editingClinicInfo.phone,
          email: editingClinicInfo.email,
          website: editingClinicInfo.website,
        });

        toast({
          title: "Success",
          description: "Clinical header information saved successfully",
          duration: 3000,
        });
        setShowAddClinicInfoDialog(false);
      } else {
        throw new Error("Failed to save");
      }
    } catch (error) {
      console.error("Error saving clinical header info:", error);
      toast({
        title: "Error",
        description: "Failed to save clinical header information",
        duration: 3000,
      });
    }
  };

  const handleInsertClinicHeader = () => {
    // Update preview with selected clinic header type (do NOT insert into document yet)
    setSelectedClinicHeaderType(tempClinicHeaderType);

    // Close dialog
    setShowClinicPositionDialog(false);

    toast({
      title: "✓ Preview Updated",
      description: "Clinic header is ready. Click 'Load' to add it to your document",
      duration: 2000,
    });
  };

  const handleLoadClinicalHeader = () => {
    // Insert the clinic info into the editor
    const clinicHTML = `
      <div style="text-align: center; margin: 20px 0; padding: 15px; border-bottom: 2px solid #0D9488;">
        <h2 style="color: #0D9488; margin: 0; font-size: 24px; font-weight: bold;">🏥 ${editingClinicInfo.name || "Clinic"}</h2>
        <p style="margin: 5px 0; color: #666;">${editingClinicInfo.address || "123 Healthcare Street, Medical City, MC 12345"}</p>
        <p style="margin: 5px 0; color: #666;">${editingClinicInfo.phone || "+44 20 1234 5678"} • ${editingClinicInfo.email || "info@yourclinic.com"}</p>
        <p style="margin: 5px 0; color: #666;">${editingClinicInfo.website || "www.yourclinic.com"}</p>
      </div>
    `;

    if (textareaRef) {
      const currentContent = textareaRef.value;
      textareaRef.value = clinicHTML + currentContent;
      setDocumentContent(textareaRef.value);
    }

    setShowAddClinicInfoDialog(false);
    setShowClinicDisplayDialog(false);
  };

  const insertClinicInfo = (infoType: string) => {
    if (!textareaRef) {
      toast({
        title: "Error",
        description: "Document editor not ready",
        duration: 3000,
      });
      return;
    }

    try {
      // Get current cursor position or create a new range at the end
      const selection = window.getSelection();
      let range;

      if (selection && selection.rangeCount > 0) {
        range = selection.getRangeAt(0);
      } else {
        // Create range at the end of content
        range = document.createRange();
        if (textareaRef && textareaRef.childNodes.length > 0) {
          range.setStartAfter(textareaRef.lastChild!);
        } else if (textareaRef) {
          range.setStart(textareaRef, 0);
        }
        range.collapse(true);
      }

      let clinicHTML = "";

      switch (infoType) {
        case "full-header":
          clinicHTML = `
            <div style="text-align: center; margin: 20px 0; padding: 15px; border-bottom: 2px solid #0D9488;">
              <h2 style="color: #0D9488; margin: 0; font-size: 24px; font-weight: bold;">${clinicInfo.name || "Your Clinic Name"}</h2>
              <p style="margin: 5px 0; color: #666;">${clinicInfo.address || "Clinic Address"}</p>
              <p style="margin: 5px 0; color: #666;">Phone: ${clinicInfo.phone || "Phone Number"} | Email: ${clinicInfo.email || "Email Address"}</p>
              <p style="margin: 5px 0; color: #666;">Website: ${clinicInfo.website || "Website URL"}</p>
            </div>
          `;
          break;
        case "name-only":
          clinicHTML = `<strong>${clinicInfo.name || "Your Clinic Name"}</strong>`;
          break;
        case "contact-info":
          clinicHTML = `
            <div style="margin: 10px 0;">
              <p><strong>Contact Information:</strong></p>
              <p>Address: ${clinicInfo.address || "Clinic Address"}</p>
              <p>Phone: ${clinicInfo.phone || "Phone Number"}</p>
              <p>Email: ${clinicInfo.email || "Email Address"}</p>
              <p>Website: ${clinicInfo.website || "Website URL"}</p>
            </div>
          `;
          break;
        case "letterhead":
          clinicHTML = `
            <div style="text-align: center; margin: 20px 0; padding: 20px; background: #f8f9fa; border: 1px solid #e9ecef;">
              <h1 style="color: #0D9488; margin: 0; font-size: 28px; font-weight: bold;">${clinicInfo.name || "Medical Center"}</h1>
              <p style="margin: 10px 0; color: #666; font-style: italic;">Excellence in Healthcare</p>
              <hr style="width: 50%; border: 1px solid #0D9488; margin: 15px auto;">
              <p style="margin: 5px 0; color: #333;">${clinicInfo.address || "Address"}</p>
              <p style="margin: 5px 0; color: #333;">Tel: ${clinicInfo.phone || "Phone"} | Email: ${clinicInfo.email || "Email"}</p>
            </div>
          `;
          break;
        case "signature-block":
          clinicHTML = `
            <div style="margin: 30px 0; padding: 15px; border-top: 1px solid #ccc;">
              <p><strong>${clinicInfo.name || "Your Clinic Name"}</strong></p>
              <p>${clinicInfo.address || "Clinic Address"}</p>
              <p>Phone: ${clinicInfo.phone || "Phone Number"}</p>
              <p>Email: ${clinicInfo.email || "Email Address"}</p>
            </div>
          `;
          break;
      }

      // Create clinic info element
      const clinicDiv = document.createElement("div");
      clinicDiv.innerHTML = clinicHTML;

      // Insert clinic info
      range.insertNode(clinicDiv);

      // Move cursor after the clinic info
      range.setStartAfter(clinicDiv);
      range.collapse(true);

      // Update selection
      selection?.removeAllRanges();
      selection?.addRange(range);

      // Update document content
      setDocumentContent(textareaRef.innerHTML);

      // Focus editor
      textareaRef.focus();

      // Close dialog
      setShowClinicDialog(false);

      toast({
        title: "✓ Clinic Info Inserted",
        description: "Clinic information has been added to your document",
        duration: 2000,
      });
    } catch (error) {
      console.error("Clinic info insertion error:", error);
      toast({
        title: "Error",
        description: "Failed to insert clinic information",
        duration: 3000,
      });
    }
  };

  const handleEditClinicInfo = () => {
    // Initialize editing form with current clinic info
    setEditingClinicInfo({
      name: clinicInfo.name || "",
      address: clinicInfo.address || "",
      phone: clinicInfo.phone || "",
      email: clinicInfo.email || "",
      website: clinicInfo.website || "",
    });
    setShowEditClinicDialog(true);
  };

  const saveClinicInfo = () => {
    // Update clinic info state with edited values
    setClinicInfo({
      name: editingClinicInfo.name,
      address: editingClinicInfo.address,
      phone: editingClinicInfo.phone,
      email: editingClinicInfo.email,
      website: editingClinicInfo.website,
    });

    // Close edit dialog
    setShowEditClinicDialog(false);

    toast({
      title: "✓ Clinic Information Updated",
      description: "Your clinic information has been saved successfully",
      duration: 2000,
    });
  };

  const handlePatient = () => {
    setShowPatientDialog(true);
  };

  const insertPatientInfo = (infoType: string) => {
    if (!textareaRef) {
      toast({
        title: "Error",
        description: "Document editor not ready",
        duration: 3000,
      });
      return;
    }

    try {
      // Get current cursor position or create a new range at the end
      const selection = window.getSelection();
      let range;

      if (selection && selection.rangeCount > 0) {
        range = selection.getRangeAt(0);
      } else {
        // Create range at the end of content
        range = document.createRange();
        if (textareaRef && textareaRef.childNodes.length > 0) {
          range.setStartAfter(textareaRef.lastChild!);
        } else if (textareaRef) {
          range.setStart(textareaRef, 0);
        }
        range.collapse(true);
      }

      let patientHTML = "";

      switch (infoType) {
        case "full-details":
          patientHTML = `
            <div style="margin: 15px 0; padding: 10px; border: 1px solid #e0e0e0; border-radius: 5px;">
              <p><strong>Patient Name:</strong> [Patient Name]</p>
              <p><strong>Date of Birth:</strong> [Date of Birth]</p>
              <p><strong>Patient ID:</strong> [Patient ID]</p>
              <p><strong>Address:</strong> [Patient Address]</p>
              <p><strong>Phone:</strong> [Patient Phone]</p>
              <p><strong>Email:</strong> [Patient Email]</p>
            </div>
          `;
          break;
        case "name-dob":
          patientHTML = `<p><strong>Patient:</strong> [Patient Name] | <strong>DOB:</strong> [Date of Birth]</p>`;
          break;
        case "contact-info":
          patientHTML = `
            <div style="margin: 10px 0;">
              <p><strong>Patient Contact Information:</strong></p>
              <p>Name: [Patient Name]</p>
              <p>Phone: [Patient Phone]</p>
              <p>Email: [Patient Email]</p>
              <p>Address: [Patient Address]</p>
            </div>
          `;
          break;
        case "demographics":
          patientHTML = `
            <div style="margin: 10px 0;">
              <p><strong>Patient Demographics:</strong></p>
              <p>Name: [Patient Name]</p>
              <p>Age: [Patient Age]</p>
              <p>Gender: [Patient Gender]</p>
              <p>Date of Birth: [Date of Birth]</p>
              <p>Insurance: [Insurance Information]</p>
            </div>
          `;
          break;
        case "emergency-contact":
          patientHTML = `
            <div style="margin: 10px 0;">
              <p><strong>Emergency Contact:</strong></p>
              <p>Name: [Emergency Contact Name]</p>
              <p>Relationship: [Relationship]</p>
              <p>Phone: [Emergency Contact Phone]</p>
            </div>
          `;
          break;
      }

      // Create patient info element
      const patientDiv = document.createElement("div");
      patientDiv.innerHTML = patientHTML;

      // Insert patient info
      range.insertNode(patientDiv);

      // Move cursor after the patient info
      range.setStartAfter(patientDiv);
      range.collapse(true);

      // Update selection
      selection?.removeAllRanges();
      selection?.addRange(range);

      // Update document content
      setDocumentContent(textareaRef.innerHTML);

      // Focus editor
      textareaRef.focus();

      // Close dialog
      setShowPatientDialog(false);

      toast({
        title: "✓ Patient Info Inserted",
        description:
          "Patient information template has been added to your document",
        duration: 2000,
      });
    } catch (error) {
      console.error("Patient info insertion error:", error);
      toast({
        title: "Error",
        description: "Failed to insert patient information",
        duration: 3000,
      });
    }
  };
  const handleRecipient = () => {
    setShowRecipientDialog(true);
  };

  const insertRecipientInfo = (infoType: string) => {
    if (!textareaRef) {
      toast({
        title: "Error",
        description: "Document editor not ready",
        duration: 3000,
      });
      return;
    }

    try {
      // Get current cursor position or create a new range at the end
      const selection = window.getSelection();
      let range;

      if (selection && selection.rangeCount > 0) {
        range = selection.getRangeAt(0);
      } else {
        // Create range at the end of content
        range = document.createRange();
        if (textareaRef && textareaRef.childNodes.length > 0) {
          range.setStartAfter(textareaRef.lastChild!);
        } else if (textareaRef) {
          range.setStart(textareaRef, 0);
        }
        range.collapse(true);
      }

      let recipientHTML = "";

      switch (infoType) {
        case "doctor-details":
          recipientHTML = `
            <div style="margin: 15px 0; padding: 10px; border: 1px solid #e0e0e0; border-radius: 5px;">
              <p><strong>Dr. [Doctor Name]</strong></p>
              <p>[Medical Specialty]</p>
              <p>[Clinic/Hospital Name]</p>
              <p>[Address]</p>
              <p>Phone: [Phone Number]</p>
              <p>Email: [Email Address]</p>
            </div>
          `;
          break;
        case "specialist-referral":
          recipientHTML = `
            <div style="margin: 10px 0;">
              <p><strong>To: Dr. [Specialist Name]</strong></p>
              <p>[Specialty Department]</p>
              <p>[Hospital/Clinic Name]</p>
              <p>Re: [Patient Name] - [Referral Reason]</p>
            </div>
          `;
          break;
        case "insurance-company":
          recipientHTML = `
            <div style="margin: 10px 0;">
              <p><strong>[Insurance Company Name]</strong></p>
              <p>Claims Department</p>
              <p>[Address]</p>
              <p>Policy Number: [Policy Number]</p>
              <p>Member ID: [Member ID]</p>
            </div>
          `;
          break;
        case "patient-family":
          recipientHTML = `
            <div style="margin: 10px 0;">
              <p><strong>[Family Member Name]</strong></p>
              <p>Relationship: [Relationship to Patient]</p>
              <p>[Address]</p>
              <p>Phone: [Phone Number]</p>
              <p>Email: [Email Address]</p>
            </div>
          `;
          break;
        case "pharmacy":
          recipientHTML = `
            <div style="margin: 10px 0;">
              <p><strong>[Pharmacy Name]</strong></p>
              <p>[Pharmacy Address]</p>
              <p>Phone: [Pharmacy Phone]</p>
              <p>Fax: [Pharmacy Fax]</p>
              <p>License: [Pharmacy License Number]</p>
            </div>
          `;
          break;
      }

      // Create recipient info element
      const recipientDiv = document.createElement("div");
      recipientDiv.innerHTML = recipientHTML;

      // Insert recipient info
      range.insertNode(recipientDiv);

      // Move cursor after the recipient info
      range.setStartAfter(recipientDiv);
      range.collapse(true);

      // Update selection
      selection?.removeAllRanges();
      selection?.addRange(range);

      // Update document content
      setDocumentContent(textareaRef.innerHTML);

      // Focus editor
      textareaRef.focus();

      // Close dialog
      setShowRecipientDialog(false);

      toast({
        title: "✓ Recipient Info Inserted",
        description:
          "Recipient information template has been added to your document",
        duration: 2000,
      });
    } catch (error) {
      console.error("Recipient info insertion error:", error);
      toast({
        title: "Error",
        description: "Failed to insert recipient information",
        duration: 3000,
      });
    }
  };
  const handleAppointments = () => {
    setShowAppointmentsDialog(true);
  };

  const insertAppointmentInfo = (infoType: string) => {
    if (!textareaRef) {
      toast({
        title: "Error",
        description: "Document editor not ready",
        duration: 3000,
      });
      return;
    }

    try {
      // Get current cursor position or create a new range at the end
      const selection = window.getSelection();
      let range;

      if (selection && selection.rangeCount > 0) {
        range = selection.getRangeAt(0);
      } else {
        // Create range at the end of content
        range = document.createRange();
        if (textareaRef && textareaRef.childNodes.length > 0) {
          range.setStartAfter(textareaRef.lastChild!);
        } else if (textareaRef) {
          range.setStart(textareaRef, 0);
        }
        range.collapse(true);
      }

      let appointmentHTML = "";

      switch (infoType) {
        case "appointment-details":
          appointmentHTML = `
            <div style="margin: 15px 0; padding: 10px; border: 1px solid #e0e0e0; border-radius: 5px;">
              <p><strong>Appointment Details</strong></p>
              <p>Date: [Appointment Date]</p>
              <p>Time: [Appointment Time]</p>
              <p>Duration: [Duration]</p>
              <p>Provider: Dr. [Provider Name]</p>
              <p>Department: [Department]</p>
              <p>Location: [Clinic Location]</p>
            </div>
          `;
          break;
        case "next-appointment":
          appointmentHTML = `
            <div style="margin: 10px 0;">
              <p><strong>Next Appointment:</strong></p>
              <p>Date: [Next Appointment Date]</p>
              <p>Time: [Next Appointment Time]</p>
              <p>Provider: Dr. [Provider Name]</p>
              <p>Purpose: [Appointment Purpose]</p>
            </div>
          `;
          break;
        case "appointment-history":
          appointmentHTML = `
            <div style="margin: 10px 0;">
              <p><strong>Recent Appointments:</strong></p>
              <p>• [Date 1] - Dr. [Provider 1] - [Purpose 1]</p>
              <p>• [Date 2] - Dr. [Provider 2] - [Purpose 2]</p>
              <p>• [Date 3] - Dr. [Provider 3] - [Purpose 3]</p>
            </div>
          `;
          break;
        case "follow-up":
          appointmentHTML = `
            <div style="margin: 10px 0;">
              <p><strong>Follow-up Appointment Required:</strong></p>
              <p>Recommended timeframe: [Timeframe]</p>
              <p>Purpose: [Follow-up Purpose]</p>
              <p>Please contact our office at [Phone Number] to schedule.</p>
            </div>
          `;
          break;
        case "appointment-reminder":
          appointmentHTML = `
            <div style="margin: 10px 0;">
              <p><strong>Appointment Reminder</strong></p>
              <p>You have an upcoming appointment:</p>
              <p>Date: [Appointment Date]</p>
              <p>Time: [Appointment Time]</p>
              <p>Provider: Dr. [Provider Name]</p>
              <p>Please arrive 15 minutes early and bring your insurance card and ID.</p>
            </div>
          `;
          break;
      }

      // Create appointment info element
      const appointmentDiv = document.createElement("div");
      appointmentDiv.innerHTML = appointmentHTML;

      // Insert appointment info
      range.insertNode(appointmentDiv);

      // Move cursor after the appointment info
      range.setStartAfter(appointmentDiv);
      range.collapse(true);

      // Update selection
      selection?.removeAllRanges();
      selection?.addRange(range);

      // Update document content
      setDocumentContent(textareaRef.innerHTML);

      // Focus editor
      textareaRef.focus();

      // Close dialog
      setShowAppointmentsDialog(false);

      toast({
        title: "✓ Appointment Info Inserted",
        description:
          "Appointment information template has been added to your document",
        duration: 2000,
      });
    } catch (error) {
      console.error("Appointment info insertion error:", error);
      toast({
        title: "Error",
        description: "Failed to insert appointment information",
        duration: 3000,
      });
    }
  };
  const handleLabs = () => {
    setShowLabsDialog(true);
  };

  const insertLabInfo = (infoType: string) => {
    if (!textareaRef) {
      toast({
        title: "Error",
        description: "Document editor not ready",
        duration: 3000,
      });
      return;
    }

    try {
      // Get current cursor position or create a new range at the end
      const selection = window.getSelection();
      let range;

      if (selection && selection.rangeCount > 0) {
        range = selection.getRangeAt(0);
      } else {
        // Create range at the end of content
        range = document.createRange();
        if (textareaRef && textareaRef.childNodes.length > 0) {
          range.setStartAfter(textareaRef.lastChild!);
        } else if (textareaRef) {
          range.setStart(textareaRef, 0);
        }
        range.collapse(true);
      }

      let labHTML = "";

      switch (infoType) {
        case "lab-results":
          labHTML = `
            <div style="margin: 15px 0; padding: 10px; border: 1px solid #e0e0e0; border-radius: 5px;">
              <p><strong>Laboratory Results</strong></p>
              <p>Date Collected: [Date Collected]</p>
              <p>Lab Name: [Laboratory Name]</p>
              <p>Test Type: [Test Type]</p>
              <p>Results: [Test Results]</p>
              <p>Reference Range: [Normal Range]</p>
              <p>Status: [Normal/Abnormal]</p>
            </div>
          `;
          break;
        case "blood-work":
          labHTML = `
            <div style="margin: 10px 0;">
              <p><strong>Blood Work Results:</strong></p>
              <p>• CBC: [Complete Blood Count Results]</p>
              <p>• Glucose: [Glucose Level] mg/dL</p>
              <p>• Cholesterol: [Cholesterol Level] mg/dL</p>
              <p>• Hemoglobin: [Hemoglobin Level] g/dL</p>
              <p>Date: [Test Date]</p>
            </div>
          `;
          break;
        case "urine-analysis":
          labHTML = `
            <div style="margin: 10px 0;">
              <p><strong>Urinalysis Results:</strong></p>
              <p>Color: [Color]</p>
              <p>Clarity: [Clarity]</p>
              <p>Protein: [Protein Level]</p>
              <p>Glucose: [Glucose Level]</p>
              <p>RBC: [Red Blood Cells]</p>
              <p>WBC: [White Blood Cells]</p>
            </div>
          `;
          break;
        case "culture-results":
          labHTML = `
            <div style="margin: 10px 0;">
              <p><strong>Culture Results:</strong></p>
              <p>Specimen Type: [Specimen Type]</p>
              <p>Culture Result: [Culture Result]</p>
              <p>Organism: [Organism Identified]</p>
              <p>Sensitivity: [Antibiotic Sensitivity]</p>
              <p>Date Reported: [Report Date]</p>
            </div>
          `;
          break;
        case "pending-labs":
          labHTML = `
            <div style="margin: 10px 0;">
              <p><strong>Pending Laboratory Tests:</strong></p>
              <p>• [Test Name 1] - Ordered: [Date 1]</p>
              <p>• [Test Name 2] - Ordered: [Date 2]</p>
              <p>• [Test Name 3] - Ordered: [Date 3]</p>
              <p>Expected Results: [Expected Date]</p>
            </div>
          `;
          break;
      }

      // Create lab info element
      const labDiv = document.createElement("div");
      labDiv.innerHTML = labHTML;

      // Insert lab info
      range.insertNode(labDiv);

      // Move cursor after the lab info
      range.setStartAfter(labDiv);
      range.collapse(true);

      // Update selection
      selection?.removeAllRanges();
      selection?.addRange(range);

      // Update document content
      setDocumentContent(textareaRef.innerHTML);

      // Focus editor
      textareaRef.focus();

      // Close dialog immediately
      setShowLabsDialog(false);

      // Small delay to ensure state update
      setTimeout(() => {
        toast({
          title: "✓ Lab Info Inserted",
          description:
            "Laboratory information template has been added to your document",
          duration: 2000,
        });
      }, 100);
    } catch (error) {
      console.error("Lab info insertion error:", error);
      // Close dialog on error too
      setShowLabsDialog(false);
      toast({
        title: "Error",
        description: "Failed to insert laboratory information",
        duration: 3000,
      });
    }
  };
  const handlePatientRecords = () => {
    setShowPatientRecordsDialog(true);
  };

  const insertPatientRecordsInfo = (infoType: string) => {
    if (!textareaRef) {
      toast({
        title: "Error",
        description: "Document editor not ready",
        duration: 3000,
      });
      return;
    }

    try {
      // Get current cursor position or create a new range at the end
      const selection = window.getSelection();
      let range;

      if (selection && selection.rangeCount > 0) {
        range = selection.getRangeAt(0);
      } else {
        // Create range at the end of content
        range = document.createRange();
        if (textareaRef && textareaRef.childNodes.length > 0) {
          range.setStartAfter(textareaRef.lastChild!);
        } else if (textareaRef) {
          range.setStart(textareaRef, 0);
        }
        range.collapse(true);
      }

      let patientRecordsHTML = "";

      switch (infoType) {
        case "medical-history":
          patientRecordsHTML = `
            <div style="margin: 15px 0; padding: 10px; border: 1px solid #e0e0e0; border-radius: 5px;">
              <p><strong>Medical History</strong></p>
              <p>Past Medical History: [Past Medical History]</p>
              <p>Surgical History: [Surgical History]</p>
              <p>Family History: [Family History]</p>
              <p>Social History: [Social History]</p>
              <p>Allergies: [Known Allergies]</p>
              <p>Current Medications: [Current Medications]</p>
            </div>
          `;
          break;
        case "current-medications":
          patientRecordsHTML = `
            <div style="margin: 10px 0;">
              <p><strong>Current Medications:</strong></p>
              <p>• [Medication 1] - [Dosage] - [Frequency]</p>
              <p>• [Medication 2] - [Dosage] - [Frequency]</p>
              <p>• [Medication 3] - [Dosage] - [Frequency]</p>
              <p>Last Updated: [Update Date]</p>
            </div>
          `;
          break;
        case "allergies":
          patientRecordsHTML = `
            <div style="margin: 10px 0;">
              <p><strong>Known Allergies:</strong></p>
              <p>Drug Allergies: [Drug Allergies]</p>
              <p>Food Allergies: [Food Allergies]</p>
              <p>Environmental Allergies: [Environmental Allergies]</p>
              <p>Reactions: [Allergic Reactions]</p>
              <p>Severity: [Severity Level]</p>
            </div>
          `;
          break;
        case "vital-signs":
          patientRecordsHTML = `
            <div style="margin: 10px 0;">
              <p><strong>Latest Vital Signs:</strong></p>
              <p>Blood Pressure: [Blood Pressure] mmHg</p>
              <p>Heart Rate: [Heart Rate] bpm</p>
              <p>Temperature: [Temperature]°F</p>
              <p>Respiratory Rate: [Respiratory Rate] breaths/min</p>
              <p>Weight: [Weight] lbs</p>
              <p>Height: [Height] ft/in</p>
              <p>Date Recorded: [Vital Signs Date]</p>
            </div>
          `;
          break;
        case "diagnosis-history":
          patientRecordsHTML = `
            <div style="margin: 10px 0;">
              <p><strong>Diagnosis History:</strong></p>
              <p>Primary Diagnosis: [Primary Diagnosis]</p>
              <p>Secondary Diagnoses: [Secondary Diagnoses]</p>
              <p>Chronic Conditions: [Chronic Conditions]</p>
              <p>Date of Diagnosis: [Diagnosis Date]</p>
              <p>ICD-10 Codes: [ICD-10 Codes]</p>
            </div>
          `;
          break;
      }

      // Create patient records info element
      const patientRecordsDiv = document.createElement("div");
      patientRecordsDiv.innerHTML = patientRecordsHTML;

      // Insert patient records info
      range.insertNode(patientRecordsDiv);

      // Move cursor after the patient records info
      range.setStartAfter(patientRecordsDiv);
      range.collapse(true);

      // Update selection
      selection?.removeAllRanges();
      selection?.addRange(range);

      // Update document content
      setDocumentContent(textareaRef.innerHTML);

      // Focus editor
      textareaRef.focus();

      // Close dialog immediately
      setShowPatientRecordsDialog(false);

      // Small delay to ensure state update
      setTimeout(() => {
        toast({
          title: "✓ Patient Records Inserted",
          description:
            "Patient records template has been added to your document",
          duration: 2000,
        });
      }, 100);
    } catch (error) {
      console.error("Patient records insertion error:", error);
      // Close dialog on error too
      setShowPatientRecordsDialog(false);
      toast({
        title: "Error",
        description: "Failed to insert patient records information",
        duration: 3000,
      });
    }
  };
  const handleInsertProduct = () => {
    setShowInsertProductDialog(true);
  };

  const insertProductInfo = (productType: string) => {
    if (!textareaRef) {
      toast({
        title: "Error",
        description: "Document editor not ready",
        duration: 3000,
      });
      return;
    }

    try {
      // Get current cursor position or create a new range at the end
      const selection = window.getSelection();
      let range;

      if (selection && selection.rangeCount > 0) {
        range = selection.getRangeAt(0);
      } else {
        // Create range at the end of content
        range = document.createRange();
        if (textareaRef && textareaRef.childNodes.length > 0) {
          range.setStartAfter(textareaRef.lastChild!);
        } else if (textareaRef) {
          range.setStart(textareaRef, 0);
        }
        range.collapse(true);
      }

      let productHTML = "";

      switch (productType) {
        case "medication":
          productHTML = `
            <div style="margin: 15px 0; padding: 10px; border: 1px solid #e0e0e0; border-radius: 5px;">
              <p><strong>Medication Information</strong></p>
              <p>Product Name: [Medication Name]</p>
              <p>Generic Name: [Generic Name]</p>
              <p>Strength: [Strength/Dosage]</p>
              <p>Form: [Tablet/Capsule/Liquid/Injection]</p>
              <p>Manufacturer: [Manufacturer Name]</p>
              <p>NDC Number: [NDC Number]</p>
              <p>Price: {currencySymbol}[Price]</p>
              <p>Instructions: [Dosage Instructions]</p>
            </div>
          `;
          break;
        case "medical-device":
          productHTML = `
            <div style="margin: 10px 0;">
              <p><strong>Medical Device:</strong></p>
              <p>Device Name: [Device Name]</p>
              <p>Model Number: [Model Number]</p>
              <p>Manufacturer: [Manufacturer]</p>
              <p>Category: [Device Category]</p>
              <p>FDA Approval: [FDA Status]</p>
              <p>Price: {currencySymbol}[Device Price]</p>
              <p>Warranty: [Warranty Period]</p>
            </div>
          `;
          break;
        case "medical-supplies":
          productHTML = `
            <div style="margin: 10px 0;">
              <p><strong>Medical Supplies:</strong></p>
              <p>Supply Type: [Supply Type]</p>
              <p>Brand: [Brand Name]</p>
              <p>Quantity: [Quantity/Package Size]</p>
              <p>Unit Price: {currencySymbol}[Unit Price]</p>
              <p>Total Price: {currencySymbol}[Total Price]</p>
              <p>Sterility: [Sterile/Non-sterile]</p>
              <p>Expiration: [Expiration Date]</p>
            </div>
          `;
          break;
        case "laboratory-test":
          productHTML = `
            <div style="margin: 10px 0;">
              <p><strong>Laboratory Test:</strong></p>
              <p>Test Name: [Test Name]</p>
              <p>Test Code: [CPT/Lab Code]</p>
              <p>Test Type: [Blood/Urine/Culture/Imaging]</p>
              <p>Processing Time: [Turnaround Time]</p>
              <p>Price: {currencySymbol}[Test Price]</p>
              <p>Requirements: [Fasting/Special Instructions]</p>
            </div>
          `;
          break;
        case "treatment-package":
          productHTML = `
            <div style="margin: 10px 0;">
              <p><strong>Treatment Package:</strong></p>
              <p>Package Name: [Treatment Package]</p>
              <p>Services Included: [Included Services]</p>
              <p>Duration: [Treatment Duration]</p>
              <p>Provider: [Healthcare Provider]</p>
              <p>Package Price: {currencySymbol}[Package Price]</p>
              <p>Coverage: [Insurance Coverage]</p>
              <p>Follow-up: [Follow-up Included]</p>
            </div>
          `;
          break;
      }

      // Create product info element
      const productDiv = document.createElement("div");
      productDiv.innerHTML = productHTML;

      // Insert product info
      range.insertNode(productDiv);

      // Move cursor after the product info
      range.setStartAfter(productDiv);
      range.collapse(true);

      // Update selection
      selection?.removeAllRanges();
      selection?.addRange(range);

      // Update document content
      setDocumentContent(textareaRef.innerHTML);

      // Focus editor
      textareaRef.focus();

      // Close dialog immediately
      setShowInsertProductDialog(false);

      // Small delay to ensure state update
      setTimeout(() => {
        toast({
          title: "✓ Product Information Inserted",
          description: "Product details have been added to your document",
          duration: 2000,
        });
      }, 100);
    } catch (error) {
      console.error("Product insertion error:", error);
      // Close dialog on error too
      setShowInsertProductDialog(false);
      toast({
        title: "Error",
        description: "Failed to insert product information",
        duration: 3000,
      });
    }
  };
  const handleImage = () => {
    try {
      // Create a file input element
      const input = document.createElement("input");
      input.type = "file";
      input.accept = "image/*";
      input.style.display = "none";

      input.onchange = (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = (event) => {
            const imageData = event.target?.result as string;

            if (!textareaRef) {
              toast({
                title: "Error",
                description: "Document editor not ready",
                duration: 3000,
              });
              return;
            }

            // Get current selection/cursor position for contentEditable
            const selection = window.getSelection();
            let range: Range | null = null;

            if (selection && selection.rangeCount > 0) {
              range = selection.getRangeAt(0);
            } else {
              // If no selection, create range at the end of content
              range = document.createRange();
              if (textareaRef && textareaRef.childNodes.length > 0) {
                range.setStartAfter(textareaRef.lastChild!);
              } else if (textareaRef) {
                range.setStart(textareaRef, 0);
              }
              range.collapse(true);
            }

            // Create image element
            const img = document.createElement("img");
            img.src = imageData;
            img.alt = file.name;
            img.style.maxWidth = "100%";
            img.style.height = "auto";
            img.style.display = "block";
            img.style.margin = "10px 0";

            // Insert image at cursor position
            if (range && textareaRef) {
              range.deleteContents();
              range.insertNode(img);

              // Move cursor after the image
              range.setStartAfter(img);
              range.collapse(true);

              // Update selection
              selection?.removeAllRanges();
              selection?.addRange(range);

              // Update document content
              setDocumentContent(textareaRef.innerHTML);

              // Focus the editor
              textareaRef.focus();
            }

            toast({
              title: "✓ Image Inserted",
              description: `Image "${file.name}" added to document`,
              duration: 2000,
            });
          };
          reader.readAsDataURL(file);
        }

        // Clean up
        document.body.removeChild(input);
      };

      // Add to DOM and trigger click
      document.body.appendChild(input);
      input.click();
    } catch (error) {
      console.error("Image insertion error:", error);
      toast({
        title: "Error",
        description: "Failed to insert image",
        duration: 3000,
      });
    }
  };
  const handleLink = () => {
    // Get current selection
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      setSavedSelection(range.cloneRange());

      // If text is selected, use it as link text
      const selectedText = selection.toString();
      if (selectedText) {
        setLinkText(selectedText);
      } else {
        setLinkText("");
      }
    } else {
      setSavedSelection(null);
      setLinkText("");
    }

    setLinkUrl("");
    setShowLinkDialog(true);
  };

  const handleInsertLink = () => {
    if (!linkUrl.trim()) {
      toast({
        title: "URL Required",
        description: "Please enter a valid URL",
        duration: 3000,
      });
      return;
    }

    // Validate and fix URL format
    let validUrl = linkUrl.trim();

    // Add https:// if no protocol is specified
    if (!validUrl.startsWith("http://") && !validUrl.startsWith("https://")) {
      validUrl = "https://" + validUrl;
    }

    // Basic URL validation
    try {
      new URL(validUrl);
    } catch (error) {
      toast({
        title: "Invalid URL",
        description: "Please enter a valid URL (e.g., https://example.com)",
        duration: 3000,
      });
      return;
    }

    if (!textareaRef) {
      toast({
        title: "Error",
        description: "Document editor not ready",
        duration: 3000,
      });
      return;
    }

    try {
      const selection = window.getSelection();
      let range = savedSelection;

      if (!range && selection && selection.rangeCount > 0) {
        range = selection.getRangeAt(0);
      }

      if (!range) {
        // Create range at the end of content
        range = document.createRange();
        if (textareaRef && textareaRef.childNodes.length > 0) {
          range.setStartAfter(textareaRef.lastChild!);
        } else if (textareaRef) {
          range.setStart(textareaRef, 0);
        }
        range.collapse(true);
      }

      // Create link element
      const link = document.createElement("a");
      link.href = validUrl;
      link.textContent = linkText || linkUrl;
      link.style.color = "#2563eb";
      link.style.textDecoration = "underline";
      link.target = "_blank";

      // Insert link
      range.deleteContents();
      range.insertNode(link);

      // Move cursor after the link
      range.setStartAfter(link);
      range.collapse(true);

      // Update selection
      selection?.removeAllRanges();
      selection?.addRange(range);

      // Update document content
      setDocumentContent(textareaRef.innerHTML);

      // Focus editor
      textareaRef.focus();

      // Close dialog and reset
      setShowLinkDialog(false);
      setLinkUrl("");
      setLinkText("");
      setSavedSelection(null);

      toast({
        title: "✓ Link Inserted",
        description: `Link "${linkText || linkUrl}" added to document`,
        duration: 2000,
      });
    } catch (error) {
      console.error("Link insertion error:", error);
      toast({
        title: "Error",
        description: "Failed to insert link",
        duration: 3000,
      });
    }
  };
  const handleHighlight = () => {
    const selection = window.getSelection();
    if (
      !selection ||
      selection.rangeCount === 0 ||
      selection.toString().trim() === ""
    ) {
      toast({
        title: "Select Text",
        description: "Please select text to apply highlighting",
        duration: 3000,
      });
      return;
    }

    try {
      // Apply yellow background highlighting using document.execCommand
      document.execCommand("hiliteColor", false, "#FFFF00");

      // Update the document content state
      if (textareaRef) {
        setDocumentContent(textareaRef.innerHTML);
      }

      toast({
        title: "✓ Text Highlighted",
        description: "Yellow highlighting applied to selected text",
        duration: 2000,
      });
    } catch (error) {
      console.error("Highlight error:", error);
      toast({
        title: "Error",
        description: "Failed to apply highlighting",
        duration: 3000,
      });
    }
  };
  const handleClock = () => {
    try {
      // Get current date and time
      const now = new Date();
      const currentTime = now.toLocaleString("en-GB", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });

      // Insert the time at cursor position
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        range.deleteContents();
        range.insertNode(document.createTextNode(currentTime));

        // Move cursor to end of inserted text
        range.setStartAfter(range.endContainer);
        range.collapse(true);
        selection.removeAllRanges();
        selection.addRange(range);
      } else {
        // If no selection, try to insert at the end of the content
        if (textareaRef) {
          const currentContent = textareaRef.innerHTML || "";
          textareaRef.innerHTML = currentContent + currentTime;
          setDocumentContent(textareaRef.innerHTML);
        }
      }

      // Update the document content state
      if (textareaRef) {
        setDocumentContent(textareaRef.innerHTML);
      }

      toast({
        title: "✓ Time Inserted",
        description: `Current date and time inserted: ${currentTime}`,
        duration: 2000,
      });
    } catch (error) {
      console.error("Insert time error:", error);
      toast({
        title: "Error",
        description: "Failed to insert current time",
        duration: 3000,
      });
    }
  };
  const handleMore = () => {
    setShowMoreOptionsDialog(true);
  };

  const loadTemplate = async (templateId: number) => {
    try {
      const response = await fetch(`/api/documents/${templateId}`, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("auth_token")}`,
          "X-Tenant-Subdomain": localStorage.getItem("user_subdomain") || "",
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const template = await response.json();
      setDocumentContent(template.content);

      // Update the editor content
      if (textareaRef) {
        textareaRef.innerHTML = template.content;
      }

      toast({
        title: "✓ Template Loaded",
        description: `Template "${template.name}" loaded successfully`,
        duration: 3000,
      });

      setShowTemplateDialog(false);
    } catch (error) {
      console.error("Template loading error:", error);
      toast({
        title: "Error",
        description: "Failed to load template. Please try again.",
        duration: 3000,
      });
    }
  };

  const handleSave = async () => {
    try {
      if (
        !documentContent ||
        documentContent.trim() === "" ||
        documentContent.replace(/<[^>]*>/g, "").trim() === ""
      ) {
        setShowEmptyContentDialog(true);
        return;
      }

      // Get current date for the document
      const now = new Date();
      const documentName = `Document_${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}_${String(now.getHours()).padStart(2, "0")}-${String(now.getMinutes()).padStart(2, "0")}`;

      // Create template data
      const templateData = {
        name: documentName,
        content: documentContent,
        type: "medical_form",
        isTemplate: true,
        metadata: {
          subject: "Medical Form Template",
          recipient: "Patient",
          location: clinicInfo.name || "Clinic",
          practitioner: "Dr. Provider",
          header: selectedHeader,
          templateUsed: "Custom Form",
        },
      };

      // Save to database
      const response = await fetch("/api/documents", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("auth_token")}`,
          "X-Tenant-Subdomain": localStorage.getItem("user_subdomain") || "",
        },
        body: JSON.stringify(templateData),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const savedTemplate = await response.json();

      // Invalidate and refetch templates query to refresh the list
      await queryClient.invalidateQueries({
        queryKey: ["/api/documents/templates"],
        refetchType: 'active'
      });

      // Show success modal
      setSavedTemplateName(documentName);
      setShowTemplateSaveSuccessModal(true);
    } catch (error) {
      console.error("Save error:", error);
      toast({
        title: "Error",
        description: "Failed to save document to database. Please try again.",
        duration: 3000,
      });
    }
  };

  const handleDownload = async () => {
    try {
      if (
        !documentContent ||
        documentContent.trim() === "" ||
        documentContent.replace(/<[^>]*>/g, "").trim() === ""
      ) {
        setShowEmptyContentDialog(true);
        return;
      }

      // Get the contentEditable div element
      const element = document.getElementById("document-content-area");
      if (!element) {
        throw new Error("Content area not found");
      }

      // Show loading toast
      toast({
        title: "⏳ Generating PDF...",
        description: "Please wait while we convert your document to PDF",
        duration: 2000,
      });

      // Use html2canvas to capture the content area
      const canvas = await html2canvas(element, {
        scale: 2, // Higher resolution
        useCORS: true,
        allowTaint: true,
        backgroundColor: "#ffffff",
        width: element.scrollWidth,
        height: element.scrollHeight,
      });

      // Create PDF
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      // Calculate dimensions for PDF
      const imgWidth = 210; // A4 width in mm
      const pageHeight = 295; // A4 height in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;

      // Add image to PDF
      const imgData = canvas.toDataURL("image/png");
      pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      // Add additional pages if content is longer than one page
      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      // Download the PDF
      const fileName = `Medical_Form_${new Date().toISOString().slice(0, 10)}.pdf`;
      pdf.save(fileName);

      toast({
        title: "✓ PDF Download Started",
        description: "Your document has been converted to PDF successfully",
        duration: 3000,
      });
    } catch (error) {
      console.error("PDF Download error:", error);
      toast({
        title: "Error",
        description: "Failed to generate PDF. Please try again.",
        duration: 3000,
        variant: "destructive",
      });
    }
  };

  const handlePrint = () => {
    try {
      if (
        !documentContent ||
        documentContent.trim() === "" ||
        documentContent.replace(/<[^>]*>/g, "").trim() === ""
      ) {
        setShowEmptyContentDialog(true);
        return;
      }

      // Create a new window for printing
      const printWindow = window.open("", "_blank");
      if (!printWindow) {
        toast({
          title: "Error",
          description:
            "Unable to open print window. Please check popup settings.",
          duration: 3000,
          variant: "destructive",
        });
        return;
      }

      // Create the print document with proper styling
      const printContent = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Print - Medical Form</title>
    <style>
        body {
            font-family: ${fontFamily};
            font-size: ${fontSize};
            line-height: 1.6;
            margin: 20px;
            color: #000;
            background: white;
        }
        @media print {
            body { margin: 15px; }
            @page { margin: 1cm; }
        }
    </style>
</head>
<body>
    ${documentContent}
</body>
</html>`;

      printWindow.document.write(printContent);
      printWindow.document.close();

      // Wait for content to load then print
      printWindow.onload = () => {
        printWindow.print();
        printWindow.close();
      };

      toast({
        title: "✓ Print Dialog Opened",
        description: "Print dialog has been opened for the document",
        duration: 3000,
      });
    } catch (error) {
      console.error("Print error:", error);
      toast({
        title: "Error",
        description: "Failed to open print dialog. Please try again.",
        duration: 3000,
        variant: "destructive",
      });
    }
  };

  const handleMoreOption = (optionType: string) => {
    if (!textareaRef) {
      toast({
        title: "Error",
        description: "Document editor not ready",
        duration: 3000,
      });
      return;
    }

    try {
      const selection = window.getSelection();
      let range;

      if (selection && selection.rangeCount > 0) {
        range = selection.getRangeAt(0);
      } else {
        range = document.createRange();
        if (textareaRef && textareaRef.childNodes.length > 0) {
          range.setStartAfter(textareaRef.lastChild!);
        } else if (textareaRef) {
          range.setStart(textareaRef, 0);
        }
        range.collapse(true);
      }

      let optionHTML = "";

      switch (optionType) {
        case "table":
          optionHTML = `
            <table style="border-collapse: collapse; width: 100%; margin: 10px 0;">
              <tr>
                <th style="border: 1px solid #ddd; padding: 8px; background-color: #f2f2f2;">&nbsp;</th>
                <th style="border: 1px solid #ddd; padding: 8px; background-color: #f2f2f2;">&nbsp;</th>
                <th style="border: 1px solid #ddd; padding: 8px; background-color: #f2f2f2;">&nbsp;</th>
              </tr>
              <tr>
                <td style="border: 1px solid #ddd; padding: 8px;">&nbsp;</td>
                <td style="border: 1px solid #ddd; padding: 8px;">&nbsp;</td>
                <td style="border: 1px solid #ddd; padding: 8px;">&nbsp;</td>
              </tr>
              <tr>
                <td style="border: 1px solid #ddd; padding: 8px;">&nbsp;</td>
                <td style="border: 1px solid #ddd; padding: 8px;">&nbsp;</td>
                <td style="border: 1px solid #ddd; padding: 8px;">&nbsp;</td>
              </tr>
            </table>
          `;
          break;
        case "checkbox-list":
          optionHTML = `
            <div style="margin: 10px 0;">
              <p><strong>Checklist:</strong></p>
              <div style="margin-left: 20px;">
                <input type="checkbox" style="margin-right: 8px;"> [Task 1]<br>
                <input type="checkbox" style="margin-right: 8px;"> [Task 2]<br>
                <input type="checkbox" style="margin-right: 8px;"> [Task 3]<br>
                <input type="checkbox" style="margin-right: 8px;"> [Task 4]<br>
              </div>
            </div>
          `;
          break;
        case "horizontal-line":
          optionHTML = `<hr style="margin: 20px 0; border: 1px solid #ddd;">`;
          break;
        case "date-time":
          const now = new Date();
          const dateTime = now.toLocaleString();
          optionHTML = `<p><strong>Date & Time:</strong> ${dateTime}</p>`;
          break;
        case "signature-line":
          optionHTML = `
            <div style="margin: 30px 0;">
              <p>Signature: _________________________________</p>
              <p>Print Name: _________________________________</p>
              <p>Date: _________________________________</p>
            </div>
          `;
          break;
        case "text-box":
          optionHTML = `
            <div style="border: 2px solid #ddd; padding: 15px; margin: 10px 0; background-color: #f9f9f9;">
              <p><strong>Important Note:</strong></p>
              <p>[Insert important information here]</p>
            </div>
          `;
          break;
      }

      const optionDiv = document.createElement("div");
      optionDiv.innerHTML = optionHTML;

      range.insertNode(optionDiv);
      range.setStartAfter(optionDiv);
      range.collapse(true);

      selection?.removeAllRanges();
      selection?.addRange(range);

      setDocumentContent(textareaRef.innerHTML);
      textareaRef.focus();

      setShowMoreOptionsDialog(false);

      setTimeout(() => {
        toast({
          title: "✓ Additional Option Inserted",
          description: `${optionType.replace("-", " ")} has been added to your document`,
          duration: 2000,
        });
      }, 100);
    } catch (error) {
      console.error("More option insertion error:", error);
      setShowMoreOptionsDialog(false);
      toast({
        title: "Error",
        description: "Failed to insert additional option",
        duration: 3000,
      });
    }
  };
  const applyTextFormatting = (
    formatType: "paragraph" | "heading1" | "heading2" | "heading3" | "heading4" | "heading5" | "heading6",
  ) => {
    console.log("applyTextFormatting called with:", formatType);

    if (!textareaRef) {
      toast({
        title: "Editor Not Ready",
        description: "Please wait for the editor to load",
        duration: 2000,
      });
      return;
    }

    try {
      // Use document.execCommand for heading formatting
      const formatTag = formatType === "paragraph" ? "p" : formatType.replace("heading", "h");
      document.execCommand('formatBlock', false, `<${formatTag}>`);

      if (textareaRef) {
        setDocumentContent(textareaRef.innerHTML);
      }

      const titles = {
        paragraph: "✓ Paragraph",
        heading1: "✓ Heading 1",
        heading2: "✓ Heading 2",
        heading3: "✓ Heading 3",
        heading4: "✓ Heading 4",
        heading5: "✓ Heading 5",
        heading6: "✓ Heading 6",
      };

      toast({
        title: titles[formatType],
        description: `${formatType} formatting applied successfully`,
        duration: 2000,
      });
    } catch (error) {
      console.error("Error applying text formatting:", error);
      toast({
        title: "Formatting Error",
        description: "Failed to apply text formatting. Please try again.",
        duration: 3000,
      });
    }
  };

  const handleParagraph = () => {
    console.log("handleParagraph called");
    applyTextFormatting("paragraph");
  };

  const handleH1 = () => {
    console.log("handleH1 called");
    applyTextFormatting("heading1");
  };

  const handleH2 = () => {
    console.log("handleH2 called");
    applyTextFormatting("heading2");
  };

  const handleH3 = () => {
    console.log("handleH3 called");
    applyTextFormatting("heading3");
  };

  const handleH4 = () => {
    console.log("handleH4 called");
    applyTextFormatting("heading4");
  };

  const handleH5 = () => {
    console.log("handleH5 called");
    applyTextFormatting("heading5");
  };

  const handleH6 = () => {
    console.log("handleH6 called");
    applyTextFormatting("heading6");
  };

  const getFontFamilyFromValue = (fontValue: string) => {
    const fontMap: Record<string, string> = {
      "arial": 'Arial, "Helvetica Neue", Helvetica, sans-serif',
      "calibri": 'Calibri, "Trebuchet MS", "Lucida Grande", sans-serif',
      "times": '"Times New Roman", Times, Georgia, serif',
      "georgia": 'Georgia, "Times New Roman", serif',
      "verdana": 'Verdana, Geneva, "DejaVu Sans", sans-serif',
      "courier": '"Courier New", Courier, "Lucida Console", monospace',
    };
    return fontMap[fontValue] || 'Verdana, Geneva, "DejaVu Sans", sans-serif';
  };

  const loadHeaderToDocument = (header: any, footer: any) => {
    if (!textareaRef) {
      toast({
        title: "Editor Not Ready",
        description: "Please wait for the editor to load",
        duration: 2000,
      });
      return;
    }

    try {
      let headerHTML = '';
      const borderColor = footer?.backgroundColor || '#4A7DFF';
      const titleColor = footer?.backgroundColor || '#4A7DFF';
      const fontFamily = getFontFamilyFromValue(header.fontFamily || 'verdana');
      const fontSize = header.fontSize || '12pt';
      const fontWeight = header.fontWeight || 'normal';
      const fontStyle = header.fontStyle || 'normal';
      const textDecoration = header.textDecoration || 'none';

      if (header.logoPosition === 'left') {
        headerHTML = `
          <div style="border-bottom: 3px solid ${borderColor}; padding-bottom: 20px; margin-bottom: 20px;">
            <div style="display: flex; align-items: flex-start; gap: 20px;">
              ${header.logoBase64 ? `<img src="${header.logoBase64}" alt="Clinic Logo" style="max-height: 80px; object-fit: contain;">` : ''}
              <div style="flex: 1;">
                <h1 style="margin: 0; font-size: 24px; font-weight: bold; color: ${titleColor};">${header.clinicName}</h1>
                ${header.address ? `<p style="margin: 5px 0; color: #666; font-family: ${fontFamily}; font-size: ${fontSize}; font-weight: ${fontWeight}; font-style: ${fontStyle}; text-decoration: ${textDecoration};">${header.address}</p>` : ''}
                ${header.phone || header.email ? `<p style="margin: 5px 0; color: #666; font-family: ${fontFamily}; font-size: ${fontSize}; font-weight: ${fontWeight}; font-style: ${fontStyle}; text-decoration: ${textDecoration};">${header.phone}${header.phone && header.email ? ' • ' : ''}${header.email}</p>` : ''}
                ${header.website ? `<p style="margin: 5px 0; color: #666; font-family: ${fontFamily}; font-size: ${fontSize}; font-weight: ${fontWeight}; font-style: ${fontStyle}; text-decoration: ${textDecoration};">${header.website}</p>` : ''}
              </div>
            </div>
          </div>
        `;
      } else if (header.logoPosition === 'center') {
        headerHTML = `
          <div style="border-bottom: 3px solid ${borderColor}; padding-bottom: 20px; margin-bottom: 20px;">
            <div style="display: flex; align-items: flex-start; justify-content: center; gap: 20px;">
              ${header.logoBase64 ? `<img src="${header.logoBase64}" alt="Clinic Logo" style="max-height: 80px; object-fit: contain;">` : ''}
              <div style="text-align: center;">
                <h1 style="margin: 0; font-size: 24px; font-weight: bold; color: ${titleColor};">${header.clinicName}</h1>
                ${header.address ? `<p style="margin: 5px 0; color: #666; font-family: ${fontFamily}; font-size: ${fontSize}; font-weight: ${fontWeight}; font-style: ${fontStyle}; text-decoration: ${textDecoration};">${header.address}</p>` : ''}
                ${header.phone || header.email ? `<p style="margin: 5px 0; color: #666; font-family: ${fontFamily}; font-size: ${fontSize}; font-weight: ${fontWeight}; font-style: ${fontStyle}; text-decoration: ${textDecoration};">${header.phone}${header.phone && header.email ? ' • ' : ''}${header.email}</p>` : ''}
                ${header.website ? `<p style="margin: 5px 0; color: #666; font-family: ${fontFamily}; font-size: ${fontSize}; font-weight: ${fontWeight}; font-style: ${fontStyle}; text-decoration: ${textDecoration};">${header.website}</p>` : ''}
              </div>
            </div>
          </div>
        `;
      } else if (header.logoPosition === 'right') {
        headerHTML = `
          <div style="border-bottom: 3px solid ${borderColor}; padding-bottom: 20px; margin-bottom: 20px;">
            <div style="display: flex; align-items: flex-start; gap: 20px; flex-direction: row-reverse;">
              ${header.logoBase64 ? `<img src="${header.logoBase64}" alt="Clinic Logo" style="max-height: 80px; object-fit: contain;">` : ''}
              <div style="flex: 1; text-align: right;">
                <h1 style="margin: 0; font-size: 24px; font-weight: bold; color: ${titleColor};">${header.clinicName}</h1>
                ${header.address ? `<p style="margin: 5px 0; color: #666; font-family: ${fontFamily}; font-size: ${fontSize}; font-weight: ${fontWeight}; font-style: ${fontStyle}; text-decoration: ${textDecoration};">${header.address}</p>` : ''}
                ${header.phone || header.email ? `<p style="margin: 5px 0; color: #666; font-family: ${fontFamily}; font-size: ${fontSize}; font-weight: ${fontWeight}; font-style: ${fontStyle}; text-decoration: ${textDecoration};">${header.phone}${header.phone && header.email ? ' • ' : ''}${header.email}</p>` : ''}
                ${header.website ? `<p style="margin: 5px 0; color: #666; font-family: ${fontFamily}; font-size: ${fontSize}; font-weight: ${fontWeight}; font-style: ${fontStyle}; text-decoration: ${textDecoration};">${header.website}</p>` : ''}
              </div>
            </div>
          </div>
        `;
      }

      // Ensure there's always an editable area after the header
      const editableContent = documentContent || '<p><br></p>';
      const updatedContent = headerHTML + editableContent;
      setDocumentContent(updatedContent);
      setShowViewClinicInfoDialog(false);

      // Ensure editor remains editable and focused after state update
      setTimeout(() => {
        const editor = document.getElementById('document-content-area');
        if (editor) {
          editor.focus();
          // Move cursor to the end of the document
          const range = document.createRange();
          const sel = window.getSelection();
          range.selectNodeContents(editor);
          range.collapse(false);
          sel?.removeAllRanges();
          sel?.addRange(range);
        }
      }, 150);

      toast({
        title: "✓ Header Loaded",
        description: `Clinic header (${header.logoPosition} position) loaded into document`,
        duration: 3000,
      });
    } catch (error) {
      console.error("Error loading header:", error);
      toast({
        title: "Load Error",
        description: "Failed to load header into document",
        variant: "destructive",
        duration: 3000,
      });
    }
  };

  const loadFooterToDocument = (footer: any) => {
    if (!textareaRef) {
      toast({
        title: "Editor Not Ready",
        description: "Please wait for the editor to load",
        duration: 2000,
      });
      return;
    }

    try {
      const footerHTML = `
        <div style="margin-top: 40px; padding: 20px; text-align: center; background-color: ${footer.backgroundColor}; color: ${footer.textColor};">
          <p style="margin: 0; font-size: 14px; font-weight: 500;">${footer.footerText}</p>
          ${footer.showSocial && (footer.facebook || footer.twitter || footer.linkedin) ? `
            <div style="margin-top: 12px; display: flex; justify-content: center; gap: 16px;">
              ${footer.facebook ? '<span style="font-size: 12px;">📘 Facebook</span>' : ''}
              ${footer.twitter ? '<span style="font-size: 12px;">🐦 Twitter</span>' : ''}
              ${footer.linkedin ? '<span style="font-size: 12px;">💼 LinkedIn</span>' : ''}
            </div>
          ` : ''}
        </div>
      `;

      // Ensure there's always an editable area before the footer
      const editableContent = documentContent || '<p><br></p>';
      const updatedContent = editableContent + footerHTML;
      setDocumentContent(updatedContent);
      setShowViewClinicInfoDialog(false);

      // Ensure editor remains editable and focused after state update
      setTimeout(() => {
        const editor = document.getElementById('document-content-area');
        if (editor) {
          editor.focus();
          // Move cursor to the end of the document
          const range = document.createRange();
          const sel = window.getSelection();
          range.selectNodeContents(editor);
          range.collapse(false);
          sel?.removeAllRanges();
          sel?.addRange(range);
        }
      }, 150);

      toast({
        title: "✓ Footer Loaded",
        description: "Clinic footer loaded to bottom of document",
        duration: 3000,
      });
    } catch (error) {
      console.error("Error loading footer:", error);
      toast({
        title: "Load Error",
        description: "Failed to load footer into document",
        variant: "destructive",
        duration: 3000,
      });
    }
  };

  const getFontFamilyCSS = (fontFamilyValue: string) => {
    let fontFamilyCSS = "";
    switch (fontFamilyValue) {
      case "arial":
        fontFamilyCSS = 'Arial, "Helvetica Neue", Helvetica, sans-serif';
        break;
      case "calibri":
        fontFamilyCSS = 'Calibri, "Trebuchet MS", "Lucida Grande", sans-serif';
        break;
      case "cambria":
        fontFamilyCSS = 'Cambria, "Times New Roman", Georgia, serif';
        break;
      case "comic-sans":
        fontFamilyCSS = '"Comic Sans MS", "Chalkboard SE", cursive';
        break;
      case "verdana":
        fontFamilyCSS = 'Verdana, Geneva, "DejaVu Sans", sans-serif';
        break;
      case "times":
        fontFamilyCSS = '"Times New Roman", Times, Georgia, serif';
        break;
      case "courier":
        fontFamilyCSS = '"Courier New", Courier, "Lucida Console", monospace';
        break;
      case "open-sans":
        fontFamilyCSS = '"Open Sans", "Helvetica Neue", Arial, sans-serif';
        break;
      case "georgia":
        fontFamilyCSS = 'Georgia, "Times New Roman", serif';
        break;
      case "helvetica":
        fontFamilyCSS = "Helvetica, Arial, sans-serif";
        break;
      case "consolas":
        fontFamilyCSS = 'Consolas, "Lucida Console", monospace';
        break;
      case "franklin":
        fontFamilyCSS = '"Franklin Gothic Medium", Arial, sans-serif';
        break;
      case "garamond":
        fontFamilyCSS = 'Garamond, "Times New Roman", serif';
        break;
      case "impact":
        fontFamilyCSS = "Impact, Arial Black, sans-serif";
        break;
      case "lato":
        fontFamilyCSS = "Lato, Arial, sans-serif";
        break;
      case "lucida":
        fontFamilyCSS = '"Lucida Console", Consolas, monospace';
        break;
      case "palatino":
        fontFamilyCSS = 'Palatino, "Times New Roman", serif';
        break;
      case "segoe":
        fontFamilyCSS = '"Segoe UI", Arial, sans-serif';
        break;
      case "tahoma":
        fontFamilyCSS = "Tahoma, Arial, sans-serif";
        break;
      case "trebuchet":
        fontFamilyCSS = '"Trebuchet MS", Arial, sans-serif';
        break;
      default:
        fontFamilyCSS = 'Verdana, Geneva, "DejaVu Sans", sans-serif';
    }
    return fontFamilyCSS;
  };

  // Map font values to CSS classes (avoiding inline styles)
  const getFontClass = (fontValue: string): string => {
    const fontClasses: Record<string, string> = {
      arial: "font-arial",
      cambria: "font-cambria",
      courier: "font-courier",
      garamond: "font-garamond",
      "comic-sans": "font-comic-sans",
      georgia: "font-georgia",
      helvetica: "font-helvetica",
      times: "font-times",
      trebuchet: "font-trebuchet",
      verdana: "font-verdana",
      tahoma: "font-tahoma",
      consolas: "font-consolas",
      lato: "font-lato",
      "open-sans": "font-open-sans",
      franklin: "font-franklin",
    };

    return fontClasses[fontValue] || "font-arial";
  };

  const applyFontFamily = (fontFamilyValue: string) => {
    console.log("applyFontFamily called with:", fontFamilyValue);

    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) {
      toast({
        title: "Select Text",
        description: "Please select text to change font family",
        duration: 2000,
      });
      return;
    }

    const range = selection.getRangeAt(0);
    const selectedText = range.toString();

    console.log("Font family selection:", { selectedText, fontFamilyValue });

    if (!selectedText) {
      toast({
        title: "Select Text",
        description: "Please select text to change font family",
        duration: 2000,
      });
      return;
    }

    // Get the font family name for CSS with distinct fallbacks
    const fontFamilyCSS = getFontFamilyCSS(fontFamilyValue);

    try {
      // Create a new span with the font family applied using inline style with !important
      const span = document.createElement("span");
      span.style.setProperty('font-family', fontFamilyCSS, 'important');
      span.textContent = selectedText;

      // Replace the selected content with the new span
      range.deleteContents();
      range.insertNode(span);

      console.log("Applied font family:", {
        fontFamily: fontFamilyCSS,
        selectedText,
      });

      // Update the document content state from the contentEditable div
      if (textareaRef) {
        const updatedContent = textareaRef.innerHTML;
        setDocumentContent(updatedContent);
        console.log("Updated content:", updatedContent);
      }

      // Keep the text selected - select the newly created span
      const newRange = document.createRange();
      newRange.selectNodeContents(span);
      selection.removeAllRanges();
      selection.addRange(newRange);

      if (textareaRef) {
        textareaRef.focus();
      }

      toast({
        title: "✓ Font Applied",
        description: `Font family changed to ${fontFamilyValue}`,
        duration: 2000,
      });
    } catch (error) {
      console.error("Error applying font family:", error);
      toast({
        title: "Error",
        description: `Failed to apply font family`,
        duration: 3000,
      });
    }
  };

  const applyFontSize = (fontSizeValue: string) => {
    const selection = window.getSelection();
    let selectedText = "";
    let range: Range | undefined;

    // Check if text is selected
    if (selection && selection.rangeCount > 0) {
      range = selection.getRangeAt(0);
      selectedText = range.toString();
    }

    // If no text selected, create sample text with font size
    if (!selectedText) {
      const placeholder = `Sample text at ${fontSizeValue}`;

      if (selection && selection.rangeCount > 0) {
        range = selection.getRangeAt(0);
        selectedText = placeholder;
      } else if (textareaRef) {
        // Insert at cursor or end of document
        textareaRef.focus();
        const content = textareaRef.value;
        const newContent =
          content + (content.endsWith("\n") ? "" : "\n") + placeholder;
        textareaRef.value = newContent;
        setDocumentContent(newContent);

        toast({
          title: "✓ Font Size Applied",
          description: `Font size changed to ${fontSizeValue} with sample text`,
          duration: 2000,
        });
        return;
      } else {
        selectedText = placeholder;
      }
    }

    // Create a span with the font size applied
    const span = document.createElement("span");
    span.className = "custom-font-override";
    span.setAttribute("style", `font-size: ${fontSizeValue} !important;`);
    span.textContent = selectedText;

    // Replace the selected content with the new span
    if (range) {
      range.deleteContents();
      range.insertNode(span);
    } else if (textareaRef) {
      textareaRef.innerHTML += span.outerHTML;
    }

    // Update the document content state
    if (textareaRef) {
      setDocumentContent(textareaRef.innerHTML);
    }

    // Clear selection
    selection?.removeAllRanges();

    toast({
      title: "✓ Font Size Applied",
      description: `Font size changed to ${fontSizeValue}`,
      duration: 2000,
    });
  };

  return (
    <div className="h-screen flex flex-col bg-gray-100 dark:bg-[hsl(var(--cura-midnight))] forms-page-ui page-zoom-90">
      {/* Page Header - Like Dashboard */}
      <div className="flex items-center justify-between mr-5 bg-white dark:bg-[hsl(var(--cura-midnight))] px-2 py-1 rounded border-b border-gray-200 dark:border-gray-700">
        <div className="flex-1">
          <Header
            title="Forms"
            subtitle="Create and manage medical forms, letters, and documents"
            hideNotificationBell={true}
          />
        </div>
        <div className="flex items-center gap-4 px-4 bg-neutral-50/50 dark:bg-neutral-800/50 py-1.5 rounded-xl border border-neutral-200/50 dark:border-neutral-700/50 shadow-sm">
          <div className="flex items-center gap-2 pr-4 border-r border-neutral-200 dark:border-neutral-700">
            <span className="text-sm font-medium text-neutral-600 dark:text-neutral-400">Theme:</span>
            <ThemeToggle />
          </div>
          <div className="flex items-center">
            <NotificationBell />
          </div>
          {/* Sign out placed immediately after Notification button */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              try { logout(); } catch {}
              window.location.href = "/auth/login";
            }}
            title="Sign out"
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">Sign out</span>
          </Button>
        </div>
      </div>

      {/* Scrollable Content Wrapper */}
      <div className="flex-1 overflow-y-auto">
        <div className="px-5 py-5 space-y-5 bg-gray-50 dark:bg-[#090b13] border-b border-dashed border-gray-200 dark:border-gray-800">
          <Tabs
            value={activeFormsTab}
            onValueChange={(value) => setActiveFormsTab(value as FormsTab)}
            defaultValue="dynamic"
            className="w-full space-y-5"
          >
            <TabsList className={`grid w-full mb-4 ${userIsPatient ? 'grid-cols-1' : 'grid-cols-3'}`}>
              {!userIsPatient && (
                <>
                  <TabsTrigger value="dynamic">
                    Dynamic Form Builder
                  </TabsTrigger>
                  <TabsTrigger value="saved">
                    Custom/Template Forms
                  </TabsTrigger>
                </>
              )}
              <TabsTrigger value="filled">
                Filled Forms(responses)
              </TabsTrigger>
              {/* Document Editor tab hidden */}
              {false && !userIsPatient && (
                <TabsTrigger value="editor">
                  Document Editor
                </TabsTrigger>
              )}
            </TabsList>

            {!userIsPatient && (
              <>
                <TabsContent
                  value="dynamic"
                  className="space-y-5 rounded-3xl border border-gray-200 bg-white p-5 shadow-lg shadow-black/10 dark:border-gray-800 dark:bg-[#05070f] dark:text-slate-100"
                >
                  <div className="space-y-2">
                    <p className="text-sm font-semibold text-gray-600 dark:text-gray-300">Dynamic Form Builder</p>
                    <p className="text-xs text-gray-500 dark:text-gray-500">
                      Sections, fields, and sharing logic are now fully dynamic. Build once and send secure links to patients via email.
                    </p>
                  </div>
                  <FormBuilder
                    loadForm={formLoadPayload}
                    onLoadComplete={() => setFormLoadPayload(undefined)}
                  />
                </TabsContent>
                <TabsContent
                  value="saved"
                  className="space-y-5 rounded-3xl border border-gray-200 bg-white p-5 shadow-lg shadow-black/10 dark:border-gray-800 dark:bg-[#05070f] dark:text-slate-100"
                >
                  <Tabs value={customTemplateTab} onValueChange={(v) => setCustomTemplateTab(v as "custom" | "templates")} className="w-full">
                    <TabsList className="grid w-full grid-cols-2 mb-4">
                      <TabsTrigger value="custom">Custom Forms</TabsTrigger>
                      <TabsTrigger value="templates">Form Templates</TabsTrigger>
                    </TabsList>
                    <TabsContent value="custom" className="space-y-4 mt-4">
                      <div className="flex items-center justify-between flex-wrap gap-4">
                        <div>
                          <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">Custom Forms</h3>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Forms you have created and saved. Edit, share, or manage links below. Send one of your saved dynamic forms to a patient using a secure link.</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-400">Auto synced</span>
                          <span className="h-5 border-l border-gray-300 dark:border-gray-600" />
                          <Button
                            size="sm"
                            variant={savedViewMode === "grid" ? "default" : "outline"}
                            onClick={() => setSavedViewMode("grid")}
                            className="px-3"
                          >
                            Grid
                          </Button>
                          <Button
                            size="sm"
                            variant={savedViewMode === "list" ? "default" : "outline"}
                            onClick={() => setSavedViewMode("list")}
                            className="px-3"
                          >
                            List
                          </Button>
                        </div>
                      </div>
                      {formsLoading ? (
                        <p className="text-sm text-gray-500 dark:text-gray-400">Loading saved forms…</p>
                      ) : savedForms.length === 0 ? (
                        <p className="text-sm text-gray-500 dark:text-gray-400">No forms saved yet. Create one above or use a template below to start sharing.</p>
                      ) : savedViewMode === "list" ? (
                        <div className="border border-gray-200 dark:border-gray-800 rounded-lg overflow-hidden bg-white dark:bg-[#0b0c16]">
                          <div className="overflow-x-auto">
                            <table className="w-full min-w-[880px] text-sm text-left border-collapse">
                              <thead className="bg-gray-50 dark:bg-gray-800/80 border-b border-gray-200 dark:border-gray-700">
                                <tr>
                                  <th className="px-3 py-2.5 font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider text-xs">Form ID</th>
                                  <th className="px-3 py-2.5 font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider text-xs">Form Name</th>
                                  <th className="px-3 py-2.5 font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider text-xs">Created At</th>
                                  <th className="px-3 py-2.5 font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider text-xs">Updated At</th>
                                  <th className="px-3 py-2.5 font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider text-xs">Status</th>
                                  <th className="px-3 py-2.5 text-center font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider text-xs w-10"></th>
                                  <th className="px-3 py-2.5 font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider text-xs">Created By</th>
                                  <th className="px-3 py-2.5 font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider text-xs">Share / View / Links</th>
                                  <th className="px-3 py-2.5 text-center font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider text-xs w-12">Actions</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                {savedFormsToDisplay.map((form) => {
                                  const creatorId =
                                    form.createdBy ??
                                    (form as any).metadata?.createdBy ??
                                    (form as any).metadata?.created_by ??
                                    (form as any).metadata?.userId;
                                  const creator = creatorId ? creatorsById.get(Number(creatorId)) : undefined;
                                  return (
                                    <tr key={form.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                                      <td className="px-3 py-2.5 text-gray-700 dark:text-gray-300 font-mono text-xs">{form.id}</td>
                                      <td className="px-3 py-2.5 font-semibold text-gray-900 dark:text-gray-100">{form.title}</td>
                                      <td className="px-3 py-2.5 text-gray-600 dark:text-gray-400 text-xs">{form.createdAt ? new Date(form.createdAt).toLocaleString() : "—"}</td>
                                      <td className="px-3 py-2.5 text-gray-600 dark:text-gray-400 text-xs">{form.updatedAt ? new Date(form.updatedAt).toLocaleString() : "—"}</td>
                                      <td className="px-3 py-2.5">
                                        <Badge className="bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300 border-0 text-xs capitalize">{(form.status || "saved").toLowerCase()}</Badge>
                                      </td>
                                      <td className="px-3 py-2.5 text-center">
                                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-gray-500 hover:text-gray-700" onClick={() => loadFormIntoBuilder(form)} title="Edit">
                                          <Edit className="h-4 w-4" />
                                        </Button>
                                      </td>
                                      <td className="px-3 py-2.5 text-gray-600 dark:text-gray-400 text-xs">{creator ? creator.name : "—"}</td>
                                      <td className="px-3 py-2.5">
                                        <div className="flex items-center gap-1">
                                          <Button variant="outline" size="sm" className="h-8 w-8 p-0" onClick={() => openFormShareDialog(form)} title="Share" disabled={patientsLoading}>
                                            <Share2 className="h-4 w-4" />
                                          </Button>
                                          <Button variant="outline" size="sm" className="h-8 w-8 p-0" onClick={() => handleViewFormResponses(form)} title="View responses">
                                            <Eye className="h-4 w-4" />
                                          </Button>
                                          <Button variant="outline" size="sm" className="h-8 w-8 p-0" onClick={() => openShareLinksDialog(form)} title="Links">
                                            <Link className="h-4 w-4" />
                                          </Button>
                                        </div>
                                      </td>
                                      <td className="px-3 py-2.5 text-center">
                                        <DropdownMenu>
                                          <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                              <MoreVertical className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                                            </Button>
                                          </DropdownMenuTrigger>
                                          <DropdownMenuContent align="end">
                                            <DropdownMenuItem onClick={() => loadFormIntoBuilder(form)}>
                                              <Edit className="h-4 w-4 mr-2" />
                                              Edit
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => handleViewFormResponses(form)}>
                                              <Eye className="h-4 w-4 mr-2" />
                                              View responses
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => openShareLinksDialog(form)}>
                                              <Link className="h-4 w-4 mr-2" />
                                              Links
                                            </DropdownMenuItem>
                                            <DropdownMenuItem
                                              className="text-red-600 dark:text-red-400 focus:text-red-600"
                                              onClick={() => {
                                                setFormToDelete(form);
                                                setShowDeleteFormDialog(true);
                                              }}
                                              disabled={deleteFormMutation.isPending}
                                            >
                                              <Trash2 className="h-4 w-4 mr-2" />
                                              Delete
                                            </DropdownMenuItem>
                                          </DropdownMenuContent>
                                        </DropdownMenu>
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-3 max-h-[770px] overflow-y-auto pr-2">
                          {savedFormsToDisplay.map((form) => {
                            const creatorId =
                              form.createdBy ??
                              form.metadata?.createdBy ??
                              form.metadata?.created_by ??
                              form.metadata?.userId;
                            const creator = creatorId ? creatorsById.get(Number(creatorId)) : undefined;
                            return (
                              <div
                                key={form.id}
                                className="flex flex-col justify-between gap-4 p-4 border rounded-lg bg-white dark:bg-[#0b0c16] border-gray-200 dark:border-gray-800"
                              >
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2">
                                    <p className="font-semibold text-gray-800 dark:text-gray-100">{form.title}</p>
                                  </div>
                                  <p className="text-xs text-gray-500 dark:text-gray-400">{form.description || "No description provided."}</p>
                                  <p className="text-xs text-gray-400">Created {new Date(form.createdAt).toLocaleDateString()}</p>
                                  {creator && (
                                    <p className="text-xs text-gray-400">
                                      Created by {creator.name}
                                      {creator.email ? ` (${creator.email})` : ""}
                                    </p>
                                  )}
                                </div>
                                <div className="flex flex-wrap items-center justify-between gap-3">
                                  <div className="flex flex-wrap gap-2">
                                    <Button
                                      size="sm"
                                      className="px-3 py-1 rounded-md bg-gray-200 dark:bg-slate-700 text-black dark:text-white shadow-sm border border-transparent hover:bg-gray-300 dark:hover:bg-slate-600"
                                      onClick={() => openFormShareDialog(form)}
                                      disabled={patientsLoading}
                                    >
                                      Share
                                    </Button>
                                    <Button
                                      size="sm"
                                      className="px-3 py-1 rounded-md bg-[#4A7DFF] text-white shadow-sm border border-transparent hover:bg-[#2563eb]"
                                      onClick={() => handleViewFormResponses(form)}
                                    >
                                      View responses
                                    </Button>

                                    <Button
                                      size="sm"
                                      className="px-3 py-1 rounded-md bg-[#4A7DFF] text-white shadow-sm border border-transparent hover:bg-[#2563eb]"
                                      onClick={() => openShareLinksDialog(form)}
                                    >
                                      Links
                                    </Button>
                                    <Button
                                      size="sm"
                                      className="px-3 py-1 rounded-md bg-[#ef4444] text-white shadow-sm border border-transparent hover:bg-[#dc2626]"
                                      onClick={() => {
                                        setFormToDelete(form);
                                        setShowDeleteFormDialog(true);
                                      }}
                                      disabled={deleteFormMutation.isPending}
                                    >
                                      Delete
                                    </Button>
                                  </div>
                                  <div className="flex flex-wrap gap-2">
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => loadFormIntoBuilder(form)}
                                    >
                                      Edit
                                    </Button>
                                    {(!formSharesMap[form.id] || formSharesMap[form.id].length === 0) && user?.role === "patient" && (
                                      <Button
                                        size="sm"
                                        variant="secondary"
                                        disabled={!latestLinks[form.id]}
                                        asChild
                                      >
                                        <a
                                          href={latestLinks[form.id]}
                                          target="_blank"
                                          rel="noreferrer"
                                          className={!latestLinks[form.id] ? "pointer-events-none opacity-60" : ""}
                                        >
                                          Open Form
                                        </a>
                                      </Button>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </TabsContent>
                    <TabsContent value="templates" className="space-y-4 mt-4">
                      <div className="flex items-center justify-between flex-wrap gap-4">
                        <div>
                          <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">Form Templates</h3>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Pre-built templates. Use a template to load it into the builder—edit and save as a new Custom Form. Original templates are never modified. Search by name or category.</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant={templateViewMode === "grid" ? "default" : "outline"}
                            onClick={() => setTemplateViewMode("grid")}
                            className="px-3"
                          >
                            Grid
                          </Button>
                          <Button
                            size="sm"
                            variant={templateViewMode === "list" ? "default" : "outline"}
                            onClick={() => setTemplateViewMode("list")}
                            className="px-3"
                          >
                            List
                          </Button>
                        </div>
                      </div>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                          placeholder="Search templates by name or category..."
                          value={templateSearchQuery}
                          onChange={(e) => setTemplateSearchQuery(e.target.value)}
                          className="pl-9 max-w-md"
                        />
                      </div>
                      {filteredFormTemplates.length === 0 ? (
                        <p className="text-sm text-gray-500 dark:text-gray-400 py-6 text-center">No templates match your search. Try a different name or category.</p>
                      ) : templateViewMode === "list" ? (
                        <div className="space-y-6 max-h-[600px] overflow-y-auto pr-2">
                          {templatesByCategory.map(({ category, templates }) => (
                            <div key={category}>
                              <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-3">
                                {category} ({templates.length})
                              </h4>
                              <div className="border border-gray-200 dark:border-gray-800 rounded-lg overflow-hidden bg-white dark:bg-[#0b0c16]">
                                <div className="overflow-x-auto">
                                  <table className="w-full min-w-[700px] text-sm text-left border-collapse">
                                    <thead className="bg-gray-50 dark:bg-gray-800/80 border-b border-gray-200 dark:border-gray-700">
                                      <tr>
                                        <th className="px-3 py-2.5 font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider text-xs">Template Name</th>
                                        <th className="px-3 py-2.5 font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider text-xs">Category</th>
                                        <th className="px-3 py-2.5 font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider text-xs">Description</th>
                                        <th className="px-3 py-2.5 font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider text-xs w-20">Sections</th>
                                        <th className="px-3 py-2.5 font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider text-xs w-16">Fields</th>
                                        <th className="px-3 py-2.5 text-center font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider text-xs w-32">Actions</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                      {templates.map((template) => {
                                        const fieldCount = template.sections.reduce((acc, s) => acc + s.fields.length, 0);
                                        return (
                                          <tr key={template.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                                            <td className="px-3 py-2.5 font-semibold text-gray-900 dark:text-gray-100">{template.title}</td>
                                            <td className="px-3 py-2.5">
                                              <Badge variant="secondary" className="text-[10px] font-normal bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200 border-0">{template.category}</Badge>
                                            </td>
                                            <td className="px-3 py-2.5 text-gray-600 dark:text-gray-400 text-xs max-w-[240px] truncate" title={template.description}>{template.description}</td>
                                            <td className="px-3 py-2.5 text-gray-600 dark:text-gray-400 text-xs">{template.sections.length}</td>
                                            <td className="px-3 py-2.5 text-gray-600 dark:text-gray-400 text-xs">{fieldCount}</td>
                                            <td className="px-3 py-2.5">
                                              <div className="flex items-center justify-center gap-1">
                                                <Button variant="outline" size="sm" className="h-8 px-2 text-xs" onClick={() => setTemplatePreview(template)}>
                                                  <Eye className="h-3.5 w-3.5 mr-1" />
                                                  Preview
                                                </Button>
                                                <Button size="sm" className="h-8 px-2 text-xs bg-[#4A7DFF] hover:bg-[#2563eb] text-white" onClick={() => loadTemplateIntoBuilder(template)}>
                                                  <FileText className="h-3.5 w-3.5 mr-1" />
                                                  Use Template
                                                </Button>
                                              </div>
                                            </td>
                                          </tr>
                                        );
                                      })}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="space-y-6 max-h-[600px] overflow-y-auto pr-2">
                          {templatesByCategory.map(({ category, templates }) => (
                            <div key={category}>
                              <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-3">
                                {category} ({templates.length})
                              </h4>
                              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                                {templates.map((template) => (
                                  <div
                                    key={template.id}
                                    className="flex flex-col justify-between gap-3 p-4 border rounded-lg bg-white dark:bg-[#0b0c16] border-gray-200 dark:border-gray-800"
                                  >
                                    <div className="space-y-1">
                                      <Badge variant="secondary" className="text-[10px] font-normal bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200 border-0">{template.category}</Badge>
                                      <p className="font-semibold text-gray-800 dark:text-gray-100">{template.title}</p>
                                      <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-3">{template.description}</p>
                                      <p className="text-[11px] text-gray-400 dark:text-gray-500">{template.sections.length} section(s), {template.sections.reduce((acc, s) => acc + s.fields.length, 0)} field(s)</p>
                                    </div>
                                    <div className="flex flex-wrap gap-2 pt-2">
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        className="flex-1 min-w-[100px]"
                                        onClick={() => setTemplatePreview(template)}
                                      >
                                        <Eye className="h-3.5 w-3.5 mr-1.5" />
                                        Preview
                                      </Button>
                                      <Button
                                        size="sm"
                                        className="flex-1 min-w-[100px] bg-[#4A7DFF] hover:bg-[#2563eb] text-white"
                                        onClick={() => loadTemplateIntoBuilder(template)}
                                      >
                                        <FileText className="h-3.5 w-3.5 mr-1.5" />
                                        Use Template
                                      </Button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </TabsContent>
                  </Tabs>
                </TabsContent>

                <Dialog open={!!templatePreview} onOpenChange={(open) => !open && setTemplatePreview(null)}>
                  <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto dark:bg-slate-800 dark:border-gray-700">
                    <DialogHeader>
                      <DialogTitle>{templatePreview?.title}</DialogTitle>
                      <DialogDescription>{templatePreview?.description}</DialogDescription>
                    </DialogHeader>
                    {templatePreview && (
                      <div className="space-y-4 pt-2">
                        {templatePreview.sections.map((section, idx) => (
                          <div key={section.id} className="border border-gray-200 dark:border-gray-600 rounded-lg p-3">
                            <p className="font-medium text-sm text-gray-800 dark:text-gray-200 mb-2">
                              Section {idx + 1}: {section.title}
                            </p>
                            <ul className="list-disc list-inside space-y-1 text-xs text-gray-600 dark:text-gray-400">
                              {section.fields.map((field) => (
                                <li key={field.id}>
                                  {field.label}
                                  {field.required && <span className="text-red-500 ml-1">*</span>}
                                  <span className="text-gray-400 dark:text-gray-500"> ({field.type}{field.options?.length ? `: ${field.options.join(", ")}` : ""})</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        ))}
                        <div className="flex justify-end gap-2 pt-2">
                          <Button variant="outline" size="sm" onClick={() => setTemplatePreview(null)}>Close</Button>
                          <Button size="sm" className="bg-[#4A7DFF] hover:bg-[#2563eb]" onClick={() => templatePreview && loadTemplateIntoBuilder(templatePreview)}>
                            Use Template
                          </Button>
                        </div>
                      </div>
                    )}
                  </DialogContent>
                </Dialog>
              </>
            )}

            {/* Document Editor tab content hidden */}
            {false && !userIsPatient && (
              <TabsContent
                value="editor"
                className="space-y-5 rounded-3xl border border-gray-200 bg-white p-5 shadow-lg shadow-black/10 dark:border-gray-800 dark:bg-[#05070f] dark:text-slate-100"
              >
                {/* Top Header - Professional Medical Theme */}
                <div className="px-6 py-4 flex-shrink-0 bg-white dark:bg-[hsl(var(--cura-midnight))] border-b-2 border-gray-200 dark:border-[hsl(var(--cura-steel))]">
                  <div className="flex items-center justify-between gap-8">
                    <div className="flex items-center gap-4">
                      <Button
                        className="h-10 px-5 text-sm font-medium shadow-lg transition-all duration-300 border-2 bg-white dark:bg-gray-800 text-black dark:text-white border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 hover:-translate-y-0.5 rounded-[10px]"
                        onClick={handlePreview}
                      >
                        Preview..
                      </Button>
                      <Button
                        className="h-10 px-5 text-sm font-medium shadow-lg transition-all duration-300 border-2 bg-white dark:bg-gray-800 text-black dark:text-white border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 hover:-translate-y-0.5 rounded-[10px]"
                        onClick={handleSaveAsDraft}
                      >
                        View Draft..
                      </Button>
                    </div>

                    <div className="flex items-center gap-4">
                      <Button
                        className="h-10 px-5 text-sm font-medium shadow-lg transition-all duration-300 border-2 bg-white dark:bg-gray-800 text-black dark:text-white border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 hover:-translate-y-0.5 rounded-[10px]"
                        onClick={() => setShowShareDialog(true)}
                      >
                        Share this...
                      </Button>
                      {user?.role === "patient" && (
                        <>
                          <div className="h-8 w-px bg-white/30 mx-1"></div>
                          <Button
                            className="h-10 px-5 text-sm font-medium shadow-lg transition-all duration-300 border-2 bg-white dark:bg-gray-800 text-black dark:text-white border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 hover:-translate-y-0.5 rounded-[10px]"
                            onClick={() => setShowPatientTemplateDialog(true)}
                          >
                            Letters
                          </Button>
                        </>
                      )}
                      {user?.role !== "patient" && (
                        <>
                          <div className="h-8 w-px bg-white/30 mx-1"></div>
                          <Button
                            className="h-10 px-5 text-sm font-medium shadow-lg transition-all duration-300 border-2 bg-white dark:bg-gray-800 text-black dark:text-white border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 hover:-translate-y-0.5 rounded-[10px]"
                            onClick={() => setShowDoctorTemplateDialog(true)}
                          >
                            Doctor Templates
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Toolbar - medical theme colors */}
                <div className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-4 py-3 flex-shrink-0">
                  <div className="flex justify-center items-center gap-1 flex-wrap">
                    <Button
                      size="sm"
                      className="text-xs h-7 px-4 py-2 mt-5 bg-white dark:bg-gray-800 text-black dark:text-white border border-gray-400 dark:border-gray-600"
                      onClick={() => setShowAllTemplatesDialog(true)}
                    >
                      Templates
                    </Button>
                    <Button
                      size="sm"
                      className="text-xs h-7 px-4 py-2 mt-5 bg-white dark:bg-gray-800 text-black dark:text-white border border-gray-400 dark:border-gray-600"
                      onClick={handleSave}
                      data-testid="button-save-template"
                    >
                      Save Template
                    </Button>
                    <Button
                      data-bluewave="true"
                      size="sm"
                      className="text-xs h-7 px-4 py-2 mt-5"
                      onClick={handleDownload}
                      data-testid="button-download"
                    >
                      <Download className="h-3 w-3 mr-1" />
                    </Button>
                    <Button
                      data-bluewave="true"
                      size="sm"
                      className="text-xs h-7 px-4 py-2 mt-5"
                      onClick={handlePrint}
                      data-testid="button-print"
                    >
                      <Printer className="h-3 w-3 mr-1" />
                    </Button>
                    <Button
                      size="sm"
                      className="text-xs h-7 px-4 py-2 mt-5 bg-white dark:bg-gray-800 text-black dark:text-white border border-gray-400 dark:border-gray-600"
                      onClick={handleInsertLogo}
                    >
                      Logo
                    </Button>
                    <Button
                      size="sm"
                      className="text-xs h-7 px-4 py-2 mt-5 bg-white dark:bg-gray-800 text-black dark:text-white border border-gray-400 dark:border-gray-600"
                      onClick={handleClinicalHeader}
                      data-testid="button-clinical-header"
                    >
                      Clinical Header
                    </Button>
                    <Button
                      size="sm"
                      className="text-xs h-7 px-4 py-2 mt-5 bg-white dark:bg-gray-800 text-black dark:text-white border border-gray-400 dark:border-gray-600"
                      onClick={() => setShowSavedTemplatesDialog(true)}
                    >
                      View Saved Templates
                    </Button>
                  </div>
                  {/* Main formatting row */}
                  <div className="flex justify-center items-center gap-0.5 mb-2 mt-3">
                    {/* Font controls */}
                    <Select
                      value={textStyle}
                      onValueChange={(value) => {
                        console.log("Dropdown changed to:", value);
                        setTextStyle(value);
                        setTimeout(() => {
                          if (value === "paragraph") {
                            handleParagraph();
                          } else if (value === "heading1") {
                            handleH1();
                          } else if (value === "heading2") {
                            handleH2();
                          } else if (value === "heading3") {
                            handleH3();
                          } else if (value === "heading4") {
                            handleH4();
                          } else if (value === "heading5") {
                            handleH5();
                          } else if (value === "heading6") {
                            handleH6();
                          }
                        }, 100);
                      }}
                    >
                      <SelectTrigger data-bluewave="true" className="w-90 h-6 p-3 text-xs bg-white dark:bg-gray-800 text-black dark:text-white border-gray-300 dark:border-gray-600">
                        <SelectValue placeholder="H2" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="paragraph">Paragraph</SelectItem>
                        <SelectItem value="heading1">H1</SelectItem>
                        <SelectItem value="heading2">H2</SelectItem>
                        <SelectItem value="heading3">H3</SelectItem>
                        <SelectItem value="heading4">H4</SelectItem>
                        <SelectItem value="heading5">H5</SelectItem>
                        <SelectItem value="heading6">H6</SelectItem>
                      </SelectContent>
                    </Select>


                    <Select
                      value={fontFamily}
                      onValueChange={(value) => {
                        setFontFamily(value);

                        // Apply font to editor for new text
                        if (textareaRef) {
                          const fontFamilyCSS = getFontFamilyCSS(value);
                          textareaRef.style.fontFamily = fontFamilyCSS;
                        }

                        // Also apply font family to selected text if any exists
                        const selection = window.getSelection();
                        if (
                          selection &&
                          selection.rangeCount > 0 &&
                          selection.toString().trim()
                        ) {
                          applyFontFamily(value);
                        }
                      }}
                    >
                      <SelectTrigger data-bluewave="true" className="w-150 h-5 p-3 text-xs bg-white dark:bg-gray-800 text-black dark:text-white border-gray-300 dark:border-gray-600">
                        <SelectValue placeholder="Verdana" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="arial">Arial</SelectItem>
                        <SelectItem value="calibri">Calibri</SelectItem>
                        <SelectItem value="cambria">Cambria</SelectItem>
                        <SelectItem value="comic-sans">Comic Sans MS</SelectItem>
                        <SelectItem value="consolas">Consolas</SelectItem>
                        <SelectItem value="courier">Courier New</SelectItem>
                        <SelectItem value="franklin">Franklin Gothic</SelectItem>
                        <SelectItem value="garamond">Garamond</SelectItem>
                        <SelectItem value="georgia">Georgia</SelectItem>
                        <SelectItem value="helvetica">Helvetica</SelectItem>
                        <SelectItem value="impact">Impact</SelectItem>
                        <SelectItem value="lato">Lato</SelectItem>
                        <SelectItem value="lucida">Lucida Console</SelectItem>
                        <SelectItem value="open-sans">Open Sans</SelectItem>
                        <SelectItem value="palatino">Palatino</SelectItem>
                        <SelectItem value="segoe">Segoe UI</SelectItem>
                        <SelectItem value="tahoma">Tahoma</SelectItem>
                        <SelectItem value="times">Times New Roman</SelectItem>
                        <SelectItem value="trebuchet">Trebuchet MS</SelectItem>
                        <SelectItem value="verdana">Verdana</SelectItem>
                      </SelectContent>
                    </Select>

                    <Select
                      value={fontSize}
                      onValueChange={(value) => {
                        setFontSize(value);
                        // Only apply font size if there's a valid selection
                        const selection = window.getSelection();
                        if (
                          selection &&
                          selection.rangeCount > 0 &&
                          selection.toString().trim()
                        ) {
                          applyFontSize(value);
                        }
                      }}
                    >
                      <SelectTrigger data-bluewave="true" className="w-90 p-3 h-5 text-xs bg-white dark:bg-gray-800 text-black dark:text-white border-gray-300 dark:border-gray-600">
                        <SelectValue placeholder="12pt" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="8pt">8pt</SelectItem>
                        <SelectItem value="9pt">9pt</SelectItem>
                        <SelectItem value="10pt">10pt</SelectItem>
                        <SelectItem value="11pt">11pt</SelectItem>
                        <SelectItem value="12pt">12pt</SelectItem>
                        <SelectItem value="14pt">14pt</SelectItem>
                        <SelectItem value="16pt">16pt</SelectItem>
                        <SelectItem value="18pt">18pt</SelectItem>
                        <SelectItem value="20pt">20pt</SelectItem>
                        <SelectItem value="22pt">22pt</SelectItem>
                        <SelectItem value="24pt">24pt</SelectItem>
                        <SelectItem value="26pt">26pt</SelectItem>
                        <SelectItem value="28pt">28pt</SelectItem>
                        <SelectItem value="36pt">36pt</SelectItem>
                        <SelectItem value="48pt">48pt</SelectItem>
                        <SelectItem value="72pt">72pt</SelectItem>
                      </SelectContent>
                    </Select>

                    <div className="h-4 w-px bg-[hsl(var(--cura-steel))] dark:bg-[hsl(var(--cura-steel))] mx-1"></div>

                    {/* Text formatting - more visible */}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 border transition-all duration-200 bg-white dark:bg-gray-800 border-white dark:border-gray-700 text-black dark:text-white hover:bg-[#7279FB] hover:border-[#7279FB]"
                      onClick={handleBold}
                    >
                      <Bold className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 border transition-all duration-200 bg-white dark:bg-gray-800 border-white dark:border-gray-700 text-black dark:text-white hover:bg-[#7279FB] hover:border-[#7279FB]"
                      onClick={handleItalic}
                    >
                      <Italic className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 border transition-all duration-200 bg-white dark:bg-gray-800 border-white dark:border-gray-700 text-black dark:text-white hover:bg-[#7279FB] hover:border-[#7279FB]"
                      onClick={handleUnderline}
                    >
                      <Underline className="h-3 w-3" />
                    </Button>

                    <div className="h-4 w-px bg-[hsl(var(--cura-steel))] dark:bg-[hsl(var(--cura-steel))] mx-1"></div>

                    {/* Lists */}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 border transition-all duration-200 bg-white dark:bg-gray-800 border-white dark:border-gray-700 text-black dark:text-white hover:bg-[#7279FB] hover:border-[#7279FB]"
                      onClick={handleBulletList}
                    >
                      <List className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 border transition-all duration-200 bg-white dark:bg-gray-800 border-white dark:border-gray-700 text-black dark:text-white hover:bg-[#7279FB] hover:border-[#7279FB]"
                      onClick={handleNumberedList}
                    >
                      <ListOrdered className="h-3 w-3" />
                    </Button>

                    <div className="h-4 w-px bg-[hsl(var(--cura-steel))] dark:bg-[hsl(var(--cura-steel))] mx-1"></div>

                    {/* Alignment */}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 border transition-all duration-200 bg-white dark:bg-gray-800 border-white dark:border-gray-700 text-black dark:text-white hover:bg-[#7279FB] hover:border-[#7279FB]"
                      onClick={handleAlignLeft}
                    >
                      <AlignLeft className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 border transition-all duration-200 bg-white dark:bg-gray-800 border-white dark:border-gray-700 text-black dark:text-white hover:bg-[#7279FB] hover:border-[#7279FB]"
                      onClick={handleAlignCenter}
                    >
                      <AlignCenter className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 border transition-all duration-200 bg-white dark:bg-gray-800 border-white dark:border-gray-700 text-black dark:text-white hover:bg-[#7279FB] hover:border-[#7279FB]"
                      onClick={handleAlignRight}
                    >
                      <AlignRight className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 border transition-all duration-200 bg-white dark:bg-gray-800 border-white dark:border-gray-700 text-black dark:text-white hover:bg-[#7279FB] hover:border-[#7279FB]"
                      onClick={handleAlignJustify}
                    >
                      <AlignJustify className="h-3 w-3" />
                    </Button>

                    <div className="h-4 w-px bg-[hsl(var(--cura-steel))] dark:bg-[hsl(var(--cura-steel))] mx-1"></div>

                    {/* Text color and tools */}
                    <div className="relative">
                      <Button
                        data-bluewave="true"
                        size="sm"
                        className="h-6 w-6 p-0"
                        onClick={() => setShowColorPicker(!showColorPicker)}
                      >
                        <Type className="h-3 w-3" />
                      </Button>
                      {showColorPicker && (
                        <div className="absolute top-full left-0 mt-1 w-[180px] bg-white dark:bg-[hsl(var(--cura-midnight))] border border-[hsl(var(--cura-steel))] dark:border-[hsl(var(--cura-steel))] rounded shadow-lg p-3 z-50">
                          <div className="grid grid-cols-8 gap-2">
                            {[
                              "#000000",
                              "#FF0000",
                              "#00FF00",
                              "#0000FF",
                              "#FFFF00",
                              "#FF00FF",
                              "#00FFFF",
                              "#FFFFFF",
                              "#808080",
                              "#800000",
                              "#008000",
                              "#000080",
                              "#808000",
                              "#800080",
                              "#008080",
                              "#C0C0C0",
                            ].map((color) => (
                              <button
                                key={color}
                                className="w-5 h-5 border border-[hsl(var(--cura-steel))] rounded hover:scale-110 transition-transform"
                                style={{ backgroundColor: color }}
                                onClick={() => {
                                  const selection = window.getSelection();
                                  if (
                                    !selection ||
                                    selection.rangeCount === 0 ||
                                    selection.toString().trim() === ""
                                  ) {
                                    toast({
                                      title: "Select Text",
                                      description: "Please select text to apply color",
                                      duration: 3000,
                                    });
                                    setShowColorPicker(false);
                                    return;
                                  }

                                  try {
                                    // Apply text color using document.execCommand
                                    document.execCommand("foreColor", false, color);

                                    // Update the document content state
                                    if (textareaRef) {
                                      setDocumentContent(textareaRef.innerHTML);
                                    }

                                    setTextColor(color);
                                    setShowColorPicker(false);

                                    toast({
                                      title: "✓ Text Color Applied",
                                      description: `Text color changed to ${color}`,
                                      duration: 2000,
                                    });
                                  } catch (error) {
                                    console.error("Text color error:", error);
                                    toast({
                                      title: "Error",
                                      description: "Failed to apply text color",
                                      duration: 3000,
                                    });
                                    setShowColorPicker(false);
                                  }
                                }}
                              />
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 border transition-all duration-200"
                      style={{
                        backgroundColor: "white",
                        borderColor: "#e5e7eb",
                        color: "black",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = "#7279FB";
                        e.currentTarget.style.borderColor = "#7279FB";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = "white";
                        e.currentTarget.style.borderColor = "white";
                      }}
                      onClick={handleHighlight}
                    >
                      <Highlighter className="h-3 w-3" />
                    </Button>

                    <div className="h-4 w-px bg-[hsl(var(--cura-steel))] mx-1"></div>

                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 border transition-all duration-200"
                      style={{
                        backgroundColor: "white",
                        borderColor: "white",
                        color: "black",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = "#7279FB";
                        e.currentTarget.style.borderColor = "#e5e7eb";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = "white";
                        e.currentTarget.style.borderColor = "white";
                      }}
                      onClick={handleClock}
                    >
                      <Clock className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 border transition-all duration-200"
                      style={{
                        backgroundColor: "white",
                        borderColor: "white",
                        color: "black",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = "#7279FB";
                        e.currentTarget.style.borderColor = "#7279FB";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = "white";
                        e.currentTarget.style.borderColor = "white";
                      }}
                      onClick={handleTable}
                    >
                      <Table className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 border transition-all duration-200"
                      style={{
                        backgroundColor: "white",
                        borderColor: "white",
                        color: "black",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = "#7279FB";
                        e.currentTarget.style.borderColor = "#e5e7eb";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = "white";
                        e.currentTarget.style.borderColor = "white";
                      }}
                      onClick={handleAttachFile}
                    >
                      <Paperclip className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 border transition-all duration-200"
                      style={{
                        backgroundColor: "white",
                        borderColor: "white",
                        color: "black",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = "#7279FB";
                        e.currentTarget.style.borderColor = "#7279FB";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = "white";
                        e.currentTarget.style.borderColor = "white";
                      }}
                      onClick={handleImage}
                    >
                      <Image className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 border transition-all duration-200"
                      style={{
                        backgroundColor: "white",
                        borderColor: "white",
                        color: "black",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = "#7279FB";
                        e.currentTarget.style.borderColor = "#e5e7eb";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = "white";
                        e.currentTarget.style.borderColor = "white";
                      }}
                      onClick={handleLink}
                    >
                      <Link className="h-3 w-3" />
                    </Button>
                    <Button
                      data-bluewave="true"
                      size="sm"
                      className="h-6 w-6 p-0"
                      onClick={handleMore}
                    >
                      <MoreHorizontal className="h-3 w-3" />
                    </Button>
                  </div>


                </div>
                <div className="flex-1 bg-[hsl(var(--cura-mist))] dark:bg-[hsl(var(--cura-midnight))] overflow-y-auto min-h-0 mt-4">
                  <div className="h-full flex items-start justify-center p-4">
                    <div
                      className="bg-white dark:bg-[hsl(var(--cura-midnight))] shadow-sm border border-white dark:border-[hsl(var(--cura-steel))] min-h-[600px] w-full max-w-[1200px] mx-auto"
                      style={{ width: "700px", maxWidth: "700px" }}
                    >
                      <div className="p-6">
                        <div
                          ref={(el) => {
                            if (el && el.innerHTML !== documentContent) {
                              el.innerHTML = documentContent;
                            }
                            setTextareaRef(el as any);
                          }}
                          id="document-content-area"
                          contentEditable
                          onInput={(e) => setDocumentContent(e.currentTarget.innerHTML)}
                          suppressContentEditableWarning
                          data-placeholder="Start typing your document here..."
                          className="w-full border-none outline-none text-[hsl(var(--cura-midnight))] dark:text-white leading-normal bg-transparent focus:outline-none [&:empty]:before:content-[attr(data-placeholder)] [&:empty]:before:text-gray-400"
                          style={{
                            fontSize: fontSize,
                            lineHeight: "1.6",
                            minHeight: "770px",
                            maxWidth: "100%",
                            fontFamily: fontFamily,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </div>


              </TabsContent>
            )}

            <TabsContent
              value="filled"
              className="space-y-5 rounded-3xl border border-gray-200 bg-white p-5 shadow-lg shadow-black/10 dark:border-gray-800 dark:bg-[#05070f] dark:text-slate-100"
            >
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-sm font-semibold text-gray-600 dark:text-gray-300">Filled Forms(responses)</p>
                  <p className="text-xs text-gray-500 dark:text-gray-500">
                    Completed forms stored as PDF documents for quick reference.
                  </p>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-400">
                  <span>{filledFormsLoading ? "Loading…" : `${filteredFilledForms.length} form(s)`}</span>
                  <span className="h-5 border-l border-gray-300" />
                  <Button
                    size="sm"
                    variant={filledViewMode === "grid" ? "default" : "outline"}
                    onClick={() => setFilledViewMode("grid")}
                    className="px-3"
                  >
                    Grid
                  </Button>
                  <Button
                    size="sm"
                    variant={filledViewMode === "list" ? "default" : "outline"}
                    onClick={() => setFilledViewMode("list")}
                    className="px-3"
                  >
                    List
                  </Button>
                </div>
              </div>
              {activeFormsTab === "filled" && (
                <div className="flex flex-wrap items-end gap-3 mb-4">
                  <div className="flex-1 min-w-[220px] space-y-1">
                    <Label className="text-[11px] uppercase text-gray-400">Form Name</Label>
                    <div>
                      <Command className="relative overflow-visible rounded-md border border-gray-200 bg-white">
                        <CommandInput
                          placeholder="Search forms"
                          value={filterFormName}
                          onValueChange={setFilterFormName}
                          className="text-sm pr-10"
                          onFocus={() => openDropdown("formName")}
                          onBlur={() => closeDropdown("formName")}
                        />
                        <ChevronsUpDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                        {activeFilledDropdown === "formName" && (
                          <CommandList className="absolute inset-x-0 top-full z-50 mt-1 rounded-xl border border-gray-200 bg-white shadow-lg shadow-gray-400/10 max-h-60 overflow-auto">
                            <CommandEmpty>No forms found</CommandEmpty>
                            <CommandGroup>
                              {formNames.map((name) => (
                                <CommandItem
                                  key={name}
                                  value={name}
                                  onSelect={() => {
                                    setFilterFormName(name);
                                    closeCommandMenu();
                                  }}
                                >
                                  {name}
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        )}
                      </Command>
                    </div>
                  </div>
                  <div className="flex-1 min-w-[220px] space-y-1">
                    <Label className="text-[11px] uppercase text-gray-400">Form ID</Label>
                    <div>
                      <Command className="relative overflow-visible rounded-md border border-gray-200 bg-white">
                        <CommandInput
                          placeholder="Generated form ID"
                          value={filterFormId}
                          onValueChange={setFilterFormId}
                          className="text-sm pr-10"
                          onFocus={() => openDropdown("formId")}
                          onBlur={() => closeDropdown("formId")}
                        />
                        <ChevronsUpDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                        {activeFilledDropdown === "formId" && (
                          <CommandList className="absolute inset-x-0 top-full z-50 mt-1 rounded-xl border border-gray-200 bg-white shadow-lg shadow-gray-400/10 max-h-60 overflow-auto">
                            <CommandEmpty>No form IDs found</CommandEmpty>
                            <CommandGroup>
                              {formIds.map((id) => (
                                <CommandItem
                                  key={id}
                                  value={id}
                                  onSelect={() => {
                                    setFilterFormId(id);
                                    closeCommandMenu();
                                  }}
                                >
                                  {id}
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        )}
                      </Command>
                    </div>
                  </div>
                  <div className="flex-1 min-w-[200px] space-y-1">
                    <Label className="text-[11px] uppercase text-gray-400">Date</Label>
                    <Input
                      type="date"
                      value={filterDate}
                      onChange={(event) => {
                        setFilterDate(event.target.value);
                        setFilterFormName("");
                        setFilterFormId("");
                        closeAllFilledDropdowns();
                      }}
                      className="text-sm"
                    />
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-500 ml-auto">
                    <Button size="sm" variant="ghost" onClick={resetFilters}>
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                    <span>Reset filters</span>
                  </div>
                </div>
              )}
              {filledFormsLoading ? (
                <p className="text-sm text-gray-500 dark:text-gray-400">Loading filled forms…</p>
              ) : filteredFilledForms.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  No filled forms match that filter. Adjust your search or submit a new response.
                </p>
              ) : filledViewMode === "grid" ? (
                <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                  {filteredFilledForms.map((doc: any) => (
                    <div
                      key={doc.id}
                      className="flex flex-col justify-between gap-3 p-4 border rounded-lg bg-white dark:bg-[#0b0c16] border-gray-200 dark:border-gray-800"
                    >
                      {filledFormCardContent(doc)}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="border border-gray-200 dark:border-gray-800 rounded-lg overflow-hidden bg-white dark:bg-[#0b0c16]">
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[900px] text-sm text-left border-collapse">
                      <thead className="bg-gray-50 dark:bg-gray-800/80 border-b border-gray-200 dark:border-gray-700">
                        <tr>
                          <th className="px-3 py-2.5 font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider text-xs">Form ID</th>
                          <th className="px-3 py-2.5 font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider text-xs">Patient Name</th>
                          <th className="px-3 py-2.5 font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider text-xs">Form Name</th>
                          <th className="px-3 py-2.5 font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider text-xs">Created At</th>
                          <th className="px-3 py-2.5 font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider text-xs">Updated At</th>
                          <th className="px-3 py-2.5 font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider text-xs">Status</th>
                          <th className="px-3 py-2.5 text-center font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider text-xs w-10"></th>
                          <th className="px-3 py-2.5 font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider text-xs">Created By</th>
                          <th className="px-3 py-2.5 text-center font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider text-xs w-12">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                        {filteredFilledForms.map((doc: any) => {
                          const creatorInfo = resolveFormCreator(doc);
                          const patientName =
                            doc.patientName ||
                            doc.metadata?.patientName ||
                            [doc.metadata?.patient?.firstName, doc.metadata?.patient?.lastName]
                              .filter(Boolean)
                              .join(" ")
                              .trim() ||
                            "Unknown Patient";
                          const formIdDisplay = doc.metadata?.formId ?? doc.metadata?.responseId ?? doc.id ?? "—";
                          return (
                            <tr key={doc.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                              <td className="px-3 py-2.5 text-gray-700 dark:text-gray-300 font-mono text-xs">{String(formIdDisplay)}</td>
                              <td className="px-3 py-2.5 font-semibold text-gray-900 dark:text-gray-100">{patientName}</td>
                              <td className="px-3 py-2.5 text-gray-700 dark:text-gray-300">{doc.name || "Untitled form"}</td>
                              <td className="px-3 py-2.5 text-gray-600 dark:text-gray-400 text-xs">{doc.createdAt ? new Date(doc.createdAt).toLocaleString() : "—"}</td>
                              <td className="px-3 py-2.5 text-gray-600 dark:text-gray-400 text-xs">{doc.updatedAt ? new Date(doc.updatedAt).toLocaleString() : "—"}</td>
                              <td className="px-3 py-2.5">
                                <Badge className="bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300 border-0 text-xs">Completed</Badge>
                              </td>
                              <td className="px-3 py-2.5 text-center">
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-gray-500 hover:text-gray-700" onClick={() => loadFilledForm(doc)} title="View">
                                  <Eye className="h-4 w-4" />
                                </Button>
                              </td>
                              <td className="px-3 py-2.5 text-gray-600 dark:text-gray-400 text-xs">{creatorInfo ? creatorInfo.name : "—"}</td>
                              <td className="px-3 py-2.5 text-center">
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                      <MoreVertical className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={() => loadFilledForm(doc)}>
                                      <Eye className="h-4 w-4 mr-2" />
                                      View
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => downloadFilledForm(doc)}>
                                      <Download className="h-4 w-4 mr-2" />
                                      Download
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      className="text-red-600 dark:text-red-400 focus:text-red-600"
                                      onClick={() => handleDeleteFilledFormClick(doc)}
                                    >
                                      <Trash2 className="h-4 w-4 mr-2" />
                                      Delete
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="forms">
              <FormFill />
            </TabsContent>
          </Tabs>
          <Dialog
            open={showDeleteFormDialog}
            onOpenChange={(open) => {
              if (!open) {
                setFormToDelete(null);
              }
              setShowDeleteFormDialog(open);
            }}
          >
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Delete Form</DialogTitle>
                <DialogDescription>
                  Are you sure you want to delete{" "}
                  <span className="font-semibold">{formToDelete?.title}</span>? This will remove the form and all its related shares, responses, and logs.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter className="space-x-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowDeleteFormDialog(false);
                    setFormToDelete(null);
                  }}
                  disabled={deleteFormMutation.isPending}
                >
                  Cancel
                </Button>
                <Button variant="destructive" onClick={confirmDeleteForm} disabled={deleteFormMutation.isPending}>
                  {deleteFormMutation.isPending ? "Deleting..." : "Yes, delete it"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
        <Dialog
          open={showDeleteFilledFormDialog}
          onOpenChange={(open) => {
            if (!open) {
              setFilledFormToDelete(null);
            }
            setShowDeleteFilledFormDialog(open);
          }}
        >
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Delete filled form PDF</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete{" "}
                <span className="font-semibold">
                  {filledFormToDelete?.name || "this filled form"}
                </span>
                ? This action removes the stored PDF from the server.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="space-x-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowDeleteFilledFormDialog(false);
                  setFilledFormToDelete(null);
                }}
                disabled={deleteFilledFormMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={confirmDeleteFilledForm}
                disabled={deleteFilledFormMutation.isPending}
              >
                {deleteFilledFormMutation.isPending ? "Deleting..." : "Delete PDF"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        <Dialog open={showFilledFormFileMissingDialog} onOpenChange={setShowFilledFormFileMissingDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>File not found</DialogTitle>
              <DialogDescription>
                The file does not exist on the server. It may have been deleted.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button onClick={() => setShowFilledFormFileMissingDialog(false)}>OK</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        <Dialog
          open={showFormShareDialog}
          onOpenChange={(isOpen) => {
            if (!isOpen) {
              closeFormShareDialog();
            }
          }}
        >
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Share form with patient</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-2">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {selectedFormForShare
                  ? `Sharing “${selectedFormForShare.title}”. Send to any email — the recipient does not need to be a patient in your organization.`
                  : "Select a form from the list to continue."}
              </p>
              <div className="space-y-2">
                <Label className="text-sm font-medium" htmlFor="share-form-recipient-email">
                  Recipient email
                </Label>
                <Input
                  id="share-form-recipient-email"
                  type="email"
                  autoComplete="off"
                  placeholder="Enter any email address (e.g. patient@gmail.com)"
                  value={shareRecipientInput}
                  onChange={(e) => setShareRecipientInput(e.target.value)}
                  list="share-org-patient-emails"
                  className="w-full"
                  data-testid="input-share-form-recipient-email"
                />
                <datalist id="share-org-patient-emails">
                  {shareRecipientEmails.map((row) => (
                    <option key={row.email} value={row.email} />
                  ))}
                </datalist>
                {!shareRecipientEmailsLoading && shareRecipientEmails.length > 0 && (
                  <div className="rounded-md border border-input bg-muted/30 max-h-40 overflow-y-auto">
                    <p className="px-3 py-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground border-b border-input">
                      Organization patient emails ({shareRecipientEmails.length})
                    </p>
                    <ul className="py-1 text-sm">
                      {(shareRecipientInput.trim()
                        ? filteredShareRecipientEmails
                        : shareRecipientEmails
                      ).map((row) => (
                        <li key={row.email}>
                          <button
                            type="button"
                            className="w-full px-3 py-1.5 text-left hover:bg-accent hover:text-accent-foreground truncate"
                            onClick={() => setShareRecipientInput(row.email)}
                          >
                            {row.email}
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                <p
                  className={`text-xs ${
                    canSendFormShare ? "text-emerald-600" : "text-slate-500"
                  }`}
                >
                  {canSendFormShare
                    ? `Will send the secure form link to ${shareRecipientInput.trim()}`
                    : "Type any valid email address to share this form."}
                </p>
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={closeFormShareDialog}
                  disabled={shareFormMutation.isPending}
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => previewEmailMutation.mutate()}
                  variant="outline"
                  disabled={previewEmailMutation.isPending || !canSendFormShare}
                >
                  {previewEmailMutation.isPending ? "Generating…" : "Preview email"}
                </Button>
                <Button
                  onClick={() => shareFormMutation.mutate()}
                  disabled={shareFormMutation.isPending || !canSendFormShare}
                >
                  {shareFormMutation.isPending ? "Sending…" : "Send form"}
                </Button>
                {emailPreview?.link && (
                  <Button
                    size="sm"
                    variant="secondary"
                    asChild
                  >
                    <a href={emailPreview.link} target="_blank" rel="noreferrer">
                      Open patient form
                    </a>
                  </Button>
                )}
              </div>
              {emailPreview?.link && (
                <p className="text-xs text-muted-foreground break-all">
                  Patient form link (not the staff API):{" "}
                  <a href={emailPreview.link} className="underline text-primary" target="_blank" rel="noreferrer">
                    {emailPreview.link}
                  </a>
                </p>
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* Share Form Error Modal */}
        <Dialog open={showShareFormErrorModal} onOpenChange={setShowShareFormErrorModal}>
          <DialogContent className="max-w-md dark:bg-slate-800 dark:border-gray-700">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-red-600 dark:text-red-400">
                <AlertTriangle className="h-5 w-5" />
                Unable to Share Form
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-2">
              <p className="text-sm text-gray-600 dark:text-gray-300">
                {shareFormErrorMessage}
              </p>
              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
                <p className="text-xs text-yellow-800 dark:text-yellow-200 font-medium mb-1">
                  What you can do:
                </p>
                <ul className="text-xs text-yellow-700 dark:text-yellow-300 list-disc list-inside space-y-1">
                  <li>Check the email address is valid</li>
                  <li>Refresh the page and try again</li>
                  <li>Contact support if the problem persists</li>
                </ul>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <Button
                variant="outline"
                onClick={() => {
                  setShowShareFormErrorModal(false);
                  setShareFormErrorMessage("");
                }}
              >
                Close
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog
          open={responseDialogOpen}
          onOpenChange={(open) => {
            if (!open) {
              setResponseDialogOpen(false);
              setSelectedFormForResponses(null);
              setFormResponsesData(null);
              setFormResponsesLoading(false);
            }
          }}
        >
          <DialogContent className="max-w-6xl max-h-[800px] overflow-y-auto">
            <DialogHeader className="flex flex-col gap-2">
              <DialogTitle className="flex-1 min-w-0">
                Responses for {selectedFormForResponses?.title || formResponsesData?.formTitle || "form"}
              </DialogTitle>
              <p className="text-xs text-gray-500">
                Created by{" "}
                {selectedFormForResponses
                  ? creatorsById.get(resolveFormCreatorId(selectedFormForResponses) ?? 0)?.name ??
                  "Unknown creator"
                  : "Unknown"}
              </p>
              <p className="text-xs text-gray-500">
                {formResponsesData?.responses.length ?? "0"} responses
              </p>
            </DialogHeader>
            <div className="space-y-4">
              {formResponsesLoading ? (
                <p className="text-sm text-gray-500">Loading responses…</p>
              ) : !formResponsesData?.responses.length ? (
                <p className="text-sm text-gray-500">No responses have been collected yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full table-auto text-sm">
                    <thead className="text-xs uppercase text-gray-500">
                      <tr>
                        <th className="px-3 py-2 text-left">Patient</th>
                        <th className="px-3 py-2 text-left">Submitted at</th>
                        {formResponsesData.fields.map((field) => (
                          <th key={field.id} className="px-3 py-2 text-left">
                            {field.label}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {formResponsesData.responses.map((response) => {
                        const patient = response.patient;
                        const submitted = response.submittedAt
                          ? new Date(response.submittedAt).toLocaleString()
                          : "—";
                        const answerMap = new Map(
                          response.answers.map((answer) => [answer.fieldId, answer]),
                        );
                        const renderCellValue = (value: any, field?: { fieldType?: string; label?: string }) => {
                          if (value === null || value === undefined) return "—";
                          const isSignatureField =
                            field?.fieldType === "signature" || /signature/i.test(field?.label || "");
                          if (isSignatureField || isSignatureStrokeData(value)) {
                            const imageSrc = resolveSignatureDataUrl(value);
                            if (imageSrc) {
                              return (
                                <img
                                  src={imageSrc}
                                  alt="Signature"
                                  className="h-12 w-40 border border-gray-200 bg-white object-contain"
                                />
                              );
                            }
                          }
                          return formatFormResponseScalar(value);
                        };
                        const patientName = patient
                          ? `${patient.firstName ?? ""} ${patient.lastName ?? ""}`.trim() || "Unnamed patient"
                          : "Unknown patient";
                        return (
                          <tr key={response.responseId} className="border-b border-gray-100">
                            <td className="px-3 py-2 align-top">
                              <p className="font-semibold text-gray-900">{patientName}</p>
                              {patient?.email && (
                                <p className="text-xs text-gray-500">{patient.email}</p>
                              )}
                              {patient?.phone && (
                                <p className="text-xs text-gray-500">Phone: {patient.phone}</p>
                              )}
                              {patient?.nhsNumber && (
                                <p className="text-xs text-gray-500">NHS: {patient.nhsNumber}</p>
                              )}
                            </td>
                            <td className="px-3 py-2 align-top text-gray-600">{submitted}</td>
                            {formResponsesData.fields.map((field) => {
                              const answer = answerMap.get(field.id);
                              return (
                                <td key={`${response.responseId}-${field.id}`} className="px-3 py-2 align-top">
                                  {answer ? renderCellValue(answer.value, field) : "—"}
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            <div className="flex justify-end mt-4 gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={downloadResponsesExcel}
                disabled={!formResponsesData || isExportingResponses}
              >
                {isExportingResponses ? "Exporting…" : "Export all to Excel"}
              </Button>
              <Button
                variant="outline"
                onClick={() => setResponseDialogOpen(false)}
              >
                Close
              </Button>
            </div>
          </DialogContent>
        </Dialog>
        <Dialog open={showShareLinksDialog} onOpenChange={(open) => !open && closeShareLinksDialog()}>
          <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Link history</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {shareLinksLoading ? (
                <p className="text-sm text-muted-foreground">Loading share history…</p>
              ) : currentLinkForm ? (
                shareLinks.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No links have been generated for {currentLinkForm.title} yet.
                  </p>
                ) : (
                  shareLinks.map((entry: any) => (
                    <Card key={entry.id} className="border border-dashed border-gray-200 dark:border-gray-700">
                      <CardContent className="gap-2 space-y-1 p-3">
                        <div className="flex items-center justify-between text-xs text-muted-foreground dark:text-gray-400">
                          <span>
                            Patient: {entry.patientFirstName || "Unknown"} {entry.patientLastName || ""} (
                            {entry.patientEmail || "no email"})
                          </span>
                          <span>
                            {new Date(entry.createdAt).toLocaleString()}
                          </span>
                        </div>
                        <div className="flex flex-col gap-1 text-[11px] text-slate-600 dark:text-gray-300">
                          <a href={entry.link} target="_blank" rel="noreferrer" className="text-primary dark:text-blue-400 underline">
                            {entry.link}
                          </a>
                          <span>Email delivered: {entry.emailSent ? "Yes" : "No"}</span>
                          {entry.emailSubject && <span>Subject: {entry.emailSubject}</span>}
                          {entry.emailError && (
                            <span className="text-[11px] text-rose-500 dark:text-rose-400">
                              Error: {entry.emailError}
                            </span>
                          )}
                        </div>
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleResendShareLink(entry.id)}
                            disabled={resendingLogId === entry.id && resendShareEmailMutation.isPending}
                          >
                            {resendingLogId === entry.id && resendShareEmailMutation.isPending
                              ? "Resending…"
                              : "Resend email"}
                          </Button>
                          <Button size="sm" variant="outline" asChild>
                            <a href={entry.link} target="_blank" rel="noreferrer">
                              Open form
                            </a>
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )
              ) : (
                <p className="text-sm text-muted-foreground">Select a form first.</p>
              )}
            </div>
          </DialogContent>
        </Dialog>
        <Dialog open={previewDialogOpen} onOpenChange={setPreviewDialogOpen}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>Email preview</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                This is the exact email that will be sent to {shareRecipientPreviewLabel} once shared.
              </p>
              <Card className="border border-dashed border-slate-200 dark:border-slate-700 shadow-none">
                <CardContent className="p-4">
                  {emailPreview?.html ? (
                    <div className="prose max-w-none dark:prose-invert prose-headings:text-gray-900 dark:prose-headings:text-gray-100 prose-p:text-gray-700 dark:prose-p:text-gray-300 prose-a:text-blue-600 dark:prose-a:text-blue-400" dangerouslySetInnerHTML={{ __html: emailPreview.html }} />
                  ) : (
                    <p className="text-xs text-muted-foreground">No preview available.</p>
                  )}
                </CardContent>
              </Card>
              <div className="space-y-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-3 text-xs text-muted-foreground dark:text-gray-300">
                <div>
                  <span className="font-semibold text-gray-900 dark:text-gray-100">Subject:</span> <span className="text-gray-700 dark:text-gray-300">{emailPreview?.subject}</span>
                </div>
                <div>
                  <span className="font-semibold text-gray-900 dark:text-gray-100">Link:</span>{" "}
                  <a href={emailPreview?.link} target="_blank" rel="noreferrer" className="underline text-primary dark:text-blue-400">
                    {emailPreview?.link}
                  </a>
                </div>
                <div>
                  <span className="font-semibold text-gray-900 dark:text-gray-100">Text version:</span> <span className="text-gray-700 dark:text-gray-300">{emailPreview?.text}</span>
                </div>
              </div>
              <div className="flex justify-end">
                <Button variant="outline" onClick={() => setPreviewDialogOpen(false)}>
                  Close
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
        {/* Top Header - Professional Medical Theme */}




      </div>

      {/* Insert Link Dialog */}
      <Dialog open={showLinkDialog} onOpenChange={setShowLinkDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Insert Link</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="link-url">URL</Label>
              <Input
                id="link-url"
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                placeholder="https://example.com"
                className="w-full"
              />
            </div>
            <div>
              <Label htmlFor="link-text">Link Text</Label>
              <Input
                id="link-text"
                value={linkText}
                onChange={(e) => setLinkText(e.target.value)}
                placeholder="Click here"
                className="w-full"
              />
            </div>
            <div className="flex justify-end space-x-2">
              <Button
                variant="ghost"
                className="border transition-all duration-200"
                style={{
                  backgroundColor: "white",
                  borderColor: "#e5e7eb",
                  color: "black",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = "#A3A8FC";
                  e.currentTarget.style.borderColor = "#A3A8FC";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "white";
                  e.currentTarget.style.borderColor = "#e5e7eb";
                }}
                onClick={() => setShowLinkDialog(false)}
              >
                Cancel
              </Button>
              <Button
                variant="ghost"
                className="border transition-all duration-200"
                style={{
                  backgroundColor: "white",
                  borderColor: "#e5e7eb",
                  color: "black",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = "#A3A8FC";
                  e.currentTarget.style.borderColor = "#A3A8FC";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "white";
                  e.currentTarget.style.borderColor = "#e5e7eb";
                }}
                onClick={handleInsertLink}
              >
                Insert Link
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Template Selection Dialog */}
      <Dialog open={showTemplateDialog} onOpenChange={setShowTemplateDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>General & Medical Letter Template</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 max-h-96 overflow-y-auto">
              {/* Saved Templates removed*/}

              {/* General Templates */}
              <div>
                <h4 className="font-semibold mb-2">General Letter Templates</h4>
                <div className="space-y-2">
                  <Button
                    variant="outline"
                    className="w-full text-left justify-start h-auto p-4"
                    onClick={() => {
                      const template = {
                        subject: "Appointment Confirmation",
                        body: `Date: ${new Date().toLocaleDateString()}

Dear [Patient Name],

This letter confirms your upcoming appointment:

Date: [Appointment Date]
Time: [Appointment Time]
Location: [Clinic Address]
Provider: [Doctor Name]

Please bring:
• Photo ID
• Insurance card
• List of current medications
• Previous test results (if applicable)

If you need to reschedule, please contact us at least 24 hours in advance.

We look forward to seeing you.

Best regards,
[Clinic Name]`
                      };
                      setPreviewTemplate(template);
                      setPreviewTemplateName("Appointment Confirmation");
                      setShowTemplateDialog(false);
                      setShowTemplatePreviewDialog(true);
                    }}
                  >
                    <div>
                      <div className="font-medium">
                        Appointment Confirmation
                      </div>
                      <div className="text-sm text-gray-500">
                        Patient appointment confirmation
                      </div>
                    </div>
                  </Button>

                  <Button
                    variant="outline"
                    className="w-full text-left justify-start h-auto p-4"
                    onClick={() => {
                      const template = {
                        subject: "Treatment Plan",
                        body: `Patient: [Patient Name]
Date: ${new Date().toLocaleDateString()}

Diagnosis: [Primary Diagnosis]

Treatment Goals:
• [Goal 1]
• [Goal 2]
• [Goal 3]

Treatment Plan:
1. Medications: [Specify medications and dosages]
2. Therapy: [Specify therapy type and frequency]
3. Lifestyle Modifications: [Specify recommendations]
4. Follow-up: [Specify follow-up schedule]

Next Review: [Date]`
                      };
                      setPreviewTemplate(template);
                      setPreviewTemplateName("Treatment Plan");
                      setShowTemplateDialog(false);
                      setShowTemplatePreviewDialog(true);
                    }}
                  >
                    <div>
                      <div className="font-medium">Treatment Plan</div>
                      <div className="text-sm text-gray-500">
                        Comprehensive treatment planning template
                      </div>
                    </div>
                  </Button>
                </div>
              </div>
            </div>


          </div>
          {/* Medical Letter Templates */}
          <div>
            <h4 className="font-semibold mb-2">Medical Letter Templates</h4>
            <div className="space-y-2">
              <Button
                variant="outline"
                className="w-full text-left justify-start h-auto p-4"
                onClick={() => {
                  const template = {
                    subject: "Referral Letter",
                    body: `Date: ${new Date().toLocaleDateString()}

Dear Colleague,

I am writing to refer [Patient Name] for your expert opinion and management.

Clinical History:
[Enter clinical history here]

Current Medications:
[Enter current medications]

Examination Findings:
[Enter examination findings]

Reason for Referral:
[Enter reason for referral]

Thank you for your assistance in the care of this patient.

Yours sincerely,

[Your Name]
[Your Title]`
                  };
                  setPreviewTemplate(template);
                  setPreviewTemplateName("Referral Letter");
                  setShowTemplateDialog(false);
                  setShowTemplatePreviewDialog(true);
                }}
              >
                <div>
                  <div className="font-medium">Referral Letter</div>
                  <div className="text-sm text-gray-500">
                    Standard medical referral template
                  </div>
                </div>
              </Button>

              <Button
                variant="outline"
                className="w-full text-left justify-start h-auto p-4"
                onClick={() => {
                  const template = {
                    subject: "Discharge Summary",
                    body: `Date of Admission: [Date]
Date of Discharge: ${new Date().toLocaleDateString()}

Patient: [Patient Name]

Admission Diagnosis:
[Enter admission diagnosis]

Discharge Diagnosis:
[Enter discharge diagnosis]

Treatment Received:
[Enter treatment details]

Medications on Discharge:
[Enter discharge medications]

Follow-up Instructions:
[Enter follow-up instructions]

GP Actions Required:
[Enter GP actions if any]`
                  };
                  setPreviewTemplate(template);
                  setPreviewTemplateName("Discharge Summary");
                  setShowTemplateDialog(false);
                  setShowTemplatePreviewDialog(true);
                }}
              >
                <div>
                  <div className="font-medium">Discharge Summary</div>
                  <div className="text-sm text-gray-500">
                    Hospital discharge summary template
                  </div>
                </div>
              </Button>

              <Button
                variant="outline"
                className="w-full text-left justify-start h-auto p-4"
                onClick={() => {
                  const template = {
                    subject: "Medical Certificate",
                    body: `Date: ${new Date().toLocaleDateString()}

Patient Name: [Patient Name]
Date of Birth: [DOB]

I certify that I examined the above named patient on ${new Date().toLocaleDateString()}

Clinical Findings:
[Enter clinical findings]

Diagnosis:
[Enter diagnosis]

Fitness for Work:
☐ Fit for normal duties
☐ Fit for light duties
☐ Unfit for work

Period: From [Date] to [Date]

Additional Comments:
[Enter any additional comments]

Dr. [Name]
Medical Practitioner
Registration No: [Number]`
                  };
                  setPreviewTemplate(template);
                  setPreviewTemplateName("Medical Certificate");
                  setShowTemplateDialog(false);
                  setShowTemplatePreviewDialog(true);
                }}
              >
                <div>
                  <div className="font-medium">Medical Certificate</div>
                  <div className="text-sm text-gray-500">
                    Fitness for work certificate
                  </div>
                </div>
              </Button>
            </div>
          </div>
          <div className="flex justify-end">
            <Button
              variant="ghost"
              className="border transition-all duration-200"
              style={{
                backgroundColor: "white",
                borderColor: "#e5e7eb",
                color: "black",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = "#A3A8FC";
                e.currentTarget.style.borderColor = "#A3A8FC";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "white";
                e.currentTarget.style.borderColor = "#e5e7eb";
              }}
              onClick={() => setShowTemplateDialog(false)}
            >
              Cancel
            </Button>
          </div>

        </DialogContent>
      </Dialog>

      {/* Logo Selection Dialog */}
      <Dialog open={showLogoDialog} onOpenChange={setShowLogoDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Insert Logo</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 max-h-96 overflow-y-auto">
              {/* Predefined Logo Options */}
              <div>
                <h3 className="font-semibold mb-2">Clinic Logo Templates</h3>
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    variant="outline"
                    className="h-auto p-4 flex flex-col items-center justify-center"
                    onClick={() => insertLogo("clinic-modern")}
                  >
                    <div className="text-2xl mb-2 text-teal-600">🏥</div>
                    <div className="text-sm font-medium">Modern Clinic</div>
                    <div className="text-xs text-gray-500">
                      Icon with clinic name
                    </div>
                  </Button>

                  <Button
                    variant="outline"
                    className="h-auto p-4 flex flex-col items-center justify-center"
                    onClick={() => insertLogo("clinic-professional")}
                  >
                    <div className="w-full h-12 border-2 border-teal-600 rounded flex items-center justify-center mb-2">
                      <div className="text-xs font-bold text-teal-600">
                        MEDICAL
                      </div>
                    </div>
                    <div className="text-sm font-medium">Professional</div>
                    <div className="text-xs text-gray-500">Boxed design</div>
                  </Button>

                  <Button
                    variant="outline"
                    className="h-auto p-4 flex flex-col items-center justify-center"
                    onClick={() => insertLogo("clinic-minimal")}
                  >
                    <div className="text-sm font-bold uppercase tracking-wider mb-2">
                      PRACTICE
                    </div>
                    <div className="text-sm font-medium">Minimal</div>
                    <div className="text-xs text-gray-500">
                      Clean typography
                    </div>
                  </Button>

                  <Button
                    variant="outline"
                    className="h-auto p-4 flex flex-col items-center justify-center"
                    onClick={() => insertLogo("medical-cross")}
                  >
                    <div className="w-8 h-8 bg-red-600 relative mb-2">
                      <div className="absolute top-2 left-3 w-2 h-4 bg-white"></div>
                      <div className="absolute top-3 left-2 w-4 h-2 bg-white"></div>
                    </div>
                    <div className="text-sm font-medium">Medical Cross</div>
                    <div className="text-xs text-gray-500">
                      Classic red cross
                    </div>
                  </Button>

                  <Button
                    variant="outline"
                    className="h-auto p-4 flex flex-col items-center justify-center"
                    onClick={() => insertLogo("health-plus")}
                  >
                    <div className="text-2xl mb-2 text-green-600">⚕️</div>
                    <div className="text-sm font-medium">Health Plus</div>
                    <div className="text-xs text-gray-500">Medical symbol</div>
                  </Button>

                  <Button
                    variant="outline"
                    className="h-auto p-4 flex flex-col items-center justify-center"
                    onClick={() => {
                      // Create file input for custom logo upload
                      const input = document.createElement("input");
                      input.type = "file";
                      input.accept = "image/*";
                      input.style.display = "none";

                      input.onchange = (e) => {
                        const file = (e.target as HTMLInputElement).files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onload = (event) => {
                            const imageData = event.target?.result as string;
                            insertLogo("custom", imageData);
                          };
                          reader.readAsDataURL(file);
                        }
                      };

                      document.body.appendChild(input);
                      input.click();
                      document.body.removeChild(input);
                    }}
                  >
                    <div className="text-2xl mb-2">📁</div>
                    <div className="text-sm font-medium">Upload Custom</div>
                    <div className="text-xs text-gray-500">Browse files</div>
                  </Button>
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <Button
                variant="ghost"
                className="border transition-all duration-200"
                style={{
                  backgroundColor: "white",
                  borderColor: "#e5e7eb",
                  color: "black",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = "#A3A8FC";
                  e.currentTarget.style.borderColor = "#A3A8FC";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "white";
                  e.currentTarget.style.borderColor = "#e5e7eb";
                }}
                onClick={() => setShowLogoDialog(false)}
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Clinic Information Dialog */}
      <Dialog open={showClinicDialog} onOpenChange={setShowClinicDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle> Clinic Information Templates</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 max-h-96 overflow-y-auto">
              {/* Clinic Information Options */}
              <div>

                <div className="space-y-2">
                  <Button
                    variant="outline"
                    className="w-full text-left justify-start h-auto p-4"
                    onClick={() => {
                      setTempClinicHeaderType("full-header");
                      setShowClinicPositionDialog(true);
                      setShowClinicDialog(false);
                    }}
                  >
                    <div>
                      <div className="font-small">Full Header</div>
                      <div className="text-sm text-gray-500">
                        Complete clinic header with name, address, phone, email,
                        and website
                      </div>
                    </div>
                  </Button>

                  <Button
                    variant="outline"
                    className="w-full text-left justify-start h-auto p-4"
                    onClick={() => {
                      setTempClinicHeaderType("letterhead");
                      setShowClinicPositionDialog(true);
                      setShowClinicDialog(false);
                    }}
                  >
                    <div>
                      <div className="font-medium">Professional Letterhead</div>
                      <div className="text-sm text-gray-500">
                        Formal letterhead design with clinic branding
                      </div>
                    </div>
                  </Button>

                  <Button
                    variant="outline"
                    className="w-full text-left justify-start h-auto p-4"
                    onClick={() => {
                      setTempClinicHeaderType("name-only");
                      setShowClinicPositionDialog(true);
                      setShowClinicDialog(false);
                    }}
                  >
                    <div>
                      <div className="font-medium">Clinic Name Only</div>
                      <div className="text-sm text-gray-500">
                        Just the clinic name in bold text
                      </div>
                    </div>
                  </Button>

                  <Button
                    variant="outline"
                    className="w-full text-left justify-start h-auto p-4"
                    onClick={() => {
                      setTempClinicHeaderType("contact-info");
                      setShowClinicPositionDialog(true);
                      setShowClinicDialog(false);
                    }}
                  >
                    <div>
                      <div className="font-medium">
                        Contact Information Block
                      </div>
                      <div className="text-sm text-gray-500">
                        Formatted contact details section
                      </div>
                    </div>
                  </Button>

                  <Button
                    variant="outline"
                    className="w-full text-left justify-start h-auto p-4"
                    onClick={() => insertClinicInfo("signature-block")}
                  >
                    <div>
                      <div className="font-medium">Signature Block</div>
                      <div className="text-sm text-gray-500">
                        Professional signature with clinic details
                      </div>
                    </div>
                  </Button>
                </div>
              </div>

              {/* Current Clinic Info Preview */}
              <div>
                <h6 className="font-semibold mb-2">
                  Current Clinic Information
                </h6>
                <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                  <div>
                    <strong>Name:</strong> {clinicInfo.name || "Not set"}
                  </div>
                  <div>
                    <strong>Address:</strong> {clinicInfo.address || "Not set"}
                  </div>
                  <div>
                    <strong>Phone:</strong> {clinicInfo.phone || "Not set"}
                  </div>
                  <div>
                    <strong>Email:</strong> {clinicInfo.email || "Not set"}
                  </div>
                  <div>
                    <strong>Website:</strong> {clinicInfo.website || "Not set"}
                  </div>
                  <Button
                    onClick={handleEditClinicInfo}
                    className="mt-3 w-full border transition-all duration-200"
                    variant="ghost"
                    style={{
                      backgroundColor: "white",
                      borderColor: "#e5e7eb",
                      color: "black",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = "#A3A8FC";
                      e.currentTarget.style.borderColor = "#A3A8FC";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = "white";
                      e.currentTarget.style.borderColor = "#e5e7eb";
                    }}
                  >
                    Edit Clinic Info
                  </Button>
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <Button
                variant="ghost"
                className="border transition-all duration-200"
                style={{
                  backgroundColor: "white",
                  borderColor: "#e5e7eb",
                  color: "black",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = "#A3A8FC";
                  e.currentTarget.style.borderColor = "#A3A8FC";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "white";
                  e.currentTarget.style.borderColor = "#e5e7eb";
                }}
                onClick={() => setShowClinicDialog(false)}
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Clinic Information Dialog */}
      <Dialog
        open={showEditClinicDialog}
        onOpenChange={setShowEditClinicDialog}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Clinic Information</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium">Clinic Name</label>
                <input
                  type="text"
                  className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter clinic name"
                  value={editingClinicInfo.name}
                  onChange={(e) =>
                    setEditingClinicInfo({
                      ...editingClinicInfo,
                      name: e.target.value,
                    })
                  }
                />
              </div>

              <div>
                <label className="text-sm font-medium">Address</label>
                <input
                  type="text"
                  className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter clinic address"
                  value={editingClinicInfo.address}
                  onChange={(e) =>
                    setEditingClinicInfo({
                      ...editingClinicInfo,
                      address: e.target.value,
                    })
                  }
                />
              </div>

              <div>
                <label className="text-sm font-medium">Phone Number</label>
                <input
                  type="text"
                  className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter phone number"
                  value={editingClinicInfo.phone}
                  onChange={(e) =>
                    setEditingClinicInfo({
                      ...editingClinicInfo,
                      phone: e.target.value,
                    })
                  }
                />
              </div>

              <div>
                <label className="text-sm font-medium">Email Address</label>
                <input
                  type="email"
                  className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter email address"
                  value={editingClinicInfo.email}
                  onChange={(e) =>
                    setEditingClinicInfo({
                      ...editingClinicInfo,
                      email: e.target.value,
                    })
                  }
                />
              </div>

              <div>
                <label className="text-sm font-medium">Website</label>
                <input
                  type="url"
                  className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter website URL"
                  value={editingClinicInfo.website}
                  onChange={(e) =>
                    setEditingClinicInfo({
                      ...editingClinicInfo,
                      website: e.target.value,
                    })
                  }
                />
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button
                variant="ghost"
                className="border transition-all duration-200"
                style={{
                  backgroundColor: "white",
                  borderColor: "#e5e7eb",
                  color: "black",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = "#A3A8FC";
                  e.currentTarget.style.borderColor = "#A3A8FC";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "white";
                  e.currentTarget.style.borderColor = "#e5e7eb";
                }}
                onClick={() => setShowEditClinicDialog(false)}
              >
                Cancel
              </Button>
              <Button
                variant="ghost"
                className="border transition-all duration-200"
                style={{
                  backgroundColor: "white",
                  borderColor: "#e5e7eb",
                  color: "black",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = "#A3A8FC";
                  e.currentTarget.style.borderColor = "#A3A8FC";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "white";
                  e.currentTarget.style.borderColor = "#e5e7eb";
                }}
                onClick={handleSaveClinicInfo}
              >
                Save Changes
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Patient Information Dialog */}
      <Dialog open={showPatientDialog} onOpenChange={setShowPatientDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Patient Information Templates</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 max-h-96 overflow-y-auto">
              {/* Patient Information Options */}
              <div>

                <div className="space-y-2">
                  <Button
                    variant="outline"
                    className="w-full text-left justify-start h-auto p-4"
                    onClick={() => handlePreviewOtherTemplate("full-details", "Full Patient Details", "patient")}
                  >
                    <div>
                      <div className="font-medium">Full Patient Details</div>
                      <div className="text-sm text-gray-500">
                        Complete patient information including name, DOB, ID,
                        address, phone, and email
                      </div>
                    </div>
                  </Button>

                  <Button
                    variant="outline"
                    className="w-full text-left justify-start h-auto p-4"
                    onClick={() => handlePreviewOtherTemplate("name-dob", "Name & Date of Birth", "patient")}
                  >
                    <div>
                      <div className="font-medium">Name & Date of Birth</div>
                      <div className="text-sm text-gray-500">
                        Essential patient identification - name and DOB only
                      </div>
                    </div>
                  </Button>

                  <Button
                    variant="outline"
                    className="w-full text-left justify-start h-auto p-4"
                    onClick={() => handlePreviewOtherTemplate("contact-info", "Contact Information", "patient")}
                  >
                    <div>
                      <div className="font-medium">Contact Information</div>
                      <div className="text-sm text-gray-500">
                        Patient contact details including phone, email, and
                        address
                      </div>
                    </div>
                  </Button>

                  <Button
                    variant="outline"
                    className="w-full text-left justify-start h-auto p-4"
                    onClick={() => handlePreviewOtherTemplate("demographics", "Demographics", "patient")}
                  >
                    <div>
                      <div className="font-medium">Demographics</div>
                      <div className="text-sm text-gray-500">
                        Patient demographics including age, gender, DOB, and
                        insurance
                      </div>
                    </div>
                  </Button>

                  <Button
                    variant="outline"
                    className="w-full text-left justify-start h-auto p-4"
                    onClick={() => handlePreviewOtherTemplate("emergency-contact", "Emergency Contact", "patient")}
                  >
                    <div>
                      <div className="font-medium">Emergency Contact</div>
                      <div className="text-sm text-gray-500">
                        Emergency contact information with relationship and
                        phone
                      </div>
                    </div>
                  </Button>
                </div>
              </div>

              {/* Information Note */}
              <div>
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-blue-800 mb-2">
                    Patient Information Templates
                  </h4>
                  <p className="text-sm text-blue-700">
                    These templates insert placeholder text that you can replace
                    with actual patient information. The placeholders are marked
                    with square brackets (e.g., [Patient Name]) for easy
                    identification and replacement.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowPatientDialog(false);
                  setShowAllTemplatesDialog(true);
                }}
              >
                Back
              </Button>
              <Button
                variant="ghost"
                className="border transition-all duration-200"
                style={{
                  backgroundColor: "white",
                  borderColor: "#e5e7eb",
                  color: "black",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = "#A3A8FC";
                  e.currentTarget.style.borderColor = "#A3A8FC";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "white";
                  e.currentTarget.style.borderColor = "#e5e7eb";
                }}
                onClick={() => setShowPatientDialog(false)}
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Recipient Information Dialog */}
      <Dialog open={showRecipientDialog} onOpenChange={setShowRecipientDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle> Recipient Information Templates</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 max-h-96 overflow-y-auto">
              {/* Recipient Information Options */}
              <div>

                <div className="space-y-2">
                  <Button
                    variant="outline"
                    className="w-full text-left justify-start h-auto p-4"
                    onClick={() => handlePreviewOtherTemplate("doctor-details", "Doctor Details", "recipient")}
                  >
                    <div>
                      <div className="font-medium">Doctor Details</div>
                      <div className="text-sm text-gray-500">
                        Complete doctor information including name, specialty,
                        clinic, and contact details
                      </div>
                    </div>
                  </Button>

                  <Button
                    variant="outline"
                    className="w-full text-left justify-start h-auto p-4"
                    onClick={() => handlePreviewOtherTemplate("specialist-referral", "Specialist Referral", "recipient")}
                  >
                    <div>
                      <div className="font-medium">Specialist Referral</div>
                      <div className="text-sm text-gray-500">
                        Referral header for specialist consultations with
                        department and reason
                      </div>
                    </div>
                  </Button>

                  <Button
                    variant="outline"
                    className="w-full text-left justify-start h-auto p-4"
                    onClick={() => handlePreviewOtherTemplate("insurance-company", "Insurance Company", "recipient")}
                  >
                    <div>
                      <div className="font-medium">Insurance Company</div>
                      <div className="text-sm text-gray-500">
                        Insurance company details with policy and member
                        information
                      </div>
                    </div>
                  </Button>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      className="flex-1 text-left justify-start h-auto p-4"
                      onClick={() => handlePreviewOtherTemplate("patient-family", "Patient Family Member", "recipient")}
                    >
                      <div>
                        <div className="font-medium">Patient Family Member</div>
                        <div className="text-sm text-gray-500">
                          Family member contact information with relationship
                          details
                        </div>
                      </div>
                    </Button>

                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      className="flex-1 text-left justify-start h-auto p-4"
                      onClick={() => handlePreviewOtherTemplate("pharmacy", "Pharmacy", "recipient")}
                    >
                      <div>
                        <div className="font-medium">Pharmacy</div>
                        <div className="text-sm text-gray-500">
                          Pharmacy details including address, phone, fax, and
                          license information
                        </div>
                      </div>
                    </Button>

                  </div>
                </div>
              </div>

              {/* Information Note */}
              <div>
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-blue-800 mb-2">
                    Recipient Information Templates
                  </h4>
                  <p className="text-sm text-blue-700">
                    These templates insert recipient information for medical
                    letters and documents. The placeholders are marked with
                    square brackets (e.g., [Doctor Name]) for easy
                    identification and replacement with actual recipient
                    details.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowRecipientDialog(false);
                  setShowAllTemplatesDialog(true);
                }}
              >
                Back
              </Button>
              <Button
                variant="ghost"
                className="border transition-all duration-200"
                style={{
                  backgroundColor: "white",
                  borderColor: "#e5e7eb",
                  color: "black",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = "#A3A8FC";
                  e.currentTarget.style.borderColor = "#A3A8FC";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "white";
                  e.currentTarget.style.borderColor = "#e5e7eb";
                }}
                onClick={() => setShowRecipientDialog(false)}
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Appointments Information Dialog */}
      <Dialog
        open={showAppointmentsDialog}
        onOpenChange={setShowAppointmentsDialog}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>  Appointment Information Templates</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 max-h-96 overflow-y-auto">
              {/* Appointment Information Options */}
              <div>

                <div className="space-y-2">
                  <Button
                    variant="outline"
                    className="w-full text-left justify-start h-auto p-4"
                    onClick={() => handlePreviewOtherTemplate("appointment-details", "Appointment Details", "appointment")}
                  >
                    <div>
                      <div className="font-medium">Appointment Details</div>
                      <div className="text-sm text-gray-500">
                        Complete appointment information including date, time,
                        provider, and location
                      </div>
                    </div>
                  </Button>

                  <Button
                    variant="outline"
                    className="w-full text-left justify-start h-auto p-4"
                    onClick={() => handlePreviewOtherTemplate("next-appointment", "Next Appointment", "appointment")}
                  >
                    <div>
                      <div className="font-medium">Next Appointment</div>
                      <div className="text-sm text-gray-500">
                        Information about the patient's next scheduled
                        appointment
                      </div>
                    </div>
                  </Button>

                  <Button
                    variant="outline"
                    className="w-full text-left justify-start h-auto p-4"
                    onClick={() => handlePreviewOtherTemplate("appointment-history", "Appointment History", "appointment")}
                  >
                    <div>
                      <div className="font-medium">Appointment History</div>
                      <div className="text-sm text-gray-500">
                        List of recent appointments with dates and providers
                      </div>
                    </div>
                  </Button>

                  <Button
                    variant="outline"
                    className="w-full text-left justify-start h-auto p-4"
                    onClick={() => handlePreviewOtherTemplate("follow-up", "Follow-up Required", "appointment")}
                  >
                    <div>
                      <div className="font-medium">Follow-up Required</div>
                      <div className="text-sm text-gray-500">
                        Follow-up appointment recommendation with timeframe and
                        purpose
                      </div>
                    </div>
                  </Button>

                  <Button
                    variant="outline"
                    className="w-full text-left justify-start h-auto p-4"
                    onClick={() => handlePreviewOtherTemplate("appointment-reminder", "Appointment Reminder", "appointment")}
                  >
                    <div>
                      <div className="font-medium">Appointment Reminder</div>
                      <div className="text-sm text-gray-500">
                        Patient reminder with appointment details and
                        instructions
                      </div>
                    </div>
                  </Button>
                </div>
              </div>

              {/* Information Note */}
              <div>
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-blue-800 mb-2">
                    Appointment Information Templates
                  </h4>
                  <p className="text-sm text-blue-700">
                    These templates insert appointment-related information for
                    medical documents and letters. The placeholders are marked
                    with square brackets (e.g., [Appointment Date]) for easy
                    identification and replacement with actual appointment
                    details.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowAppointmentsDialog(false);
                  setShowAllTemplatesDialog(true);
                }}
              >
                Back
              </Button>
              <Button
                variant="ghost"
                className="border transition-all duration-200"
                style={{
                  backgroundColor: "white",
                  borderColor: "#e5e7eb",
                  color: "black",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = "#A3A8FC";
                  e.currentTarget.style.borderColor = "#A3A8FC";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "white";
                  e.currentTarget.style.borderColor = "#e5e7eb";
                }}
                onClick={() => setShowAppointmentsDialog(false)}
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Labs Information Dialog */}
      <Dialog open={showLabsDialog} onOpenChange={setShowLabsDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>      Laboratory Information Templates</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 max-h-96 overflow-y-auto">
              {/* Lab Information Options */}
              <div>

                <div className="space-y-2">
                  <Button
                    variant="outline"
                    className="w-full text-left justify-start h-auto p-4"
                    onClick={() => handlePreviewOtherTemplate("lab-results", "Laboratory Results", "laboratory")}
                  >
                    <div>
                      <div className="font-medium">Laboratory Results</div>
                      <div className="text-sm text-gray-500">
                        Complete lab results with test type, values, and
                        reference ranges
                      </div>
                    </div>
                  </Button>

                  <Button
                    variant="outline"
                    className="w-full text-left justify-start h-auto p-4"
                    onClick={() => handlePreviewOtherTemplate("blood-work", "Blood Work Results", "laboratory")}
                  >
                    <div>
                      <div className="font-medium">Blood Work Results</div>
                      <div className="text-sm text-gray-500">
                        Blood test results including CBC, glucose, cholesterol,
                        and hemoglobin
                      </div>
                    </div>
                  </Button>

                  <Button
                    variant="outline"
                    className="w-full text-left justify-start h-auto p-4"
                    onClick={() => handlePreviewOtherTemplate("urine-analysis", "Urinalysis Results", "laboratory")}
                  >
                    <div>
                      <div className="font-medium">Urinalysis Results</div>
                      <div className="text-sm text-gray-500">
                        Urine test results including color, clarity, protein,
                        glucose, and cell counts
                      </div>
                    </div>
                  </Button>

                  <Button
                    variant="outline"
                    className="w-full text-left justify-start h-auto p-4"
                    onClick={() => handlePreviewOtherTemplate("culture-results", "Culture Results", "laboratory")}
                  >
                    <div>
                      <div className="font-medium">Culture Results</div>
                      <div className="text-sm text-gray-500">
                        Microbiology culture results with organism
                        identification and sensitivity
                      </div>
                    </div>
                  </Button>

                  <Button
                    variant="outline"
                    className="w-full text-left justify-start h-auto p-4"
                    onClick={() => handlePreviewOtherTemplate("pending-labs", "Pending Laboratory Tests", "laboratory")}
                  >
                    <div>
                      <div className="font-medium">
                        Pending Laboratory Tests
                      </div>
                      <div className="text-sm text-gray-500">
                        List of pending lab tests with order dates and expected
                        results
                      </div>
                    </div>
                  </Button>
                </div>
              </div>

              {/* Information Note */}
              <div>
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-blue-800 mb-2">
                    Laboratory Information Templates
                  </h4>
                  <p className="text-sm text-blue-700">
                    These templates insert laboratory test information for
                    medical documents and reports. The placeholders are marked
                    with square brackets (e.g., [Test Results]) for easy
                    identification and replacement with actual laboratory data.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowLabsDialog(false);
                  setShowAllTemplatesDialog(true);
                }}
              >
                Back
              </Button>
              <Button
                variant="ghost"
                className="border transition-all duration-200"
                style={{
                  backgroundColor: "white",
                  borderColor: "#e5e7eb",
                  color: "black",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = "#A3A8FC";
                  e.currentTarget.style.borderColor = "#A3A8FC";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "white";
                  e.currentTarget.style.borderColor = "#e5e7eb";
                }}
                onClick={() => setShowLabsDialog(false)}
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Patient Records Information Dialog */}
      <Dialog
        open={showPatientRecordsDialog}
        onOpenChange={setShowPatientRecordsDialog}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>  Patient info Records Templates</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 max-h-96 overflow-y-auto">
              {/* Patient Records Options */}
              <div>

                <div className="space-y-2">
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      className="flex-1 text-left justify-start h-auto p-4"
                      onClick={() => handlePreviewOtherTemplate("medical-history", "Complete Medical History", "patient-records")}
                    >
                      <div>
                        <div className="font-medium">
                          Complete Medical History
                        </div>
                        <div className="text-sm text-gray-500">
                          Comprehensive medical history including past conditions,
                          surgeries, family history, and allergies
                        </div>
                      </div>
                    </Button>

                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      className="flex-1 text-left justify-start h-auto p-4"
                      onClick={() => handlePreviewOtherTemplate("current-medications", "Current Medications", "patient-records")}
                    >
                      <div>
                        <div className="font-medium">Current Medications</div>
                        <div className="text-sm text-gray-500">
                          List of current medications with dosages and frequencies
                        </div>
                      </div>
                    </Button>

                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      className="flex-1 text-left justify-start h-auto p-4"
                      onClick={() => handlePreviewOtherTemplate("allergies", "Allergies & Reactions", "patient-records")}
                    >
                      <div>
                        <div className="font-medium">Allergies & Reactions</div>
                        <div className="text-sm text-gray-500">
                          Known allergies including drugs, foods, environmental
                          triggers, and reaction severity
                        </div>
                      </div>
                    </Button>

                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      className="flex-1 text-left justify-start h-auto p-4"
                      onClick={() => handlePreviewOtherTemplate("vital-signs", "Latest Vital Signs", "patient-records")}
                    >
                      <div>
                        <div className="font-medium">Latest Vital Signs</div>
                        <div className="text-sm text-gray-500">
                          Recent vital signs measurements including blood
                          pressure, heart rate, and temperature
                        </div>
                      </div>
                    </Button>

                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      className="flex-1 text-left justify-start h-auto p-4"
                      onClick={() => handlePreviewOtherTemplate("diagnosis-history", "Diagnosis History", "patient-records")}
                    >
                      <div>
                        <div className="font-medium">Diagnosis History</div>
                        <div className="text-sm text-gray-500">
                          Current and past diagnoses with ICD-10 codes and
                          treatment history
                        </div>
                      </div>
                    </Button>

                  </div>
                </div>
              </div>

              {/* Information Note */}
              <div>
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-blue-800 mb-2">
                    Patient Records Templates
                  </h4>
                  <p className="text-sm text-blue-700">
                    These templates insert comprehensive patient medical record
                    information for clinical documentation. The placeholders are
                    marked with square brackets (e.g., [Medical History]) for
                    easy identification and replacement with actual patient
                    data.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowPatientRecordsDialog(false);
                  setShowAllTemplatesDialog(true);
                }}
              >
                Back
              </Button>
              <Button
                variant="ghost"
                className="border transition-all duration-200"
                style={{
                  backgroundColor: "white",
                  borderColor: "#e5e7eb",
                  color: "black",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = "#A3A8FC";
                  e.currentTarget.style.borderColor = "#A3A8FC";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "white";
                  e.currentTarget.style.borderColor = "#e5e7eb";
                }}
                onClick={() => setShowPatientRecordsDialog(false)}
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Insert Product Dialog */}
      <Dialog
        open={showInsertProductDialog}
        onOpenChange={setShowInsertProductDialog}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle> Product Information</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 max-h-96 overflow-y-auto">
              {/* Product Options */}
              <div>
                <h3 className="font-semibold mb-2">
                  Product Information Templates
                </h3>
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      className="flex-1 text-left justify-start h-auto p-4"
                      onClick={() => handlePreviewOtherTemplate("medication", "Medication Information", "product")}
                    >
                      <div>
                        <div className="font-medium">Medication Information</div>
                        <div className="text-sm text-gray-500">
                          Complete medication details including generic name,
                          strength, form, manufacturer, NDC, and pricing
                        </div>
                      </div>
                    </Button>

                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      className="flex-1 text-left justify-start h-auto p-4"
                      onClick={() => handlePreviewOtherTemplate("medical-device", "Medical Device", "product")}
                    >
                      <div>
                        <div className="font-medium">Medical Device</div>
                        <div className="text-sm text-gray-500">
                          Medical device specifications including model number,
                          manufacturer, category, FDA approval, and warranty
                        </div>
                      </div>
                    </Button>

                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      className="flex-1 text-left justify-start h-auto p-4"
                      onClick={() => handlePreviewOtherTemplate("medical-supplies", "Medical Supplies", "product")}
                    >
                      <div>
                        <div className="font-medium">Medical Supplies</div>
                        <div className="text-sm text-gray-500">
                          Medical supplies information including brand, quantity,
                          unit pricing, sterility, and expiration
                        </div>
                      </div>
                    </Button>

                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      className="flex-1 text-left justify-start h-auto p-4"
                      onClick={() => handlePreviewOtherTemplate("laboratory-test", "Laboratory Test", "product")}
                    >
                      <div>
                        <div className="font-medium">Laboratory Test</div>
                        <div className="text-sm text-gray-500">
                          Lab test details including test code, type, processing
                          time, pricing, and special requirements
                        </div>
                      </div>
                    </Button>

                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      className="flex-1 text-left justify-start h-auto p-4"
                      onClick={() => handlePreviewOtherTemplate("treatment-package", "Treatment Package", "product")}
                    >
                      <div>
                        <div className="font-medium">Treatment Package</div>
                        <div className="text-sm text-gray-500">
                          Treatment package information including services,
                          duration, provider, pricing, and coverage details
                        </div>
                      </div>
                    </Button>

                  </div>
                </div>
              </div>

              {/* Information Note */}
              <div>
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-blue-800 mb-2">
                    Product Information Templates
                  </h4>
                  <p className="text-sm text-blue-700">
                    These templates insert detailed product information for
                    healthcare documentation and billing purposes. The
                    placeholders are marked with square brackets (e.g., [Product
                    Name]) for easy identification and replacement with actual
                    product data.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowInsertProductDialog(false);
                  setShowAllTemplatesDialog(true);
                }}
              >
                Back
              </Button>
              <Button
                variant="ghost"
                className="border transition-all duration-200"
                style={{
                  backgroundColor: "white",
                  borderColor: "#e5e7eb",
                  color: "black",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = "#A3A8FC";
                  e.currentTarget.style.borderColor = "#A3A8FC";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "white";
                  e.currentTarget.style.borderColor = "#e5e7eb";
                }}
                onClick={() => setShowInsertProductDialog(false)}
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* More Options Dialog */}
      <Dialog
        open={showMoreOptionsDialog}
        onOpenChange={setShowMoreOptionsDialog}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>More Formatting Options</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 max-h-96 overflow-y-auto">
              {/* Additional Formatting Options */}
              <div>
                <h3 className="font-semibold mb-2">
                  Additional Formatting Tools
                </h3>
                <div className="space-y-2">
                  <Button
                    variant="outline"
                    className="w-full text-left justify-start h-auto p-4"
                    onClick={() => handleMoreOption("table")}
                  >
                    <div>
                      <div className="font-medium">Insert Table</div>
                      <div className="text-sm text-gray-500">
                        Add a 3x3 table with headers for organizing data
                      </div>
                    </div>
                  </Button>

                  <Button
                    variant="outline"
                    className="w-full text-left justify-start h-auto p-4"
                    onClick={() => handleMoreOption("checkbox-list")}
                  >
                    <div>
                      <div className="font-medium">Checkbox List</div>
                      <div className="text-sm text-gray-500">
                        Create a checklist with interactive checkboxes
                      </div>
                    </div>
                  </Button>

                  <Button
                    variant="outline"
                    className="w-full text-left justify-start h-auto p-4"
                    onClick={() => handleMoreOption("horizontal-line")}
                  >
                    <div>
                      <div className="font-medium">Horizontal Line</div>
                      <div className="text-sm text-gray-500">
                        Insert a horizontal divider line
                      </div>
                    </div>
                  </Button>

                  <Button
                    variant="outline"
                    className="w-full text-left justify-start h-auto p-4"
                    onClick={() => handleMoreOption("date-time")}
                  >
                    <div>
                      <div className="font-medium">Current Date & Time</div>
                      <div className="text-sm text-gray-500">
                        Insert current date and time stamp
                      </div>
                    </div>
                  </Button>

                  <Button
                    variant="outline"
                    className="w-full text-left justify-start h-auto p-4"
                    onClick={() => handleMoreOption("signature-line")}
                  >
                    <div>
                      <div className="font-medium">Signature Line</div>
                      <div className="text-sm text-gray-500">
                        Add signature, print name, and date lines
                      </div>
                    </div>
                  </Button>

                  <Button
                    variant="outline"
                    className="w-full text-left justify-start h-auto p-4"
                    onClick={() => handleMoreOption("text-box")}
                  >
                    <div>
                      <div className="font-medium">Text Box</div>
                      <div className="text-sm text-gray-500">
                        Insert a highlighted text box for important notes
                      </div>
                    </div>
                  </Button>
                </div>
              </div>

              {/* Information Note */}
              <div>
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-blue-800 mb-2">
                    Additional Formatting Options
                  </h4>
                  <p className="text-sm text-blue-700">
                    These advanced formatting options provide additional
                    document structure and interactive elements. Use these tools
                    to create professional documents with tables, checklists,
                    signatures, and highlighted content.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <Button
                variant="ghost"
                className="border transition-all duration-200"
                style={{
                  backgroundColor: "white",
                  borderColor: "#e5e7eb",
                  color: "black",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = "#A3A8FC";
                  e.currentTarget.style.borderColor = "#A3A8FC";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "white";
                  e.currentTarget.style.borderColor = "#e5e7eb";
                }}
                onClick={() => setShowMoreOptionsDialog(false)}
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* View Saved Templates Dialog */}
      <Dialog
        open={showSavedTemplatesDialog}
        onOpenChange={setShowSavedTemplatesDialog}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Saved Templates 2</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {templates && templates.length > 0 ? (
              <div className="grid grid-cols-1 gap-4 max-h-96 overflow-y-auto">
                {templates.map((template: any) => (
                  <div key={template.id} className="border rounded-lg p-4">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h6 className="font-small">{template.name}</h6>
                        <p className="text-sm text-gray-500">
                          Created:{" "}
                          {new Date(template.createdAt).toLocaleDateString()}
                        </p>
                        <div className="mt-2 text-sm text-gray-700">
                          <div
                            dangerouslySetInnerHTML={{
                              __html:
                                template.content.substring(0, 200) + "...",
                            }}
                          />
                        </div>
                      </div>
                      <div className="flex gap-2 ml-4">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedSavedTemplate(template);
                            setShowSavedTemplatePreviewDialog(true);
                          }}
                        >
                          Preview
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-red-600 hover:text-red-700"
                          onClick={async () => {
                            try {
                              const response = await fetch(
                                `/api/documents/${template.id}`,
                                {
                                  method: "DELETE",
                                  headers: {
                                    "Content-Type": "application/json",
                                    Authorization: `Bearer ${localStorage.getItem("auth_token")}`,
                                  },
                                },
                              );

                              if (response.ok) {
                                toast({
                                  title: "✓ Template Deleted",
                                  description: "Template deleted successfully",
                                  duration: 3000,
                                });
                                // Refresh templates
                                window.location.reload();
                              } else {
                                throw new Error("Failed to delete template");
                              }
                            } catch (error) {
                              toast({
                                title: "Error",
                                description: "Failed to delete template",
                                duration: 3000,
                              });
                            }
                          }}
                        >
                          Delete
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <p>No saved templates found.</p>
                <p className="text-sm mt-2">
                  Create a document and click "Save Template" to save it for
                  reuse.
                </p>
              </div>
            )}

            <div className="flex justify-end">
              <Button
                variant="ghost"
                className="border transition-all duration-200"
                style={{
                  backgroundColor: "white",
                  borderColor: "#e5e7eb",
                  color: "black",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = "#A3A8FC";
                  e.currentTarget.style.borderColor = "#A3A8FC";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "white";
                  e.currentTarget.style.borderColor = "#e5e7eb";
                }}
                onClick={() => setShowSavedTemplatesDialog(false)}
              >
                Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Saved Template Preview Dialog */}
      <Dialog open={showSavedTemplatePreviewDialog} onOpenChange={setShowSavedTemplatePreviewDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Template Preview</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {selectedSavedTemplate && (
              <>
                <div className="border-b pb-4">
                  <h3 className="text-lg font-semibold">{selectedSavedTemplate.name}</h3>
                  <p className="text-sm text-gray-500">
                    Created: {new Date(selectedSavedTemplate.createdAt).toLocaleDateString()}
                  </p>
                </div>

                <div className="border rounded-lg p-4 bg-gray-50 max-h-96 overflow-y-auto">
                  <div
                    dangerouslySetInnerHTML={{ __html: selectedSavedTemplate.content }}
                    className="prose max-w-none"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-4 border-t">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowSavedTemplatePreviewDialog(false);
                      setSelectedSavedTemplate(null);
                    }}
                  >
                    Back
                  </Button>
                  <Button
                    onClick={() => {
                      if (selectedSavedTemplate) {
                        loadTemplate(selectedSavedTemplate.id);
                        setShowSavedTemplatePreviewDialog(false);
                        setShowSavedTemplatesDialog(false);
                        setSelectedSavedTemplate(null);
                      }
                    }}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    Load
                  </Button>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Empty Content Warning Dialog */}
      <Dialog
        open={showEmptyContentDialog}
        onOpenChange={setShowEmptyContentDialog}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-yellow-500" />
              Empty Content Warning
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-gray-600">
              Please write something in the text area before saving,
              downloading, or printing the document.
            </p>
          </div>
          <div className="flex justify-end">
            <Button
              onClick={() => setShowEmptyContentDialog(false)}
              className="transition-all duration-200"
              style={{
                backgroundColor: "white",
                borderColor: "#e5e7eb",
                color: "black",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = "#7279FB";
                e.currentTarget.style.borderColor = "#7279FB";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "white";
                e.currentTarget.style.borderColor = "#e5e7eb";
              }}
              data-testid="button-close-empty-dialog"
            >
              OK
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Template Save Success Modal */}
      <Dialog
        open={showTemplateSaveSuccessModal}
        onOpenChange={setShowTemplateSaveSuccessModal}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle className="h-6 w-6 text-green-500" />
              Success
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-gray-600">
              Template saved successfully as "<span className="font-semibold text-gray-900">{savedTemplateName}</span>" and is now available for reuse.
            </p>
          </div>
          <div className="flex justify-end">
            <Button
              onClick={() => setShowTemplateSaveSuccessModal(false)}
              className="bg-green-600 hover:bg-green-700 text-white"
              data-testid="button-close-success-modal"
            >
              OK
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Document Preview Dialog */}
      <Dialog
        open={showDocumentPreviewDialog}
        onOpenChange={setShowDocumentPreviewDialog}
      >
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              Document Preview
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <div className="border rounded-lg p-4 bg-white min-h-96 max-h-96 overflow-y-auto">
              <div
                dangerouslySetInnerHTML={{ __html: documentContent }}
                className="prose prose-sm max-w-none"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button
              onClick={() => setShowDocumentPreviewDialog(false)}
              className="transition-all duration-200"
              style={{
                backgroundColor: "white",
                borderColor: "#e5e7eb",
                color: "black",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = "#7279FB";
                e.currentTarget.style.borderColor = "#7279FB";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "white";
                e.currentTarget.style.borderColor = "#e5e7eb";
              }}
              data-testid="button-close-preview-dialog"
            >
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Share Dialog - Letter Details */}
      <Dialog open={showShareDialog} onOpenChange={setShowShareDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              Share letter
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* First Row - Subject and Recipient */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="share-subject" className="text-sm font-medium">
                  Subject
                </Label>
                <Input
                  id="share-subject"
                  value={shareFormData.subject}
                  onChange={(e) =>
                    setShareFormData((prev) => ({ ...prev, subject: e.target.value }))
                  }
                  placeholder="Enter subject"
                  className="w-full mt-1"
                />
              </div>
              <div>
                <Label htmlFor="share-recipient" className="text-sm font-medium">
                  Recipient (optional)
                </Label>
                <Input
                  id="share-recipient"
                  type="email"
                  value={shareFormData.recipient}
                  onChange={(e) =>
                    setShareFormData((prev) => ({ ...prev, recipient: e.target.value }))
                  }
                  placeholder="Enter or select recipient email"
                  className="w-full mt-1"
                  list="recipient-suggestions"
                  data-testid="input-recipient-email"
                />
                <datalist id="recipient-suggestions">
                  {user?.role === 'patient' ? (
                    // For patient role, show doctors from users table
                    usersLoading ? null : (
                      users
                        .filter((doctor) => isDoctorLike(doctor.role) && doctor.email && doctor.email.trim() !== "")
                        .map((doctor) => (
                          <option key={doctor.id} value={doctor.email!}>
                            Dr. {doctor.firstName} {doctor.lastName}
                          </option>
                        ))
                    )
                  ) : (
                    // For other roles, show patients
                    patientsLoading ? null : (
                      patientsFromTable
                        .filter((patient) => patient.email && patient.email.trim() !== "")
                        .map((patient) => (
                          <option key={patient.id} value={patient.email!}>
                            {patient.firstName} {patient.lastName}
                          </option>
                        ))
                    )
                  )}
                </datalist>
              </div>
            </div>

            {/* Second Row - Location and Copied Recipients */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="share-location" className="text-sm font-medium">
                  Location (optional)
                </Label>
                <Select
                  value={shareFormData.location}
                  onValueChange={(value) =>
                    setShareFormData((prev) => ({ ...prev, location: value }))
                  }
                >
                  <SelectTrigger className="w-full mt-1">
                    <SelectValue placeholder="Select..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="main-clinic">Main Clinic</SelectItem>
                    <SelectItem value="branch-office">Branch Office</SelectItem>
                    <SelectItem value="hospital">Hospital</SelectItem>
                    <SelectItem value="specialty-center">Specialty Center</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="share-copied" className="text-sm font-medium">
                  Copied in recipients (optional)
                </Label>
                <Input
                  id="share-copied"
                  value={shareFormData.copiedRecipients}
                  onChange={(e) =>
                    setShareFormData((prev) => ({ ...prev, copiedRecipients: e.target.value }))
                  }
                  placeholder="Enter copied recipients"
                  className="w-full mt-1"
                />
              </div>
            </div>

            {/* Third Row - Doctor and Header */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="share-doctor" className="text-sm font-medium">
                  Doctor (optional)
                </Label>
                <Popover open={doctorDropdownOpen} onOpenChange={setDoctorDropdownOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={doctorDropdownOpen}
                      className="w-full mt-1 justify-between"
                    >
                      {shareFormData.doctor
                        ? doctors.find((doctor) => doctor.email === shareFormData.doctor)
                          ? `Dr. ${doctors.find((doctor) => doctor.email === shareFormData.doctor)?.firstName} ${doctors.find((doctor) => doctor.email === shareFormData.doctor)?.lastName} (${shareFormData.doctor})`
                          : shareFormData.doctor
                        : "Select doctor..."}
                      <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-full p-0">
                    <Command>
                      <CommandInput placeholder="Search doctors..." />
                      <CommandList>
                        <CommandEmpty>No doctors found.</CommandEmpty>
                        <CommandGroup>
                          {usersLoading ? (
                            <CommandItem disabled>Loading doctors...</CommandItem>
                          ) : doctors.length > 0 ? (
                            doctors.map((doctor) => (
                              <CommandItem
                                key={doctor.id}
                                value={`${doctor.firstName} ${doctor.lastName} ${doctor.email}`}
                                onSelect={() => {
                                  setShareFormData((prev) => ({ ...prev, doctor: doctor.email }));
                                  setDoctorDropdownOpen(false);
                                }}
                              >
                                Dr. {doctor.firstName} {doctor.lastName} ({doctor.email})
                              </CommandItem>
                            ))
                          ) : (
                            <CommandItem disabled>No doctors available</CommandItem>
                          )}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
              <div>
                <Label htmlFor="share-header" className="text-sm font-medium">
                  Select Header
                </Label>
                <Select
                  value={shareFormData.header}
                  onValueChange={(value) =>
                    setShareFormData((prev) => ({ ...prev, header: value }))
                  }
                >
                  <SelectTrigger className="w-full mt-1">
                    <SelectValue placeholder="Your Clinic" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="your-clinic">Your Clinic</SelectItem>
                    <SelectItem value="main-hospital">Main Hospital</SelectItem>
                    <SelectItem value="cardiology-dept">Cardiology Department</SelectItem>
                    <SelectItem value="neurology-dept">Neurology Department</SelectItem>
                    <SelectItem value="orthopedic-dept">Orthopedic Department</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Create the Letter Section */}
            <div className="border-t pt-4 mt-6">
              <div className="text-center">

                <div className="flex justify-center gap-3">
                  <Button
                    variant="outline"
                    onClick={() => setShowShareDialog(false)}
                    className="px-6"
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="outline"
                    onClick={async () => {
                      // Save current letter as draft
                      if (!documentContent || documentContent.trim() === '') {
                        toast({
                          title: "Error",
                          description: "Please create document content before saving draft.",
                          variant: "destructive"
                        });
                        return;
                      }

                      try {
                        const response = await fetch("/api/letter-drafts", {
                          method: "POST",
                          headers: {
                            "Content-Type": "application/json",
                            Authorization: `Bearer ${localStorage.getItem("auth_token")}`,
                          },
                          body: JSON.stringify({
                            subject: shareFormData.subject || "Untitled Letter",
                            recipient: shareFormData.recipient || "No recipient",
                            doctorEmail: shareFormData.doctor,
                            location: shareFormData.location,
                            copiedRecipients: shareFormData.copiedRecipients,
                            header: shareFormData.header,
                            documentContent: documentContent,
                          }),
                        });

                        if (response.ok) {
                          toast({
                            title: "Draft Saved",
                            description: "Letter has been saved as draft successfully.",
                          });
                          refetchDrafts(); // Refresh drafts list
                          setShowShareDialog(false);
                          setShowDraftsDialog(true);
                        } else {
                          toast({
                            title: "Error",
                            description: "Failed to save draft. Please try again.",
                            variant: "destructive"
                          });
                        }
                      } catch (error) {
                        console.error("Error saving draft:", error);
                        toast({
                          title: "Error",
                          description: "Failed to save draft. Please try again.",
                          variant: "destructive"
                        });
                      }
                    }}
                    className="px-6"
                    data-testid="button-drafts"
                  >
                    Save Drafts
                  </Button>
                  <Button
                    onClick={async () => {
                      if (!shareFormData.recipient) {
                        toast({
                          title: "Error",
                          description: "Please select a recipient to send the letter.",
                          variant: "destructive"
                        });
                        return;
                      }

                      if (!documentContent || documentContent.trim() === '') {
                        toast({
                          title: "Error",
                          description: "Please create document content before sending.",
                          variant: "destructive"
                        });
                        return;
                      }

                      try {
                        const response = await fetch("/api/email/send-letter", {
                          method: "POST",
                          headers: {
                            "Content-Type": "application/json",
                            Authorization: `Bearer ${localStorage.getItem("auth_token")}`,
                            "X-Tenant-Subdomain": localStorage.getItem("user_subdomain") || "",
                          },
                          body: JSON.stringify({
                            to: shareFormData.recipient,
                            subject: shareFormData.subject || "Medical Document",
                            documentContent: documentContent,
                            doctorEmail: shareFormData.doctor,
                            location: shareFormData.location,
                            copiedRecipients: shareFormData.copiedRecipients,
                            header: shareFormData.header,
                          }),
                        });

                        const responseData = await response.json();

                        if (response.ok) {
                          if (responseData.success) {
                            // Email sent successfully
                            setSuccessMessage(`Letter has been sent successfully to ${shareFormData.recipient}`);
                            setShowSuccessModal(true);
                            setShowShareDialog(false);
                            // Reset form
                            setShareFormData({
                              subject: "",
                              recipient: "",
                              location: "",
                              copiedRecipients: "",
                              doctor: "",
                              header: "",
                            });
                          } else if (responseData.savedAsDraft) {
                            // Email failed but saved as draft
                            refetchDrafts(); // Refresh drafts list
                            toast({
                              title: "Saved as Draft",
                              description: responseData.message || "Email delivery failed but letter saved as draft.",
                              variant: "default"
                            });
                            setShowShareDialog(false);
                            // Don't reset form - user might want to retry
                          }
                        } else {
                          if (responseData.savedAsDraft) {
                            // Error occurred but saved as draft
                            refetchDrafts(); // Refresh drafts list
                            toast({
                              title: "Error - Saved as Draft",
                              description: responseData.message || "Error occurred but letter saved as draft.",
                              variant: "default"
                            });
                          } else {
                            toast({
                              title: "Error",
                              description: responseData.error || "Failed to send letter",
                              variant: "destructive"
                            });
                          }
                        }
                      } catch (error) {
                        console.error("Error sending letter:", error);
                        toast({
                          title: "Error",
                          description: "Failed to send letter. Please try again.",
                          variant: "destructive"
                        });
                      }
                    }}
                    className="px-6"
                    style={{
                      backgroundColor: "white",
                      borderColor: "grey",
                      color: "black",
                    }}
                  >
                    Send Letter
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Patient Template Category Selection Dialog */}
      <Dialog open={showPatientTemplateDialog} onOpenChange={setShowPatientTemplateDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Select Letter Template Category</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-gray-600">Choose a category for your letter template:</p>
            <div className="grid gap-3">
              {Object.keys(patientTemplates).map((category) => (
                <Button
                  key={category}
                  variant="outline"
                  className="h-12 justify-start text-left p-4 hover:bg-blue-50"
                  onClick={() => handlePatientTemplateSelect(category)}
                >
                  {category}
                </Button>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Patient Template Options Dialog */}
      <Dialog open={showCategoryOptionsDialog} onOpenChange={setShowCategoryOptionsDialog}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{selectedTemplateCategory}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-gray-600">Choose a specific template option:</p>
            <div className="grid gap-3">
              {selectedCategoryData?.options.map((option: string) => (
                <Button
                  key={option}
                  variant="outline"
                  className="h-auto justify-start text-left p-4 hover:bg-blue-50 whitespace-normal"
                  onClick={() => handleTemplateOptionSelect(option)}
                  data-testid={`button-template-${option.toLowerCase().replace(/\s+/g, '-')}`}
                >
                  <div>
                    <div className="font-medium">{option}</div>
                    <div className="text-xs text-gray-500 mt-1">
                      {selectedCategoryData?.templates[option]?.subject}
                    </div>
                  </div>
                </Button>
              ))}
            </div>
            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => {
                  setShowCategoryOptionsDialog(false);
                  setShowPatientTemplateDialog(true);
                }}
              >
                Back to Categories
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowCategoryOptionsDialog(false)}
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Doctor Template Category Selection Dialog */}
      <Dialog open={showDoctorTemplateDialog} onOpenChange={setShowDoctorTemplateDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Select Doctor Letter Template Category</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-gray-600">Choose a category for your doctor-to-patient letter template:</p>
            <div className="grid gap-3">
              {Object.keys(doctorTemplates).map((category) => (
                <Button
                  key={category}
                  variant="outline"
                  className="h-12 justify-start text-left p-4 hover:bg-blue-50"
                  onClick={() => handleDoctorTemplateSelect(category)}
                >
                  {category}
                </Button>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Doctor Template Options Dialog */}
      <Dialog open={showDoctorCategoryOptionsDialog} onOpenChange={setShowDoctorCategoryOptionsDialog}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{selectedDoctorTemplateCategory}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-gray-600">Choose a specific template option:</p>
            <div className="grid gap-3">
              {selectedDoctorCategoryData?.options.map((option: string) => (
                <Button
                  key={option}
                  variant="outline"
                  className="h-auto justify-start text-left p-4 hover:bg-blue-50 whitespace-normal"
                  onClick={() => handleDoctorTemplateOptionSelect(option)}
                  data-testid={`button-doctor-template-${option.toLowerCase().replace(/\s+/g, '-')}`}
                >
                  <div>
                    <div className="font-medium">{option}</div>
                    <div className="text-xs text-gray-500 mt-1">
                      {selectedDoctorCategoryData?.templates[option]?.subject}
                    </div>
                  </div>
                </Button>
              ))}
            </div>
            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => {
                  setShowDoctorCategoryOptionsDialog(false);
                  setShowDoctorTemplateDialog(true);
                }}
              >
                Back to Categories
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowDoctorCategoryOptionsDialog(false)}
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Template Preview Dialog */}
      <Dialog open={showTemplatePreviewDialog} onOpenChange={setShowTemplatePreviewDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{previewTemplateName}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Options Section */}
            <div className="bg-blue-50 p-4 rounded-lg border">
              <h4 className="text-sm font-medium text-gray-700 mb-3">Additional Options:</h4>
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={addLogo}
                      onChange={(e) => {
                        setAddLogo(e.target.checked);
                        if (e.target.checked) {
                          setShowLogoTemplatesDialog(true);
                        }
                      }}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">Add Logo</span>
                  </label>
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={addClinicHeader}
                      onChange={(e) => {
                        setAddClinicHeader(e.target.checked);
                        if (e.target.checked) {
                          setShowClinicHeaderDialog(true);
                        }
                      }}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">Clinic Header Templates</span>
                  </label>
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={addFooter}
                      onChange={(e) => setAddFooter(e.target.checked)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">Footer</span>
                  </label>
                </div>

                {addLogo && selectedLogoTemplate && (
                  <div className="bg-white p-3 rounded border">
                    <h5 className="text-sm font-medium text-gray-700 mb-1">Selected Logo Template:</h5>
                    <p className="text-sm text-gray-600 mb-3">
                      {selectedLogoTemplate === "modern-clinic" && "Modern Clinic - Icon with clinic name"}
                      {selectedLogoTemplate === "professional" && "Professional - Boxed design"}
                      {selectedLogoTemplate === "minimal" && "Minimal - Clean typography"}
                      {selectedLogoTemplate === "medical-cross" && "Medical Cross - Classic red cross"}
                      {selectedLogoTemplate === "health-plus" && "Health Plus - Medical symbol"}
                      {selectedLogoTemplate === "custom" && "Upload Custom - Browse files"}
                    </p>
                    <h5 className="text-sm font-medium text-gray-700 mb-2">Logo & header Position:</h5>
                    <div className="flex gap-3">
                      <label className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="radio"
                          name="logoPosition"
                          value="left"
                          checked={logoPosition === "left"}
                          onChange={(e) => setLogoPosition(e.target.value)}
                          className="text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-700">Left</span>
                      </label>
                      <label className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="radio"
                          name="logoPosition"
                          value="center"
                          checked={logoPosition === "center"}
                          onChange={(e) => setLogoPosition(e.target.value)}
                          className="text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-700">Center</span>
                      </label>
                      <label className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="radio"
                          name="logoPosition"
                          value="right"
                          checked={logoPosition === "right"}
                          onChange={(e) => setLogoPosition(e.target.value)}
                          className="text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-700">Right</span>
                      </label>
                    </div>
                  </div>
                )}

                {addClinicHeader && selectedClinicHeaderType && (
                  <div className="bg-white p-3 rounded border">
                    <h5 className="text-sm font-medium text-gray-700 mb-1">Selected Clinic Header:</h5>
                    <p className="text-sm text-gray-600 mb-3">
                      {selectedClinicHeaderType === "full-header" && "Full Header - Complete clinic header with name, address, phone, email, and website"}
                      {selectedClinicHeaderType === "professional-letterhead" && "Professional Letterhead - Formal letterhead design with clinic branding"}
                      {selectedClinicHeaderType === "clinic-name-only" && "Clinic Name Only - Just the clinic name in bold text"}
                      {selectedClinicHeaderType === "contact-info-block" && "Contact Information Block - Formatted contact details section"}
                    </p>
                    <h5 className="text-sm font-medium text-gray-700 mb-2">Header Position:</h5>
                    <div className="flex gap-3">
                      <label className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="radio"
                          name="clinicHeaderPosition"
                          value="left"
                          checked={clinicHeaderPosition === "left"}
                          onChange={(e) => setClinicHeaderPosition(e.target.value)}
                          className="text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-700">Left</span>
                      </label>
                      <label className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="radio"
                          name="clinicHeaderPosition"
                          value="center"
                          checked={clinicHeaderPosition === "center"}
                          onChange={(e) => setClinicHeaderPosition(e.target.value)}
                          className="text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-700">Center</span>
                      </label>
                      <label className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="radio"
                          name="clinicHeaderPosition"
                          value="right"
                          checked={clinicHeaderPosition === "right"}
                          onChange={(e) => setClinicHeaderPosition(e.target.value)}
                          className="text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-700">Right</span>
                      </label>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Preview Section */}
            {previewTemplate && (
              <div className="bg-gray-50 p-4 rounded-lg border">
                <h4 className="text-sm font-medium text-gray-700 mb-3">Preview:</h4>
                <div className="bg-white p-4 rounded border">
                  {/* Header Preview */}
                  {(addLogo || addClinicHeader) && (
                    <>
                      {logoPosition === "center" && addLogo && !addClinicHeader ? (
                        <div className="text-center mb-4">
                          {selectedLogoTemplate === "modern-clinic" && (
                            <div className="w-16 h-16 bg-purple-200 rounded flex items-center justify-center mx-auto">
                              <span className="text-purple-600 text-xs font-bold">🏥</span>
                            </div>
                          )}
                          {selectedLogoTemplate === "professional" && (
                            <div className="w-16 h-16 border-2 border-teal-500 rounded flex items-center justify-center bg-white mx-auto">
                              <span className="text-teal-600 text-xs font-bold">MEDICAL</span>
                            </div>
                          )}
                          {selectedLogoTemplate === "minimal" && (
                            <div className="w-16 h-16 bg-gray-200 rounded flex items-center justify-center mx-auto">
                              <span className="text-gray-600 text-xs font-bold">PRACTICE</span>
                            </div>
                          )}
                          {selectedLogoTemplate === "medical-cross" && (
                            <div className="w-16 h-16 bg-red-100 rounded flex items-center justify-center mx-auto">
                              <span className="text-red-600 text-lg">✚</span>
                            </div>
                          )}
                          {selectedLogoTemplate === "health-plus" && (
                            <div className="w-16 h-16 bg-blue-100 rounded flex items-center justify-center mx-auto">
                              <span className="text-blue-600 text-xl">⚕️</span>
                            </div>
                          )}
                          {selectedLogoTemplate === "custom" && customLogoData && (
                            <div className="w-16 h-16 rounded flex items-center justify-center mx-auto">
                              <img src={customLogoData} alt="Custom Logo" className="max-w-16 max-h-16 object-contain" />
                            </div>
                          )}
                          {selectedLogoTemplate === "custom" && !customLogoData && (
                            <div className="w-16 h-16 bg-yellow-100 rounded flex items-center justify-center mx-auto">
                              <span className="text-yellow-600 text-xl">📁</span>
                            </div>
                          )}
                          {!selectedLogoTemplate && (
                            <div className="w-16 h-16 bg-blue-600 rounded flex items-center justify-center mx-auto">
                              <span className="text-white font-bold text-xs">LOGO</span>
                            </div>
                          )}
                        </div>
                      ) : logoPosition === "center" && addLogo && addClinicHeader ? (
                        <div className="mb-4">
                          <div className="flex justify-center items-center gap-4">
                            <div>
                              {selectedLogoTemplate === "modern-clinic" && (
                                <div className="w-16 h-16 bg-purple-200 rounded flex items-center justify-center">
                                  <span className="text-purple-600 text-xs font-bold">🏥</span>
                                </div>
                              )}
                              {selectedLogoTemplate === "professional" && (
                                <div className="w-16 h-16 border-2 border-teal-500 rounded flex items-center justify-center bg-white">
                                  <span className="text-teal-600 text-xs font-bold">MEDICAL</span>
                                </div>
                              )}
                              {selectedLogoTemplate === "minimal" && (
                                <div className="w-16 h-16 bg-gray-200 rounded flex items-center justify-center">
                                  <span className="text-gray-600 text-xs font-bold">PRACTICE</span>
                                </div>
                              )}
                              {selectedLogoTemplate === "medical-cross" && (
                                <div className="w-16 h-16 bg-red-100 rounded flex items-center justify-center">
                                  <span className="text-red-600 text-lg">✚</span>
                                </div>
                              )}
                              {selectedLogoTemplate === "health-plus" && (
                                <div className="w-16 h-16 bg-blue-100 rounded flex items-center justify-center">
                                  <span className="text-blue-600 text-xl">⚕️</span>
                                </div>
                              )}
                              {selectedLogoTemplate === "custom" && customLogoData && (
                                <div className="w-16 h-16 rounded flex items-center justify-center">
                                  <img src={customLogoData} alt="Custom Logo" className="max-w-16 max-h-16 object-contain" />
                                </div>
                              )}
                              {selectedLogoTemplate === "custom" && !customLogoData && (
                                <div className="w-16 h-16 bg-yellow-100 rounded flex items-center justify-center">
                                  <span className="text-yellow-600 text-xl">📁</span>
                                </div>
                              )}
                              {!selectedLogoTemplate && (
                                <div className="w-16 h-16 bg-blue-600 rounded flex items-center justify-center">
                                  <span className="text-white font-bold text-xs">LOGO</span>
                                </div>
                              )}
                            </div>
                            <div>
                              {selectedClinicHeaderType === "full-header" && (
                                <div className={`${clinicHeaderPosition === 'left' ? 'text-left' : clinicHeaderPosition === 'right' ? 'text-right' : 'text-center'}`}>
                                  <h1 className="text-xl font-bold text-blue-600 mb-1">Demo Healthcare Clinic</h1>
                                  <p className="text-xs text-gray-600">123 Healthcare Street, Medical City, MC 12345</p>
                                  <p className="text-xs text-gray-600">+44 20 1234 5678 • info@yourdlinic.com</p>
                                  <p className="text-xs text-gray-600">www.yourdlinic.com</p>
                                </div>
                              )}
                              {selectedClinicHeaderType === "professional-letterhead" && (
                                <div className={`${clinicHeaderPosition === 'left' ? 'text-left' : clinicHeaderPosition === 'right' ? 'text-right' : 'text-center'} border-b-2 border-blue-600 pb-2`}>
                                  <h1 className="text-xl font-bold text-blue-600 mb-1">Demo Healthcare Clinic</h1>
                                  <p className="text-xs text-gray-600 italic">Excellence in Healthcare</p>
                                </div>
                              )}
                              {selectedClinicHeaderType === "clinic-name-only" && (
                                <div className={`${clinicHeaderPosition === 'left' ? 'text-left' : clinicHeaderPosition === 'right' ? 'text-right' : 'text-center'}`}>
                                  <h1 className="text-xl font-bold text-blue-600">Demo Healthcare Clinic</h1>
                                </div>
                              )}
                              {selectedClinicHeaderType === "contact-info-block" && (
                                <div className={`${clinicHeaderPosition === 'left' ? 'text-left' : clinicHeaderPosition === 'right' ? 'text-right' : 'text-center'} bg-gray-50 p-2 rounded`}>
                                  <p className="text-xs text-gray-600"><strong>Phone:</strong> +44 20 1234 5678</p>
                                  <p className="text-xs text-gray-600"><strong>Email:</strong> info@yourdlinic.com</p>
                                  <p className="text-xs text-gray-600"><strong>Address:</strong> 123 Healthcare Street, Medical City, MC 12345</p>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ) : logoPosition === "center" && addClinicHeader && !addLogo ? (
                        <div className="mb-4">
                          {selectedClinicHeaderType === "full-header" && (
                            <div className={`${clinicHeaderPosition === 'left' ? 'text-left' : clinicHeaderPosition === 'right' ? 'text-right' : 'text-center'}`}>
                              <h1 className="text-xl font-bold text-blue-600 mb-1">Demo Healthcare Clinic</h1>
                              <p className="text-xs text-gray-600">123 Healthcare Street, Medical City, MC 12345</p>
                              <p className="text-xs text-gray-600">+44 20 1234 5678 • info@yourdlinic.com</p>
                              <p className="text-xs text-gray-600">www.yourdlinic.com</p>
                            </div>
                          )}
                          {selectedClinicHeaderType === "professional-letterhead" && (
                            <div className={`${clinicHeaderPosition === 'left' ? 'text-left' : clinicHeaderPosition === 'right' ? 'text-right' : 'text-center'} border-b-2 border-blue-600 pb-2`}>
                              <h1 className="text-2xl font-bold text-blue-600">Demo Healthcare Clinic</h1>
                              <p className="text-xs text-gray-600 italic">Excellence in Healthcare</p>
                            </div>
                          )}
                          {selectedClinicHeaderType === "clinic-name-only" && (
                            <div className={`${clinicHeaderPosition === 'left' ? 'text-left' : clinicHeaderPosition === 'right' ? 'text-right' : 'text-center'}`}>
                              <h1 className="text-xl font-bold text-blue-600">Demo Healthcare Clinic</h1>
                            </div>
                          )}
                          {selectedClinicHeaderType === "contact-info-block" && (
                            <div className={`${clinicHeaderPosition === 'left' ? 'text-left' : clinicHeaderPosition === 'right' ? 'text-right' : 'text-center'} bg-gray-50 p-2 rounded`}>
                              <p className="text-xs text-gray-600"><strong>Phone:</strong> +44 20 1234 5678</p>
                              <p className="text-xs text-gray-600"><strong>Email:</strong> info@yourdlinic.com</p>
                              <p className="text-xs text-gray-600"><strong>Address:</strong> 123 Healthcare Street, Medical City, MC 12345</p>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="flex justify-between items-center mb-4">
                          {/* Left side */}
                          {logoPosition === "left" && addLogo ? (
                            <div className="text-left">
                              {selectedLogoTemplate === "modern-clinic" && (
                                <div className="w-16 h-16 bg-purple-200 rounded flex items-center justify-center">
                                  <span className="text-purple-600 text-xs font-bold">🏥</span>
                                </div>
                              )}
                              {selectedLogoTemplate === "professional" && (
                                <div className="w-16 h-16 border-2 border-teal-500 rounded flex items-center justify-center bg-white">
                                  <span className="text-teal-600 text-xs font-bold">MEDICAL</span>
                                </div>
                              )}
                              {selectedLogoTemplate === "minimal" && (
                                <div className="w-16 h-16 bg-gray-200 rounded flex items-center justify-center">
                                  <span className="text-gray-600 text-xs font-bold">PRACTICE</span>
                                </div>
                              )}
                              {selectedLogoTemplate === "medical-cross" && (
                                <div className="w-16 h-16 bg-red-100 rounded flex items-center justify-center">
                                  <span className="text-red-600 text-lg">✚</span>
                                </div>
                              )}
                              {selectedLogoTemplate === "health-plus" && (
                                <div className="w-16 h-16 bg-blue-100 rounded flex items-center justify-center">
                                  <span className="text-blue-600 text-xl">⚕️</span>
                                </div>
                              )}
                              {selectedLogoTemplate === "custom" && customLogoData && (
                                <div className="w-16 h-16 rounded flex items-center justify-center">
                                  <img src={customLogoData} alt="Custom Logo" className="max-w-16 max-h-16 object-contain" />
                                </div>
                              )}
                              {selectedLogoTemplate === "custom" && !customLogoData && (
                                <div className="w-16 h-16 bg-yellow-100 rounded flex items-center justify-center">
                                  <span className="text-yellow-600 text-xl">📁</span>
                                </div>
                              )}
                              {!selectedLogoTemplate && (
                                <div className="w-16 h-16 bg-blue-600 rounded flex items-center justify-center">
                                  <span className="text-white font-bold text-xs">LOGO</span>
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="flex-1"></div>
                          )}

                          {/* Center */}
                          {addClinicHeader ? (
                            <div className={`flex-2 ${clinicHeaderPosition === 'left' ? 'text-left' : clinicHeaderPosition === 'right' ? 'text-right' : 'text-center'}`}>
                              {selectedClinicHeaderType === "full-header" && (
                                <div>
                                  <h1 className="text-xl font-bold text-blue-600 mb-1">Demo Healthcare Clinic</h1>
                                  <p className="text-xs text-gray-600">123 Healthcare Street, Medical City, MC 12345</p>
                                  <p className="text-xs text-gray-600">+44 20 1234 5678 • info@yourdlinic.com</p>
                                  <p className="text-xs text-gray-600">www.yourdlinic.com</p>
                                </div>
                              )}
                              {selectedClinicHeaderType === "professional-letterhead" && (
                                <div className="border-b-2 border-blue-600 pb-2">
                                  <h1 className="text-2xl font-bold text-blue-600">Demo Healthcare Clinic</h1>
                                  <p className="text-xs text-gray-600 italic">Excellence in Healthcare</p>
                                </div>
                              )}
                              {selectedClinicHeaderType === "clinic-name-only" && (
                                <div>
                                  <h1 className="text-xl font-bold text-blue-600">Demo Healthcare Clinic</h1>
                                </div>
                              )}
                              {selectedClinicHeaderType === "contact-info-block" && (
                                <div className="bg-gray-50 p-2 rounded">
                                  <p className="text-xs text-gray-600"><strong>Phone:</strong> +44 20 1234 5678</p>
                                  <p className="text-xs text-gray-600"><strong>Email:</strong> info@yourdlinic.com</p>
                                  <p className="text-xs text-gray-600"><strong>Address:</strong> 123 Healthcare Street, Medical City, MC 12345</p>
                                </div>
                              )}
                            </div>
                          ) : logoPosition === "center" && addLogo ? (
                            <div className="flex-2 text-center">
                              {selectedLogoTemplate === "modern-clinic" && (
                                <div className="w-16 h-16 bg-purple-200 rounded flex items-center justify-center mx-auto">
                                  <span className="text-purple-600 text-xs font-bold">🏥</span>
                                </div>
                              )}
                              {selectedLogoTemplate === "professional" && (
                                <div className="w-16 h-16 border-2 border-teal-500 rounded flex items-center justify-center bg-white mx-auto">
                                  <span className="text-teal-600 text-xs font-bold">MEDICAL</span>
                                </div>
                              )}
                              {selectedLogoTemplate === "minimal" && (
                                <div className="w-16 h-16 bg-gray-200 rounded flex items-center justify-center mx-auto">
                                  <span className="text-gray-600 text-xs font-bold">PRACTICE</span>
                                </div>
                              )}
                              {selectedLogoTemplate === "medical-cross" && (
                                <div className="w-16 h-16 bg-red-100 rounded flex items-center justify-center mx-auto">
                                  <span className="text-red-600 text-lg">✚</span>
                                </div>
                              )}
                              {selectedLogoTemplate === "health-plus" && (
                                <div className="w-16 h-16 bg-blue-100 rounded flex items-center justify-center mx-auto">
                                  <span className="text-blue-600 text-xl">⚕️</span>
                                </div>
                              )}
                              {selectedLogoTemplate === "custom" && customLogoData && (
                                <div className="w-16 h-16 rounded flex items-center justify-center mx-auto">
                                  <img src={customLogoData} alt="Custom Logo" className="max-w-16 max-h-16 object-contain" />
                                </div>
                              )}
                              {selectedLogoTemplate === "custom" && !customLogoData && (
                                <div className="w-16 h-16 bg-yellow-100 rounded flex items-center justify-center mx-auto">
                                  <span className="text-yellow-600 text-xl">📁</span>
                                </div>
                              )}
                              {!selectedLogoTemplate && (
                                <div className="w-16 h-16 bg-blue-600 rounded flex items-center justify-center mx-auto">
                                  <span className="text-white font-bold text-xs">LOGO</span>
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="flex-2"></div>
                          )}

                          {/* Right side */}
                          {logoPosition === "right" && addLogo ? (
                            <div className="text-right">
                              {selectedLogoTemplate === "modern-clinic" && (
                                <div className="w-16 h-16 bg-purple-200 rounded flex items-center justify-center">
                                  <span className="text-purple-600 text-xs font-bold">🏥</span>
                                </div>
                              )}
                              {selectedLogoTemplate === "professional" && (
                                <div className="w-16 h-16 border-2 border-teal-500 rounded flex items-center justify-center bg-white">
                                  <span className="text-teal-600 text-xs font-bold">MEDICAL</span>
                                </div>
                              )}
                              {selectedLogoTemplate === "minimal" && (
                                <div className="w-16 h-16 bg-gray-200 rounded flex items-center justify-center">
                                  <span className="text-gray-600 text-xs font-bold">PRACTICE</span>
                                </div>
                              )}
                              {selectedLogoTemplate === "medical-cross" && (
                                <div className="w-16 h-16 bg-red-100 rounded flex items-center justify-center">
                                  <span className="text-red-600 text-lg">✚</span>
                                </div>
                              )}
                              {selectedLogoTemplate === "health-plus" && (
                                <div className="w-16 h-16 bg-blue-100 rounded flex items-center justify-center">
                                  <span className="text-blue-600 text-xl">⚕️</span>
                                </div>
                              )}
                              {selectedLogoTemplate === "custom" && customLogoData && (
                                <div className="w-16 h-16 rounded flex items-center justify-center">
                                  <img src={customLogoData} alt="Custom Logo" className="max-w-16 max-h-16 object-contain" />
                                </div>
                              )}
                              {selectedLogoTemplate === "custom" && !customLogoData && (
                                <div className="w-16 h-16 bg-yellow-100 rounded flex items-center justify-center">
                                  <span className="text-yellow-600 text-xl">📁</span>
                                </div>
                              )}
                              {!selectedLogoTemplate && (
                                <div className="w-16 h-16 bg-blue-600 rounded flex items-center justify-center">
                                  <span className="text-white font-bold text-xs">LOGO</span>
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="flex-1"></div>
                          )}
                        </div>
                      )}
                      <hr className="mb-4 border-gray-300" />
                    </>
                  )}

                  {/* Template Content Preview */}
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm font-medium text-gray-700">Subject:</label>
                      <p className="text-gray-900 font-medium mt-1">{previewTemplate.subject}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">Body:</label>
                      <div className="text-gray-900 mt-1 whitespace-pre-wrap bg-gray-50 p-3 rounded border">
                        {previewTemplate.body}
                      </div>
                    </div>
                  </div>

                  {/* Footer Preview */}
                  {addFooter && (
                    <div className="mt-8 pt-4 border-t border-gray-300 text-center text-xs text-gray-600">
                      <p className="font-bold text-gray-800 mb-1">Demo Healthcare Clinic</p>
                      <p>123 Healthcare Street, Medical City, MC 12345</p>
                      <p>Phone: +44 20 1234 5678 | Email: info@yourdlinic.com</p>
                      <p>www.yourdlinic.com</p>
                    </div>
                  )}
                </div>
              </div>
            )}
            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => {
                  setShowTemplatePreviewDialog(false);
                  setAddLogo(false);
                  setAddClinicHeader(false);
                  setSelectedClinicHeaderType("");
                  setLogoPosition("right");
                  setAddFooter(false);
                  setClinicHeaderPosition("center");
                  setSelectedLogoTemplate("");
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleLoadTemplateFromPreview}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                Load
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Other Templates Preview Dialog */}
      <Dialog open={showOtherTemplatePreviewDialog} onOpenChange={setShowOtherTemplatePreviewDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{previewOtherTemplateName}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Additional Options */}
            <div className="bg-gray-50 p-4 rounded-lg border">
              <h4 className="text-sm font-medium text-gray-700 mb-3">Additional Options:</h4>
              <div className="flex gap-4 flex-wrap">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={addLogo}
                    onChange={(e) => {
                      setAddLogo(e.target.checked);
                      if (e.target.checked) {
                        setShowLogoTemplatesDialog(true);
                      }
                    }}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">Add Logo</span>
                </label>
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={addClinicHeader}
                    onChange={(e) => {
                      setAddClinicHeader(e.target.checked);
                      if (e.target.checked) {
                        setShowClinicHeaderDialog(true);
                      }
                    }}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">Clinic Header Templates</span>
                </label>
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={addFooter}
                    onChange={(e) => setAddFooter(e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">Footer</span>
                </label>
              </div>

              {addLogo && selectedLogoTemplate && (
                <div className="bg-white p-3 rounded border mt-3">
                  <h5 className="text-sm font-medium text-gray-700 mb-1">Selected Logo Template:</h5>
                  <p className="text-sm text-gray-600 mb-3">
                    {selectedLogoTemplate === "modern-clinic" && "Modern Clinic - Icon with clinic name"}
                    {selectedLogoTemplate === "professional" && "Professional - Boxed design"}
                    {selectedLogoTemplate === "minimal" && "Minimal - Clean typography"}
                    {selectedLogoTemplate === "medical-cross" && "Medical Cross - Classic red cross"}
                  </p>
                  <h5 className="text-sm font-medium text-gray-700 mb-2">Logo Position:</h5>
                  <div className="flex gap-3">
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="radio"
                        name="logoPosition"
                        value="left"
                        checked={logoPosition === "left"}
                        onChange={(e) => setLogoPosition(e.target.value)}
                        className="text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">Left</span>
                    </label>
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="radio"
                        name="logoPosition"
                        value="center"
                        checked={logoPosition === "center"}
                        onChange={(e) => setLogoPosition(e.target.value)}
                        className="text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">Center</span>
                    </label>
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="radio"
                        name="logoPosition"
                        value="right"
                        checked={logoPosition === "right"}
                        onChange={(e) => setLogoPosition(e.target.value)}
                        className="text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">Right</span>
                    </label>
                  </div>
                </div>
              )}

              {addClinicHeader && selectedClinicHeaderType && (
                <div className="bg-white p-3 rounded border mt-3">
                  <h5 className="text-sm font-medium text-gray-700 mb-1">Selected Clinic Header:</h5>
                  <p className="text-sm text-gray-600 mb-3">
                    {selectedClinicHeaderType === "full-header" && "Full Header - Complete clinic header with name, address, phone, email, and website"}
                    {selectedClinicHeaderType === "professional-letterhead" && "Professional Letterhead - Formal letterhead design with clinic branding"}
                    {selectedClinicHeaderType === "clinic-name-only" && "Clinic Name Only - Just the clinic name in bold text"}
                    {selectedClinicHeaderType === "contact-info-block" && "Contact Information Block - Formatted contact details section"}
                  </p>
                  <h5 className="text-sm font-medium text-gray-700 mb-2">Header Position:</h5>
                  <div className="flex gap-3">
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="radio"
                        name="clinicHeaderPosition"
                        value="left"
                        checked={clinicHeaderPosition === "left"}
                        onChange={(e) => setClinicHeaderPosition(e.target.value)}
                        className="text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">Left</span>
                    </label>
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="radio"
                        name="clinicHeaderPosition"
                        value="center"
                        checked={clinicHeaderPosition === "center"}
                        onChange={(e) => setClinicHeaderPosition(e.target.value)}
                        className="text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">Center</span>
                    </label>
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="radio"
                        name="clinicHeaderPosition"
                        value="right"
                        checked={clinicHeaderPosition === "right"}
                        onChange={(e) => setClinicHeaderPosition(e.target.value)}
                        className="text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">Right</span>
                    </label>
                  </div>
                </div>
              )}
            </div>

            {/* Preview Section */}
            {previewOtherTemplate && (
              <div className="bg-gray-50 p-4 rounded-lg border">
                <h4 className="text-sm font-medium text-gray-700 mb-3">Preview:</h4>
                <div className="bg-white p-4 rounded border">
                  {/* Header Preview */}
                  {(addLogo || addClinicHeader) && (
                    <>
                      {logoPosition === "center" && addLogo && !addClinicHeader ? (
                        <div className="text-center mb-4">
                          {selectedLogoTemplate === "modern-clinic" && (
                            <div className="w-16 h-16 bg-purple-200 rounded flex items-center justify-center mx-auto">
                              <span className="text-purple-600 text-xs font-bold">🏥</span>
                            </div>
                          )}
                          {selectedLogoTemplate === "professional" && (
                            <div className="w-16 h-16 border-2 border-teal-500 rounded flex items-center justify-center bg-white mx-auto">
                              <span className="text-teal-600 text-xs font-bold">MEDICAL</span>
                            </div>
                          )}
                          {selectedLogoTemplate === "minimal" && (
                            <div className="w-16 h-16 bg-gray-200 rounded flex items-center justify-center mx-auto">
                              <span className="text-gray-600 text-xs font-bold">PRACTICE</span>
                            </div>
                          )}
                          {selectedLogoTemplate === "medical-cross" && (
                            <div className="w-16 h-16 bg-red-100 rounded flex items-center justify-center mx-auto">
                              <span className="text-red-600 text-lg">✚</span>
                            </div>
                          )}
                          {!selectedLogoTemplate && (
                            <div className="w-16 h-16 bg-blue-600 rounded flex items-center justify-center mx-auto">
                              <span className="text-white font-bold text-xs">LOGO</span>
                            </div>
                          )}
                        </div>
                      ) : logoPosition === "center" && addLogo && addClinicHeader ? (
                        <div className="mb-4">
                          <div className="flex justify-center items-center gap-4">
                            <div>
                              {selectedLogoTemplate === "modern-clinic" && (
                                <div className="w-16 h-16 bg-purple-200 rounded flex items-center justify-center">
                                  <span className="text-purple-600 text-xs font-bold">🏥</span>
                                </div>
                              )}
                              {selectedLogoTemplate === "professional" && (
                                <div className="w-16 h-16 border-2 border-teal-500 rounded flex items-center justify-center bg-white">
                                  <span className="text-teal-600 text-xs font-bold">MEDICAL</span>
                                </div>
                              )}
                              {selectedLogoTemplate === "minimal" && (
                                <div className="w-16 h-16 bg-gray-200 rounded flex items-center justify-center">
                                  <span className="text-gray-600 text-xs font-bold">PRACTICE</span>
                                </div>
                              )}
                              {selectedLogoTemplate === "medical-cross" && (
                                <div className="w-16 h-16 bg-red-100 rounded flex items-center justify-center">
                                  <span className="text-red-600 text-lg">✚</span>
                                </div>
                              )}
                              {selectedLogoTemplate === "health-plus" && (
                                <div className="w-16 h-16 bg-blue-100 rounded flex items-center justify-center">
                                  <span className="text-blue-600 text-xl">⚕️</span>
                                </div>
                              )}
                              {selectedLogoTemplate === "custom" && customLogoData && (
                                <div className="w-16 h-16 rounded flex items-center justify-center">
                                  <img src={customLogoData} alt="Custom Logo" className="max-w-16 max-h-16 object-contain" />
                                </div>
                              )}
                              {selectedLogoTemplate === "custom" && !customLogoData && (
                                <div className="w-16 h-16 bg-yellow-100 rounded flex items-center justify-center">
                                  <span className="text-yellow-600 text-xl">📁</span>
                                </div>
                              )}
                              {!selectedLogoTemplate && (
                                <div className="w-16 h-16 bg-blue-600 rounded flex items-center justify-center">
                                  <span className="text-white font-bold text-xs">LOGO</span>
                                </div>
                              )}
                            </div>
                            <div>
                              {selectedClinicHeaderType === "full-header" && (
                                <div className={`${clinicHeaderPosition === 'left' ? 'text-left' : clinicHeaderPosition === 'right' ? 'text-right' : 'text-center'}`}>
                                  <h1 className="text-xl font-bold text-blue-600 mb-1">Demo Healthcare Clinic</h1>
                                  <p className="text-xs text-gray-600">123 Healthcare Street, Medical City, MC 12345</p>
                                  <p className="text-xs text-gray-600">+44 20 1234 5678 • info@yourdlinic.com</p>
                                  <p className="text-xs text-gray-600">www.yourdlinic.com</p>
                                </div>
                              )}
                              {selectedClinicHeaderType === "professional-letterhead" && (
                                <div className={`${clinicHeaderPosition === 'left' ? 'text-left' : clinicHeaderPosition === 'right' ? 'text-right' : 'text-center'} border-b-2 border-blue-600 pb-2`}>
                                  <h1 className="text-xl font-bold text-blue-600 mb-1">Demo Healthcare Clinic</h1>
                                  <p className="text-xs text-gray-600 italic">Excellence in Healthcare</p>
                                </div>
                              )}
                              {selectedClinicHeaderType === "clinic-name-only" && (
                                <div className={`${clinicHeaderPosition === 'left' ? 'text-left' : clinicHeaderPosition === 'right' ? 'text-right' : 'text-center'}`}>
                                  <h1 className="text-xl font-bold text-blue-600">Demo Healthcare Clinic</h1>
                                </div>
                              )}
                              {selectedClinicHeaderType === "contact-info-block" && (
                                <div className={`${clinicHeaderPosition === 'left' ? 'text-left' : clinicHeaderPosition === 'right' ? 'text-right' : 'text-center'} bg-gray-50 p-2 rounded`}>
                                  <p className="text-xs text-gray-600"><strong>Phone:</strong> +44 20 1234 5678</p>
                                  <p className="text-xs text-gray-600"><strong>Email:</strong> info@yourdlinic.com</p>
                                  <p className="text-xs text-gray-600"><strong>Address:</strong> 123 Healthcare Street, Medical City, MC 12345</p>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ) : logoPosition === "center" && addClinicHeader && !addLogo ? (
                        <div className="mb-4">
                          {selectedClinicHeaderType === "full-header" && (
                            <div className={`${clinicHeaderPosition === 'left' ? 'text-left' : clinicHeaderPosition === 'right' ? 'text-right' : 'text-center'}`}>
                              <h1 className="text-xl font-bold text-blue-600 mb-1">Demo Healthcare Clinic</h1>
                              <p className="text-xs text-gray-600">123 Healthcare Street, Medical City, MC 12345</p>
                              <p className="text-xs text-gray-600">+44 20 1234 5678 • info@yourdlinic.com</p>
                              <p className="text-xs text-gray-600">www.yourdlinic.com</p>
                            </div>
                          )}
                          {selectedClinicHeaderType === "professional-letterhead" && (
                            <div className={`${clinicHeaderPosition === 'left' ? 'text-left' : clinicHeaderPosition === 'right' ? 'text-right' : 'text-center'} border-b-2 border-blue-600 pb-2`}>
                              <h1 className="text-2xl font-bold text-blue-600">Demo Healthcare Clinic</h1>
                              <p className="text-xs text-gray-600 italic">Excellence in Healthcare</p>
                            </div>
                          )}
                          {selectedClinicHeaderType === "clinic-name-only" && (
                            <div className={`${clinicHeaderPosition === 'left' ? 'text-left' : clinicHeaderPosition === 'right' ? 'text-right' : 'text-center'}`}>
                              <h1 className="text-xl font-bold text-blue-600">Demo Healthcare Clinic</h1>
                            </div>
                          )}
                          {selectedClinicHeaderType === "contact-info-block" && (
                            <div className={`${clinicHeaderPosition === 'left' ? 'text-left' : clinicHeaderPosition === 'right' ? 'text-right' : 'text-center'} bg-gray-50 p-2 rounded`}>
                              <p className="text-xs text-gray-600"><strong>Phone:</strong> +44 20 1234 5678</p>
                              <p className="text-xs text-gray-600"><strong>Email:</strong> info@yourdlinic.com</p>
                              <p className="text-xs text-gray-600"><strong>Address:</strong> 123 Healthcare Street, Medical City, MC 12345</p>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="flex justify-between items-center mb-4">
                          {/* Left side */}
                          {logoPosition === "left" && addLogo ? (
                            <div className="text-left">
                              {selectedLogoTemplate === "modern-clinic" && (
                                <div className="w-16 h-16 bg-purple-200 rounded flex items-center justify-center">
                                  <span className="text-purple-600 text-xs font-bold">🏥</span>
                                </div>
                              )}
                              {selectedLogoTemplate === "professional" && (
                                <div className="w-16 h-16 border-2 border-teal-500 rounded flex items-center justify-center bg-white">
                                  <span className="text-teal-600 text-xs font-bold">MEDICAL</span>
                                </div>
                              )}
                              {selectedLogoTemplate === "minimal" && (
                                <div className="w-16 h-16 bg-gray-200 rounded flex items-center justify-center">
                                  <span className="text-gray-600 text-xs font-bold">PRACTICE</span>
                                </div>
                              )}
                              {selectedLogoTemplate === "medical-cross" && (
                                <div className="w-16 h-16 bg-red-100 rounded flex items-center justify-center">
                                  <span className="text-red-600 text-lg">✚</span>
                                </div>
                              )}
                              {selectedLogoTemplate === "health-plus" && (
                                <div className="w-16 h-16 bg-blue-100 rounded flex items-center justify-center">
                                  <span className="text-blue-600 text-xl">⚕️</span>
                                </div>
                              )}
                              {selectedLogoTemplate === "custom" && customLogoData && (
                                <div className="w-16 h-16 rounded flex items-center justify-center">
                                  <img src={customLogoData} alt="Custom Logo" className="max-w-16 max-h-16 object-contain" />
                                </div>
                              )}
                              {selectedLogoTemplate === "custom" && !customLogoData && (
                                <div className="w-16 h-16 bg-yellow-100 rounded flex items-center justify-center">
                                  <span className="text-yellow-600 text-xl">📁</span>
                                </div>
                              )}
                              {!selectedLogoTemplate && (
                                <div className="w-16 h-16 bg-blue-600 rounded flex items-center justify-center">
                                  <span className="text-white font-bold text-xs">LOGO</span>
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="flex-1"></div>
                          )}

                          {/* Center */}
                          {addClinicHeader ? (
                            <div className={`flex-2 ${clinicHeaderPosition === 'left' ? 'text-left' : clinicHeaderPosition === 'right' ? 'text-right' : 'text-center'}`}>
                              {selectedClinicHeaderType === "full-header" && (
                                <div>
                                  <h1 className="text-xl font-bold text-blue-600 mb-1">Demo Healthcare Clinic</h1>
                                  <p className="text-xs text-gray-600">123 Healthcare Street, Medical City, MC 12345</p>
                                  <p className="text-xs text-gray-600">+44 20 1234 5678 • info@yourdlinic.com</p>
                                  <p className="text-xs text-gray-600">www.yourdlinic.com</p>
                                </div>
                              )}
                              {selectedClinicHeaderType === "professional-letterhead" && (
                                <div className="border-b-2 border-blue-600 pb-2">
                                  <h1 className="text-2xl font-bold text-blue-600">Demo Healthcare Clinic</h1>
                                  <p className="text-xs text-gray-600 italic">Excellence in Healthcare</p>
                                </div>
                              )}
                              {selectedClinicHeaderType === "clinic-name-only" && (
                                <div>
                                  <h1 className="text-xl font-bold text-blue-600">Demo Healthcare Clinic</h1>
                                </div>
                              )}
                              {selectedClinicHeaderType === "contact-info-block" && (
                                <div className="bg-gray-50 p-2 rounded">
                                  <p className="text-xs text-gray-600"><strong>Phone:</strong> +44 20 1234 5678</p>
                                  <p className="text-xs text-gray-600"><strong>Email:</strong> info@yourdlinic.com</p>
                                  <p className="text-xs text-gray-600"><strong>Address:</strong> 123 Healthcare Street, Medical City, MC 12345</p>
                                </div>
                              )}
                            </div>
                          ) : logoPosition === "center" && addLogo ? (
                            <div className="flex-2 text-center">
                              {selectedLogoTemplate === "modern-clinic" && (
                                <div className="w-16 h-16 bg-purple-200 rounded flex items-center justify-center mx-auto">
                                  <span className="text-purple-600 text-xs font-bold">🏥</span>
                                </div>
                              )}
                              {selectedLogoTemplate === "professional" && (
                                <div className="w-16 h-16 border-2 border-teal-500 rounded flex items-center justify-center bg-white mx-auto">
                                  <span className="text-teal-600 text-xs font-bold">MEDICAL</span>
                                </div>
                              )}
                              {selectedLogoTemplate === "minimal" && (
                                <div className="w-16 h-16 bg-gray-200 rounded flex items-center justify-center mx-auto">
                                  <span className="text-gray-600 text-xs font-bold">PRACTICE</span>
                                </div>
                              )}
                              {selectedLogoTemplate === "medical-cross" && (
                                <div className="w-16 h-16 bg-red-100 rounded flex items-center justify-center mx-auto">
                                  <span className="text-red-600 text-lg">✚</span>
                                </div>
                              )}
                              {selectedLogoTemplate === "health-plus" && (
                                <div className="w-16 h-16 bg-blue-100 rounded flex items-center justify-center mx-auto">
                                  <span className="text-blue-600 text-xl">⚕️</span>
                                </div>
                              )}
                              {selectedLogoTemplate === "custom" && customLogoData && (
                                <div className="w-16 h-16 rounded flex items-center justify-center mx-auto">
                                  <img src={customLogoData} alt="Custom Logo" className="max-w-16 max-h-16 object-contain" />
                                </div>
                              )}
                              {selectedLogoTemplate === "custom" && !customLogoData && (
                                <div className="w-16 h-16 bg-yellow-100 rounded flex items-center justify-center mx-auto">
                                  <span className="text-yellow-600 text-xl">📁</span>
                                </div>
                              )}
                              {!selectedLogoTemplate && (
                                <div className="w-16 h-16 bg-blue-600 rounded flex items-center justify-center mx-auto">
                                  <span className="text-white font-bold text-xs">LOGO</span>
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="flex-2"></div>
                          )}

                          {/* Right side */}
                          {logoPosition === "right" && addLogo ? (
                            <div className="text-right">
                              {selectedLogoTemplate === "modern-clinic" && (
                                <div className="w-16 h-16 bg-purple-200 rounded flex items-center justify-center">
                                  <span className="text-purple-600 text-xs font-bold">🏥</span>
                                </div>
                              )}
                              {selectedLogoTemplate === "professional" && (
                                <div className="w-16 h-16 border-2 border-teal-500 rounded flex items-center justify-center bg-white">
                                  <span className="text-teal-600 text-xs font-bold">MEDICAL</span>
                                </div>
                              )}
                              {selectedLogoTemplate === "minimal" && (
                                <div className="w-16 h-16 bg-gray-200 rounded flex items-center justify-center">
                                  <span className="text-gray-600 text-xs font-bold">PRACTICE</span>
                                </div>
                              )}
                              {selectedLogoTemplate === "medical-cross" && (
                                <div className="w-16 h-16 bg-red-100 rounded flex items-center justify-center">
                                  <span className="text-red-600 text-lg">✚</span>
                                </div>
                              )}
                              {selectedLogoTemplate === "health-plus" && (
                                <div className="w-16 h-16 bg-blue-100 rounded flex items-center justify-center">
                                  <span className="text-blue-600 text-xl">⚕️</span>
                                </div>
                              )}
                              {selectedLogoTemplate === "custom" && customLogoData && (
                                <div className="w-16 h-16 rounded flex items-center justify-center">
                                  <img src={customLogoData} alt="Custom Logo" className="max-w-16 max-h-16 object-contain" />
                                </div>
                              )}
                              {selectedLogoTemplate === "custom" && !customLogoData && (
                                <div className="w-16 h-16 bg-yellow-100 rounded flex items-center justify-center">
                                  <span className="text-yellow-600 text-xl">📁</span>
                                </div>
                              )}
                              {!selectedLogoTemplate && (
                                <div className="w-16 h-16 bg-blue-600 rounded flex items-center justify-center">
                                  <span className="text-white font-bold text-xs">LOGO</span>
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="flex-1"></div>
                          )}
                        </div>
                      )}
                      <hr className="mb-4 border-gray-300" />
                    </>
                  )}

                  {/* Template Content Preview */}
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm font-medium text-gray-700">Subject:</label>
                      <p className="text-gray-900 font-medium mt-1">{previewOtherTemplate.subject}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">Body:</label>
                      <div className="text-gray-900 mt-1 whitespace-pre-wrap bg-gray-50 p-3 rounded border">
                        {previewOtherTemplate.body}
                      </div>
                    </div>
                  </div>

                  {/* Footer Preview */}
                  {addFooter && (
                    <div className="mt-8 pt-4 border-t border-gray-300 text-center text-xs text-gray-600">
                      <p className="font-bold text-gray-800 mb-1">Demo Healthcare Clinic</p>
                      <p>123 Healthcare Street, Medical City, MC 12345</p>
                      <p>Phone: +44 20 1234 5678 | Email: info@yourdlinic.com</p>
                      <p>www.yourdlinic.com</p>
                    </div>
                  )}
                </div>
              </div>
            )}
            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => {
                  setShowOtherTemplatePreviewDialog(false);
                  setAddLogo(false);
                  setAddClinicHeader(false);
                  setSelectedClinicHeaderType("");
                  setLogoPosition("right");
                  setAddFooter(false);
                  setClinicHeaderPosition("center");
                  setSelectedLogoTemplate("");
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  // Load template with the same functionality as Patient Letter Templates
                  if (previewOtherTemplate) {
                    let finalHtml = '';

                    // Add header section with logo and clinic header if selected
                    if (addLogo || addClinicHeader) {
                      const getLogoContent = () => {
                        switch (selectedLogoTemplate) {
                          case "modern-clinic":
                            return `
                              <div style="width: 80px; height: 80px; background-color: #ddd6fe; border-radius: 8px; display: flex; align-items: center; justify-content: center;">
                                <span style="color: #7c3aed; font-weight: bold; font-size: 12px;">🏥</span>
                              </div>
                            `;
                          case "professional":
                            return `
                              <div style="width: 80px; height: 80px; border: 2px solid #14b8a6; border-radius: 8px; display: flex; align-items: center; justify-content: center; background-color: white;">
                                <span style="color: #14b8a6; font-weight: bold; font-size: 10px;">MEDICAL</span>
                              </div>
                            `;
                          case "minimal":
                            return `
                              <div style="width: 80px; height: 80px; background-color: #e5e7eb; border-radius: 8px; display: flex; align-items: center; justify-content: center;">
                                <span style="color: #6b7280; font-weight: bold; font-size: 8px;">PRACTICE</span>
                              </div>
                            `;
                          case "medical-cross":
                            return `
                              <div style="width: 80px; height: 80px; background-color: #fecaca; border-radius: 8px; display: flex; align-items: center; justify-content: center;">
                                <span style="color: #dc2626; font-size: 20px;">✚</span>
                              </div>
                            `;
                          case "health-plus":
                            return `
                              <div style="width: 80px; height: 80px; background-color: #dbeafe; border-radius: 8px; display: flex; align-items: center; justify-content: center;">
                                <span style="color: #2563eb; font-size: 24px;">⚕️</span>
                              </div>
                            `;
                          case "custom":
                            if (customLogoData) {
                              return `
                                <div style="width: 80px; height: 80px; border-radius: 8px; display: flex; align-items: center; justify-content: center;">
                                  <img src="${customLogoData}" alt="Custom Logo" style="max-width: 80px; max-height: 80px; object-fit: contain;" />
                                </div>
                              `;
                            }
                            return `
                              <div style="width: 80px; height: 80px; background-color: #fef3c7; border-radius: 8px; display: flex; align-items: center; justify-content: center;">
                                <span style="color: #d97706; font-size: 24px;">📁</span>
                              </div>
                            `;
                          default:
                            return `
                              <div style="width: 80px; height: 80px; background-color: #2563eb; border-radius: 8px; display: flex; align-items: center; justify-content: center;">
                                <span style="color: white; font-weight: bold; font-size: 14px;">LOGO</span>
                              </div>
                            `;
                        }
                      };

                      const getClinicHeaderContent = () => {
                        const textAlign = clinicHeaderPosition;
                        switch (selectedClinicHeaderType) {
                          case "full-header":
                            return `
                              <div style="text-align: ${textAlign};">
                                <h1 style="font-size: 24px; font-weight: bold; margin: 0; color: #2563eb;">Demo Healthcare Clinic</h1>
                                <p style="margin: 5px 0; color: #666;">123 Healthcare Street, Medical City, MC 12345</p>
                                <p style="margin: 5px 0; color: #666;">+44 20 1234 5678 • info@yourdlinic.com</p>
                                <p style="margin: 5px 0; color: #666;">www.yourdlinic.com</p>
                              </div>
                            `;
                          case "professional-letterhead":
                            return `
                              <div style="text-align: ${textAlign}; border-bottom: 2px solid #2563eb; padding-bottom: 10px;">
                                <h1 style="font-size: 28px; font-weight: bold; margin: 0; color: #2563eb;">Demo Healthcare Clinic</h1>
                                <p style="margin: 5px 0; color: #666; font-style: italic;">Excellence in Healthcare</p>
                              </div>
                            `;
                          case "clinic-name-only":
                            return `
                              <div style="text-align: ${textAlign};">
                                <h1 style="font-size: 24px; font-weight: bold; margin: 0; color: #2563eb;">Demo Healthcare Clinic</h1>
                              </div>
                            `;
                          case "contact-info-block":
                            return `
                              <div style="text-align: ${textAlign}; background-color: #f8fafc; padding: 10px; border-radius: 8px;">
                                <p style="margin: 2px 0; color: #666;"><strong>Phone:</strong> +44 20 1234 5678</p>
                                <p style="margin: 2px 0; color: #666;"><strong>Email:</strong> info@yourdlinic.com</p>
                                <p style="margin: 2px 0; color: #666;"><strong>Address:</strong> 123 Healthcare Street, Medical City, MC 12345</p>
                              </div>
                            `;
                          default:
                            return "";
                        }
                      };

                      const logoContent = getLogoContent();

                      if (logoPosition === "center" && addLogo && !addClinicHeader) {
                        finalHtml += `<div style="text-align: center; margin-bottom: 20px;">${logoContent}</div>`;
                      } else if (logoPosition === "center" && addClinicHeader && !addLogo) {
                        finalHtml += `<div style="margin-bottom: 20px;">${getClinicHeaderContent()}</div>`;
                      } else if (logoPosition === "center" && addLogo && addClinicHeader) {
                        // Logo and clinic header in a row when center is selected
                        finalHtml += `
                          <div style="display: flex; justify-content: center; align-items: center; margin-bottom: 20px; gap: 20px;">
                            <div>${logoContent}</div>
                            <div>${getClinicHeaderContent()}</div>
                          </div>
                        `;
                      } else {
                        finalHtml += '<div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">';

                        // Left side
                        if (logoPosition === "left" && addLogo) {
                          finalHtml += `<div style="text-align: left;">${logoContent}</div>`;
                        } else {
                          finalHtml += '<div style="flex: 1;"></div>';
                        }

                        // Center
                        if (addClinicHeader) {
                          finalHtml += `<div style="flex: 2;">${getClinicHeaderContent()}</div>`;
                        } else if (logoPosition === "center" && addLogo) {
                          finalHtml += `<div style="flex: 2; text-align: center;">${logoContent}</div>`;
                        } else {
                          finalHtml += '<div style="flex: 2;"></div>';
                        }

                        // Right side
                        if (logoPosition === "right" && addLogo) {
                          finalHtml += `<div style="text-align: right;">${logoContent}</div>`;
                        } else {
                          finalHtml += '<div style="flex: 1;"></div>';
                        }

                        finalHtml += '</div>';
                      }

                      finalHtml += '<hr style="margin: 20px 0; border: 1px solid #e5e7eb;">';
                    }

                    // Add the main template content
                    const templateHtml = `<p style="margin: 0 0 12px; line-height: 1.6;"><strong>Subject:</strong> ${previewOtherTemplate.subject}</p><div style="margin: 12px 0; line-height: 1.6; white-space: pre-wrap;">${previewOtherTemplate.body.replace(/\n/g, '<br>')}</div>`;
                    finalHtml += templateHtml;

                    // Add footer if selected
                    if (addFooter) {
                      finalHtml += `
                        <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center; font-size: 12px; color: #666;">
                          <p style="margin: 2px 0;"><strong>Demo Healthcare Clinic</strong></p>
                          <p style="margin: 2px 0;">123 Healthcare Street, Medical City, MC 12345</p>
                          <p style="margin: 2px 0;">Phone: +44 20 1234 5678 | Email: info@yourdlinic.com</p>
                          <p style="margin: 2px 0;">www.yourdlinic.com</p>
                        </div>
                      `;
                    }

                    // Load template into editor with proper HTML formatting
                    if (textareaRef) {
                      textareaRef.innerHTML = finalHtml;
                      setDocumentContent(finalHtml);
                    }

                    setShowOtherTemplatePreviewDialog(false);
                    setShowPatientDialog(false);
                    setShowAllTemplatesDialog(false);
                    setAddLogo(false);
                    setAddClinicHeader(false);
                    setSelectedClinicHeaderType("");
                    setLogoPosition("right");
                    setAddFooter(false);
                    setClinicHeaderPosition("center");
                    setSelectedLogoTemplate("");

                    setSuccessMessage(`${previewOtherTemplateName} template has been loaded into the editor.`);
                    setShowSuccessModal(true);
                  }
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                Load
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Logo Templates Dialog */}
      <Dialog open={showLogoTemplatesDialog} onOpenChange={setShowLogoTemplatesDialog}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Insert Logo</DialogTitle>
            <h2 className="text-2xl font-bold text-gray-800 mt-2">Clinic Logo Templates</h2>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 mt-4">
            <div
              className={`border rounded-lg p-4 hover:bg-gray-50 cursor-pointer ${selectedLogoTemplate === "modern-clinic" ? "bg-blue-50 border-blue-500" : ""}`}
              onClick={() => setSelectedLogoTemplate("modern-clinic")}
            >
              <div className="flex flex-col items-center">
                <div className="w-16 h-16 bg-purple-200 rounded-lg flex items-center justify-center mb-2">
                  <span className="text-purple-600 text-xs font-bold">🏥</span>
                </div>
                <h3 className="font-semibold text-gray-800">Modern Clinic</h3>
                <p className="text-sm text-gray-600 text-center">Icon with clinic name</p>
              </div>
            </div>

            <div
              className={`border rounded-lg p-4 hover:bg-gray-50 cursor-pointer ${selectedLogoTemplate === "professional" ? "bg-blue-50 border-blue-500" : ""}`}
              onClick={() => setSelectedLogoTemplate("professional")}
            >
              <div className="flex flex-col items-center">
                <div className="w-16 h-16 border-2 border-teal-500 rounded-lg flex items-center justify-center mb-2">
                  <span className="text-teal-600 text-sm font-bold">MEDICAL</span>
                </div>
                <h3 className="font-semibold text-gray-800">Professional</h3>
                <p className="text-sm text-gray-600 text-center">Boxed design</p>
              </div>
            </div>

            <div
              className={`border rounded-lg p-4 hover:bg-gray-50 cursor-pointer ${selectedLogoTemplate === "minimal" ? "bg-blue-50 border-blue-500" : ""}`}
              onClick={() => setSelectedLogoTemplate("minimal")}
            >
              <div className="flex flex-col items-center">
                <div className="w-16 h-16 bg-gray-200 rounded-lg flex items-center justify-center mb-2">
                  <span className="text-gray-600 text-xs font-bold">PRACTICE</span>
                </div>
                <h3 className="font-semibold text-gray-800">Minimal</h3>
                <p className="text-sm text-gray-600 text-center">Clean typography</p>
              </div>
            </div>

            <div
              className={`border rounded-lg p-4 hover:bg-gray-50 cursor-pointer ${selectedLogoTemplate === "medical-cross" ? "bg-blue-50 border-blue-500" : ""}`}
              onClick={() => setSelectedLogoTemplate("medical-cross")}
            >
              <div className="flex flex-col items-center">
                <div className="w-16 h-16 bg-red-100 rounded-lg flex items-center justify-center mb-2">
                  <span className="text-red-600 text-xl">✚</span>
                </div>
                <h3 className="font-semibold text-gray-800">Medical Cross</h3>
                <p className="text-sm text-gray-600 text-center">Classic red cross</p>
              </div>
            </div>

            <div
              className={`border rounded-lg p-4 hover:bg-gray-50 cursor-pointer ${selectedLogoTemplate === "health-plus" ? "bg-blue-50 border-blue-500" : ""}`}
              onClick={() => setSelectedLogoTemplate("health-plus")}
            >
              <div className="flex flex-col items-center">
                <div className="w-16 h-16 bg-blue-100 rounded-lg flex items-center justify-center mb-2">
                  <span className="text-blue-600 text-2xl">⚕️</span>
                </div>
                <h3 className="font-semibold text-gray-800">Health Plus</h3>
                <p className="text-sm text-gray-600 text-center">Medical symbol</p>
              </div>
            </div>

            <div
              className={`border rounded-lg p-4 hover:bg-gray-50 cursor-pointer ${selectedLogoTemplate === "custom" ? "bg-blue-50 border-blue-500" : ""}`}
              onClick={() => {
                const fileInput = document.getElementById('custom-logo-upload') as HTMLInputElement;
                if (fileInput) fileInput.click();
              }}
            >
              <div className="flex flex-col items-center">
                <div className="w-16 h-16 bg-yellow-100 rounded-lg flex items-center justify-center mb-2">
                  <span className="text-yellow-600 text-3xl">📁</span>
                </div>
                <h3 className="font-semibold text-gray-800">Upload Custom</h3>
                <p className="text-sm text-gray-600 text-center">Browse files</p>
              </div>
            </div>
          </div>

          {/* Hidden file input for custom logo upload */}
          <input
            id="custom-logo-upload"
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                const reader = new FileReader();
                reader.onloadend = () => {
                  setSelectedLogoTemplate("custom");
                  setCustomLogoData(reader.result as string);
                };
                reader.readAsDataURL(file);
              }
            }}
          />

          <div className="flex justify-end gap-2 pt-4 border-t mt-6">
            <Button variant="outline" onClick={() => setShowLogoTemplatesDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                setAddLogo(true);
                setLogoPosition(tempLogoPosition);
                setShowLogoTemplatesDialog(false);
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white"
              disabled={!selectedLogoTemplate}
            >
              OK
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Clinic Header Templates Dialog */}
      <Dialog open={showClinicHeaderDialog} onOpenChange={setShowClinicHeaderDialog}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Clinic Information Templates</DialogTitle>

          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div
              className="border rounded-lg p-4 hover:bg-gray-50 cursor-pointer"
              onClick={() => {
                setTempClinicHeaderType("full-header");
                setShowClinicPositionDialog(true);
                setShowClinicHeaderDialog(false);
              }}
            >
              <h6 className="font-semibold text-gray-800">Full Header</h6>
              <p className="text-sm text-gray-600">Complete clinic header with name, address, phone, email, and website</p>
            </div>

            <div
              className="border rounded-lg p-4 hover:bg-gray-50 cursor-pointer"
              onClick={() => {
                setTempClinicHeaderType("letterhead");
                setShowClinicPositionDialog(true);
                setShowClinicHeaderDialog(false);
              }}
            >
              <h6 className="font-semibold text-gray-800">Professional Letterhead</h6>
              <p className="text-sm text-gray-600">Formal letterhead design with clinic branding</p>
            </div>

            <div
              className="border rounded-lg p-4 hover:bg-gray-50 cursor-pointer"
              onClick={() => {
                setTempClinicHeaderType("name-only");
                setShowClinicPositionDialog(true);
                setShowClinicHeaderDialog(false);
              }}
            >
              <h6 className="font-semibold text-gray-800">Clinic Name Only</h6>
              <p className="text-sm text-gray-600">Just the clinic name in bold text</p>
            </div>

            <div
              className="border rounded-lg p-4 hover:bg-gray-50 cursor-pointer"
              onClick={() => {
                setTempClinicHeaderType("contact-info");
                setShowClinicPositionDialog(true);
                setShowClinicHeaderDialog(false);
              }}
            >
              <h6 className="font-semibold text-gray-800">Contact Information Block</h6>
              <p className="text-sm text-gray-600">Formatted contact details section</p>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-4 border-t mt-6">
            <Button variant="outline" onClick={() => setShowClinicHeaderDialog(false)}>
              Cancel
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Clinic Header Position Selection Dialog */}
      <Dialog open={showClinicPositionDialog} onOpenChange={setShowClinicPositionDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Header Preview</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Header Preview */}
            <div className="border rounded-lg p-4 bg-white">
              <h4 className="font-medium mb-3">Preview:</h4>
              <div className={`text-${clinicHeaderPosition} border rounded p-3 bg-blue-50`}>
                {tempClinicHeaderType === "full-header" && (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-8 h-8 bg-purple-200 rounded flex items-center justify-center">
                        <span className="text-purple-800 text-xs font-bold">📋</span>
                      </div>
                      <h3 className="text-lg font-bold text-blue-700">Demo Healthcare Clinic</h3>
                    </div>
                    <div className="text-sm text-gray-700">
                      <div>123 Healthcare Street, Medical City, MC 12345</div>
                      <div>+44 20 1234 5678 • info@yourclinic.com</div>
                      <div>www.yourclinic.com</div>
                    </div>
                  </div>
                )}
                {tempClinicHeaderType === "letterhead" && (
                  <div>
                    <h3 className="text-xl font-bold text-blue-700 mb-1">Demo Healthcare Clinic</h3>
                    <div className="text-sm text-gray-600 border-b pb-2">
                      Professional Medical Services
                    </div>
                  </div>
                )}
                {tempClinicHeaderType === "name-only" && (
                  <div>
                    <h3 className="text-lg font-bold text-blue-700">Demo Healthcare Clinic</h3>
                  </div>
                )}
                {tempClinicHeaderType === "contact-info" && (
                  <div className="text-sm text-gray-700">
                    <div>📍 123 Healthcare Street, Medical City, MC 12345</div>
                    <div>📞 +44 20 1234 5678</div>
                    <div>✉️ info@yourclinic.com</div>
                    <div>🌐 www.yourclinic.com</div>
                  </div>
                )}
              </div>
            </div>

            {/* Position Selection */}
            <div>
              <h4 className="font-medium mb-3">Header Position:</h4>
              <div className="flex gap-3">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="radio"
                    name="tempClinicPosition"
                    value="left"
                    checked={clinicHeaderPosition === "left"}
                    onChange={(e) => setClinicHeaderPosition(e.target.value)}
                    className="text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">Left (Top)</span>
                </label>
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="radio"
                    name="tempClinicPosition"
                    value="center"
                    checked={clinicHeaderPosition === "center"}
                    onChange={(e) => setClinicHeaderPosition(e.target.value)}
                    className="text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">Center (Top)</span>
                </label>
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="radio"
                    name="tempClinicPosition"
                    value="right"
                    checked={clinicHeaderPosition === "right"}
                    onChange={(e) => setClinicHeaderPosition(e.target.value)}
                    className="text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">Right (Top)</span>
                </label>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => {
                  setShowClinicPositionDialog(false);
                  setShowClinicDialog(true);
                }}
              >
                Back
              </Button>
              <Button
                onClick={handleInsertClinicHeader}
              >
                OK
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Clinical Header Dialog */}
      <Dialog open={showClinicalHeaderDialog} onOpenChange={setShowClinicalHeaderDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Clinical Header</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Add New Clinic Info Button at Top */}
            <div className="flex justify-end">
              <Button
                variant="outline"
                className="border transition-all duration-200"
                style={{
                  backgroundColor: "white",
                  borderColor: "#e5e7eb",
                  color: "black",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = "#6CFFEB";
                  e.currentTarget.style.borderColor = "#6CFFEB";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "white";
                  e.currentTarget.style.borderColor = "#e5e7eb";
                }}
                onClick={() => {
                  // Initialize form with default values for new clinic info
                  setEditingClinicInfo({
                    name: "",
                    address: "",
                    phone: "",
                    email: "",
                    website: "",
                  });
                  setSelectedClinicalHeader("");
                  setShowAddClinicInfoDialog(true);
                  setShowClinicalHeaderDialog(false);
                }}
              >
                <Plus className="h-4 w-4 mr-1" />
                Add New Clinic Info
              </Button>
            </div>

            {/* Clinical Header Options */}
            <div className="grid grid-cols-1 gap-3 max-h-96 overflow-y-auto">
              <div
                className="border rounded-lg p-4 hover:bg-gray-50 cursor-pointer"
                onClick={() => {
                  setSelectedClinicalHeader("main-hospital");
                  setEditingClinicInfo({
                    name: "Main Hospital",
                    address: clinicInfo.address || "123 Healthcare Street, Medical City, MC 12345",
                    phone: clinicInfo.phone || "+44 20 1234 5678",
                    email: clinicInfo.email || "info@yourclinic.com",
                    website: clinicInfo.website || "www.yourclinic.com",
                  });
                  setShowClinicDisplayDialog(true);
                  setShowClinicalHeaderDialog(false);
                }}
              >
                <h6 className="font-semibold text-gray-800">Main Hospital</h6>
                <p className="text-sm text-gray-600">Main hospital information and contact details</p>
              </div>

              <div
                className="border rounded-lg p-4 hover:bg-gray-50 cursor-pointer"
                onClick={() => {
                  setSelectedClinicalHeader("cardiology-dept");
                  setEditingClinicInfo({
                    name: "Cardiology Department",
                    address: clinicInfo.address || "123 Healthcare Street, Medical City, MC 12345",
                    phone: clinicInfo.phone || "+44 20 1234 5678",
                    email: clinicInfo.email || "info@yourclinic.com",
                    website: clinicInfo.website || "www.yourclinic.com",
                  });
                  setShowClinicDisplayDialog(true);
                  setShowClinicalHeaderDialog(false);
                }}
              >
                <h6 className="font-semibold text-gray-800">Cardiology Department</h6>
                <p className="text-sm text-gray-600">Cardiology department information and contact details</p>
              </div>

              <div
                className="border rounded-lg p-4 hover:bg-gray-50 cursor-pointer"
                onClick={() => {
                  setSelectedClinicalHeader("neurology-dept");
                  setEditingClinicInfo({
                    name: "Neurology Department",
                    address: clinicInfo.address || "123 Healthcare Street, Medical City, MC 12345",
                    phone: clinicInfo.phone || "+44 20 1234 5678",
                    email: clinicInfo.email || "info@yourclinic.com",
                    website: clinicInfo.website || "www.yourclinic.com",
                  });
                  setShowClinicDisplayDialog(true);
                  setShowClinicalHeaderDialog(false);
                }}
              >
                <h6 className="font-semibold text-gray-800">Neurology Department</h6>
                <p className="text-sm text-gray-600">Neurology department information and contact details</p>
              </div>

              <div
                className="border rounded-lg p-4 hover:bg-gray-50 cursor-pointer"
                onClick={() => {
                  setSelectedClinicalHeader("orthopedic-dept");
                  setEditingClinicInfo({
                    name: "Orthopedic Department",
                    address: clinicInfo.address || "123 Healthcare Street, Medical City, MC 12345",
                    phone: clinicInfo.phone || "+44 20 1234 5678",
                    email: clinicInfo.email || "info@yourclinic.com",
                    website: clinicInfo.website || "www.yourclinic.com",
                  });
                  setShowClinicDisplayDialog(true);
                  setShowClinicalHeaderDialog(false);
                }}
              >
                <h6 className="font-semibold text-gray-800">Orthopedic Department</h6>
                <p className="text-sm text-gray-600">Orthopedic department information and contact details</p>
              </div>

              <div
                className="border rounded-lg p-4 hover:bg-gray-50 cursor-pointer"
                onClick={() => {
                  setSelectedClinicalHeader("pediatrics-dept");
                  setEditingClinicInfo({
                    name: "Pediatrics Department",
                    address: clinicInfo.address || "123 Healthcare Street, Medical City, MC 12345",
                    phone: clinicInfo.phone || "+44 20 1234 5678",
                    email: clinicInfo.email || "info@yourclinic.com",
                    website: clinicInfo.website || "www.yourclinic.com",
                  });
                  setShowClinicDisplayDialog(true);
                  setShowClinicalHeaderDialog(false);
                }}
              >
                <h6 className="font-semibold text-gray-800">Pediatrics Department</h6>
                <p className="text-sm text-gray-600">Pediatrics department information and contact details</p>
              </div>

              <div
                className="border rounded-lg p-4 hover:bg-gray-50 cursor-pointer"
                onClick={() => {
                  setSelectedClinicalHeader("emergency-dept");
                  setEditingClinicInfo({
                    name: "Emergency Department",
                    address: clinicInfo.address || "123 Healthcare Street, Medical City, MC 12345",
                    phone: clinicInfo.phone || "+44 20 1234 5678",
                    email: clinicInfo.email || "info@yourclinic.com",
                    website: clinicInfo.website || "www.yourclinic.com",
                  });
                  setShowClinicDisplayDialog(true);
                  setShowClinicalHeaderDialog(false);
                }}
              >
                <h6 className="font-semibold text-gray-800">Emergency Department</h6>
                <p className="text-sm text-gray-600">Emergency department information and contact details</p>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button variant="outline" onClick={() => setShowClinicalHeaderDialog(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add New Clinic Info Dialog */}
      <Dialog open={showAddClinicInfoDialog} onOpenChange={setShowAddClinicInfoDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Clinic Information</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="clinical-clinic-name" className="text-sm font-medium">
                Clinic Name
              </Label>
              <Input
                id="clinical-clinic-name"
                value={editingClinicInfo.name}
                onChange={(e) =>
                  setEditingClinicInfo((prev) => ({
                    ...prev,
                    name: e.target.value,
                  }))
                }
                placeholder="Enter clinic name"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="clinical-clinic-address" className="text-sm font-medium">
                Address
              </Label>
              <Input
                id="clinical-clinic-address"
                value={editingClinicInfo.address}
                onChange={(e) =>
                  setEditingClinicInfo((prev) => ({
                    ...prev,
                    address: e.target.value,
                  }))
                }
                placeholder="Enter clinic address"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="clinical-clinic-phone" className="text-sm font-medium">
                Phone
              </Label>
              <Input
                id="clinical-clinic-phone"
                value={editingClinicInfo.phone}
                onChange={(e) =>
                  setEditingClinicInfo((prev) => ({
                    ...prev,
                    phone: e.target.value,
                  }))
                }
                placeholder="Enter phone number"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="clinical-clinic-email" className="text-sm font-medium">
                Email
              </Label>
              <Input
                id="clinical-clinic-email"
                value={editingClinicInfo.email}
                onChange={(e) =>
                  setEditingClinicInfo((prev) => ({
                    ...prev,
                    email: e.target.value,
                  }))
                }
                placeholder="Enter email address"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="clinical-clinic-website" className="text-sm font-medium">
                Website
              </Label>
              <Input
                id="clinical-clinic-website"
                value={editingClinicInfo.website}
                onChange={(e) =>
                  setEditingClinicInfo((prev) => ({
                    ...prev,
                    website: e.target.value,
                  }))
                }
                placeholder="Enter website URL"
                className="mt-1"
              />
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => {
                  setShowAddClinicInfoDialog(false);
                  setShowClinicalHeaderDialog(true);
                }}
              >
                Cancel
              </Button>
              <Button
                variant="outline"
                className="border transition-all duration-200"
                style={{
                  backgroundColor: "white",
                  borderColor: "#e5e7eb",
                  color: "black",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = "#6CFFEB";
                  e.currentTarget.style.borderColor = "#6CFFEB";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "white";
                  e.currentTarget.style.borderColor = "#e5e7eb";
                }}
                onClick={handleLoadClinicalHeader}
              >
                Load
              </Button>
              <Button
                className="border transition-all duration-200"
                style={{
                  backgroundColor: "#4A7DFF",
                  borderColor: "#4A7DFF",
                  color: "white",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = "#3A6BDF";
                  e.currentTarget.style.borderColor = "#3A6BDF";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "#4A7DFF";
                  e.currentTarget.style.borderColor = "#4A7DFF";
                }}
                onClick={handleSaveClinicalHeader}
              >
                Save Changes
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Clinic Display Dialog */}
      <Dialog open={showClinicDisplayDialog} onOpenChange={setShowClinicDisplayDialog}>
        <DialogContent className="max-w-md">
          <div className="space-y-4">
            {/* Display the clinic info like in the attached image */}
            <div className="p-6 bg-blue-50 dark:bg-[hsl(var(--cura-midnight))] border border-blue-200 dark:border-[hsl(var(--cura-steel))] rounded text-center relative">
              <div className="text-[hsl(var(--cura-bluewave))] dark:text-[hsl(var(--cura-bluewave))] text-lg font-semibold mb-2 flex items-center justify-center gap-2">
                🏥 {editingClinicInfo.name || "Demo Healthcare Clinic 2"}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                {editingClinicInfo.address || "123 Healthcare Street, Medical City, MC 12345"}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-300">
                {editingClinicInfo.phone || "+44 20 1234 5678"} • {editingClinicInfo.email || "guratulain@averox.com"}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-300">
                {editingClinicInfo.website || "www.yourclinic.com"}
              </div>

              {/* Edit Clinic Info Button */}
              <Button
                variant="ghost"
                size="sm"
                className="absolute top-2 right-2 border transition-all duration-200 hidden"
                style={{
                  backgroundColor: "white",
                  borderColor: "#e5e7eb",
                  color: "black",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = "#A3A8FC";
                  e.currentTarget.style.borderColor = "#A3A8FC";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "white";
                  e.currentTarget.style.borderColor = "#e5e7eb";
                }}
                onClick={() => {
                  setShowClinicDisplayDialog(false);
                  setShowAddClinicInfoDialog(true);
                }}
              >
                <Edit className="h-4 w-4 mr-1" />
                Edit Clinic Info
              </Button>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => {
                  setShowClinicDisplayDialog(false);
                  setShowClinicalHeaderDialog(true);
                }}
              >
                Back
              </Button>
              <Button
                variant="outline"
                className="border transition-all duration-200"
                style={{
                  backgroundColor: "white",
                  borderColor: "#e5e7eb",
                  color: "black",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = "#6CFFEB";
                  e.currentTarget.style.borderColor = "#6CFFEB";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "white";
                  e.currentTarget.style.borderColor = "#e5e7eb";
                }}
                onClick={handleLoadClinicalHeader}
              >
                Load
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* All Templates Dialog */}
      <Dialog
        open={showAllTemplatesDialog}
        onOpenChange={setShowAllTemplatesDialog}
      >
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>All Templates</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 max-h-96 overflow-y-auto">
              {/* Templates Grid */}
              <div className="grid grid-cols-2 gap-4">
                <Button
                  variant="outline"
                  className="h-auto p-4 text-left justify-start"
                  onClick={() => {
                    handlePatient();
                    setShowAllTemplatesDialog(false);
                  }}
                >
                  <div>
                    <div className="font-medium">Patient Information Templates</div>
                    <div className="text-sm text-gray-500">
                      Patient demographic and medical information
                    </div>
                  </div>
                </Button>

                <Button
                  variant="outline"
                  className="h-auto p-4 text-left justify-start"
                  onClick={() => {
                    handleRecipient();
                    setShowAllTemplatesDialog(false);
                  }}
                >
                  <div>
                    <div className="font-medium">Recipient Information Templates</div>
                    <div className="text-sm text-gray-500">
                      Recipient contact and address information
                    </div>
                  </div>
                </Button>

                <Button
                  variant="outline"
                  className="h-auto p-4 text-left justify-start"
                  onClick={() => {
                    handleAppointments();
                    setShowAllTemplatesDialog(false);
                  }}
                >
                  <div>
                    <div className="font-medium">Appointment Information Templates</div>
                    <div className="text-sm text-gray-500">
                      Appointment scheduling and details
                    </div>
                  </div>
                </Button>

                <Button
                  variant="outline"
                  className="h-auto p-4 text-left justify-start"
                  onClick={() => {
                    handleLabs();
                    setShowAllTemplatesDialog(false);
                  }}
                >
                  <div>
                    <div className="font-medium">Laboratory Information Templates</div>
                    <div className="text-sm text-gray-500">
                      Lab test results and diagnostic information
                    </div>
                  </div>
                </Button>

                <Button
                  variant="outline"
                  className="h-auto p-4 text-left justify-start"
                  onClick={() => {
                    handlePatientRecords();
                    setShowAllTemplatesDialog(false);
                  }}
                >
                  <div>
                    <div className="font-medium">Patient Records Templates</div>
                    <div className="text-sm text-gray-500">
                      Comprehensive medical record information
                    </div>
                  </div>
                </Button>

                <Button
                  variant="outline"
                  className="h-auto p-4 text-left justify-start"
                  onClick={() => {
                    handleInsertProduct();
                    setShowAllTemplatesDialog(false);
                  }}
                >
                  <div>
                    <div className="font-medium">Product Information Templates</div>
                    <div className="text-sm text-gray-500">
                      Medical products and equipment details
                    </div>
                  </div>
                </Button>
              </div>

              {/* Information Note */}
              <div>
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-blue-800 mb-2">
                    Template Categories
                  </h4>
                  <p className="text-sm text-blue-700">
                    Choose from various template categories to quickly insert formatted content
                    into your documents. Each template provides structured placeholders that can
                    be easily replaced with actual data.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <Button
                variant="ghost"
                className="border transition-all duration-200"
                style={{
                  backgroundColor: "white",
                  borderColor: "#e5e7eb",
                  color: "black",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = "#A3A8FC";
                  e.currentTarget.style.borderColor = "#A3A8FC";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "white";
                  e.currentTarget.style.borderColor = "#e5e7eb";
                }}
                onClick={() => setShowAllTemplatesDialog(false)}
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Drafts List Dialog */}
      <Dialog open={showDraftsDialog} onOpenChange={setShowDraftsDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Letter Drafts</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {drafts.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500">No drafts saved yet.</p>
                <p className="text-sm text-gray-400 mt-2">
                  Drafts are automatically saved when email sending fails.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {drafts.map((draft: any) => (
                  <div
                    key={draft.id}
                    className="border rounded-lg p-4 hover:bg-gray-50 cursor-pointer"
                    onClick={() => {
                      setSelectedDraft(draft);
                      setShowDraftDetailsDialog(true);
                    }}
                    data-testid={`draft-item-${draft.id}`}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h3 className="font-medium text-gray-900">{draft.subject}</h3>
                        <p className="text-sm text-gray-600 mt-1">To: {draft.recipient}</p>
                        {draft.doctorEmail && (
                          <p className="text-sm text-gray-600">Doctor: {draft.doctorEmail}</p>
                        )}
                        <p className="text-xs text-gray-500 mt-2">
                          Saved: {new Date(draft.createdAt).toLocaleString()}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            // Load draft into current form
                            setShareFormData({
                              subject: draft.subject,
                              recipient: draft.recipient,
                              location: draft.location || "",
                              copiedRecipients: draft.copiedRecipients || "",
                              doctor: draft.doctorEmail || "",
                              header: draft.header || "your-clinic"
                            });
                            setDocumentContent(draft.documentContent);
                            setShowDraftsDialog(false);
                            setShowShareDialog(true);
                            setSuccessMessage("Draft has been loaded into the letter form.");
                            setShowSuccessModal(true);
                          }}
                          data-testid={`button-load-draft-${draft.id}`}
                        >
                          Load
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={async (e) => {
                            e.stopPropagation();
                            try {
                              const response = await fetch(`/api/letter-drafts/${draft.id}`, {
                                method: "DELETE",
                                headers: {
                                  Authorization: `Bearer ${localStorage.getItem("auth_token")}`,
                                },
                              });

                              if (response.ok) {
                                refetchDrafts();
                                setSuccessMessage("Draft has been deleted successfully.");
                                setShowSuccessModal(true);
                              } else {
                                toast({
                                  title: "Error",
                                  description: "Failed to delete draft.",
                                  variant: "destructive",
                                });
                              }
                            } catch (error) {
                              console.error("Error deleting draft:", error);
                              toast({
                                title: "Error",
                                description: "Failed to delete draft.",
                                variant: "destructive",
                              });
                            }
                          }}
                          data-testid={`button-delete-draft-${draft.id}`}
                        >
                          Delete
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="flex justify-end">
            <Button
              variant="outline"
              onClick={() => setShowDraftsDialog(false)}
            >
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Draft Details Dialog */}
      <Dialog open={showDraftDetailsDialog} onOpenChange={setShowDraftDetailsDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Draft Details</DialogTitle>
          </DialogHeader>
          {selectedDraft && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Subject:</Label>
                  <p className="font-medium">{selectedDraft.subject}</p>
                </div>
                <div>
                  <Label>Recipient:</Label>
                  <p className="font-medium">{selectedDraft.recipient}</p>
                </div>
                {selectedDraft.doctorEmail && (
                  <div>
                    <Label>Doctor Email:</Label>
                    <p className="font-medium">{selectedDraft.doctorEmail}</p>
                  </div>
                )}
                {selectedDraft.location && (
                  <div>
                    <Label>Location:</Label>
                    <p className="font-medium">{selectedDraft.location}</p>
                  </div>
                )}
                {selectedDraft.copiedRecipients && (
                  <div>
                    <Label>CC Recipients:</Label>
                    <p className="font-medium">{selectedDraft.copiedRecipients}</p>
                  </div>
                )}
                <div>
                  <Label>Created:</Label>
                  <p className="font-medium">{new Date(selectedDraft.createdAt).toLocaleString()}</p>
                </div>
              </div>
              <div>
                <Label>Content:</Label>
                <div
                  className="border rounded-lg p-4 mt-2 max-h-96 overflow-y-auto bg-gray-50"
                  dangerouslySetInnerHTML={{ __html: selectedDraft.documentContent }}
                />
              </div>
              <div className="flex justify-end gap-3">
                <Button
                  variant="outline"
                  onClick={() => setShowDraftDetailsDialog(false)}
                >
                  Close
                </Button>
                <Button
                  onClick={() => {
                    // Load draft into current form
                    setShareFormData({
                      subject: selectedDraft.subject,
                      recipient: selectedDraft.recipient,
                      location: selectedDraft.location || "",
                      copiedRecipients: selectedDraft.copiedRecipients || "",
                      doctor: selectedDraft.doctorEmail || "",
                      header: selectedDraft.header || "your-clinic"
                    });
                    setDocumentContent(selectedDraft.documentContent);
                    setShowDraftDetailsDialog(false);
                    setShowDraftsDialog(false);
                    setShowShareDialog(true);
                    setSuccessMessage("Draft has been loaded into the letter form.");
                    setShowSuccessModal(true);
                  }}
                  data-testid="button-load-draft-details"
                >
                  Load Draft
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Success Modal */}
      <Dialog open={showSuccessModal} onOpenChange={setShowSuccessModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-green-600">Success</DialogTitle>
          </DialogHeader>

          <div className="py-4">
            <p className="text-gray-700">{successMessage}</p>
          </div>

          <div className="flex justify-end">
            <Button
              onClick={() => {
                setShowSuccessModal(false);
                setSuccessMessage("");
              }}
            >
              OK
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Clinic Information functionality moved to Settings page */}

      <Toaster />
    </div>
  );
}
