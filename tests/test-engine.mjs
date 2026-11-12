import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const BF = require('../engine.js');
import assert from 'node:assert/strict';

let passed = 0;
function ok(name, fn) { fn(); passed++; console.log('PASS', name); }

// 1. 模板總數 >= 40，且每張 needs 都是合法材料
ok('templates >= 40 and needs valid', () => {
  assert.ok(BF.totalTemplates() >= 40, 'templates=' + BF.totalTemplates());
  for (const t of BF.TEMPLATES) {
    assert.ok(t.needs.length >= 2, t.id);
    assert.ok(t.steps.length >= 3 && t.steps.length <= 5, t.id + ' steps=' + t.steps.length);
    assert.ok(t.story && t.parent && t.safety, t.id);
    for (const k of t.needs) assert.ok(BF.MATERIALS[k], t.id + ' bad material ' + k);
  }
});

// 2. 預設條件（靈感百寶箱 5 樣、4-6 歲、30 分鐘、想動）有足夠多種玩法
ok('default input pool', () => {
  const input = { age: '4-6', time: 30, materials: ['clay', 'box', 'ball', 'crayon', 'blocks'], energy: 'move' };
  const n = BF.countCombinations(input);
  console.log('  default move pool =', n);
  assert.ok(n >= 5, 'pool=' + n);
  const inputAny = { ...input, energy: 'any' };
  assert.ok(BF.countCombinations(inputAny) >= 10, 'any pool=' + BF.countCombinations(inputAny));
});

// 3. 全材料、全條件下總組合數 >= 24（以模板計）
ok('all-materials pool >= 24', () => {
  const input = { age: '4-6', time: 60, materials: Object.keys(BF.MATERIALS), energy: 'any' };
  const n = BF.countCombinations(input);
  console.log('  all-materials 4-6/60min pool =', n);
  assert.ok(n >= 24, 'pool=' + n);
});

// 4. 同一種子可重現，不同種子通常不同
ok('seed reproducible', () => {
  const input = { age: '4-6', time: 30, materials: ['clay', 'box', 'ball', 'crayon', 'blocks'], energy: 'any' };
  const a = BF.pickTask(input, 482910);
  const b = BF.pickTask(input, 482910);
  assert.equal(a.task.id, b.task.id);
  assert.equal(a.task.title, b.task.title);
  assert.equal(a.task.templateId, b.task.templateId);
  const titles = new Set();
  for (let s = 100000; s < 100020; s++) titles.add(BF.pickTask(input, s).task.title);
  assert.ok(titles.size >= 3, 'distinct titles in 20 seeds=' + titles.size);
});

// 5. 生成的任務只用勾選的材料、時間不超過選擇、年齡對得上
ok('task respects inputs', () => {
  for (let s = 200000; s < 200050; s++) {
    const input = { age: '7-9', time: 15, materials: ['clay', 'crayon', 'cup'], energy: 'calm' };
    const r = BF.pickTask(input, s);
    if (!r.task) continue;
    assert.ok(r.task.materialKeys.every(k => input.materials.includes(k)), 'material leak ' + r.task.id);
    assert.ok(r.task.time <= 15);
    assert.equal(r.task.age, '7-9');
  }
});

// 6. 材料不足時回傳 null，不會硬湊
ok('no match returns null', () => {
  const r = BF.pickTask({ age: '4-6', time: 15, materials: ['towel'], energy: 'move' }, 123456);
  assert.equal(r.task, null);
  assert.equal(r.poolSize, 0);
});

// 7. 15 分鐘、3-4 歲、靜靜做也有任務（不是只有一種條件能玩）
ok('15min calm 3-4 pool non-empty', () => {
  const n = BF.countCombinations({ age: '3-4', time: 15, materials: Object.keys(BF.MATERIALS), energy: 'calm' });
  console.log('  3-4/15min/calm pool =', n);
  assert.ok(n >= 3, 'pool=' + n);
});

console.log(`\n${passed} engine tests passed. Templates: ${BF.totalTemplates()}`);
