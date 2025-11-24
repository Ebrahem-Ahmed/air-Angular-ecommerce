// shared/models/review.models.ts

// Base Review Interface
export interface ReviewDto {
  id: string;
  userId: string;
  productId: string;
  rating: number;
  comment: string;
  title?: string;
  isApproved: boolean;
  createdAt: string;
  updatedAt?: string;
  userName?: string;
  userEmail?: string;
  productName?: string;
  productImageUrl?: string;
}

// Review Creation DTO
export interface ReviewCreateDto {
  productId: string;
  rating: number;
  comment: string;
  title?: string;
}

// Review Update DTO
export interface ReviewUpdateDto {
  id?: string;
  rating: number;
  comment: string;
  title?: string;
}

// Review Filter DTO
export interface ReviewFilterDto {
  productId?: string;
  userId?: string;
  minRating?: number;
  maxRating?: number;
  isApproved?: boolean;
  searchTerm?: string;
  sortBy?: ReviewSortBy;
  sortOrder?: SortOrder;
  dateFrom?: string;
  dateTo?: string;
}

// Product Review Summary DTO
export interface ProductReviewSummaryDto {
  productId: string;
  productName?: string;
  totalReviews: number;
  averageRating: number;
  ratingDistribution: RatingDistribution;
  approvedReviewsCount: number;
  pendingReviewsCount: number;
  rejectedReviewsCount: number;
  mostRecentReview?: ReviewDto;
  topRatedReview?: ReviewDto;
}

// Rating Distribution
export interface RatingDistribution {
  1: number;
  2: number;
  3: number;
  4: number;
  5: number;
}

// Paged Result DTO
export interface PagedResultDto<T> {
  items: T[];
  totalCount: number;
  currentPage: number;
  totalPages: number;
  pageSize: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

// API Response Wrapper
export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  errors?: string[];
  statusCode?: number;
}

// Enums
export enum ReviewSortBy {
  Rating = 'rating',
  CreatedAt = 'createdAt',
  UpdatedAt = 'updatedAt',
  UserName = 'userName',
  ProductName = 'productName',
}

export enum SortOrder {
  Asc = 'asc',
  Desc = 'desc',
}

export enum ReviewStatus {
  Pending = 'pending',
  Approved = 'approved',
  Rejected = 'rejected',
}

// Review Form Model
export interface ReviewFormModel {
  rating: number;
  title: string;
  comment: string;
  productId?: string;
}

// Review Display Model (for UI components)
export interface ReviewDisplayModel extends ReviewDto {
  formattedDate: string;
  starRating: StarRating[];
  isOwner: boolean;
  canEdit: boolean;
  canDelete: boolean;
}

// Star Rating for UI
export interface StarRating {
  filled: boolean;
  half: boolean;
  index: number;
}

// Review Statistics
export interface ReviewStatistics {
  totalReviews: number;
  averageRating: number;
  ratingDistribution: RatingDistribution;
  ratingsPercentage: { [key: number]: number };
  mostCommonRating: number;
  recentReviewsCount: number; // reviews in last 30 days
}

// Review Validation Result
export interface ReviewValidationResult {
  isValid: boolean;
  errors: string[];
  warnings?: string[];
}

// Review Query Parameters
export interface ReviewQueryParams {
  pageNumber?: number;
  pageSize?: number;
  sortBy?: ReviewSortBy;
  sortOrder?: SortOrder;
  rating?: number;
  approved?: boolean;
  search?: string;
  productId?: string;
  userId?: string;
}

// Review Action Result
export interface ReviewActionResult {
  success: boolean;
  message: string;
  review?: ReviewDto;
  errors?: string[];
}

// Review Bulk Operations
export interface ReviewBulkUpdateDto {
  reviewIds: string[];
  isApproved?: boolean;
  status?: ReviewStatus;
}

export interface ReviewBulkDeleteDto {
  reviewIds: string[];
  reason?: string;
}

// Review Export Options
export interface ReviewExportOptions {
  format: 'csv' | 'excel' | 'pdf';
  filters?: ReviewFilterDto;
  includeUserInfo: boolean;
  includeProductInfo: boolean;
  dateRange?: {
    from: string;
    to: string;
  };
}

// Review Import Result
export interface ReviewImportResult {
  totalProcessed: number;
  successful: number;
  failed: number;
  errors: string[];
  warnings: string[];
}

// Helpful Types
export type ReviewRating = 1 | 2 | 3 | 4 | 5;

export type ReviewSortOptions = {
  field: ReviewSortBy;
  direction: SortOrder;
  label: string;
}[];

// Constants
export const REVIEW_CONSTANTS = {
  MIN_COMMENT_LENGTH: 10,
  MAX_COMMENT_LENGTH: 1000,
  MAX_TITLE_LENGTH: 100,
  DEFAULT_PAGE_SIZE: 10,
  MAX_PAGE_SIZE: 100,
  RATING_SCALE: [1, 2, 3, 4, 5] as const,
} as const;

export const REVIEW_SORT_OPTIONS: ReviewSortOptions = [
  {
    field: ReviewSortBy.CreatedAt,
    direction: SortOrder.Desc,
    label: 'Newest First',
  },
  {
    field: ReviewSortBy.CreatedAt,
    direction: SortOrder.Asc,
    label: 'Oldest First',
  },
  {
    field: ReviewSortBy.Rating,
    direction: SortOrder.Desc,
    label: 'Highest Rating',
  },
  {
    field: ReviewSortBy.Rating,
    direction: SortOrder.Asc,
    label: 'Lowest Rating',
  },
  {
    field: ReviewSortBy.UserName,
    direction: SortOrder.Asc,
    label: 'User Name A-Z',
  },
  {
    field: ReviewSortBy.UserName,
    direction: SortOrder.Desc,
    label: 'User Name Z-A',
  },
];

// Review Form Validators
export const REVIEW_VALIDATORS = {
  rating: {
    required: true,
    min: 1,
    max: 5,
  },
  comment: {
    required: true,
    minLength: REVIEW_CONSTANTS.MIN_COMMENT_LENGTH,
    maxLength: REVIEW_CONSTANTS.MAX_COMMENT_LENGTH,
  },
  title: {
    required: false,
    maxLength: REVIEW_CONSTANTS.MAX_TITLE_LENGTH,
  },
} as const;
