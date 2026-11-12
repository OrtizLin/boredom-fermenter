/* 無聊發酵機 — 瀏覽器介面（app.js）
 * 本地引擎在 engine.js；AI 模式是選填，Key 只存在 localStorage，絕不寫入檔案。
 * 沒有 Key 時，本地引擎仍可完整運作。
 */
(function () {
  'use strict';
  var BF = window.BoredomFermenter;
  var FAV_KEY = 'boredom-fermenter-favorites';
  var AI_KEY = 'boredom-fermenter-ai-key';
  var AI_PROVIDER_KEY = 'boredom-fermenter-ai-provider';
  var AI_MODEL_KEY = 'boredom-fermenter-ai-model';

  var DEFAULT_MATERIALS = ['clay', 'box', 'ball', 'crayon', 'blocks'];
  var currentTask = null;
  var timer = { total: 30 * 60, left: 30 * 60, id: null, running: false };

  function $(id) { return document.getElementById(id); }
  function checkedRadio(name) {
    var el = document.querySelector('input[name="' + name + '"]:checked');
    return el ? el.value : null;
  }
  function selectedMaterials() {
    return Array.prototype.slice.call(document.querySelectorAll('#materials input:checked')).map(function (el) { return el.value; });
  }
  function readInput() {
    return {
      age: $('age').value,
      time: parseInt(checkedRadio('time'), 10),
      materials: selectedMaterials(),
      energy: checkedRadio('energy')
    };
  }
  function updatePoolInfo() {
    var input = readInput();
    var n = BF.countCombinations(input);
    $('poolInfo').textContent = input.materials.length < 2
      ? '請至少勾 2 樣材料，才能發酵出任務。'
      : '目前條件下共有 ' + n + ' 種不重複的任務玩法（共 ' + BF.totalTemplates() + ' 張模板）。';
  }

  function renderTask(task) {
    currentTask = task;
    $('taskSection').hidden = false;
    $('taskMeta').textContent = '任務編號 ' + task.id + ' · ' + task.time + ' 分鐘 · ' +
      (task.age === '3-4' ? '3–4 歲' : task.age === '4-6' ? '4–6 歲' : '7–9 歲') + ' · ' +
      (task.source === 'ai' ? 'AI 生成' : '本地組合引擎') +
      (task.source === 'ai' ? '（' + task.aiProvider + '）' : '');
    $('taskTitle').textContent = task.title;
    $('taskStory').textContent = task.story;
    $('taskMaterials').innerHTML = task.materials.map(function (m) {
      return '<span class="tag">' + m + '</span>';
    }).join('');
    $('taskSteps').innerHTML = task.steps.map(function (s) { return '<li></li>'; }).join('');
    Array.prototype.forEach.call($('taskSteps').children, function (li, i) { li.textContent = task.steps[i]; });
    $('taskParent').textContent = task.parent;
    $('taskSafety').textContent = task.safety;
    $('favStatus').textContent = '';
    resetTimer(task.time * 60);
    if (typeof $('taskSection').scrollIntoView === 'function') {
      $('taskSection').scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  function ferment(seed) {
    var input = readInput();
    if (input.materials.length < 2) { alert('請至少勾 2 樣材料，才能發酵出任務。'); return; }
    var result = BF.pickTask(input, seed);
    if (!result.task) {
      alert('目前條件下沒有符合的任務，請多勾幾樣材料，或換一個時間／心情試試。');
      return;
    }
    renderTask(result.task);
    $('btnAgain').disabled = false;
  }

  // ---- 計時器 ----
  function fmt(sec) {
    var m = Math.floor(sec / 60), s = sec % 60;
    return String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
  }
  function drawTimer() {
    $('timerDisplay').textContent = fmt(timer.left);
    var pct = timer.total ? (100 * (timer.total - timer.left) / timer.total) : 0;
    $('timerBar').style.width = pct + '%';
  }
  function resetTimer(totalSec) {
    clearInterval(timer.id); timer.id = null; timer.running = false;
    timer.total = totalSec; timer.left = totalSec;
    $('btnTimer').textContent = '開始計時';
    $('timerStatus').textContent = '還沒開始。時間到會顯示「時間到！」，不會發出聲音。';
    drawTimer();
  }
  function toggleTimer() {
    if (timer.running) {
      clearInterval(timer.id); timer.running = false;
      $('btnTimer').textContent = '繼續計時';
      $('timerStatus').textContent = '已暫停，剩下 ' + fmt(timer.left) + '。';
      return;
    }
    if (timer.left <= 0) resetTimer(timer.total);
    timer.running = true;
    $('btnTimer').textContent = '暫停';
    $('timerStatus').textContent = '計時中…';
    timer.id = setInterval(function () {
      timer.left -= 1; drawTimer();
      if (timer.left <= 0) {
        clearInterval(timer.id); timer.running = false;
        $('btnTimer').textContent = '再玩一次';
        $('timerStatus').textContent = '時間到！先收拾一下，再決定要不要再發酵一張。';
      }
    }, 1000);
  }

  // ---- 收藏（localStorage） ----
  function loadFavs() {
    try { return JSON.parse(localStorage.getItem(FAV_KEY) || '[]'); } catch (e) { return []; }
  }
  function saveFavs(list) { localStorage.setItem(FAV_KEY, JSON.stringify(list)); }
  function renderFavs() {
    var list = loadFavs();
    var box = $('favList');
    if (!list.length) { box.innerHTML = '<p class="muted">還沒有收藏。喜歡的任務按「⭐ 收藏這個任務」，就會出現在這裡。</p>'; return; }
    box.innerHTML = '';
    list.forEach(function (fav, i) {
      var div = document.createElement('div');
      div.className = 'fav';
      var p = document.createElement('p');
      p.innerHTML = '';
      var strong = document.createElement('strong'); strong.textContent = fav.title;
      var meta = document.createElement('span'); meta.className = 'muted';
      meta.textContent = ' · ' + fav.id + ' · ' + fav.time + ' 分鐘 · ' + fav.materials.join('、');
      p.appendChild(strong); p.appendChild(meta);
      var story = document.createElement('p'); story.textContent = fav.story;
      var row = document.createElement('div'); row.className = 'actions';
      var loadBtn = document.createElement('button'); loadBtn.className = 'ghost'; loadBtn.type = 'button'; loadBtn.textContent = '打開這張卡';
      loadBtn.onclick = function () { renderTask(fav); };
      var delBtn = document.createElement('button'); delBtn.className = 'ghost'; delBtn.type = 'button'; delBtn.textContent = '刪除';
      delBtn.onclick = function () {
        var l = loadFavs(); l.splice(i, 1); saveFavs(l); renderFavs();
      };
      row.appendChild(loadBtn); row.appendChild(delBtn);
      div.appendChild(p); div.appendChild(story); div.appendChild(row);
      box.appendChild(div);
    });
  }

  // ---- AI 模式（選填） ----
  function aiProvider() { return $('provider').value; }
  function aiModel() { return $('model').value.trim(); }
  function aiKey() { return localStorage.getItem(AI_KEY) || ''; }

  function buildPrompt(input) {
    var mats = input.materials.map(function (k) { return BF.MATERIALS[k]; }).join('、');
    return '你是一位兒童創意遊戲設計師。請為一位' +
      (input.age === '3-4' ? '3–4 歲' : input.age === '4-6' ? '4–6 歲' : '7–9 歲') +
      '的孩子設計一個' + input.time + '分鐘的室內創意任務。只能使用這些材料：' + mats +
      '。孩子今天想' + (input.energy === 'move' ? '動一動' : input.energy === 'calm' ? '靜靜做' : '動靜皆可') +
      '。請只回傳 JSON，不要有其他文字，格式：{"title":"有趣意外的任務名稱","story":"2-3 句任務故事","steps":["步驟一","步驟二","步驟三"],"parent":"一句家長提問，不要給答案","safety":"一句安全提醒"}。步驟要具體可做，材料只用上面列出的，語言是繁體中文。';
  }

  function parseAIJson(text) {
    var m = text.match(/\{[\s\S]*\}/);
    if (!m) throw new Error('模型沒有回傳 JSON。');
    var obj = JSON.parse(m[0]);
    if (!obj.title || !obj.story || !Array.isArray(obj.steps) || !obj.steps.length) throw new Error('模型回傳的 JSON 缺少必要欄位。');
    return obj;
  }

  async function callAI() {
    var key = aiKey();
    if (!key) { $('aiStatus').textContent = '請先在上面儲存 API Key，才能用 AI 模式。沒有 Key 也能用本地引擎。'; return; }
    var input = readInput();
    if (input.materials.length < 2) { alert('請至少勾 2 樣材料。'); return; }
    var provider = aiProvider(), model = aiModel();
    if (!model) { $('aiStatus').textContent = '請填模型名稱。'; return; }
    $('aiStatus').textContent = 'AI 發酵中，請稍等…';
    $('btnAI').disabled = true;
    try {
      var prompt = buildPrompt(input);
      var obj;
      if (provider === 'gemini') {
        var res = await fetch('https://generativelanguage.googleapis.com/v1beta/models/' + encodeURIComponent(model) + ':generateContent?key=' + encodeURIComponent(key), {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
        });
        if (!res.ok) throw new Error('Gemini 回傳 HTTP ' + res.status + '，請檢查 Key 與模型名稱。');
        var data = await res.json();
        var text = data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts
          ? data.candidates[0].content.parts.map(function (p) { return p.text || ''; }).join('') : '';
        obj = parseAIJson(text);
      } else {
        var res2 = await fetch('https://api.mixroute.ai/v1/chat/completions', {
          method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + key },
          body: JSON.stringify({ model: model, messages: [{ role: 'user', content: prompt }], temperature: 0.9 })
        });
        if (!res2.ok) throw new Error('MixRoute 回傳 HTTP ' + res2.status + '，請檢查 Key、模型 ID 與餘額。');
        var data2 = await res2.json();
        var text2 = data2.choices && data2.choices[0] && data2.choices[0].message ? data2.choices[0].message.content || '' : '';
        obj = parseAIJson(text2);
      }
      var seed = BF.randomSeed();
      var task = {
        id: 'BF-' + String(seed).padStart(6, '0'), seed: seed, templateId: 'AI',
        title: String(obj.title).slice(0, 60), story: String(obj.story),
        materials: input.materials.map(function (k) { return BF.MATERIALS[k]; }),
        materialKeys: input.materials.slice(),
        steps: obj.steps.slice(0, 5).map(String),
        parent: String(obj.parent || '你覺得接下來會發生什麼？'),
        safety: String(obj.safety || '請家長全程陪同，依孩子實際狀況調整。'),
        time: input.time, age: input.age, energy: input.energy,
        source: 'ai', aiProvider: provider === 'gemini' ? 'Gemini' : 'MixRoute'
      };
      renderTask(task);
      $('aiStatus').textContent = 'AI 任務已生成（任務編號 ' + task.id + '）。';
      $('btnAgain').disabled = false;
    } catch (e) {
      $('aiStatus').textContent = 'AI 生成失敗：' + e.message + ' 本地引擎仍可正常使用。';
    } finally {
      $('btnAI').disabled = false;
    }
  }

  // ---- 初始化 ----
  function init() {
    var box = $('materials');
    Object.keys(BF.MATERIALS).forEach(function (key) {
      var label = document.createElement('label');
      label.className = 'chip';
      var input = document.createElement('input');
      input.type = 'checkbox'; input.value = key;
      input.checked = DEFAULT_MATERIALS.indexOf(key) !== -1;
      input.addEventListener('change', updatePoolInfo);
      label.appendChild(input);
      label.appendChild(document.createTextNode(BF.MATERIALS[key]));
      box.appendChild(label);
    });
    document.querySelectorAll('input[name="time"], input[name="energy"]').forEach(function (el) {
      el.addEventListener('change', updatePoolInfo);
    });
    $('age').addEventListener('change', updatePoolInfo);
    updatePoolInfo();

    $('btnFerment').addEventListener('click', function () {
      var seedVal = $('seed').value.trim();
      ferment(seedVal ? parseInt(seedVal, 10) : undefined);
    });
    $('btnAgain').addEventListener('click', function () { ferment(undefined); });
    $('btnTimer').addEventListener('click', toggleTimer);
    $('btnTimerReset').addEventListener('click', function () { resetTimer((currentTask ? currentTask.time : readInput().time) * 60); });
    $('btnFav').addEventListener('click', function () {
      if (!currentTask) return;
      var list = loadFavs();
      if (list.some(function (f) { return f.id === currentTask.id; })) { $('favStatus').textContent = '這張任務已經收藏過了。'; return; }
      list.push(currentTask); saveFavs(list); renderFavs();
      $('favStatus').textContent = '已收藏到「收藏的任務」。';
    });
    $('btnPrint').addEventListener('click', function () { window.print(); });
    $('btnClearFav').addEventListener('click', function () {
      if (!confirm('確定要清除全部收藏嗎？')) return;
      saveFavs([]); renderFavs();
    });

    // AI 設定
    var savedProvider = localStorage.getItem(AI_PROVIDER_KEY);
    if (savedProvider) $('provider').value = savedProvider;
    var savedModel = localStorage.getItem(AI_MODEL_KEY);
    if (savedModel) $('model').value = savedModel;
    $('provider').addEventListener('change', function () {
      localStorage.setItem(AI_PROVIDER_KEY, $('provider').value);
      if ($('provider').value === 'mixroute' && $('model').value === 'gemini-3-flash-preview') {
        $('model').value = 'gemini-3-flash-preview';
      }
    });
    $('model').addEventListener('change', function () { localStorage.setItem(AI_MODEL_KEY, $('model').value.trim()); });
    if (aiKey()) { $('apiKey').value = ''; $('keyStatus').textContent = '已儲存一組 Key 在這個瀏覽器（不會顯示出來）。'; }
    $('btnSaveKey').addEventListener('click', function () {
      var k = $('apiKey').value.trim();
      if (!k) { $('keyStatus').textContent = '請先貼上 Key。'; return; }
      localStorage.setItem(AI_KEY, k);
      $('apiKey').value = '';
      $('keyStatus').textContent = '已儲存到這個瀏覽器。Key 不會寫入任何檔案，也不會上傳到我們的伺服器。';
    });
    $('btnClearKey').addEventListener('click', function () {
      localStorage.removeItem(AI_KEY);
      $('keyStatus').textContent = '已清除這個瀏覽器裡的 Key。';
    });
    $('btnAI').addEventListener('click', callAI);

    renderFavs();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
