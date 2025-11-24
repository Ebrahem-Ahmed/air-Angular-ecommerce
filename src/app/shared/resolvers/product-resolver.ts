import { inject } from '@angular/core';
import { ResolveFn, ActivatedRouteSnapshot, Router } from '@angular/router';
import { catchError, of } from 'rxjs';
import { ToastService } from '../../core/services/toast.service';
import { ProductService, ProductWithVariants } from '../../features/product/product.service';

export const productResolver: ResolveFn<ProductWithVariants | null> = (route: ActivatedRouteSnapshot) => {
  const productService = inject(ProductService);
  const toastService = inject(ToastService);
  const router = inject(Router);

  const productId = route.paramMap.get('id');
  if (!productId) {
    router.navigate(['/']);
    return of(null);
  }

  return productService.getProductWithVariants(productId).pipe(
    catchError(err => {
      console.error('Resolver error loading product:', err);
      toastService.error('Failed to load product. Redirecting to home page.');
      router.navigate(['/']);
      return of(null);
    })
  );
};
