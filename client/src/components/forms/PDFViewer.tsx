import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface PDFViewerProps {
  url: string;
  label?: string;
}

export function PDFViewer({ url, label = "Form PDF" }: PDFViewerProps) {
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>{label}</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <iframe
          title={label}
          src={url}
          className="w-full h-[500px] border-0"
        />
      </CardContent>
    </Card>
  );
}

