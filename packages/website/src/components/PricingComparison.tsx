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
import { Check, Loader2, Zap, Shield, Star } from 'lucide-react';
import { useSubscription, SubscriptionPlan } from '@/hooks/subscription';

interface PricingComparisonProps {
  showPurchaseButtons?: boolean;
  compact?: boolean;
  maxPlans?: number;
}

export function PricingComparison({
  showPurchaseButtons = true,
  compact = false,
  maxPlans = 3,
}: PricingComparisonProps) {
  const { isConnected } = useAccount();
  const {
    plans,
    userMembership,
    hasActiveMembership,
    userBalance,
    isLoading,
    purchase,
    formatPrice: formatSubscriptionPrice,
    calculateTotalPrice,
  } = useSubscription();

  const [purchasingPlanId, setPurchasingPlanId] = useState<number | null>(null);

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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin" />
        <span className="ml-2">Loading plans...</span>
      </div>
    );
  }

  const displayPlans = plans.slice(0, maxPlans);

  return (
    <div
      className={`grid gap-6 ${
        compact
          ? 'grid-cols-1 md:grid-cols-3'
          : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
      }`}
    >
      {displayPlans.map((plan) => {
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
            } ${compact ? 'p-4' : ''}`}
          >
            {isCurrentPlan && (
              <Badge className="absolute -top-2 left-1/2 transform -translate-x-1/2 bg-green-600">
                Current Plan
              </Badge>
            )}

            <CardHeader className={`text-center ${compact ? 'pb-2' : ''}`}>
              <div className="flex justify-center mb-2">
                {getPlanIcon(plan.id)}
              </div>
              <CardTitle className={compact ? 'text-lg' : 'text-2xl'}>
                {getPlanName(plan.id)}
              </CardTitle>
              <CardDescription>
                {plan.quota} credits per {formatDuration(plan.duration)}
              </CardDescription>
            </CardHeader>

            <CardContent
              className={`space-y-4 ${compact ? 'pt-0' : 'space-y-6'}`}
            >
              {/* Pricing */}
              <div className="text-center">
                <div
                  className={`font-bold ${compact ? 'text-2xl' : 'text-3xl'}`}
                >
                  ${monthlyPrice}
                  <span className="text-sm font-normal text-muted-foreground">
                    /term
                  </span>
                </div>
                {!compact && (
                  <p className="text-sm text-muted-foreground">
                    ${yearlyPrice} for 12 terms
                  </p>
                )}
              </div>

              {/* Features */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-600" />
                  <span className="text-sm">
                    {plan.quota} deployment credits
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-600" />
                  <span className="text-sm">
                    {formatDuration(plan.duration)} term
                  </span>
                </div>
                {!compact && (
                  <>
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
                        <span className="text-sm">Refundable</span>
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Action Button */}
              {showPurchaseButtons && (
                <div className="pt-2">
                  {isCurrentPlan ? (
                    <Button disabled className="w-full bg-green-600">
                      Current Plan
                    </Button>
                  ) : (
                    <Button
                      onClick={() => handlePurchase(plan.id, plan.minTerms)}
                      disabled={!isConnected || isPurchasing || !plan.active}
                      className="w-full"
                      size={compact ? 'sm' : 'default'}
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
              )}

              {/* Balance Warning */}
              {showPurchaseButtons &&
                isConnected &&
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
  );
}
