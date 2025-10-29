import { Injectable } from '@angular/core';
import { ElectronService } from './electron.service';
import { AppConfig } from '../../../environments/environment';

// Import nut-js directly
import { keyboard, Key, mouse, Button } from '@nut-tree-fork/nut-js';

declare var window: any;

@Injectable({
  providedIn: 'root',
})
export class ConnectHelperService {
  infoWindow: any;

  constructor(private electronService: ElectronService) {}

  // Scroll handler
  handleScroll(text: string) {
    try {
      const [, ud] = text.split(',');
      if (ud === 'up') mouse.scrollUp(50);
      else mouse.scrollDown(50);
    } catch (error) {
      console.error('Scroll error:', error);
    }
  }

  // Mouse handler
  handleMouse(text: string) {
    try {
      const [t, x, y, bStr] = text.split(',');
      const b = +bStr || 0;

      switch (t) {
        case 'md':
          mouse.pressButton(b as Button);
          break;
        case 'mu':
          mouse.releaseButton(b as Button);
          break;
        case 'mm':
          mouse.setPosition({ x: +x, y: +y });
          break;
        case 'dc':
          mouse.click(Button.LEFT);
          mouse.click(Button.LEFT);
          break;
      }
    } catch (error) {
      console.error('Mouse error:', error);
    }
  }

  threeDigit() {
    return Math.floor(Math.random() * (999 - 100 + 1) + 100);
  }

  // Keyboard handler
  /**
   * data: { key: string; shift?: boolean; control?: boolean; alt?: boolean; meta?: boolean; code?: string }
   */
  async handleKey(data: { key?: string; shift?: boolean; control?: boolean; alt?: boolean; meta?: boolean; code?: string }) {
    try {
      if (!this.electronService.isElectron) {
        console.log('Not running in electron - keyboard input ignored.', data);
        return;
      }

      // Determine platform safely (electron process or navigator)
      const rawPlatform = (window as any)?.process?.platform ?? (navigator?.platform ?? '').toString();
      const platformStr = String(rawPlatform).toLowerCase();
      const isMac = platformStr.includes('darwin') || platformStr.includes('mac');

      const modifiers: Key[] = [];
      if (data.shift) modifiers.push(Key.LeftShift);
      if (data.control) modifiers.push(isMac ? Key.LeftControl : Key.LeftControl); // control mapped to LeftControl (on mac control exists too)
      if (data.alt) modifiers.push(Key.LeftAlt);
      if (data.meta) modifiers.push(Key.LeftSuper);

      // Helper to get a reversed copy without mutating original
      const reversedModifiers = [...modifiers].reverse();

      // If single printable character -> type it (with modifiers pressed)
      if (data.key && data.key.length === 1) {
        if (modifiers.length > 0) {
          for (const m of modifiers) await keyboard.pressKey(m);
          await keyboard.type(data.key);
          for (const m of reversedModifiers) await keyboard.releaseKey(m);
        } else {
          await keyboard.type(data.key);
        }
        return;
      }

      // For special keys, try to map using code or key if possible
      const keyName = data.code || data.key || '';
      let keyToPress: Key | null = null;

      // Try multiple strategies to look up enum value
      try {
        // direct lookup (if code matches enum member name)
        keyToPress = (Key as any)[keyName] ?? null;
        if (!keyToPress && data.key) {
          // try with the human-readable key name as fallback
          keyToPress = (Key as any)[data.key] ?? null;
        }
      } catch (e) {
        keyToPress = null;
      }

      if (keyToPress) {
        if (modifiers.length > 0) {
          for (const m of modifiers) await keyboard.pressKey(m);
          await keyboard.pressKey(keyToPress);
          await keyboard.releaseKey(keyToPress);
          for (const m of reversedModifiers) await keyboard.releaseKey(m);
        } else {
          await keyboard.pressKey(keyToPress);
          await keyboard.releaseKey(keyToPress);
        }
      } else {
        // if we couldn't map to a Key, fall back to typing the key string (if present)
        if (data.key) {
          if (modifiers.length > 0) {
            for (const m of modifiers) await keyboard.pressKey(m);
            await keyboard.type(data.key);
            for (const m of reversedModifiers) await keyboard.releaseKey(m);
          } else {
            await keyboard.type(data.key);
          }
        } else {
          console.warn('Unknown key to press and no fallback text:', data);
        }
      }
    } catch (error) {
      console.error('handleKey error:', error);
    }
  }

  // Info window
  closeInfoWindow() {
    try {
      this.infoWindow?.close();
    } catch {}
  }

  showInfoWindow() {
    if (!this.electronService.isElectron) {
      window.open('http://localhost:4200/#/info-window', '_blank');
      return;
    }

    const appPath = this.electronService.remote.app.getAppPath();

    try {
      const BrowserWindow = this.electronService.remote.BrowserWindow;
      this.infoWindow = new BrowserWindow({
        height: 50,
        width: 50,
        x: 0,
        y: 100,
        resizable: false,
        show: false,
        frame: false,
        transparent: true,
        backgroundColor: '#252a33',
        webPreferences: {
          webSecurity: false,
          nodeIntegration: true,
          allowRunningInsecureContent: true,
          contextIsolation: false,
          enableRemoteModule: true,
        } as any,
      });

      this.electronService.remote
        .require('@electron/remote/main')
        .enable(this.infoWindow.webContents);

      this.infoWindow.setAlwaysOnTop(true, 'status');

      if (AppConfig.production) {
        const url = this.electronService.path.join(appPath, 'dist/index.html');
        this.infoWindow.loadURL(`file://${url}#/info-window`);
      } else {
        this.infoWindow.loadURL('http://localhost:4200/#/info-window');
      }

      this.infoWindow.show();
    } catch (error) {
      console.error('Error opening info window', error);
    }
  }
}
