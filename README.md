# M.Sc. Mathematics with AI & DS — Machine Learning Practical Assignment Showcase

Official static showcase website for the **M.Sc. Mathematics with Artificial Intelligence & Data Science** programme at **Chhatrapati Shahu Ji Maharaj University (CSJMU), Kanpur**.

This portal showcases student teams, dataset preprocessing pipelines, feature engineering methodologies, and practical machine learning implementations for the course assignment:

> **MACHINE LEARNING PRACTICAL ASSIGNMENT**  
> *DATA PREPROCESSING & FEATURE SELECTION*  
> `FROM THEORY TO IMPLEMENTATION`

---

## 🚀 Live Demonstration Features

- **Strict Vanilla Stack**: Built with pure **HTML5**, **CSS3**, and **Vanilla JavaScript (ES6+)** with zero frontend frameworks or build tooling.
- **Dynamic JSON Data Architecture**: All team records, member enrollments, dataset metadata, and submission links are fully decoupled and loaded dynamically from `data/projects.json`.
- **Live Submission Counter**: Dynamic header status pill showing the live count of published submissions, calculated dynamically from the JSON registry (not hardcoded).
- **Auto-Sync Polling**: Periodic cache-aware background refresh (every 60 seconds) that updates submission counts and listings without resetting active search queries, sorting, or filter selections.
- **Instant Multi-Field Search**: Real-time filtering across team names, student names, enrollment numbers, dataset names, and problem statements as you type.
- **Dynamic Dataset Filter Chips**: Interactive horizontally scrollable chips generated automatically from the distinct datasets present in the JSON registry.
- **Verification Status Filtering**: Seamless cycling between All Submissions, Verified Submissions, and Pending Verification.
- **Multi-Criteria Sorting**: Sort by Latest Submission, Oldest Submission, Team Name (A–Z), Team Name (Z–A), or Team Number.
- **Dedicated Project Detail View**: Clean query-parameter-driven page (`project.html?id=T001`) with full problem statements, dataset references, member registry table, and direct resource links.
- **Safe Resource Links**: External links (GitHub, Colab, YouTube, Dataset) open safely in new tabs (`rel="noopener noreferrer"`). Missing or unsubmitted links are handled gracefully without broken buttons.
- **Official Academic Aesthetics**: Clean typography, CSJMU university emblem, responsive mobile drawer navigation, keyboard shortcuts (`Ctrl+K` / `/` to search, `Esc` to clear/close), and academic design language.

---

## 📁 Project Structure

```text
ML-ASSIGNMENT/
├── assets/
│   ├── csjmu-logo.png          # Primary official university emblem
│   └── csjmu-emplem.png        # High-resolution backup university asset
├── css/
│   └── styles.css              # Complete responsive academic design system
├── data/
│   └── projects.json           # Single source of truth for all team records
├── js/
│   ├── firebase-config.js      # Firebase Realtime Database project credentials
│   ├── visitor-presence.js     # Real-time active visitor tracking & session lifecycle
│   ├── data-service.js         # Shared JSON fetcher, caching & project calculations
│   ├── app.js                  # Main showcase logic (search, filter, sort, chips)
│   └── project.js              # Dedicated project detail page renderer
├── database.rules.json         # Secure Firebase Realtime Database presence security rules
├── index.html                  # Main assignment showcase page
├── project.html                # Project detail template (reads ?id=Txxx)
└── README.md                   # Full documentation & administration guide
```

---

## 🛠️ How to Manage and Update Data (`data/projects.json`)

All project and team records are maintained in [`data/projects.json`](data/projects.json). You do not need to edit any HTML or JavaScript files to update teams or member details.

### JSON Schema Contract

