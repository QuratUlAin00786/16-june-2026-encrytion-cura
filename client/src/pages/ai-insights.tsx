import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useLocation } from "wouter";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LoadingSpinner } from "@/components/common/loading-spinner";
import { apiRequest } from "@/lib/queryClient";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Lightbulb, CheckCircle, AlertTriangle, Sparkles, Clock, CheckCheck, X, Brain, Zap } from "lucide-react";
import type { AiInsight } from "@/types";

function getTenantSubdomain(): string {
  return localStorage.getItem('user_subdomain') || 'demo';
}

const insightIcons = {
  risk_alert: Lightbulb,
  treatment_suggestion: CheckCircle,
  drug_interaction: AlertTriangle,
  preventive_care: CheckCircle
};

const insightColors = {
  risk_alert: {
    bg: "bg-blue-50 dark:bg-blue-900/20",
    border: "border-blue-100 dark:border-blue-800/30",
    icon: "text-blue-500 dark:text-blue-400"
  },
  treatment_suggestion: {
    bg: "bg-green-50 dark:bg-green-900/20",
    border: "border-green-100 dark:border-green-800/30",
    icon: "text-green-500 dark:text-green-400"
  },
  drug_interaction: {
    bg: "bg-yellow-50 dark:bg-yellow-900/20",
    border: "border-yellow-100 dark:border-yellow-800/30",
    icon: "text-yellow-500 dark:text-yellow-400"
  },
  preventive_care: {
    bg: "bg-purple-50 dark:bg-purple-900/20",
    border: "border-purple-100 dark:border-purple-800/30",
    icon: "text-purple-500 dark:text-purple-400"
  }
};

const severityColors = {
  low: "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300",
  medium: "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300",
  high: "bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300",
  critical: "bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300"
};

