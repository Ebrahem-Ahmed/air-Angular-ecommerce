// interceptors/error.interceptor.ts
import { HttpInterceptorFn } from '@angular/common/http';
import { catchError, throwError } from 'rxjs';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  return next(req).pipe(
    catchError((error) => {
      console.error('HTTP Error:', error);

      // You can add global error handling here
      // For example, show toast notifications for specific error types

      return throwError(() => error);
    })
  );
};
