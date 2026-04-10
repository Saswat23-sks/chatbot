# SimpleBot AI Companion 🤖✨

SimpleBot is a high-performance, emotionally intelligent hybrid chatbot that combines the speed of rule-based pattern matching with the deep reasoning capabilities of Google's Gemini AI.

![SimpleBot Preview](https://picsum.photos/seed/simplebot/1200/600)

## 🌟 Key Features

### 🧠 Hybrid Intelligence Engine
- **Instant Responses:** Uses a fast rule-based engine for common greetings and simple queries.
- **Deep Reasoning:** Falls back to **Gemini 3.1 Pro** for complex analysis, creative writing, and technical problem-solving.
- **Real-time Grounding:** Integrated Google Search grounding ensures the bot provides up-to-date information from the web.

### 🎭 Dynamic Personas & EQ
- **9 Unique Personas:** Switch between Witty, Empathetic, Formal, Sarcastic, Helpful Assistant, Curious Explorer, Analytical, Philosophical, and Humorous.
- **Sentiment Analysis:** Automatically detects user mood (Positive, Neutral, Negative) and adjusts response tone accordingly.
- **Mood-Adaptive Music:** Background ambient tracks that shift to match the emotional state of the conversation.

### 📁 Advanced File Capabilities
- **Analyze Anything:** Upload and process Images, PDFs, CSVs, and Excel spreadsheets (up to 10MB).
- **On-Demand Generation:** Ask the bot to generate custom **PDF reports** or **Excel data sheets** which are created instantly via AI function calling.

### 🎙️ Live Voice Chat
- **Real-time Audio:** Low-latency voice interaction powered by Gemini's native audio capabilities.
- **Reactive UI:** A fluid, animated avatar that visually responds to speech patterns and emotional cues.

## 🚀 Tech Stack

- **Frontend:** React 19, Vite, TypeScript
- **Styling:** Tailwind CSS 4, Motion (framer-motion)
- **AI:** Google Gemini API (`@google/genai`)
- **Icons:** Lucide React
- **Document Processing:** jsPDF, XLSX (SheetJS)
- **Notifications:** Sonner

## 🛠️ Getting Started

### Prerequisites
- Node.js (v18+)
- A Google Gemini API Key (Get one at [aistudio.google.com](https://aistudio.google.com/app/apikey))

### Installation
1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file in the root and add your API key:
   ```env
   GEMINI_API_KEY=your_api_key_here
   ```

### Development
Run the development server:
```bash
npm run dev
```
The app will be available at `http://localhost:3000`.

## 📖 Slash Commands

- `/help` - Show available commands
- `/persona [name]` - Change the bot's personality
- `/clear` - Wipe chat history
- `/spark` - Trigger a creative AI spark
- `/mood` - Show currently detected sentiment
- `/joke` - Get a quick joke from the rule engine

## 🛡️ Security & Performance
- **Memory Management:** Automatic revocation of Blob URLs to prevent memory leaks during file generation.
- **Privacy:** Sensitive file data is filtered before local persistence.
- **Efficiency:** Context windowing (last 10 messages) ensures fast responses and optimal token usage.

## 📄 License
MIT License - feel free to use and remix!
