// chat-client.js - Chat System Module dengan Edit & Delete

import { playNotificationSound, showBrowserNotification } from '../ui/ui-helpers.js';

let socket;
let currentChatNumber = null;
let chatConversations = [];
let unreadCount = 0;
let activeChatTab = "active";

/**
 * Initializes Socket.IO connection
 */
export function initSocketConnection() {
  console.log("🚀 Initializing Socket connection...");

  if (typeof io === "undefined") {
    console.error("❌ Socket.IO not loaded!");
    return;
  }

  socket = io();

  socket.on("connect", () => {
    console.log("✅ Socket connected successfully! ID:", socket.id);
    socket.emit("test", { message: "Frontend connected" });
  });

  socket.on("disconnect", () => {
    console.log("❌ Socket disconnected");
  });

  socket.on("connect_error", (error) => {
    console.error("❌ Socket connection error:", error);
  });

  socket.on("newIncomingMessage", (data) => {
    console.log("📨 RECEIVED newIncomingMessage:", data);
    handleNewIncomingMessage(data);
  });

  socket.on("updateUnreadCount", () => {
    console.log("🔄 Received updateUnreadCount signal");
    updateUnreadCount();
    loadChatConversations();
  });

  // New socket listeners for edit and delete
  socket.on("messageEdited", (data) => {
    console.log("✏️ Message edited:", data);
    handleMessageEdited(data);
  });

  socket.on("messageDeleted", (data) => {
    console.log("🗑️ Message deleted:", data);
    handleMessageDeleted(data);
  });

  socket.on("testResponse", (data) => {
    console.log("🧪 Test response received:", data);
  });

  socket.onAny((eventName, ...args) => {
    console.log("📡 Socket event received:", eventName, args);
  });

  socket.on("messageUnsent", (data) => {
  console.log("🔄 Message unsent:", data);
  if (currentChatNumber === data.fromNumber) {
    loadChatHistory(data.fromNumber);
  }
  loadChatConversations(activeChatTab);
});
}

/**
 * Handle message edited event
 */
function handleMessageEdited(data) {
  const { messageId, fromNumber, newMessage } = data;
  
  // Update in current chat view if it's open
  if (currentChatNumber === fromNumber) {
    const messageElement = document.querySelector(`[data-message-id="${messageId}"]`);
    if (messageElement) {
      const textContent = messageElement.querySelector('.text-content');
      if (textContent) {
        textContent.innerHTML = newMessage + ' <span class="edited-label">(diedit)</span>';
      }
    }
  }
  
  // Refresh conversation list to update last message
  loadChatConversations(activeChatTab);
}

/**
 * Handle message deleted event
 */
function handleMessageDeleted(data) {
  const { messageId, fromNumber } = data;
  
  // Remove from current chat view if it's open
  if (currentChatNumber === fromNumber) {
    const messageElement = document.querySelector(`[data-message-id="${messageId}"]`);
    if (messageElement) {
      messageElement.remove();
    }
  }
  
  // Refresh conversation list to update last message
  loadChatConversations(activeChatTab);
}

/**
 * Handles new incoming message
 */
function handleNewIncomingMessage(messageData) {
  console.log("📬 Handling new incoming message:", messageData);

  updateUnreadCount();
  playNotificationSound();
  showBrowserNotification(messageData);
  loadChatConversations(activeChatTab);

  if (currentChatNumber === messageData.fromNumber) {
    console.log("📱 Reloading active chat:", messageData.fromNumber);
    loadChatHistory(messageData.fromNumber);
  } else {
    console.log("📱 Message from different chat:", messageData.fromNumber, "current:", currentChatNumber);
  }

  console.log("✅ New message handled successfully");
}

/**
 * Initializes chat system
 */
export function initChatSystem() {
  console.log("💬 Chat system initialization started...");

  initSocketConnection();
  initChatEventListeners();

  setTimeout(() => {
    console.log("📋 Loading initial chat data...");
    loadChatConversations();
    updateUnreadCount();
  }, 1000);

  console.log("✅ Chat system initialization complete");
}

/**
 * Initializes chat event listeners
 */
