/* ============================================================================
 * ranges.js — dados de ranges de pré-flop (6-max, cash 100bb) + parser de notação
 *
 * IMPORTANTE: estes são ranges de ESTUDO simplificados, pensados para treinar
 * fundamentos. Solvers reais (GTO) usam frequências mistas (ex.: dar 3-bet 30%
 * das vezes com uma mão). Aqui cada mão tem UMA ação "certa" para servir de guia.
 * ==========================================================================*/

const RANKS = ['A', 'K', 'Q', 'J', 'T', '9', '8', '7', '6', '5', '4', '3', '2'];
const RANK_INDEX = Object.fromEntries(RANKS.map((r, i) => [r, i]));

// Combos possíveis por tipo de mão (total de 1326 combos no baralho)
function comboCount(handId) {
  if (handId.length === 2) return 6;        // par (ex.: "AA")
  return handId.endsWith('s') ? 4 : 12;     // suited=4, offsuit=12
}

/* ---- Parser de notação de poker -----------------------------------------
 * Suporta:
 *   "77"        -> par único
 *   "77+"       -> 77,88,...,AA
 *   "AKs"/"AKo" -> mão única suited/offsuit
 *   "A2s+"      -> A2s,A3s,...,AKs (carta alta fixa, kicker sobe)
 *   "ATo+"      -> ATo,AJo,AKo
 * Tokens separados por vírgula e/ou espaço.
 * -------------------------------------------------------------------------*/
function expandToken(token) {
  token = token.trim();
  if (!token) return [];
  const plus = token.endsWith('+');
  const core = plus ? token.slice(0, -1) : token;

  // Par (ex.: "77", "77+")
  if (core.length === 2 && core[0] === core[1]) {
    const idx = RANK_INDEX[core[0]];
    if (idx === undefined) return [];
    if (!plus) return [core];
    const out = [];
    for (let i = idx; i >= 0; i--) out.push(RANKS[i] + RANKS[i]); // sobe até AA
    return out;
  }

  // Suited / offsuit (ex.: "AKs", "A2s+", "ATo+")
  if (core.length === 3) {
    let hi = RANK_INDEX[core[0]];
    let lo = RANK_INDEX[core[1]];
    const so = core[2].toLowerCase(); // 's' ou 'o'
    if (hi === undefined || lo === undefined || (so !== 's' && so !== 'o')) return [];
    if (hi > lo) [hi, lo] = [lo, hi]; // garante carta alta primeiro
    const mk = (a, b) => RANKS[a] + RANKS[b] + so;
    if (!plus) return [mk(hi, lo)];
    const out = [];
    for (let l = lo; l > hi; l--) out.push(mk(hi, l)); // kicker sobe até (hi+1)
    return out;
  }
  return [];
}

function expandRange(str) {
  const set = new Set();
  for (const tok of str.split(/[,\s]+/)) {
    for (const h of expandToken(tok)) set.add(h);
  }
  return set;
}

/* ---- Ranges de OPEN RAISE (RFI = Raise First In) ------------------------
 * Quando ninguém entrou no pote antes de você. Raise ou Fold. */
const RFI = {
  UTG: '22+, A2s+, K9s+, Q9s+, J9s+, T8s+, 97s+, 86s+, 76s, 65s, 54s, ATo+, KJo+, QJo',
  HJ:  '22+, A2s+, K8s+, Q8s+, J8s+, T7s+, 96s+, 86s+, 75s+, 65s, 54s, A9o+, KTo+, QTo+, JTo',
  CO:  '22+, A2s+, K5s+, Q7s+, J7s+, T7s+, 96s+, 85s+, 75s+, 64s+, 54s, 43s, A5o+, K9o+, Q9o+, J9o+, T9o',
  BTN: '22+, A2s+, K2s+, Q4s+, J6s+, T6s+, 95s+, 85s+, 74s+, 64s+, 53s+, 43s, A2o+, K7o+, Q8o+, J8o+, T8o+, 98o, 87o',
  SB:  '22+, A2s+, K4s+, Q6s+, J7s+, T7s+, 96s+, 85s+, 75s+, 64s+, 54s, 43s, A2o+, K8o+, Q9o+, J9o+, T9o',
};

