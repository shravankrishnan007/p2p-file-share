# System Architecture

This document outlines the technical design, module structure, and data flow of the **Secure P2P Share** application.

## 1. High-Level Overview

The system follows a **Hybrid P2P Topology**. While file data is transferred directly between peers (Mesh Networking), a central **Signaling Server** is used to establish the initial connection.

```mermaid
graph TD
    subgraph "Client A (Sender)"
        UI_A[Electron UI]
        WebRTC_A[WebRTC Engine]
        Disk_A[File System]
    end

    subgraph "Client B (Receiver)"
        UI_B[Electron UI]
        WebRTC_B[WebRTC Engine]
        Disk_B[File System]
    end

    subgraph "Cloud Infrastructure"
        Signal[Signaling Server (Socket.io)]
        STUN[Public STUN Server]
    end

    %% Signaling Flow
    WebRTC_A -- "1. Offer/Candidates (WSS)" --> Signal
    Signal -- "2. Relay Signal" --> WebRTC_B
    WebRTC_B -- "3. Answer/Candidates (WSS)" --> Signal
    Signal -- "4. Relay Signal" --> WebRTC_A

    %% NAT Traversal
    WebRTC_A -. "5. NAT Discovery" .- STUN
    WebRTC_B -. "5. NAT Discovery" .- STUN

    %% Data Flow
    Disk_A == "6. File Stream (DTLS Encrypted)" ==> WebRTC_A
    WebRTC_A == "7. P2P Data Channel" ==> WebRTC_B
    WebRTC_B == "8. Direct Write" ==> Disk_B