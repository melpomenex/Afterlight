/**
 * Player profile UI: nickname editing and identity presence only. The former
 * market/satchel/contract/machine dialogs were removed with the garden
 * economy; nothing here reads or writes game economy state.
 */
import { getAvatarDefinition } from '../../shared/avatarDefinitions.js';

export class UIManager {
  constructor(client, onAction = {}) {
    this.client = client;
    this.onAction = onAction;
    this.createProfileDialog();
    this.setupEventListeners();
  }

  createProfileDialog() {
    const dialog = document.createElement('dialog');
    dialog.id = 'profile-dialog';
    dialog.className = 'game-modal';
    dialog.innerHTML = `
      <div class="micro modal-header-tag">VISITOR IDENTITY</div>
      <h2>Visitor Pass</h2>
      <p class="modal-sub" id="profile-player-summary"></p>
      <div id="profile-avatar-row" class="profile-avatar-row" style="margin-bottom: 14px; font-size: 13px; color: #d6e2dc;">
        <span class="micro" style="color: #a4b4ad; text-transform: uppercase; letter-spacing: 0.08em;">Assigned Avatar:</span>
        <strong id="profile-avatar-name" style="color: #cbb886; margin-left: 6px;">Visitor</strong>
      </div>
      <p>Your identity is stored permanently on the server via your persistent token.</p>
      <label>Nickname: <input type="text" id="profile-nick-input" maxlength="20"></label>
      <button id="btn-save-nickname" class="action-btn">Update Nickname</button>
      <div class="modal-footer">
        <button id="close-profile" class="btn-secondary">Close →</button>
      </div>
    `;
    document.body.append(dialog);
  }

  setupEventListeners() {
    document.getElementById('close-profile').onclick = () => document.getElementById('profile-dialog').close();

    document.getElementById('btn-save-nickname').onclick = () => {
      const nick = document.getElementById('profile-nick-input').value.trim();
      if (nick) {
        this.client.setNickname(nick);
        document.getElementById('profile-dialog').close();
      }
    };
  }

  openProfile() {
    document.getElementById('profile-nick-input').value = this.client.nickname;
    const avatarNameEl = document.getElementById('profile-avatar-name');
    if (avatarNameEl && this.lastPlayer) {
      const def = this.lastPlayer?.avatar ? getAvatarDefinition(this.lastPlayer.avatar) : null;
      avatarNameEl.textContent = def ? def.name : (this.lastPlayer?.avatar || 'Visitor');
    }
    document.getElementById('profile-dialog').showModal();
  }

  updatePlayerHUD(player) {
    this.lastPlayer = player;
    const nickEl = document.getElementById('hud-nick');
    if (nickEl) nickEl.textContent = player.nickname;
    const profileSummary = document.getElementById('profile-player-summary');
    if (profileSummary) profileSummary.textContent = player.nickname;
    const avatarNameEl = document.getElementById('profile-avatar-name');
    if (avatarNameEl) {
      const def = player?.avatar ? getAvatarDefinition(player.avatar) : null;
      avatarNameEl.textContent = def ? def.name : (player?.avatar || 'Visitor');
    }
  }
}
