import { Injectable } from '@angular/core';
import WebApp from '@twa-dev/sdk';

@Injectable({
  providedIn: 'root',
})
export class TelegramService {
  private tg = WebApp;

  constructor() {
    // Initialize Telegram WebApp
    this.tg.ready();
    this.tg.expand();

    // Set header color to match theme
    this.tg.setHeaderColor('bg_color');
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
    return this.tg.initDataUnsafe?.user;
  }

  /**
   * Get chat ID if opened from a group
   */
  getChatId(): string | undefined {
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
    this.tg.showAlert(message);
  }

  /**
   * Show popup confirmation
   */
  showConfirm(message: string, callback: (confirmed: boolean) => void) {
    this.tg.showConfirm(message, callback);
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
    return this.tg.initData;
  }

  /**
   * Check if app is running in Telegram
   */
  isInTelegram(): boolean {
    return this.tg.initData !== '';
  }
}
