import { Injectable } from '@angular/core';
import { get, set } from './storage.service';

@Injectable({
    providedIn: 'root',
})
export class SettingsService {
    settings = {
        hiddenAccess: false,
        randomId: false,
        passwordHash: '',
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
}