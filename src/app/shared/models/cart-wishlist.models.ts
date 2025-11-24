// models/cart-wishlist.models.ts

// Common interfaces used by both services
export interface ProductVariantForCart {
  id: string;
  productId: string;
  sku: string;
  size: string;
  color: string;
  stockQuantity: number;
  priceAdjustment: number;
  imageUrl?: string;
  product?: {
    id: string;
    name: string;
    price: number;
    originalPrice?: number;
    imageUrl?: string;
    description?: string;
    brand?: string;
    category?: string;
  };
}

export interface CartValidationResult {
  variantId: string;
  isAvailable: boolean;
  stockQuantity: number;
  currentPrice: number;
  maxQuantityPerOrder?: number;
}

export interface WishlistValidationResult {
  variantId: string;
  isAvailable: boolean;
  stockQuantity: number;
  currentPrice: number;
}

// Cart specific interfaces
export interface CartUpdateRequest {
  cartItemId: string;
  quantity: number;
}

export interface CartSyncRequest {
  items: {
    variantId: string;
    quantity: number;
  }[];
}

export interface CartCheckoutData {
  items: {
    variantId: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    productName: string;
    variantDetails: string;
  }[];
  subtotal: number;
  itemCount: number;
  totalItems: number;
}

// Wishlist specific interfaces
export interface WishlistSyncRequest {
  variantIds: string[];
}

export interface WishlistMoveToCartRequest {
  wishlistItemId: string;
  quantity: number;
}

export interface WishlistBulkActionRequest {
  itemIds: string[];
  action: 'moveToCart' | 'remove';
  quantity?: number;
}

// Shared enums
export enum StorageKeys {
  CART = 'adidas_cart',
  WISHLIST = 'adidas_wishlist',
  CART_SYNC_TIMESTAMP = 'adidas_cart_sync',
  WISHLIST_SYNC_TIMESTAMP = 'adidas_wishlist_sync',
}

export enum SortOptions {
  DATE_ADDED_DESC = 'dateAdded_desc',
  DATE_ADDED_ASC = 'dateAdded_asc',
  NAME_ASC = 'name_asc',
  NAME_DESC = 'name_desc',
  PRICE_ASC = 'price_asc',
  PRICE_DESC = 'price_desc',
}

export enum FilterOptions {
  ALL = 'all',
  AVAILABLE = 'available',
  UNAVAILABLE = 'unavailable',
  IN_STOCK = 'in_stock',
  LOW_STOCK = 'low_stock',
}

// Response interfaces for API calls
export interface CartApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  errors?: string[];
}

export interface WishlistApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  errors?: string[];
}

// Server-side cart item structure (as it might come from API)
export interface ServerCartItem {
  id: string;
  userId: string;
  variantId: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  createdAt: string;
  updatedAt: string;
  variant?: {
    id: string;
    sku: string;
    size: string;
    color: string;
    imageUrl?: string;
    stockQuantity: number;
    priceAdjustment: number;
    productId: string;
    product?: {
      id: string;
      name: string;
      price: number;
      originalPrice?: number;
      imageUrl?: string;
      brand?: string;
      category?: string;
    };
  };
}

// Server-side wishlist item structure (as it might come from API)
export interface ServerWishlistItem {
  id: string;
  userId: string;
  variantId: string;
  createdAt: string;
  updatedAt: string;
  variant?: {
    id: string;
    sku: string;
    size: string;
    color: string;
    imageUrl?: string;
    stockQuantity: number;
    priceAdjustment: number;
    productId: string;
    product?: {
      id: string;
      name: string;
      price: number;
      originalPrice?: number;
      imageUrl?: string;
      brand?: string;
      category?: string;
    };
  };
}

// Utility types
export type CartActionResult = {
  success: boolean;
  message?: string;
  errors?: string[];
};

export type WishlistActionResult = {
  success: boolean;
  message?: string;
  errors?: string[];
};

// Local storage data structures
export interface StoredCartData {
  items: CartItem[];
  lastSynced?: string;
  version: number;
}

export interface StoredWishlistData {
  items: WishlistItem[];
  lastSynced?: string;
  version: number;
}

// Import the CartItem and WishlistItem from the services
// (These would typically be in the services files, but including here for reference)
export interface CartItem {
  id: string;
  variantId: string;
  productId: string;
  productName: string;
  sku: string;
  size: string;
  color: string;
  imageUrl?: string;
  unitPrice: number;
  quantity: number;
  totalPrice: number;
  variantDetails?: string;
  maxStock?: number;
}

export interface WishlistItem {
  id: string;
  variantId: string;
  productId: string;
  productName: string;
  sku: string;
  size: string;
  color: string;
  imageUrl?: string;
  price: number;
  originalPrice?: number;
  variantDetails?: string;
  isAvailable: boolean;
  stockQuantity?: number;
  dateAdded: Date;
}