function initChatEventListeners() {
  const chatSearch = document.getElementById("chatSearch");
  if (chatSearch) {
    chatSearch.addEventListener("input", function () {
      const searchTerm = this.value.toLowerCase();
      filterChatConversations(searchTerm);
    });
  }

  const sendReplyBtn = document.getElementById("sendReplyBtn");
  if (sendReplyBtn) {
    sendReplyBtn.addEventListener("click", sendReply);
  }

const replyInput = document.getElementById("replyInput");
if (replyInput) {
  // Set initial height
  replyInput.style.height = "42px"; // Tinggi awal 2 baris
  
  // Kirim dengan Enter, baris baru dengan Shift+Enter
  replyInput.addEventListener("keydown", function (e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendReply();
    }
  });

// Auto-resize textarea
    replyInput.addEventListener("input", function () {
    this.style.height = "42px"; // Reset ke tinggi minimal (2 baris)
    this.style.height = Math.min(this.scrollHeight, 105) + "px"; // Max 105px
  });
}

  const refreshChatBtn = document.getElementById("refreshChatBtn");
  if (refreshChatBtn) {
    refreshChatBtn.addEventListener("click", function () {
      if (currentChatNumber) {
        loadChatHistory(currentChatNumber);
      }
      loadChatConversations(activeChatTab);
    });
  }

  const endChatBtn = document.getElementById("endChatBtn");
  if (endChatBtn) {
    endChatBtn.addEventListener("click", endChat);
  }

  document.querySelectorAll(".chat-tab-button").forEach((button) => {
    button.addEventListener("click", () => {
      document.querySelectorAll(".chat-tab-button").forEach((btn) => btn.classList.remove("active"));
      button.classList.add("active");
      activeChatTab = button.dataset.status;
      loadChatConversations(activeChatTab);
    });
  });

  // File attachment
  const attachBtn = document.getElementById("attachFileBtn");
  const chatFileInput = document.getElementById("chatFileInput");
  if (attachBtn && chatFileInput) {
    attachBtn.addEventListener("click", (e) => {
      e.preventDefault();
      chatFileInput.click();
    });

    chatFileInput.addEventListener("change", handleChatFileSelection);
  }
}

/**
 * Handles file selection for chat
 */
function handleChatFileSelection() {
  const chatFileInput = document.getElementById("chatFileInput");
  const chatInputContainer = document.querySelector(".chat-input-container");
  const replyInput = document.getElementById("replyInput");
  
  let selectedFilePreviewEl = document.querySelector(".chat-selected-file");
  if (selectedFilePreviewEl) selectedFilePreviewEl.remove();

  if (!chatFileInput.files.length) return;
  const f = chatFileInput.files[0];

  const wrap = document.createElement("div");
  wrap.className = "chat-selected-file";

  const name = document.createElement("span");
  name.className = "file-name";
  name.textContent = f.name + ` (${Math.round(f.size / 1024)} KB)`;
  wrap.appendChild(name);

  if (f.type.startsWith("image/")) {
    const img = document.createElement("img");
    img.className = "thumb";
    img.src = URL.createObjectURL(f);
    img.onload = () => URL.revokeObjectURL(img.src);
    wrap.prepend(img);
  }

  const removeBtn = document.createElement("button");
  removeBtn.type = "button";
  removeBtn.className = "remove";
  removeBtn.innerHTML = "&times;";
  removeBtn.onclick = () => {
    chatFileInput.value = "";
    wrap.remove();
  };
  wrap.appendChild(removeBtn);

  chatInputContainer.insertBefore(wrap, replyInput);
}

/**
 * Loads chat conversations
 */
