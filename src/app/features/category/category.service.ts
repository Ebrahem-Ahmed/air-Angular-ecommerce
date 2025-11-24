// services/category.service.ts
import { Injectable, inject } from '@angular/core';
import { Observable, forkJoin, of } from 'rxjs';
import { map, switchMap, catchError } from 'rxjs/operators';
import { ApiService } from '../../core/services/api.service.ts.service';

// Category related interfaces
export interface Category {
  id: string;
  name: string;
  description?: string;
  type: string; // Changed from CategoryType enum to string to match backend
  slug: string;
  hasSubCategories: boolean;
  productsCount: number;
  imageUrl?: string;
  parentCategoryId?: string;
  sortOrder: number;
  metaTitle?: string;
  metaDescription?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  parentCategory?: Category;
  subCategories?: Category[];
  products?: any[];
  productCount?: number;
}

export enum CategoryType {
  Main = 'Main',
  Sub = 'Sub',
}

export enum CategoryStatus {
  Active = 'Active',
  Inactive = 'Inactive',
}

export interface CategoryHierarchy {
  mainCategory: Category;
  subCategories: Category[];
}

@Injectable({ providedIn: 'root' })
export class CategoryService {
  private api = inject(ApiService);

  /**
   * Get all sub categories
   */
  getAllSubCategories(): Observable<Category[]> {
    return this.api.get<Category[]>('Categories/GetAllSubCategories').pipe(
      catchError((error) => {
        console.error('Error fetching sub categories:', error);
        return of([]);
      })
    );
  }

  /**
   * Get main categories by type (e.g., 'Men', 'Women', 'Kids', 'Sports')
   * Now returns categories with their subcategories already populated
   */
  getMainCategoriesByType(type: string): Observable<Category[]> {
    return this.api
      .get<Category[]>(`Categories/GetMainCategoriesByType/${type}`)
      .pipe(
        map((categories) => {
          // Ensure subcategories are properly typed and filtered
          return categories.map((category) => ({
            ...category,
            subCategories:
              category.subCategories?.filter(
                (sub) => sub && sub.isActive !== false
              ) || [],
          }));
        }),
        catchError((error) => {
          console.error(
            `Error fetching main categories for type ${type}:`,
            error
          );
          return of([]);
        })
      );
  }

  /**
   * Get all main categories with their subcategories populated
   */
  getAllMainCategories(): Observable<Category[]> {
    return this.api.get<Category[]>('Categories/GetAllMainCategories').pipe(
      map((categories) => {
        // Ensure subcategories are properly handled
        return categories.map((category) => ({
          ...category,
          subCategories:
            category.subCategories?.filter(
              (sub) => sub && sub.isActive !== false
            ) || [],
        }));
      }),
      catchError((error) => {
        console.error('Error fetching all main categories:', error);
        return of([]);
      })
    );
  }

  /**
   * Get sub categories by parent category ID
   */
  getSubCategoriesByCategoryId(categoryId: string): Observable<Category> {
    return this.api
      .get<Category>(`Categories/GetSubCategoriesByCategoryId/${categoryId}`)
      .pipe(
        map((categoryWithSubs) => ({
          ...categoryWithSubs,
          subCategories:
            categoryWithSubs.subCategories?.filter(
              (sub) => sub && sub.isActive !== false
            ) || [],
        })),
        catchError((error) => {
          console.error(
            `Error fetching sub categories for ID ${categoryId}:`,
            error
          );
          return of({} as Category);
        })
      );
  }

  /**
   * Get category hierarchy (main categories with their sub categories)
   * Simplified since backend now returns subcategories with main categories
   */
  getCategoryHierarchy(): Observable<CategoryHierarchy[]> {
    return this.getAllMainCategories().pipe(
      map((mainCategories) => {
        return mainCategories.map((mainCategory) => ({
          mainCategory,
          subCategories: mainCategory.subCategories || [],
        }));
      }),
      catchError((error) => {
        console.error('Error building category hierarchy:', error);
        return of([]);
      })
    );
  }

  /**
   * Get navigation menu structure for different types
   * Returns categories with subcategories already populated from backend
   */
  getNavigationMenuByType(type: string): Observable<Category[]> {
    return this.getMainCategoriesByType(type).pipe(
      map((categories) => {
        if (!Array.isArray(categories) || categories.length === 0) {
          return [];
        }

        // Create flat array: [mainCategory1, subCat1, subCat2, mainCategory2, subCat3, ...]
        const flatCategories: Category[] = [];

        categories.forEach((mainCategory) => {
          // Add main category
          flatCategories.push(mainCategory);

          // Add its subcategories
          if (Array.isArray(mainCategory.subCategories)) {
            mainCategory.subCategories.forEach((subCat) => {
              flatCategories.push(subCat);
            });
          }
        });

        return flatCategories;
      }),
      catchError((error) => {
        console.error(`Error getting navigation menu for type ${type}:`, error);
        return of([]);
      })
    );
  }

