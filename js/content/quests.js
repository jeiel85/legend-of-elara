// Quest chain state machine.
export const QUEST_STAGES = [
  'intro', 'findSword', 'returnSword', 'findShards', 'allShards', 'gateOpen', 'finalBoss', 'ending'
];

export function initialQuest() {
  return {
    stage: 'intro',
    swordFound: false,
    shards: 0,
    bossesDead: { d1: false, d2: false, d3: false, final: false },
    gateOpen: false,
    kills: 0,
    metElder: false
  };
}

export function getObjectiveText(q) {
  switch (q.stage) {
    case 'intro':
      return '촌장과 대화하자 (마을 중앙)';
    case 'findSword':
      return '숲의 작은 동굴에서 나무검 찾기';
    case 'returnSword':
      return '촌장에게 돌아가기';
    case 'findShards':
      return `문장 조각 모으기 (${q.shards}/3) — D1 숲 / D2 호수 / D3 설산`;
    case 'allShards':
      return '촌장에게 돌아가기 (조각 3개 수집 완료)';
    case 'gateOpen':
      return '북쪽 봉인된 문 → 마지막 성역으로';
    case 'finalBoss':
      return '마왕 엘고르를 쓰러뜨리자!';
    default:
      return '';
  }
}

// Called on events; returns list of triggered dialog ids / effects for main.js to handle.
export function questOnEvent(q, event) {
  const fx = [];
  if (event === 'talkElder') {
    q.metElder = true;
    if (q.stage === 'intro') {
      q.stage = 'findSword';
      fx.push('elder_intro');
    }
  } else if (event === 'swordFound') {
    q.swordFound = true;
    if (q.stage === 'findSword') q.stage = 'returnSword';
  } else if (event === 'reportSword') {
    if (q.stage === 'returnSword') {
      q.stage = 'findShards';
      fx.push('elder_hassword');
    }
  } else if (event === 'shard') {
    q.shards = Math.min(3, q.shards + 1);
    if (q.shards >= 3 && q.stage === 'findShards') q.stage = 'allShards';
  } else if (event === 'reportShards') {
    if (q.stage === 'allShards') {
      q.stage = 'gateOpen';
      q.gateOpen = true;
      fx.push('gate_open');
    }
  } else if (event === 'enterFinal') {
    if (q.stage === 'gateOpen') q.stage = 'finalBoss';
  } else if (event === 'bossFinalDead') {
    q.stage = 'ending';
  }
  return fx;
}

export function bossToDungeon(bossType) {
  if (bossType === 'slimeKing') return 'd1';
  if (bossType === 'octoKing') return 'd2';
  if (bossType === 'knightCaptain') return 'd3';
  if (bossType === 'demonKing') return 'final';
  return null;
}
