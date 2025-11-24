import { Injectable, inject } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { Category } from './category.service';
import { ProductService } from '../product/product.service';
import { CategoryDataService } from './category-data.service';
import { DisplayProduct } from './category.types';
import { CategoryFilterService } from './category-filter.service';

export interface SpecialCategoryInfo {
  slug: string;
  name: string;
  icon: string;
  description: string;
  theme: string;
}

@Injectable({
  providedIn: 'root',
})
export class SpecialCategoryService {
  private productService = inject(ProductService);
  private categoryDataService = inject(CategoryDataService);
  private categoryFilterService = inject(CategoryFilterService);

  private readonly specialCategories: SpecialCategoryInfo[] = [
    {
      slug: 'all',
      name: 'All Products',
      icon: 'grid-3x3-gap',
      description: 'Browse everything',
      theme: 'primary',
    },
    {
      slug: 'new',
      name: 'New Arrivals',
      icon: 'sparkles',
      description: 'Latest products',
      theme: 'success',
    },
    {
      slug: 'sale',
      name: 'Sale',
      icon: 'percent',
      description: 'Great deals',
      theme: 'danger',
    },
  ];

  /**
   * Get all special category navigation items
   */
  getSpecialCategoryNavigation(): SpecialCategoryInfo[] {
    return [...this.specialCategories];
  }

  /**
   * Get special category info by slug
   */
  getSpecialCategoryInfo(slug: string): SpecialCategoryInfo | null {
    return (
      this.specialCategories.find(
        (cat) => cat.slug.toLowerCase() === slug.toLowerCase()
      ) || null
    );
  }

  /**
   * Check if slug is a special category
   */
  isSpecialCategory(slug: string): boolean {
    return this.specialCategories.some(
      (cat) => cat.slug.toLowerCase() === slug.toLowerCase()
    );
  }

  /**
   * Load all products for special "all" category
   */
  loadAllProductsSpecial(destroy$: Subject<void>): Observable<{
    category: Category;
    products: DisplayProduct[];
    breadcrumb: Category[];
  }> {
    return new Observable((observer) => {
      const category = this.createSpecialCategory(
        'all',
        'All Products',
        'Browse our complete collection of products from all categories.'
      );
      const breadcrumb = this.createSpecialCategoryBreadcrumb(
        'All Products',
        'all'
      );

      this.categoryDataService.loadAllProducts(destroy$).subscribe({
        next: (products) => {
          category.productsCount = products.length;
          observer.next({ category, products, breadcrumb });
          observer.complete();
        },
        error: (error) => observer.error(error),
      });
    });
  }

  /**
   * Load sale products for special "sale" category using ProductService.getSalesProducts()
   */
  loadSaleProducts(destroy$: Subject<void>): Observable<{
    category: Category;
    products: DisplayProduct[];
    breadcrumb: Category[];
  }> {
    return new Observable((observer) => {
      this.categoryFilterService.resetFilters();

      const category = this.createSpecialCategory(
        'sale',
        'Sale Products',
        'Discover amazing deals and discounts on our sale collection.'
      );
      const breadcrumb = this.createSpecialCategoryBreadcrumb(
        'Sale Products',
        'sale'
      );

      // Use ProductService.getSalesProducts() instead of filtering
      this.productService
        .getSalesProducts()
        .pipe(takeUntil(destroy$))
        .subscribe({
          next: (products) => {
            // Transform products to DisplayProduct format
            const saleProducts = this.transformToDisplayProducts(products);
            category.productsCount = saleProducts.length;
            observer.next({ category, products: saleProducts, breadcrumb });
            observer.complete();
          },
          error: (error) => observer.error(error),
        });
    });
  }

  /**
   * Load new products for special "new" category using ProductService.getLastAddedProducts()
   */
  loadNewProducts(destroy$: Subject<void>): Observable<{
    category: Category;
    products: DisplayProduct[];
    breadcrumb: Category[];
  }> {
    return new Observable((observer) => {
      this.categoryFilterService.resetFilters();

      const category = this.createSpecialCategory(
        'new',
        'New Arrivals',
        'Check out our latest products and newest additions to the collection.'
      );
      const breadcrumb = this.createSpecialCategoryBreadcrumb(
        'New Arrivals',
        'new'
      );

      // Use ProductService.getLastAddedProducts() instead of filtering
      this.productService
        .getLastAddedProducts()
        .pipe(takeUntil(destroy$))
        .subscribe({
          next: (products) => {
            // Transform products to DisplayProduct format
            const newProducts = this.transformToDisplayProducts(products);
            category.productsCount = newProducts.length;
            observer.next({ category, products: newProducts, breadcrumb });
            observer.complete();
          },
          error: (error) => observer.error(error),
        });
    });
  }

