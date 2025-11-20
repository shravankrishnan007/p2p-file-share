import { io } from "socket.io-client";
import { SIGNALING_SERVER_URL } from "./config.js";

export class SignalingService {
    constructor(roomId, callbacks) {
        this.roomId = roomId;
        this.callbacks = callbacks;
        
        // IMPORTANT: forceNew ensures independent connections for each room
        this.socket = io(SIGNALING_SERVER_URL, {
            forceNew: true
        });
        
        this.initListeners();
        this.socket.emit('join-room', roomId);
    }

    initListeners() {
        this.socket.on('signal', (data) => {
            const signal = data.signal;
            switch (signal.type) {
                case 'offer': if (this.callbacks.onOffer) this.callbacks.onOffer(signal); break;
                case 'answer': if (this.callbacks.onAnswer) this.callbacks.onAnswer(signal); break;
                case 'candidate': if (this.callbacks.onCandidate) this.callbacks.onCandidate(signal.candidate); break;
                case 'disconnect': if (this.callbacks.onDisconnect) this.callbacks.onDisconnect(); break;
            }
        });
    }

    async createRoom(offer) {
        this.sendSignal({ type: 'offer', sdp: offer.sdp });
    }

    async joinRoom() { }

    async sendAnswer(answer) {
        this.sendSignal(answer);
    }

    async sendCandidate(candidate) {
        this.sendSignal({ type: 'candidate', candidate: candidate });
    }

    sendDisconnect() {
        this.sendSignal({ type: 'disconnect' });
    }

    sendSignal(payload) {
        this.socket.emit('signal', {
            roomId: this.roomId,
            signal: payload
        });
    }
}