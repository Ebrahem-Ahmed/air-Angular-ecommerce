import { Component, Input, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormsModule,
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  Validators,
} from '@angular/forms';
import { Router } from '@angular/router';
import { Subject, forkJoin, of } from 'rxjs';
import { takeUntil, catchError, map } from 'rxjs/operators';
import {
  ProductWithVariants,
  ProductVariant,
  ProductImage,
} from '../product/product.service';
import {
  ReviewService,
  ReviewCreateDto,
} from '../../core/services/review.service';
import { AuthService } from '../../core/services/auth.service.ts.service';
import {
  CustomerService,
  PublicCustomerInfoDto,
} from '../profile/customer.service';
import { TranslateModule } from '@ngx-translate/core';

interface Review {
  id: string;
  rating: number;
  title: string;
  reviewText: string;
  isVerifiedPurchase: boolean;
  isApproved: boolean;
  isActive: boolean;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy: string | null;
  modifiedAt: string | null;
  modifiedBy: string | null;
  productId: string;
  userId: string;
  productName: string | null;
  userEmail: string | null;
  rejectionReason: string | null;
}

// Extended interface to include customer name
interface ReviewWithCustomerInfo extends Review {
  customerName?: string;
  customerInitials?: string;
}

// Filter interface
interface ReviewFilters {
  rating: number | null;
  searchText: string;
  dateFrom: string;
  dateTo: string;
  sortBy: 'newest' | 'oldest' | 'highest' | 'lowest';
}

