import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { 
  Plus,
  Edit,
  Trash2,
  Calendar,
  Clock,
  MessageSquare,
  Activity,
  CheckCircle,
  TrendingUp,
  Settings,
  Filter,
  ArrowLeft
} from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

function getTenantSubdomain(): string {
  return localStorage.getItem('user_subdomain') || 'demo';
}

interface AutomationRule {
  id: string;
  name: string;
  description: string;
  trigger: {
    type: string;
    conditions: Array<{
      field: string;
      operator: string;
      value: string;
    }>;
    timeDelay?: {
      value: number;
      unit: string;
    };
  };
  actions: Array<{
    type: string;
    config: {
      template?: string;
      recipient?: string;
      subject?: string;
      message?: string;
      priority?: string;
      assignTo?: string;
      dueDate?: string;
    };
  }>;
  status: string;
  category: string;
  createdAt: string;
  updatedAt: string;
  lastTriggered?: string;
  triggerCount: number;
  successRate: number;
}

interface AutomationStats {
  totalRules: number;
  activeRules: number;
  totalTriggers: number;
  successfulExecutions: number;
  failedExecutions: number;
  averageResponseTime: number;
  topPerformingRules: Array<{
    id: string;
    name: string;
    triggerCount: number;
    successRate: number;
  }>;
  recentActivity: Array<{
    id: string;
    ruleName: string;
    trigger: string;
    action: string;
    status: string;
    timestamp: string;
    details?: string;
  }>;
}

