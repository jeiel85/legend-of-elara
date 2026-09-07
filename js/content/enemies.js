// Enemy stats table. AI types are implemented in entities/enemy.js.
export const ENEMY_STATS = {
  slime: { name: '슬라임', hp: 3, damage: 1, speed: 40, gems: [1, 3], ai: 'chase', w: 14, h: 12, color: '#4fc94f' },
  octo: { name: '문어', hp: 4, damage: 1, speed: 30, gems: [1, 4], ai: 'shooter', w: 14, h: 12, color: '#e05a5a' },
  bat: { name: '박쥐', hp: 2, damage: 1, speed: 65, gems: [1, 2], ai: 'erratic', flying: true, w: 12, h: 10, color: '#8a6fd9' },
  skeleton: { name: '스켈레톤', hp: 6, damage: 2, speed: 45, gems: [2, 5], ai: 'lunger', w: 12, h: 14, color: '#e8e8e8' },
  goblin: { name: '고블린', hp: 4, damage: 1, speed: 75, gems: [2, 6], ai: 'chase', w: 12, h: 14, color: '#3fa34d' },
  knight: { name: '갑옷기사', hp: 10, damage: 2, speed: 35, gems: [4, 8], ai: 'shielded', w: 14, h: 14, color: '#9aa3ad' },
  wisp: { name: '위습', hp: 5, damage: 2, speed: 55, gems: [3, 6], ai: 'erratic', flying: true, w: 12, h: 12, color: '#7db3f2' },
  slimeSmall: { name: '작은 슬라임', hp: 1, damage: 1, speed: 70, gems: [0, 1], ai: 'chase', w: 10, h: 8, color: '#7de07d' },
  // bosses
  slimeKing: { name: '거대 슬라임', hp: 30, damage: 2, speed: 32, gems: [20, 30], ai: 'bossSlime', boss: true, dungeon: 'd1', w: 28, h: 24, color: '#2fa32f' },
  octoKing: { name: '문어왕', hp: 44, damage: 2, speed: 38, gems: [30, 40], ai: 'bossOcto', boss: true, dungeon: 'd2', w: 26, h: 22, color: '#c94f4f' },
  knightCaptain: { name: '기사 대장', hp: 60, damage: 3, speed: 50, gems: [40, 50], ai: 'bossKnight', boss: true, dungeon: 'd3', w: 16, h: 16, color: '#5b6b7d' },
  demonKing: { name: '마왕 엘고르', hp: 110, damage: 3, speed: 55, gems: [100, 150], ai: 'bossDemon', boss: true, dungeon: 'final', w: 20, h: 22, color: '#8a2e5e' }
};
