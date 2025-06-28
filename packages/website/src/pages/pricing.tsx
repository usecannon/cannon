'use client';

import { useState } from 'react';
import { useAccount } from 'wagmi';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Check, X, Loader2, Zap, Shield, Star } from 'lucide-react';
import { useSubscription } from '@/hooks/subscription';

export default function PricingPage() {
  const { isConnected } = useAccount();
  const {
    plans,
    userMembership,
    hasActiveMembership,
    userBalance,
    userAllowance,
    isLoading,
    error,
    purchase,
    cancel,
    formatPrice: formatSubscriptionPrice,
    calculateTotalPrice,
  } = useSubscription();

  const [purchasingPlanId, setPurchasingPlanId] = useState<number | null>(null);
  const [cancelling, setCancelling] = useState(false);

  const handlePurchase = async (planId: number, amountOfTerms: number = 1) => {
    if (!isConnected) {
      alert('Please connect your wallet to purchase a subscription');
      return;
    }

    setPurchasingPlanId(planId);
    try {
      await purchase(planId, amountOfTerms);
      alert('Subscription purchased successfully!');
    } catch (error) {
      console.error('Purchase error:', error);
      alert(
        `Failed to purchase subscription: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
    } finally {
      setPurchasingPlanId(null);
    }
  };

  const handleCancel = async () => {
    if (!isConnected) {
      alert('Please connect your wallet to cancel your subscription');
      return;
    }

    setCancelling(true);
    try {
      await cancel();
      alert('Subscription cancelled successfully!');
    } catch (error) {
      console.error('Cancel error:', error);
      alert(
        `Failed to cancel subscription: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
    } finally {
      setCancelling(false);
    }
  };

  const formatDuration = (seconds: number) => {
    const days = Math.floor(seconds / 86400);
    const months = Math.floor(days / 30);
    const years = Math.floor(months / 12);

    if (years > 0) return `${years} year${years > 1 ? 's' : ''}`;
    if (months > 0) return `${months} month${months > 1 ? 's' : ''}`;
    return `${days} day${days > 1 ? 's' : ''}`;
  };

  const getPlanIcon = (planId: number) => {
    switch (planId) {
      case 1:
        return <Zap className="h-6 w-6 text-blue-500" />;
      case 2:
        return <Shield className="h-6 w-6 text-green-500" />;
      case 3:
        return <Star className="h-6 w-6 text-purple-500" />;
      default:
        return <Zap className="h-6 w-6 text-gray-500" />;
    }
  };

  const getPlanName = (planId: number) => {
    switch (planId) {
      case 1:
        return 'Starter';
      case 2:
        return 'Professional';
      case 3:
        return 'Enterprise';
      default:
        return `Plan ${planId}`;
    }
  };

  /*if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="ml-2">Loading pricing information...</span>
        </div>
      </div>
    );
  }*/

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Alert variant="destructive">
          <AlertDescription>
            Failed to load pricing information: {error}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold mb-4">Choose Your Plan</h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          Get access to Cannon's powerful deployment infrastructure with
          flexible subscription plans
        </p>
      </div>

      {/* Current Membership Status */}
      {isConnected && hasActiveMembership && userMembership && (
        <div className="mb-8">
          <Card className="border-green-200 bg-green-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Check className="h-5 w-5 text-green-600" />
                Active Subscription
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Current Plan</p>
                  <p className="font-semibold">
                    {getPlanName(userMembership.planId)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">
                    Available Credits
                  </p>
                  <p className="font-semibold">
                    {userMembership.availableCredits}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Expires</p>
                  <p className="font-semibold">
                    {new Date(
                      userMembership.activeUntil * 1000
                    ).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <div className="mt-4">
                <Button
                  variant="outline"
                  onClick={handleCancel}
                  disabled={cancelling}
                  className="text-red-600 border-red-200 hover:bg-red-50"
                >
                  {cancelling ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Cancelling...
                    </>
                  ) : (
                    'Cancel Subscription'
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Wallet Connection Notice */}
      {!isConnected && (
        <div className="mb-8">
          <Alert>
            <AlertDescription>
              Connect your wallet to view personalized pricing and purchase
              subscriptions.
            </AlertDescription>
          </Alert>
        </div>
      )}

      {/* Pricing Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
        {plans.map((plan) => {
          const isCurrentPlan = userMembership?.planId === plan.id;
          const isPurchasing = purchasingPlanId === plan.id;
          const monthlyPrice = formatSubscriptionPrice(plan.price, 6);
          const yearlyPrice = formatSubscriptionPrice(
            calculateTotalPrice(plan.price, 12),
            6
          );

          return (
            <Card
              key={plan.id}
              className={`relative ${
                isCurrentPlan
                  ? 'border-green-500 bg-green-50'
                  : 'hover:shadow-lg transition-shadow'
              }`}
            >
              {isCurrentPlan && (
                <Badge className="absolute -top-2 left-1/2 transform -translate-x-1/2 bg-green-600">
                  Current Plan
                </Badge>
              )}

              <CardHeader className="text-center">
                <div className="flex justify-center mb-2">
                  {getPlanIcon(plan.id)}
                </div>
                <CardTitle className="text-2xl">
                  {getPlanName(plan.id)}
                </CardTitle>
                <CardDescription>
                  {plan.quota} credits per {formatDuration(plan.duration)}
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-6">
                {/* Pricing */}
                <div className="text-center">
                  <div className="text-3xl font-bold">
                    ${monthlyPrice}
                    <span className="text-sm font-normal text-muted-foreground">
                      /term
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    ${yearlyPrice} for 12 terms
                  </p>
                </div>

                {/* Features */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-600" />
                    <span className="text-sm">
                      {plan.quota} deployment credits
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-600" />
                    <span className="text-sm">
                      {formatDuration(plan.duration)} term duration
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-600" />
                    <span className="text-sm">Min {plan.minTerms} terms</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-600" />
                    <span className="text-sm">Max {plan.maxTerms} terms</span>
                  </div>
                  {plan.refundable && (
                    <div className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-green-600" />
                      <span className="text-sm">
                        Refundable on cancellation
                      </span>
                    </div>
                  )}
                </div>

                {/* Action Button */}
                <div className="pt-4">
                  {isCurrentPlan ? (
                    <Button disabled className="w-full bg-green-600">
                      Current Plan
                    </Button>
                  ) : (
                    <Button
                      onClick={() => handlePurchase(plan.id, plan.minTerms)}
                      disabled={!isConnected || isPurchasing || !plan.active}
                      className="w-full"
                    >
                      {isPurchasing ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          Purchasing...
                        </>
                      ) : !plan.active ? (
                        'Unavailable'
                      ) : (
                        `Subscribe for $${formatSubscriptionPrice(
                          calculateTotalPrice(plan.price, plan.minTerms),
                          6
                        )}`
                      )}
                    </Button>
                  )}
                </div>

                {/* Balance Warning */}
                {isConnected &&
                  userBalance <
                    calculateTotalPrice(plan.price, plan.minTerms) && (
                    <div className="text-xs text-red-600 text-center">
                      Insufficient USDC balance
                    </div>
                  )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Additional Information */}
      <div className="mt-16 text-center">
        <h2 className="text-2xl font-bold mb-4">How It Works</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
          <div>
            <div className="bg-blue-100 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-blue-600 font-bold">1</span>
            </div>
            <h3 className="font-semibold mb-2">Choose Your Plan</h3>
            <p className="text-muted-foreground">
              Select a subscription plan that fits your support and deployment
              needs
            </p>
          </div>
          <div>
            <div className="bg-blue-100 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-blue-600 font-bold">2</span>
            </div>
            <h3 className="font-semibold mb-2">Purchase with USDC</h3>
            <p className="text-muted-foreground">
              Pay for your subscription using USDC tokens
            </p>
          </div>
          <div>
            <div className="bg-blue-100 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-blue-600 font-bold">3</span>
            </div>
            <h3 className="font-semibold mb-2">Use your Plan</h3>
            <p className="text-muted-foreground">
              Once you complete your purchase, the benefits of your plan will be
              automatically applied to your account.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
