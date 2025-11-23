import { SignalingService } from "./signaling.js";
import { WebRTCManager } from "./webrtc.js";
import { FileHandler, formatSpeed } from "./file-handler.js";
import { UI } from "./ui.js";

export class Room {
    constructor(roomId, isOfferer, containerElement) {
        this.id = roomId;
        this.isOfferer = isOfferer;
        this.container = containerElement;
        
        this.fileHandler = new FileHandler();
        this.activeTransfers = {};
        this.currentReceivingId = null;
        this.isConnected = false;

        this.render();
        this.initNetwork();
    }

    render() {
        this.view = document.createElement('div');
        this.view.className = 'room-view';
        this.view.id = `view-${this.id}`;
        
        this.view.innerHTML = `
            <!-- Toolbar -->
            <div class="room-toolbar">
                <div style="display:flex; gap:15px; align-items:center;">
                    <div style="background:#333; padding:4px 8px; border-radius:4px; font-family:monospace; font-size:14px; border:1px solid #444;">
                        ${this.id}
                    </div>
                    <span class="status-text" style="color: orange; font-size: 12px;">• Connecting...</span>
                </div>
                <div style="display:flex; gap:10px;">
                    <input type="file" id="file-input-${this.id}" multiple style="display:none">
                    
                    <button class="tool-btn" id="add-files-${this.id}" title="Add Files">
                        <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>
                    </button>
                    
                    <button class="tool-btn" id="disconnect-${this.id}" title="Disconnect" style="color:#f38ba8; border-color:#f38ba8">
                        <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm5 11H7v-2h10v2z"/></svg>
                    </button>
                </div>
            </div>
            
            <!-- Grid Header (Widths handled by CSS Grid) -->
            <div class="data-grid-header">
                <div class="header-cell"><input type="checkbox"></div>
                <div class="header-cell">Action</div>
                <div class="header-cell">File Name</div>
                <div class="header-cell">Status</div>
                <div class="header-cell col-right">Speed</div>
                <div class="header-cell col-right">Size</div>
                <div class="header-cell col-right">Date</div>
            </div>

            <!-- List Container -->
            <div id="transfer-list-${this.id}" style="flex:1; overflow-y:auto;"></div>
        `;

        this.container.appendChild(this.view);

        // Bind Events
        this.view.querySelector(`#add-files-${this.id}`).onclick = () => {
            this.view.querySelector(`#file-input-${this.id}`).click();
        };
        this.view.querySelector(`#file-input-${this.id}`).onchange = (e) => this.handleFileSelect(e);
        this.view.querySelector(`#disconnect-${this.id}`).onclick = () => {
            if(confirm("Disconnect form this room?")) this.destroy();
        };
    }

    initNetwork() {
        this.webrtc = new WebRTCManager({
            onIceCandidate: (c) => { if(this.signaling) this.signaling.sendCandidate(c, this.isOfferer ? 'offerer' : 'answerer'); },
            onConnectionStateChange: (state) => this.updateStatus(state),
            onDataChannelOpen: () => this.updateStatus('connected'),
            onMessage: (data) => this.handleMessage(data)
        });

        this.signaling = new SignalingService(this.id, {
            onAnswer: async (ans) => await this.webrtc.handleAnswer(ans),
            onOffer: async (off) => {
                if (!this.isOfferer) {
                    const ans = await this.webrtc.handleOffer(off);
                    await this.signaling.sendAnswer(ans);
                }
            },
            onCandidate: async (c) => await this.webrtc.addCandidate(c),
            onDisconnect: () => { this.updateStatus('disconnected'); alert(`Peer disconnected from ${this.id}`); }
        });

        if (this.isOfferer) {
            this.signaling.socket.on('user-connected', async () => {
                const offer = await this.webrtc.createOffer();
                await this.signaling.createRoom(offer);
            });
        }
    }

    // ... (Rest of the methods: updateStatus, handleFileSelect, handleMessage, addFileRow, etc. from previous code) ...
    // Important: Ensure `addFileRow` calls `UI.addFileEntryToContainer`
    
    addFileRow(meta, isSender) {
        const list = this.view.querySelector(`#transfer-list-${this.id}`);
        UI.addFileEntryToContainer(list, meta.id, meta.name, meta.size, isSender, {
            onDownload: () => this.initiateDownload(meta),
            onPause: (paused) => this.togglePause(meta.id, paused),
            onCancel: () => this.cancelTransfer(meta.id, true)
        });
    }
    
    // ... (Keep startSending, handleBinary, etc.) ...

    // Helper placeholders to complete the class
    updateStatus(state) { /* ... */ }
    handleFileSelect(e) { /* ... */ }
    async handleMessage(data) { /* ... */ }
    async initiateDownload(meta) { /* ... */ }
    startSending(id, offset) { /* ... */ }
    async handleBinary(data) { /* ... */ }
    togglePause(id, paused) { /* ... */ }
    cancelTransfer(id, notify) { /* ... */ }
    handleRemoteCancel(id) { /* ... */ }
    
    destroy() {
        if(this.signaling) this.signaling.sendDisconnect();
        if(this.webrtc) this.webrtc.close();
        if(this.signaling && this.signaling.socket) this.signaling.socket.disconnect();
        this.view.remove();
        const event = new CustomEvent('room-closed', { detail: this.id });
        document.dispatchEvent(event);
    }
}