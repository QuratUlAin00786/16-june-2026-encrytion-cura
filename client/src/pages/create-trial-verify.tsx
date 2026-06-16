import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2 } from "lucide-react";

export default function CreateTrialVerifyPage() {
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("Verifying your email...");
  const [error, setError] = useState("");
  const [, setLocation] = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");

    if (!token) {
      setStatus("error");
      setError("Verification token is missing.");
      return;
    }

    const verify = async () => {
      try {
        const response = await fetch(`/api/create-trial/verify-email?token=${encodeURIComponent(token)}`);
        if (!response.ok) {
          const data = await response.json().catch(() => ({}));
          throw new Error(data.error || "Verification failed.");
        }

        const data = await response.json();
        setMessage("Email verified. Redirecting to password setup...");
        setStatus("success");
        setTimeout(() => {
          setLocation(`/create-trial/set-password?token=${encodeURIComponent(data.passwordToken)}`);
        }, 1200);
      } catch (err: any) {
        setStatus("error");
        setError(err.message || "Unable to verify the link.");
      }
    };

    verify();
  }, [setLocation]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white dark:from-gray-900 dark:to-gray-800 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <Card className="shadow-xl">
          <CardHeader>
            <CardTitle>Verifying Email</CardTitle>
          </CardHeader>
          <CardContent>
            {status === "loading" && (
              <div className="flex flex-col items-center space-y-4 text-center text-gray-600 dark:text-gray-300">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                <p>{message}</p>
              </div>
            )}

            {status === "error" && (
              <div className="space-y-3">
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
                <div className="text-sm text-gray-600 dark:text-gray-300">
                  If the link expired, restart the trial so we can send a new verification email.
                </div>
                <div className="flex justify-center">
                  <Link
                    href="/create-trial"
                    className="text-blue-600 hover:text-blue-700 dark:text-blue-300 font-semibold"
                  >
                    Start a new trial
                  </Link>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
