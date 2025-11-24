// shared/interfaces/product.interface.ts
export interface ProductVariant {
  id: string;
  sku?: string;
  size: string;
  color: string;
  imageUrl?: string;
  stockQuantity: number;
  priceAdjustment?: number;
  isAvailable?: boolean;
}

export interface VariantSelectorProduct {
  id: string;
  productId: string;
  productName: string;
  imageUrl?: string;
  price: number;
  originalPrice?: number;
  salePrice?: number;
  category?: string;
  isAvailable?: boolean;
  variants?: ProductVariant[];
}
