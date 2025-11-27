/* eslint-disable @typescript-eslint/await-thenable */
/* eslint-disable @typescript-eslint/no-inferrable-types */
import { Injectable } from '@angular/core';
import { AlertController, LoadingController } from '@ionic/angular';
import { Subscription } from 'rxjs';
import SimplePeer from 'simple-peer';
import SimplePeerFiles from 'simple-peer-files';
import * as url from 'url';
import { AppConfig } from '../../../environments/environment';
/* eslint-disable @typescript-eslint/restrict-template-expressions */
import { ConnectHelperService } from './connect-helper.service';
/* eslint-disable @typescript-eslint/restrict-plus-operands */
import { ElectronService } from './electron.service';
import { SettingsService } from './settings.service';
/* eslint-disable @typescript-eslint/no-misused-promises */
import { SocketService } from './socket.service';
import { TranslateService } from '@ngx-translate/core';
import { keyboard } from '@nut-tree-fork/nut-js';

@Injectable({
    providedIn: 'root',
})
export class ConnectService {
    peer1: SimplePeer.Instance;
    spf: SimplePeerFiles;
    socketSub: Subscription;
    sub2: Subscription;
    sub3: Subscription;
    videoSource;
    transfer;

    initialized = false;
    loading;
    dialog;
    connected: boolean = false;

    id: string = '';
    idArray: string[] = [];
    remoteIdArray: any = [{}, {}, {}, {}, {}, {}, {}, {}, {}];
    remoteId: string = '';
    fileLoading = false;
    cameraStream: MediaStream | null = null;
    screenStream: MediaStream | null = null;
    private messageSubscription: Subscription;
    private disconnectSubscription: Subscription;
    private clipboardWatcher: any = null;

    constructor(
        private electronService: ElectronService,
        private socketService: SocketService,
        private connectHelperService: ConnectHelperService,
        private loadingCtrl: LoadingController,
        private settingsService: SettingsService,
        private alertCtrl: AlertController
    ) {}

    clipboardListener() {
    const clipboard = this.electronService.clipboard;
    
    // ⭐ Stop old watcher if exists
    if (this.clipboardWatcher) {
        console.log('[CONNECT] 🧹 Stopping old clipboard watcher');
        try {
            this.clipboardWatcher.stopWatching();
        } catch (err) {
            console.error('[CONNECT] Clipboard stop error:', err);
        }
    }
    
    this.clipboardWatcher = clipboard
        .on('text-changed', () => {
            if (this.peer1 && this.connected) {
                const currentText = clipboard.readText();
                console.log('[CONNECT] 📋 Clipboard text changed');
                this.peer1.send('clipboard-' + currentText);
            }
        })
        .on('image-changed', () => {
            const currentImage = clipboard.readImage();
            console.log('[CONNECT] 📋 Clipboard image changed');
        });
        
    this.clipboardWatcher.startWatching();
}

    setId(id) {
        if (id.length == 9) {
            const idArray = id.split('').map(number => {
                return Number(number);
            });

            idArray.forEach((number, index) => {
                this.remoteIdArray[index] = { number };
            });
        }
    }

    sendScreenSize() {
        const scaleFactor =
            process.platform === 'darwin'
                ? 1
                : this.electronService.remote.screen.getPrimaryDisplay()
                      .scaleFactor;

        const { width, height } =
            this.electronService.remote.screen.getPrimaryDisplay().size;
        
        const finalWidth = width * scaleFactor;
        const finalHeight = height * scaleFactor;
        
        console.log('[CONNECT] 📐 Sending screen size:', finalWidth, 'x', finalHeight);
        this.socketService.sendMessage(`screenSize,${finalWidth},${finalHeight}`);
    }

