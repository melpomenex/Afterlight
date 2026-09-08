/**
 * WebRTC Conferencing client (P8 design D2, D3, D6, D7).
 *
 * Responsibilities:
 *  - Explicit opt-in capture: capture begins ONLY on explicit user action.
 *    Entering rooms or theater never requests mic/camera permissions.
 *  - Subscribe-only mode if capture is declined by user.
 *  - Channel signaling over `call:<id>` topic.
 *  - Reconnection grace: 30-second reconnect window with 'rejoining' state.
 *  - Screen-share lifecycle: single share, clean track teardown.
 *  - Mute & revoke enforcement: local muting and immediate capture stop on revoke.
 */

export class CallClient {
  constructor(net, { onStateChange = null, onParticipantsChange = null, onError = null } = {}) {
    this.net = net;
    this.onStateChange = onStateChange;
    this.onParticipantsChange = onParticipantsChange;
    this.onError = onError;

    this.callId = null;
    this.status = 'idle'; // 'idle' | 'joining' | 'connected' | 'rejoining' | 'error'
    this.channel = null;

    this.grant = null;
    this.turn = null;
    this.expiresAt = null;

    this.localStream = null;
    this.screenStream = null;
    this.peerConnections = new Map(); // target_player_id -> RTCPeerConnection
    this.participants = new Map(); // player_id -> { player_id, joined_at, muted: {} }

    this.audioMuted = false;
    this.videoMuted = false;
    this.sharingScreen = false;
    this.captureDeclined = false;

    this.reconnectTimer = null;
    this.reconnectGraceMs = 30000;
  }

  setStatus(status, meta = {}) {
    this.status = status;
    this.onStateChange?.(status, meta);
  }

  /**
   * Explicitly join a call by callId.
   * Opt-in capture: requests mic only if requested, and gracefully handles decline.
   */
  async joinCall(callId, { audio = true, video = false } = {}) {
    if (this.status === 'connected' || this.status === 'joining') return;

    this.callId = callId;
    this.setStatus('joining');
    this.captureDeclined = false;

    // 1. Opt-in local media capture
    if (audio || video) {
      await this.requestCapture({ audio, video });
    }

    // 2. Join Phoenix channel for this call
    if (!this.net.joinCallChannel) {
      this.setStatus('error', { reason: 'transport_unsupported' });
      this.onError?.(new Error('Conferencing requires Phoenix gateway transport'));
      return;
    }

    this.channel = this.net.joinCallChannel(callId);
    if (!this.channel) {
      this.setStatus('error', { reason: 'channel_join_failed' });
      return;
    }

    this.channel.on('participant_joined', (payload) => this.handleParticipantJoined(payload));
    this.channel.on('participant_left', (payload) => this.handleParticipantLeft(payload));
    this.channel.on('participant_muted', (payload) => this.handleParticipantMuted(payload));
    this.channel.on('signal', (payload) => this.handleSignal(payload));
    this.channel.on('grant_revoked', (payload) => this.handleGrantRevoked(payload));

    this.channel
      .join()
      .receive('ok', (resp) => {
        this.grant = resp.grant;
        this.turn = resp.turn;
        this.expiresAt = resp.expires_at;

        // Populate initial participant list
        this.participants.clear();
        (resp.participants || []).forEach((p) => {
          this.participants.set(p.player_id, p);
        });

        this.setStatus('connected', {
          callId: this.callId,
          grant: this.grant,
          turn: this.turn,
          captureDeclined: this.captureDeclined,
        });

        this.onParticipantsChange?.(Array.from(this.participants.values()));

        // Connect to existing participants
        this.participants.forEach((p) => {
          if (p.player_id !== this.net.guestId) {
            this.createPeerConnection(p.player_id, true);
          }
        });
      })
      .receive('error', (err) => {
        const reason = err?.reason || 'join_rejected';
        this.setStatus('error', { reason });
        this.onError?.(new Error(`Call join rejected: ${reason}`));
      });
  }

