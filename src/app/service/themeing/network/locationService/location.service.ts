import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, shareReplay } from 'rxjs';
import { ServerUrl } from '../../../../environments/environment';
// import { ServerUrl } from '../../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class LocationService {

  locationCache = new Map<string, Observable<any>>();

  constructor(private http: HttpClient) { }

  getLocation(latlng: string): Observable<any> {
    if (!this.locationCache.has(latlng)) {
      const [lat, lng] = latlng.split(',');
      if (latlng.split.length > 2) {
        throw "not a latlng";
      }
      const obs$ = this.http.get(
        `${ServerUrl.live}/fleettracking/login/company/latlngtoaddress/${lat}/${lng}/${localStorage.getItem('companyId')}`, { responseType: 'text' }
      )
        .pipe(
          shareReplay(1)
        );

      this.locationCache.set(latlng, obs$);
    }
    return this.locationCache.get(latlng)!;
  }
}