export default function AutomationPage() {
  const [, setLocation] = useLocation();
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const { toast } = useToast();

  const { data: automationRules = [], isLoading: rulesLoading } = useQuery({
    queryKey: ['/api/automation/rules'],
    queryFn: async () => {
      const token = localStorage.getItem('auth_token');
      const response = await fetch('/api/automation/rules', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-Tenant-Subdomain': getTenantSubdomain()
        }
      });
      if (!response.ok) {
        throw new Error('Failed to fetch automation rules');
      }
      return response.json();
    }
  });

  const { data: automationStats, isLoading: statsLoading } = useQuery({
    queryKey: ['/api/automation/stats'],
    queryFn: async () => {
      const token = localStorage.getItem('auth_token');
      const response = await fetch('/api/automation/stats', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-Tenant-Subdomain': getTenantSubdomain()
        }
      });
      if (!response.ok) {
        throw new Error('Failed to fetch automation stats');
      }
      return response.json();
    }
  });

  // Type-safe data access
  const rules = automationRules as AutomationRule[];
  const stats = automationStats as AutomationStats || {
    totalRules: 0,
    activeRules: 0,
    totalTriggers: 0,
    successfulExecutions: 0,
    failedExecutions: 0,
    averageResponseTime: 0,
    topPerformingRules: [],
    recentActivity: []
  };

  const toggleRuleMutation = useMutation({
    mutationFn: async (ruleId: string) => {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`/api/automation/rules/${ruleId}/toggle`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-Tenant-Subdomain': getTenantSubdomain()
        }
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/automation/rules"] });
      toast({
        title: "Rule Updated",
        description: "Automation rule status has been updated.",
      });
    }
  });

  const filteredRules = rules.filter((rule: AutomationRule) => {
    const matchesStatus = statusFilter === "all" || rule.status === statusFilter;
    const matchesCategory = categoryFilter === "all" || rule.category === categoryFilter;
    return matchesStatus && matchesCategory;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300">Active</Badge>;
      case 'paused':
        return <Badge variant="secondary">Paused</Badge>;
      case 'draft':
        return <Badge variant="outline">Draft</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'appointment':
        return <Calendar className="h-4 w-4" />;
      case 'communication':
        return <MessageSquare className="h-4 w-4" />;
      case 'clinical':
        return <Activity className="h-4 w-4" />;
      case 'administrative':
        return <Settings className="h-4 w-4" />;
      case 'billing':
        return <TrendingUp className="h-4 w-4" />;
      default:
        return <Settings className="h-4 w-4" />;
    }
  };

  if (rulesLoading || statsLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto p-4 page-zoom-90">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLocation("/")}
            className="flex items-center space-x-2"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back</span>
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Automation</h1>
            <p className="text-gray-600 dark:text-gray-300 mt-1">Streamline workflows with intelligent automation</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <Dialog open={isFilterOpen} onOpenChange={setIsFilterOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Filter className="h-4 w-4 mr-2" />
                Filter
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Filter Automation Rules</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="paused">Paused</SelectItem>
                      <SelectItem value="draft">Draft</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      <SelectItem value="appointment">Appointment</SelectItem>
                      <SelectItem value="communication">Communication</SelectItem>
                      <SelectItem value="clinical">Clinical</SelectItem>
                      <SelectItem value="administrative">Administrative</SelectItem>
                      <SelectItem value="billing">Billing</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="flex justify-end gap-2 mt-6">
                  <Button variant="outline" onClick={() => setIsFilterOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={() => setIsFilterOpen(false)}>
                    Apply Filters
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Create Rule
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Create Automation Rule</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Rule Name</label>
                  <Input placeholder="Enter rule name" />
                </div>
                <div>
                  <label className="text-sm font-medium">Description</label>
                  <Input placeholder="Describe what this rule does" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Trigger</label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Select trigger" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="appointment_scheduled">Appointment Scheduled</SelectItem>
                        <SelectItem value="appointment_completed">Appointment Completed</SelectItem>
                        <SelectItem value="lab_result_ready">Lab Result Ready</SelectItem>
                        <SelectItem value="patient_registered">Patient Registered</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Category</label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="appointment">Appointment</SelectItem>
                        <SelectItem value="communication">Communication</SelectItem>
                        <SelectItem value="clinical">Clinical</SelectItem>
                        <SelectItem value="administrative">Administrative</SelectItem>
                        <SelectItem value="billing">Billing</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={() => setIsCreateDialogOpen(false)}>
                    Create Rule
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Total Rules</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{stats.totalRules}</p>
              </div>
              <Settings className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Active Rules</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{stats.activeRules}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Success Rate</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {stats.totalTriggers > 0 ? Math.round((stats.successfulExecutions / stats.totalTriggers) * 100) : 0}%
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Avg Response</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{stats.averageResponseTime}s</p>
              </div>
              <Clock className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="rules" className="w-full">
        <TabsList>
          <TabsTrigger value="rules">Automation Rules</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="activity">Recent Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="rules" className="space-y-6">
          {/* Filters */}
          <div className="flex items-center gap-4">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="paused">Paused</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
              </SelectContent>
            </Select>

            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="appointment">Appointment</SelectItem>
                <SelectItem value="communication">Communication</SelectItem>
                <SelectItem value="clinical">Clinical</SelectItem>
                <SelectItem value="administrative">Administrative</SelectItem>
                <SelectItem value="billing">Billing</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Rules List */}
          <div className="space-y-4">
            {filteredRules.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <div className="text-gray-500 dark:text-gray-400">
                    <Settings className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <h3 className="text-lg font-medium mb-2 text-gray-900 dark:text-gray-100">No automation rules found</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-300">Create your first automation rule to streamline your workflows.</p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              filteredRules.map((rule: AutomationRule) => (
                <Card key={rule.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                          {getCategoryIcon(rule.category)}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="font-semibold text-lg text-gray-900 dark:text-gray-100">{rule.name}</h3>
                            {getStatusBadge(rule.status)}
                            <Badge variant="outline" className="text-xs">
                              {rule.category}
                            </Badge>
                          </div>
                          <p className="text-gray-600 dark:text-gray-300 mb-3">{rule.description}</p>
                          
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div>
                              <span className="text-gray-500 dark:text-gray-400">Triggered:</span>
                              <span className="ml-2 font-medium text-gray-900 dark:text-gray-100">{rule.triggerCount} times</span>
                            </div>
                            <div>
                              <span className="text-gray-500 dark:text-gray-400">Success Rate:</span>
                              <span className="ml-2 font-medium text-gray-900 dark:text-gray-100">{rule.successRate}%</span>
                            </div>
                            <div>
                              <span className="text-gray-500 dark:text-gray-400">Last Run:</span>
                              <span className="ml-2 font-medium text-gray-900 dark:text-gray-100">
                                {rule.lastTriggered ? format(new Date(rule.lastTriggered), 'MMM d, HH:mm') : 'Never'}
                              </span>
                            </div>
                            <div>
                              <span className="text-gray-500 dark:text-gray-400">Actions:</span>
                              <span className="ml-2 font-medium text-gray-900 dark:text-gray-100">{rule.actions.length}</span>
                            </div>
                          </div>

                          {rule.actions.length > 0 && (
                            <div className="mt-4">
                              <div className="text-sm text-gray-600 dark:text-gray-300 mb-2">Actions:</div>
                              <div className="flex flex-wrap gap-2">
                                {rule.actions.map((action: any, index: number) => (
                                  <Badge key={index} variant="secondary" className="text-xs">
                                    {action.type.replace('_', ' ')}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={rule.status === 'active'}
                          onCheckedChange={() => toggleRuleMutation.mutate(rule.id)}
                          disabled={toggleRuleMutation.isPending}
                        />
                        <Button variant="outline" size="sm">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="sm">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="performance" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Performance Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center text-gray-500 dark:text-gray-400 py-8">
                Performance analytics will be displayed here once automation rules are created and executed.
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activity" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {stats.recentActivity.length === 0 ? (
                  <div className="text-center text-gray-500 dark:text-gray-400 py-8">
                    No recent automation activity found.
                  </div>
                ) : (
                  stats.recentActivity.map((activity: any) => (
                    <div key={activity.id} className="flex items-center gap-4 p-4 border rounded-lg">
                      <div className={`w-3 h-3 rounded-full ${
                        activity.status === 'success' ? 'bg-green-500' : 
                        activity.status === 'failed' ? 'bg-red-500' : 'bg-yellow-500'
                      }`}></div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-gray-900 dark:text-gray-100">{activity.ruleName}</span>
                          <Badge variant="outline" className="text-xs">
                            {activity.trigger}
                          </Badge>
                          <Badge variant="secondary" className="text-xs">
                            {activity.action}
                          </Badge>
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-300">
                          {activity.details}
                        </div>
                      </div>
                      <div className="text-right text-sm text-gray-500 dark:text-gray-400">
                        {format(new Date(activity.timestamp), 'MMM d, HH:mm')}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}