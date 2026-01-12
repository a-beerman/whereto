/**
 * Mock Telegram WebApp SDK for local development and testing
 *
 * Usage: Add ?mock=true or ?simulate=true to the URL to enable mock mode
 * Example: http://localhost:4200?mock=true&api=http://localhost:3000
 *
 * This provides a mock implementation of the Telegram WebApp API
 * that allows testing the miniapp in a regular browser without Telegram.
 */

(function () {
  'use strict';

  // Check if we should enable mock mode
  const urlParams = new URLSearchParams(window.location.search);
  const shouldMock = urlParams.has('mock') || urlParams.has('simulate') || urlParams.has('dev');

  if (!shouldMock) {
    return; // Don't override if not in mock mode
  }

  // Generate mock init data
  const mockUserId = parseInt(urlParams.get('userId') || '123456789', 10);
  const mockChatId = urlParams.get('chatId') || null;
  const mockFirstName = urlParams.get('firstName') || 'Test';
  const mockLastName = urlParams.get('lastName') || 'User';
  const mockUsername = urlParams.get('username') || 'testuser';

  // Create mock init data string (simplified version)
  const mockInitData = new URLSearchParams({
    user: JSON.stringify({
      id: mockUserId,
      first_name: mockFirstName,
      last_name: mockLastName,
      username: mockUsername,
      language_code: 'en',
      is_premium: false,
      photo_url: null,
    }),
    auth_date: Math.floor(Date.now() / 1000).toString(),
    hash: 'mock_hash_for_development',
  }).toString();

  // Mock user object
  const mockUser = {
    id: mockUserId,
    first_name: mockFirstName,
    last_name: mockLastName,
    username: mockUsername,
    language_code: 'en',
    is_premium: false,
    photo_url: null,
  };

  // Mock chat object (if chatId provided)
  const mockChat = mockChatId
    ? {
        id: parseInt(mockChatId, 10),
        type: 'group',
        title: 'Test Group',
      }
    : null;

  // Mock initDataUnsafe object
  const mockInitDataUnsafe = {
    user: mockUser,
    chat: mockChat,
    start_param: urlParams.get('startParam') || null,
    auth_date: Math.floor(Date.now() / 1000),
    hash: 'mock_hash_for_development',
  };

  // Mock theme params
  const mockThemeParams = {
    bg_color: '#ffffff',
    text_color: '#000000',
    hint_color: '#999999',
    link_color: '#2481cc',
    button_color: '#2481cc',
    button_text_color: '#ffffff',
    secondary_bg_color: '#f1f1f1',
  };

  // Mock MainButton
  const createMockMainButton = () => {
    let text = 'Continue';
    let isVisible = false;
    let isActive = true;
    let isProgressVisible = false;
    let onClickCallback = null;

    return {
      text: text,
      color: mockThemeParams.button_color,
      textColor: mockThemeParams.button_text_color,
      isVisible: isVisible,
      isActive: isActive,
      isProgressVisible: isProgressVisible,
      setText: function (newText) {
        text = newText;
        this.text = newText;
        console.log('[Mock Telegram] MainButton text set to:', newText);
      },
      onClick: function (callback) {
        onClickCallback = callback;
        console.log('[Mock Telegram] MainButton onClick handler set');
      },
      offClick: function (callback) {
        if (onClickCallback === callback) {
          onClickCallback = null;
        }
      },
      show: function () {
        isVisible = true;
        this.isVisible = true;
        console.log('[Mock Telegram] MainButton shown');
        this._render();
      },
      hide: function () {
        isVisible = false;
        this.isVisible = false;
        console.log('[Mock Telegram] MainButton hidden');
        this._render();
      },
      enable: function () {
        isActive = true;
        this.isActive = true;
        console.log('[Mock Telegram] MainButton enabled');
        this._render();
      },
      disable: function () {
        isActive = false;
        this.isActive = false;
        console.log('[Mock Telegram] MainButton disabled');
        this._render();
      },
      showProgress: function (leaveActive) {
        isProgressVisible = true;
        this.isProgressVisible = true;
        console.log('[Mock Telegram] MainButton progress shown');
        this._render();
      },
      hideProgress: function () {
        isProgressVisible = false;
        this.isProgressVisible = false;
        console.log('[Mock Telegram] MainButton progress hidden');
        this._render();
      },
      _render: function () {
        // Create or update a visual button in the page
        let button = document.getElementById('mock-telegram-main-button');
        if (!button) {
          button = document.createElement('button');
          button.id = 'mock-telegram-main-button';
          button.style.cssText = `
            position: fixed;
            bottom: 0;
            left: 0;
            right: 0;
            width: 100%;
            padding: 12px 16px;
            background: ${this.color};
            color: ${this.textColor};
            border: none;
            font-size: 16px;
            font-weight: 500;
            z-index: 10000;
            cursor: ${this.isActive ? 'pointer' : 'not-allowed'};
            opacity: ${this.isActive ? '1' : '0.6'};
            display: ${this.isVisible ? 'block' : 'none'};
          `;
          document.body.appendChild(button);
        }
        button.textContent = this.text;
        button.style.display = this.isVisible ? 'block' : 'none';
        button.style.opacity = this.isActive ? '1' : '0.6';
        button.style.cursor = this.isActive ? 'pointer' : 'not-allowed';
        button.onclick = (e) => {
          e.preventDefault();
          if (this.isActive && onClickCallback) {
            onClickCallback();
          }
        };
      },
    };
  };

  // Mock BackButton
  const createMockBackButton = () => {
    let isVisible = false;
    let onClickCallback = null;

    return {
      isVisible: isVisible,
      onClick: function (callback) {
        onClickCallback = callback;
        console.log('[Mock Telegram] BackButton onClick handler set');
      },
      offClick: function (callback) {
        if (onClickCallback === callback) {
          onClickCallback = null;
        }
      },
      show: function () {
        isVisible = true;
        this.isVisible = true;
        console.log('[Mock Telegram] BackButton shown');
        this._render();
      },
      hide: function () {
        isVisible = false;
        this.isVisible = false;
        console.log('[Mock Telegram] BackButton hidden');
        this._render();
      },
      _render: function () {
        // Create or update a visual back button
        let button = document.getElementById('mock-telegram-back-button');
        if (!button) {
          button = document.createElement('button');
          button.id = 'mock-telegram-back-button';
          button.innerHTML = '← Back';
          button.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            padding: 12px 16px;
            background: ${mockThemeParams.bg_color};
            color: ${mockThemeParams.text_color};
            border: none;
            font-size: 16px;
            z-index: 10000;
            cursor: pointer;
            display: ${this.isVisible ? 'block' : 'none'};
          `;
          document.body.appendChild(button);
        }
        button.style.display = this.isVisible ? 'block' : 'none';
        button.onclick = (e) => {
          e.preventDefault();
          if (onClickCallback) {
            onClickCallback();
          }
        };
      },
    };
  };

  // Mock HapticFeedback
  const createMockHapticFeedback = () => {
    return {
      impactOccurred: function (style) {
        console.log('[Mock Telegram] HapticFeedback.impactOccurred:', style);
        // Could trigger browser vibration API if available
        if (navigator.vibrate) {
          const duration = style === 'light' ? 10 : style === 'medium' ? 20 : 30;
          navigator.vibrate(duration);
        }
      },
      notificationOccurred: function (type) {
        console.log('[Mock Telegram] HapticFeedback.notificationOccurred:', type);
        if (navigator.vibrate) {
          const duration = type === 'error' ? 50 : type === 'success' ? 30 : 20;
          navigator.vibrate(duration);
        }
      },
      selectionChanged: function () {
        console.log('[Mock Telegram] HapticFeedback.selectionChanged');
        if (navigator.vibrate) {
          navigator.vibrate(10);
        }
      },
    };
  };

  // Create mock WebApp object
  const mockWebApp = {
    initData: mockInitData,
    initDataUnsafe: mockInitDataUnsafe,
    version: '6.0',
    platform: 'web',
    colorScheme: 'light',
    themeParams: mockThemeParams,
    isExpanded: true,
    viewportHeight: window.innerHeight,
    viewportStableHeight: window.innerHeight,
    headerColor: mockThemeParams.bg_color,
    backgroundColor: mockThemeParams.bg_color,
    isClosingConfirmationEnabled: false,
    BackButton: createMockBackButton(),
    MainButton: createMockMainButton(),
    HapticFeedback: createMockHapticFeedback(),
    CloudStorage: {},
    BiometricManager: {},

    // Methods
    ready: function () {
      console.log('[Mock Telegram] WebApp.ready() called');
      this.isExpanded = true;
    },
    expand: function () {
      console.log('[Mock Telegram] WebApp.expand() called');
      this.isExpanded = true;
    },
    close: function () {
      console.log('[Mock Telegram] WebApp.close() called');
      alert(
        'In real Telegram, this would close the miniapp. In mock mode, we just show this alert.',
      );
    },
    sendData: function (data) {
      console.log('[Mock Telegram] WebApp.sendData() called with:', data);
      alert('Data sent to bot (mock): ' + data);
    },
    openLink: function (url, options) {
      console.log('[Mock Telegram] WebApp.openLink() called with:', url, options);
      window.open(url, '_blank');
    },
    openTelegramLink: function (url) {
      console.log('[Mock Telegram] WebApp.openTelegramLink() called with:', url);
      alert('In real Telegram, this would open: ' + url);
    },
    openInvoice: function (url, callback) {
      console.log('[Mock Telegram] WebApp.openInvoice() called with:', url);
      if (callback) {
        callback({ status: 'paid' });
      }
    },
    showPopup: function (params, callback) {
      console.log('[Mock Telegram] WebApp.showPopup() called with:', params);
      const result = confirm(params.message || 'Confirm?');
      if (callback) {
        callback(result);
      }
    },
    showAlert: function (message, callback) {
      console.log('[Mock Telegram] WebApp.showAlert() called with:', message);
      alert(message);
      if (callback) {
        callback();
      }
    },
    showConfirm: function (message, callback) {
      console.log('[Mock Telegram] WebApp.showConfirm() called with:', message);
      const result = confirm(message);
      if (callback) {
        callback(result);
      }
    },
    showScanQrPopup: function (params, callback) {
      console.log('[Mock Telegram] WebApp.showScanQrPopup() called');
      alert('QR code scanner (mock mode)');
      if (callback) {
        callback({ data: 'mock_qr_data' });
      }
    },
    closeScanQrPopup: function (callback) {
      console.log('[Mock Telegram] WebApp.closeScanQrPopup() called');
      if (callback) {
        callback();
      }
    },
    readTextFromClipboard: function (callback) {
      console.log('[Mock Telegram] WebApp.readTextFromClipboard() called');
      navigator.clipboard
        .readText()
        .then((text) => {
          if (callback) {
            callback(text);
          }
        })
        .catch(() => {
          if (callback) {
            callback('');
          }
        });
    },
    requestWriteAccess: function (callback) {
      console.log('[Mock Telegram] WebApp.requestWriteAccess() called');
      if (callback) {
        callback(true);
      }
    },
    requestContact: function (callback) {
      console.log('[Mock Telegram] WebApp.requestContact() called');
      if (callback) {
        callback({
          contact: {
            phone_number: '+1234567890',
            first_name: 'Test',
            last_name: 'Contact',
          },
        });
      }
    },
    setHeaderColor: function (color) {
      console.log('[Mock Telegram] WebApp.setHeaderColor() called with:', color);
      this.headerColor = color;
    },
    setBackgroundColor: function (color) {
      console.log('[Mock Telegram] WebApp.setBackgroundColor() called with:', color);
      this.backgroundColor = color;
      document.body.style.backgroundColor = color;
    },
    enableClosingConfirmation: function () {
      console.log('[Mock Telegram] WebApp.enableClosingConfirmation() called');
      this.isClosingConfirmationEnabled = true;
    },
    disableClosingConfirmation: function () {
      console.log('[Mock Telegram] WebApp.disableClosingConfirmation() called');
      this.isClosingConfirmationEnabled = false;
    },
    onEvent: function (eventType, eventHandler) {
      console.log('[Mock Telegram] WebApp.onEvent() called for:', eventType);
    },
    offEvent: function (eventType, eventHandler) {
      console.log('[Mock Telegram] WebApp.offEvent() called for:', eventType);
    },
  };

  // Override window.Telegram.WebApp if it exists, or create it
  if (!window.Telegram) {
    window.Telegram = {};
  }
  window.Telegram.WebApp = mockWebApp;

  // Also make it available as window.tg for compatibility
  window.tg = mockWebApp;

  // Add a visual indicator that we're in mock mode
  const indicator = document.createElement('div');
  indicator.id = 'mock-telegram-indicator';
  indicator.textContent = '🔧 Mock Telegram Mode';
  indicator.style.cssText = `
    position: fixed;
    top: 0;
    right: 0;
    background: #ff9800;
    color: white;
    padding: 4px 8px;
    font-size: 12px;
    z-index: 9999;
    border-bottom-left-radius: 4px;
    font-family: monospace;
  `;
  document.body.appendChild(indicator);

  console.log('[Mock Telegram] Mock Telegram WebApp SDK initialized');
  console.log('[Mock Telegram] User:', mockUser);
  console.log('[Mock Telegram] Init Data:', mockInitData);
  console.log('[Mock Telegram] Add ?mock=false to disable mock mode');
})();
