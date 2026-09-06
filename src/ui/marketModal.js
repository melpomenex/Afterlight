import { CROPS, CROP_LIST, QUALITY_MULTIPLIERS } from '../../shared/crops.js';
import { calculateNpcSellPrice, calculateNpcSeedPrice } from '../../shared/economy.js';

export class UIManager {
  constructor(client, onAction = {}) {
    this.client = client;
    this.onAction = onAction;
    this.selectedCropId = 'radish';
    this.activeTool = 'hands'; // 'hands' | 'hoe' | 'seed' | 'water' | 'harvest'
    this.selectedSeed = 'radish';
    this.initDOM();
  }

  initDOM() {
    // Create UI Dialogs and inject them into document.body
    this.createMarketDialog();
    this.createSeedDialog();
    this.createContractDialog();
    this.createInventoryDialog();
    this.createProfileDialog();
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
      <div class="micro modal-header-tag">GARDENER'S SATCHEL</div>
      <h2>Inventory & Harvests</h2>
      <div class="inventory-sections">
        <div>
          <h3 class="micro">SEEDS & PROPAGATION</h3>
          <div id="inv-seeds-list" class="inv-grid"></div>
        </div>
        <div>
          <h3 class="micro">HARVESTED PRODUCE</h3>
          <div id="inv-produce-list" class="inv-grid"></div>
        </div>
      </div>
      <div class="modal-footer">
        <button id="close-inventory" class="btn-secondary">Close Satchel →</button>
      </div>
    `;
    document.body.append(dialog);
  }

  createProfileDialog() {
    const dialog = document.createElement('dialog');
    dialog.id = 'profile-dialog';
    dialog.className = 'game-modal';
    dialog.innerHTML = `
      <div class="micro modal-header-tag">GARDENER IDENTITY</div>
      <h2>Gardener Pass</h2>
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
    // Crop tabs in market
    const tabs = document.getElementById('market-crop-tabs');
    tabs.innerHTML = '';
    for (const crop of CROP_LIST) {
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
      const activeBtn = document.querySelector('#sell-quality-selector button.active');
      const quality = activeBtn ? activeBtn.dataset.qual : 'B';
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
    document.getElementById('inventory-dialog').showModal();
  }

  openProfile() {
    document.getElementById('profile-nick-input').value = this.client.nickname;
    document.getElementById('profile-dialog').showModal();
  }

  updateMarketView(pricesData = null, orderBookData = null) {
    if (pricesData) this.lastPrices = pricesData;
    if (orderBookData) this.lastOrderBook = orderBookData;

    const crop = CROPS[this.selectedCropId];
    if (!crop) return;

    document.getElementById('spot-crop-name').textContent = crop.name;
    document.getElementById('spot-crop-tagline').textContent = crop.tagline;

    const priceInfo = this.lastPrices ? this.lastPrices[crop.id] : null;
    const mult = priceInfo ? priceInfo.multiplier : 1.0;
    const activeQualBtn = document.querySelector('#sell-quality-selector button.active');
    const qual = activeQualBtn ? activeQualBtn.dataset.qual : 'B';
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
    seedsList.innerHTML = '';
    produceList.innerHTML = '';

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
        const crop = CROPS[cId];
        const item = document.createElement('div');
        item.className = 'inv-item';
        item.innerHTML = `<strong>${crop?.name || cId}</strong> <span class="badge-grade">Grade ${quality}</span> <span>${qty} units</span>`;
        produceList.append(item);
      }
    }
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
  }
}
