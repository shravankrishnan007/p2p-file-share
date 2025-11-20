import { Room } from "./room.js";
import "./style.css";

console.log("App.js loaded"); // Debug check

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
            console.error("Critical DOM elements missing. Check index.html IDs.");
            return;
        }

        this.bindEvents();
    }

    bindEvents() {
        // 1. Open Modal (The Plus Button)
        const openBtn = document.getElementById('open-modal-btn');
        if (openBtn) {
            openBtn.onclick = () => {
                console.log("Plus button clicked");
                this.modal.style.display = 'flex';
            };
        }

        // 2. Close Modal
        const closeBtn = document.getElementById('close-modal-btn');
        if (closeBtn) {
            closeBtn.onclick = () => this.modal.style.display = 'none';
        }

        // 3. Create New Room Button
        const createBtn = document.getElementById('create-room-btn');
        if (createBtn) {
            createBtn.onclick = () => {
                const id = Math.random().toString(36).substring(2, 8).toUpperCase();
                this.createRoom(id, true); // true = isOfferer
                this.modal.style.display = 'none';
            };
        }

        // 4. Join Room Button
        const joinBtn = document.getElementById('join-room-btn');
        if (joinBtn) {
            joinBtn.onclick = () => {
                const input = document.getElementById('room-input');
                const id = input.value.trim().toUpperCase();
                if (id) {
                    this.createRoom(id, false); // false = answerer
                    this.modal.style.display = 'none';
                    input.value = ''; // Clear input
                }
            };
        }

        // 5. Listen for room close events (from Room class)
        document.addEventListener('room-closed', (e) => {
            this.closeRoom(e.detail);
        });
    }

    createRoom(id, isOfferer) {
        if (this.rooms[id]) {
            this.switchTab(id); // Already exists, just switch
            return;
        }

        // Hide empty state
        if (this.emptyState) this.emptyState.style.display = 'none';

        // Add to Sidebar
        const li = document.createElement('li');
        li.className = 'room-item';
        li.id = `tab-${id}`;
        li.innerHTML = `
            <span>${id}</span>
            <button class="close-room-btn" title="Close">x</button>
        `;
        
        // Tab Click (Switch)
        li.onclick = (e) => {
            // Only switch if we didn't click the close button
            if (e.target.className !== 'close-room-btn') this.switchTab(id);
        };

        // Close Button Click
        li.querySelector('.close-room-btn').onclick = (e) => {
            e.stopPropagation(); // Stop bubbling to tab click
            if (this.rooms[id]) this.rooms[id].destroy();
        };
        
        this.roomListEl.appendChild(li);

        // Initialize Room Logic
        const room = new Room(id, isOfferer, this.container);
        this.rooms[id] = room;

        // Switch to the new room
        this.switchTab(id);
    }

    closeRoom(id) {
        // Remove sidebar tab
        const tab = document.getElementById(`tab-${id}`);
        if (tab) tab.remove();
        
        delete this.rooms[id];

        // If we closed the active room, switch to another or show empty state
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

        // Update Sidebar UI
        document.querySelectorAll('.room-item').forEach(el => el.classList.remove('active'));
        const activeTab = document.getElementById(`tab-${id}`);
        if (activeTab) activeTab.classList.add('active');

        // Update Main View UI
        document.querySelectorAll('.room-view').forEach(el => el.style.display = 'none');
        const activeView = document.getElementById(`view-${id}`);
        if (activeView) activeView.style.display = 'flex'; // Assuming flex layout for room view
    }
}

// Initialize
new App();