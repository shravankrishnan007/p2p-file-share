import { Room } from "./room.js";
// IMPORTANT: Ensure style.css is in the src folder, or adjust path "../style.css"
import "./style.css"; 

console.log("App.js loaded");

class App {
    constructor() {
        this.rooms = {}; 
        this.activeRoomId = null;
        
        this.roomListEl = document.getElementById('room-list');
        this.modal = document.getElementById('modal-overlay');
        this.container = document.getElementById('room-container');
        this.emptyState = document.getElementById('empty-state');

        if (!this.roomListEl || !this.modal) {
            console.error("Critical DOM elements missing.");
            return;
        }

        this.bindEvents();
        this.initDeepLinking();
    }

    initDeepLinking() {
        if (window.electronAPI) {
            window.electronAPI.onDeepLink((url) => {
                console.log("Deep link received:", url);
                const cleanUrl = url.replace('p2pshare://', '');
                const parts = cleanUrl.split('/');
                
                if (parts[0] === 'join' && parts[1]) {
                    const roomId = parts[1].toUpperCase().replace(/\/$/, ''); 
                    console.log("Auto-joining room:", roomId);
                    this.createRoom(roomId, false); 
                    this.modal.style.display = 'none';
                }
            });
        }
    }

    bindEvents() {
        const openBtn = document.getElementById('open-modal-btn');
        if (openBtn) openBtn.onclick = () => this.modal.style.display = 'flex';

        const closeBtn = document.getElementById('close-modal-btn');
        if (closeBtn) closeBtn.onclick = () => this.modal.style.display = 'none';

        const createBtn = document.getElementById('create-room-btn');
        if (createBtn) {
            createBtn.onclick = () => {
                const id = Math.random().toString(36).substring(2, 8).toUpperCase();
                this.createRoom(id, true);
                this.modal.style.display = 'none';
            };
        }

        const joinBtn = document.getElementById('join-room-btn');
        if (joinBtn) {
            joinBtn.onclick = () => {
                const input = document.getElementById('room-input');
                const id = input.value.trim().toUpperCase();
                if (id) {
                    this.createRoom(id, false);
                    this.modal.style.display = 'none';
                    input.value = ''; 
                }
            };
        }

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

        // Create Room Instance
        // Note: Ensure Room class handles appending its view to container
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

        document.querySelectorAll('.room-item').forEach(el => el.classList.remove('active'));
        const activeTab = document.getElementById(`tab-${id}`);
        if (activeTab) activeTab.classList.add('active');

        document.querySelectorAll('.room-view').forEach(el => el.style.display = 'none');
        const activeView = document.getElementById(`view-${id}`);
        if (activeView) activeView.style.display = 'flex'; 
    }
}

new App();