(function setupFeedbackForms(root) {
  function t(key, fallback) {
    const translated = root.CoupLanguage?.t?.(key);
    return translated && translated !== key ? translated : fallback;
  }

  function setStatus(form, message, type = '') {
    const status = form.querySelector('.feedback-status');
    if (!status) return;

    status.textContent = message || '';
    status.classList.toggle('is-success', type === 'success');
    status.classList.toggle('is-error', type === 'error');
  }

  function fillMetadata(form) {
    const values = {
      page: root.location.href,
      room: new URLSearchParams(root.location.search).get('room') || '',
      player: root.auth?.currentUser?.displayName || root.auth?.currentUser?.email || 'Visitante',
      date: new Date().toISOString()
    };

    Object.entries(values).forEach(([key, value]) => {
      const input = form.querySelector(`[data-feedback-meta="${key}"]`);
      if (input) input.value = value;
    });
  }

  function closeFormModal(form) {
    const modal = form.closest('.modal-overlay');
    if (modal) modal.style.display = 'none';
  }

  async function submit(form) {
    const submitButton = form.querySelector('[type="submit"]');
    const originalLabel = submitButton?.textContent || t('ranked.send', 'Enviar');

    fillMetadata(form);
    setStatus(form, t('casual.feedbackSubmitting', 'Enviando feedback...'));

    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent = t('casual.feedbackSending', 'Enviando...');
    }

    try {
      const response = await fetch(form.action, {
        method: 'POST',
        headers: { Accept: 'application/json' },
        body: new FormData(form)
      });

      if (!response.ok) throw new Error(`Formspark returned ${response.status}`);

      form.reset();
      setStatus(
        form,
        t('casual.feedbackSuccess', 'Feedback enviado. Obrigado por ajudar o Coup Master!'),
        'success'
      );
    } catch (error) {
      console.error('Erro ao enviar feedback:', error);
      setStatus(
        form,
        t('casual.feedbackError', 'Nao foi possivel enviar agora. Tente novamente em instantes.'),
        'error'
      );
    } finally {
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = originalLabel;
      }
    }
  }

  function bind(form) {
    if (form.dataset.feedbackBound === 'true') return;
    form.dataset.feedbackBound = 'true';

    const openButton = document.getElementById(form.dataset.feedbackOpenButton);
    openButton?.addEventListener('click', () => {
      fillMetadata(form);
      setStatus(form, '');
    });

    form.querySelector('[data-feedback-cancel]')?.addEventListener('click', () => {
      closeFormModal(form);
    });

    form.addEventListener('submit', (event) => {
      event.preventDefault();
      submit(form);
    });
  }

  function setupAll() {
    document.querySelectorAll('[data-feedback-form]').forEach(bind);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupAll, { once: true });
  } else {
    setupAll();
  }

  root.CoupFeedbackForms = Object.freeze({ setupAll });
})(window);
