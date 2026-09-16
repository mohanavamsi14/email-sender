document.addEventListener('DOMContentLoaded', () => {
  const emailForm = document.getElementById('email-form');
  const senderNameInput = document.getElementById('sender-name');
  const recipientEmailInput = document.getElementById('recipient-email');
  const subjectInput = document.getElementById('email-subject');
  const messageInput = document.getElementById('email-message');
  
  const groupEmail = document.getElementById('group-email');
  const groupMessage = document.getElementById('group-message');
  const emailError = document.getElementById('email-error');
  const messageError = document.getElementById('message-error');
  
  const charCounter = document.getElementById('char-counter');
  
  const btnSend = document.getElementById('btn-send');
  const btnSpinner = document.getElementById('btn-spinner');
  const btnIcon = document.getElementById('btn-icon');
  const btnText = document.getElementById('btn-text');
  
  const bannerSuccess = document.getElementById('status-banner-success');
  const bannerError = document.getElementById('status-banner-error');
  const successRecipientDetail = document.getElementById('success-recipient-detail');
  const errorMessageDetail = document.getElementById('error-message-detail');
  
  const previewUrlWrapper = document.getElementById('preview-url-wrapper');
  const previewUrlLink = document.getElementById('preview-url-link');

  const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const MAX_MESSAGE_LENGTH = 10000;

  // Real-time character counter for Message field
  function updateCharCount() {
    const currentLength = messageInput.value.length;
    charCounter.textContent = `${currentLength.toLocaleString()} / ${MAX_MESSAGE_LENGTH.toLocaleString()}`;
    
    if (currentLength > 9000) {
      charCounter.classList.add('near-limit');
    } else {
      charCounter.classList.remove('near-limit');
    }
  }

  messageInput.addEventListener('input', () => {
    updateCharCount();
    clearFieldError(groupMessage, messageError);
  });

  recipientEmailInput.addEventListener('input', () => {
    clearFieldError(groupEmail, emailError);
  });

  // Clear specific field error
  function clearFieldError(groupElement, errorElement) {
    groupElement.classList.remove('has-error');
  }

  // Set field error
  function showFieldError(groupElement, errorElement, message) {
    groupElement.classList.add('has-error');
    if (message) {
      errorElement.textContent = message;
    }
  }

  // Clear all status banners
  function hideStatusBanners() {
    bannerSuccess.hidden = true;
    bannerError.hidden = true;
    previewUrlWrapper.hidden = true;
  }

  // Client-side Validation
  function validateForm() {
    let isValid = true;

    // Validate Email
    const emailVal = recipientEmailInput.value.trim();
    if (!emailVal) {
      showFieldError(groupEmail, emailError, 'Recipient email is required.');
      isValid = false;
    } else if (!EMAIL_REGEX.test(emailVal)) {
      showFieldError(groupEmail, emailError, 'Please enter a valid email address.');
      isValid = false;
    } else {
      clearFieldError(groupEmail, emailError);
    }

    // Validate Message
    const messageVal = messageInput.value.trim();
    if (!messageVal) {
      showFieldError(groupMessage, messageError, 'Message text is required.');
      isValid = false;
    } else if (messageVal.length > MAX_MESSAGE_LENGTH) {
      showFieldError(groupMessage, messageError, `Message cannot exceed ${MAX_MESSAGE_LENGTH} characters.`);
      isValid = false;
    } else {
      clearFieldError(groupMessage, messageError);
    }

    return isValid;
  }

  // Set Button Loading State
  function setLoadingState(isLoading) {
    if (isLoading) {
      btnSend.disabled = true;
      if (senderNameInput) senderNameInput.disabled = true;
      recipientEmailInput.disabled = true;
      subjectInput.disabled = true;
      messageInput.disabled = true;
      
      btnSpinner.hidden = false;
      btnIcon.hidden = true;
      btnText.textContent = 'Sending...';
    } else {
      btnSend.disabled = false;
      if (senderNameInput) senderNameInput.disabled = false;
      recipientEmailInput.disabled = false;
      subjectInput.disabled = false;
      messageInput.disabled = false;
      
      btnSpinner.hidden = true;
      btnIcon.hidden = false;
      btnText.textContent = 'Send Email';
    }
  }

  // Form Submit Handler
  emailForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    hideStatusBanners();

    if (!validateForm()) {
      return;
    }

    const payload = {
      senderName: senderNameInput ? (senderNameInput.value.trim() || 'Test Email Sender') : 'Test Email Sender',
      email: recipientEmailInput.value.trim(),
      subject: subjectInput.value.trim() || 'Test Email',
      message: messageInput.value.trim()
    };

    setLoadingState(true);

    try {
      const response = await fetch('/api/send-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // Success
        successRecipientDetail.textContent = `Recipient: ${data.recipient || payload.email}`;
        
        // If testing mode with Ethereal preview link
        if (data.previewUrl) {
          previewUrlLink.href = data.previewUrl;
          previewUrlWrapper.hidden = false;
        } else {
          previewUrlWrapper.hidden = true;
        }

        bannerSuccess.hidden = false;
      } else {
        // Error from API
        errorMessageDetail.textContent = data.message || 'Please try again.';
        bannerError.hidden = false;
      }

    } catch (err) {
      console.error('Fetch error:', err);
      errorMessageDetail.textContent = 'Network error or server unreachable. Please try again.';
      bannerError.hidden = false;
    } finally {
      setLoadingState(false);
    }
  });

  // Initialize char count
  updateCharCount();
});
