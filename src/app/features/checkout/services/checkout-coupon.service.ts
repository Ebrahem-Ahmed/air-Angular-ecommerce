// checkout/services/checkout-coupon.service.ts
import { Injectable, inject } from '@angular/core';
import { Observable, of } from 'rxjs';
import { map, catchError, finalize, tap } from 'rxjs/operators';

import { CheckoutService } from '../../../core/services/checkout.service';
import { CartService } from '../../../features/cart/cart.service';
import { CouponService } from '../../../core/services/coupon.service';

export interface CouponResult {
  discountApplied: number;
  totalAmount: number;
  couponCode: string;
  summary?: any;
  originalAmount?: number;
}

@Injectable({
  providedIn: 'root',
})
export class CheckoutCouponService {
  private checkoutService = inject(CheckoutService);
  private cartService = inject(CartService);
  private couponService = inject(CouponService);

  // Coupon/Promo Code Properties
  promoCode = '';
  isApplyingCoupon = false;
  couponApplied = false;
  couponError = '';
  couponDiscount = 0;
  showPromoSection = false;
  appliedCouponCode = '';
  discountAmount = 0;

  // Store the original and discounted totals
  private originalSummary: any = null;
  private discountedSummary: any = null;
  private calculatedDiscount = 0;

  togglePromoSection(): void {
    this.showPromoSection = !this.showPromoSection;
  }

  /**
   * Apply coupon using the calculateCouponDiscount endpoint
   * This shows the discount in UI before order creation
   */
  applyCoupon(): Observable<CouponResult> {
    return new Observable((observer) => {
      if (!this.promoCode || !this.promoCode.trim()) {
        this.couponError = 'Please enter a promo code';
        observer.error(new Error(this.couponError));
        return;
      }

      const trimmedCode = this.promoCode.trim().toUpperCase();
      if (!this.isValidCouponFormat(trimmedCode)) {
        this.couponError = 'Invalid promo code format';
        observer.error(new Error(this.couponError));
        return;
      }

      this.couponError = '';
      this.isApplyingCoupon = true;

      // Get current cart total - ensure it's a proper number
      const currentTotal = this.getCurrentCartTotal();

      // Validate the total before making API call
      if (currentTotal <= 0) {
        this.couponError =
          'Cart total must be greater than zero to apply coupon';
        this.isApplyingCoupon = false;
        observer.error(new Error(this.couponError));
        return;
      }

      console.log('Applying coupon with total:', currentTotal);

      // Use the coupon service to calculate discount
      this.couponService
        .calculateCouponDiscount(trimmedCode, currentTotal)
        .pipe(
          finalize(() => (this.isApplyingCoupon = false)),
          catchError((error) => {
            console.error('Coupon calculation API error:', error);

            // Handle different types of API errors
            if (error.status === 0) {
              throw new Error(
                'Unable to connect to server. Please check your connection.'
              );
            } else if (error.status === 404) {
              throw new Error(
                'Coupon service not found. Please contact support.'
              );
            } else if (
              error.error &&
              typeof error.error === 'string' &&
              error.error.includes('<!DOCTYPE')
            ) {
              throw new Error(
                'Service temporarily unavailable. Please try again later.'
              );
            } else if (error.error?.message) {
              throw new Error(error.error.message);
            } else if (
              error.message &&
              error.message.includes('Http failure during parsing')
            ) {
              throw new Error('Invalid coupon code or service error');
            } else {
              throw new Error('Failed to validate coupon. Please try again.');
            }
          })
        )
        .subscribe({
          next: (response) => {
            console.log('Coupon calculation response:', response);

            if (response.success && response.data) {
              const result: CouponResult = {
                discountApplied: response.data.discountAmount,
                totalAmount: response.data.finalAmount,
                couponCode: trimmedCode,
                originalAmount: response.data.orderAmount,
              };

              this.handleCouponSuccess(result);
              observer.next(result);
              observer.complete();
            } else {
              const error = new Error(
                response.message || 'Invalid coupon code'
              );
              this.handleCouponError(error);
              observer.error(error);
            }
          },
          error: (error) => {
            this.handleCouponError(error);
            observer.error(error);
          },
        });
    });
  }

  /**
   * Get current cart total for coupon calculation - ensure it's a valid number
   */
  private getCurrentCartTotal(): number {
    let total = 0;

    // Try to get from original summary first
    if (
      this.originalSummary?.totalAmount &&
      typeof this.originalSummary.totalAmount === 'number'
    ) {
      total = this.originalSummary.totalAmount;
    } else if (
      this.originalSummary?.subtotal &&
      typeof this.originalSummary.subtotal === 'number'
    ) {
      total = this.originalSummary.subtotal;
    } else {
      // Fallback to cart service
      const cartSummary = this.cartService.cartSummary();
      total = cartSummary?.subtotal || 0;
    }

    // Ensure we return a valid positive number
    return typeof total === 'number' && total > 0 ? total : 0;
  }

  private isValidCouponFormat(code: string): boolean {
    const couponRegex = /^[A-Z0-9]{3,20}$/;
    return couponRegex.test(code);
  }

  private handleCouponSuccess(result: CouponResult): void {
    this.couponApplied = true;
    this.couponDiscount = result.discountApplied || 0;
    this.appliedCouponCode = result.couponCode;
    this.discountAmount = this.couponDiscount;
    this.calculatedDiscount = this.couponDiscount;

    // Store the calculated values for UI display
    this.discountedSummary = {
      ...this.originalSummary,
      totalAmount: result.totalAmount,
      discountApplied: result.discountApplied,
      originalAmount: result.originalAmount,
    };

    this.checkoutService.setCouponCode(this.appliedCouponCode);

    this.logCouponAnalytics('coupon_applied', {
      couponCode: this.appliedCouponCode,
      discountAmount: this.couponDiscount,
      originalTotal: result.originalAmount,
      newTotal: result.totalAmount,
      actualSavings: this.couponDiscount,
    });

    console.log('Coupon applied successfully:', {
      code: this.appliedCouponCode,
      discount: this.couponDiscount,
      originalTotal: result.originalAmount,
      newTotal: result.totalAmount,
    });
  }

