import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Women } from './women';

describe('Women', () => {
  let component: Women;
  let fixture: ComponentFixture<Women>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Women]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Women);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
