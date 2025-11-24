import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { CustomerService, CustomerProfileDto } from './customer.service';
import { AddressService, AddressDto, AddressCreateDto } from './address.service';
import { AuthService } from '../../core/services/auth.service.ts.service';
import { Order, OrderService } from '../../core/services/order.service';
import { WishlistItem, WishlistService } from '../wishlist/wishlist.service';

@Injectable({
  providedIn: 'root'
})
export class ProfileDataService {
  private customerService = inject(CustomerService);
  private addressService = inject(AddressService);
  private authService = inject(AuthService);
  private wishlistService = inject(WishlistService);
  private orderService = inject(OrderService);

  // Signals directly from services
  currentCustomer = this.customerService.currentCustomer;
  addresses = this.addressService.addresses;
  defaultAddress = this.addressService.defaultAddress;
  isLoadingCustomer = this.customerService.isLoadingCustomer;
  isLoadingAddresses = this.addressService.isLoadingAddresses;

  // Wishlist and Order signals
  wishlistItems = this.wishlistService.wishlistItems;
  wishlistItemCount = this.wishlistService.itemCount;
  orders = this.orderService.orders;
  isLoadingOrders = this.orderService.isLoading;

  // Data loading methods
  loadCustomerData(): Observable<CustomerProfileDto> {
    return this.customerService.refreshCustomerProfile();
  }

  loadAddresses(): Observable<AddressDto[]> {
    return this.addressService.refreshAddresses();
  }

  loadWishlistData(): void {
    console.log('Wishlist items loaded:', this.wishlistItems().length);
  }

  loadOrdersData(): Observable<Order[]> | null {
    if (this.authService.isLoggedIn()) {
      return this.orderService.getAllOrdersByUserId();
    }
    return null;
  }

  // Profile operations
  updateCustomerProfile(data: any): Observable<CustomerProfileDto> {
    return this.customerService.updateCustomerProfile(data);
  }

  updatePhone(phone: string): Observable<any> {
    return this.customerService.updatePhone(phone);
  }

  // Address operations
  createAddress(addressData: AddressCreateDto): Observable<AddressDto> {
    return this.addressService.createAddress(addressData);
  }

  updateAddress(id: string, updateData: AddressCreateDto): Observable<AddressDto> {
    return this.addressService.updateAddress(id, updateData);
  }

  setDefaultAddress(id: string): Observable<any> {
    return this.addressService.setDefaultAddress(id);
  }

  deleteAddress(id: string): Observable<any> {
    return this.addressService.deleteAddress(id);
  }

  // Wishlist operations
  removeFromWishlist(itemId: string, productId: string): Observable<any> {
    return this.wishlistService.removeFromWishlist(itemId, productId);
  }

  // Auth operations
  logout(): Observable<any> {
    return this.authService.logout();
  }

  logoutLocal(): void {
    this.authService.logoutLocal();
  }

  isLoggedIn(): boolean {
    return this.authService.isLoggedIn();
  }

  // Utility getters
  getCustomerDisplayName(): string {
    return this.customerService.getCustomerDisplayName();
  }

  getCustomerPhone(): string {
    const customer = this.currentCustomer();
    return customer?.phone || customer?.phoneNumber || '';
  }

  hasPhoneNumber(): boolean {
    return !!this.getCustomerPhone();
  }

  getProfileCompletionPercentage(): number {
    return this.customerService.getProfileCompletionPercentage();
  }

  hasAddresses(): boolean {
    return this.addresses().length > 0;
  }

  hasWishlistItems(): boolean {
    return this.wishlistItems().length > 0;
  }

  hasOrders(): boolean {
    return this.orders().length > 0;
  }

  getRecentWishlistItems(): WishlistItem[] {
    return this.wishlistItems().slice(0, 3);
  }

  getRecentOrders(): Order[] {
    return this.orders()
      .sort(
        (a, b) =>
          new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime()
      )
      .slice(0, 3);
  }

  // Address utilities
  getAddressSummary(address: AddressDto): string {
    return this.addressService.getAddressSummary(address);
  }

  getFullAddress(address: AddressDto): string {
    return this.addressService.getFullAddress(address);
  }
}
