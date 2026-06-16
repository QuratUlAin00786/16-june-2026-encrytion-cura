import { useMemo, useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2 } from "lucide-react";

export default function CreateTrialSetPasswordPage() {
  const [status, setStatus] = useState<"idle" | "submitting" | "success">("idle");
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [form, setForm] = useState({ newPassword: "", confirmPassword: "" });
  const [, setLocation] = useLocation();
  const queryToken = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("token") || "";
  }, []);

  const handleChange = (field: "newPassword" | "confirmPassword", value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!queryToken) {
      setError("Missing password setup token.");
      return;
    }

    if (form.newPassword !== form.confirmPassword) {
      setError("Passwords must match.");
      return;
    }

    setStatus("submitting");
    setError("");
    try {
      const response = await fetch("/api/create-trial/set-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: queryToken,
          newPassword: form.newPassword,
          confirmPassword: form.confirmPassword,
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || "Unable to save password");
      }

      const data = await response.json();
      setSuccessMessage(data.message ?? "Your trial is now active.");
      setStatus("success");
    } catch (err: any) {
      setError(err.message || "Unable to save your password.");
      setStatus("idle");
    }
  };

  if (status === "success") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white dark:from-gray-900 dark:to-gray-800 flex items-center justify-center px-4">
        <div className="w-full max-w-lg">
          <Card className="shadow-xl">
            <CardHeader>
              <CardTitle className="text-[20px] font-semibold">
                🎉 Your 14-Day Trial Is Active
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-gray-700 dark:text-gray-300">
                {successMessage}
              </p>
              <p className="text-sm text-gray-500">
                Your trial expires in 14 days. Stay signed in to keep exploring all features.
              </p>
              <div className="flex justify-end space-x-2">
                <Button
                  variant="ghost"
                  onClick={() => setLocation("/landing")}
                >
                  Back to Landing
                </Button>
                <Button onClick={() => setLocation("/auth/login")}>
                  Go to Login
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white dark:from-gray-900 dark:to-gray-800 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <Card className="shadow-xl">
          <CardHeader>
            <CardTitle className="text-[20px] font-semibold">
              Change Password
            </CardTitle>
            <p className="text-xs text-gray-500">
              Enter a secure password to activate your trial.
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="new-password">New Password</Label>
                <Input
                  id="new-password"
                  type="password"
                  value={form.newPassword}
                  onChange={(event) => handleChange("newPassword", event.target.value)}
                  placeholder="Create a secure password"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirm New Password</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  value={form.confirmPassword}
                  onChange={(event) =>
                    handleChange("confirmPassword", event.target.value)
                  }
                  placeholder="Re-enter your password"
                  required
                />
              </div>

              <p className="text-xs text-gray-500">
                Passwords must be at least 8 characters, matching, and different from the previous password placeholder.
              </p>

              <Button type="submit" className="w-full" disabled={status === "submitting"}>
                {status === "submitting" ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving password...
                  </>
                ) : (
                  "Set Password & Activate Trial"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