```json
{
  "metadata": {
    "university": "Chhatrapati Shahu Ji Maharaj University, Kanpur",
    "programme": "M.Sc. Mathematics with Artificial Intelligence & Data Science",
    "assignmentTitle": "Machine Learning Practical Assignment",
    "subtitle": "Data Preprocessing & Feature Selection",
    "tagline": "From Theory to Implementation",
    "academicSession": "2026-27",
    "lastUpdated": "2026-10-21T02:30:00+05:30",
    "notice": "Sample demonstration data. Replace with official cohort records as required."
  },
  "projects": [
    {
      "id": "T001",
      "teamNumber": 1,
      "teamName": "Algorithm Architects",
      "verificationStatus": "verified",
      "submittedAt": "2026-09-02T17:31:33+05:30",
      "problemStatement": "Short problem summary shown on the main card.",
      "fullDescription": "Complete detailed problem statement and objective shown on detail page.",
      "dataset": {
        "name": "Crop_recommendation.csv",
        "fileName": "Crop_recommendation.csv",
        "sourceUrl": "https://www.kaggle.com/datasets/atharvaingle/crop-recommendation-dataset",
        "targetVariable": "label"
      },
      "members": [
        {
          "name": "Student Name",
          "enrollmentNumber": "CSJMA23001390035"
        }
      ],
      "links": {
        "github": "https://github.com/example/repo",
        "colab": "https://colab.research.google.com/drive/example",
        "youtube": "https://www.youtube.com/watch?v=example",
        "dataset": "https://www.kaggle.com/datasets/atharvaingle/crop-recommendation-dataset"
      }
    }
  ]
}
```

### 1. Replacing Team Information with Real Data
Open `data/projects.json` and replace the placeholder teams in the `"projects"` array with your actual student submissions. Keep the field names identical.

### 2. Adding a New Team
Append a new JSON object into the `"projects"` array:
```json
{
  "id": "T015",
  "teamNumber": 15,
  "teamName": "Quantum Classifiers",
  "verificationStatus": "verified",
  "submittedAt": "2026-10-21T10:00:00+05:30",
  "problemStatement": "Summary of your machine learning classification problem.",
  "fullDescription": "Full technical description, preprocessing pipeline, and model metrics.",
  "dataset": {
    "name": "Iris Flower Dataset",
    "fileName": "iris.csv",
    "sourceUrl": "https://archive.ics.uci.edu/dataset/53/iris",
    "targetVariable": "species"
  },
  "members": [
    {
      "name": "Aarav Sharma",
      "enrollmentNumber": "CSJMA23001390060"
    },
    {
      "name": "Ishita Patel",
      "enrollmentNumber": "CSJMA23001390061"
    }
  ],
  "links": {
    "github": "https://github.com/your-username/repo",
    "colab": "https://colab.research.google.com/drive/your-notebook",
    "youtube": "https://www.youtube.com/watch?v=your-video",
    "dataset": "https://archive.ics.uci.edu/dataset/53/iris"
  }
}
```

### 3. Updating Verification Status
Set `"verificationStatus"` to either:
- `"verified"`: Highlights with a green badge and appears under the Verified Submissions filter.
- `"pending"`: Highlights with an amber badge and appears under Pending Verification.

### 4. Handling Missing or Unsubmitted Links
If a team has not submitted a GitHub repository, Colab notebook, or YouTube video yet, simply set the corresponding property to an empty string `""` or omit it. The application detects empty links automatically and will **never** display broken buttons.

---

## 🌐 Running Locally

Modern browsers block JavaScript `fetch()` calls when opening HTML files directly from the filesystem (`file:///`) due to standard Cross-Origin Resource Sharing (CORS) security policies. **Do not double-click `index.html` directly.**

Use any of the lightweight static development servers below:

### Option A: VS Code Live Server (Recommended)
1. Open the `ML-ASSIGNMENT` folder in **Visual Studio Code**.
2. Install the **Live Server** extension (by Ritwick Dey).
3. Right-click `index.html` and click **"Open with Live Server"**.
4. The site will launch automatically at `http://127.0.0.1:5500/`.

### Option B: Python Built-in HTTP Server
In your terminal or PowerShell within the project directory:
```bash
# Python 3
python -m http.server 8000
```
Open `http://localhost:8000` in your web browser.

### Option C: Node.js `npx serve` (No install required)
```bash
npx serve .
```

---

## 🚢 Deployment Instructions

Because this project is 100% static, it can be deployed for free in under two minutes:

### Deploying to GitHub Pages
1. Push this repository to GitHub.
2. In your GitHub repository, navigate to **Settings** > **Pages**.
3. Under **Build and deployment**:
   - Source: **Deploy from a branch**
   - Branch: `main` (or `master`)
   - Folder: `/ (root)`
