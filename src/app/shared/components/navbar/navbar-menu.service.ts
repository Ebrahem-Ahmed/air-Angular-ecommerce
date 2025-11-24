import { Injectable, inject } from '@angular/core';
import {
  Observable,
  of,
  catchError,
} from 'rxjs';
import { CategoryService } from '../../../features/category/category.service';

// navbar-menu.service.ts
@Injectable({
  providedIn: 'root',
})
export class NavbarMenuService {
  private categoryService = inject(CategoryService);

  loadMegaMenu(): Observable<{ [key: string]: any[] }> {
    return this.categoryService.getMegaMenuStructure().pipe(
      catchError((error) => {
        console.error('Failed to load menu data:', error);
        return of(this.getDefaultMenuData());
      })
    );
  }

  private getDefaultMenuData(): { [key: string]: any[] } {
    return {
      Men: [],
      Women: [],
      Kids: [],
      Sports: [],
    };
  }
}
