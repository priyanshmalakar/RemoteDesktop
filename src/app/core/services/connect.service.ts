// /* eslint-disable @typescript-eslint/await-thenable */
// /* eslint-disable @typescript-eslint/no-inferrable-types */
// import { Injectable } from '@angular/core';
// import { AlertController, LoadingController } from '@ionic/angular';
// import { Subscription } from 'rxjs';
// import SimplePeer from 'simple-peer';
// import SimplePeerFiles from 'simple-peer-files';
// import * as url from 'url';
// import { AppConfig } from '../../../environments/environment';
// /* eslint-disable @typescript-eslint/restrict-template-expressions */
// import { ConnectHelperService } from './connect-helper.service';
// /* eslint-disable @typescript-eslint/restrict-plus-operands */
// import { ElectronService } from './electron.service';
// import { SettingsService } from './settings.service';
// /* eslint-disable @typescript-eslint/no-misused-promises */
// import { SocketService } from './socket.service';
// import { TranslateService } from '@ngx-translate/core';
// import { keyboard } from '@nut-tree-fork/nut-js';

// @Injectable({
//     providedIn: 'root',
// })
// export class ConnectService {
//     peer1: SimplePeer.Instance;
//     spf: SimplePeerFiles;
//     socketSub: Subscription;
//     sub2: Subscription;
//     sub3: Subscription;
//     videoSource;
//     transfer;

//     initialized = false;
//     loading;
//     dialog;
//     connected: boolean = false;

//     id: string = '';
//     idArray: string[] = [];
//     remoteIdArray: any = [{}, {}, {}, {}, {}, {}, {}, {}, {}];
//     remoteId: string = '';
//     fileLoading = false;
//     cameraStream: MediaStream | null = null;
//     screenStream: MediaStream | null = null;

//     constructor(
//         private electronService: ElectronService,
//         private socketService: SocketService,
//         private connectHelperService: ConnectHelperService,
//         private loadingCtrl: LoadingController,
//         private settingsService: SettingsService,
//         private alertCtrl: AlertController
//     ) {}

//     clipboardListener() {
//         const clipboard = this.electronService.clipboard;
//         clipboard
//             .on('text-changed', () => {
//                 if (this.peer1 && this.connected) {
//                     const currentText = clipboard.readText();
//                     console.log('[CONNECT] 📋 Clipboard text changed');
//                     this.peer1.send('clipboard-' + currentText);
//                 }
//             })
//             .on('image-changed', () => {
//                 const currentImage = clipboard.readImage();
//                 console.log('[CONNECT] 📋 Clipboard image changed');
//             })
//             .startWatching();
//     }

//     setId(id) {
//         if (id.length == 9) {
//             const idArray = id.split('').map(number => {
//                 return Number(number);
//             });

//             idArray.forEach((number, index) => {
//                 this.remoteIdArray[index] = { number };
//             });
//         }
//     }

//     sendScreenSize() {
//         const scaleFactor =
//             process.platform === 'darwin'
//                 ? 1
//                 : this.electronService.remote.screen.getPrimaryDisplay()
//                       .scaleFactor;

//         const { width, height } =
//             this.electronService.remote.screen.getPrimaryDisplay().size;
        
//         const finalWidth = width * scaleFactor;
//         const finalHeight = height * scaleFactor;
        
//         console.log('[CONNECT] 📐 Sending screen size:', finalWidth, 'x', finalHeight);
//         this.socketService.sendMessage(`screenSize,${finalWidth},${finalHeight}`);
//     }

//    async videoConnector() {
//     this.loading.dismiss();
    
//     // Get SCREEN SHARE stream first (this is what the remote user will control)
//     const source = this.videoSource;
//     this.screenStream = source.stream;
    
//     console.log('[CONNECT] 🖥️ Creating peer with SCREEN SHARE stream');

