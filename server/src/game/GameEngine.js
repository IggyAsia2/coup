const { CHARACTERS, CHAR_VI, ACTIONS, ACTION_CONFIG, PHASES } = require('./constants');
const vi = (char) => CHAR_VI[char] || char;

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

function createDeck() {
  const deck = [];
  Object.values(CHARACTERS).forEach(c => {
    for (let i = 0; i < 3; i++) deck.push(c);
  });
  shuffle(deck);
  return deck;
}

class GameEngine {
  constructor() {
    this.players = [];
    this.spectators = [];
    this.deck = [];
    this.phase = PHASES.WAITING;
    this.currentPlayerIndex = 0;
    this.currentAction = null;
    this.currentBlock = null;
    this.pendingResponses = new Set();
    this.pendingLoseInfluence = null;
    this.exchangeCards = [];
    this.log = [];
    this.winner = null;
  }

  addPlayer(socketId, name, persistentId) {
    if (this.players.find(p => p.persistentId === persistentId)) return { error: 'Bạn đã ở trong phòng' };
    if (this.spectators.find(s => s.persistentId === persistentId)) return { error: 'Bạn đang xem ván này' };

    if (this.phase !== PHASES.WAITING) {
      // Game đang chạy → vào xem
      this.spectators.push({ id: socketId, persistentId, name, connected: true });
      return { ok: true, spectator: true };
    }

    if (this.players.length >= 6) return { error: 'Phòng đã đầy' };
    this.players.push({ id: socketId, persistentId, name, coins: 2, cards: [], connected: true });
    return { ok: true, spectator: false };
  }

  rejoinPlayer(socketId, persistentId) {
    const p = this.players.find(p => p.persistentId === persistentId);
    if (p) {
      p.id = socketId;
      p.connected = true;
      return { ok: true, spectator: false };
    }
    const s = this.spectators.find(s => s.persistentId === persistentId);
    if (s) {
      s.id = socketId;
      s.connected = true;
      return { ok: true, spectator: true };
    }
    return { error: 'Không tìm thấy người chơi trong phòng' };
  }

  removePlayer(socketId) {
    if (this.phase === PHASES.WAITING) {
      this.players = this.players.filter(p => p.id !== socketId);
    } else {
      const p = this.players.find(p => p.id === socketId);
      if (p) { p.connected = false; return; }
      const s = this.spectators.find(s => s.id === socketId);
      if (s) s.connected = false;
    }
  }

  getAllConnected() {
    return [...this.players, ...this.spectators];
  }

  getPlayerBySocketId(socketId) {
    return this.players.find(p => p.id === socketId);
  }

  startGame() {
    if (this.players.length < 2) return { error: 'Cần ít nhất 2 người chơi' };
    this.deck = createDeck();
    this.players.forEach(p => {
      p.coins = 2;
      p.cards = [
        { character: this.deck.pop(), revealed: false },
        { character: this.deck.pop(), revealed: false },
      ];
    });
    this.phase = PHASES.ACTION;
    this.currentPlayerIndex = 0;
    this.log = ['Trò chơi bắt đầu! Lượt của ' + this.players[0].name + '.'];
    return { ok: true };
  }

  getActivePlayers() {
    return this.players.filter(p => p.cards.some(c => !c.revealed));
  }

  getCurrentPlayer() {
    return this.players[this.currentPlayerIndex];
  }

  getPlayerById(id) {
    return this.players.find(p => p.id === id);
  }

  playerHasCharacter(playerId, character) {
    const p = this.getPlayerById(playerId);
    return p && p.cards.some(c => c.character === character && !c.revealed);
  }

