/**
 * Player profile UI: nickname editing, visitor pass identity, and interactive
 * Avatar Persona Picker.
 */
import {
  AVATAR_DEFINITIONS,
  getAvatarDefinition,
  normalizeAvatarId,
} from '../../shared/avatarDefinitions.js';

function formatRigLabel(rig) {
  if (rig === 'humanoid-heavy') return 'Heavy';
  if (rig === 'floating') return 'Floating';
  return 'Humanoid';
}

function formatRarityLabel(rarity) {
  if (!rarity) return 'Common';
  return rarity.charAt(0).toUpperCase() + rarity.slice(1);
}

export class UIManager {
  constructor(client, onAction = {}) {
    this.client = client;
    this.onAction = onAction;
    this.selectedAvatar = null;
    this.currentFilter = 'all';
    this.searchQuery = '';
    this.lastPlayer = null;
    this.createProfileDialog();
    this.setupEventListeners();
  }

  createProfileDialog() {
    const dialog = document.createElement('dialog');
    dialog.id = 'profile-dialog';
    dialog.className = 'game-modal game-modal--wide profile-modal--picker';
    dialog.innerHTML = `
      <div class="micro modal-header-tag">VISITOR IDENTITY</div>
      <h2>Visitor Pass &amp; Persona</h2>
      <p class="modal-sub" id="profile-player-summary">Your identity is stored permanently on the server via your persistent token.</p>

      <div class="profile-section">
        <label for="profile-nick-input" class="micro profile-section-label">CALLSIGN / NICKNAME</label>
        <div class="profile-input-row">
          <input type="text" id="profile-nick-input" maxlength="20" placeholder="Enter nickname..." autocomplete="off">
          <button id="btn-save-nickname" class="action-btn">Update Nickname</button>
        </div>
        <div id="profile-status-msg" class="profile-status-msg" aria-live="polite"></div>
      </div>

      <div class="profile-section">
        <div class="micro profile-section-label">ACTIVE PERSONA</div>
        <div class="profile-active-persona" id="profile-active-persona">
          <img id="profile-active-thumb" class="profile-active-thumb" src="/avatars/moon-head/preview.png" alt="Equipped avatar preview">
          <div class="profile-active-details">
            <div class="micro profile-active-tag">EQUIPPED AVATAR</div>
            <div class="profile-active-name-row">
              <h3 id="profile-avatar-name" class="profile-active-name">Moon Head</h3>
              <span id="profile-active-rig" class="avatar-badge avatar-badge--rig">Humanoid</span>
              <span id="profile-active-rarity" class="avatar-badge avatar-badge--common">Common</span>
            </div>
            <p id="profile-active-desc" class="profile-active-desc">A celestial wanderer exploring the industrial ruins.</p>
          </div>
        </div>
      </div>

      <div class="profile-section">
        <div class="avatar-picker-controls">
          <div class="avatar-filters" id="avatar-filters" role="tablist" aria-label="Avatar categories">
            <button type="button" class="avatar-filter-chip active" data-filter="all">All (${AVATAR_DEFINITIONS.length})</button>
            <button type="button" class="avatar-filter-chip" data-filter="humanoid">Humanoid (${AVATAR_DEFINITIONS.filter(d => d.rig === 'humanoid').length})</button>
            <button type="button" class="avatar-filter-chip" data-filter="humanoid-heavy">Heavy (${AVATAR_DEFINITIONS.filter(d => d.rig === 'humanoid-heavy').length})</button>
            <button type="button" class="avatar-filter-chip" data-filter="floating">Floating (${AVATAR_DEFINITIONS.filter(d => d.rig === 'floating').length})</button>
          </div>
          <div class="avatar-search-wrap">
            <input type="search" id="avatar-search-input" class="avatar-search-input" placeholder="Search avatars..." aria-label="Search avatars by name, tag, or rarity">
          </div>
        </div>

        <div id="avatar-picker-grid" class="avatar-grid" role="radiogroup" aria-label="Avatar persona selection"></div>
      </div>

      <div class="modal-footer">
        <button id="close-profile" class="btn-secondary">Done →</button>
      </div>
    `;
    document.body.append(dialog);
    this.renderGrid();
  }