//     this.peer1 = new SimplePeer({
//         initiator: true,
//         stream: this.screenStream, // Share SCREEN first - this ensures screen is track 0
//         config: {
//             iceServers: [
//                 { urls: "stun:stun.relay.metered.ca:80" },
//                 {
//                     urls: "turn:global.relay.metered.ca:80",
//                     username: "63549d560f2efcb312cd67de",
//                     credential: "qh7UD1VgYnwSWhmQ",
//                 },
//                 {
//                     urls: "turn:global.relay.metered.ca:80?transport=tcp",
//                     username: "63549d560f2efcb312cd67de",
//                     credential: "qh7UD1VgYnwSWhmQ",
//                 },
//                 {
//                     urls: "turn:global.relay.metered.ca:443",
//                     username: "63549d560f2efcb312cd67de",
//                     credential: "qh7UD1VgYnwSWhmQ",
//                 },
//                 {
//                     urls: "turns:global.relay.metered.ca:443?transport=tcp",
//                     username: "63549d560f2efcb312cd67de",
//                     credential: "qh7UD1VgYnwSWhmQ",
//                 },
//             ],
//         },
//     });
    
//     console.log('[CONNECT] ✅ SimplePeer instance created with screen stream');
    
//     this.peer1.on('signal', data => {
//         console.log('[PEER] 📡 Signal generated, sending to socket...');
//         this.socketService.sendMessage(data);
//     });

//     this.peer1.on('error', (err) => {
//         console.error('[PEER] ❌ Error:', err);
//         this.reconnect();
//     });

//     this.peer1.on('close', () => {
//         console.warn('[PEER] ⚠️ Connection closed');
//         this.reconnect();
//     });

//   this.peer1.on('connect', async () => {
//     console.log('[PEER] ✅ Connected successfully!');
//     this.connected = true;
    
//     // Start clipboard monitoring AFTER connection
//     console.log('[PEER] 📋 Starting clipboard monitoring...');
//     this.clipboardListener();
    
//     this.connectHelperService.showInfoWindow();
//     const win = this.electronService.window;
//     win.minimize();
    
//     // ⭐ IMPORTANT: Delay camera addition to ensure proper track ordering
//     console.log('[PEER] ⏳ Waiting 1 second before adding camera...');
//     setTimeout(async () => {
//         console.log('[PEER] 🎥 Now adding camera tracks...');
//         await this.startLocalCamera();
//     }, 1000); // Increased delay to 1 second
// });

//     // Handle incoming stream from REMOTE user (their camera/mic)
//     this.peer1.on('stream', (remoteStream) => {
//         console.log('[PEER] 🎥 Remote stream received from remote user');
        
//         // Create small video element for remote user's camera (picture-in-picture)
//         let remoteVideo = document.getElementById('remoteUserVideo') as HTMLVideoElement;
//         if (!remoteVideo) {
//             remoteVideo = document.createElement('video');
//             remoteVideo.id = 'remoteUserVideo';
//             remoteVideo.autoplay = true;
//             remoteVideo.style.position = 'fixed';
//             remoteVideo.style.bottom = '10px';
//             remoteVideo.style.left = '10px';
//             remoteVideo.style.width = '200px';
//             remoteVideo.style.height = '150px';
//             remoteVideo.style.borderRadius = '12px';
//             remoteVideo.style.border = '2px solid white';
//             remoteVideo.style.zIndex = '9999';
//             remoteVideo.style.objectFit = 'cover';
//             document.body.appendChild(remoteVideo);
//         }
        
//         remoteVideo.srcObject = remoteStream;
//         remoteVideo.play().catch(e => console.error('[CONNECT] Play error:', e));
//     });

//     this.peer1.on('data', async data => {
//         if (data) {
//             try {
//                 const fileTransfer = data.toString();
//                 if (fileTransfer.substr(0, 5) === 'file-') {
//                     const fileID = fileTransfer.substr(5);
//                     this.spf
//                         .receive(this.peer1, fileID)
//                         .then((transfer: any) => {
//                             this.fileLoading = true;
//                             transfer.on('progress', p => {
//                                 console.log('progress', p);
//                             });
//                             transfer.on('done', file => {
//                                 this.fileLoading = false;
//                                 console.log('done', file);
//                                 const element = document.createElement('a');
//                                 element.href = URL.createObjectURL(file);
//                                 element.download = file.name;
//                                 element.click();
//                             });
//                         });
//                     this.peer1.send(`start-${fileID}`);
//                     return;
//                 }

//                 if (fileTransfer.substr(0, 10) === 'clipboard-') {
//                     const text = fileTransfer.substr(10);
//                     console.log('[CONNECT] 📋 Clipboard received:', text.substring(0, 50));
//                     this.electronService.clipboard.writeText(text);
//                     return;
//                 }

