import { useState, useEffect, useCallback } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { UserPlus, Building2, Shield, ArrowLeft, CheckCircle, AlertTriangle } from "lucide-react";
import { saasApiRequest, saasQueryClient } from "@/lib/saasQueryClient";
import { Link } from "wouter";

const createUserSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Please enter a valid email address"),
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  role: z.string().min(1, "Please select a role"),
  organizationId: z.string().min(1, "Please select an organization"),
});

type CreateUserFormData = z.infer<typeof createUserSchema>;

export default function CreateUser() {
  const [modalOpen, setModalOpen] = useState(false);
  const [modalContent, setModalContent] = useState<{
    type: 'success' | 'error';
    title: string;
    description: string;
  } | null>(null);
  
  // Availability checking states
  const [usernameAvailability, setUsernameAvailability] = useState<'checking' | 'available' | 'taken' | null>(null);
  const [emailAvailability, setEmailAvailability] = useState<'checking' | 'available' | 'taken' | null>(null);

  // Fetch organizations
  const { data: organizations, isLoading: orgLoading } = useQuery({
    queryKey: ["/api/saas/organizations"],
    queryFn: async () => {
      const response = await saasApiRequest('GET', '/api/saas/organizations');
      return response.json();
    },
  });

  // Form setup
  const form = useForm<CreateUserFormData>({
    resolver: zodResolver(createUserSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      username: "",
      password: "",
      role: "",
      organizationId: "",
    },
  });

  // Watch form fields for availability checking
  const watchedUsername = form.watch('username');
  const watchedEmail = form.watch('email');
  const watchedOrganizationId = form.watch('organizationId');

  // Fetch roles based on selected organization (use SaaS endpoint)
  const { data: roles, isLoading: rolesLoading } = useQuery({
    queryKey: ["/api/saas/roles", watchedOrganizationId],
    queryFn: async () => {
      if (!watchedOrganizationId) return [];
      const response = await saasApiRequest('GET', `/api/saas/roles?organizationId=${watchedOrganizationId}`);
      return response.json();
    },
    enabled: !!watchedOrganizationId,
  });

  // Debounced availability check
  const checkAvailability = useCallback(
    async (type: 'username' | 'email', value: string, organizationId: string) => {
      if (!value || !organizationId) return;

      if (type === 'username') {
        setUsernameAvailability('checking');
      } else {
        setEmailAvailability('checking');
      }

      try {
        const params = new URLSearchParams({ organizationId });
        if (type === 'username') {
          params.append('username', value);
        } else {
          params.append('email', value);
        }

        const response = await saasApiRequest('GET', `/api/saas/users/check-availability?${params.toString()}`);
        const result = await response.json();

        if (type === 'username') {
          setUsernameAvailability(result.usernameAvailable ? 'available' : 'taken');
        } else {
          setEmailAvailability(result.emailAvailable ? 'available' : 'taken');
        }
      } catch (error) {
        console.error('Error checking availability:', error);
        if (type === 'username') {
          setUsernameAvailability(null);
        } else {
          setEmailAvailability(null);
        }
      }
    },
    []
  );

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (watchedUsername && watchedUsername.length >= 3 && watchedOrganizationId) {
        checkAvailability('username', watchedUsername, watchedOrganizationId);
      } else {
        setUsernameAvailability(null);
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [watchedUsername, watchedOrganizationId, checkAvailability]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (watchedEmail && watchedEmail.includes('@') && watchedOrganizationId) {
        checkAvailability('email', watchedEmail, watchedOrganizationId);
      } else {
        setEmailAvailability(null);
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [watchedEmail, watchedOrganizationId, checkAvailability]);

  // Reset role when organization changes
  useEffect(() => {
    form.setValue("role", "");
  }, [watchedOrganizationId, form]);

  // Create user mutation
  const createUserMutation = useMutation({
    mutationFn: async (data: CreateUserFormData) => {
      const response = await saasApiRequest("POST", "/api/saas/users/create", data);
      
      // Explicitly check for success status codes (200, 201)
      if (response.ok && (response.status === 200 || response.status === 201)) {
        const result = await response.json();
        return result;
      }
      
      // If not successful, parse the error properly
      const errorText = await response.text();
      let errorMessage = 'Failed to create user';
      
      try {
        // Try to parse as JSON
        const errorJson = JSON.parse(errorText);
        errorMessage = errorJson.error || errorJson.message || errorMessage;
      } catch {
        // If not JSON, use the text as-is (but clean it up)
        errorMessage = errorText || errorMessage;
      }
      
      throw new Error(errorMessage);
    },
    onSuccess: (newUser: any) => {
      const selectedRole = form.getValues('role');
      const isPatient = selectedRole === 'patient';
      
      setModalContent({
        type: 'success',
        title: 'User Created Successfully',
        description: isPatient 
          ? `${newUser.firstName} ${newUser.lastName} has been added to the system. A patient record has been automatically created in the patients table with organization ID ${newUser.organizationId}.`
          : `${newUser.firstName} ${newUser.lastName} has been added to the system.`,
      });
      setModalOpen(true);
      saasQueryClient.invalidateQueries({ queryKey: ["/api/saas/users"] });
      form.reset();
    },
    onError: (error: any) => {
      let cleanErrorMessage = 'An error occurred while creating the user.';
      
      if (error.message) {
        // First, try to parse the message as JSON directly
        try {
          const errorObj = JSON.parse(error.message);
          cleanErrorMessage = errorObj.error || errorObj.message || cleanErrorMessage;
        } catch {
          // Check if error message has format "400: {...}"
          const match = error.message.match(/^\d+:\s*(.+)$/);
          if (match) {
            const jsonPart = match[1];
            try {
              const errorObj = JSON.parse(jsonPart);
              cleanErrorMessage = errorObj.error || errorObj.message || cleanErrorMessage;
            } catch {
              cleanErrorMessage = jsonPart;
            }
          } else {
            cleanErrorMessage = error.message;
          }
        }
      }
      
      setModalContent({
        type: 'error',
        title: 'Failed to Create User',
        description: cleanErrorMessage,
      });
      setModalOpen(true);
    },
  });

  const onSubmit = (data: CreateUserFormData) => {
    createUserMutation.mutate(data);
  };

  if (orgLoading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
            <div className="h-96 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link href="/saas/users" className="inline-flex items-center gap-2 text-indigo-600 hover:text-indigo-800 mb-4">
            <ArrowLeft className="h-4 w-4" />
            Back to Users
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <UserPlus className="h-8 w-8 text-indigo-600" />
            Create New User
          </h1>
          <p className="text-gray-600 mt-2">Add a new user to the Cura EMR system</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Form */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>User Information</CardTitle>
                <CardDescription>
                  Enter the user's personal details and account information
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  {/* Personal Information */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium text-gray-900">Personal Details</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="firstName">First Name</Label>
                        <Input
                          id="firstName"
                          {...form.register("firstName")}
                          placeholder="Enter first name"
                        />
                        {form.formState.errors.firstName && (
                          <p className="text-sm text-red-600">
                            {form.formState.errors.firstName.message}
                          </p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="lastName">Last Name</Label>
                        <Input
                          id="lastName"
                          {...form.register("lastName")}
                          placeholder="Enter last name"
                        />
                        {form.formState.errors.lastName && (
                          <p className="text-sm text-red-600">
                            {form.formState.errors.lastName.message}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="email">Email Address</Label>
                      <Input
                        id="email"
                        type="email"
                        {...form.register("email")}
                        placeholder="user@example.com"
                      />
                      {emailAvailability === 'checking' && (
                        <p className="text-sm text-gray-600">Checking availability...</p>
                      )}
                      {emailAvailability === 'available' && (
                        <p className="text-sm text-green-600 font-medium">✓ Available</p>
                      )}
                      {emailAvailability === 'taken' && (
                        <p className="text-sm text-red-600 font-medium">✗ Already exists</p>
                      )}
                      {form.formState.errors.email && (
                        <p className="text-sm text-red-600">
                          {form.formState.errors.email.message}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Account Information */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium text-gray-900">Account Details</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="username">Username</Label>
                        <Input
                          id="username"
                          {...form.register("username")}
                          placeholder="Enter username"
                        />
                        {usernameAvailability === 'checking' && (
                          <p className="text-sm text-gray-600">Checking availability...</p>
                        )}
                        {usernameAvailability === 'available' && (
                          <p className="text-sm text-green-600 font-medium">✓ Available</p>
                        )}
                        {usernameAvailability === 'taken' && (
                          <p className="text-sm text-red-600 font-medium">✗ Already exists</p>
                        )}
                        {form.formState.errors.username && (
                          <p className="text-sm text-red-600">
                            {form.formState.errors.username.message}
                          </p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="password">Password</Label>
                        <Input
                          id="password"
                          type="password"
                          {...form.register("password")}
                          placeholder="Enter password"
                        />
                        {form.formState.errors.password && (
                          <p className="text-sm text-red-600">
                            {form.formState.errors.password.message}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Organization & Role */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium text-gray-900">Organization & Role</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="organizationId">Organization</Label>
                        <Select onValueChange={(value) => form.setValue("organizationId", value)}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select organization" />
                          </SelectTrigger>
                          <SelectContent>
                            {organizations?.map((org: any) => (
                              <SelectItem key={org.id} value={org.id.toString()}>
                                <div className="flex items-center gap-2">
                                  <Building2 className="h-4 w-4" />
                                  {org.name}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {form.formState.errors.organizationId && (
                          <p className="text-sm text-red-600">
                            {form.formState.errors.organizationId.message}
                          </p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="role">User Role</Label>
                        <Select 
                          onValueChange={(value) => form.setValue("role", value)}
                          disabled={!watchedOrganizationId || rolesLoading}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder={
                              !watchedOrganizationId 
                                ? "Select organization first" 
                                : rolesLoading 
                                ? "Loading roles..." 
                                : "Select role"
                            } />
                          </SelectTrigger>
                          <SelectContent>
                            {roles?.map((role: any) => (
                              <SelectItem key={role.id} value={role.name}>
                                <div className="flex items-center gap-2">
                                  <Shield className="h-4 w-4" />
                                  {role.displayName}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {form.formState.errors.role && (
                          <p className="text-sm text-red-600">
                            {form.formState.errors.role.message}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Submit Button */}
                  <div className="pt-6 border-t">
                    <Button
                      type="submit"
                      disabled={createUserMutation.isPending}
                      className="w-full"
                      size="lg"
                    >
                      {createUserMutation.isPending ? (
                        "Creating User..."
                      ) : (
                        <span className="flex items-center gap-2">
                          <UserPlus className="h-5 w-5" />
                          Create User Account
                        </span>
                      )}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>

          {/* Role Information Sidebar */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Role Permissions
                </CardTitle>
                <CardDescription>
                  Information about user roles and their access levels
                </CardDescription>
              </CardHeader>
              <CardContent>
                {!watchedOrganizationId ? (
                  <p className="text-sm text-gray-500 text-center py-4">
                    Select an organization to view available roles
                  </p>
                ) : rolesLoading ? (
                  <div className="space-y-3">
                    <div className="h-16 bg-gray-100 rounded animate-pulse"></div>
                    <div className="h-16 bg-gray-100 rounded animate-pulse"></div>
                    <div className="h-16 bg-gray-100 rounded animate-pulse"></div>
                  </div>
                ) : roles && roles.length > 0 ? (
                  <div className="space-y-4">
                    {roles.map((role: any) => (
                      <div key={role.id} className="border-l-4 border-indigo-200 pl-4">
                        <h4 className="font-medium text-gray-900">{role.displayName}</h4>
                        <p className="text-sm text-gray-600">{role.description}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 text-center py-4">
                    No roles found for this organization
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Organization Info */}
            {organizations && organizations.length > 0 && (
              <Card className="mt-6">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="h-5 w-5" />
                    Available Organizations
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {organizations.slice(0, 5).map((org: any) => (
                      <div key={org.id} className="flex items-center gap-2 text-sm">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <span className="truncate">{org.name}</span>
                      </div>
                    ))}
                    {organizations.length > 5 && (
                      <p className="text-xs text-gray-500 pt-2">
                        +{organizations.length - 5} more organizations
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* Success/Error Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-md z-[9999]">
          <DialogHeader>
            <div className="flex items-center gap-3">
              {modalContent?.type === 'success' ? (
                <CheckCircle className="h-8 w-8 text-green-500" />
              ) : (
                <AlertTriangle className="h-8 w-8 text-red-500" />
              )}
              <DialogTitle>{modalContent?.title}</DialogTitle>
            </div>
            <DialogDescription className="pt-2">
              {modalContent?.description}
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-3 mt-4">
            <Button onClick={() => setModalOpen(false)}>
              OK
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}