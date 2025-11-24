import { Product, ProductVariant } from '../product/product.service';

export interface FilterOptions {
  sortBy?: string;
  sizes?: string[];
  productTypes?: string[];
  onSale?: boolean;
  colors?: string[];
  brands?: string[];
  collections?: string[];
  discountRanges?: string[];
  priceRange?: { min: number; max: number };
}

// Extended Product interface for display with computed properties
export interface DisplayProduct extends Product {
  // Computed properties for filtering and display
  availableSizes?: string[];
  availableColors?: string[];
  effectivePrice?: number;
  discountPercent?: number;
  primaryImage?: string;
  category?: string;
  brand?: string;
  collection?: string;
  productType?: string;
  rating?: number;
  reviewsCount?: number;
  salesCount?: number;
  onSale?: boolean;
  originalPrice?: number;
  discount?: string;
  imageUrl?: string;
  variants?: ProductVariant[];
  isAvailable?: boolean;
  priceAdjustment?: number;
}
