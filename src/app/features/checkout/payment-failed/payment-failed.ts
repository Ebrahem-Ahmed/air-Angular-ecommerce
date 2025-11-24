import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { CheckoutService } from '../paymentpaypal.service';

// components/payment-failed/payment-failed.component.ts
@Component({
  selector: 'app-payment-failed',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="error-container">
      <div class="error-card">
        <div class="error-icon">
          <i class="fas fa-times-circle"></i>
        </div>

        <h1 class="error-title">Payment Failed</h1>
        <p class="error-message">
          Sorry, we couldn't process your payment. Please try again or use a
          different payment method.
        </p>

        <div class="error-details" *ngIf="errorMessage">
          <h3>Error Details</h3>
          <p>{{ errorMessage }}</p>
        </div>

        <div class="action-buttons">
          <button class="btn btn-primary" (click)="retryPayment()">
            Try Again
          </button>
          <button class="btn btn-secondary" (click)="goToCart()">
            Back to Cart
          </button>
        </div>

        <div class="help-section">
          <p>
            <i class="fas fa-question-circle me-2"></i>
            Need help?
            <a href="/contact" class="help-link">Contact our support team</a>
          </p>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .error-container {
        min-height: 100vh;
        display: flex;
        align-items: center;
        justify-content: center;
        background: linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%);
        padding: 20px;
      }

      .error-card {
        background: white;
        border-radius: 12px;
        padding: 40px;
        text-align: center;
        max-width: 600px;
        width: 100%;
        box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
        animation: slideUp 0.6s ease-out;
      }

      .error-icon {
        font-size: 4rem;
        color: #dc3545;
        margin-bottom: 20px;
        animation: shake 0.8s ease-out;
      }

      @keyframes shake {
        0%,
        100% {
          transform: translateX(0);
        }
        25% {
          transform: translateX(-10px);
        }
        75% {
          transform: translateX(10px);
        }
      }

      .error-title {
        color: #212529;
        font-weight: 700;
        margin-bottom: 15px;
        font-size: 2.5rem;
      }

      .error-message {
        color: #6c757d;
        font-size: 1.1rem;
        margin-bottom: 30px;
        line-height: 1.6;
      }

      .error-details {
        background: #f8f9fa;
        border-left: 4px solid #dc3545;
        border-radius: 4px;
        padding: 20px;
        margin: 30px 0;
        text-align: left;

        h3 {
          color: #dc3545;
          font-weight: 600;
          margin-bottom: 10px;
        }

        p {
          color: #495057;
          margin: 0;
          font-family: 'Courier New', monospace;
          font-size: 0.9rem;
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
            background: #dc3545;
            color: white;

            &:hover {
              background: #c82333;
              transform: translateY(-2px);
              box-shadow: 0 5px 15px rgba(220, 53, 69, 0.3);
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

      .help-section {
        margin-top: 30px;
        padding-top: 20px;
        border-top: 1px solid #e9ecef;

        p {
          color: #6c757d;
          font-size: 0.95rem;
          display: flex;
          align-items: center;
          justify-content: center;

          i {
            color: #ffc107;
            margin-right: 8px;
          }
        }

        .help-link {
          color: #007bff;
          text-decoration: none;
          font-weight: 500;

          &:hover {
            text-decoration: underline;
          }
        }
      }

      @media (max-width: 576px) {
        .error-card {
          padding: 30px 20px;
        }

        .error-title {
          font-size: 2rem;
        }

        .action-buttons {
          flex-direction: column;

          .btn {
            width: 100%;
          }
        }
      }
    `,
  ],
})
export class PaymentFailedComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private checkoutService = inject(CheckoutService);

  errorMessage: string | null = null;

  ngOnInit(): void {
    this.route.queryParams.subscribe((params) => {
      this.errorMessage = this.getErrorMessage(params['error']);

      // Handle payment failure callback
      if (params['error']) {
        this.checkoutService.handlePaymentFailure(params['error']);
      }
    });
  }

  private getErrorMessage(errorCode: string): string {
    const errorMessages: { [key: string]: string } = {
      missing_parameters: 'Missing required payment parameters',
      execution_failed: 'Payment execution failed',
      server_error: 'Internal server error occurred',
      cancelled: 'Payment was cancelled by user',
      invalid_payment: 'Invalid payment information',
      insufficient_funds: 'Insufficient funds',
      expired_session: 'Payment session expired',
    };

    return (
      errorMessages[errorCode] ||
      'An unknown error occurred during payment processing'
    );
  }

  retryPayment(): void {
    this.router.navigate(['/checkout']);
  }

  goToCart(): void {
    this.router.navigate(['/cart']);
  }
}
