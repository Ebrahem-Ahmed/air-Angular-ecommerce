// services/review.service.ts
import { Injectable, inject } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { ApiService } from './api.service.ts.service';

// Review DTOs and Models
export interface ReviewDto {
  id: string;
  userId: string;
  productId: string;
  rating: number;
  reviewText: string; // Changed from 'comment' to 'reviewText'
  title?: string;
  isApproved: boolean;
  isVerifiedPurchase: boolean;
  createdAt: string;
  updatedAt?: string;
  userName?: string;
  productName?: string;
  userEmail?: string;
}

// Updated to match your API structure
export interface ReviewCreateDto {
  userId: string;
  productId: string;
  rating: number;
  title?: string;
  reviewText: string; // Changed from 'comment' to 'reviewText'
  isVerifiedPurchase: boolean;
}

export interface ReviewUpdateDto {
  id?: string;
  rating: number;
  reviewText: string; // Changed from 'comment' to 'reviewText'
  title?: string;
}

export interface ReviewFilterDto {
  productId?: string;
  userId?: string;
  minRating?: number;
  maxRating?: number;
  isApproved?: boolean;
  searchTerm?: string;
  sortBy?: 'rating' | 'createdAt' | 'updatedAt';
  sortOrder?: 'asc' | 'desc';
}

export interface ProductReviewSummaryDto {
  productId: string;
  totalReviews: number;
  averageRating: number;
  ratingDistribution: { [key: number]: number };
  approvedReviewsCount: number;
}

export interface PagedResultDto<T> {
  items: T[];
  totalCount: number;
  currentPage: number;
  totalPages: number;
  pageSize: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  errors?: string[];
}

@Injectable({
  providedIn: 'root',
})
export class ReviewService {
  private api = inject(ApiService);
  private readonly baseEndpoint = 'reviews';

  constructor() {}

  // CRUD Operations

  /**
   * Get all reviews with pagination
   */
  getReviews(
    pageNumber: number = 1,
    pageSize: number = 10
  ): Observable<PagedResultDto<ReviewDto>> {
    const params = { pageNumber, pageSize };
    return this.api
      .get<PagedResultDto<ReviewDto>>(this.baseEndpoint, params)
      .pipe(catchError(this.handleError));
  }

  /**
   * Get review by ID
   */
  getReview(id: string): Observable<ReviewDto> {
    return this.api
      .get<ReviewDto>(`${this.baseEndpoint}/${id}`)
      .pipe(catchError(this.handleError));
  }

  /**
   * Create a new review - Updated to match API structure
   */
  createReview(reviewData: ReviewCreateDto): Observable<ReviewDto> {
    return this.api
      .post<ReviewDto>(this.baseEndpoint, reviewData)
      .pipe(catchError(this.handleError));
  }

  /**
   * Update an existing review
   */
  updateReview(id: string, reviewData: ReviewUpdateDto): Observable<ReviewDto> {
    return this.api
      .put<ReviewDto>(`${this.baseEndpoint}/${id}`, reviewData)
      .pipe(catchError(this.handleError));
  }

  /**
   * Delete a review
   */
  deleteReview(id: string): Observable<void> {
    return this.api
      .delete<void>(`${this.baseEndpoint}/${id}`)
      .pipe(catchError(this.handleError));
  }

  // Product Reviews

  /**
   * Get reviews for a specific product
   */
  getProductReviews(
    productId: string,
    pageNumber: number = 1,
    pageSize: number = 10
  ): Observable<PagedResultDto<ReviewDto>> {
    const params = { pageNumber, pageSize };
    return this.api
      .get<PagedResultDto<ReviewDto>>(
        `${this.baseEndpoint}/product/${productId}`,
        params
      )
      .pipe(catchError(this.handleError));
  }

  /**
   * Get review summary for a specific product
   */
  getProductReviewSummary(
    productId: string
  ): Observable<ProductReviewSummaryDto> {
    return this.api
      .get<ProductReviewSummaryDto>(
        `${this.baseEndpoint}/product/${productId}/summary`
      )
      .pipe(catchError(this.handleError));
  }

  /**
   * Check if current user can review a product
   */
  canUserReviewProduct(productId: string): Observable<boolean> {
    return this.api
      .get<boolean>(`${this.baseEndpoint}/product/${productId}/can-review`)
      .pipe(catchError(this.handleError));
  }

  // User Reviews

  /**
   * Get reviews by current user
   */
  getMyReviews(): Observable<ReviewDto[]> {
    return this.api
      .get<ReviewDto[]>(`${this.baseEndpoint}/my-reviews`)
      .pipe(catchError(this.handleError));
  }

  // Public Filtering and Search

  /**
   * Get filtered reviews with advanced filtering options
   */
  getFilteredReviews(
    filter: ReviewFilterDto,
    pageNumber: number = 1,
    pageSize: number = 10
  ): Observable<PagedResultDto<ReviewDto>> {
    const params = { pageNumber, pageSize };
    return this.api
      .post<PagedResultDto<ReviewDto>>(`${this.baseEndpoint}/filter`, filter)
      .pipe(catchError(this.handleError));
  }

  /**
   * Get approved reviews
   */
  getApprovedReviews(
    pageNumber: number = 1,
    pageSize: number = 10
  ): Observable<PagedResultDto<ReviewDto>> {
    const params = { pageNumber, pageSize };
    return this.api
      .get<PagedResultDto<ReviewDto>>(`${this.baseEndpoint}/approved`, params)
      .pipe(catchError(this.handleError));
  }

  // Utility Methods

