(function setupCasualAudio(root) {
  const DEFAULT_SFX_VOLUME = 0.2;
  const DEFAULT_BGM_VOLUME = 0.1;
  const SFX_VOLUME_STORAGE_KEY = 'sfxVolume';

  function normalizeVolume(value, fallback = DEFAULT_SFX_VOLUME) {
    if (value === null || value === undefined || value === '') return fallback;
    const volume = Number(value);
    if (!Number.isFinite(volume)) return fallback;
    return Math.max(0, Math.min(1, volume));
  }

  function readStoredSfxVolume() {
    try {
      const storedVolume = localStorage.getItem(SFX_VOLUME_STORAGE_KEY);
      if (storedVolume === '0') return DEFAULT_SFX_VOLUME;
      return normalizeVolume(storedVolume);
    } catch (error) {
      return DEFAULT_SFX_VOLUME;
    }
  }

  function setSfxVolume(value) {
    const normalizedVolume = normalizeVolume(value);
    root.sfxVolume = normalizedVolume;

    try {
      localStorage.setItem(SFX_VOLUME_STORAGE_KEY, String(normalizedVolume));
    } catch (error) {
      // Preferimos manter o audio funcional mesmo se o armazenamento falhar.
    }

    document.querySelectorAll('audio[id^="audio-"]').forEach((audio) => {
      audio.volume = normalizedVolume;
    });

    return normalizedVolume;
  }

  function playSound(id) {
    const sound = document.getElementById(`audio-${id}`);
    if (!sound) return;

    sound.volume = normalizeVolume(root.sfxVolume);
    sound.currentTime = 0;
    sound.play().catch((error) => {
      if (error && error.name === 'AbortError') return;
      console.log('Erro ao tocar som:', error);
    });
  }

  function triggerSound(soundId, options = {}) {
    const database = options.db || root.db;
    const roomCode = options.roomCode || root.roomCode;

    if (!database || !roomCode) {
      playSound(soundId);
      return;
    }

    database.ref(`salas/${roomCode}/gameState/lastSFX`).set({
      id: soundId,
      timestamp: Date.now()
    });
  }

  function setupBackgroundMusicControls(options = {}) {
    const musicBtn = document.getElementById(options.musicButtonId || 'musicBtn');
    const bgmAudio = document.getElementById(options.bgmAudioId || 'bgmAudio');
    const volumeSlider = document.getElementById(options.volumeSliderId || 'volumeSlider');
    const effectsVolumeSlider = document.getElementById(options.effectsVolumeSliderId || 'effectsVolumeSlider');

    if (bgmAudio) bgmAudio.volume = DEFAULT_BGM_VOLUME;

    const bgmGuard = bgmAudio && root.CoupAudioGuard
      ? root.CoupAudioGuard.createBackgroundAudioGuard(bgmAudio, { button: musicBtn })
      : null;

    if (musicBtn && bgmAudio) {
      if (bgmGuard) {
        bgmGuard.play();
      } else {
        bgmAudio.play()
          .then(() => musicBtn.classList.remove('muted'))
          .catch(() => musicBtn.classList.add('muted'));
      }

      musicBtn.onclick = () => {
        if (bgmGuard) {
          bgmGuard.toggle();
          return;
        }

        if (bgmAudio.paused) {
          bgmAudio.play()
            .then(() => musicBtn.classList.remove('muted'))
            .catch(() => musicBtn.classList.add('muted'));
        } else {
          bgmAudio.pause();
          musicBtn.classList.add('muted');
        }
      };
    }

    if (volumeSlider && bgmAudio) {
      volumeSlider.value = bgmAudio.volume;
      volumeSlider.addEventListener('input', (event) => {
        if (bgmGuard) {
          bgmGuard.setVolume(event.target.value);
          return;
        }

        bgmAudio.volume = event.target.value;
      });
    }

    if (effectsVolumeSlider) {
      const currentSfxVolume = setSfxVolume(root.sfxVolume);
      effectsVolumeSlider.value = currentSfxVolume;

      effectsVolumeSlider.addEventListener('input', (event) => {
        setSfxVolume(event.target.value);
      });
    }
  }

  root.sfxVolume = readStoredSfxVolume();
  setSfxVolume(root.sfxVolume);

  root.CoupCasualAudio = {
    normalizeVolume,
    readStoredSfxVolume,
    setSfxVolume,
    playSound,
    triggerSound,
    setupBackgroundMusicControls
  };
})(window);