@Component({
  selector: 'app-product-accordion',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, TranslateModule],
  template: `<div class="px-3 px-md-4 mt-5 ">
      <div class="accordion" id="productAccordion">
        <!-- Product Description -->
        <div class="accordion-item border-0 border-bottom border-2">
          <h2 class="accordion-header">
            <button
              class="accordion-button bg-white text-dark fw-bold py-4 border-0 shadow-none"
              type="button"
              data-bs-toggle="collapse"
              data-bs-target="#productDescription"
              aria-expanded="true"
              aria-controls="productDescription"
              style="font-size: 16px"
            >
              {{ 'PRODUCT_ACCORDION.PRODUCT_DESCRIPTION' | translate }}
            </button>
          </h2>
          <div
            id="productDescription"
            class="accordion-collapse collapse show"
            data-bs-parent="#productAccordion"
          >
            <div class="accordion-body py-4">
              <div class="row align-items-start">
                <!-- Left column - Product name and description text -->
                <div class="col-lg-8 col-md-7">
                  <!-- Product Name as large heading -->
                  <h1
                    class="fw-bold text-uppercase mb-4"
                    style="
                      font-size: 2.5rem;
                      line-height: 1.1;
                      letter-spacing: 1px;
                    "
                  >
                    {{ product.name }}
                  </h1>

                  <!-- Subheading -->


                  <!-- Description text -->
                  <div class="text-muted lh-lg" style="font-size: 1rem">
                    {{ getProductDescription() }}
                  </div>
                </div>

                <!-- Right column - Product image -->
                <div class="col-lg-4 col-md-5">
                  @if (primaryImage) {
                  <div class="product-description-image">
                    <img
                      [src]="primaryImage.imageUrl"
                      [alt]="product.name"
                      class="img-fluid w-100"
                      style="max-width: 100%; height: auto"
                    />
                  </div>
                  }
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Product Details -->
        <div class="accordion-item border-0 border-bottom border-2">
          <h2 class="accordion-header">
            <button
              class="accordion-button collapsed bg-white text-dark fw-bold py-4 border-0 shadow-none"
              type="button"
              data-bs-toggle="collapse"
              data-bs-target="#productDetails"
              aria-expanded="false"
              aria-controls="productDetails"
              style="font-size: 16px"
            >
              {{ 'PRODUCT_ACCORDION.PRODUCT_DETAILS' | translate }}
            </button>
          </h2>
          <div
            id="productDetails"
            class="accordion-collapse collapse"
            data-bs-parent="#productAccordion"
          >
            <div class="accordion-body py-4 text-muted">
              <div class="row">
                @for (detail of getProductDetails(); track detail.label) {
                <div class="col-md-6 mb-3">
                  <strong class="text-dark">{{ detail.label }}:</strong>
                  <span class="ms-2">{{ detail.value }}</span>
                </div>
                }
              </div>
            </div>
          </div>
        </div>

        <!-- Reviews -->
        <div class="accordion-item border-0 border-bottom border-2">
          <h2 class="accordion-header">
            <button
              class="accordion-button collapsed bg-white text-dark fw-bold py-4 border-0 shadow-none"
              type="button"
              data-bs-toggle="collapse"
              data-bs-target="#reviews"
              aria-expanded="false"
              aria-controls="reviews"
              style="font-size: 16px"
            >
              {{ 'PRODUCT_ACCORDION.REVIEWS' | translate }} ({{
                getTotalReviewsCount()
              }})
            </button>
          </h2>
          <div
            id="reviews"
            class="accordion-collapse collapse"
            data-bs-parent="#productAccordion"
          >
            <div class="accordion-body py-4">
              <!-- Reviews content -->
              <div class="row">
                <!-- Left Column - Rating Snapshot -->
                <div class="col-md-4 mb-4">
                  <h6 class="fw-bold mb-3">
                    {{ 'PRODUCT_ACCORDION.RATING_SNAPSHOT' | translate }}
                  </h6>
                  @if (getTotalReviewsCount() > 0) {
                  <p class="text-muted mb-3 small">
                    {{ 'PRODUCT_ACCORDION.SELECT_ROW_TO_FILTER' | translate }}
                  </p>

                  <!-- Star Rating Bars -->
                  <div class="rating-bars">
                    @for (rating of [5, 4, 3, 2, 1]; track rating) {
                    <div class="d-flex align-items-center mb-2">
                      <button
                        type="button"
                        class="btn btn-link p-0 text-decoration-none me-2 small"
                        [class.text-primary]="filters.rating === rating"
                        [class.fw-bold]="filters.rating === rating"
                        (click)="filterByRating(rating)"
                        style="border: none; background: none"
                      >
                        {{ rating }}
                        {{
                          rating > 1
                            ? ('PRODUCT_ACCORDION.STARS' | translate)
                            : ('PRODUCT_ACCORDION.STAR' | translate)
                        }}
                      </button>
                      <div class="flex-grow-1 me-2">
                        <div class="progress" style="height: 8px">
                          <div
                            class="progress-bar bg-dark"
                            [style.width.%]="getRatingPercentage(rating)"
                          ></div>
                        </div>
                      </div>
                      <span class="small text-muted">{{
                        getRatingCount(rating)
                      }}</span>
                    </div>
                    }
                  </div>
                  } @else {
                  <p class="text-muted">
                    {{ 'PRODUCT_ACCORDION.NO_REVIEWS_YET' | translate }}
                  </p>
                  }
                </div>

                <!-- Middle Column - Overall Rating -->
                <div class="col-md-4 mb-4">
                  <h6 class="fw-bold mb-3">
                    {{ 'PRODUCT_ACCORDION.OVERALL_RATING' | translate }}
                  </h6>
                  <div class="text-center">
                    @if (getTotalReviewsCount() > 0) {
                    <div class="display-4 fw-bold mb-2">
                      {{ getAverageRating().toFixed(1) }}
                    </div>
                    <div class="mb-2">
                      <span class="text-success" style="font-size: 1.2rem;">{{
                        getStarDisplay(getAverageRating())
                      }}</span>
                    </div>
                    <div class="text-muted">
                      {{ getTotalReviewsCount() }}
                      {{
                        getTotalReviewsCount() !== 1
                          ? ('PRODUCT_ACCORDION.REVIEWS_PLURAL' | translate)
                          : ('PRODUCT_ACCORDION.REVIEW' | translate)
                      }}
                    </div>
                    } @else {
                    <div class="display-4 fw-bold mb-2 text-muted">-</div>
                    <div class="mb-2">
                      <span class="text-muted" style="font-size: 1.2rem;"
                        >0</span
                      >
                    </div>
                    <div class="text-muted">
                      {{ 'PRODUCT_ACCORDION.NO_REVIEWS' | translate }}
                    </div>
                    }
                  </div>
                </div>

                <!-- Right Column - Review This Product -->
                <div class="col-md-4 mb-4">
                  <h6 class="fw-bold mb-3">
                    {{ 'PRODUCT_ACCORDION.REVIEW_THIS_PRODUCT' | translate }}
                  </h6>

                  <!-- Auth Check Message -->
                  @if (!isUserAuthenticated()) {
                  <div class="alert alert-info bg-light rounded-0 p-3 mb-3">
                    <p class="mb-2 small">
                      <i class="fas fa-info-circle me-1"></i>
                      {{
                        'PRODUCT_ACCORDION.LOGIN_REQUIRED_MESSAGE' | translate
                      }}
                    </p>
                    <a
                      [href]="getLoginUrl()"
                      class="btn btn-primary bg-dark border-0 rounded-0 btn-sm"
                    >
                      {{ 'PRODUCT_ACCORDION.LOGIN_TO_REVIEW' | translate }}
                    </a>
                  </div>
                  } @else {
                  <!-- Star Rating for Authenticated Users -->
                  <div class="d-flex gap-1 mb-3">
                    @for (star of [1, 2, 3, 4, 5]; track star) {
                    <button
                      type="button"
                      class="btn btn-outline-secondary btn-sm star-button"
                      [class.btn-warning]="selectedRating >= star"
                      [class.text-white]="selectedRating >= star"
                      style="width: 40px; height: 40px"
                      (click)="selectRating(star)"
                    >
                      <i
                        [class]="
                          selectedRating >= star ? 'fas fa-star' : 'far fa-star'
                        "
                      ></i>
                    </button>
                    }
                  </div>

                  @if (selectedRating > 0) {
                  <div class="mb-2">
                    <small class="text-muted">
                      {{ 'PRODUCT_ACCORDION.YOU_SELECTED' | translate }}
                      {{ selectedRating }}
                      {{
                        selectedRating > 1
                          ? ('PRODUCT_ACCORDION.STARS' | translate)
                          : ('PRODUCT_ACCORDION.STAR' | translate)
                      }}
                    </small>
                  </div>
                  <button
                    class="btn btn-dark btn-sm mb-3"
                    data-bs-toggle="modal"
                    data-bs-target="#reviewModal"
                  >
                    {{ 'PRODUCT_ACCORDION.WRITE_REVIEW' | translate }}
                  </button>
                  }

                  <p class="text-muted small">
                    {{ 'PRODUCT_ACCORDION.SHARE_EXPERIENCE' | translate }}
                  </p>
                  }
                </div>
              </div>

              <!-- Review Filters Section -->
              @if (getTotalReviewsCount() > 0) {
              <div class="review-filters-section mb-4 p-3 bg-light rounded">
                <div
                  class="d-flex flex-wrap align-items-center justify-content-between mb-3"
                >
                  <h6 class="fw-bold mb-0">
                    {{ 'PRODUCT_ACCORDION.FILTER_REVIEWS' | translate }}
                  </h6>
                  @if (hasActiveFilters()) {
                  <button
                    class="btn btn-outline-secondary btn-sm"
                    (click)="clearAllFilters()"
                  >
                    <i class="fas fa-times me-1"></i>
                    {{ 'PRODUCT_ACCORDION.CLEAR_FILTERS' | translate }}
                  </button>
                  }
                </div>

                <div class="row g-3">
                  <!-- Search Text Filter -->
                  <div class="col-md-4">
                    <label class="form-label small fw-bold">{{
                      'PRODUCT_ACCORDION.SEARCH_REVIEWS' | translate
                    }}</label>
                    <div class="input-group">
                      <input
                        type="text"
                        class="form-control form-control-sm"
                        [(ngModel)]="filters.searchText"
                        (input)="onFiltersChange()"
                        [placeholder]="
                          'PRODUCT_ACCORDION.SEARCH_PLACEHOLDER' | translate
                        "
                      />
                      @if (filters.searchText) {
                      <button
                        class="btn btn-outline-secondary btn-sm"
                        type="button"
                        (click)="clearSearchText()"
                      >
                        <i class="fas fa-times"></i>
                      </button>
                      }
                    </div>
                  </div>

                  <!-- Rating Filter -->
                  <div class="col-md-2">
                    <label class="form-label small fw-bold">{{
                      'PRODUCT_ACCORDION.RATING' | translate
                    }}</label>
                    <select
                      class="form-select form-select-sm"
                      [(ngModel)]="filters.rating"
                      (change)="onFiltersChange()"
                    >
                      <option [value]="null">
                        {{ 'PRODUCT_ACCORDION.ALL_RATINGS' | translate }}
                      </option>
                      <option [value]="5">
                        5 {{ 'PRODUCT_ACCORDION.STARS' | translate }}
                      </option>
                      <option [value]="4">
                        4 {{ 'PRODUCT_ACCORDION.STARS' | translate }}
                      </option>
                      <option [value]="3">
                        3 {{ 'PRODUCT_ACCORDION.STARS' | translate }}
                      </option>
                      <option [value]="2">
                        2 {{ 'PRODUCT_ACCORDION.STARS' | translate }}
                      </option>
                      <option [value]="1">
                        1 {{ 'PRODUCT_ACCORDION.STAR' | translate }}
                      </option>
                    </select>
                  </div>

                  <!-- Date From Filter -->
                  <div class="col-md-2">
                    <label class="form-label small fw-bold">{{
                      'PRODUCT_ACCORDION.FROM_DATE' | translate
                    }}</label>
                    <input
                      type="date"
                      class="form-control form-control-sm"
                      [(ngModel)]="filters.dateFrom"
                      (change)="onFiltersChange()"
                    />
                  </div>

                  <!-- Date To Filter -->
                  <div class="col-md-2">
                    <label class="form-label small fw-bold">{{
                      'PRODUCT_ACCORDION.TO_DATE' | translate
                    }}</label>
                    <input
                      type="date"
                      class="form-control form-control-sm"
                      [(ngModel)]="filters.dateTo"
                      (change)="onFiltersChange()"
                    />
                  </div>

                  <!-- Sort By Filter -->
                  <div class="col-md-2">
                    <label class="form-label small fw-bold">{{
                      'PRODUCT_ACCORDION.SORT_BY' | translate
                    }}</label>
                    <select
                      class="form-select form-select-sm"
                      [(ngModel)]="filters.sortBy"
                      (change)="onFiltersChange()"
                    >
                      <option value="newest">
                        {{ 'PRODUCT_ACCORDION.NEWEST_FIRST' | translate }}
                      </option>
                      <option value="oldest">
                        {{ 'PRODUCT_ACCORDION.OLDEST_FIRST' | translate }}
                      </option>
                      <option value="highest">
                        {{ 'PRODUCT_ACCORDION.HIGHEST_RATING' | translate }}
                      </option>
                      <option value="lowest">
                        {{ 'PRODUCT_ACCORDION.LOWEST_RATING' | translate }}
                      </option>
                    </select>
                  </div>
                </div>

                <!-- Active Filters Display -->
                @if (hasActiveFilters()) {
                <div class="mt-3">
                  <small class="text-muted">{{
                    'PRODUCT_ACCORDION.ACTIVE_FILTERS' | translate
                  }}</small>
                  <div class="d-flex flex-wrap gap-2 mt-1">
                    @if (filters.rating !== null && filters.rating !==
                    undefined) {
                    <span class="badge bg-primary">
                      {{ filters.rating }}
                      {{
                        filters.rating > 1
                          ? ('PRODUCT_ACCORDION.STARS' | translate)
                          : ('PRODUCT_ACCORDION.STAR' | translate)
                      }}
                      <button
                        type="button"
                        class="btn-close btn-close-white ms-1"
                        (click)="clearRatingFilter()"
                        style="font-size: 0.6rem;"
                      ></button>
                    </span>
                    } @if (filters.searchText && filters.searchText.trim() !==
                    '') {
                    <span class="badge bg-primary">
                      {{ 'PRODUCT_ACCORDION.TEXT_FILTER' | translate }} "{{
                        filters.searchText
                      }}"
                      <button
                        type="button"
                        class="btn-close btn-close-white ms-1"
                        (click)="clearSearchText()"
                        style="font-size: 0.6rem;"
                      ></button>
                    </span>
                    } @if (filters.dateFrom && filters.dateFrom.trim() !== '') {
                    <span class="badge bg-primary">
                      {{ 'PRODUCT_ACCORDION.FROM_FILTER' | translate }}
                      {{ filters.dateFrom | date : 'MMM d, y' }}
                      <button
                        type="button"
                        class="btn-close btn-close-white ms-1"
                        (click)="clearDateFromFilter()"
                        style="font-size: 0.6rem;"
                      ></button>
                    </span>
                    } @if (filters.dateTo && filters.dateTo.trim() !== '') {
                    <span class="badge bg-primary">
                      {{ 'PRODUCT_ACCORDION.TO_FILTER' | translate }}
                      {{ filters.dateTo | date : 'MMM d, y' }}
                      <button
                        type="button"
                        class="btn-close btn-close-white ms-1"
                        (click)="clearDateToFilter()"
                        style="font-size: 0.6rem;"
                      ></button>
                    </span>
                    }
                  </div>
                </div>
                }

                <!-- Filter Results Summary -->
                <div class="mt-3 text-muted small">
                  {{
                    'PRODUCT_ACCORDION.SHOWING_REVIEWS'
                      | translate
                        : {
                            filtered: getFilteredReviews().length,
                            total: getApprovedReviews().length
                          }
                  }}
                </div>
              </div>
              }

              <!-- Summary of Reviews -->
              @if (getTotalReviewsCount() > 0) {
              <div class="mt-4 pt-4 border-top">
                <h6 class="fw-bold mb-3">
                  {{ 'PRODUCT_ACCORDION.SUMMARY_OF_REVIEWS' | translate }}
                </h6>
                <div class="d-flex align-items-start mb-3">
                  <i class="fas fa-sparkles text-success me-2 mt-1"></i>
                  <small class="text-muted">{{
                    'PRODUCT_ACCORDION.BASED_ON_REVIEWS'
                      | translate
                        : {
                            count: getTotalReviewsCount(),
                            plural: getTotalReviewsCount() !== 1 ? 's' : ''
                          }
                  }}</small>
                </div>
                <p class="mb-3">
                  The product has received an average rating of
                  {{ getAverageRating().toFixed(1) }} stars from customers. @if
                  (getAverageRating() >= 4) {
                  {{ 'PRODUCT_ACCORDION.SATISFIED_CUSTOMERS' | translate }}
                  } @else if (getAverageRating() >= 3) {
                  {{ 'PRODUCT_ACCORDION.MIXED_OPINIONS' | translate }}
                  } @else {
                  {{ 'PRODUCT_ACCORDION.BELOW_AVERAGE' | translate }}
                  }
                </p>
              </div>
              }

              <!-- Individual Reviews -->
              @if (getDisplayedReviews().length > 0) {
              <!-- Loading indicator -->
              @if (isLoadingCustomerData) {
              <div class="text-center py-4">
                <div class="spinner-border text-primary" role="status">
                  <span class="visually-hidden">{{
                    'PRODUCT_ACCORDION.LOADING_CUSTOMER_DATA' | translate
                  }}</span>
                </div>
                <p class="text-muted mt-2">
                  {{ 'PRODUCT_ACCORDION.LOADING_REVIEWER_INFO' | translate }}
                </p>
              </div>
              }

              <div class="reviews-list mt-4">
                @for (review of getDisplayedReviews(); track review.id) {
                <div class="review-item border-bottom pb-4 mb-4">
                  <div class="d-flex flex-column align-items-start mb-2">
                    <div class="text-success me-2" style="font-size: 1rem;">
                      {{ getStarDisplay(review.rating) }}
                    </div>
                    @if (review.title) {
                    <h6 class="mb-0 fw-bold">{{ review.title }}</h6>
                    }
                  </div>
                  <div class="d-flex flex-column align-items-start mb-3">
                    <!-- Customer Avatar and Name -->
                    <div class="d-flex align-items-center me-2">
                      @if (review.customerName) {
                      <!-- Avatar circle with initials -->
                      <div class="customer-avatar me-2">
                        <span class="avatar-initials">{{
                          review.customerInitials ||
                            getInitials(review.customerName)
                        }}</span>
                      </div>
                      <strong>{{ review.customerName }}</strong>
                      } @else if (review.userEmail) {
                      <!-- Fallback to email -->
                      <div class="customer-avatar me-2">
                        <span class="avatar-initials">{{
                          getInitials(review.userEmail)
                        }}</span>
                      </div>
                      <strong>{{ review.userEmail }}</strong>
                      } @else {
                      <!-- Anonymous fallback -->
                      <div class="customer-avatar me-2">
                        <span class="avatar-initials">A</span>
                      </div>
                      <strong>{{
                        'PRODUCT_ACCORDION.ANONYMOUS' | translate
                      }}</strong>
                      }
                    </div>
                    <span class="text-muted small mt-1">{{
                      review.createdAt | date : 'MMM d, y'
                    }}</span>
                  </div>
                  @if (review.reviewText) {
                  <p class="mb-3">{{ review.reviewText }}</p>
                  }
                </div>
                }
              </div>
              } @else if (hasActiveFilters() && getApprovedReviews().length > 0)
              {
              <!-- No results with active filters -->
              <div class="mt-4 pt-4 border-top">
                <p class="text-muted text-center py-4">
                  <i class="fas fa-filter fa-2x mb-3 d-block"></i>
                  {{ 'PRODUCT_ACCORDION.NO_REVIEWS_MATCH_FILTERS' | translate }}
                </p>
              </div>
              } @else if (getTotalReviewsCount() > 0) {
              <div class="mt-4 pt-4 border-top">
                <p class="text-muted text-center py-4">
                  <i class="fas fa-comments fa-2x mb-3 d-block"></i>
                  {{ 'PRODUCT_ACCORDION.REVIEWS_BEING_MODERATED' | translate }}
                </p>
              </div>
              } @else {
              <div class="mt-4 pt-4 border-top">
                <p class="text-muted text-center py-4">
                  <i class="fas fa-star fa-2x mb-3 d-block"></i>
                  {{ 'PRODUCT_ACCORDION.NO_REVIEWS_YET' | translate }}
                </p>
              </div>
              }

              <!-- Load More Button -->
              @if (shouldShowLoadMoreButton()) {
              <div class="text-center mt-4">
                <button
                  class="btn btn-dark px-5 py-3 text-uppercase fw-bold"
                  (click)="loadMoreReviews()"
                >
                  {{ 'PRODUCT_ACCORDION.LOAD_MORE' | translate }} ({{
                    getRemainingReviewsCount()
                  }}
                  {{ 'PRODUCT_ACCORDION.REMAINING' | translate }})
                </button>
              </div>
              }
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Review Modal -->
    <div
      class="modal fade"
      id="reviewModal"
      tabindex="-1"
      aria-labelledby="reviewModalLabel"
      aria-hidden="true"
    >
      <div class="modal-dialog modal-lg">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title" id="reviewModalLabel">
              {{ 'PRODUCT_ACCORDION.WRITE_A_REVIEW' | translate }}
            </h5>
            <button
              type="button"
              class="btn-close"
              data-bs-dismiss="modal"
              [attr.aria-label]="'PRODUCT_ACCORDION.CLOSE' | translate"
            ></button>
          </div>
          <form [formGroup]="reviewForm" (ngSubmit)="submitReview()">
            <div class="modal-body">
              <!-- Product Info -->
              <div class="d-flex align-items-center mb-4 p-3 bg-light rounded">
                @if (primaryImage) {
                <img
                  [src]="primaryImage.imageUrl"
                  [alt]="product.name"
                  class="me-3"
                  style="width: 60px; height: 60px; object-fit: cover;"
                />
                }
                <div>
                  <h6 class="mb-1 fw-bold">{{ product.name }}</h6>
                  <div class="text-warning">
                    @for (star of [1, 2, 3, 4, 5]; track star) {
                    <i
                      [class]="
                        selectedRating >= star ? 'fas fa-star' : 'far fa-star'
                      "
                    ></i>
                    }
                    <span class="ms-2 text-muted"
                      >{{ selectedRating }}
                      {{
                        selectedRating > 1
                          ? ('PRODUCT_ACCORDION.STARS' | translate)
                          : ('PRODUCT_ACCORDION.STAR' | translate)
                      }}</span
                    >
                  </div>
                </div>
              </div>

              <!-- Rating (readonly, already selected) -->
              <div class="mb-3">
                <label class="form-label fw-bold">{{
                  'PRODUCT_ACCORDION.YOUR_RATING' | translate
                }}</label>
                <div class="d-flex gap-1">
                  @for (star of [1, 2, 3, 4, 5]; track star) {
                  <button
                    type="button"
                    class="btn btn-sm"
                    [class.btn-warning]="selectedRating >= star"
                    [class.btn-outline-secondary]="selectedRating < star"
                    style="width: 35px; height: 35px"
                    (click)="selectRating(star)"
                  >
                    <i
                      [class]="
                        selectedRating >= star ? 'fas fa-star' : 'far fa-star'
                      "
                    ></i>
                  </button>
                  }
                </div>
              </div>

              <!-- Review Title -->
              <div class="mb-3">
                <label for="reviewTitle" class="form-label fw-bold"
                  >{{ 'PRODUCT_ACCORDION.REVIEW_TITLE' | translate }}
                  <span class="text-muted">{{
                    'PRODUCT_ACCORDION.OPTIONAL' | translate
                  }}</span></label
                >
                <input
                  type="text"
                  class="form-control"
                  id="reviewTitle"
                  formControlName="title"
                  [placeholder]="
                    'PRODUCT_ACCORDION.TITLE_PLACEHOLDER' | translate
                  "
                  maxlength="100"
                />
                <div class="form-text">
                  {{ reviewForm.get('title')?.value?.length || 0 }}/100
                  {{ 'PRODUCT_ACCORDION.CHARACTERS' | translate }}
                </div>
              </div>

              <!-- Review Comment -->
              <div class="mb-3 ">
                <label for="reviewComment" class="form-label fw-bold"
                  >{{ 'PRODUCT_ACCORDION.YOUR_REVIEW' | translate }}
                  <span class="text-danger">{{
                    'PRODUCT_ACCORDION.REQUIRED' | translate
                  }}</span></label
                >
                <textarea
                  class="form-control"
                  id="reviewComment"
                  formControlName="comment"
                  rows="5"
                  [placeholder]="
                    'PRODUCT_ACCORDION.REVIEW_PLACEHOLDER' | translate
                  "
                  maxlength="1000"
                  [class.is-invalid]="
                    reviewForm.get('comment')?.invalid &&
                    reviewForm.get('comment')?.touched
                  "
                ></textarea>
                <div class="form-text">
                  {{ reviewForm.get('comment')?.value?.length || 0 }}/1000
                  {{ 'PRODUCT_ACCORDION.CHARACTERS' | translate }}
                </div>
                @if (reviewForm.get('comment')?.invalid &&
                reviewForm.get('comment')?.touched) {
                <div class="invalid-feedback">
                  @if (reviewForm.get('comment')?.errors?.['required']) {
                  {{ 'PRODUCT_ACCORDION.REVIEW_REQUIRED' | translate }}
                  } @if (reviewForm.get('comment')?.errors?.['minlength']) {
                  {{ 'PRODUCT_ACCORDION.MIN_LENGTH_ERROR' | translate }}
                  }
                </div>
                }
              </div>

              <!-- Validation Errors -->
              @if (reviewValidationErrors.length > 0) {
              <div class="alert alert-danger">
                <ul class="mb-0">
                  @for (error of reviewValidationErrors; track error) {
                  <li>{{ error }}</li>
                  }
                </ul>
              </div>
              }

              <!-- Submit Error -->
              @if (reviewSubmitError) {
              <div class="alert alert-danger">
                {{ reviewSubmitError }}
              </div>
              }

              <!-- Success Message -->
              @if (reviewSubmitSuccess) {
              <div class="alert alert-success">
                {{ reviewSubmitSuccess }}
              </div>
              }
            </div>
            <div class="modal-footer">
              <button
                type="button"
                class="btn btn-secondary"
                data-bs-dismiss="modal"
              >
                {{ 'PRODUCT_ACCORDION.CANCEL' | translate }}
              </button>
              <button
                type="submit"
                class="btn btn-dark"
                [disabled]="reviewForm.invalid || isSubmittingReview"
              >
                @if (isSubmittingReview) {
                <span
                  class="spinner-border spinner-border-sm me-2"
                  role="status"
                  aria-hidden="true"
                ></span>
                {{ 'PRODUCT_ACCORDION.SUBMITTING' | translate }} } @else {
                {{ 'PRODUCT_ACCORDION.SUBMIT_REVIEW' | translate }} }
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>`,
  styleUrls: ['./product.component.scss'],
})
export class ProductAccordionComponent implements OnInit, OnDestroy {
  @Input() product!: ProductWithVariants & {
    reviews?: Review[];
    averageRating?: number;
    reviewCount?: number;
  };
  @Input() currentVariant: ProductVariant | null = null;
  @Input() primaryImage: ProductImage | null = null;