  getStateFor(playerId) {
    const isSpectator = this.spectators.some(s => s.id === playerId);
    return {
      phase: this.phase,
      isSpectator,
      players: this.players.map(p => ({
        id: p.id,
        name: p.name,
        coins: p.coins,
        connected: p.connected,
        cards: p.cards.map(c => ({
          character: (!isSpectator && p.id === playerId || c.revealed) ? c.character : '?',
          revealed: c.revealed,
        })),
        influence: p.cards.filter(c => !c.revealed).length,
      })),
      spectators: this.spectators.map(s => ({ id: s.id, name: s.name, connected: s.connected })),
      currentPlayerId: this.getCurrentPlayer()?.id,
      currentAction: this.currentAction,
      currentBlock: this.currentBlock,
      pendingResponses: [...this.pendingResponses],
      pendingLoseInfluence: this.pendingLoseInfluence
        ? { playerId: this.pendingLoseInfluence.playerId, reason: this.pendingLoseInfluence.reason }
        : null,
      exchangeCards: playerId === this.currentAction?.actorId ? this.exchangeCards : null,
      log: this.log.slice(-30),
      winner: this.winner,
    };
  }

  takeAction(playerId, actionType, targetId) {
    if (this.phase !== PHASES.ACTION) return { error: 'Chưa đến lượt chọn hành động' };
    const player = this.getCurrentPlayer();
    if (!player || player.id !== playerId) return { error: 'Chưa đến lượt của bạn' };

    const config = ACTION_CONFIG[actionType];
    if (!config) return { error: 'Hành động không hợp lệ' };

    if (player.coins >= 10 && actionType !== ACTIONS.COUP) {
      return { error: 'Bạn có 10+ đồng — bắt buộc phải Đảo chính!' };
    }

    if (config.cost && player.coins < config.cost) {
      return { error: `Cần ${config.cost} đồng để thực hiện hành động này` };
    }

    if (config.needsTarget) {
      const target = this.getPlayerById(targetId);
      if (!target || !target.cards.some(c => !c.revealed)) return { error: 'Mục tiêu không hợp lệ' };
      if (targetId === playerId) return { error: 'Không thể nhắm vào chính mình' };
    }

    this.currentAction = {
      type: actionType,
      actorId: playerId,
      targetId: targetId || null,
      claimedCharacter: config.claimedCharacter,
    };

    const targetName = targetId ? this.getPlayerById(targetId)?.name : null;
    this.addLog(
      `${player.name} tuyên bố ${config.label}` +
      (config.claimedCharacter ? ` (nhận là ${vi(config.claimedCharacter)})` : '') +
      (targetName ? ` → ${targetName}` : '')
    );

    if (!config.challengeable && !config.blockable) {
      return this._resolveAction();
    }

    this.phase = PHASES.ACTION_RESPONSE;
    this.pendingResponses = new Set(
      this.getActivePlayers()
        .filter(p => p.id !== playerId)
        .map(p => p.id)
    );
    return { ok: true };
  }

