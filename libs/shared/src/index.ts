// Shared library exports
export * from './constants/mvp-settings';
export * from './constants/copy';
export * from './constants/events';
export * from './i18n';

// API Clients
// Note: Only export axios client here to avoid pulling Angular dependencies into Node.js apps
// Angular apps should import directly from './api-client-angular'
export * from './api-client-axios';
