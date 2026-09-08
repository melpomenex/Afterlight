import { CROPS, CROP_LIST, QUALITY_MULTIPLIERS } from '../../shared/crops.js';
import { GOODS, GOOD_LIST, MATERIALS, MATERIAL_LIST, MILL_REQUIREMENT, SPRINKLER } from '../../shared/materials.js';
import { calculateNpcSellPrice, calculateNpcSeedPrice } from '../../shared/economy.js';
import { MSG_TYPES } from '../../shared/protocol.js';

export class UIManager {
  constructor(client, onAction = {}) {
    this.client = client;
    this.onAction = onAction;
    // Optional HUD-policy seam (deemphasize-legacy-farming): main.js injects
    // a () => policy for the active place. When absent, every view below
    // behaves exactly as before the contextual HUD existed.
    this.hudPolicyProvider = null;
    this.selectedCropId = 'radish';
    this.activeTool = 'hands'; // 'hands' | 'hoe' | 'seed' | 'water' | 'harvest' | 'sprinkler'
    this.selectedSeed = 'radish';
    // Sensible pre-connection default; replaced by server MACHINE_UPDATE.
    this.lastMachines = {
      mill: {
        status: 'broken',
        required: { ...MILL_REQUIREMENT },
        contributed: { copper: 0, timber: 0, glass: 0 },
        restoredAt: null,
      },
    };
    this.initDOM();
  }

  initDOM() {
    // Create UI Dialogs and inject them into document.body
    this.createMarketDialog();
    this.createSeedDialog();
    this.createContractDialog();
    this.createInventoryDialog();
    this.createProfileDialog();
    this.createMachineShopDialog();
    this.setupEventListeners();
  }

  createMarketDialog() {
    const dialog = document.createElement('dialog');
    dialog.id = 'market-dialog';
    dialog.className = 'game-modal';
    dialog.innerHTML = `
      <div class="micro modal-header-tag">TOWN COMMERCE · LIVE SPOT & ORDER BOOK</div>
      <h2>Market Exchange Board</h2>
      <p class="modal-sub">Trade graded produce with town merchants and other gardeners.</p>
      
      <div class="market-tabs" id="market-crop-tabs"></div>
      
      <div class="market-main-grid">
        <div class="market-spot-card panel">
          <div class="micro">SPOT TRADING</div>
          <h3 id="spot-crop-name">Red Radish</h3>
          <p id="spot-crop-tagline">Crisp peppery roots</p>
          <div class="spot-price-row">
            <div>
              <span class="micro">INSTANT BID</span>
              <strong id="spot-instant-bid">7 ⛁</strong>
            </div>
            <div>
              <span class="micro">BASE EQUILIBRIUM</span>
              <span id="spot-base-price">8 ⛁</span>
            </div>
            <div>
              <span class="micro">MARKET DEMAND</span>
              <span id="spot-multiplier">1.00x</span>
            </div>
          </div>
          
          <div class="sell-controls">
            <label class="micro">SELECT HARVEST GRADE & QTY TO SELL</label>
            <div class="quality-selector" id="sell-quality-selector">
              <button data-qual="C">Grade C</button>
              <button data-qual="B" class="active">Grade B</button>
              <button data-qual="A">Grade A</button>
              <button data-qual="A+">Grade A+</button>
            </div>
            <div class="qty-row">
              <span>Owned: <b id="sell-owned-qty">0</b></span>
              <input type="number" id="sell-qty-input" min="1" max="99" value="1">
              <button id="btn-instant-sell" class="action-btn">Sell to Market →</button>
            </div>
          </div>
        </div>

        <div class="orderbook-card panel">
          <div class="micro">ORDER BOOK (DOUBLE AUCTION)</div>
          <div class="orderbook-split">
            <div class="orderbook-col">
              <span class="micro asks-title">SELL ASKS (LOWEST FIRST)</span>
              <div id="orderbook-asks" class="book-list"></div>
            </div>
            <div class="orderbook-col">
              <span class="micro bids-title">BUY BIDS (HIGHEST FIRST)</span>
              <div id="orderbook-bids" class="book-list"></div>
            </div>
          </div>
          
          <div class="create-order-box">
            <div class="micro">POST LIMIT ORDER (2% FEE)</div>
            <div class="order-form-row">
              <select id="order-side"><option value="sell">SELL</option><option value="buy">BUY</option></select>
              <input type="number" id="order-price" placeholder="Price" min="1" value="10">
              <input type="number" id="order-qty" placeholder="Qty" min="1" value="2">
              <button id="btn-create-order">Post Order</button>
            </div>
          </div>
        </div>
      </div>

      <div class="modal-footer">
        <button id="close-market" class="btn-secondary">Close Market Board →</button>
      </div>
    `;
    document.body.append(dialog);
  }

