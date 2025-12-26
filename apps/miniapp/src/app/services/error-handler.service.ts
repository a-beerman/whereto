import { Injectable, inject } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { TelegramService } from './telegram.service';

/**
 * Error handler service for API calls.
 * Wraps RxJS errors with user-friendly Telegram alerts.
 */
@Injectable({
  providedIn: 'root',
})
export class ErrorHandlerService {
  private readonly telegram = inject(TelegramService);

  /**
   * Handle API error and show Telegram alert
   */
  handle(error: any, defaultMessage: string = 'Ошибка при выполнении операции') {
    console.error('API error:', error);

    const message = error?.message || error?.error?.message || defaultMessage;
    this.telegram.showAlert(message);

    return throwError(() => new Error(message));
  }

  /**
   * Create a catchError operator for use in Observable chains
   */
  createCatchError(defaultMessage: string = 'Ошибка при выполнении операции') {
    return (error: any) => this.handle(error, defaultMessage);
  }
}
