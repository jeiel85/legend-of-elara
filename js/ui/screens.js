// Title / game over / ending screens drawn on canvas.
import { hasSave } from '../engine/save.js';

export function drawTitle(ctx, W, H, frame, saveExists) {
  try {
    ctx.fillStyle = '#0a0a18';
    ctx.fillRect(0, 0, W, H);
    // stars
    ctx.fillStyle = '#fff';
    for (let i = 0; i < 60; i++) {
      const x = (i * 137) % W;
      const y = (i * 89) % 140;
      if ((i + Math.floor(frame / 20)) % 3 !== 0) ctx.fillRect(x, y, 1, 1);
    }
    // pixel logo: triforce-like three triangles via rects
    const cx = W / 2;
    const top = 60;
    ctx.fillStyle = '#ffd94a';
    // triangle helper: rows
    for (let r = 0; r < 24; r++) {
      const w = r * 2;
      ctx.fillRect(cx - w / 2, top + r * 2, w, 2);
    }
    for (let r = 0; r < 18; r++) {
      const w = r * 2;
      ctx.fillRect(cx - 40 - w / 2, top + 48 + r * 2, w, 2);
      ctx.fillRect(cx + 40 - w / 2, top + 48 + r * 2, w, 2);
    }
    ctx.font = 'bold 26px monospace';
    ctx.textBaseline = 'top';
    ctx.fillStyle = '#ffd94a';
    ctx.textAlign = 'center';
    ctx.fillText('엘라라의 전설', cx, 170);
    ctx.font = '12px monospace';
    ctx.fillStyle = '#fff';
    ctx.fillText('THE LEGEND OF ELARA', cx, 200);
    ctx.fillStyle = '#8be28b';
    if (Math.floor(frame / 30) % 2 === 0) {
      ctx.fillText('ENTER - 시작 / 이어하기', cx, 240);
    }
    ctx.fillStyle = '#aaa';
    ctx.font = '11px monospace';
    ctx.fillText(saveExists ? '저장 데이터가 있습니다 (이어하기 가능)' : '새로운 모험을 시작하세요', cx, 262);
    ctx.fillText('Z:검 X:아이템 E:대화 I:인벤토리 M:음소거', cx, 280);
    ctx.fillText('제작: jeiel85 · MIT', cx, 296);
    ctx.textAlign = 'left';
  } catch (e) { /* stub */ }
}

export function drawGameOver(ctx, W, H, frame) {
  try {
    ctx.fillStyle = 'rgba(20,0,0,0.9)';
    ctx.fillRect(0, 0, W, H);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ff4f4f';
    ctx.font = 'bold 28px monospace';
    ctx.fillText('GAME OVER', W / 2, 120);
    ctx.fillStyle = '#fff';
    ctx.font = '13px monospace';
    ctx.fillText('여행자는 쓰러졌다...', W / 2, 160);
    if (Math.floor(frame / 30) % 2 === 0) {
      ctx.fillText('ENTER - 마지막 저장에서 부활 (젬 절반 소실)', W / 2, 200);
    }
    ctx.textAlign = 'left';
  } catch (e) { /* stub */ }
}

export function drawEnding(ctx, W, H, frame, stats) {
  try {
    ctx.fillStyle = '#0a1420';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#ffd94a';
    for (let i = 0; i < 40; i++) {
      const x = (i * 173 + Math.floor(frame / 2)) % W;
      ctx.fillRect(x, (i * 97) % H, 2, 2);
    }
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffd94a';
    ctx.font = 'bold 24px monospace';
    ctx.fillText('★ 엔딩 ★', W / 2, 70);
    ctx.fillStyle = '#fff';
    ctx.font = '13px monospace';
    ctx.fillText('마왕 엘고르를 쓰러뜨렸다!', W / 2, 105);
    ctx.fillText('엘라라 대륙에 평화가 돌아왔다.', W / 2, 125);
    ctx.fillStyle = '#8be28b';
    ctx.fillText(`플레이 시간: ${Math.floor(stats.playtime / 60)}분 ${Math.floor(stats.playtime % 60)}초`, W / 2, 160);
    ctx.fillText(`처치: ${stats.kills}  사망: ${stats.deaths}  젬: ${stats.gems}`, W / 2, 180);
    ctx.fillStyle = '#aaa';
    ctx.fillText('고마워요, 용감한 여행자!', W / 2, 210);
    if (Math.floor(frame / 30) % 2 === 0) {
      ctx.fillStyle = '#fff';
      ctx.fillText('ENTER - 타이틀로', W / 2, 250);
    }
    ctx.textAlign = 'left';
  } catch (e) { /* stub */ }
}

export function checkSaveExists() {
  return hasSave();
}