  /**
   * Get navigation menu as hierarchy - simplified since backend returns complete data
   */
  getNavigationMenuHierarchyByType(
    type: string
  ): Observable<CategoryHierarchy[]> {
    return this.getMainCategoriesByType(type).pipe(
      map((mainCategories) => {
        if (!Array.isArray(mainCategories) || mainCategories.length === 0) {
          return [];
        }

        return mainCategories.map((mainCategory) => ({
          mainCategory,
          subCategories: mainCategory.subCategories || [],
        }));
      }),
      catchError((error) => {
        console.error(
          `Error getting navigation hierarchy for type ${type}:`,
          error
        );
        return of([]);
      })
    );
  }

  /**
   * Find category by ID (searches both main and sub categories)
   */
  findCategoryById(categoryId: string): Observable<Category | null> {
    return new Observable((subscriber) => {
      // First try to find in main categories
      this.getAllMainCategories().subscribe({
        next: (mainCategories) => {
          // Check main categories
          const mainCategory = mainCategories.find(
            (cat) => cat.id === categoryId
          );
          if (mainCategory) {
            subscriber.next(mainCategory);
            subscriber.complete();
            return;
          }

          // Check in subcategories of main categories
          for (const mainCat of mainCategories) {
            if (mainCat.subCategories) {
              const subCategory = mainCat.subCategories.find(
                (sub) => sub.id === categoryId
              );
              if (subCategory) {
                subscriber.next(subCategory);
                subscriber.complete();
                return;
              }
            }
          }

          // Not found
          subscriber.next(null);
          subscriber.complete();
        },
        error: (error) => subscriber.error(error),
      });
    });
  }

  /**
   * Get breadcrumb path for a category - with better error handling
   */
  getCategoryBreadcrumb(categoryId: string): Observable<Category[]> {
    return new Observable((subscriber) => {
      this.findCategoryById(categoryId).subscribe({
        next: (category) => {
          if (!category) {
            subscriber.next([]);
            subscriber.complete();
            return;
          }

          const breadcrumb: Category[] = [category];

          if (category.parentCategoryId) {
            this.findCategoryById(category.parentCategoryId).subscribe({
              next: (parentCategory) => {
                if (parentCategory) {
                  breadcrumb.unshift(parentCategory);
                }
                subscriber.next(breadcrumb);
                subscriber.complete();
              },
              error: (error) => {
                console.error('Error getting parent category:', error);
                // Still return the current category even if parent lookup fails
                subscriber.next(breadcrumb);
                subscriber.complete();
              },
            });
          } else {
            subscriber.next(breadcrumb);
            subscriber.complete();
          }
        },
        error: (error) => {
          console.error('Error in getCategoryBreadcrumb:', error);
          subscriber.next([]);
          subscriber.complete();
        },
      });
    });
  }

  /**
   * Check if category is a main category
   */
  isMainCategory(category: Category): boolean {
    return !category.parentCategoryId;
  }

  /**
   * Check if category is a sub category
   */
  isSubCategory(category: Category): boolean {
    return !!category.parentCategoryId;
  }

  /**
   * Get active categories only
   */
  getActiveMainCategories(): Observable<Category[]> {
    return this.getAllMainCategories().pipe(
      map((categories) =>
        Array.isArray(categories)
          ? categories.filter((cat) => cat && cat.isActive)
          : []
      )
    );
  }

  /**
   * Get active sub categories only
   */
  getActiveSubCategories(): Observable<Category[]> {
    return this.getAllMainCategories().pipe(
      map((categories) => {
        const subCategories: Category[] = [];
        categories.forEach((mainCat) => {
          if (mainCat.subCategories) {
            subCategories.push(
              ...mainCat.subCategories.filter((sub) => sub.isActive)
            );
          }
        });
        return subCategories;
      })
    );
  }

  /**
   * Get categories sorted by order
   */
  getSortedMainCategories(): Observable<Category[]> {
    return this.getAllMainCategories().pipe(
      map((categories) =>
        Array.isArray(categories)
          ? categories.sort((a, b) => a.sortOrder - b.sortOrder)
          : []
      )
    );
  }

