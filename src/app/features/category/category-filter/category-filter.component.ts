import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnInit,
  OnChanges,
  SimpleChanges,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DisplayProduct, FilterOptions } from '../category.types';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

interface FilterOption {
  value: string;
  label: string;
  count: number;
}

interface SortOption {
  value: string;
  labelKey: string;
  label?: string; // Will be populated by translation
}

@Component({
  selector: 'app-category-filter',
  imports: [CommonModule, FormsModule, TranslateModule],
  templateUrl: './category-filter.html',
  styleUrl: './category-filter.scss',
})
export class CategoryFilterComponent implements OnInit, OnChanges {
  @Input() allProducts: DisplayProduct[] = [];
  @Input() currentFilters: FilterOptions = {};
  @Output() filtersChange = new EventEmitter<FilterOptions>();
  @Output() filtersReset = new EventEmitter<void>();

  // Filter options derived from products
  sortOptions: SortOption[] = [
    { value: 'newest', labelKey: 'FILTER.SORT_OPTIONS.NEWEST' },
    { value: 'topSellers', labelKey: 'FILTER.SORT_OPTIONS.TOP_SELLERS' },
    {
      value: 'priceLowToHigh',
      labelKey: 'FILTER.SORT_OPTIONS.PRICE_LOW_TO_HIGH',
    },
    {
      value: 'priceHighToLow',
      labelKey: 'FILTER.SORT_OPTIONS.PRICE_HIGH_TO_LOW',
    },
    {
      value: 'discountHighToLow',
      labelKey: 'FILTER.SORT_OPTIONS.DISCOUNT_HIGH_TO_LOW',
    },
    { value: 'highestRated', labelKey: 'FILTER.SORT_OPTIONS.HIGHEST_RATED' },
  ];

  availableSizes: FilterOption[] = [];
  availableProductTypes: FilterOption[] = [];
  availableColors: FilterOption[] = [];
  availableBrands: FilterOption[] = [];
  availableCollections: FilterOption[] = [];

  discountRanges: FilterOption[] = [
    { value: '20-29', label: '', count: 0 },
    { value: '30-39', label: '', count: 0 },
    { value: '40-49', label: '', count: 0 },
    { value: '50-more', label: '', count: 0 },
  ];

  // Form controls
  selectedSort = '';
  selectedSizes: string[] = [];
  selectedProductTypes: string[] = [];
  selectedColors: string[] = [];
  selectedBrands: string[] = [];
  selectedCollections: string[] = [];
  selectedDiscountRanges: string[] = [];
  onSaleFilter: boolean | null = null;

  // Common shoe sizes for the grid
  commonSizes = [
    '36 2/3',
    '37 1/3',
    '38 2/3',
    '39 1/3',
    '40 2/3',
    '41 1/3',
    '42 2/3',
    '43 1/3',
    '44 2/3',
    '45 1/3',
    '46 2/3',
    '47 1/3',
    '48 2/3',
    '36',
    '38',
    '42',
    '44',
    '46',
    '48',
  ];

  constructor(private translateService: TranslateService) {}

