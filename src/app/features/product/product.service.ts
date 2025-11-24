// services/product.service.ts
import { Injectable, inject } from '@angular/core';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { ApiService } from '../../core/services/api.service.ts.service';

// Product related interfaces
export interface Product {
  id: string;
  name: string;
  description?: string;
  categoryId: string;
  price: number;
  salePrice?: number;
  isOnSale: boolean;
  createdAt: Date;
  updatedAt: Date;
  variants?: ProductVariant[];
  images?: ProductImage[];
  isNew?: boolean;
  onSale?: boolean;
  imageUrl?: string; // Primary image URL for quick access
  category?: string;
  reviewCount?: number;
}

export interface ProductVariant {
  id: string;
  productId: string;
  size: string;
  color: string;
  sku: string;
  stockQuantity: number;
  price: number;
  salePrice?: number;
  isActive: boolean;
  images?: ProductImage[];
  imageUrl?: string; // Primary image URL for quick access
  priceAdjustment?: number; // Price adjustment for this variant
}

export interface ProductImage {
  id: string;
  productVariantId: string;
  imageUrl: string;
  altText?: string;
  isPrimary: boolean;
  sortOrder: number;
}

export interface ProductWithVariants extends Product {
  variants: ProductVariant[];
}

// API Response interfaces
export interface ApiResponse<T> {
  isSuccess: boolean;
  data: T;
  errorMessage?: string;
}

@Injectable({ providedIn: 'root' })
export class ProductService {
  private api = inject(ApiService);

  /**
   * Get all products - with unified response handling
   */
  getAllProducts(): Observable<Product[]> {
    return this.api.get<any>('Products/GetAllProducts').pipe(
      map((response) => this.extractProductData(response)),
      catchError((error) => {
        console.error('Error fetching all products:', error);
        return of([]);
      })
    );
  }

  /**
   * Search products - with unified response handling
   */
  searchProducts(searchTerm: string): Observable<Product[]> {
    return this.api
      .get<any>(
        `Products/SearchProducts?searchTerm=${encodeURIComponent(searchTerm)}`
      )
      .pipe(
        map((response) => this.extractProductData(response)),
        catchError((error) => {
          console.error('Error searching products:', error);
          return of([]);
        })
      );
  }

  /**
   * Get last added products - with unified response handling
   */
  getLastAddedProducts(): Observable<Product[]> {
    return this.api.get<any>('Products/GetLastAddedProducts').pipe(
      map((response) => this.extractProductData(response)),
      catchError((error) => {
        console.error('Error fetching last added products:', error);
        return of([]);
      })
    );
  }

  /**
   * Get products that are on sale - with unified response handling
   */
  getSalesProducts(): Observable<Product[]> {
    return this.api.get<any>('Products/GetSalesProducts').pipe(
      map((response) => this.extractProductData(response)),
      catchError((error) => {
        console.error('Error fetching sales products:', error);
        return of([]);
      })
    );
  }

  /**
   * Get products by category ID - with unified response handling
   */
  getProductsByCategory(categoryId: string): Observable<Product[]> {
    return this.api
      .get<any>(`Products/GetProductsByCategoryId/${categoryId}`)
      .pipe(
        map((response) => this.extractProductData(response)),
        catchError((error) => {
          console.error(
            `Error fetching products for category ${categoryId}:`,
            error
          );
          return of([]);
        })
      );
  }

  /**
   * Get products by category slug - EXISTING METHOD (keeping as is)
   */
  getProductsByCategorySlug(
    categorySlug: string
  ): Observable<{ data: Product[] }> {
    return this.api.get<{ data: Product[] }>(
      `Products/GetProductsByCategorySlug/${categorySlug}`
    );
  }

  /**
   * Get product with all its variants
   */
  getProductWithVariants(productId: string): Observable<ProductWithVariants> {
    return this.api.get<ProductWithVariants>(
      `Products/GetProductVariantsById/${productId}`
    );
  }

  /**
   * Get specific product variant by ID
   */
  getProductVariantById(variantId: string): Observable<ProductVariant> {
    return this.api.get<ProductVariant>(
      `Products/GetProductVariantById/${variantId}`
    );
  }

  /**
   * Get images for a specific product variant
   */
  getImagesByProductVariantId(variantId: string): Observable<ProductImage[]> {
    return this.api.get<ProductImage[]>(
      `Products/GetImagesByProductVariantId/${variantId}`
    );
  }

  /**
   * Get product recommendations
   */
  getRecommendations(productId: string): Observable<Product[]> {
    return this.api.get<any>(`Products/GetRecommendations/${productId}`).pipe(
      map((response) => this.extractProductData(response)),
      catchError((error) => {
        console.error('Error fetching recommendations:', error);
        return of([]);
      })
    );
  }

