import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Lightbulb, CheckCircle, AlertTriangle, Sparkles, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { LoadingSpinner } from "@/components/common/loading-spinner";
import { apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";
import type { AiInsight, Patient } from "@/types";
import { getActiveSubdomain } from "@/lib/subdomain-utils";

const insightIcons = {
  risk_alert: Lightbulb,
  treatment_suggestion: CheckCircle,
  drug_interaction: AlertTriangle,
  preventive_care: CheckCircle
};

const insightColors = {
  risk_alert: {
    bg: "bg-blue-50 dark:bg-blue-950/50",
    border: "border-blue-100 dark:border-blue-800",
    icon: "text-blue-500 dark:text-blue-400"
  },
  treatment_suggestion: {
    bg: "bg-green-50 dark:bg-green-950/50",
    border: "border-green-100 dark:border-green-800",
    icon: "text-green-500 dark:text-green-400"
  },
  drug_interaction: {
    bg: "bg-yellow-50 dark:bg-yellow-950/50",
    border: "border-yellow-100 dark:border-yellow-800",
    icon: "text-yellow-500 dark:text-yellow-400"
  },
  preventive_care: {
    bg: "bg-purple-50 dark:bg-purple-950/50",
    border: "border-purple-100 dark:border-purple-800",
    icon: "text-purple-500 dark:text-purple-400"
  }
};

export function AiInsightsPanel() {
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const [selectedInsight, setSelectedInsight] = useState<AiInsight | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [dismissingInsightId, setDismissingInsightId] = useState<number | null>(null);
  
  // Fetch patient data when selected insight has a patient ID
  const { data: patientData, isLoading: isPatientLoading } = useQuery<Patient>({
    queryKey: ['/api/patients', selectedInsight?.patientId],
    queryFn: async () => {
      if (!selectedInsight?.patientId) return null;
      
      const token = localStorage.getItem('auth_token');
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'X-Tenant-Subdomain': getActiveSubdomain(),
      };
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const response = await fetch(`/api/patients/${selectedInsight.patientId}`, {
        method: 'GET',
        headers,
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch patient data: ${response.status}`);
      }
      
      return response.json();
    },
    enabled: !!selectedInsight?.patientId && isDialogOpen,
    retry: 2,
  });
  
  const { data: insights, isLoading, error } = useQuery<AiInsight[]>({
    queryKey: ["/api/dashboard/ai-insights"],
    queryFn: async () => {
      const token = localStorage.getItem('auth_token');
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'X-Tenant-Subdomain': getActiveSubdomain(),
      };
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const response = await fetch("/api/dashboard/ai-insights", {
        method: 'GET',
        headers,
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }
      
      return response.json();
    },
    retry: 2,
    retryDelay: 1000,
  });







  const updateInsightMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      return apiRequest('PATCH', `/api/ai/insights/${id}`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/ai-insights"] });
      setDismissingInsightId(null);
    },
    onError: () => {
      setDismissingInsightId(null);
    }
  });

  if (isLoading) {
    return (
      <Card className="dashboard-card">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            AI Patient Insights
            <Badge className="ai-gradient text-white">
              <Sparkles className="w-3 h-3 mr-1" />
              AI Powered
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-[600px]">
          <LoadingSpinner />
        </CardContent>
      </Card>
    );
  }

  if (error && Object.keys(error).length > 0) {
    return (
      <Card className="dashboard-card">
        <CardHeader>
          <CardTitle className="flex items-center justify-between text-gray-900 dark:text-gray-100">
            AI Patient Insights
            <Badge variant="secondary">Unavailable</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="h-[600px] flex items-center justify-center">
          <p className="text-neutral-600 dark:text-neutral-400 text-center py-8">
            Unable to load AI insights. Please try again later.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (!insights || insights.length === 0) {
    return (
      <Card className="dashboard-card">
        <CardHeader>
          <CardTitle className="flex items-center justify-between text-gray-900 dark:text-gray-100">
            AI Patient Insights
            <Badge className="ai-gradient text-white">
              <Sparkles className="w-3 h-3 mr-1" />
              AI Powered
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="h-[600px] flex items-center justify-center">
          <p className="text-neutral-600 dark:text-neutral-400 text-center py-8">
            No AI insights available at the moment.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="dashboard-card">
      <CardHeader>
        <CardTitle className="flex items-center justify-between text-gray-900 dark:text-gray-100">
          AI Patient Insights
          <Badge className="ai-gradient text-white">
            <Sparkles className="w-3 h-3 mr-1" />
            AI Powered
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 h-[600px] overflow-y-auto">
        {insights.slice(0, 2).map((insight) => {
          const IconComponent = insightIcons[insight.type] || Lightbulb;
          const colors = insightColors[insight.type] || insightColors.risk_alert;
          
          return (
            <div
              key={insight.id}
              className={`ai-insight-card ${colors.bg} ${colors.border} overflow-hidden`}
            >
              <div className={`w-8 h-8 ${colors.icon} bg-white dark:bg-slate-700 rounded-full flex items-center justify-center flex-shrink-0`}>
                <IconComponent className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0 overflow-hidden">
                <h4 className="font-medium text-gray-900 dark:text-gray-100 truncate" title={insight.title}>
                  {insight.title}
                </h4>
                <p className="text-sm text-gray-600 dark:text-gray-300 mt-1 line-clamp-2 break-words" title={insight.description}>
                  {insight.description}
                </p>
                {insight.confidence && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Confidence: {Math.round(insight.confidence * 100)}%
                  </p>
                )}
                <div className="flex items-center space-x-4 mt-3 flex-wrap gap-2">
                  <Button
                    variant="link"
                    size="sm"
                    className="p-0 h-auto text-medical-blue hover:text-blue-700 dark:text-blue-300 dark:hover:text-blue-200"
                    onClick={() => {
                      setSelectedInsight(insight);
                      setIsDialogOpen(true);
                    }}
                    data-testid="button-view-details"
                  >
                    View Details
                  </Button>
                  <Button
                    variant="link"
                    size="sm"
                    className="p-0 h-auto text-gray-500 hover:text-gray-600 dark:text-gray-300 dark:hover:text-gray-200"
                    onClick={() => {
                      setDismissingInsightId(insight.id);
                      updateInsightMutation.mutate({ 
                      id: insight.id, 
                      status: 'dismissed' 
                      });
                    }}
                    disabled={dismissingInsightId === insight.id}
                    data-testid="button-dismiss"
                  >
                    {dismissingInsightId === insight.id ? 'Dismissing...' : 'Dismiss'}
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
        
        <div className="text-center pt-4">
          <Button 
            variant="link" 
            size="sm"
            className="text-medical-blue hover:text-blue-700 dark:text-blue-300 dark:hover:text-blue-200"
            onClick={() => {
              const subdomain = getActiveSubdomain();
              setLocation(`/${subdomain}/clinical-decision-support`);
            }}
          >
            View More
          </Button>
        </div>
      </CardContent>
      
      {/* Details Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto dark:bg-[#1E1E1E] dark:border-[#2A2A2A]">
          {selectedInsight && (
            <>
              <DialogHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    {(() => {
                      const IconComponent = insightIcons[selectedInsight.type] || Lightbulb;
                      const colors = insightColors[selectedInsight.type] || insightColors.risk_alert;
                      return (
                        <div className={`w-10 h-10 ${colors.icon} bg-white dark:bg-slate-700 rounded-full flex items-center justify-center flex-shrink-0 border-2 ${colors.border}`}>
                          <IconComponent className="w-5 h-5" />
                        </div>
                      );
                    })()}
                    <div>
                      <DialogTitle className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                        {selectedInsight.title}
                      </DialogTitle>
                      <Badge 
                        variant="outline" 
                        className={`mt-1 capitalize ${insightColors[selectedInsight.type]?.icon || 'text-blue-500'} dark:border-slate-500 dark:text-blue-300`}
                      >
                        {selectedInsight.type.replace('_', ' ')}
                      </Badge>
                    </div>
                  </div>
                </div>
              </DialogHeader>
              
              <div className="space-y-6">
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">Description</h4>
                  <DialogDescription className="text-gray-600 dark:text-gray-300 leading-relaxed">
                    {selectedInsight.description}
                  </DialogDescription>
                </div>
                
                {selectedInsight.confidence && (
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">Confidence Level</h4>
                    <div className="flex items-center space-x-3">
                      <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div 
                          className="bg-blue-500 h-2 rounded-full transition-all duration-300" 
                          style={{ width: `${Math.round(selectedInsight.confidence * 100)}%` }}
                        ></div>
                      </div>
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        {Math.round(selectedInsight.confidence * 100)}%
                      </span>
                    </div>
                  </div>
                )}
                
                {selectedInsight.patientId && (
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">Patient Information</h4>
                    {isPatientLoading ? (
                      <div className="flex items-center space-x-2">
                        <LoadingSpinner />
                        <span className="text-gray-500 dark:text-gray-400 text-sm">Loading patient details...</span>
                      </div>
                    ) : patientData ? (
                      <div className="space-y-2">
                        <p className="text-gray-600 dark:text-gray-300">
                          <span className="font-medium">Patient ID:</span> {patientData.patientId}
                        </p>
                        <p className="text-gray-600 dark:text-gray-300">
                          <span className="font-medium">Name:</span> {patientData.firstName} {patientData.lastName}
                        </p>
                        {patientData.dateOfBirth && (
                          <p className="text-gray-600 dark:text-gray-300">
                            <span className="font-medium">Date of Birth:</span> {new Date(patientData.dateOfBirth).toLocaleDateString()}
                          </p>
                        )}
                        {patientData.email && (
                          <p className="text-gray-600 dark:text-gray-300">
                            <span className="font-medium">Email:</span> {patientData.email}
                          </p>
                        )}
                        {patientData.phone && (
                          <p className="text-gray-600 dark:text-gray-300">
                            <span className="font-medium">Phone:</span> {patientData.phone}
                          </p>
                        )}
                        {patientData.nhsNumber && (
                          <p className="text-gray-600 dark:text-gray-300">
                            <span className="font-medium">NHS Number:</span> {patientData.nhsNumber}
                          </p>
                        )}
                      </div>
                    ) : (
                      <p className="text-gray-600 dark:text-gray-300">Patient ID: {selectedInsight.patientId}</p>
                    )}
                  </div>
                )}
                
                {selectedInsight.severity && (
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">Severity</h4>
                    <Badge 
                      variant={selectedInsight.severity === 'high' ? 'destructive' : 
                              selectedInsight.severity === 'medium' ? 'default' : 'secondary'}
                      className="capitalize"
                    >
                      {selectedInsight.severity}
                    </Badge>
                  </div>
                )}
                
                {selectedInsight.actionRequired !== undefined && (
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">Action Required</h4>
                    <Badge variant={selectedInsight.actionRequired ? 'destructive' : 'secondary'}>
                      {selectedInsight.actionRequired ? 'Yes' : 'No'}
                    </Badge>
                  </div>
                )}
                
                <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <Button 
                    variant="outline" 
                    onClick={() => setIsDialogOpen(false)}
                    data-testid="button-close-dialog"
                    className="dark:border-gray-600 dark:text-gray-100 dark:hover:bg-[#242424] dark:hover:border-gray-500"
                  >
                    Close
                  </Button>
                  <Button 
                    variant="destructive"
                    onClick={() => {
                      setDismissingInsightId(selectedInsight.id);
                      updateInsightMutation.mutate({ 
                        id: selectedInsight.id, 
                        status: 'dismissed' 
                      });
                      setIsDialogOpen(false);
                    }}
                    disabled={dismissingInsightId === selectedInsight.id}
                    data-testid="button-dismiss-from-dialog"
                  >
                    {dismissingInsightId === selectedInsight.id ? 'Dismissing...' : 'Dismiss Insight'}
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}
