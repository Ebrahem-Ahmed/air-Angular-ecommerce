import { Injectable } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';

@Injectable({ providedIn: 'root' })
export class AppTranslateService {
  constructor(private translate: TranslateService) {
    // اللغات المدعومة
    translate.addLangs(['en', 'ar']);
    translate.setDefaultLang('en');

    // لو فيه لغة متخزنة في localStorage خليها هي
    const savedLang = localStorage.getItem('lang');
    const browserLang = translate.getBrowserLang();

    if (savedLang) {
      translate.use(savedLang);
    } else {
      translate.use(browserLang?.match(/en|ar/) ? browserLang : 'en');
    }
  }

  switchLang(lang: string) {
    this.translate.use(lang);
    localStorage.setItem('lang', lang); // تخزين اللغة
  }
}