   async videoConnector() {
        this.loading.dismiss();
        
        // ⭐ CRITICAL: Destroy old peer if exists
        if (this.peer1) {
            console.log('[CONNECT] 🧹 Destroying old peer before creating new one...');
            try {
                this.peer1.destroy();
                this.peer1 = null;
            } catch (err) {
                console.error('[CONNECT] Old peer destroy error:', err);
            }
            // Wait a bit for cleanup
            await new Promise(resolve => setTimeout(resolve, 300));
        }
        
        // Get SCREEN SHARE stream
        const source = this.videoSource;
        this.screenStream = source.stream;
        

      
        console.log('[CONNECT] ✅ SimplePeer instance created with screen stream');
    
    console.log('[CONNECT] 🖥️ Creating peer with SCREEN SHARE stream');

    this.peer1 = new SimplePeer({
        initiator: true,
        stream: this.screenStream, // Share SCREEN first - this ensures screen is track 0
        config: {
            iceServers: [
                { urls: "stun:stun.relay.metered.ca:80" },
                {
                    urls: "turn:global.relay.metered.ca:80",
                    username: "63549d560f2efcb312cd67de",
                    credential: "qh7UD1VgYnwSWhmQ",
                },
                {
                    urls: "turn:global.relay.metered.ca:80?transport=tcp",
                    username: "63549d560f2efcb312cd67de",
                    credential: "qh7UD1VgYnwSWhmQ",
                },
                {
                    urls: "turn:global.relay.metered.ca:443",
                    username: "63549d560f2efcb312cd67de",
                    credential: "qh7UD1VgYnwSWhmQ",
                },
                {
                    urls: "turns:global.relay.metered.ca:443?transport=tcp",
                    username: "63549d560f2efcb312cd67de",
                    credential: "qh7UD1VgYnwSWhmQ",
                },
            ],
        },
    });
    
    console.log('[CONNECT] ✅ SimplePeer instance created with screen stream');
    
    this.peer1.on('signal', data => {
        console.log('[PEER] 📡 Signal generated, sending to socket...');
        this.socketService.sendMessage(data);
    });

    this.peer1.on('error', (err) => {
        console.error('[PEER] ❌ Error:', err);
        this.reconnect();
    });

    this.peer1.on('close', () => {
        console.warn('[PEER] ⚠️ Connection closed');
        this.reconnect();
    });

  this.peer1.on('connect', async () => {
    console.log('[PEER] ✅ Connected successfully!');
    this.connected = true;
    
    // Start clipboard monitoring AFTER connection
    console.log('[PEER] 📋 Starting clipboard monitoring...');
    this.clipboardListener();
    
    this.connectHelperService.showInfoWindow();
    const win = this.electronService.window;
    win.minimize();
    
    // ⭐ IMPORTANT: Delay camera addition to ensure proper track ordering
    console.log('[PEER] ⏳ Waiting 1 second before adding camera...');
    setTimeout(async () => {
        console.log('[PEER] 🎥 Now adding camera tracks...');
        await this.startLocalCamera();
    }, 1000); // Increased delay to 1 second
});

    // Handle incoming stream from REMOTE user (their camera/mic)
    this.peer1.on('stream', (remoteStream) => {
        console.log('[PEER] 🎥 Remote stream received from remote user');
        
        // Create small video element for remote user's camera (picture-in-picture)
        let remoteVideo = document.getElementById('remoteUserVideo') as HTMLVideoElement;
        if (!remoteVideo) {
            remoteVideo = document.createElement('video');
            remoteVideo.id = 'remoteUserVideo';
            remoteVideo.autoplay = true;
            remoteVideo.style.position = 'fixed';
            remoteVideo.style.bottom = '10px';
            remoteVideo.style.left = '10px';
            remoteVideo.style.width = '200px';
            remoteVideo.style.height = '150px';
            remoteVideo.style.borderRadius = '12px';
            remoteVideo.style.border = '2px solid white';
            remoteVideo.style.zIndex = '9999';
            remoteVideo.style.objectFit = 'cover';
            document.body.appendChild(remoteVideo);
        }
        
        remoteVideo.srcObject = remoteStream;
        remoteVideo.play().catch(e => console.error('[CONNECT] Play error:', e));
    });

    this.peer1.on('data', async data => {
        if (data) {
            try {
                const fileTransfer = data.toString();
                if (fileTransfer.substr(0, 5) === 'file-') {
                    const fileID = fileTransfer.substr(5);
                    this.spf
                        .receive(this.peer1, fileID)
                        .then((transfer: any) => {
                            this.fileLoading = true;
                            transfer.on('progress', p => {
                                console.log('progress', p);
                            });
                            transfer.on('done', file => {
                                this.fileLoading = false;
                                console.log('done', file);
                                const element = document.createElement('a');
                                element.href = URL.createObjectURL(file);
                                element.download = file.name;
                                element.click();
                            });
                        });
                    this.peer1.send(`start-${fileID}`);
                    return;
                }

                if (fileTransfer.substr(0, 10) === 'clipboard-') {
                    const text = fileTransfer.substr(10);
                    console.log('[CONNECT] 📋 Clipboard received:', text.substring(0, 50));
                    this.electronService.clipboard.writeText(text);
                    return;
                }

                // Parse the data
                let text = new TextDecoder('utf-8').decode(data);
                
                // Check if it's JSON (keyboard input)
                if (text.substring(0, 1) == '{') {
                    const keyData = JSON.parse(text);
                    console.log('[CONNECT] ⌨️ Keyboard event:', keyData.key);
                    
                    // Pass the parsed object directly and await the handler
                    await this.connectHelperService.handleKey(keyData);
                } else if (text.substring(0, 1) == 's') {
                    // Scroll event
                    const parts = text.split(',');
                    console.log('[CONNECT] 📜 Scroll event:', parts[1]);
                    this.connectHelperService.handleScroll(text);
                } else {
                    // Mouse event
                    const parts = text.split(',');
                    console.log('[CONNECT] 🖱️ Mouse event:', parts[0]);
                    this.connectHelperService.handleMouse(text);
                }
            } catch (error) {
                console.error('[CONNECT] Error handling data:', error);
            }
        }
    });
}

       