  // Injected services
  private reviewService = inject(ReviewService);
  private authService = inject(AuthService);
  private customerService = inject(CustomerService);
  private router = inject(Router);
  private fb = inject(FormBuilder);
  private destroy$ = new Subject<void>();

  // Review creation state
  selectedRating: number = 0;
  reviewForm: FormGroup;
  isSubmittingReview: boolean = false;
  reviewValidationErrors: string[] = [];
  reviewSubmitError: string = '';
  reviewSubmitSuccess: string = '';

  // Customer info for reviews
  reviewsWithCustomerInfo: ReviewWithCustomerInfo[] = [];
  isLoadingCustomerData: boolean = false;

  // Pagination state
  reviewsPerPage: number = 3;
  currentlyDisplayedReviews: number = 3;

  // Filter state
  filters: ReviewFilters = {
    rating: null,
    searchText: '',
    dateFrom: '',
    dateTo: '',
    sortBy: 'newest',
  };

  // Filtered and displayed reviews
  filteredReviews: ReviewWithCustomerInfo[] = [];

  constructor() {
    this.reviewForm = this.fb.group({
      title: ['', [Validators.maxLength(100)]],
      comment: [
        '',
        [
          Validators.required,
          Validators.minLength(10),
          Validators.maxLength(1000),
        ],
      ],
    });
  }

