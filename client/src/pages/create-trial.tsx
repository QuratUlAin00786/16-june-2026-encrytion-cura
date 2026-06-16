import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2 } from "lucide-react";
import { Link } from "wouter";

const initialForm = {
  organizationName: "",
  brandName: "",
  adminFirstName: "",
  adminLastName: "",
  email: "",
};

export default function CreateTrialPage() {
  const [form, setForm] = useState(initialForm);
  const [status, setStatus] = useState<"idle" | "submitting" | "success">("idle");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [orgNameError, setOrgNameError] = useState("");
  const [orgNameSuccess, setOrgNameSuccess] = useState("");

  useEffect(() => {
    const name = form.organizationName.trim();
    if (!name) {
      setOrgNameError("");
      setOrgNameSuccess("");
      return;
    }

    const controller = new AbortController();
    const timeout = setTimeout(async () => {
      try {
        const response = await fetch(
          `/api/organizations/check-name?name=${encodeURIComponent(name)}`,
          { signal: controller.signal },
        );

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          console.error("[CREATE TRIAL] Name check error:", errorData);
          setOrgNameError("Unable to verify organization name right now.");
          setOrgNameSuccess("");
          return;
        }

        const data = await response.json();
        if (data.exists) {
          // Convert organization name to slug format (lowercase, replace spaces with hyphens)
          const slug = name.toLowerCase().replace(/\s+/g, "-");
          setOrgNameError(`Title\n"${slug}"\nThis title already exists. Please choose a different organization name.`);
          setOrgNameSuccess("");
        } else {
          const slug = name.toLowerCase().replace(/\s+/g, "-");
          setOrgNameError("");
          setOrgNameSuccess(`Title\n${slug}\n✓ Title is available`);
        }
      } catch (err: any) {
        if (err.name === "AbortError") return;
        console.error("[CREATE TRIAL] Name check failed:", err);
        setOrgNameError("Unable to verify organization name right now.");
        setOrgNameSuccess("");
      }
    }, 450);

    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, [form.organizationName]);

  const handleChange = (field: keyof typeof initialForm, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setStatus("submitting");
    setError("");
    try {
      if (orgNameError) {
        setError(orgNameError);
        setStatus("idle");
        return;
      }

      const response = await fetch("/api/create-trial", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organizationName: form.organizationName,
          brandName: form.brandName,
          adminFirstName: form.adminFirstName,
          adminLastName: form.adminLastName,
          email: form.email,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to create trial account");
      }

      const data = await response.json();
      setMessage(data.message || "Check your email to continue.");
      setStatus("success");
    } catch (err: any) {
      setError(err.message || "Unable to process your request right now.");
      setStatus("idle");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white dark:from-gray-900 dark:to-gray-800 flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-3xl space-y-6">
        <div className="text-center space-y-2">
          <p className="text-sm font-semibold uppercase tracking-wide text-blue-700 dark:text-blue-300">
            Create Free 14-Day Trial
          </p>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Start Your Free 14-Day Trial
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            No credit card required. Full access. Cancel anytime.
          </p>
        </div>

        <Card className="shadow-xl">
          <CardHeader>
            <CardTitle className="text-xl">Tell us about your organization</CardTitle>
          </CardHeader>
          <CardContent>
            {error && (
              <Alert className="mb-4" variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {status === "success" ? (
              <div className="space-y-3">
                <div className="text-green-700 dark:text-green-300 font-semibold">
                  {message}
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  We have sent a verification link to the email you provided. Click
                  the link, set your password, and your trial will activate automatically.
                </p>
                <div className="flex justify-center">
                  <Link
                    href="/auth/login"
                    className="text-sm font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400"
                  >
                    Return to Login
                  </Link>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                <section className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      Organization Details
                    </h3>
                    <span className="text-xs uppercase tracking-wider text-blue-600 dark:text-blue-300">
                      Step 1
                    </span>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                <Label htmlFor="organizationName">Organization Name *</Label>
                <Input
                  id="organizationName"
                  value={form.organizationName}
                  onChange={(event) =>
                    handleChange("organizationName", event.target.value)
                  }
                  placeholder="e.g. Cura Healthcare"
                  required
                  aria-invalid={Boolean(orgNameError)}
                />
                {orgNameError && (
                  <p className="text-xs text-red-600 whitespace-pre-line">{orgNameError}</p>
                )}
                {orgNameSuccess && !orgNameError && (
                  <p className="text-xs text-green-600 whitespace-pre-line">{orgNameSuccess}</p>
                )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="brandName">Brand Name (optional)</Label>
                      <Input
                        id="brandName"
                        value={form.brandName}
                        onChange={(event) => handleChange("brandName", event.target.value)}
                        placeholder="e.g. Cura Health"
                      />
                    </div>
                  </div>
                </section>

                <section className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      Administrator Account
                    </h3>
                    <span className="text-xs uppercase tracking-wider text-blue-600 dark:text-blue-300">
                      Step 2
                    </span>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="firstName">First Name *</Label>
                      <Input
                        id="firstName"
                        value={form.adminFirstName}
                        onChange={(event) =>
                          handleChange("adminFirstName", event.target.value)
                        }
                        placeholder="e.g. James"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lastName">Last Name *</Label>
                      <Input
                        id="lastName"
                        value={form.adminLastName}
                        onChange={(event) =>
                          handleChange("adminLastName", event.target.value)
                        }
                        placeholder="e.g. Miller"
                        required
                      />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="email">Email Address *</Label>
                      <Input
                        id="email"
                        type="email"
                        value={form.email}
                        onChange={(event) => handleChange("email", event.target.value)}
                        placeholder="admin@yourorganization.com"
                        required
                      />
                    </div>
                  </div>
                </section>

                <section className="space-y-2 rounded-lg border border-dashed border-blue-200 bg-blue-50/80 p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-gray-900 font-semibold">Trial Information (System Controlled)</p>
                    <span className="text-xs uppercase tracking-wide text-blue-700">Step 3</span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    Your account will be created with a 14-day full-access trial, trial status and payment status set to "trial", and capped at 10 users and 100 patients.
                  </p>
                  <p className="text-xs text-gray-500">
                    Trial Start Date = today, Trial End Date = today + 14 days, access level = Full.
                  </p>
                </section>

                <Button
                  type="submit"
                  className="w-full"
                  disabled={status === "submitting" || Boolean(orgNameError)}
                >
                  {status === "submitting" ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating Trial...
                    </>
                  ) : (
                    "Create Trial Account"
                  )}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>

        <div className="text-center text-sm text-gray-600 dark:text-gray-300">
          Already onboarded?{" "}
          <Link href="/auth/login" className="font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-300">
            Sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
