import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { 
  ArrowLeft, Save, ChevronDown, Undo, Redo, Bold, Italic, Underline,
  AlignLeft, AlignCenter, AlignRight, AlignJustify, List, ListOrdered,
  FileText, Plus, Eye, Download, Settings, Image, Link, Users, MoreHorizontal,
  Table, Paperclip, Palette, Type
} from "lucide-react";

interface DocumentForm {
  id: string;
  title: string;
  content: string;
  lastModified: string;
  type: 'form' | 'template' | 'document';
  status: 'draft' | 'published';
}

const mockDocuments: DocumentForm[] = [
  {
    id: "doc_1",
    title: "Patient Intake Form",
    content: "<h1>Patient Information Form</h1><p>Please fill out the following information completely and accurately.</p><h2>Personal Information</h2><p><strong>Full Name:</strong> ________________</p><p><strong>Date of Birth:</strong> ________________</p><p><strong>Phone Number:</strong> ________________</p><p><strong>Email Address:</strong> ________________</p><h2>Medical History</h2><p><strong>Current Medications:</strong></p><p>________________</p><p><strong>Known Allergies:</strong></p><p>________________</p><p><strong>Previous Surgeries:</strong></p><p>________________</p>",
    lastModified: "2025-01-08T10:30:00Z",
    type: 'form',
    status: 'published'
  },
  {
    id: "doc_2", 
    title: "Consent Form Template",
    content: "<h1>Medical Consent Form</h1><p>I, ________________, hereby give my consent for medical treatment.</p><p><strong>Date:</strong> ________________</p><p><strong>Patient Signature:</strong> ________________</p>",
    lastModified: "2025-01-07T14:15:00Z",
    type: 'template',
    status: 'draft'
  }
];