  ngOnInit(): void {
    this.loadCustomerDataForReviews();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Get initials from any string (fallback method)
   */
  getInitials(name: string): string {
    if (!name) return 'A';

    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return `${parts[0].charAt(0)}${parts[1].charAt(0)}`.toUpperCase();
    }
    return name.charAt(0).toUpperCase();
  }

  // Authentication methods
  isUserAuthenticated(): boolean {
    return this.authService.isLoggedIn();
  }

  getLoginUrl(): string {
    const currentUrl = this.router.url;
    return `/auth/login?returnUrl=${encodeURIComponent(currentUrl)}`;
  }

  // Rating selection
  selectRating(rating: number): void {
    this.selectedRating = rating;
  }

  // Filter methods
  onFiltersChange(): void {
    this.applyFilters();
    this.resetPagination();
  }

  filterByRating(rating: number): void {
    // Ensure we're comparing numbers
    const currentRating = Number(this.filters.rating);
    this.filters.rating = currentRating === rating ? null : rating;
    this.onFiltersChange();
  }

  clearRatingFilter(): void {
    this.filters.rating = null;
    this.onFiltersChange();
  }

  clearSearchText(): void {
    this.filters.searchText = '';
    this.onFiltersChange();
  }

  clearDateFromFilter(): void {
    this.filters.dateFrom = '';
    this.onFiltersChange();
  }