  setupEventListeners() {
    const dialog = document.getElementById('profile-dialog');
    const closeBtn = document.getElementById('close-profile');
    if (closeBtn && dialog) {
      closeBtn.onclick = () => dialog.close();
    }

    const saveNickBtn = document.getElementById('btn-save-nickname');
    const nickInput = document.getElementById('profile-nick-input');
    const doSaveNick = () => {
      const nick = nickInput?.value.trim();
      if (nick) {
        this.client.setNickname(nick);
        this.setStatus('Nickname updated successfully');
      }
    };
    if (saveNickBtn) {
      saveNickBtn.onclick = doSaveNick;
    }
    if (nickInput) {
      nickInput.onkeydown = (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          doSaveNick();
        }
      };
    }

    // Category filter chips
    const filterContainer = document.getElementById('avatar-filters');
    if (filterContainer) {
      filterContainer.onclick = (e) => {
        const btn = e.target.closest?.('.avatar-filter-chip');
        if (!btn) return;
        const filter = btn.dataset.filter;
        if (filter && filter !== this.currentFilter) {
          this.currentFilter = filter;
          const chips = filterContainer.querySelectorAll?.('.avatar-filter-chip') || [];
          for (const chip of chips) {
            chip.classList?.toggle?.('active', chip.dataset.filter === filter);
          }
          this.renderGrid();
        }
      };
    }

    // Search input
    const searchInput = document.getElementById('avatar-search-input');
    if (searchInput) {
      searchInput.oninput = () => {
        this.searchQuery = (searchInput.value || '').trim().toLowerCase();
        this.renderGrid();
      };
    }