  createSeedDialog() {
    const dialog = document.createElement('dialog');
    dialog.id = 'seed-dialog';
    dialog.className = 'game-modal';
    dialog.innerHTML = `
      <div class="micro modal-header-tag">TOWN SEED MERCHANT</div>
      <h2>Local Seed & Sprout Catalog</h2>
      <p class="modal-sub">Purchase fresh seed packets for your garden beds.</p>
      <div class="seed-grid" id="seed-catalog-list"></div>
      <div class="modal-footer">
        <button id="close-seed-dialog" class="btn-secondary">Close Seed Catalog →</button>
      </div>
    `;
    document.body.append(dialog);
  }

  createContractDialog() {
    const dialog = document.createElement('dialog');
    dialog.id = 'contract-dialog';
    dialog.className = 'game-modal';
    dialog.innerHTML = `
      <div class="micro modal-header-tag">TOWN NOTICEBOARD</div>
      <h2>Restaurant & Kitchen Contracts</h2>
      <p class="modal-sub">Supply local establishments with high-quality produce for coins, reputation, and XP.</p>
      <div class="contracts-list" id="contracts-container"></div>
      <div class="modal-footer">
        <button id="close-contracts" class="btn-secondary">Close Noticeboard →</button>
      </div>
    `;
    document.body.append(dialog);
  }

  createInventoryDialog() {
    const dialog = document.createElement('dialog');
    dialog.id = 'inventory-dialog';
    dialog.className = 'game-modal';
    dialog.innerHTML = `
      <div class="micro modal-header-tag">GARDENER’S SATCHEL</div>
      <h2>Inventory & Harvests</h2>
      <p class="modal-sub" id="inv-player-summary"></p>
      <div class="inventory-sections">
        <div>
          <h3 class="micro">SEEDS & PROPAGATION</h3>
          <div id="inv-seeds-list" class="inv-grid"></div>
        </div>
        <div>
          <h3 class="micro">HARVESTED PRODUCE</h3>
          <div id="inv-produce-list" class="inv-grid"></div>
        </div>
        <div>
          <h3 class="micro">MATERIALS & TOOLS</h3>
          <div id="inv-materials-list" class="inv-grid"></div>
        </div>
      </div>
      <div class="modal-footer">
        <button id="close-inventory" class="btn-secondary">Close Satchel →</button>
      </div>
    `;
    document.body.append(dialog);
  }

  createMachineShopDialog() {
    const dialog = document.createElement('dialog');
    dialog.id = 'machine-shop-dialog';
    dialog.className = 'game-modal';
    dialog.innerHTML = `
      <div class="micro modal-header-tag">MARKET COURT · MACHINE SHOP</div>
      <h2>The Great Mill</h2>
      <p class="modal-sub">A communal machine of the court. Restore it together — once turning, it grinds wheat into flour for everyone.</p>
      <div class="machine-grid">
        <div class="panel machine-card">
          <div class="micro">RESTORATION PROGRESS</div>
          <div id="mill-progress-summary"></div>
          <div id="mill-material-rows"></div>
        </div>
        <div class="panel machine-card">
          <div class="micro">MACHINE SHOP SERVICES</div>
          <div id="mill-flour-box"></div>
          <div id="sprinkler-craft-box"></div>
        </div>
      </div>
      <div class="modal-footer">
        <button id="close-machine-shop" class="btn-secondary">Leave the Machine Shop →</button>
      </div>
    `;
    document.body.append(dialog);
  }

