import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { 
  Download, 
  Eye, 
  Filter, 
  Search, 
  Calendar,
  BarChart3,
  FileText,
  Users,
  TrendingUp,
  Star,
  CheckCircle,
  AlertTriangle,
  Clock,
  Mail,
  Phone,
  Share,
  Printer
} from "lucide-react";
import { format } from "date-fns";

export interface FormResponse {
  id: string;
  formId: string;
  formTitle: string;
  respondentId?: string;
  respondentName?: string;
  respondentEmail?: string;
  responses: Record<string, any>;
  status: 'draft' | 'completed' | 'reviewed';
  submittedAt: string;
  ipAddress?: string;
  userAgent?: string;
  completionTime?: number; // in seconds
  score?: number;
  flags?: string[];
}

export interface FormAnalytics {
  totalResponses: number;
  completionRate: number;
  averageScore: number;
  averageCompletionTime: number;
  responsesByDay: Array<{ date: string; count: number }>;
  fieldAnalytics: Record<string, {
    totalResponses: number;
    uniqueValues: number;
    mostCommon: string;
    valueDistribution: Record<string, number>;
  }>;
  demographicBreakdown: {
    ageGroups: Record<string, number>;
    genders: Record<string, number>;
    locations: Record<string, number>;
  };
}

const mockResponses: FormResponse[] = [
  {
    id: "resp_1",
    formId: "form_1",
    formTitle: "Patient Intake Form",
    respondentName: "Sarah Johnson",
    respondentEmail: "sarah.johnson@email.com",
    responses: {
      "full_name": "Sarah Johnson",
      "age": "34",
      "symptoms": ["Headache", "Fatigue"],
      "pain_level": "6",
      "duration": "3 days",
      "medical_history": "No significant history"
    },
    status: "completed",
    submittedAt: "2024-01-15T10:30:00Z",
    completionTime: 420,
    score: 85
  },
  {
    id: "resp_2",
    formId: "form_2",
    formTitle: "Mental Health Screening",
    respondentName: "Michael Chen",
    respondentEmail: "m.chen@email.com",
    responses: {
      "mood_rating": "3",
      "anxiety_level": "4",
      "sleep_quality": "Poor",
      "stress_factors": ["Work", "Family"],
      "support_system": "Good"
    },
    status: "completed",
    submittedAt: "2024-01-14T14:15:00Z",
    completionTime: 380,
    score: 72,
    flags: ["high_anxiety"]
  },
  {
    id: "resp_3",
    formId: "form_3",
    formTitle: "Patient Satisfaction Survey",
    respondentName: "Emma Wilson",
    respondentEmail: "emma.w@email.com",
    responses: {
      "overall_rating": "5",
      "wait_time_rating": "4",
      "staff_rating": "5",
      "facility_rating": "4",
      "recommend": "Yes",
      "comments": "Excellent care, very professional staff"
    },
    status: "completed",
    submittedAt: "2024-01-13T16:45:00Z",
    completionTime: 180,
    score: 92
  }
];

const mockAnalytics: FormAnalytics = {
  totalResponses: 156,
  completionRate: 87.5,
  averageScore: 78.3,
  averageCompletionTime: 340,
  responsesByDay: [
    { date: "2024-01-10", count: 12 },
    { date: "2024-01-11", count: 15 },
    { date: "2024-01-12", count: 18 },
    { date: "2024-01-13", count: 22 },
    { date: "2024-01-14", count: 19 },
    { date: "2024-01-15", count: 25 },
    { date: "2024-01-16", count: 16 }
  ],
  fieldAnalytics: {
    "pain_level": {
      totalResponses: 145,
      uniqueValues: 11,
      mostCommon: "5",
      valueDistribution: { "1": 5, "2": 8, "3": 12, "4": 18, "5": 25, "6": 22, "7": 20, "8": 15, "9": 12, "10": 8 }
    },
    "satisfaction": {
      totalResponses: 134,
      uniqueValues: 5,
      mostCommon: "4",
      valueDistribution: { "1": 2, "2": 5, "3": 15, "4": 52, "5": 60 }
    }
  },
  demographicBreakdown: {
    ageGroups: { "18-25": 23, "26-35": 45, "36-45": 38, "46-55": 32, "56+": 18 },
    genders: { "Male": 72, "Female": 78, "Other": 6 },
    locations: { "London": 45, "Manchester": 32, "Birmingham": 28, "Other": 51 }
  }
};

interface FormResponsesProps {
  formId?: string;
}

