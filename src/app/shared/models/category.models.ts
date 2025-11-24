export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
  type: CategoryType;
  status: CategoryStatus;
  parentCategoryId?: string;
  parentCategory?: Category;
  subCategories?: Category[];
  imageUrl?: string;
  iconUrl?: string;
  bannerImageUrl?: string;
  metaTitle?: string;
  metaDescription?: string;
  sortOrder: number;
  isActive: boolean;
  isFeatured: boolean;
  productCount?: number;
  level: number;
  path?: string;
  createdAt: Date;
  updatedAt: Date;
}

export enum CategoryType {
  Main = 'Main',
  Sub = 'Sub',
  Sport = 'Sport',
  Gender = 'Gender',
}

export enum CategoryStatus {
  Active = 'Active',
  Inactive = 'Inactive',
  Draft = 'Draft',
}

export interface CategoryHierarchy {
  mainCategory: Category;
  subCategories: Category[];
}

export interface CategoryTree extends Category {
  children: CategoryTree[];
  depth: number;
}

export interface CategoryBreadcrumb {
  id: string;
  name: string;
  slug: string;
  url: string;
}

export interface MegaMenuStructure {
  [key: string]: CategoryHierarchy[];
}