  /**
   * Handle special category loading by slug
   */
  handleSpecialCategory(
    slug: string,
    destroy$: Subject<void>
  ): Observable<{
    category: Category;
    products: DisplayProduct[];
    breadcrumb: Category[];
  }> {
    const lowerSlug = slug.toLowerCase();

    switch (lowerSlug) {
      case 'all':
        return this.loadAllProductsSpecial(destroy$);
      case 'sale':
        return this.loadSaleProducts(destroy$);
      case 'new':
        return this.loadNewProducts(destroy$);
      default:
        return this.loadAllProductsSpecial(destroy$);
    }
  }

  /**
   * Get category display information for special categories
   */
  getSpecialCategoryDisplay(slug: string): {
    name: string;
    description: string;
    icon: string;
    theme: string;
  } {
    const info = this.getSpecialCategoryInfo(slug);
    if (!info) {
      return {
        name: 'All Products',
        description: 'Browse our complete collection',
        icon: 'grid-3x3-gap',
        theme: 'primary',
      };
    }

    const descriptions: { [key: string]: string } = {
      all: 'Browse our complete collection of products from all categories.',
      sale: 'Discover amazing deals and discounts on our sale collection.',
      new: 'Check out our latest products and newest additions to the collection.',
    };

    return {
      name: info.name,
      description: descriptions[slug] || info.description,
      icon: info.icon,
      theme: info.theme,
    };
  }

  /**
   * Get page title for special categories
   */
  getSpecialCategoryPageTitle(slug: string): string {
    switch (slug.toLowerCase()) {
      case 'all':
        return 'All Products - Complete Collection';
      case 'sale':
        return 'Sale Products - Great Deals & Discounts';
      case 'new':
        return 'New Arrivals - Latest Products';
      default:
        return 'Products';
    }
  }

  /**
   * Get meta description for special categories
   */
  getSpecialCategoryMetaDescription(slug: string): string {
    switch (slug.toLowerCase()) {
      case 'all':
        return 'Browse our complete collection of products from all categories. Find everything you need in one place.';
      case 'sale':
        return 'Discover amazing deals and discounts on our sale collection. Save big on your favorite products.';
      case 'new':
        return 'Check out our latest products and newest additions to the collection. Be the first to shop new arrivals.';
      default:
        return 'Explore our wide range of products.';
    }
  }

  /**
   * Create a virtual category for special categories
   */
  private createSpecialCategory(
    id: string,
    name: string,
    description: string
  ): Category {
    return {
      id,
      name,
      description,
      type: 'Special',
      slug: id,
      hasSubCategories: false,
      productsCount: 0,
      sortOrder: 0,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  /**
   * Create breadcrumb for special categories
   */
  private createSpecialCategoryBreadcrumb(
    categoryName: string,
    categorySlug: string
  ): Category[] {
    const homeCategory: Category = {
      id: 'home',
      name: 'Home',
      slug: 'home',
      type: 'Navigation',
      hasSubCategories: false,
      productsCount: 0,
      sortOrder: 0,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const currentCategory: Category = {
      id: categorySlug,
      name: categoryName,
      slug: categorySlug,
      type: 'Special',
      hasSubCategories: false,
      productsCount: 0,
      sortOrder: 0,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    return [homeCategory, currentCategory];
  }

  /**
   * Transform raw products from ProductService to DisplayProduct format
   */
  private transformToDisplayProducts(products: any[]): DisplayProduct[] {
    return products.map((product) => {
      // Calculate effective price (sale price if available, otherwise regular price)
      const effectivePrice = product.salePrice || product.price;
      const discountPercent =
        product.originalPrice && product.originalPrice > effectivePrice
          ? Math.round(
              ((product.originalPrice - effectivePrice) /
                product.originalPrice) *
                100
            )
          : 0;

      return {
        id: product.id,
        name: product.name,
        description: product.description,
        price: effectivePrice,
        originalPrice: product.originalPrice || product.price,
        salePrice: product.salePrice,
        effectivePrice: effectivePrice,
        discountPercent: discountPercent,
        onSale: !!(
          product.salePrice ||
          (product.originalPrice && product.originalPrice > effectivePrice)
        ),
        isOnSale: !!(
          product.salePrice ||
          (product.originalPrice && product.originalPrice > effectivePrice)
        ),
        imageUrl:
          product.imageUrl ||
          product.images?.[0]?.imageUrl ||
          'Images/placeholder.png',
        category: product.category?.name || product.categoryName || 'Products',
        categoryId: product.categoryId || product.category?.id,
        isAvailable: product.isAvailable !== false && product.stockQuantity > 0,
        stockQuantity: product.stockQuantity || 0,
        variants: product.variants || [],
        createdAt: product.createdAt,
        updatedAt: product.updatedAt,
      } as DisplayProduct;
    });
  }
}
