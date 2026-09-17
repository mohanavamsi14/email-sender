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
  
  const statusMessage = document.getElementById('status-message');




  const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const MAX_MESSAGE_LENGTH = 10000;
  
  // Initialize EmailJS with public key
  emailjs.init('YNttiIyS4X3agM6GO');

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
    statusMessage.hidden = true;
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

  // Form Submit Handler (100% Pure Frontend via Web3Forms API)
  emailForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    hideStatusBanners();

    if (!validateForm()) {
      return;
    }

    const senderName = senderNameInput ? (senderNameInput.value.trim() || 'Test Email Sender') : 'Test Email Sender';
    const email = recipientEmailInput.value.trim();
    const subject = subjectInput.value.trim() || 'Test Email';
    const message = messageInput.value.trim();

    setLoadingState(true);

    try {
      const serviceID = 'service_69oq3dm';
      const templateID = 'template_0lxows6';
      const result = await emailjs.send(serviceID, templateID, {
        from_name: senderName,
        to_email: email,
        subject: subject,
        message: message
      });

      if (result && result.status === 200) {
        statusMessage.textContent = `✅ Email sent successfully to ${email}`;
        statusMessage.className = 'status-success';
        statusMessage.hidden = false;
      } else {
        statusMessage.textContent = `❌ Error: ${result?.text || 'Failed to send email.'}`;
        statusMessage.className = 'status-error';
        statusMessage.hidden = false;
      }
    } catch (err) {
        console.error('EmailJS send error:', err);
        statusMessage.textContent = `❌ Network error contacting email service. Please try again.`;
        statusMessage.className = 'status-error';
        statusMessage.hidden = false;
    } finally {
      setLoadingState(false);
    }
  });

  // Initialize char count
  updateCharCount();
});