  clearDateToFilter(): void {
    this.filters.dateTo = '';
    this.onFiltersChange();
  }

  clearAllFilters(): void {
    this.filters = {
      rating: null,
      searchText: '',
      dateFrom: '',
      dateTo: '',
      sortBy: 'newest',
    };
    this.onFiltersChange();
  }

  hasActiveFilters(): boolean {
    return !!(
      this.filters.rating ||
      this.filters.searchText ||
      this.filters.dateFrom ||
      this.filters.dateTo ||
      this.filters.sortBy !== 'newest'
    );
  }

  applyFilters(): void {
    let filtered = [...this.reviewsWithCustomerInfo];

    // Apply rating filter - Fix type conversion and comparison
    if (this.filters.rating !== null && this.filters.rating !== undefined) {
      // Convert to number to handle string values from select dropdown
      const targetRating = Number(this.filters.rating);
      filtered = filtered.filter((review) => review.rating === targetRating);
    }

    // Apply search text filter
    if (this.filters.searchText) {
      const searchTerm = this.filters.searchText.toLowerCase();
      filtered = filtered.filter(
        (review) =>
          review.reviewText?.toLowerCase().includes(searchTerm) ||
          review.title?.toLowerCase().includes(searchTerm) ||
          review.customerName?.toLowerCase().includes(searchTerm)
      );
    }

    // Apply date range filters
    if (this.filters.dateFrom) {
      const fromDate = new Date(this.filters.dateFrom);
      filtered = filtered.filter(
        (review) => new Date(review.createdAt) >= fromDate
      );
    }

    if (this.filters.dateTo) {
      const toDate = new Date(this.filters.dateTo);
      toDate.setHours(23, 59, 59, 999); // Include the entire day
      filtered = filtered.filter(
        (review) => new Date(review.createdAt) <= toDate
      );
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (this.filters.sortBy) {
        case 'newest':
          return (
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
        case 'oldest':
          return (
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          );
        case 'highest':
          return b.rating - a.rating;
        case 'lowest':
          return a.rating - b.rating;
        default:
          return 0;
      }
    });

    this.filteredReviews = filtered;
  }