//                 // Parse the data
//                 let text = new TextDecoder('utf-8').decode(data);
                
//                 // Check if it's JSON (keyboard input)
//                 if (text.substring(0, 1) == '{') {
//                     const keyData = JSON.parse(text);
//                     console.log('[CONNECT] ⌨️ Keyboard event:', keyData.key);
                    
//                     // Pass the parsed object directly and await the handler
//                     await this.connectHelperService.handleKey(keyData);
//                 } else if (text.substring(0, 1) == 's') {
//                     // Scroll event
//                     const parts = text.split(',');
//                     console.log('[CONNECT] 📜 Scroll event:', parts[1]);
//                     this.connectHelperService.handleScroll(text);
//                 } else {
//                     // Mouse event
//                     const parts = text.split(',');
//                     console.log('[CONNECT] 🖱️ Mouse event:', parts[0]);
//                     this.connectHelperService.handleMouse(text);
//                 }
//             } catch (error) {
//                 console.error('[CONNECT] Error handling data:', error);
//             }
//         }
//     });
// }

       

//    async startLocalCamera() {
//     try {
//         console.log('[CONNECT] 🎥 Starting local camera & microphone...');
//         this.cameraStream = await navigator.mediaDevices.getUserMedia({
//             video: true,
//             audio: true
//         });

//         console.log('[CONNECT] ✅ Camera stream obtained:', {
//             videoTracks: this.cameraStream.getVideoTracks().length,
//             audioTracks: this.cameraStream.getAudioTracks().length
//         });

//         // Add camera tracks to existing peer connection (screen already shared)
//         if (this.peer1 && this.cameraStream) {
//             console.log('[CONNECT] 📤 Adding camera tracks to peer...');
//             this.cameraStream.getTracks().forEach((track, index) => {
//                 console.log(`[CONNECT] 📤 Adding track ${index}:`, track.kind, track.label);
//                 this.peer1.addTrack(track, this.cameraStream!);
//             });
//             console.log('[CONNECT] ✅ All camera & mic tracks added to peer');
//         } else {
//             console.error('[CONNECT] ❌ Cannot add tracks - peer or stream missing');
//         }

//         // Create local video preview (self-view) - bottom-right
//         let localVideo = document.getElementById('localUserVideo') as HTMLVideoElement;
//         if (!localVideo) {
//             console.log('[CONNECT] 📺 Creating local video preview element...');
//             localVideo = document.createElement('video');
//             localVideo.id = 'localUserVideo';
//             localVideo.autoplay = true;
//             localVideo.muted = true; // mute self to avoid echo
//             localVideo.style.position = 'fixed';
//             localVideo.style.bottom = '10px';
//             localVideo.style.right = '10px';
//             localVideo.style.width = '150px';
//             localVideo.style.height = '110px';
//             localVideo.style.borderRadius = '12px';
//             localVideo.style.border = '2px solid white';
//             localVideo.style.zIndex = '9999';
//             localVideo.style.objectFit = 'cover';
//             document.body.appendChild(localVideo);
//         }
        
//         localVideo.srcObject = this.cameraStream;
//         localVideo.play()
//             .then(() => console.log('[CONNECT] ✅ Local video preview playing'))
//             .catch(e => console.error('[CONNECT] ❌ Local play error:', e));

//         return this.cameraStream;
//     } catch (err) {
//         console.error('[CONNECT] ❌ Could not start local camera:', err);
//         return null;
//     }
// }

//     async askForConnectPermission() {
//         return new Promise(async resolve => {
//             const alert = await this.alertCtrl.create({
//                 header: 'New connection',
//                 message: 'Do you want to accept the connection?',
//                 buttons: [
//                     {
//                         text: 'Cancel',
//                         role: 'cancel',
//                         handler: () => {
//                             resolve(false);
//                         },
//                     },
//                     {
//                         text: 'Accept',
//                         handler: () => {
//                             resolve(true);
//                         },
//                     },
//                 ],
//             });

//             await alert.present();
//         });
//     }

