import { Injectable } from '@angular/core';
import { themeQuartz,Theme } from 'ag-grid-community'; 
@Injectable({
  providedIn: 'root'
})
export class GridThemeService {
  public globalGridTheme: Theme;
  public globalDarkGridTheme: Theme;

  constructor() {
    this.globalGridTheme = themeQuartz.withParams({
      spacing: 12,
      accentColor: 'black',
      selectedRowBackgroundColor: '#F5F9FE',
    });
    this.globalDarkGridTheme = themeQuartz.withParams({
      spacing: 12,
      accentColor: 'white',
      backgroundColor: '#121212',
      borderColor:'#3D3D3D',
      textColor:'#D1D1D1',
      checkboxUncheckedBorderColor:'#3D3D3D',   
      selectedRowBackgroundColor: '#1B1B1B',
    });
  }

  getTheme(): Theme {
    return  document.body.classList.contains('dark')?this.globalDarkGridTheme: this.globalGridTheme;
  }
}