  getFilteredReviews(): ReviewWithCustomerInfo[] {
    return this.filteredReviews;
  }

  // Review submission
  async submitReview(): Promise<void> {
    if (this.reviewForm.invalid || this.selectedRating === 0) {
      this.reviewForm.markAllAsTouched();
      return;
    }

    // Clear previous errors
    this.reviewValidationErrors = [];
    this.reviewSubmitError = '';
    this.reviewSubmitSuccess = '';

    // Get current user
    const currentUser = this.authService.getUser();
    if (!currentUser) {
      this.reviewSubmitError =
        'User information not available. Please log in again.';
      return;
    }

    // Create review data matching API expectations
    const reviewData = {
      userId: currentUser.id,
      productId: this.product.id,
      rating: this.selectedRating,
      title: this.reviewForm.get('title')?.value?.trim() || '',
      reviewText: this.reviewForm.get('comment')?.value.trim(),
      isVerifiedPurchase: true, // You can modify this logic based on your business rules
    };

    // Basic client-side validation
    if (!reviewData.reviewText || reviewData.reviewText.length < 10) {
      this.reviewValidationErrors = [
        'Review text must be at least 10 characters long',
      ];
      return;
    }

    if (reviewData.reviewText.length > 1000) {
      this.reviewValidationErrors = [
        'Review text cannot exceed 1000 characters',
      ];
      return;
    }

    this.isSubmittingReview = true;

    try {
      const response = await this.reviewService
        .createReview(reviewData)
        .toPromise();

      if (response) {
        this.reviewSubmitSuccess =
          'Your review has been submitted successfully! It will be visible after moderation.';

        // Reset form and rating
        this.reviewForm.reset();
        this.selectedRating = 0;

        // Close modal after a delay
        setTimeout(() => {
          const modalElement = document.getElementById('reviewModal');
          if (modalElement) {
            const modal = (window as any).bootstrap?.Modal?.getInstance(
              modalElement
            );
            modal?.hide();
          }
          this.reviewSubmitSuccess = '';
        }, 2000);

        // Reload customer data for reviews to include the new review
        setTimeout(() => {
          this.loadCustomerDataForReviews();
        }, 500);
      }
    } catch (error: any) {
      console.error('Error submitting review:', error);
      this.reviewSubmitError =
        error.message || 'Failed to submit review. Please try again.';
    } finally {
      this.isSubmittingReview = false;
    }
  }

