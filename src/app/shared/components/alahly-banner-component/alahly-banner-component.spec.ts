import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AlahlyBannerComponent } from './alahly-banner-component';

describe('AlahlyBannerComponent', () => {
  let component: AlahlyBannerComponent;
  let fixture: ComponentFixture<AlahlyBannerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AlahlyBannerComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AlahlyBannerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
