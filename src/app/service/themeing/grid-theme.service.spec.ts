import { TestBed } from '@angular/core/testing';

import { GridThemeService } from './grid-theme.service';

describe('GridThemeService', () => {
  let service: GridThemeService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(GridThemeService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
