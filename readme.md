# NoteNest 📝

**NoteNest** is a sleek and powerful note-taking extension designed to live in your browser's side panel. Capture your thoughts, format your ideas, and organize your knowledge without ever leaving your current tab.

## ✨ Key Features

NoteNest is packed with features to make your note-taking experience as smooth and efficient as possible.

  * **✍️ Rich Text Editor:** Go beyond plain text. NoteNest's editor allows you to:

      * **Style Text:** **Bold**, *Italic*, and \<u\>Underline\</u\> your content.
      * **Add Lists:** Organize thoughts with bullet points.
      * **Customize Fonts:** Choose from a wide range of font sizes.
      * **Add Color:** Use a color picker for text and multiple preset colors for highlighting.

  * **🗂️ Seamless Organization:** Keep your notes tidy and easy to find.

      * **Folders:** Group related notes into folders. You can easily add new folders and rename existing ones with a simple right-click.
      * **Tags:** Add custom tags to your notes for granular, cross-folder categorization.
      * **Favorites:** Mark important notes with a star for quick access.

  * **⚡️ Fast & Efficient Workflow:**

      * **Instant Search:** Quickly find the note you're looking for with a powerful search that filters your notes in real-time.
      * **Auto-Save:** Never lose your work. Notes are automatically saved to your local storage seconds after you stop typing.
      * **Word Count:** Keep track of your note's length with a live word counter.

  * **🧠 Smart & Secure:**

      * **Automatic Link Conversion:** Paste a URL and NoteNest will automatically convert it into a clickable link.
      * **Secure by Design:** All notes are saved locally on your machine using `chrome.storage`. The editor also includes built-in HTML sanitization to protect against malicious content.

## 📸 Screenshots

![alt text](docs/NoteNest1.png)

![alt text](docs/NoteNest2.png)

![alt text](docs/NoteNestBanner.png)


## 🚀 Installation

### For End-Users (Recommended)

*(Once you publish your extension, you can update this section)*

1.  Install NoteNest from the [Chrome Web Store](https://www.google.com/search?q=link-to-your-extension).
2.  Click the extensions icon in your browser and pin NoteNest for easy access.
3.  Open the side panel and start taking notes\!

### For Developers

If you want to run the extension from the source code:

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/your-username/NoteNest.git
    ```
2.  **Install dependencies:**
    ```bash
    npm install
    ```
3.  **Build the project (if you have a build step for Tailwind CSS):**
    ```bash
    npm run build
    ```
4.  **Load the extension in your browser:**
      * Open Google Chrome or Microsoft Edge.
      * Navigate to `chrome://extensions`.
      * Enable **"Developer mode"** in the top-right corner.
      * Click on **"Load unpacked"**.
      * Select the `dist` folder (or the root project folder if you don't have a build step).

## 💡 How to Use

  * **Create a Note:** Click the `+ New Note` button in the sidebar.
  * **Format Text:** Use the toolbar at the top of the editor to apply formatting.
  * **Organize:**
      * Select a folder from the dropdown at the bottom of the editor.
      * Type a tag in the input field and press `Enter` to add it.
      * Click the star icon to mark a note as a favorite.
  * **Manage Folders:**
      * Click the `+` icon next to the "Folders" heading to create a new folder.
      * Right-click on any folder (except "All Notes") to bring up a context menu to rename it.

## ⌨️ Keyboard Shortcuts

*(Based on your `sidepanel.js` listeners, you can configure these in `manifest.json`)*

  * **New Note:** `Ctrl+Shift+N` (Example)
  * **Focus Search Bar:** `Ctrl+Shift+F` (Example)

## 🛠️ Technology Stack

  * **HTML5**
  * **CSS3** with **Tailwind CSS**
  * **Vanilla JavaScript (ES6+)**
  * **Web Extensions API**

## 🤝 Contributing

Contributions are welcome\! If you have ideas for new features or have found a bug, please open an issue or submit a pull request.

1.  Fork the Project
2.  Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3.  Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4.  Push to the Branch (`git push origin feature/AmazingFeature`)
5.  Open a Pull Request

## 📄 License

This project is licensed under the MIT License. See the `LICENSE` file for details.