  private handleCouponError(error: any): void {
    this.couponApplied = false;
    this.couponDiscount = 0;
    this.appliedCouponCode = '';
    this.discountAmount = 0;
    this.calculatedDiscount = 0;
    this.discountedSummary = null;

    let errorMessage = 'Invalid promo code';

    if (error?.message) {
      errorMessage = error.message;
    } else if (typeof error === 'string') {
      errorMessage = error;
    } else if (error?.error?.message) {
      errorMessage = error.error.message;
    }

    this.couponError = errorMessage;

    this.logCouponAnalytics('coupon_failed', {
      couponCode: this.promoCode,
      errorMessage: errorMessage,
      errorDetails: error,
    });

    console.error('Coupon application failed:', error);
  }

  removeCoupon(): void {
    this.couponApplied = false;
    this.couponDiscount = 0;
    this.discountAmount = 0;
    this.calculatedDiscount = 0;
    this.appliedCouponCode = '';
    this.promoCode = '';
    this.couponError = '';

    // Reset summaries
    this.discountedSummary = null;

    this.checkoutService.setCouponCode('');
    this.logCouponAnalytics('coupon_removed');

    console.log('Coupon removed');
  }

  getCouponCode(): string {
    return this.couponApplied ? this.appliedCouponCode : '';
  }

  getDiscountAmount(): number {
    return this.discountAmount;
  }

  isCouponApplied(): boolean {
    return this.couponApplied;
  }

  /**
   * Get the current total (with or without discount)
   * This now uses the calculated discount for immediate UI feedback
   */
  getCurrentTotal(): number {
    const originalTotal = this.getCurrentCartTotal();

    if (this.couponApplied && this.calculatedDiscount > 0) {
      return Math.max(0, originalTotal - this.calculatedDiscount);
    }

    return originalTotal;
  }

  /**
   * Get the original total before any discounts
   */
  getOriginalTotal(): number {
    return this.getCurrentCartTotal();
  }

  /**
   * Get the current summary (with discount applied if any)
   */
  getCurrentSummary(): any {
    if (this.couponApplied && this.discountedSummary) {
      return this.discountedSummary;
    }
    return this.originalSummary;
  }

  /**
   * Get calculated discount for immediate UI display
   */
  getCalculatedDiscount(): number {
    return this.calculatedDiscount;
  }

  resetCouponState(): void {
    this.promoCode = '';
    this.isApplyingCoupon = false;
    this.couponApplied = false;
    this.couponError = '';
    this.couponDiscount = 0;
    this.showPromoSection = false;
    this.appliedCouponCode = '';
    this.discountAmount = 0;
    this.calculatedDiscount = 0;

    // Reset summaries
    this.originalSummary = null;
    this.discountedSummary = null;
  }

  /**
   * Initialize with current cart state
   */
  initializeCouponService(): void {
    // First try to get from checkout service
    this.checkoutService.getCheckoutSummary().subscribe({
      next: (summary) => {
        this.originalSummary = summary;
        console.log(
          'Coupon service initialized with original summary:',
          summary
        );
      },
      error: (error) => {
        console.error(
          'Failed to get checkout summary, using cart summary:',
          error
        );
        // Fallback to cart summary
        const cartSummary = this.cartService.cartSummary();
        this.originalSummary = {
          totalAmount: cartSummary.subtotal,
          subtotal: cartSummary.subtotal,
          currency: cartSummary.currency,
        };
        console.log('Fallback to cart summary:', this.originalSummary);
      },
    });
  }

  /**
   * Apply the already validated coupon to the actual order
   * This method is called after order creation during checkout
   */
  applyCouponToOrder(orderId: string): Observable<any> {
    if (!this.couponApplied || !this.appliedCouponCode) {
      return of(null);
    }

    return this.couponService
      .applyValidatedCouponToOrder(orderId, this.appliedCouponCode)
      .pipe(
        tap((response) => {
          if (response?.success) {
            console.log('Coupon successfully applied to order:', orderId);
          }
        }),
        catchError((error) => {
          console.error('Failed to apply coupon to order:', error);
          // Don't fail the checkout process, just log the error
          return of(null);
        })
      );
  }

  /**
   * Validate if cart has items and total is valid for coupon application
   */
  canApplyCoupon(): boolean {
    const total = this.getCurrentCartTotal();
    const hasItems = this.cartService.cartItems().length > 0;

    return hasItems && total > 0;
  }

  /**
   * Get validation message for why coupon can't be applied
   */
  getCouponValidationMessage(): string {
    if (this.cartService.cartItems().length === 0) {
      return 'Add items to your cart before applying a coupon';
    }

    const total = this.getCurrentCartTotal();
    if (total <= 0) {
      return 'Cart total must be greater than zero to apply coupon';
    }

    return '';
  }

  private logCouponAnalytics(event: string, data?: any): void {
    const analyticsData = {
      event,
      timestamp: new Date().toISOString(),
      cartItemsCount: this.cartService.cartItems().length,
      cartTotal: this.getCurrentCartTotal(),
      ...data,
    };

    console.log('Coupon Analytics:', analyticsData);
  }
}
