(function (root) {
    const guardedAudios = new WeakMap();
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
        createBackgroundAudioGuard
    };
}(window));
