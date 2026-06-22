const CHARACTERS = {
  DUKE: 'Duke',
  ASSASSIN: 'Assassin',
  CAPTAIN: 'Captain',
  AMBASSADOR: 'Ambassador',
  CONTESSA: 'Contessa',
};

const CHAR_VI = {
  Duke: 'Bá Tước',
  Assassin: 'Sát Thủ',
  Captain: 'Đại Úy',
  Ambassador: 'Đại Sứ',
  Contessa: 'Hầu Tước',
};

const ACTIONS = {
  INCOME: 'income',
  FOREIGN_AID: 'foreign_aid',
  COUP: 'coup',
  TAX: 'tax',
  ASSASSINATE: 'assassinate',
  STEAL: 'steal',
  EXCHANGE: 'exchange',
};

const ACTION_CONFIG = {
  [ACTIONS.INCOME]: {
    label: 'Income',
    coins: 1,
    needsTarget: false,
    challengeable: false,
    blockable: false,
    claimedCharacter: null,
  },
  [ACTIONS.FOREIGN_AID]: {
    label: 'Foreign Aid',
    coins: 2,
    needsTarget: false,
    challengeable: false,
    blockable: true,
    blockedBy: [CHARACTERS.DUKE],
    claimedCharacter: null,
  },
  [ACTIONS.COUP]: {
    label: 'Coup',
    cost: 7,
    needsTarget: true,
    challengeable: false,
    blockable: false,
    claimedCharacter: null,
  },
  [ACTIONS.TAX]: {
    label: 'Tax',
    coins: 3,
    needsTarget: false,
    challengeable: true,
    blockable: false,
    claimedCharacter: CHARACTERS.DUKE,
  },
  [ACTIONS.ASSASSINATE]: {
    label: 'Assassinate',
    cost: 3,
    needsTarget: true,
    challengeable: true,
    blockable: true,
    blockedBy: [CHARACTERS.CONTESSA],
    claimedCharacter: CHARACTERS.ASSASSIN,
  },
  [ACTIONS.STEAL]: {
    label: 'Steal',
    needsTarget: true,
    challengeable: true,
    blockable: true,
    blockedBy: [CHARACTERS.CAPTAIN, CHARACTERS.AMBASSADOR],
    claimedCharacter: CHARACTERS.CAPTAIN,
  },
  [ACTIONS.EXCHANGE]: {
    label: 'Exchange',
    needsTarget: false,
    challengeable: true,
    blockable: false,
    claimedCharacter: CHARACTERS.AMBASSADOR,
  },
};

const PHASES = {
  WAITING: 'waiting',
  ACTION: 'action',
  ACTION_RESPONSE: 'action_response',
  BLOCK_RESPONSE: 'block_response',
  LOSE_INFLUENCE: 'lose_influence',
  EXCHANGE_SELECT: 'exchange_select',
  GAME_OVER: 'game_over',
};

module.exports = { CHARACTERS, CHAR_VI, ACTIONS, ACTION_CONFIG, PHASES };
