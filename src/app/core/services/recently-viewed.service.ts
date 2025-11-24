import { Injectable, signal } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export interface RecentlyViewedProduct {
  id: string;
  name: string;
  price: number;
  salePrice?: number;
  isOnSale: boolean;
  imageUrl: string;
  categoryId: string;
  slug?: string;
  viewedAt: number; // timestamp
}

interface RecentlyViewedStorage {
  products: RecentlyViewedProduct[];
  lastCleanup: number; // timestamp
}

@Injectable({
  providedIn: 'root',
})
export class RecentlyViewedService {
  private readonly STORAGE_KEY = 'recently_viewed_products';
  private readonly MAX_ITEMS = 5;
  private readonly EXPIRY_HOURS = 6;
  private readonly EXPIRY_MS = this.EXPIRY_HOURS * 60 * 60 * 1000; // 6 hours in milliseconds

  // Reactive state
  private recentlyViewedSubject = new BehaviorSubject<RecentlyViewedProduct[]>(
    []
  );
  public recentlyViewed$ = this.recentlyViewedSubject.asObservable();

  // Signal for component usage
  recentlyViewedProducts = signal<RecentlyViewedProduct[]>([]);

  constructor() {
    this.initializeService();
  }

  /**
   * Initialize the service by loading data from localStorage and cleaning expired items
   */
  private initializeService(): void {
    this.cleanupExpiredData();
    this.loadFromStorage();
  }

  /**
   * Add a product to recently viewed list
   */
  addProduct(product: {
    id: string;
    name: string;
    price: number;
    salePrice?: number;
    isOnSale: boolean;
    imageUrl: string;
    categoryId: string;
    slug?: string;
  }): void {
    try {
      const currentProducts = this.getStoredProducts();

      // Create the recently viewed product with current timestamp
      const recentlyViewedProduct: RecentlyViewedProduct = {
        ...product,
        viewedAt: Date.now(),
      };

      // Remove existing product if it exists (to avoid duplicates)
      const filteredProducts = currentProducts.filter(
        (p) => p.id !== product.id
      );

      // Add the new product at the beginning
      const updatedProducts = [recentlyViewedProduct, ...filteredProducts];

      // Limit to MAX_ITEMS
      const limitedProducts = updatedProducts.slice(0, this.MAX_ITEMS);

      // Save to storage and update reactive state
      this.saveToStorage(limitedProducts);
      this.updateReactiveState(limitedProducts);

      console.log(`Product "${product.name}" added to recently viewed`);
    } catch (error) {
      console.error('Error adding product to recently viewed:', error);
    }
  }

  /**
   * Get all recently viewed products
   */
  getRecentlyViewedProducts(): RecentlyViewedProduct[] {
    this.cleanupExpiredData();
    return this.getStoredProducts();
  }

  /**
   * Remove a specific product from recently viewed
   */
  removeProduct(productId: string): void {
    try {
      const currentProducts = this.getStoredProducts();
      const updatedProducts = currentProducts.filter((p) => p.id !== productId);

      this.saveToStorage(updatedProducts);
      this.updateReactiveState(updatedProducts);

      console.log(
        `Product with ID "${productId}" removed from recently viewed`
      );
    } catch (error) {
      console.error('Error removing product from recently viewed:', error);
    }
  }

  /**
   * Clear all recently viewed products
   */
  clearAll(): void {
    try {
      localStorage.removeItem(this.STORAGE_KEY);
      this.updateReactiveState([]);
      console.log('All recently viewed products cleared');
    } catch (error) {
      console.error('Error clearing recently viewed products:', error);
    }
  }

  /**
   * Get count of recently viewed products
   */
  getCount(): number {
    return this.getStoredProducts().length;
  }

  /**
   * Check if a product is in recently viewed list
   */
  isRecentlyViewed(productId: string): boolean {
    const products = this.getStoredProducts();
    return products.some((p) => p.id === productId);
  }

  /**
   * Get recently viewed products excluding a specific product (useful for recommendations)
   */
  getRecentlyViewedExcluding(
    excludeProductId: string
  ): RecentlyViewedProduct[] {
    const products = this.getStoredProducts();
    return products.filter((p) => p.id !== excludeProductId);
  }

  /**
   * Load products from localStorage
   */
  private loadFromStorage(): void {
    const products = this.getStoredProducts();
    this.updateReactiveState(products);
  }

  /**
   * Get stored products from localStorage
   */
  private getStoredProducts(): RecentlyViewedProduct[] {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (!stored) return [];

      const data: RecentlyViewedStorage = JSON.parse(stored);

      // Validate data structure
      if (!data.products || !Array.isArray(data.products)) {
        return [];
      }

      return data.products;
    } catch (error) {
      console.error('Error reading from localStorage:', error);
      return [];
    }
  }

  /**
   * Save products to localStorage
   */
  private saveToStorage(products: RecentlyViewedProduct[]): void {
    try {
      const storageData: RecentlyViewedStorage = {
        products,
        lastCleanup: Date.now(),
      };

      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(storageData));
    } catch (error) {
      console.error('Error saving to localStorage:', error);
      // Handle storage quota exceeded or other localStorage errors
      if (error instanceof DOMException && error.code === 22) {
        console.warn(
          'localStorage quota exceeded, clearing recently viewed data'
        );
        this.clearAll();
      }
    }
  }

  /**
   * Update reactive state (both BehaviorSubject and signal)
   */
  private updateReactiveState(products: RecentlyViewedProduct[]): void {
    this.recentlyViewedSubject.next(products);
    this.recentlyViewedProducts.set(products);
  }

  /**
   * Clean up expired data (older than 6 hours)
   */
  private cleanupExpiredData(): void {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (!stored) return;

      const data: RecentlyViewedStorage = JSON.parse(stored);

      // Check if cleanup is needed (6 hours since last cleanup)
      const now = Date.now();
      const timeSinceLastCleanup = now - (data.lastCleanup || 0);

      if (timeSinceLastCleanup >= this.EXPIRY_MS) {
        console.log('Recently viewed data expired, clearing storage');
        this.clearAll();
        return;
      }

      // Also remove individual items that are older than 6 hours
      if (data.products && Array.isArray(data.products)) {
        const validProducts = data.products.filter((product) => {
          const age = now - product.viewedAt;
          return age < this.EXPIRY_MS;
        });

        // If some products were removed, update storage
        if (validProducts.length !== data.products.length) {
          console.log(
            `Removed ${
              data.products.length - validProducts.length
            } expired products`
          );
          this.saveToStorage(validProducts);
        }
      }
    } catch (error) {
      console.error('Error during cleanup:', error);
      // If there's an error parsing, clear the storage
      this.clearAll();
    }
  }

  /**
   * Get time remaining until next cleanup (in milliseconds)
   */
  getTimeUntilExpiry(): number {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (!stored) return 0;

      const data: RecentlyViewedStorage = JSON.parse(stored);
      const timeSinceLastCleanup = Date.now() - (data.lastCleanup || 0);
      const timeRemaining = this.EXPIRY_MS - timeSinceLastCleanup;

      return Math.max(0, timeRemaining);
    } catch (error) {
      return 0;
    }
  }

  /**
   * Force cleanup (useful for testing or manual cleanup)
   */
  forceCleanup(): void {
    this.cleanupExpiredData();
    const products = this.getStoredProducts();
    this.updateReactiveState(products);
  }
}
