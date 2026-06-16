import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Crown, Users, Calendar, CreditCard } from "lucide-react";
import { LoadingSpinner } from "@/components/common/loading-spinner";
import type { Subscription } from "@/types";

export function SubscriptionStatus() {
  const { data: subscription, isLoading, error } = useQuery<Subscription>({
    queryKey: ["/api/subscription"],
  });

  if (isLoading) {
    return (
      <Card className="medical-gradient text-white">
        <CardContent className="p-6 flex items-center justify-center">
          <LoadingSpinner className="text-white" />
        </CardContent>
      </Card>
    );
  }

  if (error || !subscription) {
    return (
      <Card className="bg-neutral-100">
        <CardContent className="p-6">
          <div className="text-center">
            <CreditCard className="h-8 w-8 text-neutral-400 mx-auto mb-2" />
            <p className="text-sm text-neutral-600">Subscription info unavailable</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const formatNextBilling = () => {
    if (subscription.status === 'trial' && subscription.trialEndsAt) {
      return new Date(subscription.trialEndsAt).toLocaleDateString();
    }
    if (subscription.nextBillingAt) {
      return new Date(subscription.nextBillingAt).toLocaleDateString();
    }
    return "—";
  };

  const getStatusColor = () => {
    switch (subscription.status) {
      case "active":
        return "medical-gradient";
      case "trial":
        return "bg-blue-600";
      case "suspended":
        return "bg-yellow-600";
      case "cancelled":
        return "bg-red-600";
      default:
        return "bg-neutral-600";
    }
  };

  return (
    <Card className={`${getStatusColor()} text-white`}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Subscription Status</h3>
          <Crown className="h-5 w-5 text-yellow-300" />
        </div>
        
        <div className="space-y-3">
          <div>
            <p className="text-blue-100 text-sm">Current Plan</p>
            <p className="font-semibold capitalize">{subscription.plan}</p>
          </div>
          
          <div>
            <p className="text-blue-100 text-sm">Active Users</p>
            <div className="flex items-center space-x-2">
              <Users className="h-4 w-4" />
              <span className="font-semibold">
                {subscription.currentUsers} / {subscription.userLimit}
              </span>
            </div>
          </div>
          
          <div>
            <p className="text-blue-100 text-sm">
              {subscription.status === 'trial' ? 'Trial Ends' : 'Next Billing'}
            </p>
            <div className="flex items-center space-x-2">
              <Calendar className="h-4 w-4" />
              <span className="font-semibold">{formatNextBilling()}</span>
            </div>
          </div>
          
          {subscription.monthlyPrice && (
            <div>
              <p className="text-blue-100 text-sm">Monthly Cost</p>
              <p className="font-semibold">£{subscription.monthlyPrice}</p>
            </div>
          )}
          
          <Button 
            variant="secondary" 
            className="w-full bg-white text-medical-blue hover:bg-blue-50 mt-4"
          >
            Manage Subscription
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
