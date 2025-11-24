// shared/models/payment.models.ts

export interface ApiResponse<T = any> {
  isSuccess: boolean;
  data?: T;
  message?: string;
  errors?: string[];
}

export interface PaymentResponse {
  id: string;
  status: string;
  amount: number;
  currency: string;
  transactionId?: string;
  approvalUrl?: string;
  createdAt: Date;
}

export interface PayPalCreatePaymentDto {
  amount: number;
  currency: string;
  description: string;
  returnUrl?: string;
  cancelUrl?: string;
  items?: PaymentItem[];
  shippingAddress?: ShippingAddress;
}

export interface PayPalExecutePaymentDto {
  paymentId: string;
  payerId: string;
}

export interface PayPalRefundDto {
  transactionId: string;
  amount?: number;
}

export interface PaymentItem {
  name: string;
  description?: string;
  quantity: number;
  price: number;
  sku?: string;
}

export interface ShippingAddress {
  recipientName: string;
  line1: string;
  line2?: string;
  city: string;
  countryCode: string; // Must be ISO country code (EG, AE, SA, etc.)
  postalCode?: string;
  phone?: string;
}

export interface BillingAddress {
  firstName: string;
  lastName: string;
  email: string;
  country: string; // Full country name
  addressLine1: string;
  addressLine2?: string;
  city: string;
  zipCode?: string;
  phone: string;
}

export interface OrderSummary {
  items: CartItem[];
  itemsTotal: number;
  shipping: number;
  total: number;
}

export interface CartItem {
  id: string;
  name: string;
  image: string;
  size: string;
  color: string;
  quantity: number;
  price: number;
  total: number;
}

export interface CheckoutData {
  billingAddress: BillingAddress;
  shippingAddress?: ShippingAddress;
  sameAsbilling: boolean;
  shippingMethod: string;
  paymentMethod: PaymentMethod;
  orderSummary: OrderSummary;
}

export enum PaymentMethod {
  PAYPAL = 'paypal',
  CASH_ON_DELIVERY = 'cod',
  CREDIT_CARD = 'card',
}

export enum PaymentStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  REFUNDED = 'refunded',
}

export interface PaymentCreateDto {
  amount: number;
  currency: string;
  description: string;
  paymentMethod: PaymentMethod;
  billingAddress: BillingAddress;
  shippingAddress?: ShippingAddress;
  items: PaymentItem[];
}

// Additional interfaces for better error handling
export interface ValidationError {
  field: string;
  message: string;
}

export interface PayPalError {
  name: string;
  message: string;
  information_link?: string;
  details?: any[];
}
