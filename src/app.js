import { Room } from "./room.js";
import "./style.css";

console.log("App.js loaded");

class App {
    constructor() {
        this.rooms = {}; // Map: roomId -> Room Instance
        this.activeRoomId = null;
        
        // DOM Elements
        this.roomListEl = document.getElementById('room-list');
        this.modal = document.getElementById('modal-overlay');
        this.container = document.getElementById('room-container');
        this.emptyState = document.getElementById('empty-state');

        if (!this.roomListEl || !this.modal) {
            console.error("Critical DOM elements missing.");
            return;
        }

        this.bindEvents();
        this.initDeepLinking(); // <--- Start listening for links
    }

    // --- NEW: Deep Linking Logic ---
    initDeepLinking() {
        if (window.electronAPI) {
            window.electronAPI.onDeepLink((url) => {
                console.log("Deep link received:", url);
                // Format: p2pshare://join/ROOMID
                // Remove protocol
                const cleanUrl = url.replace('p2pshare://', '');
                const parts = cleanUrl.split('/');
                
                // Check if it's a join command
                if (parts[0] === 'join' && parts[1]) {
                    const roomId = parts[1].toUpperCase().replace(/\/$/, ''); // Remove trailing slash
                    console.log("Auto-joining room:", roomId);
                    this.createRoom(roomId, false); // false = joiner
                    
                    // Close modal if it was open
                    this.modal.style.display = 'none';
                }
            });
        }
    }

    bindEvents() {
        // 1. Open Modal
        const openBtn = document.getElementById('open-modal-btn');
        if (openBtn) {
            openBtn.onclick = () => this.modal.style.display = 'flex';
        }

        // 2. Close Modal
        const closeBtn = document.getElementById('close-modal-btn');
        if (closeBtn) {
            closeBtn.onclick = () => this.modal.style.display = 'none';
        }

        // 3. Create New Room
        const createBtn = document.getElementById('create-room-btn');
        if (createBtn) {
            createBtn.onclick = () => {
                const id = Math.random().toString(36).substring(2, 8).toUpperCase();
                this.createRoom(id, true); // true = isOfferer
                this.modal.style.display = 'none';
            };
        }

        // 4. Join Room
        const joinBtn = document.getElementById('join-room-btn');
        if (joinBtn) {
            joinBtn.onclick = () => {
                const input = document.getElementById('room-input');
                const id = input.value.trim().toUpperCase();
                if (id) {
                    this.createRoom(id, false); // false = answerer
                    this.modal.style.display = 'none';
                    input.value = ''; 
                }
            };
        }

        // 5. Room Closed Event
        document.addEventListener('room-closed', (e) => {
            this.closeRoom(e.detail);
        });
    }

    createRoom(id, isOfferer) {
        if (this.rooms[id]) {
            this.switchTab(id);
            return;
        }

        if (this.emptyState) this.emptyState.style.display = 'none';

        // Add Sidebar Tab
        const li = document.createElement('li');
        li.className = 'room-item';
        li.id = `tab-${id}`;
        li.innerHTML = `<span>${id}</span><button class="close-room-btn" title="Close">x</button>`;
        
        li.onclick = (e) => {
            if (e.target.className !== 'close-room-btn') this.switchTab(id);
        };

        li.querySelector('.close-room-btn').onclick = (e) => {
            e.stopPropagation();
            if (this.rooms[id]) this.rooms[id].destroy();
        };
        
        this.roomListEl.appendChild(li);

        // Init Room
        const room = new Room(id, isOfferer, this.container);
        this.rooms[id] = room;

        this.switchTab(id);
    }

    closeRoom(id) {
        const tab = document.getElementById(`tab-${id}`);
        if (tab) tab.remove();
        
        delete this.rooms[id];

        if (this.activeRoomId === id) {
            const remaining = Object.keys(this.rooms);
            if (remaining.length > 0) {
                this.switchTab(remaining[0]);
            } else {
                this.activeRoomId = null;
                if (this.emptyState) this.emptyState.style.display = 'block';
            }
        }
    }

    switchTab(id) {
        this.activeRoomId = id;

        // Update Sidebar
        document.querySelectorAll('.room-item').forEach(el => el.classList.remove('active'));
        const activeTab = document.getElementById(`tab-${id}`);
        if (activeTab) activeTab.classList.add('active');

        // Update Main View
        document.querySelectorAll('.room-view').forEach(el => el.style.display = 'none');
        const activeView = document.getElementById(`view-${id}`);
        if (activeView) activeView.style.display = 'flex'; 
    }
}

// Initialize
new App();