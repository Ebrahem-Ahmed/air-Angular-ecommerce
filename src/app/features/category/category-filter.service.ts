import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { DisplayProduct } from './category.types';

export interface FilterOptions {
  sortBy?: string;
  sizes?: string[];
  productTypes?: string[];
  onSale?: boolean;
  colors?: string[];
  brands?: string[];
  collections?: string[];
  discountRanges?: string[];
  priceRange?: { min: number; max: number };
}

@Injectable({
  providedIn: 'root',
})
export class CategoryFilterService {
  private filtersSubject = new BehaviorSubject<FilterOptions>({});
  public filters$ = this.filtersSubject.asObservable();

  private currentFilters: FilterOptions = {};

  /**
   * Update filters
   */
  updateFilters(filters: FilterOptions): void {
    this.currentFilters = { ...this.currentFilters, ...filters };
    this.filtersSubject.next(this.currentFilters);
  }

  /**
   * Reset all filters
   */
  resetFilters(): void {
    this.currentFilters = {};
    this.filtersSubject.next(this.currentFilters);
  }

  /**
   * Get current filters
   */
  getCurrentFilters(): FilterOptions {
    return { ...this.currentFilters };
  }

  /**
   * Apply filters to products
   */
  applyFilters(
    products: DisplayProduct[],
    filters: FilterOptions,
    specialType?: string | null
  ): DisplayProduct[] {
    let filteredProducts = [...products];

    // Apply size filter
    if (filters.sizes && filters.sizes.length > 0) {
      filteredProducts = filteredProducts.filter((product) =>
        product.availableSizes?.some((size) => filters.sizes!.includes(size))
      );
    }

    // Apply product type filter
    if (filters.productTypes && filters.productTypes.length > 0) {
      filteredProducts = filteredProducts.filter((product) =>
        filters.productTypes!.includes(product.productType || '')
      );
    }

    // Apply sale filter - but skip if we're already in sale category
    if (filters.onSale !== undefined && specialType !== 'sale') {
      filteredProducts = filteredProducts.filter(
        (product) => product.onSale === filters.onSale
      );
    }

    // Apply color filter
    if (filters.colors && filters.colors.length > 0) {
      filteredProducts = filteredProducts.filter((product) =>
        product.availableColors?.some((color) =>
          filters.colors!.includes(color)
        )
      );
    }

    // Apply brand filter
    if (filters.brands && filters.brands.length > 0) {
      filteredProducts = filteredProducts.filter((product) =>
        filters.brands!.includes(product.brand || '')
      );
    }

    // Apply collection filter
    if (filters.collections && filters.collections.length > 0) {
      filteredProducts = filteredProducts.filter((product) =>
        filters.collections!.includes(product.collection || '')
      );
    }

    // Apply price range filter
    if (filters.priceRange) {
      const { min, max } = filters.priceRange;
      filteredProducts = filteredProducts.filter(
        (product) => product.price >= min && product.price <= max
      );
    }

    // Apply discount range filter
    if (filters.discountRanges && filters.discountRanges.length > 0) {
      filteredProducts = filteredProducts.filter((product) => {
        if (!product.originalPrice) return false;
        const discountPercent =
          ((product.originalPrice - product.price) / product.originalPrice) *
          100;
        return filters.discountRanges!.some((range) => {
          const [min, max] = this.parseDiscountRange(range);
          return discountPercent >= min && discountPercent <= max;
        });
      });
    }

    return filteredProducts;
  }

  /**
   * Sort products based on sort option
   */
  sortProducts(products: DisplayProduct[], sortBy: string): DisplayProduct[] {
    switch (sortBy) {
      case 'newest':
        return products.sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
      case 'topSellers':
        return products.sort(
          (a, b) => (b.salesCount || 0) - (a.salesCount || 0)
        );
      case 'priceLowToHigh':
        return products.sort(
          (a, b) =>
            (a.effectivePrice || a.price) - (b.effectivePrice || b.price)
        );
      case 'priceHighToLow':
        return products.sort(
          (a, b) =>
            (b.effectivePrice || b.price) - (a.effectivePrice || a.price)
        );
      case 'discountHighToLow':
        return products.sort(
          (a, b) => (b.discountPercent || 0) - (a.discountPercent || 0)
        );
      case 'highestRated':
        return products.sort((a, b) => (b.rating || 0) - (a.rating || 0));
      default:
        return products;
    }
  }

  /**
   * Get default sorting for special categories
   */
  getDefaultSorting(specialType?: string | null): string | undefined {
    switch (specialType) {
      case 'new':
        return 'newest';
      case 'sale':
        return 'discountHighToLow';
      default:
        return undefined;
    }
  }

  /**
   * Parse discount range string (e.g., "20-29" -> [20, 29])
   */
  private parseDiscountRange(range: string): [number, number] {
    if (range.includes('50% or more')) return [50, 100];
    const parts = range.match(/(\d+)%?\s*to\s*(\d+)%?/);
    if (parts) {
      return [parseInt(parts[1]), parseInt(parts[2])];
    }
    return [0, 100];
  }

  /**
   * Parse query parameters to filters
   */
  parseQueryParams(params: any): FilterOptions {
    const filters: FilterOptions = {};

    if (params.sort) filters.sortBy = params.sort;
    if (params.sizes) filters.sizes = params.sizes.split(',');
    if (params.colors) filters.colors = params.colors.split(',');
    if (params.brands) filters.brands = params.brands.split(',');
    if (params.onSale) filters.onSale = params.onSale === 'true';

    return filters;
  }

  /**
   * Convert filters to query parameters
   */
  filtersToQueryParams(filters: FilterOptions): any {
    const queryParams: any = {};

    if (filters.sortBy) queryParams.sort = filters.sortBy;
    if (filters.sizes?.length) queryParams.sizes = filters.sizes.join(',');
    if (filters.colors?.length) queryParams.colors = filters.colors.join(',');
    if (filters.brands?.length) queryParams.brands = filters.brands.join(',');
    if (filters.onSale !== undefined) queryParams.onSale = filters.onSale;

    return queryParams;
  }
}
