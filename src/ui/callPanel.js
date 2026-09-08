/**
 * Conferencing Call Panel (P8 design D3, D6, D7; tasks 3.2, 3.3, 3.4, 3.5).
 *
 * Plain DOM overlay strictly outside Three.js canvas, rAF loop, and theater screen DOM.
 *
 * Input safety contract:
 *  - Buttons immediately blur on click so Space, WASD, C, T are never trapped.
 *  - Closing the panel returns keyboard focus to the game canvas.
 *  - Focus changes notify main.js to clear held movement keys.
 *  - Local audio ducking control adjusts theater volume relative to call volume.
 */

export class CallPanel {
  constructor(callClient, { onFocusChange = null, onDuckingChange = null } = {}) {
    this.callClient = callClient;
    this.onFocusChange = onFocusChange;
    this.onDuckingChange = onDuckingChange;

    this.visible = false;
    this.duckingRatio = 0.5; // 50% ducking default when call is active

    // Cache DOM elements
    this.panel = document.getElementById('call-panel');
    this.toggleBtn = document.getElementById('call-toggle');
    this.statusBadge = document.getElementById('call-status-badge');
    this.participantList = document.getElementById('call-participants');
    this.joinBtn = document.getElementById('call-join-btn');
    this.leaveBtn = document.getElementById('call-leave-btn');
    this.muteAudioBtn = document.getElementById('call-mute-audio-btn');
    this.muteVideoBtn = document.getElementById('call-mute-video-btn');
    this.shareScreenBtn = document.getElementById('call-share-screen-btn');
    this.duckingSlider = document.getElementById('call-ducking-slider');
    this.noticeArea = document.getElementById('call-notice');

    this.setupListeners();
    this.setupClientHooks();
    this.updateUI();
  }

