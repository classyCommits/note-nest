# NoteNest 📝

NoteNest is a feature-rich note-taking application designed to live in your browser's side panel, providing a seamless and integrated workspace for capturing thoughts, organizing ideas, and formatting notes without leaving your current tab.

![NoteNest Screenshot](Screenshot%20(60).png)

---

## ✨ Key Features

NoteNest is packed with features designed for an efficient and pleasant note-taking experience.

#### Rich Text Editing
* **Headings:** Apply H1 and H2 styles with pre-defined font sizes for clear document structure.
* **Standard Formatting:** Toggle **Bold**, *Italic*, and <u>Underline</u> for selected text, with logic that prevents conflicts with heading styles.
* **Font Control:** Incrementally change font size with `+` and `-` buttons or type a specific size directly into an input box.
* **Color Tools:** Apply any color to selected text using a color picker.
* **Highlighting:** Use a dropdown menu to select from three pre-defined, readable highlight colors (Yellow, Red, Blue).
* **Lists:** Create bulleted lists for organized content.

#### Note Organization
* **Folders:** Organize notes into custom folders. New folders can be created, and existing folders can be renamed via a right-click context menu.
* **Folder View:** Click on a folder to see all notes within it displayed in a clean, grid-based view.
* **Tagging:** Add multiple tags to any note for flexible, cross-folder categorization.
* **Favorites:** Mark important notes as favorites with a star icon for quick identification.
* **Recent Notes:** The sidebar automatically displays your 3 most recently modified notes for quick access.

#### Efficient Workflow
* **Collapsible Sidebar:** The navigation panel containing folders and notes can be toggled open or closed for a focused writing experience.
* **Global Search:** A powerful search bar allows you to find notes by their title or content instantly.
* **Auto-Linking:** URLs pasted into the editor are automatically converted into clickable links.
* **Clickable Links:** Links within a note are active and open in a new browser tab when clicked.
* **Auto-Save:** Notes are saved automatically moments after you stop typing, with a "Last Saved" timestamp in the footer.
* **Word Count:** A real-time word count is displayed in the editor footer.

#### Browser Integration
* **Chrome Side Panel:** Built as a modern Chrome Extension that opens in the browser's side panel.
* **Global Shortcuts:** Use keyboard shortcuts like `Alt+N` to create a new note from anywhere in the browser.

---

## 🛠️ Tech Stack

* **Platform:** Chrome Extension API (Manifest V3)
* **Frontend:** HTML5, CSS3, JavaScript (ES6 Classes)
* **Styling:** [Tailwind CSS](https://tailwindcss.com/) for a utility-first styling workflow.
* **Animation:** [GSAP (GreenSock Animation Platform)](https://gsap.com/) for smooth UI animations.

---

## 🚀 Installation & Setup

To get a local copy up and running, follow these simple steps.

1.  **Clone the Repository**
    ```sh
    git clone [https://github.com/your-username/notenest.git](https://github.com/your-username/notenest.git)
    ```
2.  **Install Dependencies**
    This project uses Tailwind CSS. You will need Node.js and npm installed.
    ```sh
    npm install
    ```
3.  **Build the CSS**
    Run the build command to compile `input.css` into `sidepanel.css`.
    ```sh
    # For a single build
    npm run build

    # Or to watch for changes continuously during development
    npm run watch
    ```
    *(You may need to configure the build command in your `package.json`)*

4.  **Load the Extension in Chrome**
    * Open Google Chrome and navigate to `chrome://extensions`.
    * Enable "Developer mode" using the toggle in the top-right corner.
    * Click the "Load unpacked" button.
    * Select the directory containing your project files (the folder with `manifest.json`).
    * The NoteNest icon should now appear in your browser's toolbar.

---

## 📂 File Structure

The project is organized into logical folders and files: