import { Injectable, inject } from '@angular/core';
import { Observable, Subject, combineLatest } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { CategoryService, Category } from './category.service';
import { ProductService, Product } from '../product/product.service';
import { DisplayProduct } from './category.types';

@Injectable({
  providedIn: 'root',
})
export class CategoryDataService {
  private categoryService = inject(CategoryService);
  private productService = inject(ProductService);

  /**
   * Check if a string is a UUID
   */
  isUUID(str: string): boolean {
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(str);
  }

  /**
   * Check if the slug is a special category (all, sale, new)
   */
  isSpecialCategorySlug(slug: string): boolean {
    const specialSlugs = ['all', 'sale', 'new'];
    return specialSlugs.includes(slug.toLowerCase());
  }

  /**
   * Load category data by ID
   */
  loadCategoryById(
    categoryId: string,
    destroy$: Subject<void>
  ): Observable<{
    category: Category;
    products: DisplayProduct[];
    breadcrumb: Category[];
  }> {
    return new Observable((observer) => {
      combineLatest([
        this.categoryService.getCategoryDetails(categoryId),
        this.categoryService.getCategoryBreadcrumb(categoryId),
      ])
        .pipe(takeUntil(destroy$))
        .subscribe({
          next: ([categoryDetails, breadcrumb]) => {
            // Handle null category
            if (!categoryDetails) {
              observer.error(
                new Error(`Category with ID "${categoryId}" not found`)
              );
              return;
            }

            let productsObservable: Observable<Product[]>;

            // Fix: Handle undefined products array
            if (
              categoryDetails.products &&
              Array.isArray(categoryDetails.products)
            ) {
              // Use products from category details
              productsObservable = new Observable((productObserver) => {
                productObserver.next(categoryDetails.products!); // Safe to use ! here after null check
                productObserver.complete();
              });
            } else {
              // Fallback to separate API call
              productsObservable =
                this.productService.getProductsByCategory(categoryId);
            }

            productsObservable.pipe(takeUntil(destroy$)).subscribe({
              next: (products) => {
                const processedProducts =
                  this.processProductsForDisplay(products);
                observer.next({
                  category: categoryDetails, // Now guaranteed to be non-null
                  products: processedProducts,
                  breadcrumb: breadcrumb || [],
                });
                observer.complete();
              },
              error: (error) => {
                observer.error(error);
              },
            });
          },
          error: (error) => {
            observer.error(error);
          },
        });
    });
  }

  /**
   * Load category by slug
   */
  loadCategoryBySlug(
    slug: string,
    destroy$: Subject<void>
  ): Observable<{
    category: Category;
    products: DisplayProduct[];
    breadcrumb: Category[];
  }> {
    return new Observable((observer) => {
      this.categoryService
        .getCategoryBySlug(slug)
        .pipe(takeUntil(destroy$))
        .subscribe({
          next: (category) => {
            if (category) {
              this.loadCategoryById(category.id, destroy$).subscribe({
                next: (result) => observer.next(result),
                error: (error) => observer.error(error),
              });
            } else {
              observer.error(new Error(`Category "${slug}" not found`));
            }
          },
          error: (error) => observer.error(error),
        });
    });
  }

  /**
   * Load all products
   */
  loadAllProducts(destroy$: Subject<void>): Observable<DisplayProduct[]> {
    return new Observable((observer) => {
      this.productService
        .getAllProducts()
        .pipe(takeUntil(destroy$))
        .subscribe({
          next: (products) => {
            const processedProducts = this.processProductsForDisplay(products);
            observer.next(processedProducts);
            observer.complete();
          },
          error: (error) => observer.error(error),
        });
    });
  }

