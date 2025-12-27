import { Injectable } from '@angular/core';
import WebApp from '@twa-dev/sdk';

@Injectable({
  providedIn: 'root',
})
export class TelegramService {
  private tg = WebApp;
  private readonly isMockMode: boolean;
  private readonly mockUser: any | null;
  private readonly mockChatId: string | undefined;
  private readonly mockInitData: string | undefined;

  constructor() {
    // Initialize Telegram WebApp
    this.tg.ready();
    this.tg.expand();

    // Set header color to match theme
    this.tg.setHeaderColor('bg_color');

    // Mock mode detection via query params for browser debugging
    const url = new URL(window.location.href);
    this.isMockMode = (url.searchParams.get('mock') || '').toLowerCase() === 'true';
    if (this.isMockMode) {
      // Optional overrides via query params
      const userIdParam = url.searchParams.get('userId') || '123456';
      const firstName = url.searchParams.get('firstName') || 'Dev';
      const lastName = url.searchParams.get('lastName') || 'User';
      const username = url.searchParams.get('username') || 'dev_user';
      this.mockChatId = url.searchParams.get('chatId') || '999999';
      this.mockInitData = url.searchParams.get('initData') || 'mock-init-data';

      this.mockUser = {
        id: Number(userIdParam),
        first_name: firstName,
        last_name: lastName,
        username,
        language_code: 'en',
        is_premium: false,
      };
    } else {
      this.mockUser = null;
    }
  }

  /**
   * Get Telegram WebApp instance
   */
  getWebApp() {
    return this.tg;
  }

  /**
   * Get current user info
   */
  getUserInfo() {
    if (this.isMockMode) return this.mockUser;
    return this.tg.initDataUnsafe?.user;
  }

  /**
   * Get chat ID if opened from a group
   */
  getChatId(): string | undefined {
    if (this.isMockMode) return this.mockChatId;
    return this.tg.initDataUnsafe?.chat?.id?.toString();
  }

  /**
   * Get start parameter (for deep linking)
   */
  getStartParam(): string | undefined {
    return this.tg.initDataUnsafe?.start_param;
  }

  /**
   * Show main button
   */
  showMainButton(text: string, onClick: () => void) {
    this.tg.MainButton.setText(text);
    this.tg.MainButton.show();
    this.tg.MainButton.onClick(onClick);
  }

  /**
   * Hide main button
   */
  hideMainButton() {
    this.tg.MainButton.hide();
  }

  /**
   * Enable main button
   */
  enableMainButton() {
    this.tg.MainButton.enable();
  }

  /**
   * Disable main button
   */
  disableMainButton() {
    this.tg.MainButton.disable();
  }

  /**
   * Show back button
   */
  showBackButton(onClick: () => void) {
    this.tg.BackButton.show();
    this.tg.BackButton.onClick(onClick);
  }

  /**
   * Hide back button
   */
  hideBackButton() {
    this.tg.BackButton.hide();
  }

  /**
   * Close the mini app
   */
  close() {
    this.tg.close();
  }

  /**
   * Show popup alert
   */
  showAlert(message: string) {
    // In Telegram, prefer native alert; otherwise fallback to browser alert
    try {
      if (this.isInTelegram()) {
        this.tg.showAlert(message);
      } else {
        window.alert(message);
      }
    } catch (e) {
      // Fallback when method unsupported (older Telegram versions)
      window.alert(message);
    }
  }

  /**
   * Show popup confirmation
   */
  showConfirm(message: string, callback: (confirmed: boolean) => void) {
    try {
      if (this.isInTelegram()) {
        this.tg.showConfirm(message, callback);
      } else {
        const result = window.confirm(message);
        callback(result);
      }
    } catch (e) {
      const result = window.confirm(message);
      callback(result);
    }
  }

  /**
   * Send data back to bot
   */
  sendData(data: string) {
    this.tg.sendData(data);
  }

  /**
   * Get theme parameters
   */
  getThemeParams() {
    return this.tg.themeParams;
  }

  /**
   * Get init data (for API authentication)
   */
  getInitData(): string {
    if (this.isMockMode) return this.mockInitData || '';
    return this.tg.initData;
  }

  /**
   * Check if app is running in Telegram
   */
  isInTelegram(): boolean {
    return this.isMockMode || this.tg.initData !== '';
  }

  /**
   * Check if running in dev mock mode
   */
  isMock(): boolean {
    return this.isMockMode;
  }

  /**
   * Trigger haptic feedback
   * @param type - 'impact', 'notification', or 'selection'
   * @param style - 'light', 'medium', 'heavy', 'rigid', or 'soft' (for impact)
   */
  hapticFeedback(
    type: 'impact' | 'notification' | 'selection' = 'impact',
    style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft' = 'medium',
  ) {
    if (this.tg.HapticFeedback) {
      if (type === 'impact') {
        this.tg.HapticFeedback.impactOccurred(style);
      } else if (type === 'notification') {
        this.tg.HapticFeedback.notificationOccurred(
          style === 'light' ? 'error' : style === 'heavy' ? 'success' : 'warning',
        );
      } else if (type === 'selection') {
        this.tg.HapticFeedback.selectionChanged();
      }
    }
  }
}