    // Avatar grid clicks and keyboard selection
    const grid = document.getElementById('avatar-picker-grid');
    if (grid) {
      grid.onclick = (e) => {
        const card = e.target.closest?.('.avatar-card');
        if (card && card.dataset.avatarId) {
          this.selectAvatar(card.dataset.avatarId);
        }
      };
      grid.onkeydown = (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          const card = e.target.closest?.('.avatar-card');
          if (card && card.dataset.avatarId) {
            e.preventDefault();
            this.selectAvatar(card.dataset.avatarId);
          }
        }
      };
    }
  }

  setStatus(msg) {
    const statusEl = document.getElementById('profile-status-msg');
    if (statusEl) {
      statusEl.textContent = msg;
      if (this._statusTimer) clearTimeout(this._statusTimer);
      this._statusTimer = setTimeout(() => {
        if (statusEl.textContent === msg) {
          statusEl.textContent = '';
        }
      }, 4000);
    }
  }

  selectAvatar(avatarId) {
    const norm = normalizeAvatarId(avatarId);
    if (!norm) return;

    this.selectedAvatar = norm;
    this.updateActiveShowcase(norm);

    // Update grid selection highlights
    const grid = document.getElementById('avatar-picker-grid');
    if (grid) {
      const cards = grid.querySelectorAll?.('.avatar-card') || [];
      for (const card of cards) {
        const isSel = card.dataset.avatarId === norm;
        card.classList?.toggle?.('selected', isSel);
        card.setAttribute?.('aria-checked', isSel ? 'true' : 'false');
      }
    }

    // Network & local update
    if (this.client?.setAvatar) {
      this.client.setAvatar(norm);
    }
    if (this.onAction?.onAvatarChange) {
      this.onAction.onAvatarChange(norm);
    }

    const def = getAvatarDefinition(norm);
    this.setStatus(`Avatar changed to ${def ? def.name : norm}`);
  }

  updateActiveShowcase(avatarId) {
    const def = getAvatarDefinition(avatarId);
    const nameEl = document.getElementById('profile-avatar-name');
    const thumbEl = document.getElementById('profile-active-thumb');
    const rigEl = document.getElementById('profile-active-rig');
    const rarityEl = document.getElementById('profile-active-rarity');
    const descEl = document.getElementById('profile-active-desc');

    if (nameEl) {
      nameEl.textContent = def ? def.name : (avatarId || 'Visitor');
    }
    if (thumbEl) {
      thumbEl.src = def ? `/avatars/${def.id}/preview.png` : '/avatars/moon-head/preview.png';
      thumbEl.alt = def ? `${def.name} preview` : 'Avatar preview';
    }
    if (rigEl) {
      rigEl.textContent = def ? formatRigLabel(def.rig) : 'Standard';
      rigEl.className = `avatar-badge ${def ? `avatar-badge--${def.rig}` : 'avatar-badge--rig'}`;
    }
    if (rarityEl) {
      rarityEl.textContent = def ? formatRarityLabel(def.rarity) : 'Common';
      rarityEl.className = `avatar-badge ${def ? `avatar-badge--${def.rarity}` : 'avatar-badge--common'}`;
    }
    if (descEl) {
      const tags = (def && Array.isArray(def.tags)) ? def.tags.join(', ') : '';
      descEl.textContent = tags ? `Persona motifs: ${tags}` : 'Equipped avatar persona for Afterlight.';
    }
  }

  renderGrid() {
    const grid = document.getElementById('avatar-picker-grid');
    if (!grid) return;

    const query = this.searchQuery;
    const filter = this.currentFilter;

    const matching = AVATAR_DEFINITIONS.filter((def) => {
      // Rig filter
      if (filter !== 'all' && def.rig !== filter) {
        return false;
      }
      // Search filter
      if (query) {
        const inName = def.name.toLowerCase().includes(query);
        const inId = def.id.toLowerCase().includes(query);
        const inRarity = (def.rarity || '').toLowerCase().includes(query);
        const inRig = (def.rig || '').toLowerCase().includes(query);
        const inTags = Array.isArray(def.tags) && def.tags.some((t) => t.toLowerCase().includes(query));
        if (!inName && !inId && !inRarity && !inRig && !inTags) {
          return false;
        }
      }
      return true;
    });

    if (matching.length === 0) {
      grid.innerHTML = `<div class="avatar-grid-empty">No avatars match your search or category filter.</div>`;
      return;
    }

    grid.innerHTML = matching
      .map((def) => {
        const isSelected = this.selectedAvatar === def.id;
        const rigLabel = formatRigLabel(def.rig);
        const rarityLabel = formatRarityLabel(def.rarity);
        return `
          <div class="avatar-card ${isSelected ? 'selected' : ''}"
               data-avatar-id="${def.id}"
               role="radio"
               aria-checked="${isSelected ? 'true' : 'false'}"
               tabindex="0"
               title="${def.name} (${rigLabel} • ${rarityLabel})">
            <div class="avatar-card-thumb-wrap">
              <img src="/avatars/${def.id}/preview.png" alt="${def.name}" loading="lazy" class="avatar-card-thumb">
              <div class="avatar-card-check" aria-hidden="true">✓</div>
            </div>
            <div class="avatar-card-info">
              <div class="avatar-card-name">${def.name}</div>
              <div class="avatar-card-meta">
                <span class="avatar-badge avatar-badge--${def.rig}">${rigLabel}</span>
                <span class="avatar-badge avatar-badge--${def.rarity}">${rarityLabel}</span>
              </div>
            </div>
          </div>
        `;
      })
      .join('');
  }

  openProfile() {
    const nickInput = document.getElementById('profile-nick-input');
    if (nickInput && this.client) {
      nickInput.value = this.client.nickname || '';
    }

    const currentAvatar = this.lastPlayer?.avatar || this.selectedAvatar;
    if (currentAvatar) {
      this.selectedAvatar = currentAvatar;
      this.updateActiveShowcase(currentAvatar);
    }

    this.renderGrid();

    const dialog = document.getElementById('profile-dialog');
    if (dialog && typeof dialog.showModal === 'function') {
      dialog.showModal();
    }
  }

  updatePlayerHUD(player) {
    this.lastPlayer = player;
    const nickEl = document.getElementById('hud-nick');
    if (nickEl && player.nickname) {
      nickEl.textContent = player.nickname;
    }
    const profileSummary = document.getElementById('profile-player-summary');
    if (profileSummary && player.nickname) {
      profileSummary.textContent = player.nickname;
    }

    this.selectedAvatar = player.avatar || null;
    this.updateActiveShowcase(player.avatar);

    // If modal is open or rendered, update grid selection
    const grid = document.getElementById('avatar-picker-grid');
    if (grid) {
      const cards = grid.querySelectorAll?.('.avatar-card') || [];
      for (const card of cards) {
        const isSel = card.dataset.avatarId === player.avatar;
        card.classList?.toggle?.('selected', isSel);
        card.setAttribute?.('aria-checked', isSel ? 'true' : 'false');
      }
    }
  }
}