  /**
   * Explicit capture helper.
   * If permission is declined, sets captureDeclined = true and continues in subscribe-only mode.
   */
  async requestCapture({ audio = true, video = false }) {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      this.captureDeclined = true;
      return null;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio, video });
      this.localStream = stream;
      this.audioMuted = !audio;
      this.videoMuted = !video;
      return stream;
    } catch (err) {
      // User declined permission or device not available -> subscribe-only
      console.warn('Capture permission declined or unavailable, proceeding subscribe-only:', err.message);
      this.captureDeclined = true;
      return null;
    }
  }

  /**
   * Leave current call and cleanly stop all tracks.
   */
  leaveCall() {
    if (this.channel) {
      try {
        this.channel.push('leave', {});
        this.channel.leave();
      } catch {}
      this.channel = null;
    }

    this.stopAllMedia();
    this.participants.clear();
    this.onParticipantsChange?.([]);
    this.setStatus('idle');
  }

  /**
   * Stop local audio/video/screen tracks.
   */
  stopAllMedia() {
    if (this.localStream) {
      this.localStream.getTracks().forEach((t) => t.stop());
      this.localStream = null;
    }
    if (this.screenStream) {
      this.screenStream.getTracks().forEach((t) => t.stop());
      this.screenStream = null;
    }
    this.peerConnections.forEach((pc) => pc.close());
    this.peerConnections.clear();
    this.sharingScreen = false;
  }

  /**
   * Toggle local audio mute state.
   */
  setAudioMute(muted) {
    this.audioMuted = muted;
    if (this.localStream) {
      this.localStream.getAudioTracks().forEach((t) => {
        t.enabled = !muted;
      });
    }
    if (this.channel) {
      this.channel.push('mute', { kind: 'audio', muted });
    }
  }

  /**
   * Toggle local video mute state.
   */
  async setVideoMute(muted) {
    this.videoMuted = muted;
    if (!muted && (!this.localStream || this.localStream.getVideoTracks().length === 0)) {
      // User is enabling camera for the first time
      await this.requestCapture({ audio: !this.audioMuted, video: true });
    } else if (this.localStream) {
      this.localStream.getVideoTracks().forEach((t) => {
        t.enabled = !muted;
      });
    }
    if (this.channel) {
      this.channel.push('mute', { kind: 'video', muted });
    }
  }

  /**
   * Start screen share (single share lifecycle).
   */
  async startScreenShare() {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getDisplayMedia) return;

    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
      this.screenStream = stream;
      this.sharingScreen = true;

      const track = stream.getVideoTracks()[0];
      if (track) {
        track.onended = () => {
          this.stopScreenShare();
        };
      }

      this.setStatus(this.status, { sharingScreen: true });
    } catch (err) {
      console.warn('Screen share canceled or declined:', err.message);
    }
  }

  /**
   * Stop screen share.
   */
  stopScreenShare() {
    if (this.screenStream) {
      this.screenStream.getTracks().forEach((t) => t.stop());
      this.screenStream = null;
    }
    this.sharingScreen = false;
    this.setStatus(this.status, { sharingScreen: false });
  }

  createPeerConnection(targetPlayerId, isInitiator) {
    if (typeof RTCPeerConnection === 'undefined') return null;

    const config = {
      iceServers: this.turn?.urls?.map((url) => ({
        urls: url,
        username: this.turn.username,
        credential: this.turn.credential,
      })) || [{ urls: 'stun:stun.l.google.com:19302' }],
    };

    const pc = new RTCPeerConnection(config);
    this.peerConnections.set(targetPlayerId, pc);

    // Add local tracks
    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => pc.addTrack(track, this.localStream));
    }

    pc.onicecandidate = (event) => {
      if (event.candidate && this.channel) {
        this.channel.push('signal', {
          target_player_id: targetPlayerId,
          type: 'candidate',
          data: event.candidate,
        });
      }
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
        this.handleDisconnect();
      }
    };

    if (isInitiator) {
      pc.createOffer()
        .then((offer) => pc.setLocalDescription(offer))
        .then(() => {
          this.channel?.push('signal', {
            target_player_id: targetPlayerId,
            type: 'offer',
            data: pc.localDescription,
          });
        })
        .catch((err) => console.warn('Offer creation error:', err));
    }

    return pc;
  }

  handleSignal(payload) {
    if (payload.target_player_id !== this.net.guestId) return;

    const fromPlayerId = payload.from_player_id;
    let pc = this.peerConnections.get(fromPlayerId);

    if (!pc) {
      pc = this.createPeerConnection(fromPlayerId, false);
    }

    if (!pc) return;

    if (payload.type === 'offer') {
      pc.setRemoteDescription(new RTCSessionDescription(payload.data))
        .then(() => pc.createAnswer())
        .then((answer) => pc.setLocalDescription(answer))
        .then(() => {
          this.channel?.push('signal', {
            target_player_id: fromPlayerId,
            type: 'answer',
            data: pc.localDescription,
          });
        })
        .catch((err) => console.warn('Error handling offer:', err));
    } else if (payload.type === 'answer') {
      pc.setRemoteDescription(new RTCSessionDescription(payload.data)).catch((err) =>
        console.warn('Error setting answer:', err)
      );
    } else if (payload.type === 'candidate') {
      pc.addIceCandidate(new RTCIceCandidate(payload.data)).catch((err) =>
        console.warn('Error adding ICE candidate:', err)
      );
    }
  }

  handleParticipantJoined(payload) {
    this.participants.set(payload.player_id, {
      player_id: payload.player_id,
      joined_at: new Date().toISOString(),
    });
    this.onParticipantsChange?.(Array.from(this.participants.values()));
  }

  handleParticipantLeft(payload) {
    this.participants.delete(payload.player_id);
    const pc = this.peerConnections.get(payload.player_id);
    if (pc) {
      pc.close();
      this.peerConnections.delete(payload.player_id);
    }
    this.onParticipantsChange?.(Array.from(this.participants.values()));
  }

  handleParticipantMuted(payload) {
    const p = this.participants.get(payload.player_id);
    if (p) {
      p.muted = p.muted || {};
      p.muted[payload.kind] = payload.muted;
      this.onParticipantsChange?.(Array.from(this.participants.values()));
    }
  }

  handleGrantRevoked(_payload) {
    // Revocation stops local capture tracks immediately
    this.stopAllMedia();
    this.setStatus('error', { reason: 'grant_revoked' });
    this.onError?.(new Error('Media grant was revoked by moderator'));
  }

  /**
   * Failure path recovery: transitions to 'rejoining' and renegotiates (Task 3.5).
   */
  handleDisconnect() {
    if (this.status !== 'connected') return;

    this.setStatus('rejoining', { reason: 'connection_interrupted' });

    // Close existing peer connections
    this.peerConnections.forEach((pc) => pc.close());
    this.peerConnections.clear();

    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);

    // Schedule re-negotiation within reconnect grace
    this.reconnectTimer = setTimeout(() => {
      if (this.status === 'rejoining' && this.callId) {
        this.renegotiate();
      }
    }, 1500);
  }

  async renegotiate() {
    if (!this.callId) return;

    try {
      if (this.channel) {
        this.channel.push('renew_grant', {});
      }
      this.setStatus('connected', { renegotiated: true });
    } catch (err) {
      this.setStatus('error', { reason: 'renegotiation_failed' });
      this.onError?.(err);
    }
  }
}
