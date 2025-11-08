

# 📧 Email Spam Detector

An interactive **web-based Email Spam Detection UI** that allows users to test emails or messages for spam likelihood. The interface communicates with a backend API (`/predict` or `/api/predict`) to classify text as **spam** or **ham** (not spam). If the backend is unavailable, it gracefully falls back to a **local heuristic spam detector** — so users can still test and visualize predictions offline.


## 🚀 Introduction

The **Email Spam Detector** is a modern single-page web app designed for testing and visualizing spam detection.
It can interact with a backend machine learning API or operate independently using built-in heuristic rules.

The UI provides:

* Clean, modern **dark mode** interface
* Real-time classification output
* Automatic **backend detection** and **fallback handling**
* Quick demo samples for testing

---

## ✨ Features

✅ **Interactive UI** — Users can paste email content and see instant predictions
✅ **Backend auto-detection** — Automatically tests `/predict` and `/api/predict` endpoints
✅ **Local fallback** — Heuristic prediction runs locally if backend is unavailable
✅ **Probability visualization** — Displays spam and ham probabilities
✅ **Copy prediction results** — Easily copy JSON result for debugging or integration
✅ **Demo examples** — Quickly test spam vs. ham examples
✅ **Responsive design** — Works on desktop and mobile

---

## 🧱 Project Structure

```
email-spam-detector/
│
├── index.html           # Main HTML page with UI and logic
├── /assets              # (optional) Folder for images or static assets
├── /backend             # (optional) Python or Node backend server (if used)
│
└── README.md            # Project documentation
```

---

## ⚙️ Installation

You can run this UI standalone or connect it to a backend API.

### Option 1 — Run locally (frontend only)

1. Download or clone this repository:

   ```bash
   git clone https://github.com/Adnan-khan04/SpamDetector.git
   cd SpamDetector
   ```
2. Open the `index.html` file in your browser.
3. Use the built-in heuristic predictor for offline testing.

### Option 2 — Serve with backend (recommended)

If you have a backend spam classifier (Flask, FastAPI, Node, etc.):

1. Make sure your backend exposes one of the following routes:

   * `POST /predict` → `{ "label": "spam" | "ham", "proba": { "spam": <float>, "ham": <float> } }`
   * `POST /api/predict` (fallback route)
2. Start your backend server.
3. Serve the frontend using a local server or deploy both backend and frontend together.

---

## 🖱️ Usage

1. Open the **Email Spam Detector** in your browser.
2. Enter:

   * **Subject** (optional)
   * **Sender** (optional)
   * **Email text** (required)
3. Click **Predict**.
4. View results:

   * **SPAM** (red badge)
   * **HAM** (green badge)
   * Probability breakdown

---

## 🧩 Configuration

No configuration is needed for frontend use.
However, if integrating with a backend:

* Make sure **CORS** is enabled.

* Ensure your `/predict` route accepts **POST requests** with JSON input:

  ```json
  {
    "subject": "Win a free iPhone",
    "sender": "promo@example.com",
    "text": "Congratulations! You’ve been selected..."
  }
  ```

* The response should follow this format:

  ```json
  {
    "label": "spam",
    "proba": { "spam": 0.87, "ham": 0.13 }
  }
  ```

## 🤖 Local Fallback Predictor

If no backend is reachable, the app runs a built-in **heuristic spam detector**.

It checks for:

* Spam keywords (`free`, `win`, `prize`, `buy now`, `http`, etc.)
* High numeric content ratio
* Presence of links or suspicious URLs

The heuristic generates probabilities and assigns:

* `label: "spam"` if spam score > 0.5
* `label: "ham"` otherwise

---



## 👨‍💻 Contributing

Contributions are welcome!
To contribute:

1. Fork this repository
2. Create a new branch: `git checkout -b feature-name`
3. Commit changes: `git commit -m "Add new feature"`
4. Push: `git push origin feature-name`
5. Open a pull request