  openMachineShop() {
    this.updateMachineShopView();
    document.getElementById('machine-shop-dialog').showModal();
  }

  createProfileDialog() {
    const dialog = document.createElement('dialog');
    dialog.id = 'profile-dialog';
    dialog.className = 'game-modal';
    dialog.innerHTML = `
      <div class="micro modal-header-tag">GARDENER IDENTITY</div>
      <h2>Gardener Pass</h2>
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
    // Crop & good tabs in market
    const tabs = document.getElementById('market-crop-tabs');
    tabs.innerHTML = '';
    const tradables = [...CROP_LIST, ...GOOD_LIST];
    for (const crop of tradables) {
      const btn = document.createElement('button');
      btn.className = `crop-tab ${crop.id === this.selectedCropId ? 'active' : ''}`;
      btn.textContent = crop.name;
      btn.onclick = () => {
        this.selectedCropId = crop.id;
        document.querySelectorAll('.crop-tab').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.updateMarketView();
      };
      tabs.append(btn);
    }

    // Quality selector in market
    document.querySelectorAll('#sell-quality-selector button').forEach(btn => {
      btn.onclick = () => {
        document.querySelectorAll('#sell-quality-selector button').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.updateMarketView();
      };
    });

    // Instant Sell button
    document.getElementById('btn-instant-sell').onclick = () => {
      const isGood = !!GOODS[this.selectedCropId];
      const activeBtn = document.querySelector('#sell-quality-selector button.active');
      const quality = isGood ? 'B' : (activeBtn ? activeBtn.dataset.qual : 'B');
      const qty = parseInt(document.getElementById('sell-qty-input').value, 10) || 1;
      this.client.sendMarketSell(this.selectedCropId, quality, qty);
    };

    // Create Order button
    document.getElementById('btn-create-order').onclick = () => {
      const side = document.getElementById('order-side').value;
      const price = parseFloat(document.getElementById('order-price').value) || 10;
      const qty = parseInt(document.getElementById('order-qty').value, 10) || 1;
      this.client.sendOrderPlace(side, this.selectedCropId, price, qty, 'B');
    };

    // Close buttons
    document.getElementById('close-market').onclick = () => document.getElementById('market-dialog').close();
    document.getElementById('close-seed-dialog').onclick = () => document.getElementById('seed-dialog').close();
    document.getElementById('close-contracts').onclick = () => document.getElementById('contract-dialog').close();
    document.getElementById('close-inventory').onclick = () => document.getElementById('inventory-dialog').close();
    document.getElementById('close-profile').onclick = () => document.getElementById('profile-dialog').close();
    document.getElementById('close-machine-shop').onclick = () => document.getElementById('machine-shop-dialog').close();

    // Closing a legacy dialog hands focus back to the game (native dialog
    // behavior) and reports out so main.js can drop held keys and any live
    // hop chain — the same hygiene as the Places selector and settings.
    for (const dialogId of ['market-dialog', 'inventory-dialog']) {
      document.getElementById(dialogId)?.addEventListener('close', () => this.onAction.onLegacyDialogClosed?.());
    }

    // Profile nickname save
    document.getElementById('btn-save-nickname').onclick = () => {
      const nick = document.getElementById('profile-nick-input').value.trim();
      if (nick) {
        this.client.setNickname(nick);
        document.getElementById('profile-dialog').close();
      }
    };
  }

  openMarket() {
    this.updateMarketView();
    this.labelLegacyDialog('market-dialog', 'TOWN COMMERCE · LIVE SPOT & ORDER BOOK');
    document.getElementById('market-dialog').showModal();
  }

  openSeedVendor() {
    this.updateSeedVendorView();
    document.getElementById('seed-dialog').showModal();
  }

  openContracts() {
    this.updateContractsView();
    document.getElementById('contract-dialog').showModal();
  }

  openInventory() {
    this.updateInventoryView();
    this.labelLegacyDialog('inventory-dialog', 'GARDENER’S SATCHEL');
    document.getElementById('inventory-dialog').showModal();
  }

  /**
   * In social places the retained legacy dialogs open with an explicit
   * "optional legacy" label; legacy contexts keep the original header. Only
   * textContent changes — ids and structure stay as shipped.
   */
  labelLegacyDialog(dialogId, baseTag) {
    const tag = document.querySelector(`#${dialogId} .modal-header-tag`);
    if (!tag) return;
    const social = this.hudPolicyProvider?.()?.context === 'social';
    tag.textContent = social ? `OPTIONAL LEGACY · ${baseTag}` : baseTag;
  }