/* Ordem/descrição das posições 6-max */
const POSITIONS_6MAX = [
  { code: 'UTG', name: 'UTG (Under the Gun)' },
  { code: 'HJ',  name: 'HJ (Hijack / MP)' },
  { code: 'CO',  name: 'CO (Cutoff)' },
  { code: 'BTN', name: 'BTN (Button)' },
  { code: 'SB',  name: 'SB (Small Blind)' },
  { code: 'BB',  name: 'BB (Big Blind)' },
];

/* ---- Ranges VS UM RAISE (facing a raise): 3-bet / call / fold -----------
 * Precedência: se a mão está em `threeBet` -> 3-bet; senão se está em `call`
 * -> call; senão -> fold. Por isso `call` pode ser generoso e se sobrepor. */
const FACING = {
  'BB_vs_BTN': {
    hero: 'BB', raiser: 'BTN', label: 'BB defende vs open do BTN',
    threeBet: '99+, AJs+, KQs, AQo+, A5s, A4s, A3s',
    call: '22+, A2s+, K2s+, Q5s+, J7s+, T7s+, 96s+, 85s+, 75s+, 64s+, 53s+, 43s, A2o+, K8o+, Q9o+, J9o+, T9o, 98o',
  },
  'BB_vs_CO': {
    hero: 'BB', raiser: 'CO', label: 'BB defende vs open do CO',
    threeBet: 'TT+, AJs+, KQs, AQo+, A5s, A4s',
    call: '22+, A2s+, K5s+, Q7s+, J8s+, T7s+, 97s+, 86s+, 75s+, 64s+, 54s, A5o+, K9o+, Q9o+, J9o+, T9o',
  },
  'BB_vs_UTG': {
    hero: 'BB', raiser: 'UTG', label: 'BB defende vs open do UTG',
    threeBet: 'JJ+, AQs+, KQs, AKo, A5s',
    call: '22+, A2s+, K9s+, Q9s+, J9s+, T8s+, 97s+, 86s+, 76s, 65s, 54s, AJo+, KQo',
  },
  'SB_vs_BTN': {
    hero: 'SB', raiser: 'BTN', label: 'SB defende vs open do BTN',
    threeBet: '77+, ATs+, KTs+, QTs+, JTs, AJo+, KQo, A5s, A4s, A3s, A2s, K9s',
    call: '22+, A9s+, KTs+, QTs+, JTs, T9s, 98s, ATo+, KJo+',
  },
  'BTN_vs_CO': {
    hero: 'BTN', raiser: 'CO', label: 'BTN vs open do CO (in position)',
    threeBet: 'TT+, AJs+, KQs, AQo+, A5s, A4s',
    call: '22+, A2s+, K9s+, Q9s+, J9s+, T8s+, 98s, 87s, 76s, 65s, A9o+, KJo+, QJo',
  },
  'BTN_vs_UTG': {
    hero: 'BTN', raiser: 'UTG', label: 'BTN vs open do UTG (in position)',
    threeBet: 'QQ+, AQs+, AKo, A5s',
    call: '22+, ATs+, KTs+, QTs+, JTs, T9s, 98s, 87s, 76s, AQo, KQo',
  },
};

/* Pré-computa os Sets de cada range para lookup rápido */
const RFI_SETS = Object.fromEntries(
  Object.entries(RFI).map(([pos, str]) => [pos, expandRange(str)])
);
const FACING_SETS = Object.fromEntries(
  Object.entries(FACING).map(([key, cfg]) => [key, {
    ...cfg,
    threeBetSet: expandRange(cfg.threeBet),
    callSet: expandRange(cfg.call),
  }])
);

/* Ação correta ao enfrentar um raise, dada a mão e o spot */
function facingAction(handId, spotKey) {
  const s = FACING_SETS[spotKey];
  if (s.threeBetSet.has(handId)) return '3bet';
  if (s.callSet.has(handId)) return 'call';
  return 'fold';
}

/* % de combos de um Set em relação ao baralho (1326) */
function rangePercent(set) {
  let combos = 0;
  for (const h of set) combos += comboCount(h);
  return (combos / 1326) * 100;
}

// Exporta para o browser (sem módulos, escopo global)
window.PokerRanges = {
  RANKS, RANK_INDEX, comboCount, expandRange,
  RFI, RFI_SETS, POSITIONS_6MAX,
  FACING, FACING_SETS, facingAction, rangePercent,
};
