import { JSDOM } from 'jsdom';
import fs from 'node:fs';
import assert from 'node:assert/strict';

const dir = '/home/hatch/workspace/competitions/openlab-ai-build-challenge';
const html = fs.readFileSync(dir + '/index.html', 'utf8');
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function loadDom() {
  const dom = new JSDOM(html, {
    url: 'http://localhost:8001/index.html',
    runScripts: 'dangerously',
    resources: 'usable',
    pretendToBeVisual: true,
  });
  await new Promise((resolve) => {
    dom.window.addEventListener('load', resolve);
    setTimeout(resolve, 3000);
  });
  await sleep(300);
  return dom;
}

const dom = await loadDom();
const { document, localStorage } = dom.window;
const $ = (id) => document.getElementById(id);
const q = (s) => document.querySelector(s);

// 1. 預設材料 5 樣勾選
const checked = [...document.querySelectorAll('#materials input:checked')].map(e => e.value);
console.log('default materials:', checked.join(','));
assert.deepEqual(checked.sort(), ['ball', 'blocks', 'box', 'clay', 'crayon']);
assert.ok($('poolInfo').textContent.includes('種不重複'), 'poolInfo: ' + $('poolInfo').textContent);

// 2. 開始發酵
$('btnFerment').click();
await sleep(100);
assert.equal($('taskSection').hidden, false, 'task section should show');
const title1 = $('taskTitle').textContent;
console.log('task 1:', title1, '|', $('taskMeta').textContent);
assert.ok(title1.length > 3);
const steps = [...$('taskSteps').children].map(li => li.textContent);
assert.ok(steps.length >= 3 && steps.length <= 5, 'steps=' + steps.length);
assert.ok($('taskParent').textContent.length > 0);
assert.ok($('taskSafety').textContent.length > 0);
assert.equal($('timerDisplay').textContent, '30:00');

// 3. 種子可重現：填入同一種子兩次，出同一張卡
$('seed').value = '482910';
$('btnFerment').click(); await sleep(50);
const seededA = $('taskTitle').textContent + '|' + $('taskMeta').textContent;
$('btnFerment').click(); await sleep(50);
const seededB = $('taskTitle').textContent + '|' + $('taskMeta').textContent;
assert.equal(seededA, seededB, 'same seed must reproduce same card');
console.log('seed 482910 reproduces:', seededA);

// 4. 再發酵一次（隨機種子）按鈕可用
$('seed').value = '';
$('btnAgain').click(); await sleep(50);
assert.ok($('taskTitle').textContent.length > 3);
console.log('re-ferment ok:', $('taskTitle').textContent);

// 5. 計時器：開始後會走，暫停會停
$('btnTimer').click();
await sleep(2200);
const t1 = $('timerDisplay').textContent;
console.log('timer after ~2s:', t1);
assert.ok(t1 === '29:58' || t1 === '29:59', 'timer should count down, got ' + t1);
$('btnTimer').click(); // 暫停
const paused = $('timerDisplay').textContent;
await sleep(1200);
assert.equal($('timerDisplay').textContent, paused, 'timer should pause');
$('btnTimerReset').click();
assert.equal($('timerDisplay').textContent, '30:00', 'timer reset');

// 6. 收藏：存、重載後仍在、刪除
$('btnFav').click();
let favs = JSON.parse(localStorage.getItem('boredom-fermenter-favorites'));
assert.equal(favs.length, 1, 'one favorite saved');
console.log('favorite saved:', favs[0].title, favs[0].id);
assert.ok($('favList').textContent.includes(favs[0].title));
// 重載（新 JSDOM，同一 localStorage 無法跨實例，改測 render：直接檢查清單 DOM）
assert.ok(document.querySelectorAll('#favList .fav').length === 1);
// 刪除收藏
document.querySelector('#favList .fav button:last-child').click();
favs = JSON.parse(localStorage.getItem('boredom-fermenter-favorites'));
assert.equal(favs.length, 0, 'favorite deleted');

// 7. 材料不足時會擋下（不生成空任務）
document.querySelectorAll('#materials input:checked').forEach(e => { e.checked = false; e.dispatchEvent(new dom.window.Event('change')); });
const before = $('taskTitle').textContent;
// alert 會在 jsdom 拋出 not implemented 訊息但不中斷；用 try 包住
try { $('btnFerment').click(); } catch (e) {}
assert.equal($('taskTitle').textContent, before, 'task should not change when <2 materials');
// 恢復預設
['clay','box','ball','crayon','blocks'].forEach(v => { const el = document.querySelector(`#materials input[value="${v}"]`); el.checked = true; });

// 8. AI 無 Key 時明確拒絕，不會假裝生成
$('btnAI').click();
await sleep(100);
assert.ok($('aiStatus').textContent.includes('請先'), 'AI without key: ' + $('aiStatus').textContent);
console.log('AI without key correctly blocked.');

// 9. 換條件仍能生成：15 分鐘、靜靜做、3-4 歲
q('input[name="time"][value="15"]').checked = true;
q('input[name="energy"][value="calm"]').checked = true;
$('age').value = '3-4';
$('btnFerment').click(); await sleep(50);
assert.ok($('taskTitle').textContent.length > 3);
assert.equal($('timerDisplay').textContent, '15:00');
console.log('15min calm 3-4 task:', $('taskTitle').textContent);

console.log('\nAll UI tests passed (jsdom, no real browser).');
dom.window.close();
