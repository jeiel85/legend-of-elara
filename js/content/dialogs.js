// ALL Korean dialog text organized by NPC/trigger.
export const DIALOGS = {
  elder_intro: {
    name: '마을 촌장',
    pages: [
      '오, 여행자여... 드디어 왔구나.\n우리 마을 엘라라에 어둠이 드리우고 있다.',
      '북쪽 설산의 봉인된 문이 열리려 하고,\n세 개의 문장 조각이 흩어졌단다.',
      '먼저 숲의 작은 동굴에서\n나무검을 찾아오거라! (남쪽 숲, 작은 계단)'
    ]
  },
  elder_nosword: {
    name: '마을 촌장',
    pages: ['아직 검을 찾지 못했구나.\n마을 북쪽 숲의 작은 동굴을 찾아보거라.\n(E키로 상자를 열어보렴)']
  },
  elder_hassword: {
    name: '마을 촌장',
    pages: [
      '오! 나무검을 찾았구나! 훌륭하다.',
      '이제 세 개의 문장 조각을 모아주렴.\n숲의 동굴(D1), 호수의 동굴(D2),\n설산의 동굴(D3)에 각각 하나씩 있다.',
      '각 동굴의 보스를 쓰러뜨리면 조각이 나온다.\n조심하거라, 체력은 석상(O)에서 저장하고 회복하렴.'
    ]
  },
  elder_progress: {
    name: '마을 촌장',
    pages: ['문장 조각은 {shards}/3 개 모았다.\n숲(D1: 마을 북쪽), 호수(D2: 동쪽 섬),\n설산(D3: 북동쪽)을 탐험하거라.']
  },
  elder_allshards: {
    name: '마을 촌장',
    pages: [
      '세 개의 조각을 모두 모았구나!\n이제 북쪽 설산의 봉인된 문으로 가거라.',
      '문이 열리면 마지막 성역에서\n마왕 엘고르를 쓰러뜨려야 한다.\n빛나는 검이 너를 도울 것이다!'
    ]
  },
  elder_gatedone: {
    name: '마을 촌장',
    pages: ['봉인의 문이 열렸다!\n북쪽 성역으로 가서 마왕을 쓰러뜨리거라!\n포션과 화살을 충분히 준비하렴.']
  },
  villager1: {
    name: '마을 주민',
    pages: [
      '풀(G)이나 덤불(B)은 검으로 벨 수 있어.\n젬이나 하트가 나올 때도 있대!',
      '석상(O) 앞에서 E를 누르면 저장돼.\n죽으면 마지막 저장 지점에서 부활한대.'
    ]
  },
  villager2: {
    name: '마을 주민',
    pages: ['상점에서는 포션, 방패, 화살, 폭탄을 팔아.\n젬을 모아두렴. 동쪽 호수에도 상인이 있대.']
  },
  shop1: {
    name: '상점 주인',
    pages: ['어서오게! 젬으로 물건을 살 수 있다네.\n인벤토리(I)를 열면 상점 항목이 보인다네.\n(상점은 인벤토리 화면에서 구매)']
  },
  fisher: {
    name: '낚시꾼',
    pages: [
      '호수 동쪽 섬에 호수의 동굴이 있다네.\n다리(=)를 건너가게. 랜턴이 없으면\n어두운 곳은 조심하게나.',
      '호숫가 서쪽에 작은 동굴이 하나 더 있어.\n활이 숨겨져 있다는 소문이... (62,42 근처)'
    ]
  },
  gravekeeper: {
    name: '묘지지기',
    pages: [
      '서쪽 묘지... 밤에는 위습이 나온다네.\n묘지 북쪽 작은 계단을 내려가면\n비밀 동굴이 있다네. 하트 조각이 있다지.',
      '갑옷기사는 정면 공격이 안 통해.\n뒤에서 치거나 폭탄을 써보게.'
    ]
  },
  mountaineer: {
    name: '등산가',
    pages: [
      '설산의 동굴(D3)은 어두워서 랜턴이 필수야.\nD2에서 랜턴을 구했다지?',
      '봉인된 문(X)은 세 조각이 모이면 열린대.\n촌장님께 돌아가게.'
    ]
  },
  sign_generic: { name: '표지판', pages: ['{text}'] },
  save_done: { name: '여신의 석상', pages: ['HP가 회복되고 저장되었다.\n(자동 저장됨)'] },
  chest_sword1: { name: '보물상자', pages: ['나무검을 손에 넣었다!\n(Z/J/스페이스로 휘두르기)'] },
  chest_sword3: { name: '보물상자', pages: ['빛나는 검을 손에 넣었다!\n공격력이 크게 올랐다!'] },
  chest_shard: { name: '문장 조각', pages: ['문장 조각을 손에 넣었다! ({count}/3)\n촌장에게 돌아가자. (자동 저장됨)'] },
  chest_heart_piece: { name: '보물상자', pages: ['하트 조각을 손에 넣었다! ({pieces}/4)'] },
  chest_heart_full: { name: '여신의 축복', pages: ['하트 조각 4개가 모였다!\n최대 HP가 1 증가했다!'] },
  chest_key: { name: '보물상자', pages: ['작은 열쇠를 손에 넣었다!\n잠긴 문(d)을 열 수 있다.'] },
  chest_bosskey: { name: '보물상자', pages: ['보스 열쇠를 손에 넣었다!\n보스 문(L)을 열 수 있다.'] },
  chest_compass: { name: '보물상자', pages: ['나침반을 손에 넣었다!\n던전 보물 위치가 표시된다.'] },
  chest_item: { name: '보물상자', pages: ['{item}을(를) 손에 넣었다!'] },
  chest_gems: { name: '보물상자', pages: ['{amount} 젬을 손에 넣었다!'] },
  locked_needkey: { name: '잠긴 문', pages: ['잠겨 있다. 작은 열쇠가 필요하다.'] },
  bossdoor_needkey: { name: '보스의 문', pages: ['보스 열쇠가 필요하다.'] },
  boss_intro_slime: { name: '거대 슬라임', pages: ['꾸르르... 누가 내 잠을 깨웠느냐!'] },
  boss_intro_octo: { name: '문어왕', pages: ['바글바글! 호수의 왕이 나를 상대하느냐!'] },
  boss_intro_knight: { name: '기사 대장', pages: ['여기까지 오다니... 기사도의 이름으로\n너를 쓰러뜨리겠다!'] },
  boss_intro_demon: { name: '마왕 엘고르', pages: ['크하하! 세 조각을 모아 여기까지 오다니.\n이 몸이 직접 상대해주마!'] },
  boss_dead: { name: '', pages: ['보스를 쓰러뜨렸다!\n보물상자에서 문장 조각을 챙기자.'] },
  gate_open: {
    name: '봉인의 문',
    pages: [
      '세 개의 문장 조각이 공명한다...!',
      '쿵... 쿵... 북쪽 설산의 봉인된 문이 열렸다!\n마지막 성역으로 향하자!'
    ]
  },
  need_shards: { name: '봉인의 문', pages: ['봉인의 문이다. 문장 조각 {shards}/3.\n세 조각이 모두 모여야 열린다.'] },
  potion_empty: { name: '', pages: ['포션이 없다! 상점에서 사자.'] },
  no_arrows: { name: '', pages: ['화살이 없다!'] },
  no_bombs: { name: '', pages: ['폭탄이 없다!'] },
  need_bow: { name: '', pages: ['아직 활이 없다. 호숫가 동굴을 찾아보자.'] }
};

export function fillTemplate(pages, vars) {
  return pages.map((p) => {
    let s = p;
    if (vars) {
      for (const k of Object.keys(vars)) {
        s = s.split('{' + k + '}').join(String(vars[k]));
      }
    }
    return s;
  });
}
