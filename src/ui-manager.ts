/*
 * UI Manager
 * Handles Speech Recognition, Chat History (Recent), and Dropdown Menus.
 */

export class UIManager {
  private chatInput: HTMLTextAreaElement;
  private recentContainer: HTMLDivElement | null;
  private placeholders = [
    "Ask about Enrique's AI journey...",
    "Show me his Cloud Tech Impact award 🏆",
    "What's his vision for Agentic AI? 🤖",
    "Analyze his fit for an AI Lead role...",
    "Show me the Hall of Mastery 🖼️",
    "What do Googlers say about him? ✨"
  ];
  private currentPlaceholderIndex = 0;

  constructor() {
    this.chatInput = document.getElementById("chatInput") as HTMLTextAreaElement;
    this.recentContainer = document.getElementById("recent-chats-container") as HTMLDivElement;
    
    this.initPlaceholderRotation();
    this.initSpeechRecognition();
    this.initHistoryAndActions();
    this.renderRecentChats();
  }

  /**
   * Rotates placeholders in the chat input.
   */
  private initPlaceholderRotation() {
    if (!this.chatInput) return;

    setInterval(() => {
      this.currentPlaceholderIndex = (this.currentPlaceholderIndex + 1) % this.placeholders.length;
      this.chatInput.placeholder = `Message Enrique's Agent... (Try: "${this.placeholders[this.currentPlaceholderIndex]}")`;
    }, 4000);
  }

  /**
   * Initializes Speech Recognition (Voice-to-Text).
   */
  private initSpeechRecognition() {
    const micBtn = document.getElementById("mic-btn");
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!micBtn || !SpeechRecognition) {
      if (micBtn) micBtn.style.opacity = "0.5";
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.interimResults = false;

    micBtn.addEventListener("click", () => {
      try {
        recognition.start();
        micBtn.classList.add("recording");
        (micBtn.querySelector(".material-symbols-outlined") as HTMLElement).textContent = "graphic_eq";
        
        // Visual feedback
        this.chatInput.placeholder = "Listening...";
      } catch (e) {
        console.warn("Speech recognition already started or error:", e);
      }
    });

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      if (this.chatInput) {
        this.chatInput.value = transcript;
        this.chatInput.dispatchEvent(new Event("input"));
      }
    };

    recognition.onend = () => {
      micBtn.classList.remove("recording");
      (micBtn.querySelector(".material-symbols-outlined") as HTMLElement).textContent = "mic";
      this.initPlaceholderRotation(); // Restore placeholder
    };

    recognition.onerror = (event: any) => {
      console.error("Speech recognition error", event.error);
      micBtn.classList.remove("recording");
    };
  }

  /**
   * Initializes History and More Actions buttons.
   */
  private initHistoryAndActions() {
    const historyBtn = document.getElementById("history-btn");
    const moreActionsBtn = document.getElementById("more-actions-btn");
    const profileActionsBtn = document.getElementById("profile-actions-btn");

    if (historyBtn) {
      historyBtn.addEventListener("click", () => {
        alert("Chat History feature coming soon! Your recent chats are saved in the sidebar.");
      });
    }

    if (moreActionsBtn) {
      moreActionsBtn.addEventListener("click", () => {
        const menu = ["Clear Chat", "Settings", "Export PDF"];
        console.log("Showing more actions menu:", menu);
        alert("More Actions: \n- Clear Chat\n- Settings\n- Export PDF\n(Coming Soon!)");
      });
    }

    if (profileActionsBtn) {
      profileActionsBtn.addEventListener("click", () => {
        alert("Account Settings & Profile Management\n(Coming Soon!)");
      });
    }
  }

  /**
   * Saves a message summary to the recent chats.
   */
  public saveToHistory(message: string) {
    if (!message || message.length < 5) return;

    const history = JSON.parse(localStorage.getItem("enriq_chat_history") || "[]");
    
    // Check if this title already exists to avoid duplicates in one session
    const title = message.length > 25 ? message.substring(0, 25) + "..." : message;
    if (history.length > 0 && history[0].title === title) return;

    history.unshift({
      id: Date.now(),
      title: title,
      timestamp: new Date().toISOString()
    });

    // Keep only last 8
    localStorage.setItem("enriq_chat_history", JSON.stringify(history.slice(0, 8)));
    this.renderRecentChats();
  }

  /**
   * Renders the recent chats in the sidebar.
   */
  private renderRecentChats() {
    if (!this.recentContainer) return;

    const history = JSON.parse(localStorage.getItem("enriq_chat_history") || "[]");
    
    if (history.length === 0) {
      this.recentContainer.innerHTML = `
        <div class="sidebar-item" style="pointer-events: none; opacity: 0.6;">
          <span class="material-symbols-outlined">history</span>
          <span>No recent chats yet</span>
        </div>
      `;
      return;
    }

    this.recentContainer.innerHTML = history.map((item: any) => `
      <div class="sidebar-item" data-id="${item.id}" style="cursor: pointer;">
        <span class="material-symbols-outlined">chat_bubble_outline</span>
        <span>${item.title}</span>
      </div>
    `).join("");

    // Add click events to chips if they should reload (demo just reloads currently)
    const items = this.recentContainer.querySelectorAll(".sidebar-item");
    items.forEach(item => {
      item.addEventListener("click", () => {
        if (confirm("Would you like to reload this session? (Demo currently just starts a new one)")) {
          window.location.reload();
        }
      });
    });
  }
}
