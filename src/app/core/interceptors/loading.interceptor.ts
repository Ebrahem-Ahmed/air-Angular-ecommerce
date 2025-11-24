// interceptors/loading.interceptor.ts
import { inject } from '@angular/core';
import { HttpInterceptorFn } from '@angular/common/http';
import { finalize } from 'rxjs';
import { LoadingService } from '../services/loading.service';

export const loadingInterceptor: HttpInterceptorFn = (req, next) => {
const loadingService = inject(LoadingService);

// Skip loading indicator for certain endpoints if needed
const skipLoading = req.headers.get('X-Skip-Loading') === 'true';

if (!skipLoading)
{
loadingService.setLoading(true);
}

return next(req).pipe(
  finalize(() => {
if (!skipLoading)
{
loadingService.setLoading(false);
}
})
);
};