export default function AiInsights() {
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [selectedPatientId, setSelectedPatientId] = useState<string>("");
  const [generateDialogOpen, setGenerateDialogOpen] = useState(false);
  
  const { data: insights, isLoading, error } = useQuery<AiInsight[]>({
    queryKey: ["/api/dashboard/ai-insights"],
    queryFn: async () => {
      const token = localStorage.getItem('auth_token');
      const response = await fetch('/api/dashboard/ai-insights', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-Tenant-Subdomain': getTenantSubdomain()
        }
      });
      if (!response.ok) {
        throw new Error('Failed to fetch AI insights');
      }
      return response.json();
    },
    retry: false,
    staleTime: 0,
    refetchOnWindowFocus: false,
  });

  // Fetch patients for the generate insights dialog
  const { data: patients = [] } = useQuery({
    queryKey: ["/api/patients"],
    queryFn: async () => {
      const token = localStorage.getItem('auth_token');
      const response = await fetch('/api/patients?limit=50', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-Tenant-Subdomain': getTenantSubdomain()
        }
      });
      if (!response.ok) {
        throw new Error('Failed to fetch patients');
      }
      return response.json();
    }
  });

  const updateInsightMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      return apiRequest('PATCH', `/api/ai/insights/${id}`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/ai-insights"] });
    }
  });

  const generateInsightsMutation = useMutation({
    mutationFn: async (patientId: string) => {
      return apiRequest('POST', '/api/ai/generate-insights', { patientId });
    },
    onSuccess: (data) => {
      setSuccessMessage(`Generated ${data.generated} new insights for ${data.patientName}`);
      setShowSuccessModal(true);
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/ai-insights"] });
      setGenerateDialogOpen(false);
      setSelectedPatientId("");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to generate AI insights",
        variant: "destructive",
      });
    }
  });

  const handleGenerateInsights = () => {
    if (!selectedPatientId) {
      toast({
        title: "Error",
        description: "Please select a patient first",
        variant: "destructive",
      });
      return;
    }
    generateInsightsMutation.mutate(selectedPatientId);
  };

  if (isLoading) {
    return (
      <div className="w-full min-h-0 flex flex-col page-zoom-90">
        <Header 
          title="AI Insights" 
          subtitle="AI-powered medical insights and recommendations."
        />
        <div className="flex-1 flex items-center justify-center">
          <LoadingSpinner size="lg" />
        </div>
      </div>
    );
  }

  // Only show error if there's a meaningful error and no data
  if (error && !isLoading && !insights) {
    console.error('AI Insights error:', error);
    return (
      <div className="w-full min-h-0 flex flex-col page-zoom-90">
        <Header 
          title="AI Insights" 
          subtitle="AI-powered medical insights and recommendations."
        />
        <div className="flex-1 p-4">
          <Card>
            <CardContent className="text-center py-8">
              <p className="text-neutral-600">
                Unable to load AI insights. Please try again later.
              </p>
              <Button 
                className="mt-4" 
                onClick={() => queryClient.invalidateQueries({ queryKey: ["/api/dashboard/ai-insights"] })}
              >
                Retry
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Data loaded successfully
  
  // Ensure insights is an array
  const safeInsights = Array.isArray(insights) ? insights : [];
  const activeInsights = safeInsights.filter(insight => insight.status === 'active');
  const dismissedInsights = safeInsights.filter(insight => insight.status === 'dismissed');
  const resolvedInsights = safeInsights.filter(insight => insight.status === 'resolved');

  return (
    <div className="w-full min-h-0 flex flex-col page-zoom-90">
      <Header 
        title="AI Insights" 
        subtitle="AI-powered medical insights and recommendations."
        actions={
          <Dialog open={generateDialogOpen} onOpenChange={setGenerateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="ai-gradient">
                <Brain className="w-4 h-4 mr-2" />
                Generate New Insights
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="flex items-center">
                  <Zap className="w-5 h-5 mr-2 text-blue-500" />
                  Generate AI Insights
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                    Select Patient
                  </label>
                  <Select value={selectedPatientId} onValueChange={setSelectedPatientId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a patient for AI analysis..." />
                    </SelectTrigger>
                    <SelectContent>
                      {patients.map((patient: any) => (
                        <SelectItem key={patient.id} value={patient.id.toString()}>
                          {patient.firstName} {patient.lastName} - {patient.patientId}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="flex items-start space-x-3">
                    <Sparkles className="w-5 h-5 text-blue-500 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-blue-900">AI Analysis</h4>
                      <p className="text-sm text-blue-700 mt-1">
                        Our AI will analyze the patient's medical history, current conditions, and generate personalized insights including risk assessments, drug interactions, and treatment recommendations.
                      </p>
                    </div>
                  </div>
                </div>
                <div className="flex justify-end space-x-2">
                  <Button 
                    variant="outline" 
                    onClick={() => setGenerateDialogOpen(false)}
                    disabled={generateInsightsMutation.isPending}
                  >
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleGenerateInsights}
                    disabled={generateInsightsMutation.isPending || !selectedPatientId}
                    className="ai-gradient"
                  >
                    {generateInsightsMutation.isPending ? (
                      <>
                        <LoadingSpinner size="sm" className="mr-2" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Brain className="w-4 h-4 mr-2" />
                        Generate Insights
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        }
      />
      
      <div className="flex-1 overflow-auto p-3 sm:p-4">
        {/* AI Disclaimer */}
        <div className="mb-4">
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/30 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="font-medium text-amber-900 dark:text-amber-200 mb-1">Medical AI Disclaimer</h3>
                <p className="text-sm text-amber-800 dark:text-amber-300">
                  AI insights are for informational purposes only and should not replace professional medical judgment. 
                  All AI-generated recommendations must be reviewed and validated by qualified healthcare professionals 
                  before making any clinical decisions. This system is designed to assist, not replace, medical expertise.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="mb-6">
          <div className="flex items-center space-x-4">
            <Badge className="ai-gradient text-white">
              <Sparkles className="w-3 h-3 mr-1" />
              AI Powered
            </Badge>
            <div className="flex items-center space-x-2 text-sm text-neutral-600 dark:text-neutral-300">
              <Clock className="w-4 h-4" />
              <span>Real-time analysis</span>
            </div>
          </div>
        </div>

        {/* Active Insights */}
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
              Active Insights ({activeInsights.length})
            </h3>
            
            {activeInsights.length === 0 ? (
              <Card>
                <CardContent className="text-center py-8">
                  <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
                  <p className="text-neutral-600 dark:text-neutral-300">No active insights at the moment.</p>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-2">
                    The AI is continuously monitoring for new insights.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {activeInsights.map((insight) => {
                  const IconComponent = insightIcons[insight.type] || Lightbulb;
                  const colors = insightColors[insight.type] || insightColors.risk_alert;
                  
                  return (
                    <Card key={insight.id} className={`${colors.bg} ${colors.border}`}>
                      <CardContent className="p-6">
                        <div className="flex items-start space-x-4">
                          <div className={`w-10 h-10 ${colors.icon} bg-white dark:bg-slate-800 rounded-full flex items-center justify-center flex-shrink-0`}>
                            <IconComponent className="w-5 h-5" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-start justify-between mb-2">
                              <h4 className="font-semibold text-gray-900 dark:text-gray-100">{insight.title}</h4>
                              <div className="flex items-center space-x-2">
                                <Badge 
                                  variant="secondary"
                                  className={severityColors[insight.severity]}
                                >
                                  {insight.severity.toUpperCase()}
                                </Badge>
                                {insight.actionRequired && (
                                  <Badge variant="destructive">Action Required</Badge>
                                )}
                              </div>
                            </div>
                            
                            <p className="text-gray-700 dark:text-gray-300 mb-3">{insight.description}</p>
                            
                            {insight.confidence && (
                              <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                                Confidence: {Math.round(insight.confidence * 100)}%
                              </p>
                            )}

                            {insight.metadata && insight.metadata.suggestedActions && insight.metadata.suggestedActions.length > 0 && (
                              <div className="mb-4">
                                <h5 className="text-sm font-medium text-gray-800 dark:text-gray-200 mb-2">Suggested Actions:</h5>
                                <ul className="text-sm text-gray-600 dark:text-gray-300 space-y-1">
                                  {insight.metadata.suggestedActions.map((action, index) => (
                                    <li key={index} className="flex items-start space-x-2">
                                      <span className="text-medical-blue">•</span>
                                      <span>{action}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}

                            <div className="flex items-center space-x-4">
                              <Button
                                size="sm"
                                onClick={() => updateInsightMutation.mutate({ 
                                  id: insight.id, 
                                  status: 'resolved' 
                                })}
                                disabled={updateInsightMutation.isPending}
                                style={{ 
                                  backgroundColor: '#4A7DFF', 
                                  borderColor: '#4A7DFF',
                                  color: 'white'
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.backgroundColor = '#7279FB';
                                  e.currentTarget.style.borderColor = '#7279FB';
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.backgroundColor = '#4A7DFF';
                                  e.currentTarget.style.borderColor = '#4A7DFF';
                                }}
                                className="transition-all duration-200"
                              >
                                <CheckCheck className="w-4 h-4 mr-1" />
                                Mark Resolved
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => updateInsightMutation.mutate({ 
                                  id: insight.id, 
                                  status: 'dismissed' 
                                })}
                                disabled={updateInsightMutation.isPending}
                                style={{ 
                                  backgroundColor: '#7279FB', 
                                  borderColor: '#7279FB',
                                  color: 'white'
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.backgroundColor = '#4A7DFF';
                                  e.currentTarget.style.borderColor = '#4A7DFF';
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.backgroundColor = '#7279FB';
                                  e.currentTarget.style.borderColor = '#7279FB';
                                }}
                                className="transition-all duration-200"
                              >
                                <X className="w-4 h-4 mr-1" />
                                Dismiss
                              </Button>
                              {insight.patientId && (
                                <Button 
                                  size="sm"
                                  onClick={() => setLocation(`/patients/${insight.patientId}`)}
                                  className="transition-all duration-200 bg-[#4A7DFF] hover:bg-[#7279FB] border-[#4A7DFF] text-white dark:bg-blue-600 dark:hover:bg-blue-500 dark:border-blue-600 dark:text-white"
                                >
                                  View Patient
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>

          {/* Resolved Insights */}
          {resolvedInsights.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Recently Resolved ({resolvedInsights.length})
              </h3>
              <div className="grid gap-3">
                {resolvedInsights.slice(0, 3).map((insight) => (
                  <Card key={insight.id} className="bg-green-50 border-green-100">
                    <CardContent className="p-4">
                      <div className="flex items-center space-x-3">
                        <CheckCircle className="w-5 h-5 text-green-500" />
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">{insight.title}</p>
                          <p className="text-sm text-gray-600">{insight.description}</p>
                        </div>
                        <Badge variant="secondary" className="bg-green-100 text-green-800">
                          Resolved
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

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
