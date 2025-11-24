// components/payment-success/payment-success.component.ts
import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { CheckoutService } from '../paymentpaypal.service';
import { CartService } from '../../cart/cart.service';
@Component({
  selector: 'app-payment-success',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="success-container">
      <div class="success-card">
        <div class="success-icon">
          <i class="fas fa-check-circle"></i>
        </div>

        <h1 class="success-title">Payment Successful!</h1>
        <p class="success-message">
          Thank you for your purchase. Your order has been processed
          successfully.
        </p>

    

        <div class="action-buttons">
          <button class="btn btn-primary" (click)="continueShoping()">
            Continue Shopping
          </button>
          <button class="btn btn-secondary" (click)="viewOrders()">
            View My Orders
          </button>
        </div>

        <div class="additional-info">
          <p>
            <i class="fas fa-envelope me-2"></i>
            A confirmation email has been sent to your registered email address.
          </p>
          <p>
            <i class="fas fa-truck me-2"></i>
            Your order will be processed and shipped within 2-3 business days.
          </p>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .success-container {
        min-height: 100vh;
        display: flex;
        align-items: center;
        justify-content: center;
        background-color: #f1f3f5;
        padding: 20px;
      }

      .success-card {
        background: white;
        border-radius: 12px;
        padding: 40px;
        text-align: center;
        max-width: 600px;
        width: 100%;
        box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
        animation: slideUp 0.6s ease-out;
      }

      @keyframes slideUp {
        from {
          opacity: 0;
          transform: translateY(30px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }

      .success-icon {
        font-size: 4rem;
        color: #28a745;
        margin-bottom: 20px;
        animation: bounceIn 0.8s ease-out 0.2s both;
      }

      @keyframes bounceIn {
        0% {
          opacity: 0;
          transform: scale(0.3);
        }
        50% {
          opacity: 1;
          transform: scale(1.05);
        }
        70% {
          transform: scale(0.9);
        }
        100% {
          opacity: 1;
          transform: scale(1);
        }
      }

      .success-title {
        color: #212529;
        font-weight: 700;
        margin-bottom: 15px;
        font-size: 2.5rem;
      }

      .success-message {
        color: #6c757d;
        font-size: 1.1rem;
        margin-bottom: 30px;
        line-height: 1.6;
      }

      .order-details {
        background: #f8f9fa;
        border-radius: 8px;
        padding: 20px;
        margin: 30px 0;
        text-align: left;

        h3 {
          color: #212529;
          font-weight: 600;
          margin-bottom: 15px;
          text-align: center;
        }
      }

      .detail-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 8px 0;
        border-bottom: 1px solid #e9ecef;

        &:last-child {
          border-bottom: none;
        }

        .label {
          font-weight: 500;
          color: #495057;
        }

        .value {
          font-family: 'Courier New', monospace;
          color: #212529;
          font-weight: 600;
        }
      }

      .action-buttons {
        display: flex;
        gap: 15px;
        justify-content: center;
        margin: 30px 0;
        flex-wrap: wrap;

        .btn {
          padding: 12px 30px;
          border-radius: 6px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          transition: all 0.3s ease;
          border: none;
          cursor: pointer;

          &.btn-primary {
            background: #000;
            color: white;

            &:hover {
              background: #333;
              transform: translateY(-2px);
              box-shadow: 0 5px 15px rgba(0, 0, 0, 0.2);
            }
          }

          &.btn-secondary {
            background: #6c757d;
            color: white;

            &:hover {
              background: #5a6268;
              transform: translateY(-2px);
              box-shadow: 0 5px 15px rgba(108, 117, 125, 0.3);
            }
          }
        }
      }

      .additional-info {
        margin-top: 30px;
        padding-top: 20px;
        border-top: 1px solid #e9ecef;

        p {
          color: #6c757d;
          margin: 10px 0;
          font-size: 0.95rem;
          display: flex;
          align-items: center;
          justify-content: center;

          i {
            color: #28a745;
            margin-right: 8px;
          }
        }
      }

      @media (max-width: 576px) {
        .success-card {
          padding: 30px 20px;
        }

        .success-title {
          font-size: 2rem;
        }

        .action-buttons {
          flex-direction: column;

          .btn {
            width: 100%;
          }
        }

        .detail-row {
          flex-direction: column;
          text-align: center;
          gap: 5px;
        }
      }
    `,
  ],
})
export class PaymentSuccessComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private checkoutService = inject(CheckoutService);
  private cartService = inject(CartService);

  paymentId: string | null = null;
  transactionId: string | null = null;

  ngOnInit(): void {
    this.route.queryParams.subscribe((params) => {
      this.paymentId = params['paymentId'] || null;
      this.transactionId = params['transactionId'] || null;
      this.cartService.clearCart();
      // Handle payment success callback
      if (this.paymentId) {
        this.checkoutService.handlePaymentSuccess(
          this.paymentId,
          this.transactionId || undefined
        );
      }
    });
  }

  continueShoping(): void {
    this.router.navigate(['/']);
  }

  viewOrders(): void {
    this.router.navigate(['/orders']);
  }
}
