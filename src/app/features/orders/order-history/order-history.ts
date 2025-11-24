import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

interface Order {
  orderNumber: string;
  dateOrdered: string;
  orderStatus: string;
  shippedTo: string;
  totalItems: number;
  total: string;
  productImage: string;
}

@Component({
  selector: 'app-order-history',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './order-history.html',
  styleUrl: './order-history.scss',
})
export class OrderHistoryComponent {
  currentOrder: Order = {
    orderNumber: 'AEG01942981',
    dateOrdered: '8/20/25',
    orderStatus: 'Confirmed',
    shippedTo: 'test user',
    totalItems: 1,
    total: 'EGP 5,509.00',
    productImage:
      'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTUwIiBoZWlnaHQ9IjEwMCIgdmlld0JveD0iMCAwIDE1MCAxMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIxNTAiIGhlaWdodD0iMTAwIiBmaWxsPSIjRjhGOUZBIi8+CjxwYXRoIGQ9Ik03NSA2MEMxMDEuNTA3IDYwIDEyMyAzOC41MDY2IDEyMyAxMkMxMjMgLTE0LjUwNjYgMTAxLjUwNyAtMzYgNzUgLTM2QzQ4LjQ5MzQgLTM2IDI3IC0xNC41MDY2IDI3IDEyQzI3IDM4LjUwNjYgNDguNDkzNCA2MCA3NSA2MFoiIGZpbGw9IiNEMUQ1REIiLz4KPHA+UHJvZHVjdCBJbWFnZTwvcD4KPC9zdmc+',
  };
}
