 import { Injectable } from '@angular/core';
  import { Observable, catchError, lastValueFrom, map, throwError } from 'rxjs';
  import {
    HttpClient,
    HttpHeaders,
    HttpErrorResponse,
    HttpEventType,
    HttpContextToken,
    HttpContext,
  } from '@angular/common/http';
import { ServerUrl } from '../../../environments/environment';
// import { ServerUrl } from '../../../environments/environment';


  const httpOptionsWithHTML = {
    headers: new HttpHeaders({
      Authorization: 'Basic YWRtaW46YWRtaW4=',
      'Content-Type': 'multipart/form-data;',
    }),
    // withCredentials: true
  };

  export const SKIP_INTERCEPTOR=new HttpContextToken(()=>false);

  @Injectable({
    providedIn: 'root',
  })
  export class AjaxService {
    constructor(private http: HttpClient) { }
    private extractStringData(res: any) {
      const body = res;
      return body || '';
    }

    handleError = (error: HttpErrorResponse) => {
      if (error.error instanceof ErrorEvent) {
        // A client-side or network error occurred. Handle it accordingly.
        console.error('An error occurred:', error.error.message);
      } else {
        // The backend returned an unsuccessful response code.
        // The response body may contain clues as to what went wrong,
        console.error(
          `Backend returned code ${error.status}, ` + `body was: ${JSON.stringify(error.error)}`
        );
      }
      return throwError(() => error);
    };

    toast = (error: HttpErrorResponse) => this.handleError(error);

    ajaxget(url: string): Observable<any> {

      const httpOptionsWithJson = {
        headers: new HttpHeaders({
          Authorization: "Bearer " + localStorage.getItem("apiToken"),
          'Content-Type': 'application/json;charset=utf-8',
        }),
        // withCredentials: true
      };
      return this.http
        .get(url, httpOptionsWithJson)
        .pipe(map(this.extractStringData), catchError(this.toast));
    }
    ajaxgetWithoutToken(url: string): Observable<any> {
      const httpOptionsWithJson = {
        headers: new HttpHeaders({
          'Content-Type': 'application/json;charset=utf-8',
        }),
        context: new HttpContext().set(SKIP_INTERCEPTOR, true),
      };
      return this.http
        .get(url, httpOptionsWithJson)
        .pipe(map(this.extractStringData), catchError(this.toast));
    }

    ajaxgetWithBodyWithoutToken(url: string, body: any): Observable<any> {
      const httpOptionsWithJson = {
        headers: new HttpHeaders({
          'Content-Type': 'application/json;charset=utf-8',
        }),
        context: new HttpContext().set(SKIP_INTERCEPTOR, true),
      };

      return this.http
        .request('GET', url, {
          body,
          headers: httpOptionsWithJson.headers,
          context: httpOptionsWithJson.context,
        })
        .pipe(map(this.extractStringData), catchError(this.handleError));
    }

    ajaxgetWithBody(url: string, body: any): Observable<any> {
      const httpOptionsWithJson = {
        headers: new HttpHeaders({
          Authorization: "Bearer " + localStorage.getItem("apiToken"),
          'Content-Type': 'application/json;charset=utf-8',
        })
      };

      return this.http
        .request('GET', url, {
          body, // Send body with GET request (only if API supports it)
          headers: httpOptionsWithJson.headers,
        })
        .pipe(map(this.extractStringData), catchError(this.handleError));
    }

    ajaxdelete(url: string): Observable<any> {
      return this.http
        .delete(url)
        .pipe(map(this.extractStringData), catchError(this.toast));
    }
    ajaxDelete(url: string): Observable<any> {
    const httpOptionsWithJson = {
      headers: new HttpHeaders({
        Authorization: "Bearer " + localStorage.getItem("apiToken"),
        'Content-Type': 'application/json;charset=utf-8',
      }),
      // withCredentials: true // Uncomment if needed
    };

    return this.http
      .delete(url, httpOptionsWithJson)
      .pipe(map(this.extractStringData), catchError(this.toast));
  }

    ajaxDeleteWithoutToken(url: string): Observable<any> {
      const httpOptionsWithJson = {
        headers: new HttpHeaders({
          'Content-Type': 'application/json;charset=utf-8',
        }),
        context: new HttpContext().set(SKIP_INTERCEPTOR, true),
      };

      return this.http
        .delete(url, httpOptionsWithJson)
        .pipe(map(this.extractStringData), catchError(this.toast));
    }

    ajaxPostWithBody(url: string, data: any): Observable<any> {

      const httpOptionsWithJson = {
        headers: new HttpHeaders({
          Authorization: "Bearer " + localStorage.getItem("apiToken"),
          'Content-Type': 'application/json;charset=utf-8',
        }),
        // withCredentials: true
      };
      return this.http
        .post(url, JSON.stringify(data), httpOptionsWithJson)
        .pipe(map(this.extractStringData), catchError(this.handleError));
    }
    ajaxPostWithoutToken(url: string, data: any): Observable<any> {

  return this.http
    .post(url, JSON.stringify(data), {context:new HttpContext().set(SKIP_INTERCEPTOR,true)})
    .pipe(
      map(this.extractStringData),
      catchError(this.handleError)
    );
}

    ajaxPutWithBody(url: string, data: any): Observable<any> {

      const httpOptionsWithJson = {
        headers: new HttpHeaders({
          Authorization: "Bearer " + localStorage.getItem("apiToken"),
          'Content-Type': 'application/json;charset=utf-8',
        }),
      };
      return this.http
        .put(url, JSON.stringify(data), httpOptionsWithJson)
        .pipe(map(this.extractStringData), catchError(this.handleError));
    }

    ajaxPutWithoutToken(url: string, data: any): Observable<any> {

      const httpOptionsWithJson = {
        headers: new HttpHeaders({
          'Content-Type': 'application/json;charset=utf-8',
        }),
        context: new HttpContext().set(SKIP_INTERCEPTOR, true),
      };
      return this.http
        .put(url, JSON.stringify(data), httpOptionsWithJson)
        .pipe(map(this.extractStringData), catchError(this.handleError));
    }

    ajaxDeleteWithBody(url: string, body: any): Observable<any> {

      const httpOptionsWithJson = {
        headers: new HttpHeaders({
          Authorization: "Bearer " + localStorage.getItem("apiToken"),
          'Content-Type': 'application/json;charset=utf-8',
        }),
        // withCredentials: true
      };
      return this.http
        .request('DELETE', url, {
          body,
          headers: httpOptionsWithJson.headers, // Use the same headers as your `ajaxPostWithBody`
        })
        .pipe(map(this.extractStringData), catchError(this.handleError));
    }

    ajaxDeleteWithBodyWithoutToken(url: string, body: any): Observable<any> {

      const httpOptionsWithJson = {
        headers: new HttpHeaders({
          'Content-Type': 'application/json;charset=utf-8',
        }),
        context: new HttpContext().set(SKIP_INTERCEPTOR, true),
      };
      return this.http
        .request('DELETE', url, {
          body,
          headers: httpOptionsWithJson.headers,
          context: httpOptionsWithJson.context,
        })
        .pipe(map(this.extractStringData), catchError(this.handleError));
    }

    ajaxPostWithFile(url: string, data: any): Observable<any> {
      return this.http
        .post(url, data)
        .pipe(map(this.extractStringData), catchError(this.handleError));
    }
    ajaxPostWithFileWithoutToken(url: string, data: any): Observable<any> {
      return this.http
        .post(url, data, {context: new HttpContext().set(SKIP_INTERCEPTOR, true)})
        .pipe(map(this.extractStringData), catchError(this.handleError));
    }
    ajaxPostWithmultiFile(url: string, data: any, file: File | null): Observable<any> {
      const formData = new FormData();
      formData.append('data', JSON.stringify(data)); // Append JSON data as a string
      if (file != null) {
        formData.append('profileimage', file); // Append file
      }

      const httpOptions = {
        headers: new HttpHeaders({
          Authorization: "Bearer " + localStorage.getItem("apiToken"),
          // DO NOT set 'Content-Type' explicitly; Angular automatically sets it for FormData
        }),
      };

      return this.http
        .post(url, formData, httpOptions)
        .pipe(
          map(this.extractStringData),
          catchError(this.handleError)
        );
    }
    ajaxPostWithmultiFileWithoutToken(url: string, data: any, file: File | null): Observable<any> {
      const formData = new FormData();
      formData.append('data', JSON.stringify(data)); // Append JSON data as a string
      if (file != null) {
        formData.append('profileimage', file); // Append file
      }

      const httpOptions = {
        context: new HttpContext().set(SKIP_INTERCEPTOR, true),
      };

      return this.http
        .post(url, formData, httpOptions)
        .pipe(
          map(this.extractStringData),
          catchError(this.handleError)
        );
    }
    ajaxPostWithmultifile(url: string, data: any, file: File | null): Observable<any> {
      const formData = new FormData();
      formData.append('data', JSON.stringify(data)); // Append JSON data as a string
      if (file != null) {
        formData.append('uploadimage', file); // Append file
      }

      const httpOptions = {
        headers: new HttpHeaders({
          Authorization: "Bearer " + localStorage.getItem("apiToken"),
          // DO NOT set 'Content-Type' explicitly; Angular automatically sets it for FormData
        }),
      };

      return this.http
        .post(url, formData, httpOptions)
        .pipe(
          map(this.extractStringData),
          catchError(this.handleError)
        );
    }
    ajaxPostWithmultifileWithoutToken(url: string, data: any, file: File | null): Observable<any> {
      const formData = new FormData();
      formData.append('data', JSON.stringify(data)); // Append JSON data as a string
      if (file != null) {
        formData.append('uploadimage', file); // Append file
      }

      const httpOptions = {
        context: new HttpContext().set(SKIP_INTERCEPTOR, true),
      };

      return this.http
        .post(url, formData, httpOptions)
        .pipe(
          map(this.extractStringData),
          catchError(this.handleError)
        );
    }
    ajaxPostWithmultifilefortickets(url: string, data: any, file: File | null): Observable<any> {
      const formData = new FormData();
      formData.append('data', JSON.stringify(data)); // Append JSON data as a string
      if (file != null) {
        formData.append('attachfile', file); // Append file
      } else{
        formData.append('attachfile',"file name.jpg");
      }

      const httpOptions = {
        headers: new HttpHeaders({
          Authorization: "Bearer " + localStorage.getItem("apiToken"),
          // DO NOT set 'Content-Type' explicitly; Angular automatically sets it for FormData
        }),
      };

      return this.http
        .post(url, formData, httpOptions)
        .pipe(
          map(this.extractStringData),
          catchError(this.handleError)
        );
    }
    ajaxPostWithmultifileforticketsWithoutToken(url: string, data: any, file: File | null): Observable<any> {
      const formData = new FormData();
      formData.append('data', JSON.stringify(data)); // Append JSON data as a string
      if (file != null) {
        formData.append('attachfile', file); // Append file
      } else{
        formData.append('attachfile',"file name.jpg");
      }

      const httpOptions = {
        context: new HttpContext().set(SKIP_INTERCEPTOR, true),
      };

      return this.http
        .post(url, formData, httpOptions)
        .pipe(
          map(this.extractStringData),
          catchError(this.handleError)
        );
    }

    refreshToken(): Promise<string | null> {
      const url =`${ServerUrl.live}/fleettracking/login/refresh-token`;
      const body = {
        token: localStorage.getItem('refreshToken'),
        deviceid: localStorage.getItem('deviceId'),
        companyid: localStorage.getItem('companyId'),
        userid: localStorage.getItem('userId'),
      };

      return lastValueFrom(this.http.post<any>(url, body))
        .then(res => {
          if (res?.accessToken) {
            localStorage.setItem('apiToken', res.accessToken);
            return res.accessToken;
          }        
          return res.message??null;
        })
        .catch(err => {
          console.error('Token refresh failed:', err);
          return null;
        });
    }


  }
