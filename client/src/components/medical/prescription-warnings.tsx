import React, { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, AlertCircle, Info, Pill, Shield, Clock } from "lucide-react";

function getTenantSubdomain(): string {
  return localStorage.getItem('user_subdomain') || 'demo';
}

interface PrescriptionWarningsProps {
  patientId: number;
  medications: Array<{
    name: string;
    dosage: string;
    frequency?: string;
    duration?: string;
  }>;
  recordId?: number;
}

interface SafetyAnalysis {
  interactions: Array<{
    severity: 'minor' | 'moderate' | 'major' | 'critical';
    description: string;
    medications: string[];
    recommendation: string;
  }>;
  allergyWarnings: Array<{
    medication: string;
    allergen: string;
    severity: 'low' | 'medium' | 'high';
    recommendation: string;
  }>;
  doseWarnings: Array<{
    medication: string;
    issue: string;
    severity: 'low' | 'medium' | 'high';
    recommendation: string;
  }>;
  contraindications: Array<{
    medication: string;
    condition: string;
    severity: 'moderate' | 'high' | 'critical';
    recommendation: string;
  }>;
  ageWarnings: Array<{
    medication: string;
    issue: string;
    recommendation: string;
  }>;
}

export default function PrescriptionWarnings({ patientId, medications, recordId }: PrescriptionWarningsProps) {
  const [analysis, setAnalysis] = useState<SafetyAnalysis | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [riskLevel, setRiskLevel] = useState<'low' | 'high'>('low');

  useEffect(() => {
    const checkPrescriptionSafety = async () => {
      if (!patientId || !medications || medications.length === 0) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        console.log(`Checking prescription safety for patient ${patientId}...`);

        const response = await fetch('/api/prescription/safety-check', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Tenant-Subdomain': getTenantSubdomain()
          },
          credentials: 'include',
          body: JSON.stringify({
            patientId,
            medications: medications.filter(med => med.name && med.name.trim())
          })
        });

        console.log("Safety check response status:", response.status);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();
        console.log("Safety analysis data:", data);

        setAnalysis(data.analysis);
        setRiskLevel(data.riskLevel);
      } catch (err) {
        console.error("Error checking prescription safety:", err);
        setAnalysis(null);
      } finally {
        setIsLoading(false);
      }
    };

    checkPrescriptionSafety();
  }, [patientId, medications]);

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
      case 'major':
        return <AlertTriangle className="h-4 w-4 text-red-600" />;
      case 'moderate':
      case 'medium':
        return <AlertCircle className="h-4 w-4 text-orange-500" />;
      case 'minor':
      case 'low':
        return <Info className="h-4 w-4 text-yellow-500" />;
      default:
        return <Info className="h-4 w-4 text-blue-500" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
      case 'major':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'moderate':
      case 'medium':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'minor':
      case 'low':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default:
        return 'bg-blue-100 text-blue-800 border-blue-200';
    }
  };

  if (isLoading) {
    return (
      <div className="mt-3 p-3 bg-gray-50 rounded-lg">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Shield className="h-4 w-4 animate-spin" />
          Checking prescription safety...
        </div>
      </div>
    );
  }

  if (!analysis) {
    return null;
  }

  const hasWarnings = analysis.interactions.length > 0 || 
                     analysis.allergyWarnings.length > 0 || 
                     analysis.contraindications.length > 0 ||
                     analysis.doseWarnings.length > 0 ||
                     analysis.ageWarnings.length > 0;

  if (!hasWarnings) {
    return (
      <div className="mt-3 p-3 bg-green-50 rounded-lg border border-green-200">
        <div className="flex items-center gap-2 text-sm text-green-800">
          <Shield className="h-4 w-4" />
          No safety concerns detected for this prescription
        </div>
      </div>
    );
  }

  return (
    <div className="mt-3 space-y-3">
      <div className={`p-3 rounded-lg border ${riskLevel === 'high' ? 'bg-red-50 border-red-200' : 'bg-yellow-50 border-yellow-200'}`}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            {riskLevel === 'high' ? (
              <AlertTriangle className="h-4 w-4 text-red-600" />
            ) : (
              <AlertCircle className="h-4 w-4 text-orange-500" />
            )}
            <span className="font-medium text-sm">
              Prescription Safety Analysis - {riskLevel === 'high' ? 'High Risk' : 'Warnings Detected'}
            </span>
          </div>
          <Badge variant={riskLevel === 'high' ? 'destructive' : 'secondary'}>
            {riskLevel.toUpperCase()} RISK
          </Badge>
        </div>

        {/* Drug Interactions */}
        {analysis.interactions.length > 0 && (
          <div className="mb-3">
            <h6 className="font-medium text-sm mb-2 text-red-800">Drug Interactions:</h6>
            <div className="space-y-2">
              {analysis.interactions.map((interaction, index) => (
                <div key={index} className={`p-2 rounded border ${getSeverityColor(interaction.severity)}`}>
                  <div className="flex items-start gap-2">
                    {getSeverityIcon(interaction.severity)}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline" className="text-xs">
                          {interaction.severity.toUpperCase()}
                        </Badge>
                        <span className="text-xs font-medium">
                          {interaction.medications.join(' + ')}
                        </span>
                      </div>
                      <p className="text-xs mb-1">{interaction.description}</p>
                      <p className="text-xs font-medium text-blue-800">
                        <strong>Action:</strong> {interaction.recommendation}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Allergy Warnings */}
        {analysis.allergyWarnings.length > 0 && (
          <div className="mb-3">
            <h6 className="font-medium text-sm mb-2 text-red-800">Allergy Warnings:</h6>
            <div className="space-y-2">
              {analysis.allergyWarnings.map((warning, index) => (
                <div key={index} className={`p-2 rounded border ${getSeverityColor(warning.severity)}`}>
                  <div className="flex items-start gap-2">
                    {getSeverityIcon(warning.severity)}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline" className="text-xs">
                          ALLERGY ALERT
                        </Badge>
                        <span className="text-xs font-medium">
                          {warning.medication}
                        </span>
                      </div>
                      <p className="text-xs mb-1">
                        Patient allergic to: <strong>{warning.allergen}</strong>
                      </p>
                      <p className="text-xs font-medium text-blue-800">
                        <strong>Action:</strong> {warning.recommendation}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Contraindications */}
        {analysis.contraindications.length > 0 && (
          <div className="mb-3">
            <h6 className="font-medium text-sm mb-2 text-red-800">Contraindications:</h6>
            <div className="space-y-2">
              {analysis.contraindications.map((contra, index) => (
                <div key={index} className={`p-2 rounded border ${getSeverityColor(contra.severity)}`}>
                  <div className="flex items-start gap-2">
                    {getSeverityIcon(contra.severity)}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline" className="text-xs">
                          CONTRAINDICATION
                        </Badge>
                        <span className="text-xs font-medium">
                          {contra.medication}
                        </span>
                      </div>
                      <p className="text-xs mb-1">
                        Contraindicated with: <strong>{contra.condition}</strong>
                      </p>
                      <p className="text-xs font-medium text-blue-800">
                        <strong>Action:</strong> {contra.recommendation}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Dose Warnings */}
        {analysis.doseWarnings.length > 0 && (
          <div className="mb-3">
            <h6 className="font-medium text-sm mb-2 text-orange-800">Dosing Concerns:</h6>
            <div className="space-y-2">
              {analysis.doseWarnings.map((dose, index) => (
                <div key={index} className={`p-2 rounded border ${getSeverityColor(dose.severity)}`}>
                  <div className="flex items-start gap-2">
                    {getSeverityIcon(dose.severity)}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline" className="text-xs">
                          DOSING
                        </Badge>
                        <span className="text-xs font-medium">
                          {dose.medication}
                        </span>
                      </div>
                      <p className="text-xs mb-1">{dose.issue}</p>
                      <p className="text-xs font-medium text-blue-800">
                        <strong>Action:</strong> {dose.recommendation}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Age Warnings */}
        {analysis.ageWarnings.length > 0 && (
          <div className="mb-3">
            <h6 className="font-medium text-sm mb-2 text-orange-800">Age-Related Concerns:</h6>
            <div className="space-y-2">
              {analysis.ageWarnings.map((age, index) => (
                <div key={index} className="p-2 rounded border bg-orange-100 text-orange-800 border-orange-200">
                  <div className="flex items-start gap-2">
                    <Clock className="h-4 w-4 text-orange-600 mt-0.5" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline" className="text-xs">
                          AGE CONSIDERATION
                        </Badge>
                        <span className="text-xs font-medium">
                          {age.medication}
                        </span>
                      </div>
                      <p className="text-xs mb-1">{age.issue}</p>
                      <p className="text-xs font-medium text-blue-800">
                        <strong>Action:</strong> {age.recommendation}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}