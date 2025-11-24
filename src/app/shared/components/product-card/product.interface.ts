// interfaces/product.interface.ts
export interface Product {
  id: number;
  name: string;
  price: number;
  originalPrice?: number;
  discount?: string;
  category: string;
  subcategory?: string;
  colors?: string[];
  colorOptions?: ColorOption[];
  imageUrl: string;
  hoverImageUrl?: string;
  additionalImages?: string[];
  onSale?: boolean;
  isNew?: boolean;
  isExclusive?: boolean;
  isLimitedEdition?: boolean;
  sustainability?: SustainabilityInfo;
  rating?: number;
  reviewCount?: number;
  sizes?: SizeOption[];
  availableSizes?: string[];
  tags?: string[];
  description?: string;
  features?: string[];
  materials?: string[];
  productCode?: string;
  releaseDate?: string;
  stockStatus?: 'in-stock' | 'low-stock' | 'out-of-stock';
  quickShip?: boolean;
}

export interface ColorOption {
  name: string;
  hex: string;
  imageUrl: string;
}

export interface SizeOption {
  size: string;
  available: boolean;
  isPopular?: boolean;
}

export interface SustainabilityInfo {
  isEcoFriendly: boolean;
  materials?: string[];
  certifications?: string[];
  recycledContent?: number;
}

// types/product-card.types.ts
export type ProductCardLayout = 'standard' | 'compact' | 'large' | 'minimal';
export type ProductCardView = 'grid' | 'list';
export type ProductSortOption = 'name' | 'price-asc' | 'price-desc' | 'rating' | 'newest' | 'popularity';

export interface ProductCardConfig {
  layout: ProductCardLayout;
  showQuickActions: boolean;
  showColorOptions: boolean;
  showSizeOptions: boolean;
  showWishlistButton: boolean;
  showRating: boolean;
  showBadges: boolean;
  enableHoverEffects: boolean;
  lazyLoading: boolean;
}

export interface ProductListConfig extends ProductCardConfig {
  itemsPerPage: number;
  enableInfiniteScroll: boolean;
  enableFilters: boolean;
  enableSorting: boolean;
  enableViewToggle: boolean;
  defaultView: ProductCardView;
  gridColumns: {
    xs: number;
    sm: number;
    md: number;
    lg: number;
    xl: number;
    xxl: number;
  };
}

export interface ProductCardEvent {
  type: 'wishlist' | 'quick-view' | 'quick-add' | 'size-select' | 'color-select' | 'click';
  product: Product;
  data?: any;
}