//     async generateId() {
//         if (this.settingsService.settings?.randomId) {
//             this.id = `${this.connectHelperService.threeDigit()}${this.connectHelperService.threeDigit()}${this.connectHelperService.threeDigit()}`;
//         } else {
//             const nodeMachineId = this.electronService.nodeMachineId;
//             const id = await nodeMachineId.machineId();
//             const uniqId = parseInt(id, 36).toString().substring(3, 12);
//             this.id = uniqId;
//         }
//         this.idArray = ('' + this.id).split('');
//     }

//     async init() {
//         if (this.initialized) {
//             return;
//         }
        
//         this.initialized = true;
//         await this.generateId();
//         console.log('[CONNECT] 🎯 Generated ID:', this.id);
//         console.log('[CONNECT] Initializing socket service...');

//         // Test keyboard (no dynamic import needed)
//         if (this.electronService.isElectron) {
//             console.log('[CONNECT] Testing keyboard...');
//             try {
//                 await keyboard.type('');
//                 console.log('[CONNECT] ✅ Keyboard working!');
//             } catch (err) {
//                 console.error('[CONNECT] ❌ Keyboard test failed:', err);
//             }
//         }

//         this.loading = await this.loadingCtrl.create({
//             duration: 15000,
//         });

//         // Listen for display changes
//         this.electronService.remote.screen.addListener(
//             'display-metrics-changed',
//             () => {
//                 this.sendScreenSize();
//             }
//         );

//         this.spf = new SimplePeerFiles();

//         this.socketService.init();
//         this.socketService.joinRoom(this.id);

//         this.sub3 = this.socketService.onDisconnected().subscribe(async () => {
//             console.log('[DISCONNECT] Remote peer disconnected');
//             const alert = await this.alertCtrl.create({
//                 header: 'Info',
//                 message: 'Connection was terminated',
//                 buttons: ['OK'],
//             });
//             await alert.present();

//             this.reconnect();
//         });

//         this.socketSub = this.socketService
//             .onNewMessage()
//             .subscribe(async (data: any) => {
//                 console.log('[CONNECT] 📨 Socket message received:', typeof data === 'string' ? data : 'signal');
                
//                 if (typeof data == 'string' && data == 'hi') {
//                     if (this.dialog) return; 
//                     this.dialog = true;
//                     console.log('[CONNECT] 👋 Received connection request');
//                     this.sendScreenSize();

//                     if (this.settingsService.settings?.hiddenAccess) {
//                         this.socketService.sendMessage('pwRequest');
//                         return;
//                     } else {
//                         const win = this.electronService.window;
//                         win.show();
//                         win.focus();
//                         win.restore();

//                         const result = await this.askForConnectPermission();
//                         this.dialog = false;

//                         if (!result) {
//                             this.socketService.sendMessage('decline');
//                             this.loading.dismiss();
//                             return;
//                         }
//                         await this.videoConnector();
//                     }
//                 } else if (
//                     typeof data == 'string' &&
//                     data.substring(0, 8) == 'pwAnswer'
//                 ) {
//                     const pw = data.replace(data.substring(0, 9), '');
//                     const pwCorrect =
//                         await this.electronService.bcryptjs.compare(
//                             pw,
//                             this.settingsService.settings.passwordHash
//                         );

//                     if (pwCorrect) {
//                         await this.videoConnector();
//                     } else {
//                         this.socketService.sendMessage('pwWrong');
//                         this.loading.dismiss();
                        
//                         const alert = await this.alertCtrl.create({
//                             header: 'Password not correct',
//                             buttons: ['OK']
//                         });
//                         await alert.present();
//                     }
//                 } else if (
//                     typeof data == 'string' &&
//                     data.startsWith('decline')
//                 ) {
//                     this.loading.dismiss();
//                 } else {
//                     if (this.peer1) {
//                         console.log('[CONNECT] 🔄 Signaling peer');
//                         this.peer1.signal(data);
//                     } else {
//                         console.warn('[CONNECT] ⚠️ Received signal but peer not initialized yet');
//                     }
//                 }
//             });
//     }

//     replaceVideo(stream) {
//         this.peer1.removeStream(this.screenStream);
//         this.screenStream = stream;
//         this.peer1.addStream(stream);
//     }

//     async reconnect() {
//         const win = this.electronService.window;
//         win.restore();
//         this.connected = false;
        
//         // Stop camera stream
//         if (this.cameraStream) {
//             this.cameraStream.getTracks().forEach(track => track.stop());
//             this.cameraStream = null;
//         }
        
