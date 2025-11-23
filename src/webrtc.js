import { rtcConfig } from "./config.js";

export class WebRTCManager {
    constructor(callbacks) {
        this.peerConnection = new RTCPeerConnection(rtcConfig);
        this.dataChannel = null;
        this.callbacks = callbacks; 

        this.setupPeerConnection();
    }

    setupPeerConnection() {
        this.peerConnection.onicecandidate = (event) => {
            if (event.candidate) {
                this.callbacks.onIceCandidate(event.candidate);
            }
        };

        this.peerConnection.onconnectionstatechange = () => {
            this.callbacks.onConnectionStateChange(this.peerConnection.connectionState);
        };

        // Receiver side
        this.peerConnection.ondatachannel = (event) => {
            this.setupDataChannel(event.channel);
        };
    }

    // Sender side
    createDataChannel() {
        const channel = this.peerConnection.createDataChannel("fileTransfer");
        this.setupDataChannel(channel);
    }

    setupDataChannel(channel) {
        this.dataChannel = channel;
        this.dataChannel.binaryType = 'arraybuffer';

        this.dataChannel.bufferedAmountLowThreshold = 0;

        this.dataChannel.onopen = () => {
            this.callbacks.onDataChannelOpen();
        };

        this.dataChannel.onmessage = (event) => {
            this.callbacks.onMessage(event.data);
        };
    }

    async createOffer() {
        this.createDataChannel();
        const offer = await this.peerConnection.createOffer();
        await this.peerConnection.setLocalDescription(offer);
        return offer;
    }

    async handleOffer(offer) {
        await this.peerConnection.setRemoteDescription(offer);
        const answer = await this.peerConnection.createAnswer();
        await this.peerConnection.setLocalDescription(answer);
        return answer;
    }

    async handleAnswer(answer) {
        await this.peerConnection.setRemoteDescription(answer);
    }

    async addCandidate(candidate) {
        try {
            await this.peerConnection.addIceCandidate(candidate);
        } catch (e) {
            console.error("Error adding candidate", e);
        }
    }

    send(data) {
        if (this.dataChannel && this.dataChannel.readyState === 'open') {
            try{this.dataChannel.send(data);
            } catch (error) {
                console.error("Send failed", error);
            }
        }
    }

    get bufferedAmount() {
        return this.dataChannel ? this.dataChannel.bufferedAmount : 0;
    }

    setBufferedAmountLowCallback(callback) {
        if (this.dataChannel) {
            this.dataChannel.onbufferedamountlow = callback;
            
        }
    }

    close() {
        if (this.dataChannel) this.dataChannel.close();
        if (this.peerConnection) this.peerConnection.close();
    }
}