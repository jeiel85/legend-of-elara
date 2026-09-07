// Item definitions and shop data. All text Korean, code/comments English.
export const SWORDS = [
  null,
  { tier: 1, name: '나무검', damage: 1 },
  { tier: 2, name: '강철검', damage: 2 },
  { tier: 3, name: '빛나는 검', damage: 4 }
];

export const ITEM_DEFS = {
  bow: { id: 'bow', name: '활', desc: '화살을 쏩니다 (X키). 화살 필요.' },
  bombs: { id: 'bombs', name: '폭탄', desc: '폭탄을 놓습니다. 균열 벽을 부숩니다.' },
  boomerang: { id: 'boomerang', name: '부메랑', desc: '날아가 적을 기절시키고 돌아옵니다.' },
  lantern: { id: 'lantern', name: '랜턴', desc: '어두운 곳을 밝히고 덩굴을 태웁니다.' },
  potion: { id: 'potion', name: '포션', desc: '사용하면 HP를 모두 회복합니다 (1회용).' },
  shield: { id: 'shield', name: '방패', desc: '정면의 투사체를 막습니다.' },
  compass_d1: { id: 'compass_d1', name: 'D1 나침반', desc: '숲의 동굴 보물 위치를 알려줍니다.' },
  compass_d2: { id: 'compass_d2', name: 'D2 나침반', desc: '호수의 동굴 보물 위치를 알려줍니다.' },
  compass_d3: { id: 'compass_d3', name: 'D3 나침반', desc: '설산의 동굴 보물 위치를 알려줍니다.' }
};

export const SELECTABLE_ITEMS = ['bow', 'bombs', 'boomerang', 'lantern', 'potion'];

export const SHOP_STOCK = [
  { id: 'potion', name: '포션', price: 30, desc: 'HP 완전 회복 (1회용)' },
  { id: 'shield', name: '방패', price: 50, desc: '정면 투사체 방어' },
  { id: 'arrows30', name: '화살 30개', price: 20, desc: '활 탄약' },
  { id: 'bombs10', name: '폭탄 10개', price: 25, desc: '폭탄 탄약' }
];

export function swordDamage(tier) {
  if (tier >= 3) return 4;
  if (tier === 2) return 2;
  if (tier === 1) return 1;
  return 0;
}

export function swordName(tier) {
  if (tier >= 3) return '빛나는 검';
  if (tier === 2) return '강철검';
  if (tier === 1) return '나무검';
  return '맨손';
}