  setupListeners() {
    if (this.toggleBtn) {
      this.toggleBtn.addEventListener('click', (e) => {
        this.blurTarget(e);
        this.toggle();
      });
    }

    if (this.joinBtn) {
      this.joinBtn.addEventListener('click', async (e) => {
        this.blurTarget(e);
        // Call ID defaults to active room call
        const callId = this.getDefaultCallId();
        await this.callClient.joinCall(callId, { audio: true, video: false });
        this.updateUI();
      });
    }

    if (this.leaveBtn) {
      this.leaveBtn.addEventListener('click', (e) => {
        this.blurTarget(e);
        this.callClient.leaveCall();
        this.updateUI();
      });
    }

    if (this.muteAudioBtn) {
      this.muteAudioBtn.addEventListener('click', (e) => {
        this.blurTarget(e);
        const newMuted = !this.callClient.audioMuted;
        this.callClient.setAudioMute(newMuted);
        this.updateUI();
      });
    }

    if (this.muteVideoBtn) {
      this.muteVideoBtn.addEventListener('click', async (e) => {
        this.blurTarget(e);
        const newMuted = !this.callClient.videoMuted;
        await this.callClient.setVideoMute(newMuted);
        this.updateUI();
      });
    }

    if (this.shareScreenBtn) {
      this.shareScreenBtn.addEventListener('click', async (e) => {
        this.blurTarget(e);
        if (this.callClient.sharingScreen) {
          this.callClient.stopScreenShare();
        } else {
          await this.callClient.startScreenShare();
        }
        this.updateUI();
      });
    }

    if (this.duckingSlider) {
      this.duckingSlider.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        this.duckingRatio = Math.max(0.0, Math.min(1.0, isNaN(val) ? 0.5 : val));
        this.onDuckingChange?.(this.duckingRatio);
      });
      this.duckingSlider.addEventListener('change', (e) => {
        this.blurTarget(e);
      });
    }

    // Guard panel focus to notify game loop
    if (this.panel) {
      this.panel.addEventListener('focusin', () => this.onFocusChange?.(true));
      this.panel.addEventListener('focusout', () => this.onFocusChange?.(false));
      this.panel.addEventListener('keydown', (e) => {
        // Prevent key events from propagating to game canvas
        e.stopPropagation();
        if (e.code === 'Escape') {
          this.setVisible(false);
          this.returnFocusToGame();
        }
      });
    }
  }

  setupClientHooks() {
    this.callClient.onStateChange = (status, meta) => {
      this.updateStatusBadge(status, meta);
      this.updateUI();
      this.onDuckingChange?.(status === 'connected' ? this.duckingRatio : 0.0);
    };

    this.callClient.onParticipantsChange = (participants) => {
      this.renderParticipants(participants);
    };

    this.callClient.onError = (err) => {
      if (this.noticeArea) {
        this.noticeArea.textContent = `Error: ${err.message}`;
        this.noticeArea.style.display = 'block';
      }
    };
  }

  getDefaultCallId() {
    // Standard room call or default theater call ID
    return this.callClient.net?.desiredRoom || 'theater-main';
  }

  blurTarget(e) {
    if (e?.currentTarget && typeof e.currentTarget.blur === 'function') {
      e.currentTarget.blur();
    }
  }

  returnFocusToGame() {
    const canvas = document.getElementById('game-canvas');
    if (canvas && typeof canvas.focus === 'function') {
      canvas.focus();
    }
  }

  toggle() {
    this.setVisible(!this.visible);
  }

  setVisible(visible) {
    this.visible = visible;
    if (this.panel) {
      this.panel.style.display = visible ? 'flex' : 'none';
      if (!visible) {
        this.returnFocusToGame();
      }
    }
    if (this.toggleBtn) {
      this.toggleBtn.classList.toggle('active', visible);
    }
  }

  updateStatusBadge(status, meta = {}) {
    if (!this.statusBadge) return;

    this.statusBadge.className = `call-badge status-${status}`;

    if (status === 'connected') {
      this.statusBadge.textContent = 'Connected';
      if (meta.captureDeclined && this.noticeArea) {
        this.noticeArea.textContent = 'Microphone permission declined. Listening in subscribe-only mode.';
        this.noticeArea.style.display = 'block';
      } else if (this.noticeArea) {
        this.noticeArea.style.display = 'none';
      }
    } else if (status === 'rejoining') {
      this.statusBadge.textContent = 'Rejoining...';
      if (this.noticeArea) {
        this.noticeArea.textContent = 'Reconnecting to media worker...';
        this.noticeArea.style.display = 'block';
      }
    } else if (status === 'joining') {
      this.statusBadge.textContent = 'Joining...';
    } else if (status === 'error') {
      this.statusBadge.textContent = 'Error';
    } else {
      this.statusBadge.textContent = 'Offline';
      if (this.noticeArea) this.noticeArea.style.display = 'none';
    }
  }

  renderParticipants(participants) {
    if (!this.participantList) return;

    this.participantList.innerHTML = '';

    if (!participants || participants.length === 0) {
      const emptyItem = document.createElement('div');
      emptyItem.className = 'call-empty-message';
      emptyItem.textContent = 'No participants in call';
      this.participantList.appendChild(emptyItem);
      return;
    }

    participants.forEach((p) => {
      const tile = document.createElement('div');
      tile.className = 'call-participant-tile';

      const name = document.createElement('span');
      name.className = 'participant-name';
      name.textContent = p.player_id === this.callClient.net?.guestId ? 'You' : p.player_id;

      const badge = document.createElement('span');
      badge.className = 'participant-badge';
      const isMuted = p.muted?.audio ?? false;
      badge.textContent = isMuted ? 'Muted' : 'Speaking';
      if (isMuted) badge.classList.add('muted');

      tile.appendChild(name);
      tile.appendChild(badge);
      this.participantList.appendChild(tile);
    });
  }

  updateUI() {
    const isConnected = this.callClient.status === 'connected';
    const isJoining = this.callClient.status === 'joining';

    if (this.joinBtn) this.joinBtn.style.display = isConnected || isJoining ? 'none' : 'inline-block';
    if (this.leaveBtn) this.leaveBtn.style.display = isConnected || isJoining ? 'inline-block' : 'none';

    if (this.muteAudioBtn) {
      this.muteAudioBtn.disabled = !isConnected;
      this.muteAudioBtn.textContent = this.callClient.audioMuted ? 'Unmute Mic' : 'Mute Mic';
      this.muteAudioBtn.classList.toggle('active', !this.callClient.audioMuted);
    }

    if (this.muteVideoBtn) {
      this.muteVideoBtn.disabled = !isConnected;
      this.muteVideoBtn.textContent = this.callClient.videoMuted ? 'Start Camera' : 'Stop Camera';
      this.muteVideoBtn.classList.toggle('active', !this.callClient.videoMuted);
    }

    if (this.shareScreenBtn) {
      this.shareScreenBtn.disabled = !isConnected;
      this.shareScreenBtn.textContent = this.callClient.sharingScreen ? 'Stop Screen' : 'Share Screen';
      this.shareScreenBtn.classList.toggle('active', this.callClient.sharingScreen);
    }
  }
}
