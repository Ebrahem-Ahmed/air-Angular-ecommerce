import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { DisplayProduct } from './category.types';

export interface PaginationState {
  currentPage: number;
  pageSize: number;
  totalPages: number;
  totalProducts: number;
}

@Injectable({
  providedIn: 'root',
})
export class PaginationService {
  private paginationState = new BehaviorSubject<PaginationState>({
    currentPage: 1,
    pageSize: 24,
    totalPages: 0,
    totalProducts: 0,
  });

  public pagination$ = this.paginationState.asObservable();

  /**
   * Get current pagination state
   */
  getCurrentState(): PaginationState {
    return this.paginationState.value;
  }

  /**
   * Update pagination based on filtered products
   */
  updatePagination(filteredProducts: DisplayProduct[]): PaginationState {
    const state = this.getCurrentState();
    const totalProducts = filteredProducts.length;
    const totalPages = Math.ceil(totalProducts / state.pageSize);
    const currentPage = Math.min(state.currentPage, totalPages || 1);

    const newState = {
      ...state,
      currentPage,
      totalPages,
      totalProducts,
    };

    this.paginationState.next(newState);
    return newState;
  }

  /**
   * Get paginated products
   */
  getPaginatedProducts(products: DisplayProduct[]): DisplayProduct[] {
    const state = this.getCurrentState();
    const startIndex = (state.currentPage - 1) * state.pageSize;
    const endIndex = startIndex + state.pageSize;
    return products.slice(startIndex, endIndex);
  }

  /**
   * Change page
   */
  changePage(page: number): void {
    const state = this.getCurrentState();
    if (page >= 1 && page <= state.totalPages) {
      this.paginationState.next({
        ...state,
        currentPage: page,
      });
    }
  }

  /**
   * Change page size
   */
  changePageSize(pageSize: number): void {
    const state = this.getCurrentState();
    this.paginationState.next({
      ...state,
      pageSize,
      currentPage: 1, // Reset to first page when changing page size
    });
  }

  /**
   * Reset to first page
   */
  resetToFirstPage(): void {
    const state = this.getCurrentState();
    this.paginationState.next({
      ...state,
      currentPage: 1,
    });
  }

  /**
   * Parse page from query parameters
   */
  parsePageFromQuery(queryParams: any): void {
    if (queryParams.page) {
      const page = parseInt(queryParams.page) || 1;
      const state = this.getCurrentState();
      this.paginationState.next({
        ...state,
        currentPage: page,
      });
    }
  }

  /**
   * Get query parameter for current page
   */
  getPageQueryParam(): any {
    const state = this.getCurrentState();
    return state.currentPage > 1 ? { page: state.currentPage } : {};
  }
}
