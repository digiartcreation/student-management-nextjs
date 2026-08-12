import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ImeiStatus } from './imei-status';

describe('ImeiStatus', () => {
  let component: ImeiStatus;
  let fixture: ComponentFixture<ImeiStatus>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ImeiStatus]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ImeiStatus);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