export default function FormsPage() {
  const [selectedDocument, setSelectedDocument] = useState<DocumentForm | null>(mockDocuments[0]);
  const [isEditing, setIsEditing] = useState(true);
  const [documentContent, setDocumentContent] = useState(selectedDocument?.content || "");
  const [documentTitle, setDocumentTitle] = useState(selectedDocument?.title || "");
  const [fontSize, setFontSize] = useState("12pt");
  const [fontFamily, setFontFamily] = useState("verdana");
  const [textStyle, setTextStyle] = useState("paragraph");
  const { toast } = useToast();

  const handleSave = () => {
    toast({
      title: "Document Saved",
      description: "Your form has been saved successfully.",
    });
  };

  const handlePreview = () => {
    toast({
      title: "Preview Generated",
      description: "Form preview has been generated successfully.",
    });
  };

  const handleSaveAsDraft = () => {
    toast({
      title: "Saved as Draft",
      description: "Your form has been saved as draft.",
    });
  };

  const handleUndo = () => {
    toast({
      title: "Undo",
      description: "Last action undone.",
    });
  };

  const handleRedo = () => {
    toast({
      title: "Redo",
      description: "Action redone.",
    });
  };

  const handleBold = () => {
    toast({
      title: "Bold",
      description: "Bold formatting applied.",
    });
  };

  const handleItalic = () => {
    toast({
      title: "Italic",
      description: "Italic formatting applied.",
    });
  };

  const handleUnderline = () => {
    toast({
      title: "Underline",
      description: "Underline formatting applied.",
    });
  };

  const handleAlignment = (alignment: string) => {
    toast({
      title: "Text Alignment",
      description: `Text aligned to ${alignment}.`,
    });
  };

  const handleList = (type: string) => {
    toast({
      title: "List",
      description: `${type} list inserted.`,
    });
  };

  const handleInsertTemplate = () => {
    toast({
      title: "Insert Template",
      description: "Template selection opened.",
    });
  };

  const handleInsertLogo = () => {
    toast({
      title: "Insert Logo",
      description: "Logo insertion dialog opened.",
    });
  };

  const handleClinic = () => {
    toast({
      title: "Clinic",
      description: "Clinic information options opened.",
    });
  };

  const handlePatient = () => {
    toast({
      title: "Patient",
      description: "Patient information options opened.",
    });
  };

  const handleRecipient = () => {
    toast({
      title: "Recipient",
      description: "Recipient selection opened.",
    });
  };

  const handleAppointments = () => {
    toast({
      title: "Appointments",
      description: "Appointment data options opened.",
    });
  };

  const handleLabs = () => {
    toast({
      title: "Labs",
      description: "Lab results options opened.",
    });
  };

  const handlePatientRecords = () => {
    toast({
      title: "Patient Records",
      description: "Patient records options opened.",
    });
  };

  const handleInsertProduct = () => {
    toast({
      title: "Insert Product",
      description: "Product insertion dialog opened.",
    });
  };

  const handleTable = () => {
    toast({
      title: "Insert Table",
      description: "Table insertion dialog opened.",
    });
  };

  const handleAttachFile = () => {
    toast({
      title: "Attach File",
      description: "File attachment dialog opened.",
    });
  };

  const handleTextColor = () => {
    toast({
      title: "Text Color",
      description: "Text color picker opened.",
    });
  };

  const handleHighlight = () => {
    toast({
      title: "Text Highlight",
      description: "Text highlighting tool activated.",
    });
  };

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Top Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex items-center justify-center w-full">
          <div className="flex items-center space-x-3 max-w-6xl">
            <Button variant="ghost" size="sm" onClick={() => toast({ title: "Letters", description: "Navigating back to letters list." })}>
              <ArrowLeft className="h-4 w-4 mr-1" />
              <span className="text-sm">Letters</span>
            </Button>
            <Button className="bg-teal-600 hover:bg-teal-700 text-white text-sm px-4 py-2" onClick={handlePreview}>
              Save and preview
            </Button>
            <Button variant="outline" size="sm" onClick={handleSaveAsDraft}>
              Save as draft
            </Button>
            <div className="text-sm text-gray-600 mx-3">Letter body</div>
            <span className="text-sm text-gray-600 cursor-pointer">Select Patient...</span>
            <span className="text-sm text-gray-600 cursor-pointer">New Chris...</span>
            <span className="text-sm text-gray-600 cursor-pointer">Share this...</span>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="bg-white border-b border-gray-200 py-2 px-4">
        {/* First row - Main formatting tools */}
        <div className="flex justify-center w-full mb-2">
          <div className="flex items-center gap-1 bg-gray-50 px-3 py-1 rounded">
            {/* Undo/Redo */}
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={handleUndo}>
              <Undo className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={handleRedo}>
              <Redo className="h-4 w-4" />
            </Button>
            
            <div className="h-4 w-px bg-gray-300 mx-1"></div>
            
            {/* Text Style Dropdown */}
            <Select value={textStyle} onValueChange={setTextStyle}>
              <SelectTrigger className="w-24 h-7 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="paragraph">Paragraph</SelectItem>
                <SelectItem value="heading1">Heading 1</SelectItem>
                <SelectItem value="heading2">Heading 2</SelectItem>
                <SelectItem value="heading3">Heading 3</SelectItem>
              </SelectContent>
            </Select>

            {/* Font Family */}
            <Select value={fontFamily} onValueChange={setFontFamily}>
              <SelectTrigger className="w-20 h-7 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="verdana">Verdana</SelectItem>
                <SelectItem value="arial">Arial</SelectItem>
                <SelectItem value="times">Times</SelectItem>
                <SelectItem value="calibri">Calibri</SelectItem>
              </SelectContent>
            </Select>

            {/* Font Size */}
            <Select value={fontSize} onValueChange={setFontSize}>
              <SelectTrigger className="w-16 h-7 text-xs">
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
            
            <div className="h-4 w-px bg-gray-300 mx-1"></div>
            
            {/* Text Formatting */}
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={handleBold}>
              <Bold className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={handleItalic}>
              <Italic className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={handleUnderline}>
              <Underline className="h-4 w-4" />
            </Button>
            
            <div className="h-4 w-px bg-gray-300 mx-1"></div>
            
            {/* Lists */}
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => handleList('Bullet')}>
              <List className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => handleList('Numbered')}>
              <ListOrdered className="h-4 w-4" />
            </Button>
            
            <div className="h-4 w-px bg-gray-300 mx-1"></div>
            
            {/* Text Alignment */}
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => handleAlignment('left')}>
              <AlignLeft className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => handleAlignment('center')}>
              <AlignCenter className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => handleAlignment('right')}>
              <AlignRight className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => handleAlignment('justify')}>
              <AlignJustify className="h-4 w-4" />
            </Button>
            
            <div className="h-4 w-px bg-gray-300 mx-1"></div>
            
            {/* Text Color and Highlight */}
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={handleTextColor}>
              <div className="w-4 h-4 border-b-2 border-red-500 flex items-center justify-center text-xs">A</div>
            </Button>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={handleHighlight}>
              <div className="w-4 h-4 bg-yellow-300 border border-gray-400"></div>
            </Button>
            
            <div className="h-4 w-px bg-gray-300 mx-1"></div>
            
            {/* Insert Options */}
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={handleTable}>
              <Table className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={handleAttachFile}>
              <Paperclip className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => toast({ title: "Insert Image", description: "Image insertion dialog opened." })}>
              <Image className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => toast({ title: "Insert Link", description: "Link insertion dialog opened." })}>
              <Link className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Second row - Medical data buttons */}
        <div className="flex justify-center w-full">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" className="text-xs h-7 px-2" onClick={handleInsertTemplate}>
              Insert template
            </Button>
            <Button variant="ghost" size="sm" className="text-xs h-7 px-2" onClick={handleInsertLogo}>
              Insert logo
            </Button>
            <Button variant="ghost" size="sm" className="text-xs h-7 px-2" onClick={handleClinic}>
              Clinic
            </Button>
            <Button variant="ghost" size="sm" className="text-xs h-7 px-2" onClick={handlePatient}>
              Patient
            </Button>
            <Button variant="ghost" size="sm" className="text-xs h-7 px-2" onClick={handleRecipient}>
              Recipient
            </Button>
            <Button variant="ghost" size="sm" className="text-xs h-7 px-2" onClick={handleAppointments}>
              Appointments
            </Button>
            <Button variant="ghost" size="sm" className="text-xs h-7 px-2" onClick={handleLabs}>
              Labs
            </Button>
            <Button variant="ghost" size="sm" className="text-xs h-7 px-2" onClick={handlePatientRecords}>
              Patient records
            </Button>
            <Button variant="ghost" size="sm" className="text-xs h-7 px-2" onClick={handleInsertProduct}>
              Insert product
            </Button>
          </div>
        </div>
      </div>

      {/* Document Editor */}
      <div className="flex-1 bg-gray-100 p-8 overflow-y-auto flex justify-center items-center">
        <div className="bg-white shadow-lg border border-gray-200 rounded-sm" style={{ width: '650px', height: '450px' }}>
          <div className="h-full p-6">
            <textarea
              value={documentContent}
              onChange={(e) => setDocumentContent(e.target.value)}
              className="w-full h-full resize-none border-none outline-none text-black text-sm leading-relaxed bg-transparent"
              placeholder=""
              style={{ 
                fontFamily: fontFamily, 
                fontSize: fontSize || '12pt',
                lineHeight: '1.5'
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}