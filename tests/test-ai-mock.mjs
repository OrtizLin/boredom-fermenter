import { JSDOM } from 'jsdom';
import fs from 'node:fs';
import assert from 'node:assert/strict';

const dir = '/home/hatch/workspace/competitions/openlab-ai-build-challenge';
const html = fs.readFileSync(dir + '/index.html', 'utf8');
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// 啟動 http server 由外部負責（port 8001）
const dom = new JSDOM(html, { url: 'http://localhost:8001/index.html', runScripts: 'dangerously', resources: 'usable', pretendToBeVisual: true });
await new Promise(r => { dom.window.addEventListener('load', r); setTimeout(r, 3000); });
await sleep(300);
const { document, localStorage } = dom.window;
const $ = (id) => document.getElementById(id);

// 假裝已存 Key，並 stub fetch 回傳 Gemini 格式
localStorage.setItem('boredom-fermenter-ai-key', 'test-key-not-real');
let captured = null;
dom.window.fetch = async (url, opts) => {
  captured = { url, body: JSON.parse(opts.body) };
  return {
    ok: true, status: 200,
    json: async () => ({ candidates: [{ content: { parts: [{ text: '{"title":"測試任務：紙盒小火車","story":"火車要開了，可是軌道還沒鋪好。","steps":["用廢紙盒排出軌道","把球放在軌道上當火車","推著火車走一圈"],"parent":"火車下一站要去哪裡？","safety":"不要在軌道上跑跳。"}' }] } }] }),
  };
};
// 預設供應商是 MixRoute，改選 Gemini
$('provider').value = 'gemini';
$('provider').dispatchEvent(new dom.window.Event('change'));
$('btnAI').click();
await sleep(300);
console.log('fetch url:', captured.url);
console.log('prompt mentions materials:', captured.body.contents[0].parts[0].text.slice(0, 80));
assert.ok(captured.url.includes('generativelanguage.googleapis.com'), 'should call Gemini endpoint');
assert.ok(captured.url.includes('gemini-3-flash-preview'), 'should use model from field');
assert.ok(!$('taskSection').hidden, 'AI task should render');
assert.equal($('taskTitle').textContent, '測試任務：紙盒小火車');
assert.ok($('taskMeta').textContent.includes('AI 生成'), 'meta: ' + $('taskMeta').textContent);
console.log('AI mock (Gemini) task rendered:', $('taskTitle').textContent);

// MixRoute 錯誤路徑：回 401 時要顯示失敗、本地引擎不受影響
dom.window.fetch = async () => ({ ok: false, status: 401, json: async () => ({}) });
$('provider').value = 'mixroute';
$('btnAI').click();
await sleep(300);
assert.ok($('aiStatus').textContent.includes('失敗'), 'AI 401 status: ' + $('aiStatus').textContent);
console.log('AI 401 correctly reported:', $('aiStatus').textContent);

console.log('\nAI mock tests passed (no real key, no real network).');
dom.window.close();
