# Secure P2P Share ⚡

A modern, private, and limitless file-sharing application for your desktop. Transfer files directly between devices without the cloud, tracking, or file size limits.

 
## 📥 Download

Get the latest version for Windows:

[![Download Windows Installer](https://img.shields.io/badge/Download-.exe-0078D6?style=for-the-badge&logo=windows)](https://github.com/YOUR_USERNAME/p2p-file-share/releases/latest/download/Secure.P2P.Share.Setup.1.0.0.exe)

> **Note:** Since this is an open-source tool, Windows SmartScreen might warn you that the publisher is unknown. Click **"More Info"** -> **"Run Anyway"** to install.

---

## 📖 How to Use

### 1. Start a Connection
1.  Open the app on **Computer A** (Sender).
2.  Click the **(+)** button in the sidebar and select **"Create New Room"**.
3.  A unique **Room ID** (e.g., `X7K9P2`) will be generated.
4.  Copy this ID and send it to your friend via WhatsApp, Slack, or Email.

### 2. Join the Room
1.  Open the app on **Computer B** (Receiver).
2.  Click the **(+)** button and select **"Join Room"**.
3.  Paste the **Room ID** and click Join.
4.  You will see a green **"Connected"** status on both screens.

### 3. Transfer Files
1.  **Sender:** Click **"Add Files"** or drag and drop files into the window.
2.  **Sender:** Click **"Send"**. The file details will appear on the Receiver's screen.
3.  **Receiver:** Click the **Download** icon next to the file.
4.  **Receiver:** Choose where to save the file on your computer.
5.  The transfer starts directly between the two devices!

### 4. Controls
* **⏸ Pause:** The Sender can pause the upload at any time.
* **▶ Resume:** Resuming continues exactly where it left off.
* **✖ Cancel:** Either party can cancel the transfer.
* **Disconnect:** Click the "Disconnect" button in the room header to close the connection.

---

## 🚀 Features

* **True Peer-to-Peer:** Data streams directly from Sender to Receiver. No server stores your files.
* **Unlimited File Size:** Transfer 10GB+ files easily. We stream data directly to your hard drive, so it never crashes your RAM.
* **End-to-End Encrypted:** Built on WebRTC DTLS security.
* **Multi-Room:** Keep multiple transfer sessions open in different tabs.
* **Resumable:** Network failed? Just reconnect and click resume.

---

## 👨‍💻 For Developers (Build from Source)

If you want to contribute or build the app yourself:

### Prerequisites
* Node.js (v16+)
* Git

### Installation
```bash
# 1. Clone the repo
git clone [https://github.com/shravankrishnan007/p2p-file-share.git](https://github.com/YOUR_USERNAME/p2p-file-share.git)
cd p2p-file-share

# 2. Install dependencies
npm install

# 3. Run in Dev Mode (with Hot Reload)
npm run dev      # Starts Vite Server
npm run electron # In a second terminal