  /**
   * Load products by type
   */
  loadProductsByType(
    categoryType: string,
    destroy$: Subject<void>
  ): Observable<{
    category: Category;
    products: DisplayProduct[];
  }> {
    return new Observable((observer) => {
      // Create virtual category
      const virtualCategory: Category = {
        id: categoryType.toLowerCase(),
        name: `${categoryType}'s Products`,
        description: `Explore our ${categoryType.toLowerCase()}'s collection`,
        type: categoryType,
        slug: categoryType.toLowerCase(),
        hasSubCategories: false,
        productsCount: 0,
        sortOrder: 0,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      this.loadAllProducts(destroy$).subscribe({
        next: (products) => {
          observer.next({
            category: virtualCategory,
            products,
          });
          observer.complete();
        },
        error: (error) => observer.error(error),
      });
    });
  }

  /**
   * Process products to create display-friendly objects with computed properties
   */
  processProductsForDisplay(
    products: Product[] | null | undefined
  ): DisplayProduct[] {
    if (!products || !Array.isArray(products)) {
      console.warn(
        'processProductsForDisplay received invalid data:',
        products
      );
      return [];
    }

    return products.map((product) => {
      const displayProduct: DisplayProduct = {
        ...product,
        onSale: this.productService.isProductOnSale(product),
        effectivePrice: this.productService.getEffectivePrice(product),
        discountPercent: this.productService.getDiscountPercentage(product),
        originalPrice: product.isOnSale ? product.price : undefined,
        discount: product.isOnSale
          ? `${this.productService.getDiscountPercentage(product)}% Off`
          : undefined,

        // Use actual product category data instead of hardcoded values
        // Cast to any to access properties that exist in runtime but not in interface
        category:
          (product as any).categoryName ||
          (product as any).category?.name ||
          'Uncategorized',

        // Use actual data from API response
        brand:
          (product as any).brand?.name ||
          (product as any).brandName ||
          'Unknown Brand',
        collection: 'Performance', // Consider adding this to your Product model
        productType: 'Shoes', // Consider adding this to your Product model or derive from category
        rating: (product as any).averageRating || Math.random() * 2 + 3,
        reviewsCount:
          (product as any).reviewCount || Math.floor(Math.random() * 100) + 10,
        salesCount: Math.floor(Math.random() * 500) + 50, // Consider adding this to your Product model
        isAvailable:
          (product as any).inStock || (product as any).computedInStock || true,

        availableSizes: [],
        availableColors: [],

        // Primary image with fallback
        imageUrl: product.images?.[0]?.imageUrl || 'Images/placeholder.png',
      };

      return displayProduct;
    });
  }

  /**
   * Load product variants to enhance display product
   */
  loadProductVariants(
    product: DisplayProduct,
    destroy$: Subject<void>
  ): Observable<DisplayProduct> {
    return new Observable((observer) => {
      this.productService
        .getProductWithVariants(product.id)
        .pipe(takeUntil(destroy$))
        .subscribe({
          next: (productWithVariants) => {
            const enhancedProduct = { ...product };
            enhancedProduct.variants = productWithVariants.variants;
            enhancedProduct.availableSizes =
              this.productService.getAvailableSizes(
                productWithVariants.variants
              );
            enhancedProduct.availableColors =
              this.productService.getAvailableColors(
                productWithVariants.variants
              );
            enhancedProduct.isAvailable = productWithVariants.variants.some(
              (v) => this.productService.isVariantInStock(v)
            );

            // Update the primary image if variants have images
            const primaryVariant = productWithVariants.variants.find((v) =>
              this.productService.isVariantInStock(v)
            );
            if (primaryVariant?.images?.length) {
              const primaryImage = this.productService.getPrimaryImage(
                primaryVariant.images
              );
              if (primaryImage) {
                enhancedProduct.imageUrl = primaryImage.imageUrl;
              }
            }

            observer.next(enhancedProduct);
            observer.complete();
          },
          error: (error) => {
            console.error(
              `Error loading variants for product ${product.id}:`,
              error
            );
            // Return original product with empty arrays as fallback
            const fallbackProduct = { ...product };
            fallbackProduct.availableSizes = [];
            fallbackProduct.availableColors = [];
            fallbackProduct.isAvailable = false;
            observer.next(fallbackProduct);
            observer.complete();
          },
        });
    });
  }
}