//         // Stop screen stream
//         if (this.screenStream) {
//             this.screenStream.getTracks().forEach(track => track.stop());
//             this.screenStream = null;
//         }
        
//         // Remove video elements
//         const localVideo = document.getElementById('localUserVideo');
//         const remoteVideo = document.getElementById('remoteUserVideo');
//         if (localVideo) localVideo.remove();
//         if (remoteVideo) remoteVideo.remove();
        
//         await this.destroy();
//         setTimeout(() => {
//             this.init();
//         }, 500);
//         this.connectHelperService.closeInfoWindow();
//     }

//     async destroy() {
//         this.initialized = false;
//         await this.peer1?.destroy();
//         await this.socketService?.destroy();
//         await this.socketSub?.unsubscribe();
//         await this.sub3?.unsubscribe();
//         await this.electronService.remote.screen.removeAllListeners();
//     }

//     connect(id) {
//         if (this.electronService.isElectronApp) {
//             const appPath = this.electronService.remote.app.getAppPath();
//             try {
//                 const BrowserWindow = this.electronService.remote.BrowserWindow;
//                 const win = new BrowserWindow({
//                     height: 600,
//                     width: 800,
//                     minWidth: 250,
//                     minHeight: 250,
//                     titleBarStyle:
//                         process.platform === 'darwin' ? 'hidden' : 'default',
//                     frame: process.platform === 'darwin' ? true : false,
//                     center: true,
//                     show: false,
//                     backgroundColor: '#252a33',
//                     webPreferences: {
//                         webSecurity: false,
//                         nodeIntegration: true,
//                         allowRunningInsecureContent: true,
//                         contextIsolation: false,
//                         enableRemoteModule: true,
//                     } as any,
//                 });

//                 console.log('main', this.electronService.main);
//                 this.electronService.remote
//                     .require('@electron/remote/main')
//                     .enable(win.webContents);

//                 if (AppConfig.production) {
//                     win.loadURL(
//                         url.format({
//                             pathname: this.electronService.path.join(
//                                 appPath,
//                                 'dist/index.html'
//                             ),
//                             hash: '/remote?id=' + id,
//                             protocol: 'file:',
//                             slashes: true,
//                         })
//                     );
//                 } else {
//                     win.loadURL('http://localhost:4200/#/remote?id=' + id);
//                     win.webContents.openDevTools();
//                 }

//                 win.maximize();
//                 win.show();
//                 win.on('closed', () => {});
//             } catch (error) {
//                 console.log('error', error);
//             }
//         } else {
//             window.open('http://192.168.1.30:4200/#/remote?id=' + id, '_blank');
//         }
//     }
// }



/* eslint-disable @typescript-eslint/await-thenable */
/* eslint-disable @typescript-eslint/no-inferrable-types */
import { Injectable } from '@angular/core';
import { AlertController, LoadingController } from '@ionic/angular';
import { Subscription } from 'rxjs';
import SimplePeer from 'simple-peer';
import SimplePeerFiles from 'simple-peer-files';
import * as url from 'url';
import { AppConfig } from '../../../environments/environment';
import { ConnectHelperService } from './connect-helper.service';
import { ElectronService } from './electron.service';
import { SettingsService } from './settings.service';
import { SocketService } from './socket.service';
import { keyboard } from '@nut-tree-fork/nut-js';

