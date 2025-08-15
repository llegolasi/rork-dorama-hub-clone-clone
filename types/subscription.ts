export interface SubscriptionPlan {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  duration_months: number;
  features: string[];
  is_popular: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserSubscription {
  id: string;
  user_id: string;
  plan_id: string;
  status: 'active' | 'cancelled' | 'expired' | 'pending';
  started_at: string;
  expires_at: string;
  payment_method?: string;
  transaction_id?: string;
  created_at: string;
  updated_at: string;
}

export interface SubscriptionWithPlan extends UserSubscription {
  plan: SubscriptionPlan;
}

export interface PaymentMethod {
  id: string;
  type: 'credit_card' | 'debit_card' | 'pix' | 'paypal';
  name: string;
  icon: string;
}