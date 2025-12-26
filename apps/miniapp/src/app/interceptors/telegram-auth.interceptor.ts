import { Injectable, inject } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent } from '@angular/common/http';
import { Observable } from 'rxjs';
import { TelegramService } from '../services/telegram.service';

/**
 * HTTP Interceptor that injects Telegram authentication header globally.
 * Adds X-Telegram-Init-Data header to all outgoing HTTP requests.
 */
@Injectable()
export class TelegramAuthInterceptor implements HttpInterceptor {
  private readonly telegram = inject(TelegramService);

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    // Get Telegram init data from service
    const initData = this.telegram.getInitData();

    // Clone request and add Telegram header if init data exists
    if (initData) {
      req = req.clone({
        setHeaders: {
          'X-Telegram-Init-Data': initData,
        },
      });
    }

    return next.handle(req);
  }
}
