// components/orders.component.ts
import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import {
  OrderService,
  Order,
  OrderStatus,
} from '../../core/services/order.service';

@Component({
  selector: 'app-orders',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './orders.html',
  styleUrl: './orders.scss',
})
export class Orders implements OnInit {
  private orderService = inject(OrderService);
  private router = inject(Router);

  // Signals for reactive state
  private allOrders = signal<Order[]>([]);
  orders = computed(() => this.allOrders());
  loading = signal<boolean>(false);
  error = signal<string>('');
  selectedTimeFilter = signal<string>('Last 3 months');

  // Filter options
  timeFilterOptions = [
    'Last 3 months',
    'Last 6 months',
    'Last year',
    'All time',
  ];

  ngOnInit(): void {
    this.loadOrders();
  }

  loadOrders(): void {
    this.loading.set(true);
    this.error.set('');

    this.orderService.getAllOrdersByUserId().subscribe({
      next: (orders) => {
        console.log('Orders received in component:', orders);
        console.log('Orders count:', orders.length);

        // Debug each order
        orders.forEach((order, index) => {
          console.log(`Order ${index}:`, {
            id: order.id,
            orderNumber: order.orderNumber,
            orderDate: order.orderDate,
            orderStatus: order.orderStatus,
            totalAmount: order.totalAmount,
            currency: order.currency,
            orderItems: order.orderItems,
            shippingAddress: order.shippingAddress,
            fullOrder: order,
          });
        });
        // Sort orders by date (newest first)
        orders.sort((a, b) => {
          return (
            new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime()
          );
        });
        // Create a new array to ensure change detection
        this.allOrders.set([...orders]);
        this.loading.set(false);
      },
      error: (error) => {
        this.error.set(
          error.message || 'Failed to load orders. Please try again.'
        );
        this.loading.set(false);
        console.error('Error loading orders:', error);
      },
    });
  }

  viewOrderDetails(orderId: string): void {
    this.router.navigate(['/orders', orderId]);
  }

  onFilterChange(event: Event): void {
    const select = event.target as HTMLSelectElement;
    this.selectedTimeFilter.set(select.value);
    // Filter orders based on time range
    this.filterOrdersByTime(select.value);
  }

  private filterOrdersByTime(timeFilter: string): void {
    this.loading.set(true);

    // Calculate date range based on filter
    const now = new Date();
    let startDate: Date;

    switch (timeFilter) {
      case 'Last 3 months':
        startDate = new Date(
          now.getFullYear(),
          now.getMonth() - 3,
          now.getDate()
        );
        break;
      case 'Last 6 months':
        startDate = new Date(
          now.getFullYear(),
          now.getMonth() - 6,
          now.getDate()
        );
        break;
      case 'Last year':
        startDate = new Date(
          now.getFullYear() - 1,
          now.getMonth(),
          now.getDate()
        );
        break;
      case 'All time':
      default:
        this.loadOrders();
        return;
    }

    // Filter existing orders by date
    const currentOrders = this.allOrders();
    const filteredOrders = currentOrders.filter((order) => {
      const orderDate = new Date(order.orderDate);
      return orderDate >= startDate;
    });

    this.allOrders.set([...filteredOrders]);
    this.loading.set(false);
  }

  getStatusClass(status: OrderStatus): string {
    switch (status) {
      case OrderStatus.Pending:
        return 'status-pending';
      case OrderStatus.Processing:
        return 'status-processing';
      case OrderStatus.Shipped:
        return 'status-shipped';
      case OrderStatus.Delivered:
        return 'status-delivered';
      case OrderStatus.Cancelled:
        return 'status-cancelled';
      default:
        return 'status-default';
    }
  }

  getStatusText(status: OrderStatus | number): string {
    const statusNum = typeof status === 'number' ? status : Number(status);

    switch (statusNum) {
      case 0:
        return 'Pending';
      case 1:
        return 'Processing';
      case 2:
        return 'Shipped';
      case 3:
        return 'Delivered';
      case 4:
        return 'Cancelled';
      default:
        return 'Unknown';
    }
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  }

  formatCurrency(amount: number, currency: string = 'EGP'): string {
    return `${currency} ${amount.toFixed(2)}`;
  }

  getItemsText(order: Order): string {
    const itemCount = order.orderItems?.length || 0;
    return itemCount === 1 ? '1 item' : `${itemCount} items`;
  }

  getShippingName(shippingAddress: string): string {
    // Extract name from shipping address (first line typically contains name)
    const lines = shippingAddress.split('\n');
    return lines[0] || 'Customer';
  }

  getTotalItems(order: Order): number {
    return (
      order.orderItems?.reduce((total, item) => total + item.quantity, 0) || 0
    );
  }

  getFirstProductImage(order: Order): string {
    return (
      order.orderItems?.[0]?.imageUrl ||
      '/assets/images/product-placeholder.png'
    );
  }

  trackByOrderId(index: number, order: Order): string {
    return order.id;
  }
}
