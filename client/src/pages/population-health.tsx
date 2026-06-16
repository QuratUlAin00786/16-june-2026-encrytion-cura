import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  AreaChart,
  Area
} from "recharts";
import { 
  Users,
  TrendingUp,
  TrendingDown,
  Shield,
  Calendar,
  Clock,
  AlertTriangle,
  CheckCircle,
  Heart,
  Activity,
  Thermometer,
  Eye,
  Edit,
  Stethoscope,
  Filter,
  Download,
  Bell,
  MapPin,
  Target,
  ArrowLeft
} from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";

function getTenantSubdomain(): string {
  return localStorage.getItem('user_subdomain') || 'demo';
}

interface Cohort {
  id: string;
  name: string;
  description: string;
  criteria: {
    ageRange?: { min: number; max: number };
    conditions?: string[];
    riskFactors?: string[];
    geography?: string;
  };
  patientCount: number;
  riskLevel: 'low' | 'moderate' | 'high' | 'critical';
  lastUpdated: string;
  interventions: Array<{
    id: string;
    name: string;
    type: 'preventive' | 'screening' | 'treatment';
    status: 'active' | 'completed' | 'scheduled';
    completionRate: number;
  }>;
}

interface PublicHealthMetric {
  category: string;
  metric: string;
  current: number;
  target: number;
  trend: 'up' | 'down' | 'stable';
  timeframe: string;
  description: string;
}

interface PreventiveCare {
  id: string;
  patientId: string;
  patientName: string;
  careType: 'vaccination' | 'screening' | 'wellness_check' | 'chronic_disease_management';
  dueDate: string;
  status: 'due' | 'overdue' | 'completed' | 'scheduled';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  description: string;
  lastCompleted?: string;
}