  /**
   * Get reviews by rating
   */
  getReviewsByRating(
    rating: number,
    pageNumber: number = 1,
    pageSize: number = 10
  ): Observable<PagedResultDto<ReviewDto>> {
    const filter: ReviewFilterDto = {
      minRating: rating,
      maxRating: rating,
      isApproved: true,
    };
    return this.getFilteredReviews(filter, pageNumber, pageSize);
  }

  /**
   * Search reviews by text
   */
  searchReviews(
    searchTerm: string,
    pageNumber: number = 1,
    pageSize: number = 10
  ): Observable<PagedResultDto<ReviewDto>> {
    const filter: ReviewFilterDto = {
      searchTerm,
      isApproved: true,
    };
    return this.getFilteredReviews(filter, pageNumber, pageSize);
  }

  /**
   * Get recent reviews for a product
   */
  getRecentProductReviews(
    productId: string,
    limit: number = 5
  ): Observable<PagedResultDto<ReviewDto>> {
    const filter: ReviewFilterDto = {
      productId,
      isApproved: true,
      sortBy: 'createdAt',
      sortOrder: 'desc',
    };
    return this.getFilteredReviews(filter, 1, limit);
  }

  /**
   * Get top-rated reviews for a product
   */
  getTopRatedProductReviews(
    productId: string,
    limit: number = 5
  ): Observable<PagedResultDto<ReviewDto>> {
    const filter: ReviewFilterDto = {
      productId,
      isApproved: true,
      minRating: 4,
      sortBy: 'rating',
      sortOrder: 'desc',
    };
    return this.getFilteredReviews(filter, 1, limit);
  }

  /**
   * Calculate average rating from reviews
   */
  calculateAverageRating(reviews: ReviewDto[]): number {
    if (!reviews || reviews.length === 0) return 0;
    const total = reviews.reduce((sum, review) => sum + review.rating, 0);
    return Math.round((total / reviews.length) * 10) / 10; // Round to 1 decimal place
  }

  /**
   * Get rating distribution
   */
  getRatingDistribution(reviews: ReviewDto[]): { [key: number]: number } {
    const distribution: { [key: number]: number } = {
      1: 0,
      2: 0,
      3: 0,
      4: 0,
      5: 0,
    };

    reviews.forEach((review) => {
      if (review.rating >= 1 && review.rating <= 5) {
        distribution[review.rating]++;
      }
    });

    return distribution;
  }

  /**
   * Format review date for display
   */
  formatReviewDate(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) return 'Yesterday';
    if (diffDays <= 7) return `${diffDays} days ago`;
    if (diffDays <= 30) return `${Math.ceil(diffDays / 7)} weeks ago`;
    if (diffDays <= 365) return `${Math.ceil(diffDays / 30)} months ago`;

    return date.toLocaleDateString();
  }

  /**
   * Validate review data before submission - Updated for new structure
   */
  validateReviewData(reviewData: ReviewCreateDto | ReviewUpdateDto): string[] {
    const errors: string[] = [];

    if ('productId' in reviewData && !reviewData.productId?.trim()) {
      errors.push('Product ID is required');
    }

    if ('userId' in reviewData && !reviewData.userId?.trim()) {
      errors.push('User ID is required');
    }

    if (!reviewData.rating || reviewData.rating < 1 || reviewData.rating > 5) {
      errors.push('Rating must be between 1 and 5');
    }

    if (!reviewData.reviewText?.trim()) {
      errors.push('Review text is required');
    } else if (reviewData.reviewText.trim().length < 10) {
      errors.push('Review text must be at least 10 characters long');
    } else if (reviewData.reviewText.trim().length > 1000) {
      errors.push('Review text cannot exceed 1000 characters');
    }

    if (reviewData.title && reviewData.title.length > 100) {
      errors.push('Title cannot exceed 100 characters');
    }

    return errors;
  }

  /**
   * Generate star rating array for display
   */
  generateStarRating(rating: number): { filled: boolean; half: boolean }[] {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;

    // Add full stars
    for (let i = 0; i < fullStars; i++) {
      stars.push({ filled: true, half: false });
    }

    // Add half star if needed
    if (hasHalfStar) {
      stars.push({ filled: false, half: true });
    }

    // Add empty stars to make total of 5
    const remainingStars = 5 - stars.length;
    for (let i = 0; i < remainingStars; i++) {
      stars.push({ filled: false, half: false });
    }

    return stars;
  }

  /**
   * Health check
   */
  healthCheck(): Observable<{ status: string; timestamp: string }> {
    return this.api
      .get<{ status: string; timestamp: string }>(`${this.baseEndpoint}/health`)
      .pipe(catchError(this.handleError));
  }

  // Private helper methods

  /**
   * Handle HTTP errors
   */
  private handleError = (error: any): Observable<never> => {
    let errorMessage = 'An error occurred';

    if (error.error?.message) {
      errorMessage = error.error.message;
    } else if (error.message) {
      errorMessage = error.message;
    } else if (error.status) {
      switch (error.status) {
        case 400:
          errorMessage = 'Invalid request data';
          break;
        case 401:
          errorMessage = 'Authentication required';
          break;
        case 403:
          errorMessage = 'Access denied - You can only modify your own reviews';
          break;
        case 404:
          errorMessage = 'Review not found';
          break;
        case 422:
          errorMessage = 'Validation failed';
          break;
        case 500:
          errorMessage = 'Server error. Please try again later';
          break;
        default:
          errorMessage = `Error: ${error.status}`;
      }
    }

    console.error('Review Service Error:', error);
    return throwError(() => new Error(errorMessage));
  };
}
