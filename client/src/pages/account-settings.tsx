import { useState } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { User, Lock, Mail, Shield, Bell, Eye, EyeOff, Upload, Trash2 } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export default function AccountSettings() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [profileImageUploading, setProfileImageUploading] = useState(false);
  const [profileImageDeleting, setProfileImageDeleting] = useState(false);
  const [isProfileImagePreviewOpen, setIsProfileImagePreviewOpen] = useState(false);
  
  // Profile Update State
  const [profileData, setProfileData] = useState({
    firstName: user?.firstName || "",
    lastName: user?.lastName || "",
    email: user?.email || "",
  });

  // Password Change State
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Notification Preferences State
  const [notifications, setNotifications] = useState({
    emailNotifications: true,
    appointmentReminders: true,
    patientUpdates: true,
    systemAlerts: true,
  });

  // Profile Update Mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (data: typeof profileData) => {
      return apiRequest('PATCH', '/api/user/profile', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/user/me'] });
      toast({
        title: "Profile Updated",
        description: "Your profile information has been updated successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update profile. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Password Change Mutation
  const changePasswordMutation = useMutation({
    mutationFn: async (data: typeof passwordData) => {
      if (data.newPassword !== data.confirmPassword) {
        throw new Error("New passwords do not match");
      }
      if (data.newPassword.length < 8) {
        throw new Error("Password must be at least 8 characters long");
      }
      return apiRequest('PATCH', '/api/user/change-password', {
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      });
    },
    onSuccess: () => {
      setPasswordData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
      toast({
        title: "Password Changed",
        description: "Your password has been changed successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Password Change Failed",
        description: error.message || "Failed to change password. Please check your current password.",
        variant: "destructive",
      });
    },
  });

  // Notification Preferences Mutation
  const updateNotificationsMutation = useMutation({
    mutationFn: async (data: typeof notifications) => {
      return apiRequest('PATCH', '/api/user/notifications', data);
    },
    onSuccess: () => {
      toast({
        title: "Preferences Updated",
        description: "Your notification preferences have been updated.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update notification preferences.",
        variant: "destructive",
      });
    },
  });

  const handleProfileUpdate = () => {
    updateProfileMutation.mutate(profileData);
  };

  const handlePasswordChange = () => {
    changePasswordMutation.mutate(passwordData);
  };

  const handleNotificationsUpdate = () => {
    updateNotificationsMutation.mutate(notifications);
  };

  // Load current user details (includes profilePicturePath) so preview updates immediately after upload/delete.
  const { data: currentUserDetails } = useQuery<any>({
    queryKey: ["/api/users/current"],
    enabled: !!user,
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/users/current");
      return res.json();
    },
    retry: false,
    staleTime: 30000,
  });
  const profilePicturePath: string | null =
    (currentUserDetails?.profilePicturePath as string | null | undefined) ||
    ((user as any)?.profilePicturePath as string | null | undefined) ||
    null;

  const handleUploadProfileImage = async (file: File) => {
    const okType =
      file.type === "image/jpeg" ||
      file.type === "image/png" ||
      file.type === "image/webp";
    if (!okType) {
      toast({
        title: "Invalid file type",
        description: "Only JPG, JPEG, PNG, and WebP images are allowed.",
        variant: "destructive",
      });
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Max file size is 2MB.",
        variant: "destructive",
      });
      return;
    }

    setProfileImageUploading(true);
    try {
      const token = localStorage.getItem("auth_token");
      if (!token) throw new Error("Not authenticated");

      const form = new FormData();
      form.append("image", file);
      const res = await fetch("/api/users/profile-picture", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: form,
        credentials: "same-origin",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || `Upload failed (HTTP ${res.status})`);

      await queryClient.invalidateQueries({ queryKey: ["/api/users/current"] });
      await queryClient.invalidateQueries({ queryKey: ["/api/telemedicine/users"] });
      toast({ title: "Profile picture updated" });
    } catch (e: any) {
      toast({
        title: "Upload failed",
        description: e?.message || "Could not upload profile picture.",
        variant: "destructive",
      });
    } finally {
      setProfileImageUploading(false);
    }
  };

  const handleDeleteProfileImage = async () => {
    setProfileImageDeleting(true);
    try {
      await apiRequest("DELETE", "/api/users/profile-picture");
      await queryClient.invalidateQueries({ queryKey: ["/api/users/current"] });
      await queryClient.invalidateQueries({ queryKey: ["/api/telemedicine/users"] });
      toast({ title: "Profile picture removed" });
    } catch (e: any) {
      toast({
        title: "Delete failed",
        description: e?.message || "Could not remove profile picture.",
        variant: "destructive",
      });
    } finally {
      setProfileImageDeleting(false);
    }
  };

  return (
    <div className="w-full min-h-0 flex flex-col page-zoom-90">
      <Header 
        title="Account Settings" 
        subtitle="Manage your account information, security, and preferences."
      />
      
      <div className="flex-1 overflow-auto px-3 sm:px-4 py-4">
          <Tabs defaultValue="profile" className="space-y-4">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="profile" data-testid="tab-profile">
                <User className="h-4 w-4 mr-2" />
                Profile
              </TabsTrigger>
              <TabsTrigger value="security" data-testid="tab-security">
                <Lock className="h-4 w-4 mr-2" />
                Security
              </TabsTrigger>
              <TabsTrigger value="notifications" data-testid="tab-notifications">
                <Bell className="h-4 w-4 mr-2" />
                Notifications
              </TabsTrigger>
              <TabsTrigger value="privacy" data-testid="tab-privacy">
                <Shield className="h-4 w-4 mr-2" />
                Privacy
              </TabsTrigger>
            </TabsList>

            {/* Profile Tab */}
            <TabsContent value="profile" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <User className="h-5 w-5" />
                    <span>Profile Picture</span>
                  </CardTitle>
                  <CardDescription>Upload, change, or remove your profile photo.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                    <div className="flex items-center gap-4 min-w-0">
                      <button
                        type="button"
                        className="rounded-full"
                        onClick={() => {
                          if (profilePicturePath) setIsProfileImagePreviewOpen(true);
                        }}
                        disabled={!profilePicturePath}
                        aria-label="Preview profile picture"
                      >
                        <Avatar className="h-16 w-16">
                          {profilePicturePath ? (
                            <AvatarImage src={profilePicturePath} alt="Profile picture" />
                          ) : null}
                          <AvatarFallback>
                            {(user?.firstName?.[0] || "U").toUpperCase()}
                            {(user?.lastName?.[0] || "").toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                      </button>

                      <div className="min-w-0">
                        <div className="font-medium truncate">
                          {user ? `${user.firstName} ${user.lastName}` : "User"}
                        </div>
                        <div className="text-sm text-muted-foreground truncate">{user?.email}</div>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 sm:ml-auto">
                      <input
                        id="account-profile-upload"
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        className="hidden"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) handleUploadProfileImage(f);
                          e.currentTarget.value = "";
                        }}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        disabled={profileImageUploading}
                        onClick={() => {
                          const el = document.getElementById("account-profile-upload") as HTMLInputElement | null;
                          el?.click();
                        }}
                        data-testid="button-uploadProfilePicture"
                      >
                        <Upload className="h-4 w-4 mr-2" />
                        {profileImageUploading ? "Uploading..." : profilePicturePath ? "Change photo" : "Upload photo"}
                      </Button>

                      <Button
                        type="button"
                        variant="destructive"
                        disabled={profileImageDeleting || !profilePicturePath}
                        onClick={handleDeleteProfileImage}
                        data-testid="button-deleteProfilePicture"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        {profileImageDeleting ? "Removing..." : "Remove"}
                      </Button>
                    </div>
                  </div>

                  <p className="text-xs text-muted-foreground">
                    Allowed: JPG/PNG/WebP. Max size: 2MB.
                  </p>
                </CardContent>
              </Card>

              <Dialog open={isProfileImagePreviewOpen} onOpenChange={setIsProfileImagePreviewOpen}>
                <DialogContent className="sm:max-w-lg">
                  <DialogHeader>
                    <DialogTitle>Profile picture</DialogTitle>
                  </DialogHeader>
                  <div className="w-full">
                    {profilePicturePath ? (
                      <img
                        src={profilePicturePath}
                        alt="Profile picture preview"
                        className="w-full max-h-[70vh] object-contain rounded-md border"
                      />
                    ) : null}
                  </div>
                </DialogContent>
              </Dialog>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <User className="h-5 w-5" />
                    <span>Personal Information</span>
                  </CardTitle>
                  <CardDescription>
                    Update your personal information and account details.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="firstName">First Name</Label>
                      <Input
                        id="firstName"
                        data-testid="input-firstName"
                        value={profileData.firstName}
                        onChange={(e) => setProfileData({ ...profileData, firstName: e.target.value })}
                        placeholder="Enter your first name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lastName">Last Name</Label>
                      <Input
                        id="lastName"
                        data-testid="input-lastName"
                        value={profileData.lastName}
                        onChange={(e) => setProfileData({ ...profileData, lastName: e.target.value })}
                        placeholder="Enter your last name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email Address</Label>
                      <Input
                        id="email"
                        type="email"
                        data-testid="input-email"
                        value={profileData.email}
                        onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                        placeholder="your.email@example.com"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Department</Label>
                      <Input value={user?.department || "Not assigned"} disabled className="bg-gray-100 dark:bg-gray-800" />
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-2">
                    <Label>Role</Label>
                    <Input value={user?.role || "N/A"} disabled className="bg-gray-100 dark:bg-gray-800" />
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Contact your administrator to change your role.
                    </p>
                  </div>

                  <div className="flex justify-end">
                    <Button
                      onClick={handleProfileUpdate}
                      disabled={updateProfileMutation.isPending}
                      data-testid="button-saveProfile"
                    >
                      {updateProfileMutation.isPending ? "Saving..." : "Save Changes"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Security Tab */}
            <TabsContent value="security" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Lock className="h-5 w-5" />
                    <span>Change Password</span>
                  </CardTitle>
                  <CardDescription>
                    Update your password to keep your account secure.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="currentPassword">Current Password</Label>
                    <div className="relative">
                      <Input
                        id="currentPassword"
                        type={showCurrentPassword ? "text" : "password"}
                        data-testid="input-currentPassword"
                        value={passwordData.currentPassword}
                        onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                        placeholder="Enter your current password"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                        data-testid="button-toggleCurrentPassword"
                      >
                        {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="newPassword">New Password</Label>
                    <div className="relative">
                      <Input
                        id="newPassword"
                        type={showNewPassword ? "text" : "password"}
                        data-testid="input-newPassword"
                        value={passwordData.newPassword}
                        onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                        placeholder="Enter your new password"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        data-testid="button-toggleNewPassword"
                      >
                        {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Password must be at least 8 characters long.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirm New Password</Label>
                    <div className="relative">
                      <Input
                        id="confirmPassword"
                        type={showConfirmPassword ? "text" : "password"}
                        data-testid="input-confirmPassword"
                        value={passwordData.confirmPassword}
                        onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                        placeholder="Confirm your new password"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        data-testid="button-toggleConfirmPassword"
                      >
                        {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>

                  <Separator />

                  <div className="flex justify-end">
                    <Button
                      onClick={handlePasswordChange}
                      disabled={
                        changePasswordMutation.isPending ||
                        !passwordData.currentPassword ||
                        !passwordData.newPassword ||
                        !passwordData.confirmPassword
                      }
                      data-testid="button-changePassword"
                    >
                      {changePasswordMutation.isPending ? "Changing..." : "Change Password"}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Two-Factor Authentication</CardTitle>
                  <CardDescription>
                    Add an extra layer of security to your account.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Enable Two-Factor Authentication</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Require a verification code in addition to your password.
                      </p>
                    </div>
                    <Switch disabled />
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-4">
                    Two-factor authentication is coming soon.
                  </p>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Notifications Tab */}
            <TabsContent value="notifications" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Bell className="h-5 w-5" />
                    <span>Notification Preferences</span>
                  </CardTitle>
                  <CardDescription>
                    Manage how you receive notifications and updates.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Email Notifications</Label>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Receive notifications via email.
                      </p>
                    </div>
                    <Switch
                      checked={notifications.emailNotifications}
                      onCheckedChange={(checked) => setNotifications({ ...notifications, emailNotifications: checked })}
                      data-testid="switch-emailNotifications"
                    />
                  </div>

                  <Separator />

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Appointment Reminders</Label>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Get reminders about upcoming appointments.
                      </p>
                    </div>
                    <Switch
                      checked={notifications.appointmentReminders}
                      onCheckedChange={(checked) => setNotifications({ ...notifications, appointmentReminders: checked })}
                      data-testid="switch-appointmentReminders"
                    />
                  </div>

                  <Separator />

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Patient Updates</Label>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Notifications about patient status changes.
                      </p>
                    </div>
                    <Switch
                      checked={notifications.patientUpdates}
                      onCheckedChange={(checked) => setNotifications({ ...notifications, patientUpdates: checked })}
                      data-testid="switch-patientUpdates"
                    />
                  </div>

                  <Separator />

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>System Alerts</Label>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Important system notifications and alerts.
                      </p>
                    </div>
                    <Switch
                      checked={notifications.systemAlerts}
                      onCheckedChange={(checked) => setNotifications({ ...notifications, systemAlerts: checked })}
                      data-testid="switch-systemAlerts"
                    />
                  </div>

                  <Separator />

                  <div className="flex justify-end">
                    <Button
                      onClick={handleNotificationsUpdate}
                      disabled={updateNotificationsMutation.isPending}
                      data-testid="button-saveNotifications"
                    >
                      {updateNotificationsMutation.isPending ? "Saving..." : "Save Preferences"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Privacy Tab */}
            <TabsContent value="privacy" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Shield className="h-5 w-5" />
                    <span>Privacy Settings</span>
                  </CardTitle>
                  <CardDescription>
                    Control your privacy and data sharing preferences.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-medium mb-2">Data Sharing</h4>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Your data is protected according to GDPR and healthcare compliance regulations. 
                        Only authorized healthcare providers within your organization can access your information.
                      </p>
                    </div>

                    <Separator />

                    <div>
                      <h4 className="font-medium mb-2">Account Visibility</h4>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Your profile is visible only to other users within your healthcare organization.
                      </p>
                    </div>

                    <Separator />

                    <div>
                      <h4 className="font-medium mb-2">Data Export</h4>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                        You can request a copy of your personal data at any time.
                      </p>
                      <Button variant="outline" data-testid="button-exportData">
                        <Mail className="h-4 w-4 mr-2" />
                        Request Data Export
                      </Button>
                    </div>

                    <Separator />

                    <div>
                      <h4 className="font-medium mb-2 text-red-600 dark:text-red-400">Delete Account</h4>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                        Permanently delete your account and all associated data. This action cannot be undone.
                      </p>
                      <Button variant="destructive" data-testid="button-deleteAccount">
                        Delete My Account
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
      </div>
    </div>
  );
}
