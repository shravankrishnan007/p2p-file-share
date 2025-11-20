import { formatSpeed } from "./file-handler.js";

const elements = {
    list: document.getElementById('transfer-list'), 
    tabs: document.getElementById('room-tabs'),
    disconnectBtn: document.getElementById('disconnect-btn')
};

export const UI = {
    bindDisconnect(fn) {},

    addFileEntryToContainer(container, id, name, size, isSender, handlers = {}) {
        const row = document.createElement('div');
        row.className = 'transfer-row';
        row.id = `file-${id}`;

        const dateStr = new Date().toLocaleDateString('en-GB', {day:'2-digit', month:'2-digit', year:'numeric'});
        
        // FIXED SVGs: Explicit width/height added to prevent "Huge Icon" bug
        const fileIcon = `<svg width="16" height="16" class="icon-sm" style="fill:#a0a0a0" viewBox="0 0 24 24"><path d="M13 9h5.5L13 3.5V9M6 2h8l6 6v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2m5 2H6v16h12v-9h-7V4z"/></svg>`;
        
        // Icons for buttons
        const pauseIcon = `<svg width="16" height="16" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>`;
        const playIcon = `<svg width="16" height="16" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>`;
        const dlIcon = `<svg width="16" height="16" viewBox="0 0 24 24"><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/></svg>`;
        const cancelIcon = `<svg width="16" height="16" style="fill:#f38ba8" viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>`;

        // Decide main action button
        let mainAction = '';
        if (isSender) {
            mainAction = `<button class="row-action-btn" id="btn-pause-${id}" title="Pause">${pauseIcon}</button>`;
        } else {
            mainAction = `<button class="row-action-btn" id="btn-dl-${id}" title="Download" style="color:#a6e3a1">${dlIcon}</button>`;
        }

        row.innerHTML = `
            <div class="cell"><input type="checkbox"></div>
            
            <div class="cell" style="display:flex; gap:5px;">
                ${mainAction}
                <button class="row-action-btn" id="btn-cancel-${id}" title="Cancel">${cancelIcon}</button>
            </div>
            
            <div class="cell col-name" style="display:flex; align-items:center; gap:8px;">
                ${fileIcon} <span title="${name}">${name}</span>
            </div>
            
            <div class="cell status-cell">
                <div style="display:flex; justify-content:space-between;">
                    <span id="status-text-${id}">${isSender ? 'Waiting...' : '0%'}</span>
                </div>
                <div class="progress-track">
                    <div class="progress-fill" id="prog-${id}"></div>
                </div>
            </div>
            
            <div class="cell col-right" id="speed-${id}">--</div>
            <div class="cell col-right">${(size/1024/1024).toFixed(2)} MB</div>
            <div class="cell col-right">${dateStr}</div>
        `;

        // Highlight Logic
        row.addEventListener('click', (e) => {
            if(e.target.closest('button') || e.target.closest('input')) return;
            row.parentElement.querySelectorAll('.transfer-row').forEach(r => r.classList.remove('selected'));
            row.classList.add('selected');
        });

        container.appendChild(row);

        // Event Binding
        if (!isSender && handlers.onDownload) {
            const dlBtn = row.querySelector(`#btn-dl-${id}`);
            if (dlBtn) dlBtn.onclick = (e) => { 
                e.stopPropagation(); 
                handlers.onDownload(); 
                dlBtn.style.display = 'none'; // Hide download button after click
            };
        }

        if (isSender && handlers.onPause) {
            const pBtn = row.querySelector(`#btn-pause-${id}`);
            if (pBtn) pBtn.onclick = (e) => {
                e.stopPropagation();
                const isPaused = pBtn.classList.contains('paused');
                handlers.onPause(!isPaused);
                
                if (!isPaused) {
                    pBtn.innerHTML = playIcon;
                    pBtn.classList.add('paused');
                    pBtn.title = "Resume";
                } else {
                    pBtn.innerHTML = pauseIcon;
                    pBtn.classList.remove('paused');
                    pBtn.title = "Pause";
                }
            };
        }
        
        const cBtn = row.querySelector(`#btn-cancel-${id}`);
        if (cBtn) cBtn.onclick = (e) => { 
            e.stopPropagation(); 
            handlers.onCancel(); 
        };
    },

    updateProgress(id, uploadedBytes, totalBytes, speed) {
        const row = document.getElementById(`file-${id}`);
        if(!row) return;

        const progBar = row.querySelector(`#prog-${id}`);
        const speedText = row.querySelector(`#speed-${id}`);
        const statusText = row.querySelector(`#status-text-${id}`);

        if (progBar && totalBytes > 0) {
            const percent = (uploadedBytes / totalBytes) * 100;
            progBar.style.width = percent + "%";
            statusText.textContent = percent.toFixed(1) + "%";
        }
        
        if (speedText) speedText.textContent = formatSpeed(speed);
    },

    markFileComplete(id, isSender) {
        const row = document.getElementById(`file-${id}`);
        if(!row) return;

        const statusText = row.querySelector(`#status-text-${id}`);
        const progBar = row.querySelector(`#prog-${id}`);
        const speedText = row.querySelector(`#speed-${id}`);
        // Keep file name visible, only update status text
        
        if(statusText) {
            statusText.textContent = isSender ? "Sent" : "Completed";
            statusText.style.color = "#a6e3a1";
        }
        if(progBar) {
            progBar.style.width = "100%";
            progBar.style.background = "#a6e3a1";
        }
        if(speedText) speedText.textContent = "";
    },

    removeFileEntry(id) {
        const row = document.getElementById(`file-${id}`);
        if (row) row.remove();
    },

    toggleResumeUI(id, show) {
        const statusText = document.getElementById(`status-text-${id}`);
        if (statusText) {
            statusText.textContent = show ? "Interrupted" : "Resuming...";
            statusText.style.color = show ? "#f38ba8" : "inherit";
        }
    }
};