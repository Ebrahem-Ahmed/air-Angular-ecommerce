import { inject } from '@angular/core';
import { ResolveFn, ActivatedRouteSnapshot } from '@angular/router';

import { catchError, of } from 'rxjs';
import { CategoryDataService } from '../../features/category/category-data.service';
import { DisplayProduct } from '../../features/category/category.types';
import { ProductService } from '../../features/product/product.service';

export const categoryResolver: ResolveFn<DisplayProduct[]> = (
  route: ActivatedRouteSnapshot
) => {
  const categoryDataService = inject(CategoryDataService);
  const productService = inject(ProductService);

  const categoryId = route.paramMap.get('id');
  if (!categoryId) return of([]);

  return productService.getProductsByCategory(categoryId).pipe(
    catchError((err) => {
      console.error('Resolver error loading category:', err);
      return of([]);
    })
  );
};