async function loadChatConversations(status = "active") {
  console.log(`📋 Loading chat conversations with status: ${status}...`);
  try {
    const response = await fetch(`/api/chats/conversations?status=${status}`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();

    if (result.success && Array.isArray(result.data)) {
      chatConversations = result.data.map((conv) => ({
        phoneNumber: conv.fromNumber,
        contactName: conv.contactName || conv.fromNumber,
        lastMessage: conv.lastMessage || "",
        lastMessageTime: conv.lastTimestamp,
        direction: conv.direction,
        unreadCount: conv.unreadCount || 0,
      }));
      renderChatConversations();
    } else {
      console.error("❌ Invalid data format from server:", result.message || result);
      chatConversations = [];
      renderChatConversations();
    }
  } catch (error) {
    console.error("❌ Error in loadChatConversations:", error);
    chatConversations = [];
    renderChatConversations();
  }
}

/**
 * Renders chat conversations
 */
function renderChatConversations() {
  const chatList = document.getElementById("chatList");
  if (!chatList) return;

  chatList.innerHTML = "";

  if (chatConversations.length === 0) {
    chatList.innerHTML = '<div class="no-chat-selected" style="margin: 40px; margin-bottom: 0px;"><i class="fa-solid fa-comments"></i><p>Tidak ada percakapan</p></div>';
    return;
  }

  chatConversations.forEach((conversation) => {
    const chatItem = document.createElement("div");
    chatItem.className = "chat-item";
    if (conversation.unreadCount > 0) {
      chatItem.classList.add("unread");
    }

    chatItem.setAttribute("data-phone-number", conversation.phoneNumber);

    const lastMessageTime = new Date(conversation.lastMessageTime).toLocaleString("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
      day: "2-digit",
      month: "2-digit",
    });

    chatItem.innerHTML = `
      <div class="chat-item-header">
        <div class="chat-contact-name">${conversation.contactName}</div>
        <div class="chat-time">${lastMessageTime}</div>
      </div>
      <div class="chat-preview">
        ${conversation.lastMessage}
        ${conversation.unreadCount > 0 ? `<span class="unread-count">${conversation.unreadCount}</span>` : ""}
      </div>
    `;

    chatItem.addEventListener("click", () => {
      selectConversation(conversation.phoneNumber, conversation.contactName);
    });

    chatList.appendChild(chatItem);
  });
}

/**
 * Filters chat conversations
 */
function filterChatConversations(searchTerm) {
  const chatItems = document.querySelectorAll(".chat-item");

  chatItems.forEach((item) => {
    const contactName = item.querySelector(".chat-contact-name").textContent.toLowerCase();
    const chatPreview = item.querySelector(".chat-preview").textContent.toLowerCase();

    if (contactName.includes(searchTerm) || chatPreview.includes(searchTerm)) {
      item.style.display = "block";
    } else {
      item.style.display = "none";
    }
  });
}

/**
 * Selects a conversation
 */
async function selectConversation(phoneNumber, contactName) {
  currentChatNumber = phoneNumber;

  document.getElementById("activeContactName").textContent = contactName;
  document.getElementById("activeContactNumber").textContent = phoneNumber;

  const chatInputArea = document.getElementById("chatInputArea");
  if (chatInputArea) {
    chatInputArea.style.display = "block";
  }

  document.querySelectorAll(".chat-item").forEach((item) => {
    item.classList.remove("active");
  });

  const chatItems = document.querySelectorAll(".chat-item");
  chatItems.forEach((item) => {
    const contactNameEl = item.querySelector(".chat-contact-name");
    if (contactNameEl && contactNameEl.textContent === contactName) {
      item.classList.add("active");
      item.classList.remove("unread");
    }
  });

  try {
    await fetch(`/api/chats/mark-read/${phoneNumber}`, { method: "PUT" });
  } catch (error) {
    console.error("Error marking messages as read:", error);
  }

  loadChatHistory(phoneNumber);
  updateUnreadCount();
}

/**
 * Loads chat history for a specific number
 */
async function loadChatHistory(phoneNumber) {
  try {
    const response = await fetch(`/api/chats/conversation/${phoneNumber}`);
    const result = await response.json();

    if (result.success) {
      renderChatMessages(result.data.messages);
    } else {
      console.error("Failed to load chat history:", result.message);
    }
  } catch (error) {
    console.error("Error loading chat history:", error);
  }
}

/**
 * Edit message function
 */