  // Existing methods from original component
  getProductDescription(): string {
    return this.product?.description || 'Product description not available.';
  }

  getProductDetails(): { label: string; value: string }[] {
    if (!this.product) return [];

    return [
      { label: 'SKU', value: this.currentVariant?.sku || 'N/A' },
      { label: 'Category', value: 'Originals Shoes' },
      { label: 'Color', value: this.currentVariant?.color || 'N/A' },
      { label: 'Size', value: this.currentVariant?.size || 'N/A' },
      {
        label: 'Stock',
        value: this.currentVariant?.stockQuantity?.toString() || 'N/A',
      },
      { label: 'Material', value: 'Synthetic Upper, Rubber Outsole' },
      { label: 'Origin', value: 'Made in Vietnam' },
      { label: 'Care Instructions', value: 'Clean with damp cloth' },
    ];
  }

  getTotalReviewsCount(): number {
    return this.product?.reviewCount || 0;
  }

  getAverageRating(): number {
    return this.product?.averageRating || 0;
  }

  getRatingDistribution(): Record<
    number,
    { count: number; percentage: number }
  > {
    const reviews = this.product?.reviews || [];
    const distribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };

    reviews.forEach((review) => {
      if (review.rating >= 1 && review.rating <= 5) {
        distribution[review.rating as keyof typeof distribution]++;
      }
    });

