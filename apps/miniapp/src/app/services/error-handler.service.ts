import { Injectable, inject } from '@angular/core';
import { Observable, throwError, timer } from 'rxjs';
import { catchError, retryWhen, mergeMap, take, finalize } from 'rxjs/operators';
import { TelegramService } from './telegram.service';

/**
 * Error handler service for API calls.
 * Wraps RxJS errors with user-friendly Telegram alerts, retry logic, and offline detection.
 */
@Injectable({
  providedIn: 'root',
})
export class ErrorHandlerService {
  private readonly telegram = inject(TelegramService);
  private readonly maxRetries = 3;
  private readonly baseDelay = 1000; // 1 second

  /**
   * Check if error is a network error (offline or connection issue)
   */
  private isNetworkError(error: any): boolean {
    if (!navigator.onLine) {
      return true;
    }
    // HTTP errors that indicate network issues
    if (error?.status === 0 || error?.status === 408 || error?.status >= 500) {
      return true;
    }
    // Connection errors
    if (error?.message?.includes('NetworkError') || error?.message?.includes('Failed to fetch')) {
      return true;
    }
    return false;
  }

  /**
   * Check if error is retryable (network errors, 5xx server errors, 408 timeout)
   */
  private isRetryableError(error: any): boolean {
    if (this.isNetworkError(error)) {
      return true;
    }
    // Retry on server errors and timeouts
    const status = error?.status;
    return status === 408 || (status >= 500 && status < 600);
  }

  /**
   * Get user-friendly error message
   */
  private getErrorMessage(error: any, defaultMessage: string): string {
    if (!navigator.onLine) {
      return 'Нет подключения к интернету. Проверьте соединение.';
    }

    if (this.isNetworkError(error)) {
      return 'Проблема с подключением. Попробуйте позже.';
    }

    const status = error?.status;
    if (status === 401 || status === 403) {
      return 'Ошибка авторизации. Обновите страницу.';
    }
    if (status === 404) {
      return 'Запрашиваемый ресурс не найден.';
    }
    if (status === 429) {
      return 'Слишком много запросов. Подождите немного.';
    }

    return error?.message || error?.error?.message || defaultMessage;
  }

  /**
   * Handle API error with retry logic and show Telegram alert
   */
  handle(error: any, defaultMessage: string = 'Ошибка при выполнении операции') {
    console.error('API error:', error);

    const message = this.getErrorMessage(error, defaultMessage);

    // Only show alert for non-retryable errors or after all retries failed
    // Retryable errors will be handled by retry logic
    if (!this.isRetryableError(error)) {
      this.telegram.showAlert(message);
    }

    return throwError(() => new Error(message));
  }

  /**
   * Create a catchError operator with retry logic for use in Observable chains
   */
  createCatchError(defaultMessage: string = 'Ошибка при выполнении операции') {
    return (error: any) => {
      if (this.isRetryableError(error)) {
        // Retry logic will be applied by the retryWhen operator
        return throwError(() => error);
      }
      return this.handle(error, defaultMessage);
    };
  }

  /**
   * Create retry operator with exponential backoff
   */
  createRetryOperator(maxRetries: number = this.maxRetries) {
    return retryWhen((errors: Observable<any>) =>
      errors.pipe(
        mergeMap((error, index) => {
          const retryAttempt = index + 1;

          // Don't retry if not a retryable error or max retries reached
          if (!this.isRetryableError(error) || retryAttempt > maxRetries) {
            return throwError(() => error);
          }

          // Calculate delay with exponential backoff: baseDelay * 2^retryAttempt
          const delay = this.baseDelay * Math.pow(2, retryAttempt - 1);

          console.log(`Retrying request (attempt ${retryAttempt}/${maxRetries}) after ${delay}ms`);

          return timer(delay);
        }),
        take(maxRetries + 1),
      ),
    );
  }

  /**
   * Create a complete error handler with retry logic
   * Use this for critical operations that should be retried
   */
  createCatchErrorWithRetry(
    defaultMessage: string = 'Ошибка при выполнении операции',
    maxRetries: number = this.maxRetries,
  ) {
    return (error: any) => {
      // If it's a retryable error, let retry logic handle it
      if (this.isRetryableError(error)) {
        return throwError(() => error);
      }
      // Otherwise, handle immediately
      return this.handle(error, defaultMessage);
    };
  }

  /**
   * Check if device is online
   */
  isOnline(): boolean {
    return navigator.onLine;
  }

  /**
   * Show offline message
   */
  showOfflineMessage() {
    this.telegram.showAlert('Нет подключения к интернету. Проверьте соединение.');
  }
}
