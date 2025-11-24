import { TranslateModule, TranslateService } from '@ngx-translate/core';
import {
  Component,
  OnInit,
  OnDestroy,
  HostListener,
  ElementRef,
  ViewChild,
  inject,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  HostBinding,
  AfterViewInit,
  computed,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import {
  Subject,
  takeUntil,
  debounceTime,
  distinctUntilChanged,
  switchMap,
  BehaviorSubject,
  combineLatest,
  of,
  forkJoin,
  map,
  catchError,
} from 'rxjs';
import { AppTranslateService } from '../../../core/services/translate.service.ts.service';
import { UserInfoDto } from '../../../shared/models/auth.models';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../core/services/auth.service.ts.service';
import {
  CategoryHierarchy,
  CategoryService,
} from '../../../features/category/category.service';
import {
  ProductService,
  Product,
} from '../../../features/product/product.service';
import { WishlistService } from '../../../features/wishlist/wishlist.service';
import { CartService } from '../../../features/cart/cart.service';

// Simplified types
type MenuKey = 'Men' | 'Women' | 'Kids' | 'Sports';

interface SearchResult {
  id: string;
  title: string;
  type: 'product' | 'category';
  image?: string;
  price?: string;
  link: string;
}

interface LanguageOption {
  code: string;
  name: string;
  flag: string;
  isRTL?: boolean;
}

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule, RouterLink],
  templateUrl: './navbar.html',
  styleUrls: ['./navbar.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Navbar implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild('searchInput') searchInput!: ElementRef;

  // Injected services
  private authService = inject(AuthService);
  private router = inject(Router);
  private translateService = inject(TranslateService);
  private appTranslateService = inject(AppTranslateService);
  private categoryService = inject(CategoryService);
  private productService = inject(ProductService);
  private cdr = inject(ChangeDetectorRef);
  private wishlistService = inject(WishlistService);
  private cartService = inject(CartService);
  private destroy$ = new Subject<void>();
  private searchSubject$ = new BehaviorSubject<string>('');

  // Core state
  currentUser: UserInfoDto | null = null;
  isAuthenticated = false;
  cartCount = computed(() => this.cartService.totalItems());
  wishlistCount = computed(() => this.wishlistService.itemCount());
  showPromoBanner = localStorage.getItem('promoBannerClosed') !== 'true';
mainCategories: any[] = [];
  // RTL state
  isRTL = false;

  // Host binding to apply RTL class to component
  @HostBinding('class.rtl-component') get rtlClass() {
    return this.isRTL;
  }

  // Menu data - cached after first load
  menuData: { [key: string]: CategoryHierarchy[] } = {};
  isMenuDataLoaded = false;
  isMenuDataLoading = false;

  // Search state
  searchQuery = '';
  isSearchFocused = false;
  searchResults: SearchResult[] = [];
  isSearchLoading = false;

  // Language state
  currentLanguage = 'en';
  isLanguageDropdownOpen = false;
  languages: LanguageOption[] = [
    { code: 'en', name: 'English', flag: '/Icons/eg.svg', isRTL: false },
    { code: 'ar', name: 'العربية', flag: '/Icons/eg.svg', isRTL: true },
  ];

  // UI state
  isUserDropdownOpen = false;

  constructor() {}

  ngOnInit() {
    this.initializeAuth();
    this.initializeLanguage();
    this.loadMenuDataOnce();
    this.setupOptimizedSearch();
    this.initializeRTL();
  }

  ngAfterViewInit() {
    // Force RTL update after view initialization
    setTimeout(() => {
      this.forceRTLUpdate();
    }, 100);
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // RTL Initialization and management with full debugging
  private initializeRTL() {
    // Get the actual current language from the translate service
    const actualLang =
      this.translateService.currentLang ||
      this.translateService.defaultLang ||
      'en';
    if (this.currentLanguage !== actualLang) {
      this.currentLanguage = actualLang;
    }

    // Set initial RTL state
    this.checkRTLLanguage();

    this.updateDocumentLanguage(this.currentLanguage);

    // Force change detection
    this.cdr.markForCheck();
    this.cdr.detectChanges();
  }

  private checkRTLLanguage() {
    const rtlLanguages = ['ar', 'he', 'fa', 'ur', 'ku', 'ps'];
    const wasRTL = this.isRTL;
    this.isRTL = rtlLanguages.includes(this.currentLanguage);

    if (wasRTL !== this.isRTL) {
      this.cdr.markForCheck();
    }
  }

  private updateDocumentDirection() {
    this.updateDocumentLanguage(this.currentLanguage);
  }

  private updateDocumentLanguage(lang: string) {
    const htmlElement = document.documentElement;
    const bodyElement = document.body;

    if (!htmlElement || !bodyElement) {
      console.error('🔍 HTML or Body element not found!');
      return;
    }

    // Update RTL status first
    this.checkRTLLanguage();

    // Set language attribute
    htmlElement.setAttribute('lang', lang);

    if (lang === 'ar' || this.isRTL) {
      htmlElement.setAttribute('dir', 'rtl');

      bodyElement.classList.add('rtl-layout');
      bodyElement.classList.remove('ltr-layout');
    } else {
      htmlElement.setAttribute('dir', 'ltr');

      bodyElement.classList.add('ltr-layout');
      bodyElement.classList.remove('rtl-layout');
    }

    // Apply RTL-specific navbar classes
    const navbar = document.querySelector('.main-navbar');

    if (navbar) {
      if (this.isRTL) {
        navbar.classList.add('rtl-navbar');
        navbar.classList.remove('ltr-navbar');
      } else {
        navbar.classList.add('ltr-navbar');
        navbar.classList.remove('rtl-navbar');
      }
    }
  }

  // Initialization methods
  private initializeAuth() {
    this.authService.currentUser$
      .pipe(takeUntil(this.destroy$))
      .subscribe((user) => {
        this.currentUser = user;
        this.isAuthenticated = !!user;
        this.cdr.markForCheck();
      });
  }

  private initializeLanguage() {
    this.translateService.onLangChange
      .pipe(takeUntil(this.destroy$))
      .subscribe((event) => {
        this.currentLanguage = event.lang;
        this.updateDocumentLanguage(event.lang);
        this.cdr.markForCheck();
      });

    const currentLang = this.translateService.currentLang || 'en';
    this.currentLanguage = currentLang;
    this.updateDocumentLanguage(this.currentLanguage);
  }

  // Optimized menu data loading
private loadMenuDataOnce() {
  if (this.isMenuDataLoaded || this.isMenuDataLoading) {
    return;
  }

  this.isMenuDataLoading = true;

  this.categoryService
    .getMegaMenuStructure()
    .pipe(takeUntil(this.destroy$))
    .subscribe({
      next: (data) => {
        this.menuData = data;

        // بناء قائمة موحدة لكل التصنيفات الرئيسية مع الفرعية
        const allSections: any[] = [];
        Object.values(data).forEach((sections: any) => {
          allSections.push(...sections);
        });

        this.mainCategories = allSections.map((section: any) => ({
          id: section.mainCategory.id,
          name: section.mainCategory.name,
          subCategories: section.subCategories || [],
        }));

        this.isMenuDataLoaded = true;
        this.isMenuDataLoading = false;
        this.cdr.markForCheck();

        console.log('✅ Main categories loaded:', this.mainCategories);
      },
      error: (error) => {
        console.error('Error loading menu data:', error);
        this.isMenuDataLoading = false;
        this.cdr.markForCheck();
      },
    });
}

  // Fixed search implementation
  private setupOptimizedSearch() {
    this.searchSubject$
      .pipe(
        takeUntil(this.destroy$),
        debounceTime(300),
        distinctUntilChanged(),
        switchMap((query) => {
          if (!query.trim()) {
            // Return recent items when no search query
            return this.getRecentItems();
          }

          this.isSearchLoading = true;
          this.cdr.markForCheck();

          // Search both categories and products using the correct API calls
          return forkJoin({
            categories: this.categoryService.searchCategories(query).pipe(
              catchError((error) => {
                console.error('Category search error:', error);
                return of([]);
              })
            ),
            products: this.productService.searchProducts(query).pipe(
              catchError((error) => {
                console.error('Product search error:', error);
                return of([]);
              })
            ),
          }).pipe(
            map(({ categories, products }) => {
              const results: SearchResult[] = [
                ...this.mapCategoriesToSearchResults(categories || []).slice(
                  0,
                  3
                ),
                ...this.mapProductsToSearchResults(products || []).slice(0, 5),
              ];
              return results;
            }),
            catchError((error) => {
              console.error('Search error:', error);
              return of([]);
            })
          );
        })
      )
      .subscribe({
        next: (results) => {
          this.searchResults = results;
          this.isSearchLoading = false;
          this.cdr.markForCheck();
        },
        error: (error) => {
          console.error('Search subscription error:', error);
          this.searchResults = [];
          this.isSearchLoading = false;
          this.cdr.markForCheck();
        },
      });
  }

  // Get recent items when no search query
  private getRecentItems() {
    return forkJoin({
      recentProducts: this.productService
        .getLastAddedProducts()
        .pipe(catchError(() => of([]))),
      activeCategories: this.categoryService
        .getActiveMainCategories()
        .pipe(catchError(() => of([]))),
    }).pipe(
      map(({ recentProducts, activeCategories }) => {
        const results: SearchResult[] = [
          ...this.mapProductsToSearchResults(recentProducts || []).slice(0, 3),
          ...this.mapCategoriesToSearchResults(activeCategories || []).slice(
            0,
            2
          ),
        ];
        return results;
      })
    );
  }

  // Helper methods for mapping search results
  private mapCategoriesToSearchResults(categories: any[]): SearchResult[] {
    if (!Array.isArray(categories)) return [];

    return categories.map((category) => ({
      id: category.id?.toString() || '',
      title: category.name || 'Category',
      type: 'category' as const,
      image: category.imageUrl || 'assets/placeholder-category.jpg',
      link: `/categories/${category.slug || category.id}`,
    }));
  }

  private mapProductsToSearchResults(products: any[]): SearchResult[] {
    if (!Array.isArray(products)) return [];

    return products.map((product) => ({
      id: product.id?.toString() || '',
      title: product.name || 'Product',
      type: 'product' as const,
      image: this.getProductImage(product),
      price: product.price ? this.formatPrice(product.price) : undefined,
      link: `/products/${product.slug || product.id}`,
    }));
  }

  // Get product image (handle different image structures)
  private getProductImage(product: any): string {
    // Try different possible image structures
    if (
      product.images &&
      Array.isArray(product.images) &&
      product.images.length > 0
    ) {
      return product.images[0].imageUrl || 'assets/placeholder-product.jpg';
    }

    if (product.imageUrl) {
      return product.imageUrl;
    }

    if (product.variants && Array.isArray(product.variants)) {
      for (const variant of product.variants) {
        if (
          variant.images &&
          Array.isArray(variant.images) &&
          variant.images.length > 0
        ) {
          return variant.images[0].imageUrl;
        }
      }
    }

    return 'assets/placeholder-product.jpg';
  }

  // Format price
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

  // Search methods
  onSearchFocus() {
    this.isSearchFocused = true;
    // If no current search, show recent items
    if (!this.searchQuery.trim()) {
      this.searchSubject$.next('');
    }
    this.cdr.markForCheck();
  }

  onSearchBlur() {
    setTimeout(() => {
      this.isSearchFocused = false;
      this.cdr.markForCheck();
    }, 200);
  }

  onSearchInput() {
    this.searchSubject$.next(this.searchQuery);
  }

  onSearchResultClick(result: SearchResult) {
    this.router.navigate([result.link]);
    this.clearSearch();
  }

  onSearch() {
    if (this.searchQuery.trim()) {
      this.router.navigate(['/search'], {
        queryParams: { q: this.searchQuery, type: 'all' },
      });
      this.clearSearch();
    }
  }

  private clearSearch() {
    this.searchQuery = '';
    this.searchResults = [];
    this.isSearchFocused = false;
    this.isSearchLoading = false;
    this.searchSubject$.next('');
    this.cdr.markForCheck();
  }

  // User methods
  getUserDisplayName(): string {
    return (
      this.authService.getUserDisplayName?.() ||
      this.currentUser?.firstName ||
      this.currentUser?.email ||
      'User'
    );
  }

  getUserInitials(): string {
    return this.authService.getUserInitials?.() || this.getDefaultInitials();
  }

  private getDefaultInitials(): string {
    if (this.currentUser?.firstName && this.currentUser?.lastName) {
      return `${this.currentUser.firstName[0]}${this.currentUser.lastName[0]}`.toUpperCase();
    }
    return this.currentUser?.email?.[0]?.toUpperCase() || 'U';
  }

  toggleUserDropdown() {
    this.isUserDropdownOpen = !this.isUserDropdownOpen;
    this.cdr.markForCheck();
  }

  // Navigation methods
  navigateToLogin() {
    this.router.navigate(['/auth/login']);
  }

  navigateToProfile() {
    this.router.navigate(['/profile']);
    this.isUserDropdownOpen = false;
    this.cdr.markForCheck();
  }

  navigateToOrders() {
    this.router.navigate(['/orders']);
    this.isUserDropdownOpen = false;
    this.cdr.markForCheck();
  }

  navigateToSettings() {
    this.router.navigate(['/settings']);
    this.isUserDropdownOpen = false;
    this.cdr.markForCheck();
  }

  onCartClick() {
    this.router.navigate(['/cart']);
  }

  onWishlistClick() {
    this.router.navigate(['/wishlist']);
  }

  onAccountClick() {
    if (this.isAuthenticated) {
      this.navigateToProfile();
    } else {
      this.navigateToLogin();
    }
  }

  // Auth methods
  logout() {
    if (this.authService.logout) {
      this.authService.logout().subscribe({
        next: () => {
          this.isUserDropdownOpen = false;
          this.cdr.markForCheck();
        },
        error: () => {
          this.authService.logoutLocal?.();
          this.isUserDropdownOpen = false;
          this.cdr.markForCheck();
        },
      });
    } else {
      this.authService.logoutLocal?.();
      this.isUserDropdownOpen = false;
      this.cdr.markForCheck();
    }
  }

  // Language methods with RTL support and full debugging
  switchLanguage(langCode: string) {
    console.log('🔍 switchLanguage called with:', langCode);
    console.log('🔍 Previous language:', this.currentLanguage);

    const previousLang = this.currentLanguage;

    // Update language through the translation service
    if (this.appTranslateService?.switchLang) {
      console.log('🔍 Using appTranslateService.switchLang');
      this.appTranslateService.switchLang(langCode);
    } else {
      console.log(
        '🔍 appTranslateService.switchLang not available, using translateService directly'
      );
      this.translateService.use(langCode);
    }

    // Update component state
    this.currentLanguage = langCode;
    this.isLanguageDropdownOpen = false;

    console.log('🔍 Language updated to:', this.currentLanguage);

    // Update RTL state and document direction
    console.log('🔍 Checking RTL language for:', langCode);
    this.checkRTLLanguage();
    console.log('🔍 RTL state after language switch:', this.isRTL);

    this.updateDocumentLanguage(langCode);

    this.cdr.markForCheck();
    this.cdr.detectChanges();

    // Optional: Emit custom event for other components
    this.notifyLanguageChange(langCode, previousLang);

    console.log('🔍 Language switch completed');
  }

  private notifyLanguageChange(newLang: string, oldLang: string) {
    console.log(
      '🔍 Notifying language change:',
      oldLang,
      '->',
      newLang,
      'RTL:',
      this.isRTL
    );
    const event = new CustomEvent('languageChanged', {
      detail: { newLang, oldLang, isRTL: this.isRTL },
    });
    document.dispatchEvent(event);
  }

  toggleLanguageDropdown() {
    this.isLanguageDropdownOpen = !this.isLanguageDropdownOpen;
    this.cdr.markForCheck();
  }

  getCurrentLanguage(): LanguageOption {
    const currentLang =
      this.languages.find((lang) => lang.code === this.currentLanguage) ||
      this.languages[0];
    return {
      ...currentLang,
      isRTL: this.isRTL,
    };
  }

  // RTL helper methods
  getTextDirection(): string {
    const direction = this.isRTL ? 'rtl' : 'ltr';
    return direction;
  }

  getDropdownClasses(dropdownType: 'user' | 'language'): string {
    let classes = '';
    if (dropdownType === 'user') {
      classes = this.isRTL ? 'dropdown-menu-start' : 'dropdown-menu-end';
    } else if (dropdownType === 'language') {
      classes = this.isRTL ? 'dropdown-menu-end' : 'dropdown-menu-start';
    }

    return classes;
  }

  getSearchPlaceholder(): string {
    const placeholder = this.translateService.instant(
      'NAVBAR.SEARCH_PLACEHOLDER'
    );

    // Add RTL mark if needed
    if (this.isRTL && placeholder) {
      return '‏' + placeholder + '‏'; // Add RLM (Right-to-Left Mark)
    }

    return placeholder;
  }

  // UI utility methods
  closePromoBanner() {
    this.showPromoBanner = false;
    localStorage.setItem('promoBannerClosed', 'true');
    this.cdr.markForCheck();
  }

  getProductResults(): SearchResult[] {
    return this.searchResults.filter((result) => result.type === 'product');
  }

  getCategoryResults(): SearchResult[] {
    return this.searchResults.filter((result) => result.type === 'category');
  }

  // Menu data getter
  getMenuData(type: string): CategoryHierarchy[] {
    return this.menuData[type] || [];
  }

  hasMenuData(): boolean {
    return this.isMenuDataLoaded && Object.keys(this.menuData).length > 0;
  }

  // TrackBy functions for better performance
  trackBySection(index: number, section: CategoryHierarchy): any {
    return section.mainCategory?.id || index;
  }

  trackBySubCategory(index: number, sub: any): any {
    return sub.id || index;
  }

  trackBySearchResult(index: number, result: SearchResult): any {
    return result.id || index;
  }

  // Public method to force RTL update (useful for debugging)
  public forceRTLUpdate() {
    this.checkRTLLanguage();
    this.updateDocumentDirection();
    this.cdr.markForCheck();
    this.cdr.detectChanges();
  }

  // Debug method to test RTL switching
  public debugRTL() {}

  // Event listeners
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event) {
    const target = event.target as HTMLElement;

    if (!target.closest('.language-dropdown')) {
      this.isLanguageDropdownOpen = false;
    }

    if (!target.closest('.user-dropdown')) {
      this.isUserDropdownOpen = false;
    }

    if (!target.closest('.search-container')) {
      this.isSearchFocused = false;
    }

    this.cdr.markForCheck();
  }

  @HostListener('keydown', ['$event'])
  onKeyDown(event: KeyboardEvent) {
    if (this.isSearchFocused && this.searchResults.length > 0) {
      this.handleSearchKeyNavigation(event);
    }

    // Debug key combination (Ctrl+Shift+D)
    if (event.ctrlKey && event.shiftKey && event.key === 'D') {
      event.preventDefault();
      this.debugRTL();
    }
  }

  private handleSearchKeyNavigation(event: KeyboardEvent) {
    switch (event.key) {
      case 'Enter':
        event.preventDefault();
        if (this.searchQuery.trim()) {
          this.onSearch();
        }
        break;
      case 'Escape':
        this.clearSearch();
        break;
    }
  }
}