    const total = reviews.length;
    return {
      5: {
        count: distribution[5],
        percentage: total > 0 ? (distribution[5] / total) * 100 : 0,
      },
      4: {
        count: distribution[4],
        percentage: total > 0 ? (distribution[4] / total) * 100 : 0,
      },
      3: {
        count: distribution[3],
        percentage: total > 0 ? (distribution[3] / total) * 100 : 0,
      },
      2: {
        count: distribution[2],
        percentage: total > 0 ? (distribution[2] / total) * 100 : 0,
      },
      1: {
        count: distribution[1],
        percentage: total > 0 ? (distribution[1] / total) * 100 : 0,
      },
    };
  }

  getRatingPercentage(rating: number): number {
    const distribution = this.getRatingDistribution();
    return distribution[rating]?.percentage || 0;
  }

  getRatingCount(rating: number): number {
    const distribution = this.getRatingDistribution();
    return distribution[rating]?.count || 0;
  }

  getStarDisplay(rating: number): string {
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);

    return (
      '★'.repeat(fullStars) + (hasHalfStar ? '☆' : '') + '☆'.repeat(emptyStars)
    );
  }

  getApprovedReviews(): Review[] {
    console.log('Filtered Reviews:', this.product?.reviews);
    return (
      this.product?.reviews?.filter(
        (review) => review.isApproved && review.isActive && !review.isDeleted
      ) || []
    );
  }

  /**
   * Get the reviews that should be displayed based on pagination and filters
   */
  getDisplayedReviews(): ReviewWithCustomerInfo[] {
    return this.getFilteredReviews().slice(0, this.currentlyDisplayedReviews);
  }

  /**
   * Check if the Load More button should be shown
   */
  shouldShowLoadMoreButton(): boolean {
    const totalFilteredReviews = this.getFilteredReviews().length;
    // Show button only if there are more than 3 filtered reviews AND we haven't displayed all yet
    return (
      totalFilteredReviews > 3 &&
      this.currentlyDisplayedReviews < totalFilteredReviews
    );
  }

  /**
   * Get the count of remaining reviews
   */
  getRemainingReviewsCount(): number {
    const remaining =
      this.getFilteredReviews().length - this.currentlyDisplayedReviews;
    return remaining > 0 ? remaining : 0;
  }

  /**
   * Load more reviews (increase the display count by 3 or remaining count, whichever is smaller)
   */
  loadMoreReviews(): void {
    const totalFilteredReviews = this.getFilteredReviews().length;
    const remainingReviews =
      totalFilteredReviews - this.currentlyDisplayedReviews;
    const reviewsToAdd = Math.min(3, remainingReviews); // Always add 3 or less

    this.currentlyDisplayedReviews += reviewsToAdd;
  }

  /**
   * Reset pagination when reviews are reloaded or filtered
   */
  private resetPagination(): void {
    const totalFilteredReviews = this.getFilteredReviews().length;
    // Show initial 3 reviews, or all reviews if less than 3
    this.currentlyDisplayedReviews = Math.min(3, totalFilteredReviews);
  }

  /**
   * Load customer information for all reviews
   */
  private loadCustomerDataForReviews(): void {
    const approvedReviews = this.getApprovedReviews();
    if (approvedReviews.length === 0) {
      this.reviewsWithCustomerInfo = [];
      this.applyFilters();
      this.resetPagination();
      return;
    }

    this.isLoadingCustomerData = true;

    // Get unique user IDs from reviews
    const userIds = [
      ...new Set(
        approvedReviews.map((review) => review.userId).filter((id) => id)
      ),
    ];

    if (userIds.length === 0) {
      // No valid user IDs, use reviews as-is
      this.reviewsWithCustomerInfo = approvedReviews;
      this.isLoadingCustomerData = false;
      this.applyFilters();
      this.resetPagination();
      return;
    }

    // Use batch request if available, otherwise fall back to individual requests
    this.customerService
      .getCustomersInfoByIds(userIds)
      .pipe(
        takeUntil(this.destroy$),
        catchError((error) => {
          console.warn(
            'Batch customer fetch failed, trying individual requests:',
            error
          );
          // Fallback to individual requests
          const customerRequests = userIds.map((userId) =>
            this.customerService.getCustomerInfoById(userId).pipe(
              catchError((individualError) => {
                console.warn(
                  `Failed to fetch customer info for user ${userId}:`,
                  individualError
                );
                return of(null);
              })
            )
          );
          return forkJoin(customerRequests);
        })
      )
      .subscribe({
        next: (customersData) => {
          // Create a map of userId to customer info
          const customerMap = new Map<string, PublicCustomerInfoDto>();

          if (Array.isArray(customersData)) {
            // Handle both batch response (array of customers) and individual responses
            customersData.forEach((customer, index) => {
              if (customer) {
                // For batch response, customer should have an id
                // For individual responses, use the userIds array
                const userId = customer.id || userIds[index];
                if (userId) {
                  customerMap.set(userId, customer);
                }
              }
            });
          }

          // Merge customer data with reviews
          this.reviewsWithCustomerInfo = approvedReviews.map((review) => ({
            ...review,
            customerName: CustomerService.getDisplayName(
              customerMap.get(review.userId)
            ),
            customerInitials: CustomerService.getInitials(
              customerMap.get(review.userId)
            ),
          }));

          this.isLoadingCustomerData = false;
          this.applyFilters();
          this.resetPagination(); // This will now properly set initial display count
        },
        error: (error) => {
          console.error('Error loading customer data for reviews:', error);
          // Fallback to original reviews without customer info
          this.reviewsWithCustomerInfo = approvedReviews;
          this.isLoadingCustomerData = false;
          this.applyFilters();
          this.resetPagination();
        },
      });
  }
}