  /**
   * Get categories for mega menu structure - FIXED VERSION
   * Now properly returns subcategories with each main category
   */
getMegaMenuStructure(): Observable<{ all: CategoryHierarchy[] }> {
  // نجيب كل الـ main categories مرة واحدة
  return this.getAllMainCategories().pipe(
    map((mainCategories) => {
      const hierarchy: CategoryHierarchy[] = mainCategories.map((mainCategory) => ({
        mainCategory,
        subCategories: mainCategory.subCategories || [],
      }));

      // نرجعهم تحت مفتاح واحد بدل كل type
      return { all: hierarchy };
    }),
    catchError((error) => {
      console.error('Error fetching mega menu:', error);
      return of({ all: [] });
    })
  );
}

  /**
   * Search categories by name - Updated to search in both main and subcategories
   */
  searchCategories(searchTerm: string): Observable<Category[]> {
    return this.getAllMainCategories().pipe(
      map((mainCategories) => {
        const results: Category[] = [];
        const searchLower = searchTerm.toLowerCase();

        mainCategories.forEach((mainCategory) => {
          // Check main category
          if (
            mainCategory.name?.toLowerCase().includes(searchLower) ||
            mainCategory.description?.toLowerCase().includes(searchLower)
          ) {
            results.push(mainCategory);
          }

          // Check subcategories
          if (mainCategory.subCategories) {
            mainCategory.subCategories.forEach((subCategory) => {
              if (
                subCategory.name?.toLowerCase().includes(searchLower) ||
                subCategory.description?.toLowerCase().includes(searchLower)
              ) {
                results.push(subCategory);
              }
            });
          }
        });

        return results;
      }),
      catchError((error) => {
        console.error('Error searching categories:', error);
        return of([]);
      })
    );
  }

  /**
   * Get category details by ID - Updated to handle response format
   */
  getCategoryDetails(categoryId: string): Observable<Category | null> {
    return this.api
      .get<any>(`Categories/GetCategoryDetails/${categoryId}`)
      .pipe(
        map((response) => {
          const category = this.extractCategoryData(response);
          if (!category) return null;

          return {
            ...category,
            subCategories:
              category.subCategories?.filter(
                (sub) => sub && sub.isActive !== false
              ) || [],
            // Ensure products array is available
            products: category.products || [],
          };
        }),
        catchError((error) => {
          console.error(
            `Error fetching category details for ${categoryId}:`,
            error
          );
          return of(null);
        })
      );
  }

  /**
   * get categories details by slug
   */
  getCategoryBySlug(slug: string): Observable<Category | null> {
    return this.api
      .get<any>(`Categories/GetCategoryDetailsBySlug/${slug}`)
      .pipe(
        map((response) => {
          const category = this.extractCategoryData(response);
          if (!category) return null;

          return {
            ...category,
            subCategories:
              category.subCategories?.filter(
                (sub) => sub && sub.isActive !== false
              ) || [],
            // Ensure products array is available
            products: category.products || [],
          };
        }),
        catchError((error) => {
          console.error(`Error fetching category details for ${slug}:`, error);
          return of(null);
        })
      );
  }

  /**
   * Get filtered categories
   */
  getFilteredCategories(
    categoryType?: string,
    statusFilter?: string,
    searchTerm?: string
  ): Observable<Category[]> {
    const params = new URLSearchParams();
    if (categoryType) params.append('categoryType', categoryType);
    if (statusFilter) params.append('statusFilter', statusFilter);
    if (searchTerm) params.append('searchTerm', searchTerm);

    const queryString = params.toString();
    const url = `Categories/GetFilteredCategories${
      queryString ? `?${queryString}` : ''
    }`;

    return this.api.get<Category[]>(url).pipe(
      map((categories) => {
        return categories.map((category) => ({
          ...category,
          subCategories:
            category.subCategories?.filter(
              (sub) => sub && sub.isActive !== false
            ) || [],
        }));
      }),
      catchError((error) => {
        console.error('Error fetching filtered categories:', error);
        return of([]);
      })
    );
  }

  /**
   * Helper method to extract category data from API responses
   */
  private extractCategoryData(response: any): Category | null {
    console.log('Raw Category API Response:', response);

    // Handle direct category object
    if (response && response.id) {
      return response;
    }

    // Handle wrapped response
    if (response && response.isSuccess && response.data && response.data.id) {
      return response.data;
    }

    // Handle response with just data property
    if (response && response.data && response.data.id) {
      return response.data;
    }

    console.warn('Unexpected category API response format:', response);
    return null;
  }
}