  // NEW METHODS - Added from API Controller

  /**
   * Get previously purchased products for all users
   * NEW METHOD from API controller
   */
  /**
   * Get previously purchased products for all users
   * FIXED METHOD - handles direct array response
   */
  getPreviouslyPurchasedProducts(): Observable<Product[]> {
    console.log('Making API call to GetPreviouslyPurchasedProducts');

    return this.api
      .get<any>('Products/GetPreviouslyPurchasedProducts') // Changed to <any>
      .pipe(
        map((response) => {
          console.log('Raw API Response for previously purchased:', response);
          console.log('Response type:', typeof response);
          console.log('Is array?', Array.isArray(response));

          // Check if response is directly an array (which it seems to be)
          if (Array.isArray(response)) {
            console.log(
              'Direct array response - Data length:',
              response.length
            );
            return response as Product[];
          }

          // Handle wrapped ApiResponse structure (fallback)
          if (response && response.isSuccess && Array.isArray(response.data)) {
            console.log(
              'Wrapped response - API Success - Data:',
              response.data
            );
            console.log('Data length:', response.data.length);
            return response.data;
          }

          // Handle response with just data property
          if (response && Array.isArray(response.data)) {
            console.log('Response with data property:', response.data);
            return response.data;
          }

          console.error('Unexpected response format:', response);
          return [];
        }),
        catchError((error) => {
          console.error(
            'HTTP Error fetching previously purchased products:',
            error
          );
          console.log('Error details:', {
            status: error.status,
            statusText: error.statusText,
            message: error.message,
            url: error.url,
          });
          return of([]);
        })
      );
  }

  // Additional utility methods that might be useful

  /**
   * Check if a product is on sale
   */
  isProductOnSale(product: Product): boolean {
    return (
      product.isOnSale &&
      !!product.salePrice &&
      product.salePrice < product.price
    );
  }

  /**
   * Get the effective price of a product (sale price if on sale, otherwise regular price)
   */
  getEffectivePrice(product: Product): number {
    return this.isProductOnSale(product) ? product.salePrice! : product.price;
  }

  /**
   * Calculate discount percentage
   */
  getDiscountPercentage(product: Product): number {
    if (!this.isProductOnSale(product)) return 0;
    return Math.round(
      ((product.price - product.salePrice!) / product.price) * 100
    );
  }

  /**
   * Get primary image for a product variant
   */
  getPrimaryImage(images: ProductImage[]): ProductImage | null {
    return images?.find((img) => img.isPrimary) || images?.[0] || null;
  }

  /**
   * Check if variant is in stock
   */
  isVariantInStock(variant: ProductVariant): boolean {
    return variant.stockQuantity > 0;
  }

  /**
   * Get available sizes for a product
   */
  getAvailableSizes(variants: ProductVariant[]): string[] {
    return [
      ...new Set(
        variants.filter((v) => this.isVariantInStock(v)).map((v) => v.size)
      ),
    ].sort();
  }

  /**
   * Get available colors for a product
   */
  getAvailableColors(variants: ProductVariant[]): string[] {
    return [
      ...new Set(
        variants.filter((v) => this.isVariantInStock(v)).map((v) => v.color)
      ),
    ];
  }

  /**
   * Find variant by size and color
   */
  findVariant(
    variants: ProductVariant[],
    size: string,
    color: string
  ): ProductVariant | null {
    return (
      variants.find(
        (v) => v.size === size && v.color === color && this.isVariantInStock(v)
      ) || null
    );
  }

  /**
   * Get price range for a product with variants
   */
  getPriceRange(product: ProductWithVariants): { min: number; max: number } {
    const prices = product.variants
      .filter((v) => this.isVariantInStock(v))
      .map((v) =>
        this.isProductOnSale(product) && v.salePrice ? v.salePrice : v.price
      );

    return {
      min: Math.min(...prices),
      max: Math.max(...prices),
    };
  }

  /**
   * Helper method to extract data from API responses
   */
  private extractProductData(response: any): Product[] {
    console.log('Raw API Response:', response);

    // Handle direct array response
    if (Array.isArray(response)) {
      return response;
    }

    // Handle wrapped response with isSuccess/data structure
    if (response && response.isSuccess && Array.isArray(response.data)) {
      return response.data;
    }

    // Handle response with just data property
    if (response && Array.isArray(response.data)) {
      return response.data;
    }

    console.warn('Unexpected API response format:', response);
    return [];
  }
}
