(function() {
  'use strict';
  
  // Check if chatbot is already initialized
  if (window.CuraChatbotLoaded) return;
  window.CuraChatbotLoaded = true;

  // Get configuration from window.CuraChatbot
  const config = window.CuraChatbot || {};
  const {
    organizationId,
    apiKey,
    title = 'Healthcare Assistant',
    primaryColor = '#4A7DFF',
    position = 'bottom-right',
    welcomeMessage = "Hello! I'm here to help you book appointments and request prescriptions. How can I assist you today?"
  } = config;

  if (!organizationId || !apiKey) {
    console.error('Cura Chatbot: organizationId and apiKey are required');
    return;
  }

  // Create chatbot state
  let isOpen = false;
  let isMinimized = false;
  let messages = [];
  let sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  let isLoading = false;

  // Utility functions
  function createElement(tag, attrs = {}, children = []) {
    const element = document.createElement(tag);
    Object.keys(attrs).forEach(key => {
      if (key === 'style' && typeof attrs[key] === 'object') {
        Object.assign(element.style, attrs[key]);
      } else if (key === 'onclick') {
        element.onclick = attrs[key];
      } else {
        element.setAttribute(key, attrs[key]);
      }
    });
    children.forEach(child => {
      if (typeof child === 'string') {
        element.appendChild(document.createTextNode(child));
      } else {
        element.appendChild(child);
      }
    });
    return element;
  }

  function addMessage(content, sender, intent = null, confidence = null) {
    const message = {
      id: `${sender}_${Date.now()}_${Math.random()}`,
      content,
      sender,
      timestamp: new Date(),
      intent,
      confidence
    };
    messages.push(message);
    updateChatMessages();
  }

  async function sendMessage(content) {
    if (!content.trim() || isLoading) return;

    addMessage(content, 'user');
    setLoading(true);

    try {
      const response = await fetch('/api/chatbot/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          message: content,
          organizationId,
          apiKey
        })
      });

      if (!response.ok) throw new Error('Failed to send message');

      const data = await response.json();
      addMessage(data.response, 'bot', data.intent, data.confidence);
    } catch (error) {
      addMessage("I'm sorry, I'm having trouble connecting right now. Please try again in a moment.", 'bot');
    } finally {
      setLoading(false);
    }
  }

  function setLoading(loading) {
    isLoading = loading;
    updateChatMessages();
  }

  function updateChatMessages() {
    const messagesContainer = document.getElementById('cura-messages');
    if (!messagesContainer) return;

    messagesContainer.innerHTML = '';

    messages.forEach(message => {
      const messageDiv = createElement('div', {
        style: {
          display: 'flex',
          justifyContent: message.sender === 'user' ? 'flex-end' : 'flex-start',
          marginBottom: '12px'
        }
      });

      const messageBubble = createElement('div', {
        style: {
          maxWidth: '240px',
          padding: '8px 12px',
          borderRadius: '12px',
          fontSize: '14px',
          backgroundColor: message.sender === 'user' ? primaryColor : '#f3f4f6',
          color: message.sender === 'user' ? '#ffffff' : '#374151'
        }
      }, [message.content]);

      if (message.sender === 'bot' && message.intent) {
        const intentBadge = createElement('div', {
          style: {
            fontSize: '10px',
            color: '#6b7280',
            marginTop: '4px'
          }
        }, [`Intent: ${message.intent} (${Math.round((message.confidence || 0) * 100)}%)`]);
        messageBubble.appendChild(intentBadge);
      }

      messageDiv.appendChild(messageBubble);
      messagesContainer.appendChild(messageDiv);
    });

    if (isLoading) {
      const loadingDiv = createElement('div', {
        style: {
          display: 'flex',
          justifyContent: 'flex-start',
          marginBottom: '12px'
        }
      });

      const loadingBubble = createElement('div', {
        style: {
          backgroundColor: '#f3f4f6',
          padding: '8px 12px',
          borderRadius: '12px',
          fontSize: '14px'
        }
      });

      const dots = createElement('div', {
        style: { display: 'flex', gap: '4px' }
      });

      for (let i = 0; i < 3; i++) {
        const dot = createElement('div', {
          style: {
            width: '6px',
            height: '6px',
            backgroundColor: '#9ca3af',
            borderRadius: '50%',
            animation: `bounce 1.4s ease-in-out ${i * 0.16}s infinite both`
          }
        });
        dots.appendChild(dot);
      }

      loadingBubble.appendChild(dots);
      loadingDiv.appendChild(loadingBubble);
      messagesContainer.appendChild(loadingDiv);
    }

    // Scroll to bottom
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }

  function createChatWidget() {
    const container = document.getElementById('cura-chatbot');
    if (!container) return;

    // Add CSS animations
    if (!document.getElementById('cura-chatbot-styles')) {
      const styles = createElement('style', { id: 'cura-chatbot-styles' });
      styles.textContent = `
        @keyframes bounce {
          0%, 80%, 100% { transform: scale(0); }
          40% { transform: scale(1); }
        }
        .cura-chatbot-hidden { display: none !important; }
        .cura-chatbot-button {
          transition: all 0.2s ease;
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        }
        .cura-chatbot-button:hover {
          transform: scale(1.05);
          box-shadow: 0 6px 20px rgba(0,0,0,0.2);
        }
      `;
      document.head.appendChild(styles);
    }

    container.innerHTML = '';

    if (!isOpen) {
      // Chat button
      const button = createElement('div', {
        style: {
          position: 'fixed',
          [position.includes('right') ? 'right' : 'left']: '20px',
          bottom: '20px',
          width: '56px',
          height: '56px',
          backgroundColor: primaryColor,
          borderRadius: '50%',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: '9999',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
        },
        class: 'cura-chatbot-button',
        onclick: () => {
          isOpen = true;
          addMessage(welcomeMessage, 'bot');
          createChatWidget();
        }
      });

      // Chat icon SVG
      button.innerHTML = `
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
        </svg>
      `;

      container.appendChild(button);
      return;
    }

    if (isMinimized) {
      // Minimized header
      const minimizedWidget = createElement('div', {
        style: {
          position: 'fixed',
          [position.includes('right') ? 'right' : 'left']: '20px',
          bottom: '20px',
          width: '320px',
          backgroundColor: 'white',
          borderRadius: '12px',
          boxShadow: '0 4px 24px rgba(0,0,0,0.15)',
          zIndex: '9999',
          border: '1px solid #e5e7eb'
        }
      });

      const header = createElement('div', {
        style: {
          backgroundColor: primaryColor,
          color: 'white',
          padding: '12px 16px',
          borderRadius: '12px 12px 0 0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          cursor: 'pointer'
        },
        onclick: () => {
          isMinimized = false;
          createChatWidget();
        }
      }, [title]);

      const closeButton = createElement('button', {
        style: {
          background: 'none',
          border: 'none',
          color: 'white',
          cursor: 'pointer',
          padding: '4px',
          borderRadius: '4px',
          fontSize: '16px'
        },
        onclick: (e) => {
          e.stopPropagation();
          isOpen = false;
          createChatWidget();
        }
      }, ['×']);

      header.appendChild(closeButton);
      minimizedWidget.appendChild(header);
      container.appendChild(minimizedWidget);
      return;
    }

    // Full chat widget
    const widget = createElement('div', {
      style: {
        position: 'fixed',
        [position.includes('right') ? 'right' : 'left']: '20px',
        bottom: '20px',
        width: '320px',
        height: '400px',
        backgroundColor: 'white',
        borderRadius: '12px',
        boxShadow: '0 4px 24px rgba(0,0,0,0.15)',
        zIndex: '9999',
        border: '1px solid #e5e7eb',
        display: 'flex',
        flexDirection: 'column'
      }
    });

    // Header
    const header = createElement('div', {
      style: {
        backgroundColor: primaryColor,
        color: 'white',
        padding: '12px 16px',
        borderRadius: '12px 12px 0 0',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }
    });

    const headerTitle = createElement('span', {
      style: { fontSize: '14px', fontWeight: '600' }
    }, [title]);

    const headerButtons = createElement('div', {
      style: { display: 'flex', gap: '4px' }
    });

    const minimizeButton = createElement('button', {
      style: {
        background: 'none',
        border: 'none',
        color: 'white',
        cursor: 'pointer',
        padding: '4px',
        borderRadius: '4px',
        fontSize: '16px'
      },
      onclick: () => {
        isMinimized = true;
        createChatWidget();
      }
    }, ['−']);

    const closeButton = createElement('button', {
      style: {
        background: 'none',
        border: 'none',
        color: 'white',
        cursor: 'pointer',
        padding: '4px',
        borderRadius: '4px',
        fontSize: '16px'
      },
      onclick: () => {
        isOpen = false;
        createChatWidget();
      }
    }, ['×']);

    headerButtons.appendChild(minimizeButton);
    headerButtons.appendChild(closeButton);
    header.appendChild(headerTitle);
    header.appendChild(headerButtons);

    // Messages area
    const messagesArea = createElement('div', {
      id: 'cura-messages',
      style: {
        flex: '1',
        padding: '16px',
        overflowY: 'auto',
        maxHeight: '300px'
      }
    });

    // Input area
    const inputArea = createElement('div', {
      style: {
        padding: '16px',
        borderTop: '1px solid #e5e7eb',
        display: 'flex',
        gap: '8px'
      }
    });

    const input = createElement('input', {
      type: 'text',
      placeholder: 'Type your message...',
      style: {
        flex: '1',
        padding: '8px 12px',
        border: '1px solid #d1d5db',
        borderRadius: '6px',
        fontSize: '14px',
        outline: 'none'
      }
    });

    const sendButton = createElement('button', {
      style: {
        backgroundColor: primaryColor,
        color: 'white',
        border: 'none',
        borderRadius: '6px',
        padding: '8px 12px',
        cursor: 'pointer',
        fontSize: '14px',
        minWidth: '60px'
      },
      onclick: () => {
        const message = input.value.trim();
        if (message) {
          sendMessage(message);
          input.value = '';
        }
      }
    }, ['Send']);

    // Handle Enter key
    input.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        sendButton.click();
      }
    });

    inputArea.appendChild(input);
    inputArea.appendChild(sendButton);

    widget.appendChild(header);
    widget.appendChild(messagesArea);
    widget.appendChild(inputArea);

    container.appendChild(widget);

    // Focus input when opened
    setTimeout(() => input.focus(), 100);
  }

  // Initialize welcome message
  if (messages.length === 0) {
    addMessage(welcomeMessage, 'bot');
  }

  // Create initial widget
  createChatWidget();
})();