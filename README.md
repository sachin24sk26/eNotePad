# 📝 eNotePad — Digital Curator

> Instantly share text, links, and images across devices with a simple secret code. No login required.

![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)
![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)
![Firebase](https://img.shields.io/badge/Firebase-FFCA28?style=for-the-badge&logo=firebase&logoColor=black)

---

## ✨ Overview

**eNotePad** is a lightweight, ephemeral content-sharing web application built with a *Tactile Editorial* design system. Share text snippets, URLs, or images across any device — all you need is a **6-character secret code**. Content auto-expires after a set time, keeping things clean and private.

---

## 🚀 Features

| Feature | Description |
|---|---|
| 📄 **Text Sharing** | Write and share plain text notes up to 10,000 characters |
| 🔗 **Link Sharing** | Share multiple URLs instantly across devices |
| 🖼️ **Image Sharing** | Upload and share images with automated compression |
| 🔑 **Secret Code Access** | 6-character OTP-style code to retrieve shared content |
| ⏳ **Auto-Expiry** | Content expires in 20 minutes for maximum privacy |
| 🌗 **Dark / Light Mode** | State-of-the-art theme toggle with deep editorial palettes |
| 🛡️ **Admin Command Center** | v3.0 Dashboard with real-time stats and broadcast controls |
| 👤 **Account System** | Optional registration with username & 4-digit PIN |
| 💾 **Saved Notes** | Logged-in users can save and categorize permanent notes |
| 📱 **Responsive Design** | Bespoke sidebar for desktop + glassmorphic mobile nav |

---

## 🏗️ Tech Stack

- **Frontend:** HTML5, Vanilla JavaScript (ES6+)
- **Styling:** [Tailwind CSS](https://tailwindcss.com/) (v3) + Custom CSS Design Tokens
- **Fonts:** [Inter](https://fonts.google.com/specimen/Inter) (UI) / [Newsreader](https://fonts.google.com/specimen/Newsreader) (Serif Body)
- **Icons:** [Material Symbols Outlined](https://fonts.google.com/icons)
- **Backend:** [Firebase](https://firebase.google.com/) (Firestore Compat SDK)

---

## 📂 Project Structure

```
eNotepad/
├── index.html              # Main Single-Page Application (SPA)
├── css/
│   └── styles.css          # Design System — Dark mode, glassmorphism, animations
├── js/
│   ├── firebase-config.js  # Firebase project initialization
│   ├── utils.js            # Shared UI utilities and theme logic
│   ├── share.js            # Content sharing & image upload module
│   ├── access.js           # Content retrieval & code processing
│   ├── auth.js             # User lifecycle & RBAC role management
│   ├── admin.js            # Admin Command Center v3.0 logic
│   ├── editor.js           # Advanced text editing and formatting
│   ├── filemanager.js      # File and media management system
│   └── app.js              # Application router and navigation sync
├── assets/
│   └── favicon.svg         # Minimalist vector branding
└── _template/              # Reusable UI component snippets
```

---

## ⚡ Getting Started

### Prerequisites

- A modern web browser (Chrome, Firefox, Edge, Safari)
- A Firebase project with **Firestore** and **Storage** enabled

### 1. Clone the Repository

```bash
git clone https://github.com/your-username/eNotepad.git
cd eNotepad
```

### 2. Configure Firebase

Open `js/firebase-config.js` and replace the placeholder config with your own Firebase project credentials:

```js
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};
```

### 3. Run Locally

Since this is a static site, you can serve it with any local HTTP server:

```bash
# Using Python
python -m http.server 8000

# Using Node.js (npx)
npx serve .

# Using VS Code Live Server extension
# Right-click index.html → "Open with Live Server"
```

Then open `http://localhost:8000` in your browser.

---

## 🎨 Design System: The Command Center v3.0

eNotePad uses a custom **Tactile Editorial** design language, recently upgraded for the Admin Panel:

- **Premium Admin Interface**: A glassmorphic dashboard with 1400px maximum width for professional administration.
- **Dynamic Stats**: High-end gradient-backed stat cards with lifting hover animations.
- **Real-time Broadcasts**: Global announcement system with instant push notification logic.
- **Editorial Dark Mode**: Hand-tuned color palettes (using HSL-tailored shades) for zero eye strain.
- **Tactile Elements**: Paper-grain overlays and serif typography for a high-end stationery feel.

---

## 🛡️ Administrative Controls (RBAC)

The platform includes an advanced **Admin Command Center** accessible only to verified roles:

- **Global Overview**: Real-time monitoring of user registrations and note generation.
- **Announcements**: Push system-wide messages that appear instantly on all user devices.
- **User Feedback**: Centralized hub to review and manage citizen feedback.
- **User Directory**: Searchable registry of all active accounts with status indicators.

---

## 🔧 How It Works

1. **Share** — Select a content type (Text / Link / Image), compose your content, pick an expiry time, and hit *Share Content*.
2. **Get Code** — A unique 6-character secret code is generated. Copy it and send it to whoever needs the content.
3. **Access** — The recipient enters the code on the *Access* tab to retrieve the content before it expires.
4. **Account** *(optional)* — Register with a username and 4-digit PIN to save notes permanently.

---

## 🤝 Contributing

Contributions, issues, and feature requests are welcome!

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📜 License

This project is open source and available under the [MIT License](LICENSE).

---

## 🙏 Acknowledgments

- [Firebase](https://firebase.google.com/) — Backend services
- [Tailwind CSS](https://tailwindcss.com/) — Utility-first CSS framework
- [Google Fonts](https://fonts.google.com/) — Inter, Newsreader, Material Symbols
- [Material Design 3](https://m3.material.io/) — Color system inspiration

---

<p align="center">
  Made with ❤️ by <strong>eNotePad</strong>
</p>
