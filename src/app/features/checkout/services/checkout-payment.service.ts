// checkout/services/checkout-payment.service.ts
import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { Observable } from 'rxjs';
import { finalize } from 'rxjs/operators';

import {
  CheckoutService,
  CheckoutProcessResponse,
} from '../../../core/services/checkout.service';
import { CartService } from '../../../features/cart/cart.service';
import { PaymentMethod } from '../../../core/services/payment.service';

export interface CheckoutContext {
  orderId?: string;
  paymentId?: string;
  guestUserId?: string | null;
  guestEmail?: string | null;
  timestamp: string;
  paymentMethod: string;
}

@Injectable({
  providedIn: 'root',
})
export class CheckoutPaymentService {
  private checkoutService = inject(CheckoutService);
  private cartService = inject(CartService);
  private router = inject(Router);

  selectedPaymentMethod: PaymentMethod = PaymentMethod.CashOnDelivery;
  isProcessingPayment = false;

  onPaymentMethodSelected(method: PaymentMethod): void {
    this.selectedPaymentMethod = method;
    this.checkoutService.setPaymentMethod(method);

    this.logPaymentAnalytics('payment_method_selected', {
      paymentMethod: method,
    });
  }

  handleCheckoutSuccess(
    response: CheckoutProcessResponse,
    isGuestUser: boolean,
    guestUserId?: string
  ): void {
    console.log('Checkout response received:', response);

    if (!response) {
      throw new Error('Invalid checkout response received');
    }

    if (!response.success) {
      throw new Error(response.message || 'Checkout failed');
    }

    // Store guest user ID if provided by the API
    if (response.guestUserId && isGuestUser && guestUserId) {
      try {
        localStorage.setItem('guest_user_id', response.guestUserId);
        console.log(
          'Updated guest user ID from API response:',
          response.guestUserId
        );
      } catch (error) {
        console.warn('Failed to store guest user ID:', error);
      }
    }

    const paymentMethod = (response.paymentMethod || '').toLowerCase();

    switch (paymentMethod) {
      case 'paypal':
        this.handlePayPalPayment(response);
        break;
      case 'cash on delivery':
      case 'cod':
        this.handleCODPayment(response, isGuestUser);
        break;
      default:
        console.warn('Unknown payment method in response:', paymentMethod);
        if (
          response.approvalUrl ||
          response.approval_url ||
          response.redirectUrl
        ) {
          this.handlePayPalPayment(response);
        } else {
          throw new Error(
            'Unknown payment method: ' + (response.paymentMethod || 'undefined')
          );
        }
    }
  }

  private handlePayPalPayment(response: CheckoutProcessResponse): void {
    console.log('Processing PayPal payment response:', response);

    const approvalUrl = this.extractApprovalUrl(response);
    console.log('Extracted approval URL:', approvalUrl);

    if (approvalUrl && this.isValidUrl(approvalUrl)) {
      console.log('Redirecting to PayPal:', approvalUrl);

      this.logPaymentAnalytics('paypal_redirect_initiated', {
        approvalUrl: approvalUrl,
        orderId: response.orderId,
        paymentId: response.paymentId,
      });

      this.storeCheckoutContext(response);
      window.location.href = approvalUrl;
    } else {
      console.error('Invalid or missing PayPal approval URL in response:', {
        response,
        approvalUrl,
        responseKeys: Object.keys(response),
      });

      throw new Error(
        'PayPal payment setup failed. The payment service did not provide a valid redirect URL.'
      );
    }
  }

  private extractApprovalUrl(response: CheckoutProcessResponse): string | null {
    return (
      response.approvalUrl ||
      response.approval_url ||
      response.redirectUrl ||
      response.redirect_url ||
      response.paypalUrl ||
      response.paymentUrl ||
      (response as any)['ApprovalUrl'] ||
      (response as any)['Approval_Url'] ||
      (response as any)['RedirectUrl'] ||
      (response as any)['PaypalUrl'] ||
      null
    );
  }

  private handleCODPayment(
    response: CheckoutProcessResponse,
    isGuestUser: boolean
  ): void {
    console.log('Processing COD payment success');

    this.cartService.clearCart().subscribe({
      next: () => {
        console.log('Cart cleared after successful COD payment');
        this.navigateToSuccess(response, 'COD', isGuestUser);
      },
      error: (cartError) => {
        console.error(
          'Failed to clear cart, but payment was successful:',
          cartError
        );
        this.navigateToSuccess(response, 'COD', isGuestUser);
      },
    });
  }

  executePayPalPayment(paymentId: string, payerId: string): Observable<any> {
    this.isProcessingPayment = true;

    return this.checkoutService
      .executePayPalPayment(paymentId, payerId)
      .pipe(finalize(() => (this.isProcessingPayment = false)));
  }

  private storeCheckoutContext(response: CheckoutProcessResponse): void {
    try {
      const checkoutContext: CheckoutContext = {
        orderId: response.orderId,
        paymentId: response.paymentId,
        timestamp: new Date().toISOString(),
        paymentMethod: 'PayPal',
      };

      sessionStorage.setItem(
        'paypal_checkout_context',
        JSON.stringify(checkoutContext)
      );
      console.log('Stored PayPal checkout context:', checkoutContext);
    } catch (error) {
      console.warn('Failed to store checkout context:', error);
    }
  }

  private navigateToSuccess(
    response: CheckoutProcessResponse,
    method: string,
    isGuestUser: boolean,
    guestEmail?: string
  ): void {
    this.router.navigate(['/payment/success'], {
      queryParams: {
        paymentId: response.paymentId,
        orderId: response.orderId,
        method,
        isGuest: isGuestUser,
        guestEmail: isGuestUser ? guestEmail : undefined,
      },
    });
  }

  private isValidUrl(url: string): boolean {
    try {
      const urlObj = new URL(url);
      return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
    } catch {
      return false;
    }
  }

  isPayPalSelected(): boolean {
    return this.selectedPaymentMethod === PaymentMethod.PayPal;
  }

  isCODSelected(): boolean {
    return (
      this.selectedPaymentMethod === PaymentMethod.CashOnDelivery ||
      this.selectedPaymentMethod === PaymentMethod.COD
    );
  }

  private logPaymentAnalytics(event: string, data?: any): void {
    const analyticsData = {
      event,
      timestamp: new Date().toISOString(),
      paymentMethod: this.selectedPaymentMethod,
      ...data,
    };

    console.log('Payment Analytics:', analyticsData);
  }
}
