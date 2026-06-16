import { useState } from 'react';
import { Route, Switch, useLocation } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useQuery } from '@tanstack/react-query';
import { saasApiRequest } from '@/lib/saasQueryClient';
import { useCurrency } from '@/hooks/use-currency';
import { 
  Users, 
  Building2, 
  CreditCard, 
  Package, 
  Settings, 
  LogOut,
  Shield,
  Activity,
  TrendingUp,
  AlertTriangle,
  CheckCircle
} from 'lucide-react';
import SaaSUsers from './components/SaaSUsers';

const curaLogoPath = "/cura-logo-chatbot.png";
import SaaSCustomers from './components/SaaSCustomers';
import SaaSBilling from './components/SaaSBilling';
import SaaSPackages from './components/SaaSPackages';
import SaaSSettings from './components/SaaSSettings';
import CreateUser from './CreateUser';

interface SaaSDashboardProps {
  onLogout: () => void;
}

export default function SaaSDashboard({ onLogout }: SaaSDashboardProps) {
  const { currencySymbol } = useCurrency();
  const [activeTab, setActiveTab] = useState('overview');
  const [activityPage, setActivityPage] = useState(1);
  const [activityLimit] = useState(5);

  // Fetch dashboard stats
  const { data: stats, isLoading } = useQuery({
    queryKey: ['/api/saas/stats'],
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: true,
  }) as { data: any, isLoading: boolean };

  // Fetch recent activity
  const { data: activityData } = useQuery({
    queryKey: ['/api/saas/activity', activityPage, activityLimit],
    queryFn: async () => {
      const response = await saasApiRequest('GET', `/api/saas/activity?page=${activityPage}&limit=${activityLimit}`);
      return response.json();
    },
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: true,
  }) as { data: any };

  // Fetch system alerts
  const { data: systemAlerts } = useQuery({
    queryKey: ['/api/saas/alerts'],
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: true,
  }) as { data: any[] };

  const handleLogout = () => {
    localStorage.removeItem('saasToken');
    onLogout();
  };

  const StatCard = ({ title, value, icon: Icon, breakdown }: any) => (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{title}</p>
            <p className="text-3xl font-bold text-gray-900 dark:text-white">{value}</p>
            {breakdown && title === "Total Customers" && (
              <div className="mt-2 space-y-1">
                {Object.entries(breakdown).map(([status, data]: [string, any]) => (
                  <div key={status} className="flex items-center justify-between text-xs">
                    <span className="capitalize text-gray-600 dark:text-gray-400">{status}:</span>
                    <span className="text-gray-900 dark:text-white">{data.count} ({data.percentage}%)</span>
                  </div>
                ))}
              </div>
            )}
          </div>
          <Icon className="h-8 w-8 text-blue-600" />
        </div>
      </CardContent>
    </Card>
  );

  return (
    <Switch>
      {/* Create User Page Route */}
      <Route path="/saas/users/create">
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
          {/* Header */}
          <div className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700 w-full">
            <div className="w-full px-[200px]">
              <div className="flex justify-between items-center h-16">
                <div className="flex items-center space-x-4">
                  <img 
                    src={curaLogoPath} 
                    alt="Cura Software Limited" 
                    className="h-10 w-auto"
                  />
                  <div className="flex items-center space-x-2">
                    <Shield className="h-5 w-5 text-red-600" />
                    <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                      SaaS Administration Portal
                    </h1>
                  </div>
                  <Badge variant="destructive" className="text-xs">
                    OWNER ONLY
                  </Badge>
                </div>
                
                <Button 
                  onClick={handleLogout}
                  variant="outline"
                  size="sm"
                  className="flex items-center space-x-2"
                >
                  <LogOut className="h-4 w-4" />
                  <span>Logout</span>
                </Button>
              </div>
            </div>
          </div>
          <CreateUser />
        </div>
      </Route>

      {/* Main Dashboard Route (default) */}
      <Route>
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
          {/* Header */}
          <div className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700 w-full">
            <div className="w-full px-[200px]">
              <div className="flex justify-between items-center h-16">
                <div className="flex items-center space-x-4">
                  <img 
                    src={curaLogoPath} 
                    alt="Cura Software Limited" 
                    className="h-10 w-auto"
                  />
                  <div className="flex items-center space-x-2">
                    <Shield className="h-5 w-5 text-red-600" />
                    <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                      SaaS Administration Portal
                    </h1>
                  </div>
                  <Badge variant="destructive" className="text-xs">
                    OWNER ONLY
                  </Badge>
                </div>
                
                <Button 
                  onClick={handleLogout}
                  variant="outline"
                  size="sm"
                  className="flex items-center space-x-2"
                >
                  <LogOut className="h-4 w-4" />
                  <span>Logout</span>
                </Button>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="w-full px-[200px] py-8">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6 w-full">
              <TabsList className="grid w-full grid-cols-5 gap-4">
                <TabsTrigger value="overview" className="flex items-center justify-center space-x-2 px-6 py-2.5 min-w-[140px]">
                  <Activity className="h-4 w-4" />
                  <span>Overview</span>
                </TabsTrigger>
                <TabsTrigger value="customers" className="flex items-center justify-center space-x-2 px-6 py-2.5 min-w-[140px]">
                  <Building2 className="h-4 w-4" />
                  <span>Organizations</span>
                </TabsTrigger>
                <TabsTrigger value="billing" className="flex items-center justify-center space-x-2 px-6 py-2.5 min-w-[140px]">
                  <CreditCard className="h-4 w-4" />
                  <span>Billing</span>
                </TabsTrigger>
                <TabsTrigger value="packages" className="flex items-center justify-center space-x-2 px-6 py-2.5 min-w-[140px]">
                  <Package className="h-4 w-4" />
                  <span>Packages</span>
                </TabsTrigger>
                <TabsTrigger value="settings" className="flex items-center justify-center space-x-2 px-6 py-2.5 min-w-[140px]">
                  <Settings className="h-4 w-4" />
                  <span>Settings</span>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <StatCard
                    title="Total Organizations"
                    value={stats?.totalCustomers || 0}
                    icon={Building2}
                    trend={false}
                    breakdown={stats?.customerStatusBreakdown}
                  />
                  <StatCard
                    title="Active Users"
                    value={stats?.activeUsers || 0}
                    icon={Users}
                    trend={false}
                  />
                  <StatCard
                    title="Monthly Revenue"
                    value={`${currencySymbol}${stats?.monthlyRevenue || 0}`}
                    icon={CreditCard}
                    trend={false}
                  />
                  <StatCard
                    title="Active Packages"
                    value={stats?.activePackages || 0}
                    icon={Package}
                    trend={false}
                  />
                </div>

                {/* Recent Activity and Alerts */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Recent Activity */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center space-x-2">
                        <Activity className="h-5 w-5 text-blue-600" />
                        <span>Recent Activity</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {!activityData?.activities || activityData.activities.length === 0 ? (
                          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                            No recent activity
                          </div>
                        ) : (
                          <>
                            {activityData.activities.map((activity: any) => (
                              <div key={activity.id} className="flex items-center space-x-3 p-3 border border-gray-200 dark:border-gray-700 rounded-lg">
                                <div className="flex-shrink-0">
                                  {activity.icon === 'building' ? (
                                    <Building2 className="h-5 w-5 text-blue-600" />
                                  ) : activity.icon === 'user' ? (
                                    <Users className="h-5 w-5 text-purple-600" />
                                  ) : (
                                    <CreditCard className="h-5 w-5 text-green-600" />
                                  )}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                                    {activity.title}
                                  </p>
                                  <p className="text-sm text-gray-500 dark:text-gray-400">
                                    {activity.description}
                                  </p>
                                  <p className="text-xs text-gray-400 dark:text-gray-500">
                                    {new Date(activity.timestamp).toLocaleDateString()} {new Date(activity.timestamp).toLocaleTimeString()}
                                  </p>
                                </div>
                              </div>
                            ))}
                            
                            {/* Pagination Controls */}
                            {activityData.totalPages > 1 && (
                              <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
                                <div className="text-sm text-gray-500 dark:text-gray-400">
                                  Showing {((activityPage - 1) * activityLimit) + 1} to {Math.min(activityPage * activityLimit, activityData.total)} of {activityData.total} activities
                                </div>
                                <div className="flex items-center space-x-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setActivityPage(prev => Math.max(prev - 1, 1))}
                                    disabled={activityPage === 1}
                                  >
                                    Previous
                                  </Button>
                                  <span className="text-sm text-gray-600 dark:text-gray-400">
                                    Page {activityPage} of {activityData.totalPages}
                                  </span>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setActivityPage(prev => Math.min(prev + 1, activityData.totalPages))}
                                    disabled={activityPage === activityData.totalPages}
                                  >
                                    Next
                                  </Button>
                                </div>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  {/* System Alerts */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center space-x-2">
                        <AlertTriangle className="h-5 w-5 text-orange-600" />
                        <span>System Alerts</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {!systemAlerts || systemAlerts.length === 0 ? (
                          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                            <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-500" />
                            All systems operational
                          </div>
                        ) : (
                          systemAlerts.map((alert: any) => (
                            <div key={alert.id} className={`p-3 border rounded-lg ${
                              alert.type === 'error' ? 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800' :
                              alert.type === 'warning' ? 'bg-orange-50 border-orange-200 dark:bg-orange-900/20 dark:border-orange-800' :
                              'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800'
                            }`}>
                              <div className="flex items-start space-x-3">
                                <div className="flex-shrink-0">
                                  <AlertTriangle className={`h-5 w-5 ${
                                    alert.type === 'error' ? 'text-red-600' :
                                    alert.type === 'warning' ? 'text-orange-600' :
                                    'text-blue-600'
                                  }`} />
                                </div>
                                <div className="flex-1">
                                  <p className={`text-sm font-medium ${
                                    alert.type === 'error' ? 'text-red-900 dark:text-red-100' :
                                    alert.type === 'warning' ? 'text-orange-900 dark:text-orange-100' :
                                    'text-blue-900 dark:text-blue-100'
                                  }`}>
                                    {alert.title}
                                  </p>
                                  <p className={`text-sm ${
                                    alert.type === 'error' ? 'text-red-700 dark:text-red-200' :
                                    alert.type === 'warning' ? 'text-orange-700 dark:text-orange-200' :
                                    'text-blue-700 dark:text-blue-200'
                                  }`}>
                                    {alert.description}
                                  </p>
                                  {alert.actionRequired && (
                                    <Badge variant="outline" className="mt-2 text-xs">
                                      Action Required
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="customers">
                <SaaSCustomers />
              </TabsContent>

              <TabsContent value="billing">
                <SaaSBilling />
              </TabsContent>

              <TabsContent value="packages">
                <SaaSPackages />
              </TabsContent>

              <TabsContent value="settings">
                <SaaSSettings />
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </Route>
    </Switch>
  );
}