  openProfile() {
    document.getElementById('profile-nick-input').value = this.client.nickname;
    document.getElementById('profile-dialog').showModal();
  }

  /**
   * Machine shop dialog: restoration progress, contributions, milling, and
   * sprinkler crafting. Renders from the last known machine + player state;
   * main.js calls this whenever MACHINE_UPDATE or inventory arrives.
   */
  updateMachineShopView(machines = null) {
    if (machines) this.lastMachines = machines;
    const mill = this.lastMachines?.mill;
    const summaryEl = document.getElementById('mill-progress-summary');
    const rowsEl = document.getElementById('mill-material-rows');
    const flourEl = document.getElementById('mill-flour-box');
    const craftEl = document.getElementById('sprinkler-craft-box');
    if (!summaryEl || !rowsEl || !mill) return;

    const player = this.lastPlayer;
    const materials = player?.materials || {};

    if (mill.status === 'restored') {
      summaryEl.innerHTML = `
        <strong class="mill-restored-line">✦ The Great Mill is turning.</strong>
        <p>Restored by the community. It grinds wheat into flour for everyone, permanently.</p>
      `;
      rowsEl.innerHTML = '';
    } else {
      let totalDone = 0, totalNeed = 0;
      let rows = '';
      for (const material of MATERIAL_LIST) {
        const need = mill.required?.[material.id] || 0;
        const done = Math.min(mill.contributed?.[material.id] || 0, need);
        totalDone += done;
        totalNeed += need;
        const held = materials[material.id] || 0;
        const remaining = need - done;
        const buttons = held > 0 && remaining > 0
          ? `<button class="btn-contribute" data-material="${material.id}" data-qty="1">Give 1</button>
             <button class="btn-contribute" data-material="${material.id}" data-qty="${Math.min(held, remaining)}">Give all</button>`
          : '';
        rows += `
          <div class="mill-material-row">
            <span class="mill-mat-name">${material.name}</span>
            <span class="mill-mat-count">${done} / ${need}</span>
            <span class="mill-mat-held">satchel: ${held}</span>
            ${buttons}
          </div>`;
      }
      summaryEl.innerHTML = `
        <strong>The Great Mill is broken.</strong>
        <p>Community restoration: ${totalDone} / ${totalNeed} materials delivered.</p>
      `;
      rowsEl.innerHTML = rows;
    }

    rowsEl.querySelectorAll('.btn-contribute').forEach(btn => {
      btn.onclick = () => {
        this.client.send(MSG_TYPES.MACHINE_CONTRIBUTE, {
          actionId: this.nextActionId(),
          material: btn.dataset.material,
          quantity: parseInt(btn.dataset.qty, 10) || 1,
        });
      };
    });

    if (mill.status === 'restored') {
      const qualities = ['C', 'B', 'A', 'A+'];
      const wheatHeld = qualities.reduce((sum, q) => sum + (player?.inventory?.produce?.[`wheat_${q}`] || 0), 0);
      const flourHeld = player?.inventory?.produce?.['flour_B'] || 0;
      flourEl.innerHTML = `
        <div class="micro">MILLING · WHEAT → FLOUR (1:1)</div>
        <p class="machine-hint">Wheat in satchel: ${wheatHeld} · Flour: ${flourHeld}</p>
        <div class="order-form-row">
          <input type="number" id="mill-qty-input" min="1" max="99" value="1">
          <button id="btn-mill-flour" class="action-btn"${wheatHeld <= 0 ? ' disabled' : ''}>Mill Flour</button>
        </div>
      `;
      const millBtn = flourEl.querySelector('#btn-mill-flour');
      if (millBtn) {
        millBtn.onclick = () => {
          const qty = parseInt(document.getElementById('mill-qty-input').value, 10) || 1;
          this.client.send(MSG_TYPES.MACHINE_MILL, { actionId: this.nextActionId(), quantity: qty });
        };
      }
    } else {
      flourEl.innerHTML = `
        <div class="micro">MILLING</div>
        <p class="machine-hint">The millstones wait. Restore the mill to grind wheat into flour.</p>
      `;
    }

    const costLines = Object.entries(SPRINKLER.cost)
      .map(([materialId, cost]) => `${cost}× ${MATERIALS[materialId].name}`)
      .join(' + ');
    const heldLine = Object.entries(SPRINKLER.cost)
      .map(([materialId, cost]) => `${materials[materialId] || 0}/${cost}`)
      .join(' · ');
    const canCraft = Object.entries(SPRINKLER.cost).every(([materialId, cost]) => (materials[materialId] || 0) >= cost);
    craftEl.innerHTML = `
      <div class="micro">CRAFT · ${SPRINKLER.name}</div>
      <p class="machine-hint">Cost: ${costLines}. Keeps covered beds watered on their own. (satchel: ${heldLine})</p>
      <button id="btn-craft-sprinkler" class="action-btn"${canCraft ? '' : ' disabled'}>Craft Sprinkler Kit</button>
    `;
    const craftBtn = craftEl.querySelector('#btn-craft-sprinkler');
    if (craftBtn) {
      craftBtn.onclick = () => {
        this.client.send(MSG_TYPES.MACHINE_CRAFT, { actionId: this.nextActionId(), fixture: SPRINKLER.id });
      };
    }
  }

