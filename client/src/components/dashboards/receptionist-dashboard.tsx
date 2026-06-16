import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { Users, Calendar, Phone, CreditCard, Clock, UserPlus } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { useCurrency } from "@/hooks/use-currency";

export function ReceptionistDashboard() {
  const { currencySymbol } = useCurrency();
  const { data: stats, isLoading } = useQuery({
    queryKey: ["/api/dashboard/stats"],
  });

  const receptionistCards = [
    {
      title: "Today's Appointments",
      value: stats?.todayAppointments || "0",
      description: "Scheduled for today",
      icon: Calendar,
      href: "/appointments",
      color: "bg-blue-100 text-blue-800"
    },
    {
      title: "New Patients",
      value: isLoading ? "--" : "0",
      description: "This week",
      icon: UserPlus,
      href: "/patients",
      color: "bg-green-100 text-green-800"
    },
    {
      title: "Pending Payments",
      value: isLoading ? "--" : `${currencySymbol}0`,
      description: "Outstanding balance",
      icon: CreditCard,
      href: "/billing",
      color: "bg-orange-100 text-orange-800"
    },
    {
      title: "Wait Time",
      value: isLoading ? "--" : "0 min",
      description: "Average today",
      icon: Clock,
      href: "/appointments",
      color: "bg-purple-100 text-purple-800"
    }
  ];

  const quickActions = [
    { title: "Book Appointment", description: "Schedule new patient visit", icon: Calendar, href: "/appointments" },
    { title: "Register Patient", description: "Add new patient record", icon: UserPlus, href: "/patients" },
    { title: "Process Payment", description: "Handle billing and payments", icon: CreditCard, href: "/billing" },
    { title: "Send Messages", description: "Communicate with patients", icon: Phone, href: "/messaging" }
  ];

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 bg-gray-200 rounded animate-pulse"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Reception Dashboard</h1>
        <p className="text-neutral-600">
          Patient scheduling and front desk operations
        </p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {receptionistCards.map((card) => (
          <Link key={card.title} href={card.href}>
            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
                <div className={`p-2 rounded-full ${card.color}`}>
                  <card.icon className="h-4 w-4" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{card.value}</div>
                <p className="text-xs text-neutral-500">{card.description}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {quickActions.map((action) => (
            <Card key={action.title} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-center space-x-3">
                  <action.icon className="h-8 w-8 text-primary" />
                  <div>
                    <CardTitle className="text-base">{action.title}</CardTitle>
                    <CardDescription className="text-sm">{action.description}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <Link href={action.href}>
                  <Button className="w-full" variant="outline">Access</Button>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Today's Schedule */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Upcoming Appointments</CardTitle>
            <CardDescription>Next few scheduled visits</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <p className="font-medium">Sarah Johnson</p>
                  <p className="text-sm text-neutral-600">Cardiology Consultation</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium">10:00 AM</p>
                  <p className="text-xs text-neutral-500">Dr. Smith</p>
                </div>
              </div>
              
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <p className="font-medium">Robert Davis</p>
                  <p className="text-sm text-neutral-600">Follow-up</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium">11:30 AM</p>
                  <p className="text-xs text-neutral-500">Dr. Johnson</p>
                </div>
              </div>
              
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <p className="font-medium">Emily Watson</p>
                  <p className="text-sm text-neutral-600">Routine Check-up</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium">2:00 PM</p>
                  <p className="text-xs text-neutral-500">Dr. Smith</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Waiting Room</CardTitle>
            <CardDescription>Current patient status</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 border rounded-lg border-green-200 bg-green-50">
                <div>
                  <p className="font-medium">Patient Check-in</p>
                  <p className="text-sm text-neutral-600">Sarah Johnson arrived</p>
                </div>
                <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">On Time</span>
              </div>
              
              <div className="flex items-center justify-between p-3 border rounded-lg border-yellow-200 bg-yellow-50">
                <div>
                  <p className="font-medium">Waiting</p>
                  <p className="text-sm text-neutral-600">Robert Davis (5 min)</p>
                </div>
                <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">Waiting</span>
              </div>
              
              <div className="text-center py-4 text-neutral-500">
                <p className="text-sm">2 patients checked in today</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}