   async startLocalCamera() {
    try {
        console.log('[CONNECT] 🎥 Starting local camera & microphone...');
        this.cameraStream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: true
        });

        console.log('[CONNECT] ✅ Camera stream obtained:', {
            videoTracks: this.cameraStream.getVideoTracks().length,
            audioTracks: this.cameraStream.getAudioTracks().length
        });

        // Add camera tracks to existing peer connection (screen already shared)
        if (this.peer1 && this.cameraStream) {
            console.log('[CONNECT] 📤 Adding camera tracks to peer...');
            this.cameraStream.getTracks().forEach((track, index) => {
                console.log(`[CONNECT] 📤 Adding track ${index}:`, track.kind, track.label);
                this.peer1.addTrack(track, this.cameraStream!);
            });
            console.log('[CONNECT] ✅ All camera & mic tracks added to peer');
        } else {
            console.error('[CONNECT] ❌ Cannot add tracks - peer or stream missing');
        }

        // Create local video preview (self-view) - bottom-right
        let localVideo = document.getElementById('localUserVideo') as HTMLVideoElement;
        if (!localVideo) {
            console.log('[CONNECT] 📺 Creating local video preview element...');
            localVideo = document.createElement('video');
            localVideo.id = 'localUserVideo';
            localVideo.autoplay = true;
            localVideo.muted = true; // mute self to avoid echo
            localVideo.style.position = 'fixed';
            localVideo.style.bottom = '10px';
            localVideo.style.right = '10px';
            localVideo.style.width = '150px';
            localVideo.style.height = '110px';
            localVideo.style.borderRadius = '12px';
            localVideo.style.border = '2px solid white';
            localVideo.style.zIndex = '9999';
            localVideo.style.objectFit = 'cover';
            document.body.appendChild(localVideo);
        }
        
        localVideo.srcObject = this.cameraStream;
        localVideo.play()
            .then(() => console.log('[CONNECT] ✅ Local video preview playing'))
            .catch(e => console.error('[CONNECT] ❌ Local play error:', e));

