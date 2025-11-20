export class FileHandler {
    constructor() {
        this.files = new Map();
    }

    addFile(file) {
        const id = crypto.randomUUID().split('-')[0];
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