import { useQuery } from "@tanstack/react-query";
import { useRoute } from "wouter";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Stethoscope, Mail, Phone, MapPin, Calendar, Clock, User, Building } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import type { User as StaffMember } from "@/types";
import { isDoctorLike } from "@/lib/role-utils";

function getInitials(firstName: string, lastName: string): string {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

function getStaffProfilePictureUrl(staff: {
  profilePicturePath?: string | null;
  profile_picture_path?: string | null;
}): string | null {
  const raw = staff?.profilePicturePath ?? staff?.profile_picture_path;
  if (typeof raw !== "string") return null;
  const t = raw.trim();
  return t.length > 0 ? t : null;
}

const departmentColors: Record<string, string> = {
  "Cardiology": "bg-red-100 text-red-800",
  "General Medicine": "bg-blue-100 text-blue-800",
  "Pediatrics": "bg-green-100 text-green-800",
  "Orthopedics": "bg-orange-100 text-orange-800",
  "Neurology": "bg-purple-100 text-purple-800",
  "Dermatology": "bg-pink-100 text-pink-800",
  "Psychiatry": "bg-indigo-100 text-indigo-800",
  "Surgery": "bg-gray-100 text-gray-800",
  "Emergency": "bg-yellow-100 text-yellow-800",
  "Administration": "bg-teal-100 text-teal-800",
};

const roleColors: Record<string, string> = {
  "doctor": "bg-blue-100 text-blue-800",
  "nurse": "bg-green-100 text-green-800",
  "admin": "bg-purple-100 text-purple-800",
  "receptionist": "bg-orange-100 text-orange-800",
};

export default function StaffProfile() {
  const [match, params] = useRoute("/:subdomain/staff/:id");
  const staffId = params?.id;

  const { data: staffMember, isLoading, error } = useQuery({
    queryKey: ["/api/users", staffId],
    queryFn: async () => {
      try {
        // Try to get user directly by ID first
        const response = await apiRequest("GET", `/api/users/${staffId}`);
        if (response.ok) {
          return await response.json();
        }
      } catch (directError) {
        console.log("Direct user fetch failed, trying users list:", directError);
      }
      
      // Fallback to searching in users list
      try {
        const response = await apiRequest("GET", "/api/users");
        const data = await response.json();
        const foundUser = data.find((user: StaffMember) => 
          user.id.toString() === staffId || user.id === parseInt(staffId || '0', 10)
        );
        return foundUser;
      } catch (listError) {
        console.error("Failed to fetch users list:", listError);
        throw listError;
      }
    },
    enabled: !!staffId,
    retry: false
  });

  if (isLoading) {
    return (
      <div className="w-full min-h-0 flex flex-col page-zoom-90 dark:bg-[#121212]">
        <Header title="Staff Profile" subtitle="Loading staff member details..." />
        <div className="flex-1 overflow-auto p-3 sm:p-4 dark:bg-[#121212]">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-4"></div>
            <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded mb-6"></div>
            <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full min-h-0 flex flex-col page-zoom-90 dark:bg-[#121212]">
        <Header title="Staff Profile" subtitle="Error loading staff member" />
        <div className="flex-1 overflow-auto p-3 sm:p-4 dark:bg-[#121212]">
          <Card className="dark:bg-card dark:border-border dark:hover:bg-[#242424] transition-colors">
            <CardContent className="pt-6">
              <div className="text-center">
                <User className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500" />
                <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-100">Error loading staff member</h3>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  {error?.message || "An error occurred while loading the staff member."}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!staffMember) {
    return (
      <div className="w-full min-h-0 flex flex-col page-zoom-90 dark:bg-[#121212]">
        <Header title="Staff Profile" subtitle="Staff member not found" />
        <div className="flex-1 overflow-auto p-3 sm:p-4 dark:bg-[#121212]">
          <Card className="dark:bg-card dark:border-border dark:hover:bg-[#242424] transition-colors">
            <CardContent className="pt-6">
              <div className="text-center">
                <User className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-100">Staff member not found</h3>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  The requested staff member could not be found.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full min-h-0 flex flex-col page-zoom-90 dark:bg-[#121212]">
      <Header 
        title={`${staffMember.firstName} ${staffMember.lastName}`} 
        subtitle="Staff Profile & Information" 
      />
      
      <div className="flex-1 overflow-auto p-3 sm:p-4 dark:bg-[#121212]">
        <div className="grid gap-4 lg:grid-cols-3">
          {/* Profile Overview */}
          <div className="lg:col-span-1">
            <Card className="dark:bg-card dark:border-border dark:hover:bg-[#242424] transition-colors">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-gray-100">
                  <User className="h-5 w-5 text-gray-900 dark:text-gray-100" />
                  Profile Overview
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center">
                  <Avatar className="mx-auto h-24 w-24 mb-4 ring-2 ring-gray-200 dark:ring-slate-600 bg-gray-100 dark:bg-slate-700">
                    {(() => {
                      const src = getStaffProfilePictureUrl(staffMember as any);
                      return src ? (
                        <AvatarImage
                          src={src}
                          alt={`${staffMember.firstName} ${staffMember.lastName}`.trim() || "Profile"}
                          className="object-cover"
                        />
                      ) : null;
                    })()}
                    <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white text-lg font-semibold dark:from-blue-600 dark:to-purple-700">
                      {getInitials(staffMember.firstName, staffMember.lastName)}
                    </AvatarFallback>
                  </Avatar>
                  
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                    {staffMember.firstName} {staffMember.lastName}
                  </h2>
                  
                  <div className="flex justify-center gap-2 mt-2">
                    <Badge className={`${roleColors[staffMember.role] || "bg-gray-100 text-gray-800"} dark:bg-slate-600 dark:text-slate-100`}>
                      {staffMember.role.charAt(0).toUpperCase() + staffMember.role.slice(1)}
                    </Badge>
                  </div>

                  {staffMember.department && (
                    <div className="mt-3">
                      <Badge 
                        variant="outline" 
                        className={`${departmentColors[staffMember.department as keyof typeof departmentColors] || "bg-gray-100 text-gray-800"} dark:bg-slate-600 dark:text-slate-100 dark:border-slate-500`}
                      >
                        <MapPin className="h-3 w-3 mr-1" />
                        {staffMember.department}
                      </Badge>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Contact Information & Details */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="dark:bg-card dark:border-border dark:hover:bg-[#242424] transition-colors">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-gray-100">
                  <Mail className="h-5 w-5" />
                  Contact Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                  <Mail className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Email</p>
                    <p className="text-sm text-gray-600 dark:text-gray-300">{staffMember.email}</p>
                  </div>
                </div>
                
                {staffMember.phone && (
                  <div className="flex items-center gap-3">
                    <Phone className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Phone</p>
                      <p className="text-sm text-gray-600 dark:text-gray-300">{staffMember.phone}</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="dark:bg-card dark:border-border dark:hover:bg-[#242424] transition-colors">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-gray-100">
                  <Building className="h-5 w-5" />
                  Professional Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Role</p>
                    <p className="text-sm text-gray-600 dark:text-gray-300 capitalize">{staffMember.role}</p>
                  </div>
                  
                  {staffMember.department && (
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Department</p>
                      <p className="text-sm text-gray-600 dark:text-gray-300">{staffMember.department}</p>
                    </div>
                  )}
                  
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Staff ID</p>
                    <p className="text-sm text-gray-600 dark:text-gray-300">ID-{staffMember.id}</p>
                  </div>
                  
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Status</p>
                    <Badge className="bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300">Active</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Medical Practice - Show for doctors and nurses */}
            {(isDoctorLike(staffMember.role) || staffMember.role === 'nurse') && (
              <Card className="dark:bg-card dark:border-border dark:hover:bg-[#242424] transition-colors">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-gray-100">
                    <Stethoscope className="h-5 w-5" />
                    Medical Practice
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    {staffMember.medicalSpecialtyCategory && (
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Specialization</p>
                        <p className="text-sm text-gray-600 dark:text-gray-300">{staffMember.medicalSpecialtyCategory}</p>
                      </div>
                    )}
                    
                    {staffMember.subSpecialty && (
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Sub-Specialization</p>
                        <p className="text-sm text-gray-600 dark:text-gray-300">{staffMember.subSpecialty}</p>
                      </div>
                    )}
                    
                    {!staffMember.medicalSpecialtyCategory && staffMember.department && (
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Department</p>
                        <p className="text-sm text-gray-600 dark:text-gray-300">{staffMember.department}</p>
                      </div>
                    )}
                    
                    {staffMember.workingDays && Array.isArray(staffMember.workingDays) && staffMember.workingDays.length > 0 && (
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Working Days</p>
                        <p className="text-sm text-gray-600 dark:text-gray-300">{staffMember.workingDays.join(', ')}</p>
                      </div>
                    )}
                  </div>
                  
                  {staffMember.workingHours && typeof staffMember.workingHours === 'object' && (
                    <div className="grid grid-cols-2 gap-4">
                      {staffMember.workingHours.start && (
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Working Hours Start</p>
                          <p className="text-sm text-gray-600 dark:text-gray-300">{staffMember.workingHours.start}</p>
                        </div>
                      )}
                      {staffMember.workingHours.end && (
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Working Hours End</p>
                          <p className="text-sm text-gray-600 dark:text-gray-300">{staffMember.workingHours.end}</p>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}