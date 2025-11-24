import { inject, Injectable } from '@angular/core';
import { ApiService } from '../../core/services/api.service.ts.service';
import { Category, CategoryType } from './category.service';
import { catchError, Observable, of } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class SubCategoryService {
  private api = inject(ApiService);

  getSubCategoryBySlug(categorySlug: string): Observable<Category> {
    return this.api
      .get<Category>(
        `Categories/GetSubCategoryBySlug/${categorySlug}`
      )
      .pipe(
        catchError((error) => {
          console.error(
            `Error fetching sub categories for ID ${categorySlug}:`,
            error
          );
          return of({} as Category);
        })
      );
  }

  /**
   * Check if category is a main category
   */
  isMainCategory(category: Category): boolean {
    return category.type === CategoryType.Main;
  }

  /**
   * Check if category is a sub category
   */
  isSubCategory(category: Category): boolean {
    return category.type === CategoryType.Sub;
  }
}
