// components/order-details.component.ts
import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import {
  OrderService,
  Order,
  OrderStatus,
  OrderTrackingInfo,
} from '../../../core/services/order.service';

@Component({
  selector: 'app-order-details',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="container">
      <!-- Breadcrumb -->
      <div class="breadcrumb">
        <a routerLink="/">Home</a> / <a routerLink="/orders">My Account</a> /
        <span>Order History</span>
      </div>

      <!-- Loading State -->
      <div *ngIf="loading()" class="loading">
        <div class="loading-spinner"></div>
        <p>Loading order details...</p>
      </div>

      <!-- Error State -->
      <div *ngIf="error() && !loading()" class="error">
        <p>{{ error() }}</p>
        <button (click)="loadOrderDetails()" class="retry-button">
          Try Again
        </button>
      </div>

      <!-- Order Details -->
      <div *ngIf="order() && !loading() && !error()">
        <h1 class="page-title">ORDER DETAILS</h1>

        <!-- Order Information Card -->
        <div class="order-info-card">
          <div class="info-grid">
            <div class="info-item">
              <label>Order Number:</label>
              <span>{{ order()?.orderNumber }}</span>
            </div>
            <div class="info-item">
              <label>Order Date:</label>
              <span>{{ formatDate(order()?.orderDate || '') }}</span>
            </div>
            <div class="info-item">
              <label>Shipped Address:</label>
              <div class="address-text">{{ getShippingAddress() }}</div>
            </div>
            <div class="info-item">
              <label>Shipped Method:</label>
              <span>Standard Shipping</span>
            </div>
            <div class="info-item">
              <label>Billing Address:</label>
              <div class="address-text">{{ getBillingAddress() }}</div>
            </div>
            <div class="info-item">
              <label>Payment Method:</label>
              <span>{{ getPaymentMethod() }}</span>
            </div>
            <div class="info-item">
              <label>Order Status:</label>
              <span
                [class]="
                  'order-status ' +
                  getStatusClass(order()?.orderStatus || OrderStatus.Pending)
                "
              >
                {{ getStatusText(order()?.orderStatus || 0) }}
              </span>
            </div>
          </div>
        </div>

        <!-- Order Items -->
        <div class="items-section">
          <div class="items-header">
            <span>ITEMS: {{ getOrderItemsCount() }}</span>
            <span>{{ formatCurrency(getSubtotal(), order()?.currency) }}</span>
          </div>

          <!-- Show message if no items -->
          <div *ngIf="getOrderItemsCount() === 0" class="no-items">
            <p>No items found for this order.</p>
          </div>

          <!-- Display items if available -->
          <div *ngFor="let item of getOrderItems()" class="item-card">
            <img
              [src]="item.imageUrl || getPlaceholderImage()"
              [alt]="item.productName"
              class="item-image"
              (error)="onImageError($event)"
            />

            <div class="item-details">
              <h3 class="item-name">{{ item.productName }}</h3>
              <p class="item-size" *ngIf="item.size">Size: {{ item.size }}</p>
              <p *ngIf="item.color" class="item-color">
                Color: {{ item.color }}
              </p>
              <div class="item-pricing">
                <span>Quantity: {{ item.quantity }}</span>
                <span>{{
                  formatCurrency(
                    item.unitPrice * item.quantity,
                    order()?.currency
                  )
                }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Order Summary -->
        <div class="summary-card">
          <div class="summary-row">
            <span>Sub Total:</span>
            <span>{{ formatCurrency(getSubtotal(), order()?.currency) }}</span>
          </div>
          <div class="summary-row">
            <span>Shipping:</span>
            <span>{{ formatCurrency(getShipping(), order()?.currency) }}</span>
          </div>
          <div class="summary-row" *ngIf="getCashOnDeliveryFee() > 0">
            <span>Cash On Delivery Fee:</span>
            <span>{{
              formatCurrency(getCashOnDeliveryFee(), order()?.currency)
            }}</span>
          </div>
          <div class="summary-row">
            <span>Duties, Taxes & Fees:</span>
            <span>{{ formatCurrency(getTaxes(), order()?.currency) }}</span>
          </div>
          <div
            *ngIf="order()?.discountAmount && order()?.discountAmount > 0"
            class="summary-row discount-row"
          >
            <span>Discount:</span>
            <span class="discount-amount"
              >-{{
                formatCurrency(order()?.discountAmount || 0, order()?.currency)
              }}</span
            >
          </div>
          <div class="summary-row total-row">
            <span>Total:</span>
            <span>{{
              formatCurrency(order()?.totalAmount || 0, order()?.currency)
            }}</span>
          </div>
        </div>

        <!-- Back Button -->
        <div class="back-section">
          <button (click)="goBack()" class="back-button">
            BACK TO ORDER HISTORY
          </button>
        </div>

        <!-- Debug Info (remove in production) -->
        <div class="debug-info" *ngIf="showDebug">
          <h4>Debug Information:</h4>
          <pre>{{ getDebugInfo() }}</pre>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .container {
        max-width: 800px;
        margin: 0 auto;
        padding: 20px;
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      }

      .breadcrumb {
        font-size: 14px;
        margin-bottom: 20px;
        color: #666;
      }

      .breadcrumb a {
        color: #666;
        text-decoration: none;
      }

      .breadcrumb a:hover {
        text-decoration: underline;
      }

      .page-title {
        font-size: 32px;
        font-weight: bold;
        color: #000;
        margin-bottom: 30px;
      }

      .loading,
      .error {
        text-align: center;
        padding: 40px;
      }

      .loading-spinner {
        width: 40px;
        height: 40px;
        border: 4px solid #f3f3f3;
        border-top: 4px solid #000;
        border-radius: 50%;
        animation: spin 1s linear infinite;
        margin: 0 auto 20px;
      }

      @keyframes spin {
        0% {
          transform: rotate(0deg);
        }
        100% {
          transform: rotate(360deg);
        }
      }

      .error {
        background-color: #fee;
        border: 1px solid #fcc;
        color: #c00;
        border-radius: 4px;
      }

      .retry-button {
        margin-top: 15px;
        padding: 8px 16px;
        background-color: #000;
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
      }

      .order-info-card {
        border: 1px solid #e0e0e0;
        border-radius: 8px;
        padding: 20px;
        margin-bottom: 30px;
        background: white;
      }

      .info-grid {
        display: grid;
        grid-template-columns: 1fr;
        gap: 15px;
      }

      .info-item {
        display: flex;
        flex-direction: column;
        gap: 5px;
      }

      .info-item label {
        font-weight: 600;
        color: #333;
        font-size: 14px;
      }

      .info-item span {
        color: #666;
        font-size: 14px;
        line-height: 1.4;
      }

      .address-text {
        color: #666;
        font-size: 14px;
        line-height: 1.4;
        white-space: pre-line;
      }

      .order-status {
        display: inline-block;
        padding: 4px 8px;
        border-radius: 12px;
        font-size: 12px;
        font-weight: 500;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        width: fit-content;
      }

      .status-pending {
        background-color: #fff3cd;
        color: #856404;
      }
      .status-processing {
        background-color: #cce5ff;
        color: #004085;
      }
      .status-shipped {
        background-color: #d4edda;
        color: #155724;
      }
      .status-delivered {
        background-color: #d1ecf1;
        color: #0c5460;
      }
      .status-cancelled {
        background-color: #f8d7da;
        color: #721c24;
      }

      .action-buttons {
        display: flex;
        gap: 15px;
        margin-bottom: 30px;
      }

      .btn {
        padding: 12px 24px;
        border: none;
        border-radius: 4px;
        font-size: 14px;
        font-weight: 600;
        cursor: pointer;
        transition: background-color 0.2s ease;
      }

      .btn:disabled {
        opacity: 0.6;
        cursor: not-allowed;
      }

      .btn-cancel {
        background-color: #dc3545;
        color: white;
      }

      .btn-cancel:hover:not(:disabled) {
        background-color: #c82333;
      }

      .btn-track {
        background-color: #000;
        color: white;
      }

      .btn-track:hover:not(:disabled) {
        background-color: #333;
      }

      .tracking-card {
        border: 1px solid #e0e0e0;
        border-radius: 8px;
        padding: 20px;
        margin-bottom: 30px;
        background: white;
      }

      .tracking-card h3 {
        margin-bottom: 15px;
        color: #000;
      }

      .tracking-number {
        margin-bottom: 20px;
        font-size: 14px;
      }

      .tracking-steps {
        display: flex;
        flex-direction: column;
        gap: 15px;
      }

      .tracking-step {
        border-left: 3px solid #000;
        padding-left: 15px;
      }

      .step-date {
        font-size: 12px;
        color: #666;
      }

      .step-status {
        font-weight: 600;
        color: #000;
        margin: 5px 0;
      }

      .step-description {
        font-size: 14px;
        color: #333;
      }

      .step-location {
        font-size: 12px;
        color: #666;
        margin-top: 5px;
      }

      .items-section {
        margin-bottom: 30px;
      }

      .items-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 15px;
        background-color: #f8f9fa;
        border: 1px solid #e0e0e0;
        border-radius: 8px 8px 0 0;
        font-weight: 600;
      }

      .no-items {
        padding: 40px 20px;
        text-align: center;
        border: 1px solid #e0e0e0;
        border-top: none;
        border-radius: 0 0 8px 8px;
        background: white;
        color: #666;
      }

      .item-card {
        display: flex;
        gap: 15px;
        padding: 20px;
        border: 1px solid #e0e0e0;
        border-top: none;
        background: white;
      }

      .item-card:last-child {
        border-radius: 0 0 8px 8px;
      }

      .item-image {
        width: 80px;
        height: 80px;
        object-fit: cover;
        border-radius: 4px;
        background-color: #f5f5f5;
      }

      .item-details {
        flex: 1;
      }

      .item-name {
        font-size: 16px;
        font-weight: 600;
        color: #000;
        margin-bottom: 5px;
      }

      .item-size,
      .item-color {
        font-size: 14px;
        color: #666;
        margin-bottom: 5px;
      }

      .item-pricing {
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-size: 14px;
      }

      .summary-card {
        border: 1px solid #e0e0e0;
        border-radius: 8px;
        padding: 20px;
        margin-bottom: 30px;
        background: white;
      }

      .summary-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 8px 0;
        font-size: 14px;
      }

      .discount-row {
        color: #28a745;
      }

      .discount-amount {
        color: #28a745;
        font-weight: 600;
      }

      .total-row {
        border-top: 1px solid #e0e0e0;
        margin-top: 10px;
        padding-top: 15px;
        font-weight: 700;
        font-size: 16px;
      }

      .back-section {
        text-align: center;
      }

      .back-button {
        display: inline-block;
        padding: 12px 24px;
        background-color: #f8f9fa;
        color: #333;
        text-decoration: none;
        border: none;
        border-radius: 4px;
        font-size: 14px;
        font-weight: 500;
        cursor: pointer;
        transition: background-color 0.2s ease;
      }

      .back-button:hover {
        background-color: #e9ecef;
      }

      .debug-info {
        margin-top: 30px;
        padding: 20px;
        background-color: #f8f9fa;
        border-radius: 8px;
        font-family: monospace;
        font-size: 12px;
      }

      .debug-info pre {
        white-space: pre-wrap;
        word-wrap: break-word;
      }

      @media (max-width: 768px) {
        .container {
          padding: 15px;
        }

        .page-title {
          font-size: 24px;
        }

        .action-buttons {
          flex-direction: column;
        }

        .item-card {
          flex-direction: column;
          align-items: center;
          text-align: center;
        }

        .item-pricing {
          justify-content: center;
          gap: 20px;
        }
      }
    `,
  ],
})
export class OrderDetailsComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private orderService = inject(OrderService);

  // Signals for reactive state
  order = signal<any>(null);
  trackingInfo = signal<OrderTrackingInfo | null>(null);
  loading = signal<boolean>(false);
  error = signal<string>('');
  cancelling = signal<boolean>(false);
  trackingLoading = signal<boolean>(false);

  // Debug flag (set to false in production)
  showDebug = false;

  // Expose OrderStatus enum to template
  OrderStatus = OrderStatus;

  ngOnInit(): void {
    this.route.params.subscribe((params) => {
      const orderId = params['id'];
      if (orderId) {
        this.loadOrderDetails(orderId);
      }
    });
  }

  loadOrderDetails(orderId?: string): void {
    const id = orderId || this.route.snapshot.params['id'];
    if (!id) return;

    this.loading.set(true);
    this.error.set('');

    this.orderService.getOrderById(id).subscribe({
      next: (order) => {
        console.log('Loaded order:', order);
        this.order.set(order);
        this.loading.set(false);
      },
      error: (error) => {
        this.error.set(error.message || 'Failed to load order details');
        this.loading.set(false);
        console.error('Error loading order details:', error);
      },
    });
  }

  // Helper methods to extract data from current structure
  getOrderItems(): any[] {
    const currentOrder = this.order();
    if (!currentOrder) return [];

    return currentOrder.orderItems || [];
  }

  getOrderItemsCount(): number {
    return this.getOrderItems().length;
  }

  getShippingAddress(): string {
    const currentOrder = this.order();
    if (!currentOrder) return 'No address available';

    const shippingAddr = currentOrder.shippingAddress;

    if (typeof shippingAddr === 'string' && shippingAddr.trim()) {
      return shippingAddr;
    } else if (typeof shippingAddr === 'object' && shippingAddr !== null) {
      return this.formatAddressObject(shippingAddr);
    }

    return 'Address not available';
  }

  getBillingAddress(): string {
    const currentOrder = this.order();
    if (!currentOrder) return 'No address available';

    const billingAddr = currentOrder.billingAddress;

    if (typeof billingAddr === 'string' && billingAddr.trim()) {
      return billingAddr;
    } else if (typeof billingAddr === 'object' && billingAddr !== null) {
      return this.formatAddressObject(billingAddr);
    }

    return 'Address not available';
  }

  private formatAddressObject(addrObj: any): string {
    if (!addrObj || Object.keys(addrObj).length === 0) {
      return 'Address not available';
    }

    const parts = [];
    if (addrObj.name) parts.push(addrObj.name);
    if (addrObj.street || addrObj.address1)
      parts.push(addrObj.street || addrObj.address1);
    if (addrObj.address2) parts.push(addrObj.address2);
    if (addrObj.city) parts.push(addrObj.city);
    if (addrObj.state) parts.push(addrObj.state);
    if (addrObj.country) parts.push(addrObj.country);
    if (addrObj.postalCode || addrObj.zipCode)
      parts.push(addrObj.postalCode || addrObj.zipCode);
    if (addrObj.phone) parts.push(`Phone: ${addrObj.phone}`);

    return parts.length > 0
      ? parts.join('\n')
      : 'Address details not available';
  }

  getPaymentMethod(): string {
    const currentOrder = this.order();
    if (!currentOrder) return 'Not specified';

    // Check if payments array exists and has items
    if (currentOrder.payments && currentOrder.payments.length > 0) {
      const paymentMethod = currentOrder.payments[0].paymentMethod;

      // Map payment method values to display names
      switch (paymentMethod) {
        case 'PayPal':
        case 'paypal':
          return 'PayPal';
        case 'CashOnDelivery':
        case 'cash_on_delivery':
        case 'COD':
          return 'Cash on Delivery';
        case 'CreditCard':
        case 'credit_card':
          return 'Credit Card';
        case 'DebitCard':
        case 'debit_card':
          return 'Debit Card';
        default:
          return paymentMethod || 'Cash on Delivery';
      }
    }

    // Fallback to Cash on Delivery if no payment method found
    return 'Cash on Delivery';
  }

  getCashOnDeliveryFee(): number {
    const currentOrder = this.order();
    if (!currentOrder) return 0;

    // Check if payment method is PayPal
    if (currentOrder.payments && currentOrder.payments.length > 0) {
      const paymentMethod = currentOrder.payments[0].paymentMethod;
      if (paymentMethod === 'PayPal' || paymentMethod === 'paypal') {
        return 0; // No COD fee for PayPal
      }
    }

    return 10; // Default COD fee
  }

  getSubtotal(): number {
    const currentOrder = this.order();
    if (!currentOrder) return 0;
    return currentOrder.subtotal || 0;
  }

  getShipping(): number {
    const currentOrder = this.order();
    if (!currentOrder) return 0;
    return currentOrder.shippingAmount || 0;
  }

  getTaxes(): number {
    const currentOrder = this.order();
    if (!currentOrder) return 0;
    return currentOrder.taxAmount || 0;
  }

  getStatusText(status: number): string {
    const statusMap: { [key: number]: string } = {
      0: 'Pending',
      1: 'Processing',
      2: 'Shipped',
      3: 'Delivered',
      4: 'Cancelled',
    };
    return statusMap[status] || 'Unknown';
  }

  canCancelOrder(): boolean {
    const currentOrder = this.order();
    if (!currentOrder) return false;
    return currentOrder.orderStatus === 0; // Pending status
  }

  canTrackOrder(): boolean {
    const currentOrder = this.order();
    if (!currentOrder) return false;
    const status = currentOrder.orderStatus;
    return status === 1 || status === 2; // Processing or Shipped
  }

  cancelOrder(): void {
    const currentOrder = this.order();
    if (!currentOrder || !this.canCancelOrder()) return;

    if (confirm('Are you sure you want to cancel this order?')) {
      this.cancelling.set(true);

      this.orderService
        .cancelOrder(currentOrder.id, 'Customer request')
        .subscribe({
          next: (updatedOrder) => {
            this.order.set(updatedOrder);
            this.cancelling.set(false);
            alert('Order cancelled successfully');
          },
          error: (error) => {
            this.cancelling.set(false);
            alert(error.message || 'Failed to cancel order');
          },
        });
    }
  }

  trackOrder(): void {
    const currentOrder = this.order();
    if (!currentOrder) return;

    this.trackingLoading.set(true);

    this.orderService.getOrderTracking(currentOrder.id).subscribe({
      next: (tracking) => {
        this.trackingInfo.set(tracking);
        this.trackingLoading.set(false);
      },
      error: (error) => {
        this.trackingLoading.set(false);
        alert(error.message || 'No tracking information available');
      },
    });
  }

  getStatusClass(status: OrderStatus | number): string {
    const numericStatus = typeof status === 'number' ? status : Number(status);
    switch (numericStatus) {
      case 0:
        return 'status-pending';
      case 1:
        return 'status-processing';
      case 2:
        return 'status-shipped';
      case 3:
        return 'status-delivered';
      case 4:
        return 'status-cancelled';
      default:
        return 'status-default';
    }
  }

  formatDate(dateString: string): string {
    if (!dateString || dateString === '0001-01-01T00:00:00') {
      return 'N/A';
    }
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  }

  formatDateTime(dateString: string): string {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  formatCurrency(amount: number, currency: string = 'EGP'): string {
    // Handle different currency codes
    const currencySymbol = currency === 'EGY' ? 'EGP' : currency;
    return `${currencySymbol} ${amount.toFixed(2)}`;
  }

  getPlaceholderImage(): string {
    return 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 80 80"%3E%3Crect width="80" height="80" fill="%23f5f5f5"/%3E%3Ctext x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle" fill="%23999"%3ENo Image%3C/text%3E%3C/svg%3E';
  }

  onImageError(event: any): void {
    event.target.src = this.getPlaceholderImage();
  }

  getDebugInfo(): string {
    return JSON.stringify(this.order(), null, 2);
  }

  goBack(): void {
    this.router.navigate(['/orders']);
  }
}