  nextActionId() {
    return `act_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  }

  updateMarketView(pricesData = null, orderBookData = null) {
    if (pricesData) this.lastPrices = pricesData;
    if (orderBookData) this.lastOrderBook = orderBookData;

    const crop = CROPS[this.selectedCropId] || GOODS[this.selectedCropId];
    if (!crop) return;
    const isGood = !!GOODS[this.selectedCropId];

    document.getElementById('spot-crop-name').textContent = crop.name;
    document.getElementById('spot-crop-tagline').textContent = crop.tagline;

    const priceInfo = this.lastPrices ? this.lastPrices[crop.id] : null;
    const mult = priceInfo ? priceInfo.multiplier : 1.0;
    const activeQualBtn = document.querySelector('#sell-quality-selector button.active');
    const qual = isGood ? 'B' : (activeQualBtn ? activeQualBtn.dataset.qual : 'B');
    const bid = calculateNpcSellPrice(crop.id, qual, mult);

    document.getElementById('spot-instant-bid').textContent = `${bid} ⛁`;
    document.getElementById('spot-base-price').textContent = `${crop.basePrice} ⛁`;
    document.getElementById('spot-multiplier').textContent = `${mult.toFixed(2)}x`;

    // Update owned quantity
    const player = this.lastPlayer;
    let owned = 0;
    if (player && player.inventory && player.inventory.produce) {
      owned = player.inventory.produce[`${crop.id}_${qual}`] || 0;
    }
    document.getElementById('sell-owned-qty').textContent = owned;

    // Update Order Book
    const asksEl = document.getElementById('orderbook-asks');
    const bidsEl = document.getElementById('orderbook-bids');
    asksEl.innerHTML = '';
    bidsEl.innerHTML = '';

    if (this.lastOrderBook) {
      const asks = this.lastOrderBook.asks?.filter(o => o.cropId === crop.id) || [];
      const bids = this.lastOrderBook.bids?.filter(o => o.cropId === crop.id) || [];

      if (asks.length === 0) {
        asksEl.innerHTML = '<div class="empty-book">No active asks</div>';
      } else {
        for (const a of asks) {
          const row = document.createElement('div');
          row.className = 'book-row ask-row';
          row.innerHTML = `<span>${a.quantity}x</span> <strong>${a.price} ⛁</strong>`;
          asksEl.append(row);
        }
      }

      if (bids.length === 0) {
        bidsEl.innerHTML = '<div class="empty-book">No active bids</div>';
      } else {
        for (const b of bids) {
          const row = document.createElement('div');
          row.className = 'book-row bid-row';
          row.innerHTML = `<span>${b.quantity}x</span> <strong>${b.price} ⛁</strong>`;
          bidsEl.append(row);
        }
      }
    }
  }

  updateSeedVendorView() {
    const list = document.getElementById('seed-catalog-list');
    list.innerHTML = '';
    for (const crop of CROP_LIST) {
      const card = document.createElement('div');
      card.className = 'seed-card panel';
      const mult = this.lastPrices && this.lastPrices[crop.id] ? this.lastPrices[crop.id].multiplier : 1.0;
      const cost = calculateNpcSeedPrice(crop.id, mult);

      card.innerHTML = `
        <div class="micro">GROWTH: ${crop.growDuration}S · YIELD: ${crop.yield}x</div>
        <strong>${crop.name}</strong>
        <p>${crop.tagline}</p>
        <div class="seed-card-footer">
          <b>${cost} ⛁</b>
          <button data-crop="${crop.id}" class="btn-buy-seed">Buy Seed Packet</button>
        </div>
      `;
      card.querySelector('.btn-buy-seed').onclick = () => {
        this.client.sendMarketBuy(crop.id, 1);
      };
      list.append(card);
    }
  }

  updateContractsView(contracts = null) {
    if (contracts) this.lastContracts = contracts;
    const container = document.getElementById('contracts-container');
    container.innerHTML = '';
    const list = this.lastContracts || [];
    if (list.length === 0) {
      container.innerHTML = '<p>No active restaurant contracts at this moment. Check back soon!</p>';
      return;
    }

    for (const c of list) {
      const card = document.createElement('div');
      card.className = 'contract-card panel';
      card.innerHTML = `
        <div class="contract-head">
          <span class="micro">${c.client.toUpperCase()}</span>
          <span class="contract-reward">+${c.reward} ⛁ · +${c.reputation} ★ · +${c.xp} XP</span>
        </div>
        <strong>Order: ${c.quantity}x ${c.cropName} (Min Grade ${c.minQuality})</strong>
        <button data-id="${c.id}" class="btn-fulfill-contract">Deliver Order →</button>
      `;
      card.querySelector('.btn-fulfill-contract').onclick = () => {
        this.client.sendContractComplete(c.id);
      };
      container.append(card);
    }
  }

  updateInventoryView(player = null) {
    if (player) this.lastPlayer = player;
    const seedsList = document.getElementById('inv-seeds-list');
    const produceList = document.getElementById('inv-produce-list');
    const materialsList = document.getElementById('inv-materials-list');
    seedsList.innerHTML = '';
    produceList.innerHTML = '';
    materialsList.innerHTML = '';

    const p = this.lastPlayer;
    if (!p || !p.inventory) return;

    // Seeds
    const seeds = p.inventory.seeds || {};
    const seedEntries = Object.entries(seeds).filter(([_, qty]) => qty > 0);
    if (seedEntries.length === 0) {
      seedsList.innerHTML = '<div class="empty-msg">No seeds in satchel</div>';
    } else {
      for (const [cId, qty] of seedEntries) {
        const crop = CROPS[cId];
        const item = document.createElement('div');
        item.className = 'inv-item';
        item.innerHTML = `<strong>${crop?.name || cId}</strong> <span>${qty} packets</span>`;
        item.onclick = () => {
          this.selectedSeed = cId;
          this.activeTool = 'seed';
          this.onAction.onSelectTool?.('seed', cId);
          document.getElementById('inventory-dialog').close();
        };
        seedsList.append(item);
      }
    }

    // Produce
    const produce = p.inventory.produce || {};
    const produceEntries = Object.entries(produce).filter(([_, qty]) => qty > 0);
    if (produceEntries.length === 0) {
      produceList.innerHTML = '<div class="empty-msg">No harvested produce</div>';
    } else {
      for (const [key, qty] of produceEntries) {
        const [cId, quality] = key.split('_');
        const crop = CROPS[cId] || GOODS[cId];
        const isGood = !!GOODS[cId];
        const item = document.createElement('div');
        item.className = 'inv-item';
        item.innerHTML = `<strong>${crop?.name || cId}</strong> ${isGood ? '' : `<span class="badge-grade">Grade ${quality}</span>`} <span>${qty} units</span>`;
        produceList.append(item);
      }
    }

    // Materials & crafted tools (server-owned inventory)
    const materials = p.materials || {};
    const materialEntries = MATERIAL_LIST
      .map(material => [material, materials[material.id] || 0])
      .filter(([, qty]) => qty > 0);
    const sprinklerKits = p.inventory.sprinklers || 0;
    if (materialEntries.length === 0 && sprinklerKits <= 0) {
      materialsList.innerHTML = '<div class="empty-msg">No materials yet — gather them in the outer districts</div>';
    } else {
      for (const [material, qty] of materialEntries) {
        const item = document.createElement('div');
        item.className = 'inv-item';
        item.innerHTML = `<strong>${material.name}</strong> <span>${qty} units</span>`;
        materialsList.append(item);
      }
      if (sprinklerKits > 0) {
        const item = document.createElement('div');
        item.className = 'inv-item';
        item.innerHTML = `<strong>${SPRINKLER.name} kit</strong> <span>${sprinklerKits} ready — place on a bed (tool 6)</span>`;
        materialsList.append(item);
      }
    }
  }

  describePlayerProgress(player) {
    if (!player) return '';
    return `${player.coins} ⛁ · Lvl ${player.level || 1} · ${player.xp || 0} XP · ${player.reputation || 10} ★`;
  }

  updatePlayerHUD(player) {
    this.lastPlayer = player;
    const coinsEl = document.getElementById('hud-coins');
    const repEl = document.getElementById('hud-rep');
    const xpEl = document.getElementById('hud-xp');
    const nickEl = document.getElementById('hud-nick');

    if (coinsEl) coinsEl.textContent = `${player.coins} ⛁`;
    if (repEl) repEl.textContent = `${player.reputation || 10} ★`;
    if (xpEl) xpEl.textContent = `Lvl ${player.level || 1} · ${player.xp || 0} XP`;
    if (nickEl) nickEl.textContent = player.nickname;

    // Contextual HUD seam (deemphasize-legacy-farming): a welcome or
    // inventory snapshot refreshes cached values but can never reveal
    // sections the active place's policy keeps hidden — visibility is
    // re-asserted from the policy, never derived from the message. With no
    // provider, this stays a no-op and the last explicit decision stands.
    const policy = this.hudPolicyProvider?.() ?? null;
    const statsRow = document.querySelector('.player-stats-row');
    if (statsRow && policy) statsRow.hidden = !policy.sections.economyStats;
    // Progression stays readable inside the legacy dialogs themselves.
    const progress = this.describePlayerProgress(player);
    const invSummary = document.getElementById('inv-player-summary');
    if (invSummary) invSummary.textContent = progress;
    const profileSummary = document.getElementById('profile-player-summary');
    if (profileSummary) profileSummary.textContent = progress;
  }
}