4. Click **Save**. GitHub Pages will provide a live URL (e.g., `https://<username>.github.io/<repo-name>/`).

### Deploying to Vercel
1. Install Vercel CLI via `npm i -g vercel` or connect your GitHub repository at [vercel.com](https://vercel.com).
2. Run `vercel` in the project root.
3. Accept the default settings. Because it is a static site, no build command is needed.

### Deploying to Netlify
1. Drag and drop the `ML-ASSIGNMENT` folder onto [app.netlify.com/drop](https://app.netlify.com/drop).
2. Your showcase is live immediately.

---

## ⚡ Real-Time Live Visitor Presence (Firebase Realtime Database)

The green badge in the header (e.g. `● 1 LIVE`) displays the **actual number of visitors actively browsing the website in real time** across all connected browser tabs.

### How it Works
1. When a user opens any page (`index.html` or `project.html`), [`js/visitor-presence.js`](js/visitor-presence.js) establishes a lightweight connection with Firebase Realtime Database.
2. The client registers an active session node under `/presence/sessions/<unique_id>` with server timestamps (`joinedAt`, `lastActive`).
3. Connection state is monitored via `.info/connected`.
4. The server-enforced `onDisconnect().remove()` guarantee ensures that as soon as a visitor closes their browser tab or loses internet connection, their session is removed instantly from the database.
5. Clients subscribe to `/presence/sessions` to receive instant, real-time updates as visitors join or leave. Stale sessions (>3 minutes inactive) are safely filtered.
6. If the service is unconfigured or temporarily disconnected, the badge gracefully displays `-- Live` rather than any fake or simulated counts.

### Firebase Setup Steps (Quick 3-Minute Setup)
1. **Enable Anonymous Authentication**:
   - In the Firebase Console, navigate to **Build** > **Authentication** > **Sign-in method**.
   - Click on **Anonymous**, toggle **Enable**, and click **Save**.
2. **Apply Security Rules**:
   - Go to **Build** > **Realtime Database** > **Rules** tab.
   - Paste the contents of [`database.rules.json`](database.rules.json) and click **Publish**:
   ```json
   {
     "rules": {
       "presence": {
         "sessions": {
           ".read": "auth != null",
           ".indexOn": ["lastActive", "uid"],
           "$session_id": {
             ".write": "auth != null && (!data.exists() || data.child('uid').val() === auth.uid)",
             ".validate": "newData.hasChildren(['uid', 'joinedAt', 'lastActive'])",
             "uid": {
               ".validate": "newData.val() === auth.uid && (!data.exists() || data.val() === newData.val())"
             },
             "joinedAt": {
               ".validate": "newData.isNumber() && (!data.exists() || data.val() === newData.val())"
             },
             "lastActive": {
               ".validate": "newData.isNumber()"
             },
             "$other": {
               ".validate": false
             }
           }
         }
       },
       "$other": {
         ".read": false,
         ".write": false
       }
     }
   }
   ```
3. **Copy Web App Configuration**:
   - In Project Settings (gear icon) > **General** > **Your apps** > click the Web icon (`</>`) to register your web app.
   - Copy the configuration object and paste it into [`js/firebase-config.js`](js/firebase-config.js):
   ```javascript
   window.FIREBASE_CONFIG = {
     apiKey: "AIzaSy...",
     authDomain: "your-project-id.firebaseapp.com",
     databaseURL: "https://your-project-id-default-rtdb.firebaseio.com",
     projectId: "your-project-id",
     storageBucket: "your-project-id.firebasestorage.app",
     messagingSenderId: "123456789",
     appId: "1:123456789:web:abcdef"
   };
   ```
4. **Deploy or Test**:
   - Open your website in a browser. The counter will seamlessly authenticate in the background and show active visitors in real time!

---

## 🎓 Academic Programme Details

- **Institution**: Chhatrapati Shahu Ji Maharaj University (CSJMU), Kanpur
- **Faculty**: School of Basic Sciences
- **Programme**: M.Sc. Mathematics with Artificial Intelligence & Data Science
- **Course**: Machine Learning Practical Assignment
- **Module Focus**: Data Preprocessing, Normalization, Missing Value Imputation, Variance Thresholding, Mutual Information & Feature Selection
