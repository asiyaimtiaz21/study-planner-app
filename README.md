# Study Planner

## Project Description

Study Planner is a simple web app designed to help students organize their study time. You can add assignments, track your progress, and plan focused study sessions all in one place. It’s made to be easy to use and works right in your browser.

## Planned Features

- **Assignment Tracker**: Keep track of your assignments — add new ones, mark them as done, and see their due dates and subjects at a glance.  
- **Study Session Timer**: A Pomodoro-style timer (25 minutes work / 5 minutes break) to help you stay focused while studying.  
- **Subject Manager**: Organize your assignments and sessions by subject, like Math or History, so it’s easier to find what you need.  
- **Progress Dashboard**: See quick stats on your work — how many assignments are done, what’s coming up, and how many study sessions you’ve completed today.  
- **Local Storage**: Everything you add stays saved in your browser, so you won’t lose your work if you refresh the page.

## Tech Stack

- HTML5 for structure and content  
- CSS3 with Flexbox and Grid for layout and styling  
- Vanilla JavaScript (ES6+) for interactivity  
- localStorage (JSON) for saving data in the browser  
- Google Fonts + Font Awesome (via CDN) for fonts and icons  
- GitHub Pages (optional) for hosting

## How to Run

Open the `index.html` file in any modern browser. No server setup or installation needed — it runs entirely in your browser.

## Project Goal

The goal of this midterm project is to build a working Study Planner app that shows off my HTML, CSS, and JavaScript skills. The focus is on creating a usable, organized interface, managing data in the browser, and building something students would actually use.

---

## Additional Documentation (Base Tier Requirements)

### Known Bugs / Limitations

- `formatDuration` displays "0m" when no sessions exist today (intentional for readability).  
- Sessions rely on browser localStorage. clearing browser data will delete saved sessions.  
- The timer does not continue if the page is refreshed or closed mid-session.  

### What I Learned

Working on this project with Claude Code helped me see the value of AI for things like planning, debugging, and iterating on features quickly. I learned to balance AI suggestions with my own judgment. For example, I chose to to keep all code in `script.js` to lessen complexity. Debugging sessions together with AI highlighted subtle issues, like defensive checks for missing fields in localStorage data. I also made sure to use incremental development, building features step by step and testing as I went. Overall, the project showed me how AI can speed up coding while still requiring incorporating decision making skills.

## AI-Powered Feature: Generate Study Advice

This project includes an AI feature called **Generate Study Advice**.

It uses a locally running Ollama model, `gemma3:1b`, to analyze the user’s pending assignments stored in `localStorage`. When the user clicks a button, the app sends the assignment list to the model through a REST API call and receives a short study recommendation in return.

The AI responds with 2–4 sentences of prioritized study advice which helps users decide what to focus on first.

### How it works:
- Reads assignments from `localStorage`
- Filters pending tasks
- Sends them to Ollama at:
  `http://localhost:11434/api/generate`
- Uses model: `gemma3:1b`
- Displays response in the UI when the button is clicked

### Purpose
This feature shows how AI models can be integrated into real web applications to create personalized, context-aware suggestions based on the user data.
