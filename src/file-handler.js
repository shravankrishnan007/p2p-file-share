export class FileHandler {
    constructor() {
        this.files = new Map();
    }

    addFile(file) {
        // Generate a short random ID for the file
        const id = Math.random().toString(36).substring(2, 10);
        this.files.set(id, file);
        return { id, name: file.name, size: file.size };
    }

    getFile(id) {
        return this.files.get(id);
    }
}

export function formatSpeed(bytesPerSecond) {
    if (bytesPerSecond > 1024 * 1024) return (bytesPerSecond / 1024 / 1024).toFixed(2) + ' MB/s';
    if (bytesPerSecond > 1024) return (bytesPerSecond / 1024).toFixed(2) + ' KB/s';
    return bytesPerSecond.toFixed(0) + ' B/s';
}

// --- NEW: Time Formatter for ETA ---
export function formatTime(seconds) {
    if (!isFinite(seconds) || seconds < 0) return '--';
    if (seconds === 0) return 'Done';
    seconds = Math.ceil(seconds);
    
    if (seconds < 60) {
        return `${Math.ceil(seconds)}s`;
    } else if (seconds < 3600) {
        const m = Math.floor(seconds / 60);
        const s = Math.ceil(seconds % 60);
        return `${m}m ${s}s`;
    } else {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        return `${h}h ${m}m`;
    }
}