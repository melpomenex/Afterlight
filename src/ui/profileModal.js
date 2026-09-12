/**
 * Player profile UI: nickname editing and identity presence only. The former
 * market/satchel/contract/machine dialogs were removed with the garden
 * economy; nothing here reads or writes game economy state.
 */
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
    document.getElementById('profile-dialog').showModal();
  }

  updatePlayerHUD(player) {
    this.lastPlayer = player;
    const nickEl = document.getElementById('hud-nick');
    if (nickEl) nickEl.textContent = player.nickname;
    const profileSummary = document.getElementById('profile-player-summary');
    if (profileSummary) profileSummary.textContent = player.nickname;
  }
}
