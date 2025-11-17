// import { Injectable } from '@angular/core';
// import { get, set } from './storage.service';

// @Injectable({
//     providedIn: 'root',
// })
// export class SettingsService {
//     settings = {
//         hiddenAccess: false,
//         randomId: true,
//         passwordHash: '',
//     };

//     language: { text: string; code: string } = {
//         text: 'English',
//         code: 'en',
//     };

//     constructor() {}

//     async load() {
//         console.log('[SETTINGS] Loading settings...');
//         const settings: any = await get('settings');
//         if (settings) {
//             Object.assign(this.settings, settings);
//             console.log('[SETTINGS] Loaded:', this.settings);
//         } else {
//             console.log('[SETTINGS] No saved settings, using defaults');
//         }
//     }

//     async saveSettings(settings) {
//         console.log('[SETTINGS] Saving settings:', settings);
//         Object.assign(this.settings, settings);
//         await set('settings', this.settings);
//         console.log('[SETTINGS] Settings saved successfully');
//     }
// }





import { Injectable } from '@angular/core';
import { get, set } from './storage.service';
import { encrypt, decrypt } from './storage.service';

@Injectable({
    providedIn: 'root',
})
export class SettingsService {
    settings = {
        hiddenAccess: false,
        randomId: false,
        passwordHash: '',
        savedPassword: '' // NEW FIELD (encrypted plain password)
    };

    language: { text: string; code: string } = {
        text: 'English',
        code: 'en',
    };

    constructor() {}

    // -----------------------------------------
    // LOAD SETTINGS
    // -----------------------------------------
    async load() {
        console.log('[SETTINGS] Loading settings...');
        const settings: any = await get('settings');

        if (settings) {
            Object.assign(this.settings, settings);
            console.log('[SETTINGS] Loaded:', this.settings);
        } else {
            console.log('[SETTINGS] No saved settings, using defaults');
        }
    }

    // -----------------------------------------
    // SAVE GENERAL SETTINGS
    // -----------------------------------------
    async saveSettings(settings) {
        console.log('[SETTINGS] Saving settings:', settings);
        Object.assign(this.settings, settings);
        await set('settings', this.settings);
        console.log('[SETTINGS] Settings saved successfully');
    }

    // -----------------------------------------
    // SAVE PLAIN PASSWORD ENCRYPTED
    // -----------------------------------------
    async setPlainPassword(pw: string) {
        const encrypted = encrypt(pw);
        this.settings.savedPassword = encrypted;
        await set('settings', this.settings);
    }

    // -----------------------------------------
    // GET PLAIN PASSWORD (DECRYPTED)
    // -----------------------------------------
    async getPlainPassword(): Promise<string> {
        const settings: any = await get('settings');
        if (!settings?.savedPassword) return '';
        try {
            return decrypt(settings.savedPassword);
        } catch (err) {
            console.error('Password decrypt error:', err);
            return '';
        }
    }

    // -----------------------------------------
    // CLIENT-SPECIFIC PASSWORD SAVE
    // -----------------------------------------
    async saveClientPassword(clientId: string, pw: string) {
        let map = await get('client-passwords');
        if (!map) map = {};

        map[clientId] = encrypt(pw);

        await set('client-passwords', map);
    }

    // -----------------------------------------
    // CLIENT-SPECIFIC PASSWORD GET (AUTO-FILL)
    // -----------------------------------------
    async getClientPassword(clientId: string): Promise<string> {
        const map = await get('client-passwords');
        if (map && map[clientId]) {
            try {
                return decrypt(map[clientId]);
            } catch (err) {
                console.error('Client password decrypt failed:', err);
                return '';
            }
        }
        return '';
    }
}