@Injectable({
    providedIn: 'root',
})
export class ConnectService {
    peer1: SimplePeer.Instance;
    spf: SimplePeerFiles;
    socketSub: Subscription;
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
        clipboard
            .on('text-changed', () => {
                if (this.peer1 && this.connected) {
                    const currentText = clipboard.readText();
                    this.peer1.send('clipboard-' + currentText);
                }
            })
            .on('image-changed', () => {
                const currentImage = clipboard.readImage();
            })
            .startWatching();
    }

    setId(id) {
        if (id.length == 9) {
            const idArray = id.split('').map(number => Number(number));
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

        this.socketService.sendMessage(`screenSize,${finalWidth},${finalHeight}`);
    }

    async videoConnector() {
        this.loading.dismiss();

        // SCREEN SHARE stream
        const source = this.videoSource;
        this.screenStream = source.stream;

        this.peer1 = new SimplePeer({
            initiator: true,
            stream: this.screenStream,
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

        this.peer1.on('signal', data => {
            this.socketService.sendMessage(data);
        });

        this.peer1.on('error', (err) => {
            this.reconnect();
        });

        this.peer1.on('close', () => {
            this.reconnect();
        });

        this.peer1.on('connect', async () => {
            this.connected = true;
            this.clipboardListener();
            this.connectHelperService.showInfoWindow();
            const win = this.electronService.window;
            win.minimize();

            setTimeout(async () => {
                await this.startLocalCamera();
            }, 1000);

            // Show chat window
            this.showChatWindow();
        });

        this.peer1.on('stream', (remoteStream) => {
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
                                transfer.on('progress', p => {});
                                transfer.on('done', file => {
                                    this.fileLoading = false;
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
                        this.electronService.clipboard.writeText(text);
                        return;
                    }

                    // Chat message handling
                    const text = new TextDecoder('utf-8').decode(data);
                    if (text.startsWith("chat-")) {
                        const message = text.replace("chat-", "");
                        this.addChatMessage("Remote", message);
                        return;
                    }

                    // Keyboard / Scroll / Mouse handling
                    if (text.substring(0, 1) == '{') {
                        const keyData = JSON.parse(text);
                        await this.connectHelperService.handleKey(keyData);
                    } else if (text.substring(0, 1) == 's') {
                        this.connectHelperService.handleScroll(text);
                    } else {
                        this.connectHelperService.handleMouse(text);
                    }

                } catch (error) {}
            }
        });
    }

    async startLocalCamera() {
        try {
            this.cameraStream = await navigator.mediaDevices.getUserMedia({
                video: true,
                audio: true
            });

            if (this.peer1 && this.cameraStream) {
                this.cameraStream.getTracks().forEach(track => {
                    this.peer1.addTrack(track, this.cameraStream!);
                });
            }

            let localVideo = document.getElementById('localUserVideo') as HTMLVideoElement;
            if (!localVideo) {
                localVideo = document.createElement('video');
                localVideo.id = 'localUserVideo';
                localVideo.autoplay = true;
                localVideo.muted = true;
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
            localVideo.play();
            return this.cameraStream;
        } catch (err) {
            return null;
        }
    }

    async askForConnectPermission() {
        return new Promise(async resolve => {
            const alert = await this.alertCtrl.create({
                header: 'New connection',
                message: 'Do you want to accept the connection?',
                buttons: [
                    { text: 'Cancel', role: 'cancel', handler: () => resolve(false) },
                    { text: 'Accept', handler: () => resolve(true) }
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
        if (this.initialized) return;
        this.initialized = true;
        await this.generateId();

        if (this.electronService.isElectron) {
            try { await keyboard.type(''); } catch {}
        }

        this.loading = await this.loadingCtrl.create({ duration: 15000 });

        this.spf = new SimplePeerFiles();
        this.socketService.init();
        this.socketService.joinRoom(this.id);

        this.sub3 = this.socketService.onDisconnected().subscribe(async () => {
            const alert = await this.alertCtrl.create({ header: 'Info', message: 'Connection terminated', buttons: ['OK'] });
            await alert.present();
            this.reconnect();
        });

        this.socketSub = this.socketService.onNewMessage().subscribe(async (data: any) => {
            if (typeof data === 'string') {
                if (data === 'hi') {
                    if (this.dialog) return;
                    this.dialog = true;
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
                } else if (data.startsWith('pwAnswer')) {
                    const pw = data.replace(data.substring(0, 9), '');
                    const pwCorrect = await this.electronService.bcryptjs.compare(
                        pw,
                        this.settingsService.settings.passwordHash
                    );
                    if (pwCorrect) await this.videoConnector();
                    else {
                        this.socketService.sendMessage('pwWrong');
                        this.loading.dismiss();
                        const alert = await this.alertCtrl.create({ header: 'Password not correct', buttons: ['OK'] });
                        await alert.present();
                    }
                } else if (data.startsWith('decline')) {
                    this.loading.dismiss();
                } else if (this.peer1) {
                    this.peer1.signal(data);
                }
            } else if (this.peer1) {
                this.peer1.signal(data);
            }
        });
    }

    replaceVideo(stream) {
        this.peer1.removeStream(this.screenStream);
        this.screenStream = stream;
        this.peer1.addStream(stream);
    }

    async reconnect() {
        const win = this.electronService.window;
        win.restore();
        this.connected = false;

        if (this.cameraStream) this.cameraStream.getTracks().forEach(track => track.stop());
        if (this.screenStream) this.screenStream.getTracks().forEach(track => track.stop());

        const localVideo = document.getElementById('localUserVideo');
        const remoteVideo = document.getElementById('remoteUserVideo');
        if (localVideo) localVideo.remove();
        if (remoteVideo) remoteVideo.remove();

        await this.destroy();
        setTimeout(() => this.init(), 500);
        this.connectHelperService.closeInfoWindow();
    }

    async destroy() {
        this.initialized = false;
        await this.peer1?.destroy();
        await this.socketService?.destroy();
        await this.socketSub?.unsubscribe();
        await this.sub3?.unsubscribe();
        await this.electronService.remote.screen.removeAllListeners();
    }

    connect(id) {
        if (this.electronService.isElectronApp) {
            const appPath = this.electronService.remote.app.getAppPath();
            try {
                const BrowserWindow = this.electronService.remote.BrowserWindow;
                const win = new BrowserWindow({
                    height: 600, width: 800, minWidth: 250, minHeight: 250,
                    titleBarStyle: process.platform === 'darwin' ? 'hidden' : 'default',
                    frame: process.platform === 'darwin' ? true : false,
                    center: true, show: false, backgroundColor: '#252a33',
                    webPreferences: { webSecurity: false, nodeIntegration: true, allowRunningInsecureContent: true, contextIsolation: false, enableRemoteModule: true } as any
                });
                this.electronService.remote.require('@electron/remote/main').enable(win.webContents);

                if (AppConfig.production) {
                    win.loadURL(url.format({
                        pathname: this.electronService.path.join(appPath, 'dist/index.html'),
                        hash: '/remote?id=' + id,
                        protocol: 'file:', slashes: true
                    }));
                } else {
                    win.loadURL('http://localhost:4200/#/remote?id=' + id);
                    win.webContents.openDevTools();
                }

                win.maximize();
                win.show();
                win.on('closed', () => { });
            } catch (error) { console.log('error', error); }
        } else {
            window.open('http://192.168.1.30:4200/#/remote?id=' + id, '_blank');
        }
    }

    // ========================= CHAT FUNCTIONS =============================
    showChatWindow() {
        if (document.getElementById("chatBox")) return;

        const box = document.createElement("div");
        box.id = "chatBox";
        box.style.position = "fixed";
        box.style.bottom = "10px";
        box.style.right = "200px";
        box.style.width = "250px";
        box.style.height = "320px";
        box.style.background = "#1e1e1e";
        box.style.border = "2px solid white";
        box.style.borderRadius = "10px";
        box.style.zIndex = "9999";
        box.style.display = "flex";
        box.style.flexDirection = "column";
        box.style.color = "white";
        box.style.fontFamily = "sans-serif";

        box.innerHTML = `
            <div style="padding:8px; background:#333; border-bottom:2px solid #444; font-weight:bold;">
                Live Chat
            </div>
            <div id="chatMessages" style="flex:1; padding:8px; overflow-y:auto; font-size:14px;"></div>
            <div style="padding:6px; display:flex; gap:4px;">
                <input id="chatInput" placeholder="Type message..." 
                    style="flex:1; padding:6px; border-radius:4px; border:none; outline:none;"/>
                <button id="chatSend" 
                    style="padding:6px 10px; background:#007bff; color:white; border:none; border-radius:4px; cursor:pointer;">
                    Send
                </button>
            </div>
        `;
        document.body.appendChild(box);

        const sendBtn = document.getElementById("chatSend");
        const input = document.getElementById("chatInput") as HTMLInputElement;

        sendBtn?.addEventListener("click", () => {
            if (!input.value.trim()) return;
            this.peer1.send("chat-" + input.value);
            this.addChatMessage("You", input.value);
            input.value = "";
        });
    }

    addChatMessage(sender: string, msg: string) {
        const container = document.getElementById("chatMessages");
        if (!container) return;
        const div = document.createElement("div");
        div.style.margin = "4px 0";
        div.innerHTML = `<b>${sender}:</b> ${msg}`;
        container.appendChild(div);
        container.scrollTop = container.scrollHeight;
    }
}