  challenge(challengerId) {
    if (this.phase !== PHASES.ACTION_RESPONSE && this.phase !== PHASES.BLOCK_RESPONSE) {
      return { error: 'Không thể thách thức lúc này' };
    }
    if (!this.pendingResponses.has(challengerId)) return { error: 'Chưa đến lượt phản hồi của bạn' };

    const challenger = this.getPlayerById(challengerId);

    if (this.phase === PHASES.ACTION_RESPONSE) {
      const { actorId, claimedCharacter } = this.currentAction;
      if (!claimedCharacter) return { error: 'Hành động này không thể bị thách thức' };
      const actor = this.getPlayerById(actorId);

      this.addLog(`${challenger.name} thách thức ${actor.name} về ${vi(claimedCharacter)}!`);
      this.pendingResponses = new Set();

      if (this.playerHasCharacter(actorId, claimedCharacter)) {
        // Actor wins challenge — challenger loses influence, actor reshuffles card
        const cardIdx = actor.cards.findIndex(c => c.character === claimedCharacter && !c.revealed);
        this.deck.push(actor.cards[cardIdx].character);
        shuffle(this.deck);
        actor.cards[cardIdx].character = this.deck.pop();
        this.addLog(`${actor.name} lật ${vi(claimedCharacter)} — thách thức thất bại! ${challenger.name} mất ảnh hưởng.`);
        return this._queueLoseInfluence(challengerId, 'lost_challenge', () => this._resolveAction());
      } else {
        // Challenger wins — actor loses influence, action fails
        this.addLog(`${actor.name} KHÔNG có ${vi(claimedCharacter)}! ${actor.name} mất ảnh hưởng. Hành động bị hủy.`);
        return this._queueLoseInfluence(actorId, 'failed_claim', () => {
          this.currentAction = null;
          this._advanceTurn();
        });
      }
    } else {
      // Challenging a block
      const { blockerId, claimedCharacter } = this.currentBlock;
      const blocker = this.getPlayerById(blockerId);

      this.addLog(`${challenger.name} thách thức lệnh chặn của ${blocker.name} (${vi(claimedCharacter)})!`);
      this.pendingResponses = new Set();

      if (this.playerHasCharacter(blockerId, claimedCharacter)) {
        // Blocker wins — challenger loses, block stands
        const cardIdx = blocker.cards.findIndex(c => c.character === claimedCharacter && !c.revealed);
        this.deck.push(blocker.cards[cardIdx].character);
        shuffle(this.deck);
        blocker.cards[cardIdx].character = this.deck.pop();
        this.addLog(`${blocker.name} lật ${vi(claimedCharacter)} — lệnh chặn thành công! ${challenger.name} mất ảnh hưởng.`);
        return this._queueLoseInfluence(challengerId, 'lost_challenge', () => {
          this.currentAction = null;
          this.currentBlock = null;
          this._advanceTurn();
        });
      } else {
        // Challenger wins — blocker loses, action proceeds
        this.addLog(`${blocker.name} KHÔNG có ${vi(claimedCharacter)}! Lệnh chặn thất bại — hành động tiếp tục.`);
        return this._queueLoseInfluence(blockerId, 'failed_block', () => {
          this.currentBlock = null;
          this._resolveAction();
        });
      }
    }
  }

  block(blockerId, claimedCharacter) {
    if (this.phase !== PHASES.ACTION_RESPONSE) return { error: 'Không thể chặn lúc này' };
    if (!this.pendingResponses.has(blockerId)) return { error: 'Chưa đến lượt phản hồi của bạn' };

    const config = ACTION_CONFIG[this.currentAction.type];
    if (!config.blockable) return { error: 'Hành động này không thể bị chặn' };
    if (!config.blockedBy.includes(claimedCharacter)) return { error: `${claimedCharacter} không thể chặn hành động này` };

    if (this.currentAction.type === ACTIONS.ASSASSINATE && blockerId !== this.currentAction.targetId) {
      return { error: 'Chỉ mục tiêu bị ám sát mới có thể chặn' };
    }
    if (blockerId === this.currentAction.actorId) return { error: 'Không thể chặn hành động của chính mình' };

    const blocker = this.getPlayerById(blockerId);
    this.currentBlock = { blockerId, claimedCharacter };
    this.addLog(`${blocker.name} chặn bằng ${vi(claimedCharacter)}!`);

    this.phase = PHASES.BLOCK_RESPONSE;
    this.pendingResponses = new Set(
      this.getActivePlayers()
        .filter(p => p.id !== blockerId)
        .map(p => p.id)
    );
    return { ok: true };
  }

  pass(playerId) {
    if (this.phase !== PHASES.ACTION_RESPONSE && this.phase !== PHASES.BLOCK_RESPONSE) {
      return { error: 'Không thể bỏ qua lúc này' };
    }
    if (!this.pendingResponses.has(playerId)) return { error: 'Chưa đến lượt phản hồi của bạn' };

    this.pendingResponses.delete(playerId);

    if (this.pendingResponses.size === 0) {
      if (this.phase === PHASES.ACTION_RESPONSE) {
        return this._resolveAction();
      } else {
        this.addLog('Không ai thách thức. Lệnh chặn thành công — hành động bị hủy.');
        this.currentAction = null;
        this.currentBlock = null;
        this._advanceTurn();
        return { ok: true };
      }
    }
    return { ok: true };
  }

