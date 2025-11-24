// components/product-card-list/product-card-list.component.ts
import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnInit,
  OnDestroy,
  ChangeDetectionStrategy,
  ViewEncapsulation,
  inject,
  signal,
  computed,
  effect,
  ViewChild,
  ElementRef,
  AfterViewInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  trigger,
  transition,
  stagger,
  query,
  style,
  animate,
  state,
} from '@angular/animations';
import {
  Subject,
  fromEvent,
  debounceTime,
  distinctUntilChanged,
  takeUntil,
} from 'rxjs';
import { ProductCardComponent } from '../product-card/product-card';
import { Product, ProductCardConfig, ProductCardEvent, ProductCardView, ProductListConfig, ProductSortOption } from '../product-card/product.interface';


export interface FilterOption {
  key: string;
  label: string;
  values: { value: string; label: string; count?: number }[];
}

export interface ProductListEvent {
  type: 'sort' | 'filter' | 'view-change' | 'load-more' | 'search';
  data: any;
}

@Component({
  selector: 'app-product-card-list',
  standalone: true,
  imports: [CommonModule, FormsModule, ProductCardComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  templateUrl: './product-card-list.html',
  styleUrls: ['./product-card-list.scss'],
  animations: [
    trigger('staggerAnimation', [
      transition(':enter', [
        query(
          ':enter',
          [
            style({ opacity: 0, transform: 'translateY(30px)' }),
            stagger(50, [
              animate(
                '400ms cubic-bezier(0.25, 0.46, 0.45, 0.94)',
                style({ opacity: 1, transform: 'translateY(0)' })
              ),
            ]),
          ],
          { optional: true }
        ),
      ]),
    ]),
    trigger('itemAnimation', [
      transition(':enter', [
        style({ opacity: 0, transform: 'scale(0.9) translateY(20px)' }),
        animate(
          '350ms cubic-bezier(0.25, 0.46, 0.45, 0.94)',
          style({ opacity: 1, transform: 'scale(1) translateY(0)' })
        ),
      ]),
      transition(':leave', [
        animate(
          '250ms ease-out',
          style({ opacity: 0, transform: 'scale(0.9) translateY(-20px)' })
        ),
      ]),
    ]),
    trigger('slideDown', [
      state('hidden', style({ height: '0', opacity: 0, overflow: 'hidden' })),
      state('visible', style({ height: '*', opacity: 1 })),
      transition(
        'hidden <=> visible',
        animate('300ms cubic-bezier(0.25, 0.46, 0.45, 0.94)')
      ),
    ]),
    trigger('fadeIn', [
      transition(':enter', [
        style({ opacity: 0 }),
        animate('500ms ease-out', style({ opacity: 1 })),
      ]),
    ]),
  ],
})
export class ProductCardListComponent
  implements OnInit, OnDestroy, AfterViewInit
{
  @ViewChild('searchInput') searchInputRef?: ElementRef<HTMLInputElement>;
  @ViewChild('loadMoreTrigger') loadMoreTriggerRef?: ElementRef<HTMLElement>;

  // Inputs
  @Input() set productList(value: Product[]) {
    this.products.set(value || []);
  }

  @Input() set loading(value: boolean) {
    this.isLoading.set(value);
  }

  @Input() set loadingMore(value: boolean) {
    this.isLoadingMore.set(value);
  }

  @Input() set totalCount(value: number) {
    this.totalResults.set(value);
  }

  @Input() set wishlistedIds(value: number[]) {
    this.wishlist.set(value || []);
  }

  @Input() configuration: Partial<ProductListConfig> = {};
  @Input() filters: FilterOption[] = [];
  @Input() headerTitle?: string;
  @Input() headerSubtitle?: string;
  @Input() enableSearch = true;
  @Input() enableLoadMore = true;

  // Outputs
  @Output() listEvent = new EventEmitter<ProductListEvent>();
  @Output() productEvent = new EventEmitter<ProductCardEvent>();

  // Signals
  products = signal<Product[]>([]);
  isLoading = signal(false);
  isLoadingMore = signal(false);
  totalResults = signal(0);
  wishlist = signal<number[]>([]);
  currentView = signal<ProductCardView>('grid');
  currentSort = signal<ProductSortOption>('popularity');
  searchQuery = signal('');
  activeFilters = signal<Record<string, string>>({});
  showFilters = signal(true);

  // Computed properties
  config = computed<ProductListConfig>(() => ({
    layout: 'standard',
    showQuickActions: true,
    showColorOptions: true,
    showSizeOptions: true,
    showWishlistButton: true,
    showRating: true,
    showBadges: true,
    enableHoverEffects: true,
    lazyLoading: true,
    itemsPerPage: 12,
    enableInfiniteScroll: false,
    enableFilters: true,
    enableSorting: true,
    enableViewToggle: true,
    defaultView: 'grid',
    gridColumns: {
      xs: 1,
      sm: 2,
      md: 2,
      lg: 3,
      xl: 4,
      xxl: 4,
    },
    ...this.configuration,
  }));

  title = computed(() => this.headerTitle || '');
  subtitle = computed(() => this.headerSubtitle || '');
  filterOptions = computed(() => this.filters || []);

  showHeader = computed(
    () =>
      this.title() ||
      this.config().enableViewToggle ||
      this.config().enableSorting
  );

  showSearch = computed(() => this.enableSearch);
  showLoadMore = computed(() => this.enableLoadMore);
  showResultsCount = computed(() => this.totalResults() > 0);

  skeletonItems = computed(() =>
    Array(this.config().itemsPerPage)
      .fill(0)
      .map((_, i) => i)
  );

  hasActiveFilters = computed(
    () => Object.keys(this.activeFilters()).length > 0
  );

  // Private properties
  private destroy$ = new Subject<void>();
  private intersectionObserver?: IntersectionObserver;

  ngOnInit() {
    // Initialize view from config
    this.currentView.set(this.config().defaultView);

    // Setup search debouncing
    if (this.searchInputRef) {
      fromEvent(this.searchInputRef.nativeElement, 'input')
        .pipe(
          debounceTime(300),
          distinctUntilChanged(),
          takeUntil(this.destroy$)
        )
        .subscribe(() => {
          this.emitListEvent('search', { query: this.searchQuery() });
        });
    }
  }

  ngAfterViewInit() {
    // Setup infinite scroll
    if (this.config().enableInfiniteScroll && this.loadMoreTriggerRef) {
      this.setupInfiniteScroll();
    }
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();

    if (this.intersectionObserver) {
      this.intersectionObserver.disconnect();
    }
  }

  // Event handlers
  onProductEvent(event: ProductCardEvent): void {
    this.productEvent.emit(event);
  }

  onSortChange(event: Event): void {
    const target = event.target as HTMLSelectElement;
    const sortValue = target.value as ProductSortOption;
    this.currentSort.set(sortValue);
    this.emitListEvent('sort', { sortBy: sortValue });
  }

  onFilterChange(filterKey: string, event: Event): void {
    const target = event.target as HTMLSelectElement;
    const value = target.value;

    const filters = { ...this.activeFilters() };
    if (value) {
      filters[filterKey] = value;
    } else {
      delete filters[filterKey];
    }

    this.activeFilters.set(filters);
    this.emitListEvent('filter', { filters });
  }

  onSearchInput(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.searchQuery.set(target.value);
    // Debounced emission handled in ngOnInit
  }

  setView(view: ProductCardView): void {
    this.currentView.set(view);
    this.emitListEvent('view-change', { view });
  }

  onLoadMore(): void {
    this.emitListEvent('load-more', {});
  }

  // Helper methods
  getColumnClasses(): string {
    const view = this.currentView();
    const columns = this.config().gridColumns;

    if (view === 'list') {
      return 'col-12';
    }

    return [
      'col',
      `col-sm-${12 / columns.sm}`,
      `col-md-${12 / columns.md}`,
      `col-lg-${12 / columns.lg}`,
      `col-xl-${12 / columns.xl}`,
      `col-xxl-${12 / columns.xxl}`,
    ].join(' ');
  }

  getCardConfig(): Partial<ProductCardConfig> {
    const baseConfig = {
      layout: this.config().layout,
      showQuickActions: this.config().showQuickActions,
      showColorOptions: this.config().showColorOptions,
      showSizeOptions: this.config().showSizeOptions,
      showWishlistButton: this.config().showWishlistButton,
      showRating: this.config().showRating,
      showBadges: this.config().showBadges,
      enableHoverEffects: this.config().enableHoverEffects,
      lazyLoading: this.config().lazyLoading,
    };

    // Adjust config based on view
    if (this.currentView() === 'list') {
      return {
        ...baseConfig,
        layout: 'compact',
        showColorOptions: false,
        showSizeOptions: false,
      };
    }

    return baseConfig;
  }

  getAnimationDelay(index: number): string {
    return `${index * 50}ms`;
  }

  isInWishlist(productId: number): boolean {
    return this.wishlist().includes(productId);
  }

  getFilterValue(filterKey: string): string {
    return this.activeFilters()[filterKey] || '';
  }

  getActiveFilters(): Array<{
    key: string;
    value: string;
    label: string;
    displayValue: string;
  }> {
    const filters = this.activeFilters();
    const filterOptions = this.filterOptions();

    return Object.entries(filters).map(([key, value]) => {
      const filter = filterOptions.find((f) => f.key === key);
      const option = filter?.values.find((v) => v.value === value);

      return {
        key,
        value,
        label: filter?.label || key,
        displayValue: option?.label || value,
      };
    });
  }

  removeFilter(filterKey: string): void {
    const filters = { ...this.activeFilters() };
    delete filters[filterKey];
    this.activeFilters.set(filters);
    this.emitListEvent('filter', { filters });
  }

  clearAllFilters(): void {
    this.activeFilters.set({});
    this.emitListEvent('filter', { filters: {} });
  }

  clearSearch(): void {
    this.searchQuery.set('');
    if (this.searchInputRef) {
      this.searchInputRef.nativeElement.value = '';
    }
    this.emitListEvent('search', { query: '' });
  }

  toggleFilters(): void {
    this.showFilters.set(!this.showFilters());
  }

  private setupInfiniteScroll(): void {
    if (!this.loadMoreTriggerRef) return;

    this.intersectionObserver = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (
          entry.isIntersecting &&
          !this.isLoadingMore() &&
          this.showLoadMore()
        ) {
          this.onLoadMore();
        }
      },
      {
        rootMargin: '100px',
        threshold: 0.1,
      }
    );

    this.intersectionObserver.observe(this.loadMoreTriggerRef.nativeElement);
  }

  private emitListEvent(type: ProductListEvent['type'], data: any): void {
    this.listEvent.emit({ type, data });
  }
}
