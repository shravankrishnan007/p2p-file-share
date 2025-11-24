import { formatSpeed, formatTime } from "./file-handler.js";

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
        
        // Fixed SVGs
        const fileIcon = `<svg width="16" height="16" class="icon-sm" style="fill:#a0a0a0" viewBox="0 0 24 24"><path d="M13 9h5.5L13 3.5V9M6 2h8l6 6v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2m5 2H6v16h12v-9h-7V4z"/></svg>`;
        const pauseIcon = `<svg width="16" height="16" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>`;
        const playIcon = `<svg width="16" height="16" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>`;
        const dlIcon = `<svg width="16" height="16" viewBox="0 0 24 24"><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/></svg>`;
        const cancelIcon = `<svg width="16" height="16" style="fill:#e57373" viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>`;
        const resumeIcon = `<svg width="16" height="16" viewBox="0 0 24 24" style="fill:#ff9800"><path d="M17.65 6.35A7.958 7.958 0 0012 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08A5.99 5.99 0 0112 18c-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/></svg>`;

        let mainAction = isSender 
            ? `<button class="row-action-btn" id="btn-pause-${id}" title="Pause">${pauseIcon}</button>`
            : `
                <button class="row-action-btn" id="btn-dl-${id}" title="Download" style="color:#a6e3a1">${dlIcon}</button>
                <button class="row-action-btn" id="btn-resume-${id}" title="Resume" style="display:none;">${resumeIcon}</button>
            `;

        row.innerHTML = `
            <div class="cell"><input type="checkbox"></div>
            <div class="cell" style="display:flex; gap:5px;" id="actions-${id}">
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
            <div class="cell col-right" id="eta-${id}">--</div> <!-- ETA Column -->
            <div class="cell col-right">${dateStr}</div>
        `;

        row.addEventListener('click', (e) => {
            if(e.target.closest('button') || e.target.closest('input')) return;
            if(row.parentElement) {
                row.parentElement.querySelectorAll('.transfer-row').forEach(r => r.classList.remove('selected'));
                row.classList.add('selected');
            }
        });

        container.appendChild(row);

        if (!isSender) {
            const dlBtn = row.querySelector(`#btn-dl-${id}`);
            if (dlBtn) dlBtn.onclick = (e) => { 
                e.stopPropagation(); 
                if(handlers.onDownload) handlers.onDownload(); 
                dlBtn.style.display = 'none'; 
            };
            const resumeBtn = row.querySelector(`#btn-resume-${id}`);
            if (resumeBtn) resumeBtn.onclick = (e) => {
                e.stopPropagation();
                if(handlers.onResume) handlers.onResume();
            };
        }

        if (isSender && handlers.onPause) {
            const pBtn = row.querySelector(`#btn-pause-${id}`);
            if (pBtn) pBtn.onclick = (e) => {
                e.stopPropagation();
                const isPaused = pBtn.classList.contains('paused');
                handlers.onPause(!isPaused);
                if (!isPaused) { pBtn.innerHTML = playIcon; pBtn.classList.add('paused'); pBtn.title = "Resume"; }
                else { pBtn.innerHTML = pauseIcon; pBtn.classList.remove('paused'); pBtn.title = "Pause"; }
            };
        }
        
        const cBtn = row.querySelector(`#btn-cancel-${id}`);
        if (cBtn) cBtn.onclick = (e) => { e.stopPropagation(); handlers.onCancel(); };
    },

    startTransferUI(id) {
        const row = document.getElementById(`file-${id}`);
        if(!row) return;
        const statusText = row.querySelector(`#status-text-${id}`);
        const dlBtn = row.querySelector(`#btn-dl-${id}`);
        const resumeBtn = row.querySelector(`#btn-resume-${id}`);
        if (statusText) statusText.textContent = "Starting...";
        if (dlBtn) dlBtn.style.display = 'none';
        if (resumeBtn) resumeBtn.style.display = 'none';
    },

    updateProgress(id, uploadedBytes, totalBytes, speed, eta) {
        const row = document.getElementById(`file-${id}`);
        if(!row) return;

        const progBar = row.querySelector(`#prog-${id}`);
        const speedText = row.querySelector(`#speed-${id}`);
        const statusText = row.querySelector(`#status-text-${id}`);
        const etaText = row.querySelector(`#eta-${id}`);

        if (progBar && totalBytes > 0) {
            const percent = (uploadedBytes / totalBytes) * 100;
            progBar.style.width = percent + "%";
            statusText.textContent = percent.toFixed(1) + "%";
        }
        if (speedText) speedText.textContent = formatSpeed(speed);
        if (etaText) {
            // If eta is missing or -1, show '--'
            if (eta === undefined || eta < 0) {
                etaText.textContent = "--";
            } else {
                etaText.textContent = formatTime(eta);
            }
        }
    },

    markFileComplete(id, isSender) {
        const row = document.getElementById(`file-${id}`);
        if(!row) return;

        const statusText = row.querySelector(`#status-text-${id}`);
        const progBar = row.querySelector(`#prog-${id}`);
        const speedText = row.querySelector(`#speed-${id}`);
        const etaText = row.querySelector(`#eta-${id}`);
        const actions = row.querySelector(`#actions-${id}`);
        
        if(statusText) { statusText.textContent = isSender ? "Sent" : "Downloaded"; statusText.style.color = "#a6e3a1"; statusText.style.fontWeight = "bold"; }
        if(progBar) { progBar.style.width = "100%"; progBar.style.background = "#a6e3a1"; }
        if(speedText) speedText.textContent = "";
        if(etaText) etaText.textContent = ""; // Clear ETA
        if(actions) actions.innerHTML = ""; 
    },

    removeFileEntry(id) {
        const row = document.getElementById(`file-${id}`);
        if (row) row.remove();
    },

    toggleResumeUI(id, show) {
        const row = document.getElementById(`file-${id}`);
        if(!row) return;
        const statusText = row.querySelector(`#status-text-${id}`);
        const resumeBtn = row.querySelector(`#btn-resume-${id}`);
        const dlBtn = row.querySelector(`#btn-dl-${id}`);
        
        if (show) {
            if(resumeBtn) resumeBtn.style.display = 'inline-flex';
            if(dlBtn) dlBtn.style.display = 'none';
            if(statusText) { statusText.textContent = "Interrupted"; statusText.style.color = "#f38ba8"; }
        } else {
            if(resumeBtn) resumeBtn.style.display = 'none';
            if(statusText) { statusText.textContent = "Resuming..."; statusText.style.color = "orange"; }
        }
    },

    togglePauseUI(id, isPaused) {
        const row = document.getElementById(`file-${id}`);
        if(!row) return;
        const statusText = row.querySelector(`#status-text-${id}`);
        if(statusText) {
            if(isPaused) { statusText.textContent = "Paused"; statusText.style.color = "orange"; }
            else { statusText.textContent = "Transferring..."; statusText.style.color = "#cdd6f4"; }
        }
    }
};