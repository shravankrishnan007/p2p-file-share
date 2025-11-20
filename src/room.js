import { SignalingService } from "./signaling.js";
import { WebRTCManager } from "./webrtc.js";
import { FileHandler, formatSpeed } from "./file-handler.js";

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
            <div class="room-toolbar">
                <div style="display:flex; gap:15px; align-items:center;">
                    <div style="background:#333; padding:4px 8px; border-radius:4px; font-family:monospace; font-size:14px; border:1px solid #444;">
                        ${this.id}
                    </div>
                    <span class="status-text" style="color: orange; font-size: 12px;">• Connecting...</span>
                </div>
                
                <div style="display:flex; gap:10px;">
                    <input type="file" id="file-input-${this.id}" multiple style="display:none">
                    
                    <button class="tool-btn" id="add-files-${this.id}" style="width:auto; padding-right:12px">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>
                        Add Files
                    </button>
                    
                    <button class="tool-btn" id="disconnect-${this.id}" style="width:auto; padding-right:12px; color:#f38ba8; border-color:#553333">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm5 11H7v-2h10v2z"/></svg>
                        Disconnect
                    </button>
                </div>
            </div>
            
            <div class="data-grid-header">
                <div class="header-cell" style="width:30px"><input type="checkbox"></div>
                <div class="header-cell" style="width:70px">Action</div>
                <div class="header-cell" style="flex:1">File Name</div>
                <div class="header-cell" style="width:120px">Status</div>
                <div class="header-cell col-right" style="width:100px">Speed</div>
                <div class="header-cell col-right" style="width:100px">Size</div>
                <div class="header-cell col-right" style="width:100px">Date</div>
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

    updateStatus(state) {
        const el = this.view.querySelector('.status-text');
        if(el) {
            el.textContent = state;
            if(state === 'connected') el.style.color = '#a6e3a1';
            else if(state === 'disconnected') el.style.color = '#f38ba8';
            else el.style.color = 'orange';
        }
        if(state === 'connected') this.isConnected = true;
        else this.isConnected = false;
    }

    // --- UI GENERATION (FDM Row Style) ---
    addFileRow(meta, isSender) {
        const list = this.view.querySelector(`#transfer-list-${this.id}`);
        const row = document.createElement('div');
        row.className = 'transfer-row';
        row.id = `file-${meta.id}`;

        const dateStr = new Date().toLocaleDateString();
        
        // Icons
        const pauseIcon = `<svg class="icon-sm" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>`;
        const playIcon = `<svg class="icon-sm" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>`;
        const dlIcon = `<svg class="icon-sm" viewBox="0 0 24 24"><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/></svg>`;
        const cancelIcon = `<svg class="icon-sm" style="fill:#f38ba8" viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>`;
        const fileIcon = `<svg class="icon-sm" style="fill:#a0a0a0" viewBox="0 0 24 24"><path d="M13 9h5.5L13 3.5V9M6 2h8l6 6v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2m5 2H6v16h12v-9h-7V4z"/></svg>`;

        let mainAction = '';
        if (isSender) {
            mainAction = `<button class="row-action-btn" id="pause-${meta.id}" title="Pause">${pauseIcon}</button>`;
        } else {
            mainAction = `<button class="row-action-btn" id="dl-${meta.id}" title="Download">${dlIcon}</button>`;
        }

        row.innerHTML = `
            <div class="cell" style="width:30px"><input type="checkbox"></div>
            <div class="cell" style="width:60px; display:flex;" id="actions-${meta.id}">
                ${mainAction}
                <button class="row-action-btn" id="cancel-${meta.id}" title="Cancel">${cancelIcon}</button>
            </div>
            <div class="cell col-name" style="flex:1; display:flex; align-items:center; gap:8px;">
                ${fileIcon} <span title="${meta.name}">${meta.name}</span>
            </div>
            <div class="cell status-cell" style="width:150px">
                <div style="display:flex; justify-content:space-between;">
                    <span id="status-text-${meta.id}">${isSender ? 'Waiting...' : '0%'}</span>
                </div>
                <div class="progress-track">
                    <div class="progress-fill" id="prog-${meta.id}" style="width: 0%"></div>
                </div>
            </div>
            <div class="cell col-right" style="width:100px" id="speed-${meta.id}">--</div>
            <div class="cell col-right" style="width:100px">${(meta.size/1024/1024).toFixed(2)} MB</div>
            <div class="cell col-right" style="width:100px">${dateStr}</div>
        `;

        list.appendChild(row);

        // Bind Events
        if(!isSender) {
            row.querySelector(`#dl-${meta.id}`).onclick = () => this.initiateDownload(meta);
        } else {
            row.querySelector(`#pause-${meta.id}`).onclick = () => this.togglePause(meta.id);
        }
        row.querySelector(`#cancel-${meta.id}`).onclick = () => this.cancelTransfer(meta.id, true);
    }

    updateProgressUI(id, uploadedBytes, totalBytes, speed) {
        const prog = this.view.querySelector(`#prog-${id}`);
        const statusText = this.view.querySelector(`#status-text-${id}`);
        const spd = this.view.querySelector(`#speed-${id}`);

        if(prog && totalBytes > 0) {
            const percent = (uploadedBytes / totalBytes) * 100;
            prog.style.width = percent + "%";
            // Show percentage in status column
            statusText.textContent = percent.toFixed(1) + "%";
        }
        if(spd) spd.textContent = formatSpeed(speed);
    }

    markCompleteUI(id, isSender) {
        const statusText = this.view.querySelector(`#status-text-${id}`);
        const prog = this.view.querySelector(`#prog-${id}`);
        const spd = this.view.querySelector(`#speed-${id}`);
        const actions = this.view.querySelector(`#actions-${id}`);

        if(statusText) {
            statusText.textContent = isSender ? "Sent" : "Downloaded";
            statusText.style.color = "#a6e3a1"; // Green
            statusText.style.fontWeight = "bold";
        }
        if(prog) {
            prog.style.width = "100%";
            prog.style.backgroundColor = "#a6e3a1";
        }
        if(spd) spd.textContent = ""; // Clear speed
        if(actions) actions.innerHTML = ""; // Remove buttons, keep row clean
    }

    // --- LOGIC HANDLERS (Same logic, wired to new UI) ---

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
            }
        } else {
            await this.handleBinary(data);
        }
    }

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

        // Update UI to show downloading state
        const dlBtn = this.view.querySelector(`#dl-${id}`);
        if(dlBtn) dlBtn.style.display = 'none';
        
        this.webrtc.send(JSON.stringify({ type: 'request-file', id, offset: 0 }));
    }

    startSending(id, startOffset) {
        const transfer = this.activeTransfers[id];
        if(!transfer) return;
        transfer.status = 'transferring';
        transfer.offset = startOffset;
        
        this.webrtc.send(JSON.stringify({ type: 'chunk-start', id }));

        // Remove "Waiting" text
        const statusText = this.view.querySelector(`#status-text-${id}`);
        if(statusText) statusText.textContent = "Starting...";

        const chunkSize = 16 * 1024;
        let lastUpdate = Date.now();
        let lastOffset = startOffset;

        const readNextChunk = () => {
            if (!this.activeTransfers[id] || transfer.status !== 'transferring') return;
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
                this.updateProgressUI(id, transfer.offset, transfer.file.size, speed);
                lastUpdate = now;
                lastOffset = transfer.offset;
            }

            if (transfer.offset < transfer.file.size) {
                if (this.webrtc.bufferedAmount < 1024 * 1024) readNextChunk();
            } else {
                this.markCompleteUI(id, true);
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
            this.updateProgressUI(id, transfer.receivedBytes, transfer.size, speed);
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
        this.markCompleteUI(id, false);
        delete this.activeTransfers[id];
    }

    togglePause(id) {
        const transfer = this.activeTransfers[id];
        if (!transfer) return;
        const btn = this.view.querySelector(`#pause-${id}`);
        
        if (transfer.status === 'paused') {
            transfer.status = 'transferring';
            if(transfer.resumeFn) transfer.resumeFn();
            if(btn) btn.innerHTML = `<svg class="icon-sm" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>`; // Pause icon
        } else {
            transfer.status = 'paused';
            if(btn) btn.innerHTML = `<svg class="icon-sm" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>`; // Play icon
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
        
        const row = this.view.querySelector(`#file-${id}`);
        if(row) row.remove();

        if (notifyPeer) this.webrtc.send(JSON.stringify({ type: 'cancel-transfer', id }));
    }

    destroy() {
        if(this.signaling) this.signaling.sendDisconnect();
        if(this.webrtc) this.webrtc.close();
        if(this.signaling && this.signaling.socket) this.signaling.socket.disconnect();
        this.view.remove();
        const event = new CustomEvent('room-closed', { detail: this.id });
        document.dispatchEvent(event);
    }
}