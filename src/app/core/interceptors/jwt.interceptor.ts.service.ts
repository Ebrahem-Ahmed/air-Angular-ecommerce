// interceptors/jwt.interceptor.ts
import { inject } from '@angular/core';
import { HttpInterceptorFn, HttpRequest } from '@angular/common/http';
import { catchError, throwError } from 'rxjs';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service.ts.service';

export const jwtInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // Skip token for authentication endpoints
  const authEndpoints = ['/auth/login', '/auth/register', '/auth/google-login'];
  const isAuthEndpoint = authEndpoints.some((endpoint) =>
    req.url.includes(endpoint)
  );

  // Define endpoints that should work for guest users (no token required)
  const guestAllowedEndpoints = [
    '/api/products',
    'api/Products/GetProductVariantsById',
    '/api/categories',
    '/api/cart',
    '/api/checkout/summary',
    '/api/checkout/process',
    '/api/checkout/complete',
    '/api/orders/guest',
    '/api/payment',
    // Add coupon endpoints for guest users
    '/api/coupon/calculate-discount',
    '/api/coupon/apply-to-cart',
    '/api/coupon/apply-to-order',
  ];

  // Define endpoints that REQUIRE authentication
  const authRequiredEndpoints = [
    '/api/addresses',
    '/api/addresse', // Fix the typo too
    '/api/profile',
    '/api/orders', // But not /api/orders/guest
    '/api/user',
    '/api/reviews', // Add reviews as auth-required
    // Coupon management endpoints that require auth
    '/api/coupon/order-coupons',
    '/api/coupon/GetAllOrderCoupons',
    '/api/coupon/CreateOrderCoupon',
    '/api/coupon/UpdateOrderCoupon',
    '/api/coupon/DeleteOrderCoupon',
    '/api/coupon/statistics',
  ];

  const isGuestAllowedEndpoint = guestAllowedEndpoints.some((endpoint) =>
    req.url.includes(endpoint)
  );

  const isAuthRequiredEndpoint = authRequiredEndpoints.some(
    (endpoint) => req.url.includes(endpoint) && !req.url.includes('/guest')
  );

  // Only add token if:
  // 1. Not an auth endpoint
  // 2. User is logged in
  // 3. Either endpoint requires auth OR user is logged in (for optional auth endpoints)
  if (!isAuthEndpoint) {
    const token = authService.getToken();
    const isLoggedIn = token && !authService.isTokenExpired();

    // Add token if user is logged in AND (endpoint requires auth OR endpoint supports auth)
    if (isLoggedIn && (isAuthRequiredEndpoint || !isGuestAllowedEndpoint)) {
      req = req.clone({
        setHeaders: {
          Authorization: `Bearer ${token}`,
        },
      });
    }
  }

  return next(req).pipe(
    catchError((error) => {
      // Handle 401 Unauthorized responses
      if (error.status === 401 && !isAuthEndpoint) {
        // Check if we're on a guest-allowed route
        const currentRoute = router.url.split('?')[0];
        const guestAllowedRoutes = [
          '/checkout',
          '/payment/success',
          '/payment/fail',
          '/cart',
          '/products',
          '/product', // Add single product route
          '/categories',
          '/category',
          '/men',
          '/women',
          '/kids',
          '/home',
          '/', // Add home route
        ];

        const isOnGuestRoute = guestAllowedRoutes.some(
          (route) =>
            currentRoute === route ||
            currentRoute.startsWith(route + '/') ||
            (route === '/' && currentRoute === route)
        );

        // Also check if this was a request to a guest-allowed endpoint
        const wasGuestEndpoint = guestAllowedEndpoints.some((endpoint) =>
          req.url.includes(endpoint)
        );

        // NEW LOGIC: Only redirect to login if BOTH conditions are true:
        // 1. User is NOT on a guest-allowed route AND
        // 2. The failed request was to an auth-required endpoint (not guest-allowed)
        const shouldRedirect =
          !isOnGuestRoute && !wasGuestEndpoint && isAuthRequiredEndpoint;

        if (shouldRedirect) {
          console.log(
            '401 error on protected route/endpoint, redirecting to login'
          );
          console.log('Current route:', currentRoute);
          console.log('Failed endpoint:', req.url);
          console.log('Is guest route:', isOnGuestRoute);
          console.log('Is guest endpoint:', wasGuestEndpoint);
          console.log('Is auth required endpoint:', isAuthRequiredEndpoint);

          authService.logoutLocal();
          router.navigate(['/auth/login'], {
            queryParams: { returnUrl: currentRoute },
          });
        } else {
          console.log(
            '401 error on guest-allowed route/endpoint, not redirecting'
          );
          console.log('Current route:', currentRoute);
          console.log('Failed endpoint:', req.url);
          console.log('Is guest route:', isOnGuestRoute);
          console.log('Is guest endpoint:', wasGuestEndpoint);
          console.log('Is auth required endpoint:', isAuthRequiredEndpoint);
        }
      }

      return throwError(() => error);
    })
  );
};