export function FormResponses({ formId }: FormResponsesProps) {
  const [selectedResponse, setSelectedResponse] = useState<FormResponse | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [dateRange, setDateRange] = useState<string>("7d");

  const { data: responses = mockResponses, isLoading } = useQuery({
    queryKey: ["/api/forms/responses", formId, statusFilter, dateRange],
    enabled: true,
  });

  const { data: analytics = mockAnalytics } = useQuery({
    queryKey: ["/api/forms/analytics", formId, dateRange],
    enabled: true,
  });

  const filteredResponses = responses.filter(response => {
    const matchesStatus = statusFilter === "all" || response.status === statusFilter;
    const matchesSearch = !searchQuery || 
      response.respondentName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      response.respondentEmail?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      response.formTitle.toLowerCase().includes(searchQuery.toLowerCase());
    
    return matchesStatus && matchesSearch;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'draft': return 'bg-yellow-100 text-yellow-800';
      case 'reviewed': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  const exportResponses = (format: 'csv' | 'pdf' | 'excel') => {
    // Implementation for exporting responses
    console.log(`Exporting responses as ${format}`);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        {[1, 2, 3].map(i => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="animate-pulse space-y-4">
                <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Analytics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Responses</p>
                <p className="text-2xl font-bold">{analytics.totalResponses}</p>
              </div>
              <Users className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Completion Rate</p>
                <p className="text-2xl font-bold">{analytics.completionRate}%</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Average Score</p>
                <p className="text-2xl font-bold">{analytics.averageScore}</p>
              </div>
              <Star className="h-8 w-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Avg. Time</p>
                <p className="text-2xl font-bold">{formatDuration(analytics.averageCompletionTime)}</p>
              </div>
              <Clock className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Actions */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Form Responses
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => exportResponses('csv')}>
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
              <Button variant="outline" size="sm" onClick={() => exportResponses('pdf')}>
                <Printer className="h-4 w-4 mr-2" />
                Export PDF
              </Button>
              <Button variant="outline" size="sm">
                <Share className="h-4 w-4 mr-2" />
                Share
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 mb-6">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search responses..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="reviewed">Reviewed</SelectItem>
              </SelectContent>
            </Select>

            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Date range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1d">Last 24 hours</SelectItem>
                <SelectItem value="7d">Last 7 days</SelectItem>
                <SelectItem value="30d">Last 30 days</SelectItem>
                <SelectItem value="90d">Last 90 days</SelectItem>
                <SelectItem value="all">All time</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-4">
            {filteredResponses.map((response) => (
              <Card key={response.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => setSelectedResponse(response)}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h4 className="font-medium">{response.respondentName || "Anonymous"}</h4>
                        <Badge className={getStatusColor(response.status)}>
                          {response.status}
                        </Badge>
                        {response.flags?.map((flag) => (
                          <Badge key={flag} variant="outline" className="text-red-600 border-red-300">
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            {flag.replace('_', ' ')}
                          </Badge>
                        ))}
                      </div>
                      
                      <div className="flex items-center gap-6 text-sm text-gray-600">
                        <span>{response.formTitle}</span>
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {format(new Date(response.submittedAt), 'MMM d, yyyy HH:mm')}
                        </span>
                        {response.completionTime && (
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatDuration(response.completionTime)}
                          </span>
                        )}
                        {response.respondentEmail && (
                          <span className="flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            {response.respondentEmail}
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4">
                      {response.score && (
                        <div className="text-right">
                          <div className="text-sm text-gray-500">Score</div>
                          <div className={`text-lg font-semibold ${getScoreColor(response.score)}`}>
                            {response.score}%
                          </div>
                        </div>
                      )}
                      <Button variant="ghost" size="sm">
                        <Eye className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {filteredResponses.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>No responses found</p>
              <p className="text-sm">Try adjusting your filters or search terms</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detailed Analytics */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="demographics">Demographics</TabsTrigger>
          <TabsTrigger value="fields">Field Analysis</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Response Timeline</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {analytics.responsesByDay.map((day) => (
                    <div key={day.date} className="flex items-center justify-between">
                      <span className="text-sm">{format(new Date(day.date), 'MMM d')}</span>
                      <div className="flex items-center gap-2">
                        <div className="w-20 bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-blue-600 h-2 rounded-full" 
                            style={{ width: `${(day.count / 25) * 100}%` }}
                          ></div>
                        </div>
                        <span className="text-sm font-medium w-6">{day.count}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Response Quality</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>High Quality (80-100%)</span>
                      <span>45%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className="bg-green-600 h-2 rounded-full" style={{ width: '45%' }}></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Medium Quality (60-79%)</span>
                      <span>35%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className="bg-yellow-600 h-2 rounded-full" style={{ width: '35%' }}></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Low Quality (0-59%)</span>
                      <span>20%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className="bg-red-600 h-2 rounded-full" style={{ width: '20%' }}></div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="demographics" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Age Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {Object.entries(analytics.demographicBreakdown.ageGroups).map(([age, count]) => (
                    <div key={age} className="flex items-center justify-between">
                      <span className="text-sm">{age}</span>
                      <span className="text-sm font-medium">{count}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Gender Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {Object.entries(analytics.demographicBreakdown.genders).map(([gender, count]) => (
                    <div key={gender} className="flex items-center justify-between">
                      <span className="text-sm">{gender}</span>
                      <span className="text-sm font-medium">{count}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Locations</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {Object.entries(analytics.demographicBreakdown.locations).map(([location, count]) => (
                    <div key={location} className="flex items-center justify-between">
                      <span className="text-sm">{location}</span>
                      <span className="text-sm font-medium">{count}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="fields" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.entries(analytics.fieldAnalytics).map(([fieldName, data]) => (
              <Card key={fieldName}>
                <CardHeader>
                  <CardTitle className="text-sm capitalize">{fieldName.replace('_', ' ')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span>Total Responses:</span>
                      <span className="font-medium">{data.totalResponses}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Unique Values:</span>
                      <span className="font-medium">{data.uniqueValues}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Most Common:</span>
                      <span className="font-medium">{data.mostCommon}</span>
                    </div>
                    <div>
                      <p className="text-sm font-medium mb-2">Value Distribution:</p>
                      <div className="space-y-1">
                        {Object.entries(data.valueDistribution).slice(0, 5).map(([value, count]) => (
                          <div key={value} className="flex items-center justify-between text-xs">
                            <span>{value}</span>
                            <div className="flex items-center gap-2">
                              <div className="w-16 bg-gray-200 rounded-full h-1">
                                <div 
                                  className="bg-blue-600 h-1 rounded-full" 
                                  style={{ width: `${(count / Math.max(...Object.values(data.valueDistribution))) * 100}%` }}
                                ></div>
                              </div>
                              <span className="w-6">{count}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="trends" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Response Trends
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">+15%</div>
                    <div className="text-sm text-gray-600">Response rate vs last month</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">+8%</div>
                    <div className="text-sm text-gray-600">Completion rate improvement</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600">-12s</div>
                    <div className="text-sm text-gray-600">Average completion time</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Response Detail Dialog */}
      {selectedResponse && (
        <Dialog open={!!selectedResponse} onOpenChange={() => setSelectedResponse(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Response Details</DialogTitle>
            </DialogHeader>
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium mb-2">Respondent Information</h4>
                  <div className="space-y-2 text-sm">
                    <div><strong>Name:</strong> {selectedResponse.respondentName || "Anonymous"}</div>
                    <div><strong>Email:</strong> {selectedResponse.respondentEmail || "Not provided"}</div>
                    <div><strong>Submitted:</strong> {format(new Date(selectedResponse.submittedAt), 'PPpp')}</div>
                    <div><strong>Completion Time:</strong> {selectedResponse.completionTime ? formatDuration(selectedResponse.completionTime) : "N/A"}</div>
                  </div>
                </div>
                <div>
                  <h4 className="font-medium mb-2">Response Metrics</h4>
                  <div className="space-y-2 text-sm">
                    <div><strong>Status:</strong> 
                      <Badge className={`ml-2 ${getStatusColor(selectedResponse.status)}`}>
                        {selectedResponse.status}
                      </Badge>
                    </div>
                    {selectedResponse.score && (
                      <div><strong>Score:</strong> 
                        <span className={`ml-2 font-semibold ${getScoreColor(selectedResponse.score)}`}>
                          {selectedResponse.score}%
                        </span>
                      </div>
                    )}
                    <div><strong>Form:</strong> {selectedResponse.formTitle}</div>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-medium mb-4">Response Data</h4>
                <div className="space-y-4">
                  {Object.entries(selectedResponse.responses).map(([field, value]) => (
                    <div key={field} className="border rounded-lg p-3">
                      <div className="font-medium text-sm text-gray-700 mb-1">
                        {field.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </div>
                      <div className="text-sm">
                        {Array.isArray(value) ? value.join(', ') : String(value)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setSelectedResponse(null)}>
                  Close
                </Button>
                <Button>
                  Mark as Reviewed
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}