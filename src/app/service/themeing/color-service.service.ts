import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class ColorService {
  constructor() {}

  getColorForStatus(status: string) {
    switch (status?.toLowerCase()) {
      case "running":
        return "#28A745";
      case "stop":
        return "#DC3545";
      case "idle":
        return "#17A2B8";
      case "overspeed":
        return "#F0B500";
      case "offline":
        return "#4C8EDA";
      case "towed":
        return "#954535";
      case "inactive":
        return "#7A6A8A";
      case "waiting":
        return "#FF7518";
      case "filling":
        return "#4C8EDA";  
      case "theft":
        return "#FF7518"  
      case "expired":
        return document.body.classList.contains('dark')?"#888888":"#657686";
      default:
        return '#4B4B4D';
    }
  }

  // color-service.service.ts
getBgColorForStatus(status: string) {
 switch (status.toLowerCase()) {
      case "running":
        return "#28A74555";
      case "stop":
        return "#DC354555";
      case "idle":
        return "#17A2B855";
      case "overspeed":
        return "#F0B50055";
      case "offline":
        return "#4C8EDA55";
      case "towed":
        return "#95453555";
      case "inactive":
        return "#7A6A8A55";
      case "waiting":
        return "#FF751855";
      case "filling":
        return "#4C8EDA55";  
      case "theft":
        return "#FF751855"  
      case "expired":
        return document.body.classList.contains('dark')?"#88888855":"#65768655";
      default:
        return '#4B4B4D55';
    }
}

getBgColorForCan(status: string) {
  const isDark = this.isDarkMode();
  const value = status?.toLowerCase();

  const lightColors: Record<string, string> = {
    atrisk: '#FFFBEB',
    healthy: '#F0FDF4',
    critical: '#FEF2F2',
  };

  const darkColors: Record<string, string> = {
    atrisk: '#2B2610',
    healthy: '#121B14',
    critical: '#211313',
  };

  const colors = isDark ? darkColors : lightColors;

  return colors[value] ?? (isDark  ? '#121B14' : '#F3F4F6');
}

getTextColorForCan(status: string) {
  const isDark = this.isDarkMode();
  const value = status?.toLowerCase();

  const lightText: Record<string, string> = {
    atrisk: '#BB4D00',
    healthy: '#008236',
    critical: '#C10007',
  };

  const darkText: Record<string, string> = {
    atrisk: '#F28500',
    healthy: '#28A745',
    critical: '#C10007',
  };

  const colors = isDark ? darkText : lightText;

  return colors[value] ?? (isDark ? '#AAB8C1' : '#4B5563');
}

getBorderColorForCan(status: string) {
  const isDark = this.isDarkMode();
  const value = status?.toLowerCase();

  const lightBorder: Record<string, string> = {
    atrisk: '#FEE685',
    healthy: '#B9F8CF',
    critical: '#FFC9C9',
  };

  const darkBorder: Record<string, string> = {
    atrisk: '#B26609',
    healthy: '#257E39',
    critical: '#B6303D',
  };

  const colors = isDark ? darkBorder : lightBorder;

  return colors[value] ?? (isDark ? '#374151' : '#4B5563');
}



  hexToRgb(hex: string): string {
    hex = hex.replace(/^#/, ''); // Remove #
    let r = parseInt(hex.substring(0, 2), 16);
    let g = parseInt(hex.substring(2, 4), 16);
    let b = parseInt(hex.substring(4, 6), 16);
    return `${r}, ${g}, ${b}`; // Return RGB values without alpha
  }

  getColorAsHexFromStatus(status: string) {
    return this.hexToRgb(this.getColorForStatus(status));
  }

  isDarkMode(): boolean {
    return document.body.classList.contains('dark');
  }
}