  ngOnInit(): void {
    this.initializeTranslations();
    this.initializeFilters();

    // Subscribe to language changes
    this.translateService.onLangChange.subscribe(() => {
      this.initializeTranslations();
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['allProducts']) {
      this.calculateFilterOptions();
    }
    if (changes['currentFilters']) {
      this.syncWithCurrentFilters();
    }
  }

  initializeTranslations(): void {
    // Update sort options labels
    this.sortOptions.forEach((option) => {
      this.translateService.get(option.labelKey).subscribe((translation) => {
        option.label = translation;
      });
    });

    // Update discount ranges labels
    const discountRangeKeys = [
      'FILTER.DISCOUNT_RANGES.20_29',
      'FILTER.DISCOUNT_RANGES.30_39',
      'FILTER.DISCOUNT_RANGES.40_49',
      'FILTER.DISCOUNT_RANGES.50_MORE',
    ];

    discountRangeKeys.forEach((key, index) => {
      this.translateService.get(key).subscribe((translation) => {
        this.discountRanges[index].label = translation;
      });
    });
  }

  initializeFilters(): void {
    this.calculateFilterOptions();
    this.syncWithCurrentFilters();
  }

  calculateFilterOptions(): void {
    if (!this.allProducts || this.allProducts.length === 0) return;

    // Calculate sizes
    const sizeMap = new Map<string, number>();
    this.allProducts.forEach((product) => {
      product.availableSizes?.forEach((size) => {
        sizeMap.set(size, (sizeMap.get(size) || 0) + 1);
      });
    });
    this.availableSizes = Array.from(sizeMap.entries())
      .map(([value, count]) => ({ value, label: value, count }))
      .sort((a, b) => b.count - a.count);

    // Calculate product types
    const typeMap = new Map<string, number>();
    this.allProducts.forEach((product) => {
      if (product.productType) {
        typeMap.set(
          product.productType,
          (typeMap.get(product.productType) || 0) + 1
        );
      }
    });
    this.availableProductTypes = Array.from(typeMap.entries())
      .map(([value, count]) => ({ value, label: value, count }))
      .sort((a, b) => b.count - a.count);

    // Calculate colors
    const colorMap = new Map<string, number>();
    this.allProducts.forEach((product) => {
      product.availableColors?.forEach((color) => {
        colorMap.set(color, (colorMap.get(color) || 0) + 1);
      });
    });
    this.availableColors = Array.from(colorMap.entries())
      .map(([value, count]) => ({
        value,
        label: this.capitalizeColor(value),
        count,
      }))
      .sort((a, b) => b.count - a.count);

    // Calculate brands
    const brandMap = new Map<string, number>();
    this.allProducts.forEach((product) => {
      if (product.brand) {
        brandMap.set(product.brand, (brandMap.get(product.brand) || 0) + 1);
      }
    });
    this.availableBrands = Array.from(brandMap.entries())
      .map(([value, count]) => ({ value, label: value, count }))
      .sort((a, b) => b.count - a.count);

    // Calculate collections
    const collectionMap = new Map<string, number>();
    this.allProducts.forEach((product) => {
      if (product.collection) {
        collectionMap.set(
          product.collection,
          (collectionMap.get(product.collection) || 0) + 1
        );
      }
    });
    this.availableCollections = Array.from(collectionMap.entries())
      .map(([value, count]) => ({ value, label: value, count }))
      .sort((a, b) => b.count - a.count);

    // Calculate discount ranges
    this.calculateDiscountRanges();
  }

  calculateDiscountRanges(): void {
    const rangeCounts = {
      '20-29': 0,
      '30-39': 0,
      '40-49': 0,
      '50-more': 0,
    };

    this.allProducts.forEach((product) => {
      if (product.originalPrice && product.originalPrice > product.price) {
        const discountPercent =
          ((product.originalPrice - product.price) / product.originalPrice) *
          100;

        if (discountPercent >= 20 && discountPercent < 30)
          rangeCounts['20-29']++;
        else if (discountPercent >= 30 && discountPercent < 40)
          rangeCounts['30-39']++;
        else if (discountPercent >= 40 && discountPercent < 50)
          rangeCounts['40-49']++;
        else if (discountPercent >= 50) rangeCounts['50-more']++;
      }
    });

    // Update counts while preserving translated labels
    this.discountRanges[0].count = rangeCounts['20-29'];
    this.discountRanges[1].count = rangeCounts['30-39'];
    this.discountRanges[2].count = rangeCounts['40-49'];
    this.discountRanges[3].count = rangeCounts['50-more'];
  }

  syncWithCurrentFilters(): void {
    this.selectedSort = this.currentFilters.sortBy || '';
    this.selectedSizes = [...(this.currentFilters.sizes || [])];
    this.selectedProductTypes = [...(this.currentFilters.productTypes || [])];
    this.selectedColors = [...(this.currentFilters.colors || [])];
    this.selectedBrands = [...(this.currentFilters.brands || [])];
    this.selectedCollections = [...(this.currentFilters.collections || [])];
    this.selectedDiscountRanges = [
      ...(this.currentFilters.discountRanges || []),
    ];
    this.onSaleFilter = this.currentFilters.onSale || null;
  }

  capitalizeColor(color: string): string {
    return color.charAt(0).toUpperCase() + color.slice(1).toLowerCase();
  }

  // Event handlers
  onSortChange(sortValue: string): void {
    this.selectedSort = sortValue;
    this.emitFiltersChange();
  }

  onSizeToggle(size: string): void {
    const index = this.selectedSizes.indexOf(size);
    if (index > -1) {
      this.selectedSizes.splice(index, 1);
    } else {
      this.selectedSizes.push(size);
    }
    this.emitFiltersChange();
  }

  onProductTypeToggle(type: string): void {
    const index = this.selectedProductTypes.indexOf(type);
    if (index > -1) {
      this.selectedProductTypes.splice(index, 1);
    } else {
      this.selectedProductTypes.push(type);
    }
    this.emitFiltersChange();
  }

  onColorToggle(color: string): void {
    const index = this.selectedColors.indexOf(color);
    if (index > -1) {
      this.selectedColors.splice(index, 1);
    } else {
      this.selectedColors.push(color);
    }
    this.emitFiltersChange();
  }

  onBrandToggle(brand: string): void {
    const index = this.selectedBrands.indexOf(brand);
    if (index > -1) {
      this.selectedBrands.splice(index, 1);
    } else {
      this.selectedBrands.push(brand);
    }
    this.emitFiltersChange();
  }

  onCollectionToggle(collection: string): void {
    const index = this.selectedCollections.indexOf(collection);
    if (index > -1) {
      this.selectedCollections.splice(index, 1);
    } else {
      this.selectedCollections.push(collection);
    }
    this.emitFiltersChange();
  }

  onDiscountRangeToggle(range: string): void {
    const index = this.selectedDiscountRanges.indexOf(range);
    if (index > -1) {
      this.selectedDiscountRanges.splice(index, 1);
    } else {
      this.selectedDiscountRanges.push(range);
    }
    this.emitFiltersChange();
  }

  onSaleFilterChange(value: boolean | null): void {
    this.onSaleFilter = value;
    this.emitFiltersChange();
  }

  emitFiltersChange(): void {
    const filters: FilterOptions = {};

    if (this.selectedSort) filters.sortBy = this.selectedSort;
    if (this.selectedSizes.length > 0) filters.sizes = [...this.selectedSizes];
    if (this.selectedProductTypes.length > 0)
      filters.productTypes = [...this.selectedProductTypes];
    if (this.selectedColors.length > 0)
      filters.colors = [...this.selectedColors];
    if (this.selectedBrands.length > 0)
      filters.brands = [...this.selectedBrands];
    if (this.selectedCollections.length > 0)
      filters.collections = [...this.selectedCollections];
    if (this.selectedDiscountRanges.length > 0)
      filters.discountRanges = [...this.selectedDiscountRanges];
    if (this.onSaleFilter !== null) filters.onSale = this.onSaleFilter;

    this.filtersChange.emit(filters);
  }

  onResetFilters(): void {
    this.selectedSort = '';
    this.selectedSizes = [];
    this.selectedProductTypes = [];
    this.selectedColors = [];
    this.selectedBrands = [];
    this.selectedCollections = [];
    this.selectedDiscountRanges = [];
    this.onSaleFilter = null;

    this.filtersReset.emit();
  }

  onApplyFilters(): void {
    this.emitFiltersChange();
    // Close the offcanvas (Bootstrap specific)
    const offcanvasElement = document.getElementById('offcanvasRight');
    if (offcanvasElement) {
      const offcanvas = (window as any).bootstrap?.Offcanvas?.getInstance(
        offcanvasElement
      );
      offcanvas?.hide();
    }
  }

  // Utility methods
  isSizeSelected(size: string): boolean {
    return this.selectedSizes.includes(size);
  }

  isProductTypeSelected(type: string): boolean {
    return this.selectedProductTypes.includes(type);
  }

  isColorSelected(color: string): boolean {
    return this.selectedColors.includes(color);
  }

  isBrandSelected(brand: string): boolean {
    return this.selectedBrands.includes(brand);
  }

  isCollectionSelected(collection: string): boolean {
    return this.selectedCollections.includes(collection);
  }

  isDiscountRangeSelected(range: string): boolean {
    return this.selectedDiscountRanges.includes(range);
  }

  getActiveFiltersCount(): number {
    return (
      this.selectedSizes.length +
      this.selectedProductTypes.length +
      this.selectedColors.length +
      this.selectedBrands.length +
      this.selectedCollections.length +
      this.selectedDiscountRanges.length +
      (this.onSaleFilter !== null ? 1 : 0) +
      (this.selectedSort ? 1 : 0)
    );
  }

  getSaleProductsCount(): number {
    return this.allProducts.filter((p) => p.onSale).length;
  }

  getNonSaleProductsCount(): number {
    return this.allProducts.filter((p) => !p.onSale).length;
  }
}
