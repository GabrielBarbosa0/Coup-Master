(function (root) {
    const guardedAudios = new WeakMap();
    const fadeTokens = new WeakMap();
    const RANDOM_START_MIN_DURATION = 12;
    const RANDOM_START_END_PADDING = 4;
    const DEFAULT_INTRO_FADE_MS = 5000;
    const MEDIA_ACTIONS = [
        'play',
        'pause',
        'stop',
        'seekbackward',
        'seekforward',
        'seekto',
        'previoustrack',
        'nexttrack'
    ];

    function setMutedState(button, muted) {
        if (!button) return;
        button.classList.toggle('muted', muted);
    }

    function isPageVisible() {
        return document.visibilityState !== 'hidden';
    }

    function clearSystemMediaMetadata() {
        if (!('mediaSession' in navigator)) return;

        try {
            navigator.mediaSession.metadata = null;
        } catch (error) {
            // Alguns navegadores expoem MediaSession parcialmente.
        }
    }

    function setSystemPlaybackState(playbackState) {
        if (!('mediaSession' in navigator)) return;

        try {
            navigator.mediaSession.playbackState = playbackState;
        } catch (error) {
            // Alguns navegadores aceitam MediaSession, mas nao todos os estados.
        }
    }

    function configureAudioElement(audio) {
        audio.controls = false;
        audio.disableRemotePlayback = true;
        audio.setAttribute('controlsList', 'nodownload noplaybackrate noremoteplayback');
    }

    function normalizeVolume(value, fallback = 1) {
        const volume = Number(value);
        if (!Number.isFinite(volume)) return fallback;
        return Math.max(0, Math.min(1, volume));
    }

    function normalizeDuration(value, fallback) {
        const duration = Number(value);
        if (!Number.isFinite(duration)) return fallback;
        return Math.max(0, duration);
    }

    function prepareRandomBackgroundStart(audio, options = {}) {
        if (!audio || audio.dataset.randomBackgroundStartApplied === 'true') {
            return Promise.resolve(false);
        }

        audio.dataset.randomBackgroundStartApplied = 'true';

        function applyRandomStart() {
            const duration = Number(audio.duration);
            if (!Number.isFinite(duration) || duration <= RANDOM_START_MIN_DURATION) return false;

            const endPadding = Math.min(RANDOM_START_END_PADDING, duration * 0.1);
            const maxStart = Math.max(0, duration - endPadding);
            if (maxStart <= 0) return false;

            try {
                audio.currentTime = Math.random() * maxStart;
                return true;
            } catch (error) {
                return false;
            }
        }

        if (audio.readyState >= 1) {
            return Promise.resolve(applyRandomStart());
        }

        return new Promise((resolve) => {
            let finished = false;

            function done(value) {
                if (finished) return;
                finished = true;
                audio.removeEventListener('loadedmetadata', handleMetadata);
                audio.removeEventListener('error', handleError);
                resolve(value);
            }

            function handleMetadata() {
                done(applyRandomStart());
            }

            function handleError() {
                done(false);
            }

            audio.addEventListener('loadedmetadata', handleMetadata, { once: true });
            audio.addEventListener('error', handleError, { once: true });

            if (typeof audio.load === 'function') {
                try {
                    audio.load();
                } catch (error) {
                    // Se o navegador recusar load manual, o play ainda pode funcionar depois.
                }
            }

            window.setTimeout(() => done(false), normalizeDuration(options.timeoutMs, 1800));
        });
    }

    function fadeAudioVolume(audio, toVolume, durationMs, options = {}) {
        if (!audio) return;

        const targetVolume = normalizeVolume(toVolume);
        const setVolume = typeof options.setVolume === 'function'
            ? options.setVolume
            : (value) => { audio.volume = normalizeVolume(value); };
        const fromVolume = normalizeVolume(audio.volume, 0);
        const duration = Math.max(0, Number(durationMs) || 0);
        const token = (fadeTokens.get(audio) || 0) + 1;
        const start = performance.now();

        fadeTokens.set(audio, token);

        function step(now) {
            if (fadeTokens.get(audio) !== token) return;

            const progress = duration <= 0 ? 1 : Math.min(1, (now - start) / duration);
            const eased = 1 - ((1 - progress) ** 3);
            setVolume(fromVolume + ((targetVolume - fromVolume) * eased));

            if (progress < 1) {
                requestAnimationFrame(step);
            }
        }

        requestAnimationFrame(step);
    }

    function playWithIntroFade(audio, options = {}) {
        if (!audio) return Promise.resolve(false);

        const guard = options.guard || null;
        const targetVolume = normalizeVolume(options.targetVolume, audio.volume || 1);
        const fadeMs = Number.isFinite(Number(options.fadeMs)) ? Number(options.fadeMs) : DEFAULT_INTRO_FADE_MS;
        const setVolume = (value) => {
            if (guard) guard.setVolume(value);
            else audio.volume = normalizeVolume(value);
        };
        const prepareStart = options.randomStart
            ? prepareRandomBackgroundStart(audio, options)
            : Promise.resolve(false);

        setVolume(0);

        return prepareStart
            .then(() => {
                const playPromise = guard
                    ? guard.play()
                    : audio.play().then(() => true).catch(() => false);

                return playPromise.then((played) => {
                    if (played) fadeAudioVolume(audio, targetVolume, fadeMs, { setVolume });
                    else setVolume(targetVolume);
                    return played;
                });
            });
    }

    function createBackgroundAudioGuard(audio, options = {}) {
        if (!audio) return null;
        if (guardedAudios.has(audio)) return guardedAudios.get(audio);

        configureAudioElement(audio);

        const button = options.button || null;
        const state = {
            internalPause: false,
            userMuted: false,
            pausedByVisibility: false,
            destroyed: false
        };

        function safePlay() {
            if (state.destroyed || !isPageVisible()) {
                state.pausedByVisibility = true;
                setMutedState(button, true);
                setSystemPlaybackState('paused');
                return Promise.resolve(false);
            }

            clearSystemMediaMetadata();
            return audio.play()
                .then(() => {
                    state.pausedByVisibility = false;
                    setMutedState(button, false);
                    setSystemPlaybackState('playing');
                    return true;
                })
                .catch(() => {
                    setMutedState(button, true);
                    setSystemPlaybackState('paused');
                    return false;
                });
        }

        function pauseAudio(markUserMuted) {
            if (markUserMuted) state.userMuted = true;
            state.pausedByVisibility = false;
            state.internalPause = true;
            audio.pause();
            state.internalPause = false;
            setMutedState(button, true);
            setSystemPlaybackState('paused');
        }

        function pauseForHiddenPage() {
            state.pausedByVisibility = true;
            if (!audio.paused) {
                state.internalPause = true;
                audio.pause();
                state.internalPause = false;
            }
            setSystemPlaybackState('paused');
        }

        function resumeAfterVisiblePage() {
            if (state.destroyed || !state.pausedByVisibility || state.userMuted) return;
            safePlay();
        }

        function handleVisibilityChange() {
            if (isPageVisible()) {
                resumeAfterVisiblePage();
                return;
            }

            pauseForHiddenPage();
        }

        function handleWindowBlur() {
            window.setTimeout(() => {
                if (!isPageVisible()) pauseForHiddenPage();
            }, 0);
        }

        function installMediaSessionHandlers() {
            if (!('mediaSession' in navigator)) return;

            clearSystemMediaMetadata();

            const handlers = {
                play: () => {
                    if (!isPageVisible()) {
                        pauseForHiddenPage();
                        return;
                    }
                    if (state.userMuted) {
                        pauseAudio(false);
                        return;
                    }
                    safePlay();
                },
                pause: () => {
                    if (!isPageVisible()) {
                        pauseForHiddenPage();
                        return;
                    }
                    safePlay();
                },
                stop: () => {
                    pauseForHiddenPage();
                },
                seekbackward: () => { },
                seekforward: () => { },
                seekto: () => { },
                previoustrack: () => { },
                nexttrack: () => { }
            };

            MEDIA_ACTIONS.forEach((action) => {
                try {
                    navigator.mediaSession.setActionHandler(action, handlers[action] || (() => { }));
                } catch (error) {
                    // Nem todas as acoes existem em todos os navegadores.
                }
            });
        }

        audio.addEventListener('pause', () => {
            setSystemPlaybackState('paused');
            if (state.internalPause || !isPageVisible() || state.userMuted) return;
            safePlay();
        });
        audio.addEventListener('play', () => {
            clearSystemMediaMetadata();
            setSystemPlaybackState('playing');
        });

        document.addEventListener('visibilitychange', handleVisibilityChange);
        window.addEventListener('pagehide', pauseForHiddenPage);
        window.addEventListener('pageshow', resumeAfterVisiblePage);
        window.addEventListener('blur', handleWindowBlur);
        document.addEventListener('freeze', pauseForHiddenPage);
        document.addEventListener('resume', resumeAfterVisiblePage);

        installMediaSessionHandlers();

        const api = {
            play() {
                state.userMuted = false;
                return safePlay();
            },
            pause() {
                pauseAudio(true);
            },
            toggle() {
                if (audio.paused || state.userMuted) {
                    return api.play();
                }

                api.pause();
                return Promise.resolve(false);
            },
            setVolume(value) {
                const volume = Number(value);
                audio.volume = Number.isFinite(volume) ? Math.max(0, Math.min(1, volume)) : audio.volume;
            },
            isMuted() {
                return audio.paused || state.userMuted;
            },
            destroy() {
                state.destroyed = true;
                document.removeEventListener('visibilitychange', handleVisibilityChange);
                window.removeEventListener('pagehide', pauseForHiddenPage);
                window.removeEventListener('pageshow', resumeAfterVisiblePage);
                window.removeEventListener('blur', handleWindowBlur);
                document.removeEventListener('freeze', pauseForHiddenPage);
                document.removeEventListener('resume', resumeAfterVisiblePage);
            }
        };

        guardedAudios.set(audio, api);
        return api;
    }

    root.CoupAudioGuard = {
        createBackgroundAudioGuard,
        fadeAudioVolume,
        playWithIntroFade,
        prepareRandomBackgroundStart
    };
}(window));
