import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';

interface SocialLink {
  name: string;
  icon: string;
  url: string;
}

interface FooterSection {
  title: string;
  items: string[];
}

interface FooterSocialSection {
  title: string;
  socialLinks: SocialLink[];
}

@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  templateUrl: './footer.html',
  styleUrls: ['./footer.scss'],
})
export class Footer {
  // Footer data structure - now properly used in template
  footerData = {
    products: {
      title: 'PRODUCTS',
      items: ['Shoes', 'Clothing', 'Accessories'],
    } as FooterSection,

    sports: {
      title: 'SPORTS',
      items: [
        'Running',
        'Basketball',
        'Football',
        'Yoga',

        'Training',
      ],
    } as FooterSection,

    category: {
      title: 'CATEGORY',
      items: ['Men', 'Women', 'Kids'],
    } as FooterSection,

    companyInfo: {
      title: 'COMPANY INFO',
      items: ['About Us', 'Careers', 'Carbon Footprint', 'Press'],
    } as FooterSection,

    support: {
      title: 'SUPPORT',
      items: [
        'Help',
        'Shipping & Delivery',
        'Returns & Exchanges',
        'adiClub & Newsletter',

      ],
    } as FooterSection,

    followUs: {
      title: 'FOLLOW US',
      socialLinks: [
        {
          name: 'Facebook',
          icon: 'facebook',
          url: 'https://facebook.com/adidas',
        },
        {
          name: 'Instagram',
          icon: 'instagram',
          url: 'https://instagram.com/adidas',
        },
        {
          name: 'YouTube',
          icon: 'youtube',
          url: 'https://youtube.com/adidas',
        },
      ],
    } as FooterSocialSection,
  };

  // Legal footer links
  footerLinks: string[] = [
    //'Data Settings',
    //'Cookie Settings',
    'Privacy Policy',
    'Terms And Conditions',
  'Our Products', // ✅ أضفنا منتجاتنا هنا

    //'Imprint',
  ];

  // Footer link actions
  onFooterLinkClick(item: string): void {
    console.log('Footer link clicked:', item);
    // Add your navigation logic here
    // Example: this.router.navigate(['/category', item.toLowerCase()]);
  }

  onSocialLinkClick(social: SocialLink): void {
    console.log('Social link clicked:', social.name);
    // The actual navigation happens via the href in the template
    // This is just for analytics tracking
  }

  onLegalLinkClick(link: string): void {
    console.log('Legal link clicked:', link);
    // Add your legal page navigation logic here
    // Example: this.router.navigate(['/legal', link.toLowerCase().replace(/\s+/g, '-')]);
  }
}
