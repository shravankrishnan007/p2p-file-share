# System Architecture

This document outlines the technical design, module structure, and data flow of the **Secure P2P Share** application.

## 1. High-Level Overview

The system follows a **Hybrid P2P Topology**. While file data is transferred directly between peers (Mesh Networking), a central **Signaling Server** is used to establish the initial connection.

**System Diagram**

      +------------------+                                    +------------------+
      |     Client A     | <================================> |     Client B     |
      |     (Sender)     |      Encrypted P2P Data Channel    |    (Receiver)    |
      +------------------+           (WebRTC / DTLS)          +------------------+
               |                                                        |
               | 1. Send Offer & Candidates                             | 3. Send Answer
               | (via Secure WebSocket)                                 | (via Secure WebSocket)
               v                                                        v
      +--------------------------------------------------------------------------+
      |                             Signaling Server                             |
      |                          (Node.js / Socket.io)                           |
      |                   *Relays messages, does not store data* |
      +--------------------------------------------------------------------------+
               |                                                        |
               +--------------------------+-----------------------------+
                                          |
                                 2. & 4. Relay Signals 
                                 (SDP / ICE Candidates)

      NAT Traversal (Discovery):
      +----------+                     +----------+                     +----------+
      | Client A | --(UDP Request)-->  |   STUN   |  <--(UDP Request)-- | Client B |
      +----------+                     |  Server  |                     +----------+
                                       +----------+