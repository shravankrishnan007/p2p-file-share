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
        
        // Clipboard
        this.isClipboardSyncing = false;
        this.lastClipboardText = "";
        this.clipboardInterval = null;

        this.render();
        this.initNetwork();
    }

    render() {
        this.view = document.createElement('div');
        this.view.className = 'room-view';
        this.view.id = `view-${this.id}`;
        
        this.view.innerHTML = `
            <div class="room-toolbar">
                <div style="display:flex; gap:15px; align-items:center;">
                    <div style="background:#333; padding:4px 8px; border-radius:4px; font-family:monospace; font-size:14px; border:1px solid #444;">
                        ${this.id}
                    </div>
                    <span class="status-text" style="color: orange; font-size: 12px;">• Connecting...</span>
                </div>
                <div style="display:flex; gap:10px;">
                    <input type="file" id="file-input-${this.id}" multiple style="display:none">
                    
                    <button class="tool-btn" id="clipboard-btn-${this.id}" title="Sync Clipboard">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path>
                            <rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect>
                        </svg>
                    </button>

                    <button class="tool-btn" id="add-files-${this.id}" title="Add File">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>
                    </button>
                    <button class="tool-btn" id="disconnect-${this.id}" title="Disconnect" style="color:#f38ba8; border-color:#f38ba8">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm5 11H7v-2h10v2z"/></svg>
                    </button>
                </div>
            </div>
            
            <div class="data-grid-header">
                <div class="header-cell"><input type="checkbox"></div>
                <div class="header-cell">Action</div>
                <div class="header-cell">File Name</div>
                <div class="header-cell">Status</div>
                <div class="header-cell col-right">Speed</div>
                <div class="header-cell col-right">Size</div>
                <div class="header-cell col-right">Date</div>
            </div>

            <div id="transfer-list-${this.id}" style="flex:1; overflow-y:auto;"></div>
        `;

        this.container.appendChild(this.view);

        // Bind Events
        this.view.querySelector(`#add-files-${this.id}`).onclick = () => {
            this.view.querySelector(`#file-input-${this.id}`).click();
        };
        this.view.querySelector(`#file-input-${this.id}`).onchange = (e) => this.handleFileSelect(e);
        
        this.view.querySelector(`#disconnect-${this.id}`).onclick = () => {
            if(confirm("Disconnect from this room?")) this.destroy();
        };
        
        this.view.querySelector(`#clipboard-btn-${this.id}`).onclick = (e) => this.toggleClipboard(e.currentTarget);
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

    updateStatus(state) {
        const el = this.view.querySelector('.status-text');
        if(el) {
            el.textContent = state;
            if(state === 'connected') {
                el.style.color = '#a6e3a1';
                this.isConnected = true;
            } else {
                el.style.color = state === 'disconnected' ? '#f38ba8' : 'orange';
                this.isConnected = false;
                if (state === 'disconnected') this.pauseAllTransfers();
            }
        }
    }

    // --- FILE LOGIC ---
    handleFileSelect(e) {
        const files = e.target.files;
        for (const file of files) {
            const meta = this.fileHandler.addFile(file);
            this.activeTransfers[meta.id] = { status: 'waiting', file, offset: 0, reader: new FileReader() };
            this.addFileRow(meta, true);
            this.webrtc.send(JSON.stringify({ type: 'meta', ...meta }));
        }
    }

    async handleMessage(data) {
        if (typeof data === 'string') {
            const msg = JSON.parse(data);
            switch (msg.type) {
                case 'meta': this.addFileRow(msg, false); break;
                case 'request-file': this.startSending(msg.id, msg.offset); break;
                case 'chunk-start': 
                    this.currentReceivingId = msg.id;
                    if(this.activeTransfers[msg.id]) this.activeTransfers[msg.id].isReceiving = true;
                    break;
                case 'cancel-transfer': this.cancelTransfer(msg.id, false); break;
                // Clipboard Logic
                case 'clipboard':
                    this.lastClipboardText = msg.content; 
                    if (window.electronAPI) window.electronAPI.writeClipboard(msg.content);
                    else navigator.clipboard.writeText(msg.content).catch(()=>{});
                    break;
            }
        } else {
            await this.handleBinary(data);
        }
    }

    // --- UI Helpers ---
    addFileRow(meta, isSender) {
        const list = this.view.querySelector(`#transfer-list-${this.id}`);
        UI.addFileEntryToContainer(list, meta.id, meta.name, meta.size, isSender, {
            onDownload: () => this.initiateDownload(meta),
            onPause: (paused) => this.togglePause(meta.id, paused),
            onCancel: () => this.cancelTransfer(meta.id, true)
        });
    }

    // --- TRANSFER LOGIC (Standard) ---
    async initiateDownload(meta) {
        const id = meta.id;
        this.activeTransfers[id] = {
            isReceiving: false, size: meta.size, receivedBytes: 0, 
            lastUpdate: Date.now(), lastBytes: 0, writable: null, buffer: []
        };

        try {
            if (window.showSaveFilePicker) {
                const handle = await window.showSaveFilePicker({ suggestedName: meta.name });
                this.activeTransfers[id].writable = await handle.createWritable();
            }
        } catch (err) {
            if (err.name === 'AbortError') { delete this.activeTransfers[id]; return; }
        }

        UI.startTransferUI(id); // Shows "Starting..." text
        this.webrtc.send(JSON.stringify({ type: 'request-file', id, offset: 0 }));
    }

    startSending(id, startOffset) {
        const transfer = this.activeTransfers[id];
        if(!transfer) return;
        
        transfer.status = 'transferring';
        transfer.offset = startOffset;
        
        this.webrtc.send(JSON.stringify({ type: 'chunk-start', id }));
        
        // Update UI using local view query
        const row = this.view.querySelector(`#file-${id}`);
        if(row) {
            const statusText = row.querySelector(`#status-text-${id}`);
            if(statusText) statusText.textContent = "Uploading...";
        }

        const chunkSize = 64 * 1024;
        const MAX_BUFFER = 16 * 1024 * 1024; 
        let lastUpdate = Date.now();
        let lastOffset = startOffset;

        const readNextChunk = () => {
            if (!this.activeTransfers[id] || transfer.status === 'cancelled') return;
            if (transfer.status === 'paused' || transfer.status === 'interrupted') return;
            
            if (this.webrtc.bufferedAmount > MAX_BUFFER) return;

            const slice = transfer.file.slice(transfer.offset, transfer.offset + chunkSize);
            transfer.reader.readAsArrayBuffer(slice);
        };
        
        transfer.resumeFn = readNextChunk;
        this.webrtc.setBufferedAmountLowCallback(() => {
            if (transfer.status === 'transferring') readNextChunk();
        });

        transfer.reader.onload = (e) => {
            if (transfer.status !== 'transferring') return;
            this.webrtc.send(e.target.result);
            transfer.offset += e.target.result.byteLength;

            const now = Date.now();
            if (now - lastUpdate > 500 || transfer.offset >= transfer.file.size) {
                const speed = (transfer.offset - lastOffset) / ((now - lastUpdate) / 1000);
                UI.updateProgress(id, transfer.offset, transfer.file.size, speed);
                lastUpdate = now;
                lastOffset = transfer.offset;
            }

            if (transfer.offset < transfer.file.size) {
                readNextChunk();
            } else {
                UI.markFileComplete(id, true);
                delete this.activeTransfers[id];
            }
        };
        readNextChunk();
    }

    async handleBinary(data) {
        const id = this.currentReceivingId;
        if (!id || !this.activeTransfers[id]) return;
        const transfer = this.activeTransfers[id];

        if (transfer.writable) await transfer.writable.write(data);
        else transfer.buffer.push(data);

        transfer.receivedBytes += data.byteLength;

        const now = Date.now();
        if (now - transfer.lastUpdate > 500 || transfer.receivedBytes >= transfer.size) {
            const speed = (transfer.receivedBytes - transfer.lastBytes) / ((now - transfer.lastUpdate) / 1000);
            UI.updateProgress(id, transfer.receivedBytes, transfer.size, speed);
            transfer.lastUpdate = now;
            transfer.lastBytes = transfer.receivedBytes;
        }

        if (transfer.receivedBytes >= transfer.size) await this.finishDownload(id);
    }

    async finishDownload(id) {
        const transfer = this.activeTransfers[id];
        if (transfer.writable) await transfer.writable.close();
        else {
            const blob = new Blob(transfer.buffer);
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = "file"; 
            a.click();
            URL.revokeObjectURL(url);
        }
        UI.markFileComplete(id, false);
        delete this.activeTransfers[id];
    }

    // --- CLIPBOARD ---
    toggleClipboard(btn) {
        this.isClipboardSyncing = !this.isClipboardSyncing;
        
        if (this.isClipboardSyncing) {
            btn.style.color = "#a6e3a1"; 
            btn.style.borderColor = "#a6e3a1";
            this.startClipboardLoop();
        } else {
            btn.style.color = ""; 
            btn.style.borderColor = "";
            this.stopClipboardLoop();
        }
    }

    startClipboardLoop() {
        this.clipboardInterval = setInterval(async () => {
            if (!this.isConnected) return;
            let text = "";
            if (window.electronAPI) text = await window.electronAPI.readClipboard();
            else try { text = await navigator.clipboard.readText(); } catch(e){}

            if (text && text !== this.lastClipboardText) {
                this.lastClipboardText = text;
                this.webrtc.send(JSON.stringify({ type: 'clipboard', content: text }));
            }
        }, 1000);
    }

    stopClipboardLoop() { if (this.clipboardInterval) clearInterval(this.clipboardInterval); }

    // --- CONTROLS ---
    togglePause(id, isPaused) {
        const transfer = this.activeTransfers[id];
        if (!transfer) return;
        
        if (isPaused) {
            transfer.status = 'paused';
            UI.togglePauseUI(id, true);
        } else {
            transfer.status = 'transferring';
            if(transfer.resumeFn) transfer.resumeFn();
            UI.togglePauseUI(id, false);
        }
    }

    cancelTransfer(id, notifyPeer) {
        const transfer = this.activeTransfers[id];
        if (transfer) {
            transfer.status = 'cancelled';
            if(transfer.writable) transfer.writable.abort().catch(()=>{});
            if(transfer.reader) transfer.reader.abort();
            delete this.activeTransfers[id];
        }
        UI.removeFileEntry(id);
        if (notifyPeer) this.webrtc.send(JSON.stringify({ type: 'cancel-transfer', id }));
    }

    handleRemoteCancel(id) {
        this.cancelTransfer(id, false);
        alert("Transfer cancelled by peer");
    }

    pauseAllTransfers() {
        Object.keys(this.activeTransfers).forEach(id => {
            this.activeTransfers[id].status = 'interrupted';
            UI.toggleResumeUI(id, true);
        });
    }

    destroy() {
        this.stopClipboardLoop();
        if(this.signaling) this.signaling.sendDisconnect();
        if(this.webrtc) this.webrtc.close();
        if(this.signaling && this.signaling.socket) this.signaling.socket.disconnect();
        this.view.remove();
        const event = new CustomEvent('room-closed', { detail: this.id });
        document.dispatchEvent(event);
    }
}