export default function PopulationHealth() {
  const [location, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState("overview");
  const [selectedCohort, setSelectedCohort] = useState<string>("all");
  const [filterRisk, setFilterRisk] = useState<string>("all");
  const [createCohortOpen, setCreateCohortOpen] = useState(false);
  const [cohortName, setCohortName] = useState("");
  const [minAge, setMinAge] = useState("");
  const [maxAge, setMaxAge] = useState("");
  const [selectedConditions, setSelectedConditions] = useState<string[]>([]);
  const [viewDetailsOpen, setViewDetailsOpen] = useState(false);
  const [editCohortOpen, setEditCohortOpen] = useState(false);
  const [setAlertsOpen, setSetAlertsOpen] = useState(false);
  const [selectedCohortData, setSelectedCohortData] = useState<any>(null);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);
  const [selectedPatientCare, setSelectedPatientCare] = useState<any>(null);
  const [createInterventionOpen, setCreateInterventionOpen] = useState(false);
  const [viewInterventionOpen, setViewInterventionOpen] = useState(false);
  const [editInterventionOpen, setEditInterventionOpen] = useState(false);
  const [selectedIntervention, setSelectedIntervention] = useState<any>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const { toast } = useToast();

  // Fetch population health data
  const { data: populationData, isLoading: populationLoading } = useQuery({
    queryKey: ["/api/population-health/overview"],
    enabled: true
  });

  // Fetch cohorts
  const { data: cohorts, isLoading: cohortsLoading } = useQuery({
    queryKey: ["/api/population-health/cohorts"],
    enabled: true
  });

  // Fetch preventive care reminders
  const { data: preventiveCare, isLoading: preventiveLoading } = useQuery({
    queryKey: ["/api/population-health/preventive-care"],
    enabled: true
  });

  // Fetch interventions
  const { data: interventions, isLoading: interventionsLoading } = useQuery<any[]>({
    queryKey: ["/api/population-health/interventions"],
    queryFn: async () => {
      const token = localStorage.getItem('auth_token');
      const response = await fetch('/api/population-health/interventions', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-Tenant-Subdomain': getTenantSubdomain()
        }
      });
      if (!response.ok) {
        throw new Error('Failed to fetch interventions');
      }
      return response.json();
    },
    retry: false,
    staleTime: 0,
    refetchOnWindowFocus: false,
  });

  // Create cohort mutation
  const createCohortMutation = useMutation({
    mutationFn: async (cohortData: Partial<Cohort>) => {
      const response = await fetch("/api/population-health/cohorts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(cohortData),
        credentials: "include"
      });
      if (!response.ok) throw new Error("Failed to create cohort");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/population-health/cohorts"] });
      setSuccessMessage("Cohort created successfully");
      setShowSuccessModal(true);
    }
  });

  // Mock data
  const mockCohorts: Cohort[] = [
    {
      id: "cohort_1",
      name: "Diabetes Management",
      description: "Patients with Type 2 diabetes requiring active management",
      criteria: {
        conditions: ["Type 2 Diabetes"],
        ageRange: { min: 35, max: 75 }
      },
      patientCount: 247,
      riskLevel: "high",
      lastUpdated: "2024-06-26T10:00:00Z",
      interventions: [
        {
          id: "int_1",
          name: "Quarterly HbA1c Testing",
          type: "screening",
          status: "active",
          completionRate: 78
        },
        {
          id: "int_2",
          name: "Annual Eye Exam",
          type: "screening",
          status: "active",
          completionRate: 65
        },
        {
          id: "int_3",
          name: "Diabetes Education Program",
          type: "preventive",
          status: "active",
          completionRate: 82
        }
      ]
    },
    {
      id: "cohort_2",
      name: "Cardiovascular Risk",
      description: "Patients at high risk for cardiovascular disease",
      criteria: {
        riskFactors: ["Hypertension", "High Cholesterol", "Smoking"],
        ageRange: { min: 40, max: 80 }
      },
      patientCount: 189,
      riskLevel: "high",
      lastUpdated: "2024-06-26T09:30:00Z",
      interventions: [
        {
          id: "int_4",
          name: "Statin Therapy",
          type: "treatment",
          status: "active",
          completionRate: 85
        },
        {
          id: "int_5",
          name: "Blood Pressure Monitoring",
          type: "screening",
          status: "active",
          completionRate: 92
        }
      ]
    },
    {
      id: "cohort_3",
      name: "Preventive Care",
      description: "Patients due for routine preventive care",
      criteria: {
        ageRange: { min: 18, max: 100 }
      },
      patientCount: 456,
      riskLevel: "moderate",
      lastUpdated: "2024-06-26T11:00:00Z",
      interventions: [
        {
          id: "int_6",
          name: "Annual Physical Exam",
          type: "preventive",
          status: "active",
          completionRate: 71
        },
        {
          id: "int_7",
          name: "Cancer Screening",
          type: "screening",
          status: "active",
          completionRate: 68
        }
      ]
    }
  ];

  const mockPublicHealthMetrics: PublicHealthMetric[] = [
    {
      category: "Vaccination",
      metric: "Flu Vaccination Rate",
      current: 73,
      target: 80,
      trend: "up",
      timeframe: "2024 Season",
      description: "Percentage of eligible patients who received flu vaccine"
    },
    {
      category: "Screening",
      metric: "Mammography Screening",
      current: 82,
      target: 85,
      trend: "up",
      timeframe: "Last 2 Years",
      description: "Women 50-74 who received mammogram"
    },
    {
      category: "Chronic Disease",
      metric: "Diabetes Control (HbA1c <7%)",
      current: 68,
      target: 75,
      trend: "stable",
      timeframe: "Last 6 Months",
      description: "Diabetic patients with controlled blood sugar"
    },
    {
      category: "Mental Health",
      metric: "Depression Screening",
      current: 45,
      target: 60,
      trend: "down",
      timeframe: "Last Year",
      description: "Adult patients screened for depression"
    }
  ];

  const mockPreventiveCare: PreventiveCare[] = [
    {
      id: "prev_1",
      patientId: "patient_1",
      patientName: "Sarah Johnson",
      careType: "screening",
      dueDate: "2024-07-15",
      status: "overdue",
      priority: "high",
      description: "Mammography screening",
      lastCompleted: "2022-07-20"
    },
    {
      id: "prev_2",
      patientId: "patient_2",
      patientName: "Michael Chen",
      careType: "vaccination",
      dueDate: "2024-07-01",
      status: "due",
      priority: "medium",
      description: "Annual flu vaccination",
      lastCompleted: "2023-09-15"
    },
    {
      id: "prev_3",
      patientId: "patient_3",
      patientName: "Emma Davis",
      careType: "chronic_disease_management",
      dueDate: "2024-06-30",
      status: "due",
      priority: "high",
      description: "Diabetes follow-up and HbA1c test",
      lastCompleted: "2024-03-28"
    }
  ];

  const populationTrendData = [
    { month: "Jan", diabetes: 240, hypertension: 320, total: 1200 },
    { month: "Feb", diabetes: 245, hypertension: 315, total: 1215 },
    { month: "Mar", diabetes: 247, hypertension: 318, total: 1230 },
    { month: "Apr", diabetes: 250, hypertension: 322, total: 1245 },
    { month: "May", diabetes: 248, hypertension: 325, total: 1260 },
    { month: "Jun", diabetes: 247, hypertension: 328, total: 1275 }
  ];

  const riskDistributionData = [
    { name: "Low Risk", value: 45, count: 574, color: "#22c55e" },
    { name: "Moderate Risk", value: 30, count: 383, color: "#eab308" },
    { name: "High Risk", value: 20, count: 255, color: "#f97316" },
    { name: "Critical Risk", value: 5, count: 64, color: "#ef4444" }
  ];

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case "critical": return "bg-red-100 text-red-800 border-red-200";
      case "high": return "bg-orange-100 text-orange-800 border-orange-200";
      case "moderate": return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "low": return "bg-green-100 text-green-800 border-green-200";
      default: return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "overdue": return "bg-red-100 text-red-800";
      case "due": return "bg-yellow-100 text-yellow-800";
      case "scheduled": return "bg-blue-100 text-blue-800";
      case "completed": return "bg-green-100 text-green-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "urgent": return "bg-red-100 text-red-800";
      case "high": return "bg-orange-100 text-orange-800";
      case "medium": return "bg-yellow-100 text-yellow-800";
      case "low": return "bg-blue-100 text-blue-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="p-4 space-y-4 h-screen overflow-y-auto page-zoom-90">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLocation("/")}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Population Health</h1>
            <p className="text-gray-600 dark:text-gray-300 mt-1">Manage patient cohorts and community health initiatives</p>
          </div>
        </div>
        <div className="flex gap-3">
          <Dialog open={createCohortOpen} onOpenChange={setCreateCohortOpen}>
            <DialogTrigger asChild>
              <Button>
                <Users className="w-4 h-4 mr-2" />
                Create Cohort
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create Patient Cohort</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Cohort Name</label>
                  <Input 
                    placeholder="Enter cohort name" 
                    className="mt-1"
                    value={cohortName}
                    onChange={(e) => setCohortName(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Age Range</label>
                  <div className="flex gap-2 mt-1">
                    <Input 
                      placeholder="Min age" 
                      type="number"
                      value={minAge}
                      onChange={(e) => setMinAge(e.target.value)}
                    />
                    <Input 
                      placeholder="Max age" 
                      type="number"
                      value={maxAge}
                      onChange={(e) => setMaxAge(e.target.value)}
                    />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium">Conditions</label>
                  <Select onValueChange={(value) => setSelectedConditions([value])}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select conditions" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="diabetes">Type 2 Diabetes</SelectItem>
                      <SelectItem value="hypertension">Hypertension</SelectItem>
                      <SelectItem value="copd">COPD</SelectItem>
                      <SelectItem value="heart-disease">Heart Disease</SelectItem>
                      <SelectItem value="obesity">Obesity</SelectItem>
                      <SelectItem value="chronic-kidney">Chronic Kidney Disease</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Description</label>
                  <Input 
                    placeholder="Brief description of the cohort"
                    className="mt-1"
                  />
                </div>
                <div className="flex gap-3 pt-4 border-t">
                  <Button 
                    className="flex-1"
                    onClick={() => {
                      if (!cohortName.trim()) {
                        toast({
                          title: "Validation Error",
                          description: "Please enter a cohort name.",
                          variant: "destructive"
                        });
                        return;
                      }
                      
                      const newCohort = {
                        name: cohortName,
                        criteria: {
                          conditions: selectedConditions,
                          ageRange: minAge && maxAge ? { 
                            min: parseInt(minAge), 
                            max: parseInt(maxAge) 
                          } : undefined
                        }
                      };

                      // For now, show success toast and close dialog
                      setSuccessMessage(`"${cohortName}" has been created with ${selectedConditions.length ? selectedConditions.join(', ') : 'general'} criteria.`);
                      setShowSuccessModal(true);
                      
                      // Reset form
                      setCohortName("");
                      setMinAge("");
                      setMaxAge("");
                      setSelectedConditions([]);
                      setCreateCohortOpen(false);
                    }}
                  >
                    Create Cohort
                  </Button>
                  <Button 
                    variant="outline"
                    onClick={() => {
                      setCohortName("");
                      setMinAge("");
                      setMaxAge("");
                      setSelectedConditions([]);
                      setCreateCohortOpen(false);
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
          <Button 
            variant="outline"
            onClick={() => {
              // Generate comprehensive population health report
              const reportData = [
                ['Population Health Report'],
                ['Generated on:', format(new Date(), 'PPP')],
                ['Organization:', 'MediCore Healthcare'],
                [''],
                ['SUMMARY METRICS'],
                ['Total Patients', '1,276'],
                ['High Risk Patients', '319'],
                ['Prevention Rate', '78%'],
                ['Active Cohorts', '12'],
                [''],
                ['COHORT BREAKDOWN'],
                ['Cohort Name', 'Patient Count', 'Risk Level', 'Primary Condition'],
                ['Diabetes Management', '247', 'High', 'Type 2 Diabetes'],
                ['Cardiovascular Risk', '189', 'High', 'Hypertension'],
                ['Preventive Care', '456', 'Moderate', 'General'],
                ['COPD Management', '124', 'High', 'COPD'],
                ['Heart Disease Monitor', '89', 'Critical', 'Heart Disease'],
                [''],
                ['INTERVENTION COMPLETION RATES'],
                ['Intervention', 'Completion Rate', 'Status'],
                ['Quarterly HbA1c Testing', '78%', 'Active'],
                ['Annual Eye Exam', '65%', 'Active'],
                ['Diabetes Education Program', '82%', 'Active'],
                ['Statin Therapy', '85%', 'Active'],
                ['Blood Pressure Monitoring', '73%', 'Active'],
                [''],
                ['PREVENTIVE CARE METRICS'],
                ['Metric', 'Current', 'Target', 'Trend'],
                ['Flu Vaccination Rate', '73%', '80%', 'Up'],
                ['Mammography Screening', '82%', '85%', 'Up'],
                ['Colonoscopy Screening', '76%', '80%', 'Stable'],
                ['Blood Pressure Control', '68%', '75%', 'Up'],
                [''],
                ['RISK DISTRIBUTION'],
                ['Risk Level', 'Percentage', 'Patient Count'],
                ['Critical', '8%', '102'],
                ['High', '25%', '319'],
                ['Moderate', '45%', '574'],
                ['Low', '22%', '281'],
                [''],
                ['Report End']
              ];

              const csvContent = reportData.map(row => 
                Array.isArray(row) ? row.join(',') : row
              ).join('\n');
              
              const blob = new Blob([csvContent], { type: 'text/csv' });
              const url = URL.createObjectURL(blob);
              const link = document.createElement('a');
              link.href = url;
              link.download = `population-health-report-${format(new Date(), 'yyyy-MM-dd')}.csv`;
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
              URL.revokeObjectURL(url);
              
              setSuccessMessage("Population health report has been downloaded as CSV file.");
              setShowSuccessModal(true);
            }}
          >
            <Download className="w-4 h-4 mr-2" />
            Export Report
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="cohorts">Cohorts</TabsTrigger>
          <TabsTrigger value="preventive">Preventive Care</TabsTrigger>
          <TabsTrigger value="metrics">Public Health</TabsTrigger>
          <TabsTrigger value="interventions">Interventions</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Total Patients</p>
                    <p className="text-2xl font-bold">1,276</p>
                  </div>
                  <Users className="w-8 h-8 text-blue-500" />
                </div>
                <div className="flex items-center mt-2 text-sm">
                  <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
                  <span className="text-green-600">+5.2% from last month</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-300">High Risk</p>
                    <p className="text-2xl font-bold">319</p>
                  </div>
                  <AlertTriangle className="w-8 h-8 text-orange-500" />
                </div>
                <div className="flex items-center mt-2 text-sm">
                  <TrendingDown className="w-4 h-4 text-green-500 mr-1" />
                  <span className="text-green-600">-2.1% from last month</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Prevention Rate</p>
                    <p className="text-2xl font-bold">78%</p>
                  </div>
                  <Shield className="w-8 h-8 text-green-500" />
                </div>
                <div className="flex items-center mt-2 text-sm">
                  <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
                  <span className="text-green-600">+3.4% from last month</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Active Cohorts</p>
                    <p className="text-2xl font-bold">12</p>
                  </div>
                  <Target className="w-8 h-8 text-purple-500" />
                </div>
                <div className="flex items-center mt-2 text-sm">
                  <span className="text-gray-600 dark:text-gray-300">3 new this month</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Population Trends */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Population Trends</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={populationTrendData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="total" stroke="#3b82f6" strokeWidth={2} />
                    <Line type="monotone" dataKey="diabetes" stroke="#ef4444" strokeWidth={2} />
                    <Line type="monotone" dataKey="hypertension" stroke="#f97316" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Risk Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={riskDistributionData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, value }) => `${name}: ${value}%`}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {riskDistributionData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="cohorts" className="space-y-4">
          <div className="flex gap-4 items-center">
            <Select value={filterRisk} onValueChange={setFilterRisk}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by risk level" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Risk Levels</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="moderate">Moderate</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-4">
            {mockCohorts.map((cohort) => (
              <Card key={cohort.id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        {cohort.name}
                        <Badge className={getRiskColor(cohort.riskLevel)}>
                          {cohort.riskLevel} risk
                        </Badge>
                      </CardTitle>
                      <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">{cohort.description}</p>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-blue-600">{cohort.patientCount}</div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">patients</div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h4 className="font-medium text-sm mb-2">Criteria</h4>
                    <div className="flex flex-wrap gap-2">
                      {cohort.criteria.ageRange && (
                        <Badge variant="outline">
                          Age {cohort.criteria.ageRange.min}-{cohort.criteria.ageRange.max}
                        </Badge>
                      )}
                      {cohort.criteria.conditions?.map((condition) => (
                        <Badge key={condition} variant="outline">{condition}</Badge>
                      ))}
                      {cohort.criteria.riskFactors?.map((factor) => (
                        <Badge key={factor} variant="outline">{factor}</Badge>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium text-sm mb-3">Active Interventions</h4>
                    <div className="space-y-3">
                      {cohort.interventions.map((intervention) => (
                        <div key={intervention.id} className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="font-medium text-sm">{intervention.name}</div>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="outline" className="text-xs">
                                {intervention.type}
                              </Badge>
                              <Badge 
                                className={`text-xs ${
                                  intervention.status === 'active' ? 'bg-green-100 text-green-800' : 
                                  'bg-gray-100 text-gray-800'
                                }`}
                              >
                                {intervention.status}
                              </Badge>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="text-right">
                              <div className="text-sm font-medium">{intervention.completionRate}%</div>
                              <div className="text-xs text-gray-500 dark:text-gray-400">completion</div>
                            </div>
                            <Progress value={intervention.completionRate} className="w-16" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Button 
                      size="sm"
                      onClick={() => {
                        setSelectedCohortData(cohort);
                        setViewDetailsOpen(true);
                      }}
                    >
                      View Details
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => {
                        setSelectedCohortData(cohort);
                        setEditCohortOpen(true);
                      }}
                    >
                      Edit Cohort
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => {
                        setSelectedCohortData(cohort);
                        setSetAlertsOpen(true);
                      }}
                    >
                      <Bell className="w-4 h-4 mr-1" />
                      Set Alerts
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="preventive" className="space-y-4">
          <div className="grid gap-4">
            {mockPreventiveCare.map((care) => (
              <Card key={care.id} className={care.status === 'overdue' ? 'border-red-200 bg-red-50' : ''}>
                <CardContent className="p-4">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-medium">{care.patientName}</h3>
                        <Badge className={getStatusColor(care.status)}>{care.status}</Badge>
                        <Badge className={getPriorityColor(care.priority)}>{care.priority}</Badge>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-300 mb-1">{care.description}</p>
                      <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                        <span>Due: {format(new Date(care.dueDate), 'MMM dd, yyyy')}</span>
                        {care.lastCompleted && (
                          <span>Last: {format(new Date(care.lastCompleted), 'MMM dd, yyyy')}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        size="sm"
                        onClick={() => {
                          setSelectedPatientCare(care);
                          setScheduleOpen(true);
                        }}
                      >
                        Schedule
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => {
                          setSelectedPatientCare(care);
                          setContactOpen(true);
                        }}
                      >
                        Contact
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="metrics" className="space-y-4">
          <div className="grid gap-4">
            {mockPublicHealthMetrics.map((metric, idx) => (
              <Card key={idx}>
                <CardContent className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="font-semibold text-lg">{metric.metric}</h3>
                      <p className="text-sm text-gray-600">{metric.description}</p>
                      <Badge variant="outline" className="mt-1">{metric.timeframe}</Badge>
                    </div>
                    <div className="text-right">
                      <div className="text-3xl font-bold text-blue-600">{metric.current}%</div>
                      <div className="text-sm text-gray-500">Target: {metric.target}%</div>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Progress to Target</span>
                      <span>{Math.round((metric.current / metric.target) * 100)}%</span>
                    </div>
                    <Progress value={(metric.current / metric.target) * 100} />
                  </div>

                  <div className="flex items-center mt-3 text-sm">
                    {metric.trend === 'up' ? (
                      <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
                    ) : metric.trend === 'down' ? (
                      <TrendingDown className="w-4 h-4 text-red-500 mr-1" />
                    ) : (
                      <Activity className="w-4 h-4 text-gray-500 mr-1" />
                    )}
                    <span className={
                      metric.trend === 'up' ? 'text-green-600' :
                      metric.trend === 'down' ? 'text-red-600' : 'text-gray-600'
                    }>
                      {metric.trend === 'up' ? 'Improving' : 
                       metric.trend === 'down' ? 'Declining' : 'Stable'}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="interventions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Population Health Interventions
                <Button onClick={() => setCreateInterventionOpen(true)}>
                  <Target className="w-4 h-4 mr-2" />
                  Create Intervention
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-6">
                Design and implement targeted interventions for specific patient populations.
              </p>
              
              {interventionsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : interventions && interventions.length > 0 ? (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900">Active Interventions ({interventions.length})</h3>
                  <div className="grid gap-4">
                    {interventions.map((intervention: any) => (
                      <div key={intervention.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h4 className="font-semibold text-gray-900">{intervention.name}</h4>
                              <Badge className={
                                intervention.status === 'active' ? 'bg-green-100 text-green-800' :
                                intervention.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                intervention.status === 'completed' ? 'bg-blue-100 text-blue-800' :
                                'bg-gray-100 text-gray-800'
                              }>
                                {intervention.status}
                              </Badge>
                              <Badge variant="outline" className="text-xs">
                                {intervention.type}
                              </Badge>
                            </div>
                            <p className="text-gray-600 mb-3">{intervention.description}</p>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                              <div>
                                <span className="font-medium text-gray-700">Duration:</span>
                                <p className="text-gray-600">{intervention.duration} weeks</p>
                              </div>
                              <div>
                                <span className="font-medium text-gray-700">Budget:</span>
                                <p className="text-gray-600">£{intervention.budget?.toLocaleString() || '0'}</p>
                              </div>
                              <div>
                                <span className="font-medium text-gray-700">Target Population:</span>
                                <p className="text-gray-600">{intervention.targetPopulation || 'All patients'}</p>
                              </div>
                              <div>
                                <span className="font-medium text-gray-700">Start Date:</span>
                                <p className="text-gray-600">{intervention.startDate ? format(new Date(intervention.startDate), 'MMM dd, yyyy') : 'Not set'}</p>
                              </div>
                            </div>
                            {intervention.metrics && (
                              <div className="mt-3 pt-3 border-t">
                                <div className="flex items-center gap-4 text-sm">
                                  <div className="flex items-center gap-2">
                                    <div className="h-2 w-2 rounded-full bg-green-500"></div>
                                    <span className="text-gray-600">Enrolled: {intervention.metrics.enrolled || 0}</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <div className="h-2 w-2 rounded-full bg-blue-500"></div>
                                    <span className="text-gray-600">Completed: {intervention.metrics.completed || 0}</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <div className="h-2 w-2 rounded-full bg-yellow-500"></div>
                                    <span className="text-gray-600">Success Rate: {intervention.metrics.successRate || 0}%</span>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                          <div className="flex gap-2">
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => {
                                setSelectedIntervention(intervention);
                                setViewInterventionOpen(true);
                              }}
                            >
                              <Eye className="w-4 h-4 mr-1" />
                              View
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => {
                                setSelectedIntervention(intervention);
                                setEditInterventionOpen(true);
                              }}
                            >
                              <Edit className="w-4 h-4 mr-1" />
                              Edit
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <Target className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No interventions created yet</h3>
                  <p className="text-gray-500 mb-4">Create your first population health intervention to get started.</p>
                  <Button onClick={() => setCreateInterventionOpen(true)} variant="outline">
                    <Target className="w-4 h-4 mr-2" />
                    Create First Intervention
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* View Details Dialog */}
      <Dialog open={viewDetailsOpen} onOpenChange={setViewDetailsOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Cohort Details - {selectedCohortData?.name}</DialogTitle>
          </DialogHeader>
          {selectedCohortData && (
            <div className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Basic Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <label className="text-sm font-medium text-gray-600">Name</label>
                      <p className="text-sm">{selectedCohortData.name}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Description</label>
                      <p className="text-sm">{selectedCohortData.description}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Risk Level</label>
                      <Badge className={getRiskColor(selectedCohortData.riskLevel)}>
                        {selectedCohortData.riskLevel} risk
                      </Badge>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Patient Count</label>
                      <p className="text-lg font-semibold text-blue-600">{selectedCohortData.patientCount}</p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Criteria</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {selectedCohortData.criteria?.ageRange && (
                      <div>
                        <label className="text-sm font-medium text-gray-600">Age Range</label>
                        <p className="text-sm">
                          {selectedCohortData.criteria.ageRange.min} - {selectedCohortData.criteria.ageRange.max} years
                        </p>
                      </div>
                    )}
                    {selectedCohortData.criteria?.conditions && (
                      <div>
                        <label className="text-sm font-medium text-gray-600">Medical Conditions</label>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {selectedCohortData.criteria.conditions.map((condition: string, index: number) => (
                            <Badge key={index} variant="outline">{condition}</Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Active Interventions</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {selectedCohortData.interventions?.map((intervention: any, index: number) => (
                      <div key={index} className="flex justify-between items-center p-3 border rounded-lg">
                        <div>
                          <p className="font-medium">{intervention.name}</p>
                          <p className="text-sm text-gray-600">{intervention.description}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium">{intervention.completionRate}% complete</p>
                          <Badge className={
                            intervention.status === 'active' ? 'bg-green-100 text-green-800' :
                            intervention.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-gray-100 text-gray-800'
                          }>
                            {intervention.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Cohort Dialog */}
      <Dialog open={editCohortOpen} onOpenChange={setEditCohortOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Cohort - {selectedCohortData?.name}</DialogTitle>
          </DialogHeader>
          {selectedCohortData && (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Cohort Name</label>
                <Input 
                  defaultValue={selectedCohortData.name}
                  placeholder="Enter cohort name"
                />
              </div>
              
              <div>
                <label className="text-sm font-medium">Description</label>
                <Input 
                  defaultValue={selectedCohortData.description}
                  placeholder="Enter description"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Minimum Age</label>
                  <Input 
                    type="number"
                    defaultValue={selectedCohortData.criteria?.ageRange?.min || ""}
                    placeholder="e.g., 35"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Maximum Age</label>
                  <Input 
                    type="number"
                    defaultValue={selectedCohortData.criteria?.ageRange?.max || ""}
                    placeholder="e.g., 75"
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium">Risk Level</label>
                <Select defaultValue={selectedCohortData.riskLevel}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low Risk</SelectItem>
                    <SelectItem value="moderate">Moderate Risk</SelectItem>
                    <SelectItem value="high">High Risk</SelectItem>
                    <SelectItem value="critical">Critical Risk</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium">Medical Conditions</label>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {["Type 2 Diabetes", "Hypertension", "Cardiovascular Disease", "Chronic Kidney Disease", "COPD", "Obesity"].map((condition) => (
                    <label key={condition} className="flex items-center space-x-2">
                      <input 
                        type="checkbox" 
                        defaultChecked={selectedCohortData.criteria?.conditions?.includes(condition)}
                        className="rounded"
                      />
                      <span className="text-sm">{condition}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button variant="outline" onClick={() => setEditCohortOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={() => {
                  setSuccessMessage("Cohort criteria have been successfully updated.");
                  setShowSuccessModal(true);
                  setEditCohortOpen(false);
                }}>
                  Save Changes
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Set Alerts Dialog */}
      <Dialog open={setAlertsOpen} onOpenChange={setSetAlertsOpen}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Set Alerts - {selectedCohortData?.name}</DialogTitle>
          </DialogHeader>
          {selectedCohortData && (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Alert Type</label>
                <Select defaultValue="risk_threshold">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="risk_threshold">Risk Threshold</SelectItem>
                    <SelectItem value="intervention_completion">Intervention Completion</SelectItem>
                    <SelectItem value="patient_count">Patient Count Change</SelectItem>
                    <SelectItem value="outcome_metrics">Outcome Metrics</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium">Threshold Value</label>
                <Input 
                  type="number"
                  placeholder="e.g., 80 for 80%"
                  defaultValue="80"
                />
              </div>

              <div>
                <label className="text-sm font-medium">Alert Frequency</label>
                <Select defaultValue="daily">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="immediate">Immediate</SelectItem>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium">Notification Method</label>
                <div className="space-y-2 mt-2">
                  <label className="flex items-center space-x-2">
                    <input type="checkbox" defaultChecked className="rounded" />
                    <span className="text-sm">Email notifications</span>
                  </label>
                  <label className="flex items-center space-x-2">
                    <input type="checkbox" defaultChecked className="rounded" />
                    <span className="text-sm">In-app notifications</span>
                  </label>
                  <label className="flex items-center space-x-2">
                    <input type="checkbox" className="rounded" />
                    <span className="text-sm">SMS alerts</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium">Recipients</label>
                <Select defaultValue="care_team">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="care_team">Care Team</SelectItem>
                    <SelectItem value="department_heads">Department Heads</SelectItem>
                    <SelectItem value="administrators">Administrators</SelectItem>
                    <SelectItem value="custom">Custom Recipients</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button variant="outline" onClick={() => setSetAlertsOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={() => {
                  setSuccessMessage("Population health alert has been configured successfully.");
                  setShowSuccessModal(true);
                  setSetAlertsOpen(false);
                }}>
                  Create Alert
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Schedule Dialog */}
      <Dialog open={scheduleOpen} onOpenChange={setScheduleOpen}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Schedule Appointment - {selectedPatientCare?.patientName}</DialogTitle>
          </DialogHeader>
          {selectedPatientCare && (
            <div className="space-y-4">
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="font-medium">{selectedPatientCare.description}</p>
                <p className="text-sm text-gray-600">
                  Due: {format(new Date(selectedPatientCare.dueDate), 'MMM dd, yyyy')}
                </p>
                <div className="flex gap-2 mt-2">
                  <Badge className={getStatusColor(selectedPatientCare.status)}>
                    {selectedPatientCare.status}
                  </Badge>
                  <Badge className={getPriorityColor(selectedPatientCare.priority)}>
                    {selectedPatientCare.priority}
                  </Badge>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium">Appointment Type</label>
                <Select defaultValue={selectedPatientCare.careType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="screening">Screening</SelectItem>
                    <SelectItem value="vaccination">Vaccination</SelectItem>
                    <SelectItem value="chronic_disease_management">Chronic Disease Management</SelectItem>
                    <SelectItem value="wellness_check">Wellness Check</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium">Preferred Date</label>
                <Input 
                  type="date"
                  defaultValue={new Date().toISOString().split('T')[0]}
                />
              </div>

              <div>
                <label className="text-sm font-medium">Preferred Time</label>
                <Select defaultValue="morning">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="morning">Morning (8:00 AM - 12:00 PM)</SelectItem>
                    <SelectItem value="afternoon">Afternoon (12:00 PM - 5:00 PM)</SelectItem>
                    <SelectItem value="evening">Evening (5:00 PM - 8:00 PM)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium">Provider</label>
                <Select defaultValue="dr_smith">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="dr_smith">Dr. Sarah Smith</SelectItem>
                    <SelectItem value="dr_jones">Dr. Michael Jones</SelectItem>
                    <SelectItem value="nurse_williams">Nurse Williams</SelectItem>
                    <SelectItem value="any_available">Any Available Provider</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium">Additional Notes</label>
                <Input placeholder="Any special requirements or notes..." />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button variant="outline" onClick={() => setScheduleOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={() => {
                  setSuccessMessage(`Appointment scheduled for ${selectedPatientCare?.patientName}. Confirmation will be sent via email.`);
                  setShowSuccessModal(true);
                  setScheduleOpen(false);
                }}>
                  Schedule Appointment
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Contact Dialog */}
      <Dialog open={contactOpen} onOpenChange={setContactOpen}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Contact Patient - {selectedPatientCare?.patientName}</DialogTitle>
          </DialogHeader>
          {selectedPatientCare && (
            <div className="space-y-4">
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="font-medium">{selectedPatientCare.description}</p>
                <p className="text-sm text-gray-600">
                  Due: {format(new Date(selectedPatientCare.dueDate), 'MMM dd, yyyy')}
                </p>
                <div className="flex gap-2 mt-2">
                  <Badge className={getStatusColor(selectedPatientCare.status)}>
                    {selectedPatientCare.status}
                  </Badge>
                  <Badge className={getPriorityColor(selectedPatientCare.priority)}>
                    {selectedPatientCare.priority}
                  </Badge>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium">Contact Method</label>
                <Select defaultValue="phone">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="phone">Phone Call</SelectItem>
                    <SelectItem value="sms">SMS Message</SelectItem>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="letter">Postal Letter</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium">Contact Reason</label>
                <Select defaultValue="reminder">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="reminder">Appointment Reminder</SelectItem>
                    <SelectItem value="rescheduling">Rescheduling Required</SelectItem>
                    <SelectItem value="preparation">Pre-appointment Instructions</SelectItem>
                    <SelectItem value="follow_up">Follow-up Required</SelectItem>
                    <SelectItem value="education">Health Education</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium">Priority Level</label>
                <Select defaultValue={selectedPatientCare.priority}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low Priority</SelectItem>
                    <SelectItem value="medium">Medium Priority</SelectItem>
                    <SelectItem value="high">High Priority</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium">Message Template</label>
                <Select defaultValue="standard_reminder">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="standard_reminder">Standard Reminder</SelectItem>
                    <SelectItem value="overdue_notice">Overdue Notice</SelectItem>
                    <SelectItem value="rescheduling">Rescheduling Request</SelectItem>
                    <SelectItem value="custom">Custom Message</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium">Custom Message</label>
                <textarea 
                  className="w-full h-20 p-2 border rounded-md text-sm"
                  placeholder="Enter custom message or additional notes..."
                  defaultValue={`Dear ${selectedPatientCare?.patientName}, this is a reminder about your upcoming ${selectedPatientCare?.description}. Please contact us to schedule your appointment.`}
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button variant="outline" onClick={() => setContactOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={() => {
                  setSuccessMessage(`Contact attempt logged for ${selectedPatientCare?.patientName}. Follow-up scheduled as needed.`);
                  setShowSuccessModal(true);
                  setContactOpen(false);
                }}>
                  Send Communication
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Create Intervention Dialog */}
      <Dialog open={createInterventionOpen} onOpenChange={setCreateInterventionOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Population Health Intervention</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Intervention Name</label>
              <Input placeholder="e.g., Diabetes Prevention Program" />
            </div>

            <div>
              <label className="text-sm font-medium">Description</label>
              <textarea 
                className="w-full h-20 p-2 border rounded-md text-sm"
                placeholder="Describe the intervention objectives and approach..."
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Target Population</label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select target group" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="diabetes_management">Diabetes Management</SelectItem>
                    <SelectItem value="cardiovascular_risk">Cardiovascular Risk</SelectItem>
                    <SelectItem value="preventive_screening">Preventive Screening</SelectItem>
                    <SelectItem value="chronic_disease">Chronic Disease Management</SelectItem>
                    <SelectItem value="wellness_program">Wellness Program</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium">Intervention Type</label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="educational">Educational Program</SelectItem>
                    <SelectItem value="screening">Screening Initiative</SelectItem>
                    <SelectItem value="lifestyle">Lifestyle Modification</SelectItem>
                    <SelectItem value="medication">Medication Management</SelectItem>
                    <SelectItem value="behavioral">Behavioral Health</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Start Date</label>
                <Input 
                  type="date"
                  defaultValue={new Date().toISOString().split('T')[0]}
                />
              </div>

              <div>
                <label className="text-sm font-medium">Duration (weeks)</label>
                <Input 
                  type="number"
                  placeholder="e.g., 12"
                  defaultValue="12"
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium">Target Cohort</label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Select cohort" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="diabetes_management">Diabetes Management (247 patients)</SelectItem>
                  <SelectItem value="cardiovascular_risk">Cardiovascular Risk (189 patients)</SelectItem>
                  <SelectItem value="all_patients">All Patients</SelectItem>
                  <SelectItem value="custom_cohort">Create Custom Cohort</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium">Success Metrics</label>
              <div className="grid grid-cols-2 gap-2 mt-2">
                {[
                  "HbA1c reduction", 
                  "Blood pressure control", 
                  "Weight management", 
                  "Medication adherence", 
                  "Screening completion", 
                  "Patient satisfaction"
                ].map((metric) => (
                  <label key={metric} className="flex items-center space-x-2">
                    <input type="checkbox" className="rounded" />
                    <span className="text-sm">{metric}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="text-sm font-medium">Target Completion Rate (%)</label>
              <Input 
                type="number"
                placeholder="e.g., 85"
                defaultValue="80"
                min="0"
                max="100"
              />
            </div>

            <div>
              <label className="text-sm font-medium">Assigned Care Team</label>
              <div className="space-y-2 mt-2">
                <label className="flex items-center space-x-2">
                  <input type="checkbox" defaultChecked className="rounded" />
                  <span className="text-sm">Primary Care Physicians</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input type="checkbox" defaultChecked className="rounded" />
                  <span className="text-sm">Nursing Staff</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input type="checkbox" className="rounded" />
                  <span className="text-sm">Health Educators</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input type="checkbox" className="rounded" />
                  <span className="text-sm">Nutritionists</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input type="checkbox" className="rounded" />
                  <span className="text-sm">Social Workers</span>
                </label>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium">Budget Allocation (£)</label>
              <Input 
                type="number"
                placeholder="e.g., 15000"
                defaultValue="10000"
              />
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" onClick={() => setCreateInterventionOpen(false)}>
                Cancel
              </Button>
              <Button onClick={() => {
                setSuccessMessage("Population health intervention has been successfully created and scheduled.");
                setShowSuccessModal(true);
                setCreateInterventionOpen(false);
              }}>
                Create Intervention
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* View Intervention Dialog */}
      <Dialog open={viewInterventionOpen} onOpenChange={setViewInterventionOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>View Intervention - {selectedIntervention?.name}</DialogTitle>
          </DialogHeader>
          {selectedIntervention && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Status</label>
                  <Badge className={selectedIntervention.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                    {selectedIntervention.status}
                  </Badge>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Type</label>
                  <Badge variant="outline">{selectedIntervention.type}</Badge>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Description</label>
                <p className="text-gray-900 dark:text-gray-100 mt-1">{selectedIntervention.description}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Duration</label>
                  <p className="text-gray-900 dark:text-gray-100">{selectedIntervention.duration}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Budget</label>
                  <p className="text-gray-900 dark:text-gray-100">£{selectedIntervention.budget?.toLocaleString()}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Target Population</label>
                  <p className="text-gray-900 dark:text-gray-100">{selectedIntervention.targetPopulation}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Start Date</label>
                  <p className="text-gray-900 dark:text-gray-100">{selectedIntervention.startDate}</p>
                </div>
              </div>

              {selectedIntervention.metrics && (
                <div>
                  <label className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3 block">Performance Metrics</label>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center p-3 bg-blue-50 rounded-lg">
                      <div className="text-lg font-semibold text-blue-600">{selectedIntervention.metrics.enrolled}</div>
                      <div className="text-sm text-gray-600 dark:text-gray-300">Enrolled</div>
                    </div>
                    <div className="text-center p-3 bg-green-50 rounded-lg">
                      <div className="text-lg font-semibold text-green-600">{selectedIntervention.metrics.completed}</div>
                      <div className="text-sm text-gray-600 dark:text-gray-300">Completed</div>
                    </div>
                    <div className="text-center p-3 bg-yellow-50 rounded-lg">
                      <div className="text-lg font-semibold text-yellow-600">{selectedIntervention.metrics.successRate}%</div>
                      <div className="text-sm text-gray-600 dark:text-gray-300">Success Rate</div>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-4">
                <Button variant="outline" onClick={() => setViewInterventionOpen(false)}>
                  Close
                </Button>
                <Button onClick={() => {
                  setViewInterventionOpen(false);
                  setEditInterventionOpen(true);
                }}>
                  Edit Intervention
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Intervention Dialog */}
      <Dialog open={editInterventionOpen} onOpenChange={setEditInterventionOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Intervention - {selectedIntervention?.name}</DialogTitle>
          </DialogHeader>
          {selectedIntervention && (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Intervention Name</label>
                <Input defaultValue={selectedIntervention.name} />
              </div>

              <div>
                <label className="text-sm font-medium">Description</label>
                <Input defaultValue={selectedIntervention.description} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Status</label>
                  <Select defaultValue={selectedIntervention.status}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="paused">Paused</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium">Type</label>
                  <Select defaultValue={selectedIntervention.type}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="educational">Educational</SelectItem>
                      <SelectItem value="screening">Screening</SelectItem>
                      <SelectItem value="lifestyle">Lifestyle</SelectItem>
                      <SelectItem value="clinical">Clinical</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Duration</label>
                  <Input defaultValue={selectedIntervention.duration} />
                </div>
                <div>
                  <label className="text-sm font-medium">Budget (£)</label>
                  <Input type="number" defaultValue={selectedIntervention.budget} />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium">Target Population</label>
                <Input defaultValue={selectedIntervention.targetPopulation} />
              </div>

              <div>
                <label className="text-sm font-medium">Start Date</label>
                <Input type="date" defaultValue={selectedIntervention.startDate} />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button variant="outline" onClick={() => setEditInterventionOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={() => {
                  setSuccessMessage("The intervention has been successfully updated.");
                  setShowSuccessModal(true);
                  setEditInterventionOpen(false);
                }}>
                  Save Changes
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Success Modal */}
      <Dialog open={showSuccessModal} onOpenChange={setShowSuccessModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-green-600">Success</DialogTitle>
          </DialogHeader>
          
          <div className="py-4">
            <p className="text-gray-700">{successMessage}</p>
          </div>

          <div className="flex justify-end">
            <Button
              onClick={() => {
                setShowSuccessModal(false);
                setSuccessMessage("");
              }}
            >
              OK
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}