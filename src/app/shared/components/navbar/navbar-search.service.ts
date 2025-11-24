// navbar-search.service.ts
import { Injectable, inject } from '@angular/core';
import {
  Observable,
  Subject,
  debounceTime,
  distinctUntilChanged,
  switchMap,
  of,
  catchError,
  forkJoin,
  map,
} from 'rxjs';
import { ProductService } from '../../../features/product/product.service';
import { CategoryService } from '../../../features/category/category.service';

interface SearchResult {
  id: string;
  title: string;
  type: 'product' | 'category';
  image?: string;
  price?: string;
  link: string;
}

@Injectable({
  providedIn: 'root',
})
export class NavbarSearchService {
  private productService = inject(ProductService);
  private categoryService = inject(CategoryService);
  private searchSubject$ = new Subject<string>();

  setupSearch(): Observable<SearchResult[]> {
    return this.searchSubject$.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      switchMap((searchTerm) => this.performSearch(searchTerm)),
      catchError(() => of([]))
    );
  }

  performSearch(searchTerm: string): Observable<SearchResult[]> {
    if (!searchTerm.trim()) {
      return this.getRecentItems();
    }

    return forkJoin({
      products: this.productService
        .getAllProducts()
        .pipe(catchError(() => of([]))),
      categories: this.categoryService
        .searchCategories(searchTerm)
        .pipe(catchError(() => of([]))),
    }).pipe(
      map(({ products, categories }) => {
        const searchLower = searchTerm.toLowerCase().trim();

        const filteredProducts = this.filterProducts(products, searchLower);
        const filteredCategories = this.filterCategories(
          categories,
          searchLower
        );

        return [
          ...filteredCategories.slice(0, 3).map(this.mapCategoryToResult),
          ...filteredProducts.slice(0, 5).map(this.mapProductToResult),
        ];
      })
    );
  }

  triggerSearch(query: string) {
    this.searchSubject$.next(query);
  }

  private getRecentItems(): Observable<SearchResult[]> {
    return forkJoin({
      products: this.productService
        .getLastAddedProducts()
        .pipe(catchError(() => of([]))),
      categories: this.categoryService
        .getActiveMainCategories()
        .pipe(catchError(() => of([]))),
    }).pipe(
      map(({ products, categories }) => [
        ...(Array.isArray(products)
          ? products.slice(0, 3).map(this.mapProductToResult)
          : []),
        ...(Array.isArray(categories)
          ? categories.slice(0, 2).map(this.mapCategoryToResult)
          : []),
      ])
    );
  }

  private filterProducts(products: any[], searchLower: string): any[] {
    return (Array.isArray(products) ? products : [])
      .filter((product) => {
        if (!product?.name) return false;
        const name = product.name.toLowerCase();
        const brand = product.brand?.toLowerCase() || '';
        return name.includes(searchLower) || brand.includes(searchLower);
      })
      .sort((a, b) => {
        const aExact = a.name?.toLowerCase().includes(searchLower);
        const bExact = b.name?.toLowerCase().includes(searchLower);
        return bExact ? 1 : aExact ? -1 : 0;
      });
  }

  private filterCategories(categories: any[], searchLower: string): any[] {
    return (Array.isArray(categories) ? categories : []).filter((category) =>
      category?.name?.toLowerCase().includes(searchLower)
    );
  }

  private mapProductToResult = (product: any): SearchResult => ({
    id: product.id?.toString() || '',
    title: product.name || 'Product',
    type: 'product',
    price: product.price ? this.formatPrice(product.price) : undefined,
    link: `product-details/${product.id || ''}`,
    image: product.images?.[0]?.imageUrl || 'assets/placeholder-product.jpg',
  });

  private mapCategoryToResult = (category: any): SearchResult => ({
    id: category.id?.toString() || '',
    title: category.name || 'Category',
    type: 'category',
    link: `category/${category.id || ''}`,
    image: category.imageUrl || 'assets/placeholder-category.jpg',
  });

  private formatPrice(price: string | number): string {
    const numPrice = typeof price === 'string' ? parseFloat(price) : price;
    if (isNaN(numPrice)) return '0';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'EGP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(numPrice);
  }
}

