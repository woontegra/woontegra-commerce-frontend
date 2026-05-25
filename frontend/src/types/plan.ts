export const Plan = {
  STARTER: 'STARTER',
  PRO: 'PRO',
  ENTERPRISE: 'ENTERPRISE',
} as const;

export type Plan = typeof Plan[keyof typeof Plan];

export interface PlanLimits {
  maxProducts: number;
  maxVariantsPerProduct: number;
  pageBuilderAccess: boolean;
  blogAccess: boolean;
  analyticsAccess: boolean;
  customDomain: boolean;
  prioritySupport: boolean;
}

export const PLAN_LIMITS: Record<Plan, PlanLimits> = {
  [Plan.STARTER]: {
    maxProducts: 50,
    maxVariantsPerProduct: 3,
    pageBuilderAccess: false,
    blogAccess: false,
    analyticsAccess: false,
    customDomain: false,
    prioritySupport: false,
  },
  [Plan.PRO]: {
    maxProducts: 500,
    maxVariantsPerProduct: 10,
    pageBuilderAccess: true,
    blogAccess: true,
    analyticsAccess: true,
    customDomain: false,
    prioritySupport: false,
  },
  [Plan.ENTERPRISE]: {
    maxProducts: -1, // Unlimited
    maxVariantsPerProduct: -1, // Unlimited
    pageBuilderAccess: true,
    blogAccess: true,
    analyticsAccess: true,
    customDomain: true,
    prioritySupport: true,
  },
};

export function getPlanLimits(plan: Plan): PlanLimits {
  return PLAN_LIMITS[plan];
}

export function canAccessFeature(plan: Plan, feature: keyof PlanLimits): boolean {
  const limits = getPlanLimits(plan);
  return limits[feature] as boolean;
}