async function editMessage(messageId, currentText) {
  const { value: formValues } = await Swal.fire({
    title: 'Edit Pesan',
    html: `
      <textarea id="swal-input1" class="swal2-textarea" style="height: 100px;">${currentText}</textarea>
      <div style="margin-top: 15px;">
        <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
          <input type="checkbox" id="swal-input2" checked>
          <span>Kirim notifikasi koreksi ke user via WhatsApp</span>
        </label>
        <small style="color: #666; display: block; margin-top: 5px;">
          ✓ User akan menerima pesan koreksi di WhatsApp<br>
          ✗ Hanya update di dashboard admin
        </small>
      </div>
    `,
    focusConfirm: false,
    showCancelButton: true,
    confirmButtonText: 'Simpan',
    cancelButtonText: 'Batal',
    preConfirm: () => {
      const newText = document.getElementById('swal-input1').value;
      const sendNotification = document.getElementById('swal-input2').checked;
      
      if (!newText || newText.trim() === '') {
        Swal.showValidationMessage('Pesan tidak boleh kosong!');
        return false;
      }
      
      return {
        newText: newText.trim(),
        sendNotification: sendNotification
      };
    }
  });

  if (formValues) {
    try {
      let response;
      
      if (formValues.sendNotification) {
        // Edit dengan kirim notifikasi ke user
        response = await fetch(`/api/chats/message/${messageId}/with-notification`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ newMessage: formValues.newText })
        });
      } else {
        // Edit hanya di database (dashboard only)
        response = await fetch(`/api/chats/message/${messageId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ newMessage: formValues.newText })
        });
      }

      const result = await response.json();
      
      if (result.success) {
        Swal.fire({
          icon: 'success',
          title: 'Berhasil!',
          text: formValues.sendNotification 
            ? 'Pesan berhasil diedit dan koreksi terkirim ke user via WhatsApp' 
            : 'Pesan berhasil diedit di dashboard',
          timer: 3000
        });
        loadChatHistory(currentChatNumber);
      } else {
        Swal.fire('Gagal!', result.message || 'Gagal mengedit pesan', 'error');
      }
    } catch (error) {
      console.error('Error editing message:', error);
      Swal.fire('Error!', 'Terjadi kesalahan saat mengedit pesan', 'error');
    }
  }
}


/**
 * Delete message function - Updated untuk sistem baru
 */
async function deleteMessage(messageId) {
  const result = await Swal.fire({
    title: 'Hapus Pesan?',
    html: `
      <div style="text-align: left; margin: 15px 0;">
        <p><strong>Sistem akan mencoba:</strong></p>
        <ul style="margin: 10px 0; padding-left: 20px;">
          <li>✅ Hapus pesan dari WhatsApp user (jika masih fresh)</li>
          <li>📤 Jika gagal: kirim notifikasi pembatalan ke user</li>
          <li>🗑️ Hapus dari database admin</li>
        </ul>
        <small style="color: #666;">
          ℹ️ Pesan yang baru dikirim bisa dihapus langsung dari WhatsApp user.<br>
          Pesan lama akan dikirim notifikasi pembatalan.
        </small>
      </div>
    `,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: 'Ya, Hapus',
    confirmButtonColor: '#d33',
    cancelButtonText: 'Batal'
  });

  if (result.isConfirmed) {
    try {
      const response = await fetch(`/api/chats/message/${messageId}`, {
        method: 'DELETE'
      });
      
      const data = await response.json();
      
      if (data.success) {
        let successMessage = '';
        let iconType = 'success';
        
        if (data.deletedFromWhatsApp) {
          successMessage = '✅ Pesan berhasil dihapus dari WhatsApp user dan database!';
          iconType = 'success';
        } else {
          successMessage = '📤 Pesan dihapus dari database dan notifikasi pembatalan terkirim ke user.';
          iconType = 'info';
        }
        
        Swal.fire({
          icon: iconType,
          title: 'Berhasil!',
          text: successMessage,
          timer: 3000,
          timerProgressBar: true
        });
        
        loadChatHistory(currentChatNumber);
        loadChatConversations(activeChatTab);
      } else {
        Swal.fire('Gagal!', data.message || 'Gagal menghapus pesan', 'error');
      }
    } catch (error) {
      console.error('Error deleting message:', error);
      Swal.fire('Error!', 'Terjadi kesalahan saat menghapus pesan', 'error');
    }
  }
}

/**
 * Renders chat messages
 */
function renderChatMessages(messages) {
  const chatMessages = document.getElementById("chatMessages");
  if (!chatMessages) return;

  chatMessages.innerHTML = "";

  if (!messages || messages.length === 0) {
    chatMessages.innerHTML = '<div class="no-messages">Belum ada pesan dalam percakapan ini</div>';
    return;
  }

  messages.forEach((raw) => {
    const message = Object.assign({}, raw);
    let payload = message.message;
    if (typeof payload === "string") {
      try {
        payload = JSON.parse(payload);
      } catch (e) {
        /* tetap string */
      }
    }

    const mediaUrl = payload && typeof payload === "object" && (payload.url || payload.path)
      ? payload.url || payload.path
      : message.mediaUrl || null;

    let mtype = message.messageType || (payload && payload.mimetype
      ? payload.mimetype.startsWith("image/") ? "image"
        : payload.mimetype.startsWith("video/") ? "video"
        : "document"
      : "chat");

    const messageDiv = document.createElement("div");
    messageDiv.className = `message ${message.direction === "in" ? "incoming" : "outgoing"}`;
    messageDiv.setAttribute("data-message-id", message.id);

    const messageTime = new Date(message.timestamp).toLocaleString("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
      day: "2-digit",
      month: "2-digit",
    });

    let messageBubbleContent = "";
    
    // Add message actions (edit/delete) for outgoing chat messages
    const canEditDelete = message.direction === "out" && mtype === "chat";
    const messageActions = canEditDelete ? `
      <div class="message-actions">
        <button class="message-action-btn edit-btn" onclick="window.editChatMessage(${message.id}, '${(typeof payload === 'string' ? payload : '').replace(/'/g, "\\'")}')">
          <i class="fa-solid fa-edit"></i>
        </button>
        <button class="message-action-btn delete-btn" onclick="window.deleteChatMessage(${message.id})">
          <i class="fa-solid fa-trash"></i>
        </button>
      </div>
    ` : '';

    if (mtype === "image" && mediaUrl) {
      messageBubbleContent = `
        <div class="message-media-container" onclick="window.showMediaModal('${mediaUrl}', 'image')">
          <img src="${mediaUrl}" class="chat-image" alt="${payload && payload.originalname ? payload.originalname : "Gambar"}">
        </div>
        ${ (payload && typeof payload === 'object' && payload.caption) || (typeof payload === 'string' && payload) ? `<div class="message-caption">${typeof payload === 'object' ? payload.caption : payload}</div>` : "" }
        <div class="message-time">${messageTime}</div>
      `;
    } else if (mtype === "video" && mediaUrl) {
      messageBubbleContent = `
        <div class="message-media-container" onclick="window.showMediaModal('${mediaUrl}', 'video')">
          <video src="${mediaUrl}" class="chat-video-preview" controls preload="metadata"></video>
        </div>
        ${ (payload && typeof payload === 'object' && payload.caption) || (typeof payload === 'string' && payload) ? `<div class="message-caption">${typeof payload === 'object' ? payload.caption : payload}</div>` : "" }
        <div class="message-time">${messageTime}</div>
      `;
    } else if ((mtype === "document" || mtype === "file") && mediaUrl) {
      const fileName = (payload && payload.originalname) || (typeof payload === "string" ? payload : "Unduh File");
      messageBubbleContent = `
        <a href="${mediaUrl}" target="_blank" download class="chat-file-link">
          <div class="file-icon"><i class="fa-solid fa-file-arrow-down"></i></div>
          <div class="file-info">
            <span class="chat-file-name">${fileName}</span>
          </div>
        </a>
        <div class="message-time">${messageTime}</div>
      `;
    } else {
  const text = typeof payload === "object"
    ? payload.caption || payload.originalname || JSON.stringify(payload)
    : payload || "";
  
  // Cek apakah pesan diedit
  const editedLabel = message.editedAt ? ' <span class="edited-label">(diedit)</span>' : '';
  
  // Cek apakah ini pesan dari user (incoming) atau admin (outgoing)
  const showActions = message.direction === "out" && mtype === "chat";
  const messageActions = showActions ? `
    <div class="message-actions">
      <button class="message-action-btn edit-btn" onclick="window.editChatMessage(${message.id}, '${(typeof payload === 'string' ? payload : '').replace(/'/g, "\\'")}')">
        <i class="fa-solid fa-edit"></i>
      </button>
      <button class="message-action-btn delete-btn" onclick="window.deleteChatMessage(${message.id})">
        <i class="fa-solid fa-trash"></i>
      </button>
    </div>
  ` : '';
  
  messageBubbleContent = `
    ${messageActions}
    <div class="text-content">${text}${editedLabel}</div>
    <div class="message-time">${messageTime}</div>
  `;
}

    messageDiv.innerHTML = `<div class="message-bubble">${messageBubbleContent}</div>`;
    chatMessages.appendChild(messageDiv);
  });

  chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Make functions available globally for onclick handlers
window.editChatMessage = editMessage;
window.deleteChatMessage = deleteMessage;

/**
 * Sends a reply message
 */
async function sendReply() {
  const replyInput = document.getElementById("replyInput");
  const chatFileInput = document.getElementById("chatFileInput");
  const sendBtn = document.getElementById("sendReplyBtn");

  if (!currentChatNumber) {
    Swal.fire("Error", "Pilih percakapan terlebih dahulu.", "error");
    return;
  }

  const caption = replyInput.value.trim();
  const file = chatFileInput.files[0];
  const hasFile = !!file;

  if (!caption && !hasFile) {
    Swal.fire("Peringatan", "Ketik pesan atau pilih file terlebih dahulu.", "warning");
    return;
  }

  replyInput.disabled = true;
  chatFileInput.disabled = true;
  sendBtn.disabled = true;

  try {
    let response;
    if (hasFile) {
      const formData = new FormData();
      formData.append("to", currentChatNumber);
      formData.append("caption", caption);
      formData.append("media", file);

      response = await fetch("/api/chats/send-media", {
        method: "POST",
        body: formData,
      });
    } else {
      response = await fetch("/api/chats/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: currentChatNumber, message: caption }),
      });
    }

    const result = await response.json();
    if (!response.ok || !result.success) {
      throw new Error(result.message || "Gagal mengirim pesan.");
    }

    replyInput.value = "";
    replyInput.style.height = "42px";
    chatFileInput.value = "";
    const selectedFilePreviewEl = document.querySelector(".chat-selected-file");
    if (selectedFilePreviewEl) selectedFilePreviewEl.remove();

    loadChatHistory(currentChatNumber);
    loadChatConversations(activeChatTab);
  } catch (e) {
    console.error(e);
    Swal.fire("Error", e.message, "error");
  } finally {
    replyInput.disabled = false;
    chatFileInput.disabled = false;
    sendBtn.disabled = false;
    replyInput.focus();
  }
}

/**
 * Ends current chat session
 */
async function endChat() {
  if (!currentChatNumber) {
    Swal.fire("Peringatan", "Pilih percakapan terlebih dahulu.", "warning");
    return;
  }

  const result = await Swal.fire({
    title: "Akhiri Sesi Chat?",
    text: "Percakapan ini akan dipindahkan ke History Chat.",
    icon: "question",
    showCancelButton: true,
    confirmButtonText: "Ya, Akhiri",
    cancelButtonText: "Batal",
  });

  if (result.isConfirmed) {
    try {
      const response = await fetch(`/api/chats/end-chat/${currentChatNumber}`, { method: "PUT" });
      const data = await response.json();

      if (data.success) {
        Swal.fire("Berhasil", "Sesi chat telah diakhiri.", "success");
        currentChatNumber = null;
        document.getElementById("activeContactName").textContent = "Pilih percakapan";
        document.getElementById("activeContactNumber").textContent = "";
        document.getElementById("chatMessages").innerHTML = '<div class="no-chat-selected"><i class="fa-solid fa-comments"></i><p>Pilih percakapan untuk mulai chat</p></div>';
        document.getElementById("chatInputArea").style.display = "none";
        loadChatConversations(activeChatTab);
      } else {
        Swal.fire("Gagal", data.message, "error");
      }
    } catch (error) {
      Swal.fire("Error", "Terjadi kesalahan saat menghubungi server.", "error");
    }
  }
}

/**
 * Updates unread message count
 */
async function updateUnreadCount() {
  try {
    const response = await fetch("/api/chats/unread-count");
    const result = await response.json();

    if (result.success) {
      unreadCount = result.data.count;

      const chatBadge = document.getElementById("chatBadge");
      if (chatBadge) {
        if (unreadCount > 0) {
          chatBadge.textContent = unreadCount;
          chatBadge.style.display = "inline-flex";
        } else {
          chatBadge.style.display = "none";
        }
      }
    }
  } catch (error) {
    console.error("Error updating unread count:", error);
  }
}

/**
 * Gets current chat number
 */
export function getCurrentChatNumber() {
  return currentChatNumber;
}

/**
 * Gets chat conversations
 */
export function getChatConversations() {
  return chatConversations;
}

/**
 * Gets unread count
 */
export function getUnreadCount() {
  return unreadCount;
}