// Stage system: the quest chain presented as numbered stages (1..9).
// Stage is derived from quest progress, so it needs no extra save data.

export const STAGE_TOTAL = 9;

export function currentStage(q) {
  switch (q.stage) {
    case 'intro':
      return { n: 1, name: '마을의 시작', hint: '촌장과 대화하자' };
    case 'findSword':
      return { n: 2, name: '나무검을 찾아서', hint: '숲의 작은 동굴' };
    case 'returnSword':
      return { n: 3, name: '촌장에게 보고', hint: '마을로 돌아가자' };
    case 'findShards': {
      // dungeons are meant in order D1 -> D2 -> D3; shards collected so far
      // tells which one the player is working on
      if (q.shards === 0) return { n: 4, name: '숲의 동굴 D1', hint: '거대 슬라임 토벌' };
      if (q.shards === 1) return { n: 5, name: '호수의 동굴 D2', hint: '문어왕 토벌' };
      return { n: 6, name: '설산의 동굴 D3', hint: '기사 대장 토벌' };
    }
    case 'allShards':
      return { n: 7, name: '봉인 해제', hint: '촌장에게 조각을 보고하자' };
    case 'gateOpen':
    case 'finalBoss':
      return { n: 8, name: '봉인된 성역', hint: '마왕 엘고르를 쓰러뜨려라' };
    default:
      return { n: 9, name: '엔딩', hint: '' };
  }
}