  loseInfluence(playerId, cardIndex) {
    if (this.phase !== PHASES.LOSE_INFLUENCE) return { error: 'Chưa đến lượt mất ảnh hưởng' };
    const pending = this.pendingLoseInfluence;
    if (!pending || pending.playerId !== playerId) return { error: 'Chưa đến lượt của bạn' };

    const player = this.getPlayerById(playerId);
    const card = player?.cards[cardIndex];
    if (!card || card.revealed) return { error: 'Lá bài không hợp lệ' };

    card.revealed = true;
    this.addLog(`${player.name} lật ngửa và mất ${vi(card.character)}`);

    if (player.cards.every(c => c.revealed)) {
      this.addLog(`${player.name} bị loại!`);
    }

    const activePlayers = this.getActivePlayers();
    if (activePlayers.length === 1) {
      this.winner = activePlayers[0].id;
      this.phase = PHASES.GAME_OVER;
      this.addLog(`🏆 ${activePlayers[0].name} wins the game!`);
      this.pendingLoseInfluence = null;
      return { ok: true };
    }

    const callback = pending.callback;
    this.pendingLoseInfluence = null;
    callback();
    return { ok: true };
  }

  _queueLoseInfluence(playerId, reason, callback) {
    const player = this.getPlayerById(playerId);
    const activeCards = player?.cards.filter(c => !c.revealed) || [];

    if (activeCards.length === 0) {
      callback();
      return { ok: true };
    }

    if (activeCards.length === 1) {
      const cardIdx = player.cards.findIndex(c => !c.revealed);
      player.cards[cardIdx].revealed = true;
      this.addLog(`${player.name} lật ngửa và mất ${vi(player.cards[cardIdx].character)}`);
      this.addLog(`${player.name} bị loại!`);

      const activePlayers = this.getActivePlayers();
      if (activePlayers.length === 1) {
        this.winner = activePlayers[0].id;
        this.phase = PHASES.GAME_OVER;
        this.addLog(`🏆 ${activePlayers[0].name} thắng trò chơi!`);
        return { ok: true };
      }

      callback();
      return { ok: true };
    }

    this.pendingLoseInfluence = { playerId, reason, callback };
    this.phase = PHASES.LOSE_INFLUENCE;
    return { ok: true };
  }

  _resolveAction() {
    const { type, actorId, targetId } = this.currentAction;
    const actor = this.getPlayerById(actorId);
    const target = targetId ? this.getPlayerById(targetId) : null;
    const config = ACTION_CONFIG[type];

    if (config.cost) actor.coins -= config.cost;

    switch (type) {
      case ACTIONS.INCOME:
        actor.coins += 1;
        this.addLog(`${actor.name} thu nhập (+1 đồng → ${actor.coins} tổng)`);
        this.currentAction = null;
        this._advanceTurn();
        break;

      case ACTIONS.FOREIGN_AID:
        actor.coins += 2;
        this.addLog(`${actor.name} lấy viện trợ nước ngoài (+2 đồng → ${actor.coins} tổng)`);
        this.currentAction = null;
        this._advanceTurn();
        break;

      case ACTIONS.COUP:
        this.addLog(`${actor.name} đảo chính ${target.name}!`);
        this.currentAction = null;
        return this._queueLoseInfluence(targetId, 'coup', () => this._advanceTurn());

      case ACTIONS.TAX:
        actor.coins += 3;
        this.addLog(`${actor.name} thu thuế (+3 đồng → ${actor.coins} tổng)`);
        this.currentAction = null;
        this._advanceTurn();
        break;

      case ACTIONS.ASSASSINATE:
        this.addLog(`${actor.name} ám sát ${target.name}!`);
        this.currentAction = null;
        return this._queueLoseInfluence(targetId, 'assassinated', () => this._advanceTurn());

      case ACTIONS.STEAL: {
        const stolen = Math.min(2, target.coins);
        target.coins -= stolen;
        actor.coins += stolen;
        this.addLog(`${actor.name} cướp ${stolen} đồng từ ${target.name}`);
        this.currentAction = null;
        this._advanceTurn();
        break;
      }

      case ACTIONS.EXCHANGE: {
        const drawn = [];
        if (this.deck.length > 0) drawn.push(this.deck.pop());
        if (this.deck.length > 0) drawn.push(this.deck.pop());
        this.exchangeCards = drawn;
        this.addLog(`${actor.name} rút bài để đổi — chọn bài muốn giữ`);
        this.phase = PHASES.EXCHANGE_SELECT;
        break;
      }
    }
    return { ok: true };
  }