        return this.cameraStream;
    } catch (err) {
        console.error('[CONNECT] ❌ Could not start local camera:', err);
        return null;
    }
}

    async askForConnectPermission() {
        return new Promise(async resolve => {
            const alert = await this.alertCtrl.create({
                header: 'New connection',
                message: 'Do you want to accept the connection?',
                buttons: [
                    {
                        text: 'Cancel',
                        role: 'cancel',
                        handler: () => {
                            resolve(false);
                        },
                    },
                    {
                        text: 'Accept',
                        handler: () => {
                            resolve(true);
                        },
                    },
                ],
            });

            await alert.present();
        });
    }

    async generateId() {
        if (this.settingsService.settings?.randomId) {
            this.id = `${this.connectHelperService.threeDigit()}${this.connectHelperService.threeDigit()}${this.connectHelperService.threeDigit()}`;
        } else {
            const nodeMachineId = this.electronService.nodeMachineId;
            const id = await nodeMachineId.machineId();
            const uniqId = parseInt(id, 36).toString().substring(3, 12);
            this.id = uniqId;
        }
        this.idArray = ('' + this.id).split('');
    }

   async init() {
    // ⭐ CRITICAL: Allow re-initialization
    if (this.initialized) {
        console.log('[CONNECT] ⚠️ Already initialized, cleaning up first...');
        await this.destroy();
        this.initialized = false;
        // Wait a bit before continuing
        await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    // ⭐ Reset dialog flag
    this.dialog = false;
    
    this.initialized = true;
    await this.generateId();
    console.log('[CONNECT] 🎯 Generated ID:', this.id);

    // Test keyboard
    if (this.electronService.isElectron) {
        console.log('[CONNECT] Testing keyboard...');
        try {
            await keyboard.type('');
            console.log('[CONNECT] ✅ Keyboard working!');
        } catch (err) {
            console.error('[CONNECT] ❌ Keyboard test failed:', err);
        }
    }

    this.loading = await this.loadingCtrl.create({
        duration: 15000,
    });

    // Listen for display changes
    this.electronService.remote.screen.addListener(
        'display-metrics-changed',
        () => {
            this.sendScreenSize();
        }
    );

    this.spf = new SimplePeerFiles();

    // ⭐ CRITICAL: Unsubscribe old listeners FIRST
    if (this.messageSubscription) {
        console.log('[CONNECT] 🧹 Cleaning old message subscription');
        this.messageSubscription.unsubscribe();
        this.messageSubscription = null;
    }
    if (this.disconnectSubscription) {
        console.log('[CONNECT] 🧹 Cleaning old disconnect subscription');
        this.disconnectSubscription.unsubscribe();
        this.disconnectSubscription = null;
    }
    if (this.socketSub) {
        console.log('[CONNECT] 🧹 Cleaning old socket subscription');
        this.socketSub.unsubscribe();
        this.socketSub = null;
    }
    if (this.sub3) {
        console.log('[CONNECT] 🧹 Cleaning sub3');
        this.sub3.unsubscribe();
        this.sub3 = null;
    }

    // ⭐ CRITICAL: Properly initialize socket
    this.socketService.init();
    
   // ⭐ CRITICAL: Properly initialize socket
if (this.socketService.socket?.connected) {
    console.log('[CONNECT] 🔌 Socket already connected, disconnecting first...');
    this.socketService.socket.disconnect();
    await new Promise(resolve => setTimeout(resolve, 300));
}

this.socketService.init();

// Wait for socket to be ready with timeout
await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
        reject(new Error('Socket connection timeout'));
    }, 5000);
    
    if (this.socketService.socket?.connected) {
        clearTimeout(timeout);
        resolve(true);
    } else {
        this.socketService.socket.once('connect', () => {
            clearTimeout(timeout);
            resolve(true);
        });
    }
}).catch(err => {
    console.error('[CONNECT] ❌ Socket connection failed:', err);
});
    
    console.log('[CONNECT] 🔌 Socket ready, joining room:', this.id);
    this.socketService.joinRoom(this.id);

    // ⭐ Create fresh disconnect subscription
    this.disconnectSubscription = this.socketService.onDisconnected().subscribe(async () => {
        console.log('[DISCONNECT] Remote peer disconnected');
        const alert = await this.alertCtrl.create({
            header: 'Info',
            message: 'Connection was terminated',
            buttons: ['OK'],
        });
        await alert.present();

        this.reconnect();
    });

    // ⭐ Create fresh message subscription
    this.messageSubscription = this.socketService
        .onNewMessage()
        .subscribe(async (data: any) => {
            console.log('[CONNECT] 📨 Socket message received');
            
            if (typeof data == 'string' && data == 'hi') {
                if (this.dialog) {
                    console.log('[CONNECT] ⚠️ Dialog already open, ignoring...');
                    return; 
                }
                this.dialog = true;
                console.log('[CONNECT] 👋 Received connection request');
                this.sendScreenSize();

                if (this.settingsService.settings?.hiddenAccess) {
                    this.socketService.sendMessage('pwRequest');
                    return;
                } else {
                    const win = this.electronService.window;
                    win.show();
                    win.focus();
                    win.restore();

                    const result = await this.askForConnectPermission();
                    this.dialog = false;

                    if (!result) {
                        this.socketService.sendMessage('decline');
                        this.loading.dismiss();
                        return;
                    }
                    await this.videoConnector();
                }
            } else if (typeof data == 'string' && data.substring(0, 8) == 'pwAnswer') {
                const pw = data.replace(data.substring(0, 9), '');
                const pwCorrect = await this.electronService.bcryptjs.compare(
                    pw,
                    this.settingsService.settings.passwordHash
                );

                if (pwCorrect) {
                    await this.videoConnector();
                } else {
                    this.socketService.sendMessage('pwWrong');
                    this.loading.dismiss();
                    
                    const alert = await this.alertCtrl.create({
                        header: 'Password not correct',
                        buttons: ['OK']
                    });
                    await alert.present();
                    this.dialog = false; // ⭐ Reset dialog flag
                }
            } else if (typeof data == 'string' && data.startsWith('decline')) {
                this.loading.dismiss();
                this.dialog = false; // ⭐ Reset dialog flag
            } else {
                if (this.peer1) {
                    console.log('[CONNECT] 🔄 Signaling peer');
                    this.peer1.signal(data);
                } else {
                    console.warn('[CONNECT] ⚠️ Received signal but peer not initialized yet');
                }
            }
        });
    
    // ⭐ Store reference
    this.socketSub = this.messageSubscription;
}


    replaceVideo(stream) {
        this.peer1.removeStream(this.screenStream);
        this.screenStream = stream;
        this.peer1.addStream(stream);
    }
 async reconnect() {
    console.log('[CONNECT] 🔄 Reconnecting...');
    const win = this.electronService.window;
    win.restore();
    this.connected = false;
    this.dialog = false; // ⭐ Reset dialog flag
    
    // Stop camera stream
    if (this.cameraStream) {
        this.cameraStream.getTracks().forEach(track => {
            track.stop();
            console.log('[CONNECT] Stopped camera track:', track.kind);
        });
        this.cameraStream = null;
    }
    
    // Stop screen stream
    if (this.screenStream) {
        this.screenStream.getTracks().forEach(track => {
            track.stop();
            console.log('[CONNECT] Stopped screen track:', track.kind);
        });
        this.screenStream = null;
    }
    
    // Remove video elements
    const localVideo = document.getElementById('localUserVideo');
    const remoteVideo = document.getElementById('remoteUserVideo');
    if (localVideo) localVideo.remove();
    if (remoteVideo) remoteVideo.remove();
    
    // ⭐ CRITICAL: Properly destroy everything
    await this.destroy();
    
    // ⭐ CRITICAL: Reset initialized flag to allow re-init
    this.initialized = false;
    
    // Wait before re-initializing
    setTimeout(async () => {
        console.log('[CONNECT] ✅ Re-initializing...');
        
        // ⭐ Ensure socket is completely disconnected first
        if (this.socketService?.socket?.connected) {
            console.log('[CONNECT] 🔌 Disconnecting socket before re-init...');
            this.socketService.socket.disconnect();
            await new Promise(resolve => setTimeout(resolve, 500));
        }
        
        await this.init();
    }, 1500); // Increased delay
    
    this.connectHelperService.closeInfoWindow();
}


   async destroy() {
    console.log('[CONNECT] 🧹 Destroying connection...');
    
    // ⭐ Reset dialog flag
    this.dialog = false;

    if (this.clipboardWatcher) {
        console.log('[CONNECT] 🛑 Stopping clipboard watcher');
        try {
            this.clipboardWatcher.stopWatching();
            this.clipboardWatcher = null;
        } catch (err) {
            console.error('[CONNECT] Clipboard cleanup error:', err);
        }
    }
   if (this.id) {
    console.log('[CONNECT] 🚪 Leaving room:', this.id);
    try {
        this.socketService.leaveRoom(this.id);
        await new Promise(resolve => setTimeout(resolve, 200));
    } catch (err) {
        console.error('[CONNECT] Leave room error:', err);
    }
}
    
    // ⭐ CRITICAL: Destroy peer properly
    if (this.peer1) {
        try {
            this.peer1.destroy();
            this.peer1 = null; // ⭐ Set to null!
        } catch (err) {
            console.error('[CONNECT] Peer destroy error:', err);
        }
    }
    
    // ⭐ CRITICAL: Unsubscribe from all socket listeners
    try {
        if (this.socketSub) {
            this.socketSub.unsubscribe();
            this.socketSub = null;
        }
        if (this.sub3) {
            this.sub3.unsubscribe();
            this.sub3 = null;
        }
        if (this.messageSubscription) {
            this.messageSubscription.unsubscribe();
            this.messageSubscription = null;
        }
        if (this.disconnectSubscription) {
            this.disconnectSubscription.unsubscribe();
            this.disconnectSubscription = null;
        }
    } catch (err) {
        console.error('[CONNECT] Subscription cleanup error:', err);
    }
    
    // Destroy socket
    try {
        await this.socketService?.destroy();
    } catch (err) {
        console.error('[CONNECT] Socket destroy error:', err);
    }
    
    // Remove screen listeners
    try {
        await this.electronService.remote.screen.removeAllListeners();
    } catch (err) {
        console.error('[CONNECT] Screen listener cleanup error:', err);
    }
}

    connect(id) {
        if (this.electronService.isElectronApp) {
            const appPath = this.electronService.remote.app.getAppPath();
            try {
                const BrowserWindow = this.electronService.remote.BrowserWindow;
                const win = new BrowserWindow({
                    height: 600,
                    width: 800,
                    minWidth: 250,
                    minHeight: 250,
                    titleBarStyle:
                        process.platform === 'darwin' ? 'hidden' : 'default',
                    frame: process.platform === 'darwin' ? true : false,
                    center: true,
                    show: false,
                    backgroundColor: '#252a33',
                    webPreferences: {
                        webSecurity: false,
                        nodeIntegration: true,
                        allowRunningInsecureContent: true,
                        contextIsolation: false,
                        enableRemoteModule: true,
                    } as any,
                });

                console.log('main', this.electronService.main);
                this.electronService.remote
                    .require('@electron/remote/main')
                    .enable(win.webContents);

                if (AppConfig.production) {
                    win.loadURL(
                        url.format({
                            pathname: this.electronService.path.join(
                                appPath,
                                'dist/index.html'
                            ),
                            hash: '/remote?id=' + id,
                            protocol: 'file:',
                            slashes: true,
                        })
                    );
                } else {
                    win.loadURL('http://localhost:4200/#/remote?id=' + id);
                    win.webContents.openDevTools();
                }

                win.maximize();
                win.show();
                win.on('closed', () => {});
            } catch (error) {
                console.log('error', error);
            }
        } else {
            window.open('http://192.168.1.30:4200/#/remote?id=' + id, '_blank');
        }
    }
}
