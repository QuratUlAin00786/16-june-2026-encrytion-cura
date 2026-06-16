import { Lock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface AccessRestrictedProps {
  moduleName: string;
}

export function AccessRestricted({ moduleName }: AccessRestrictedProps) {
  return (
    <div className="flex items-center justify-center min-h-[400px] p-6">
      <Card className="w-full max-w-md">
        <CardContent className="pt-6">
          <div className="flex flex-col items-center text-center space-y-4">
            <div className="rounded-full bg-red-100 dark:bg-red-900/20 p-4">
              <Lock className="h-8 w-8 text-red-600 dark:text-red-400" />
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                {moduleName} Access Restricted
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Please contact an administrator to request access.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
