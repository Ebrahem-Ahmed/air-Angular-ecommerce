// navbar-dropdown.service.ts
import { Injectable, inject } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class NavbarDropdownService {
  handleDocumentClick(
    event: Event,
    dropdownStates: {
      languageDropdownOpen: boolean;
      userDropdownOpen: boolean;
      searchFocused: boolean;
    }
  ) {
    const target = event.target as HTMLElement;

    if (!target.closest('.language-dropdown')) {
      dropdownStates.languageDropdownOpen = false;
    }

    if (!target.closest('.user-dropdown')) {
      dropdownStates.userDropdownOpen = false;
    }

    if (!target.closest('.search-container')) {
      dropdownStates.searchFocused = false;
    }
  }
}