  exchangeSelect(playerId, selectedIndices) {
    if (this.phase !== PHASES.EXCHANGE_SELECT) return { error: 'Chưa đến lượt đổi bài' };
    if (!this.currentAction || playerId !== this.currentAction.actorId) return { error: 'Không phải lượt đổi bài của bạn' };

    const actor = this.getPlayerById(playerId);
    const activeCards = actor.cards.filter(c => !c.revealed);
    const allCards = [...activeCards.map(c => c.character), ...this.exchangeCards];
    const keepCount = activeCards.length;

    if (selectedIndices.length !== keepCount) return { error: `Phải chọn đúng ${keepCount} lá bài` };
    if (selectedIndices.some(i => i < 0 || i >= allCards.length)) return { error: 'Chỉ số bài không hợp lệ' };
    if (new Set(selectedIndices).size !== selectedIndices.length) return { error: 'Không được chọn trùng' };

    const kept = selectedIndices.map(i => allCards[i]);
    const returned = allCards.filter((_, i) => !selectedIndices.includes(i));

    let ki = 0;
    actor.cards.forEach((card, i) => {
      if (!card.revealed) actor.cards[i].character = kept[ki++];
    });

    returned.forEach(c => this.deck.push(c));
    shuffle(this.deck);
    this.exchangeCards = [];

    this.addLog(`${actor.name} hoàn tất đổi bài`);
    this.currentAction = null;
    this._advanceTurn();
    return { ok: true };
  }

  _advanceTurn() {
    const activePlayers = this.getActivePlayers();
    if (activePlayers.length <= 1) {
      if (activePlayers.length === 1 && !this.winner) {
        this.winner = activePlayers[0].id;
        this.phase = PHASES.GAME_OVER;
        this.addLog(`🏆 ${activePlayers[0].name} thắng trò chơi!`);
      }
      return;
    }

    let next = (this.currentPlayerIndex + 1) % this.players.length;
    let tries = 0;
    while (!this.players[next].cards.some(c => !c.revealed)) {
      next = (next + 1) % this.players.length;
      if (++tries > this.players.length) break;
    }

    this.currentPlayerIndex = next;
    this.phase = PHASES.ACTION;
    this.pendingResponses = new Set();
    this.currentBlock = null;
    this.addLog(`--- Lượt của ${this.players[next].name} ---`);
  }

  restartGame() {
    // Chuyển spectators thành players
    this.spectators.forEach(s => {
      this.players.push({ id: s.id, persistentId: s.persistentId, name: s.name, coins: 2, cards: [], connected: s.connected });
    });
    this.spectators = [];

    this.deck = [];
    this.phase = PHASES.WAITING;
    this.currentPlayerIndex = 0;
    this.currentAction = null;
    this.currentBlock = null;
    this.pendingResponses = new Set();
    this.pendingLoseInfluence = null;
    this.exchangeCards = [];
    this.log = [];
    this.winner = null;
    this.players.forEach(p => { p.cards = []; p.coins = 2; });
  }

  addLog(msg) {
    this.log.push(msg);
  }
}

module.exports = { GameEngine };
