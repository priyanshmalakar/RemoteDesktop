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

@Injectable({
    providedIn: 'root',
})
export class SettingsService {
    settings = {
        hiddenAccess: false,
        randomId: true,
        passwordHash: '',
        rememberedPassword: '', // ✅ added for auto-fill
    };

    language: { text: string; code: string } = {
        text: 'English',
        code: 'en',
    };

    constructor() {}

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

    async saveSettings(settings) {
        console.log('[SETTINGS] Saving settings:', settings);
        Object.assign(this.settings, settings);
        await set('settings', this.settings);
        console.log('[SETTINGS] Settings saved successfully');
    }

    // ✅ Save password for auto-fill
    async rememberPassword(pw: string) {
        try {
            this.settings.rememberedPassword = pw; // plain text for auto-fill
            await set('settings', this.settings);
            console.log('[SETTINGS] Password remembered for auto-fill');
        } catch (err) {
            console.error('Error remembering password', err);
        }
    }

    // ✅ Get saved password
    async getRememberedPassword() {
        return this.settings.rememberedPassword || '';
    }
}
