import { Category } from "./category.models";

// ============ PRODUCT MODELS ============
export interface Product {
  id: string;
  name: string;
  description?: string;
  shortDescription?: string;
  categoryId: string;
  category?: Category;
  price: number;
  salePrice?: number;
  isOnSale: boolean;
  isFeatured: boolean;
  isActive: boolean;
  sku: string;
  brand: string;
  tags?: string[];
  metadata?: Record<string, any>;
  rating: number;
  reviewCount: number;
  createdAt: Date;
  updatedAt: Date;
  variants?: ProductVariant[];
  images?: ProductImage[];
}

export interface ProductVariant {
  id: string;
  productId: string;
  product?: Product;
  size: string;
  color: string;
  colorHex?: string;
  material?: string;
  sku: string;
  barcode?: string;
  stockQuantity: number;
  price: number;
  salePrice?: number;
  weight?: number;
  dimensions?: ProductDimensions;
  isActive: boolean;
  sortOrder: number;
  images?: ProductImage[];
}

export interface ProductImage {
  id: string;
  productVariantId?: string;
  productId?: string;
  imageUrl: string;
  thumbnailUrl?: string;
  altText?: string;
  isPrimary: boolean;
  sortOrder: number;
  colorVariant?: string;
}

export interface ProductDimensions {
  length: number;
  width: number;
  height: number;
  unit: 'cm' | 'inch';
}

export interface ProductWithVariants extends Product {
  variants: ProductVariant[];
}

export interface ProductFilter {
  categoryId?: string;
  minPrice?: number;
  maxPrice?: number;
  sizes?: string[];
  colors?: string[];
  brands?: string[];
  tags?: string[];
  isOnSale?: boolean;
  inStock?: boolean;
  rating?: number;
  sortBy?: ProductSortOption;
  sortOrder?: 'asc' | 'desc';
  page?: number;
  pageSize?: number;
  searchTerm?: string;
}

export enum ProductSortOption {
  Name = 'name',
  Price = 'price',
  CreatedAt = 'createdAt',
  Rating = 'rating',
  Popularity = 'popularity',
  Discount = 'discount',
}

export interface ProductSearchResult {
  products: Product[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  filters?: ProductFilter;
}
