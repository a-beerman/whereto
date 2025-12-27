import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors, HTTP_INTERCEPTORS } from '@angular/common/http';
import { provideApi } from '@whereto/shared/api-client-angular';
import { TelegramAuthInterceptor } from './interceptors/telegram-auth.interceptor';
import { appRoutes } from './app.routes';
import { environment } from '../environments/environment';

function getApiBaseFromQuery(defaultUrl: string): string {
  try {
    const url = new URL(window.location.href);
    const apiParam = url.searchParams.get('api');
    if (apiParam && /^https?:\/\//.test(apiParam)) {
      return apiParam;
    }
  } catch {}
  return defaultUrl;
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(appRoutes),
    provideHttpClient(),
    {
      provide: HTTP_INTERCEPTORS,
      useClass: TelegramAuthInterceptor,
      multi: true,
    },
    provideApi(getApiBaseFromQuery(environment.apiUrl)),
  ],
};
