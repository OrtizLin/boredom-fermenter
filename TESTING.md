# 測試紀錄

測試日期：2026-11-12（台北時間）
測試環境：本機 Linux，Python 3.12.3、Node v24.22.1、jsdom（僅測試用，裝在 /tmp/bf-test，不在作品目錄裡）
**沒有真實瀏覽器可用**（本機無 Chromium／Firefox），UI 測試用 jsdom 模擬瀏覽器執行；Demo 前請務必在真實瀏覽器再點一次。

## 1. 引擎測試（Node，無外部依賴）

指令：

```bash
node tests/test-engine.mjs
```

結果：**7/7 通過**，模板共 40 張。

- 模板總數 ≥ 40，每張 needs 都是合法材料，步驟 3–5 步，故事、陪伴者提示、安全提醒齊全。
- 預設條件（靈感百寶箱 5 樣、4–6 歲、30 分鐘、想動）可玩 12 種。
- 全材料、4–6 歲、60 分鐘、不限能量時可玩 38 種（≥ 24 種的要求已滿足）。
- 同一種子可重現：種子 482910 兩次生成同一張卡（任務編號、標題、模板相同）。
- 生成的任務只用勾選的材料、時間不超過選擇、年齡對得上（抽查 50 個種子）。
- 材料不足（只勾 1 樣）時回傳 null，不會硬湊任務。
- 15 分鐘、3–4 歲、靜靜做也有任務（6 種）。

測試過程中有發現一個問題並已修復：最初只有 32 張模板時，預設條件下只有 4 種玩法，太少；
已補 8 張「想動」模板（T33–T40，皆用靈感百寶箱的材料），預設條件提升到 12 種。

## 2. HTTP 伺服測試

指令：

```bash
python3 -m http.server 8001 --bind 127.0.0.1
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:8001/index.html
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:8001/engine.js
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:8001/app.js
```

結果：`index.html`、`engine.js`、`app.js` 皆回傳 **200**。`node --check engine.js` 與 `node --check app.js` 皆通過，無語法錯誤。

## 3. UI 測試（jsdom 模擬瀏覽器）

指令（需先在測試目錄裝 jsdom，僅測試用）：

```bash
cd /tmp/bf-test && npm install jsdom
python3 -m http.server 8001 --bind 127.0.0.1   # 在作品目錄執行
node test-ui.mjs
```

結果：**全數通過**（jsdom，無真實瀏覽器）。

- 預設材料 5 樣已勾選，池子資訊正確顯示。
- 按「開始發酵」：任務卡出現，標題、故事、3–5 步步驟、陪伴者提示、安全提醒齊全，計時器顯示 30:00。
- 種子可重現：填入種子 482910，按兩次「開始發酵」，出同一張卡（黏土積木賽車，BF-482910）。
- 「再發酵一次」：可換一張任務卡。
- 計時器：開始後約 2 秒從 30:00 走到 29:58；按暫停後數字停住；按重設回到 30:00。
- 收藏：按「⭐ 收藏這個任務」後 localStorage 有 1 筆，收藏清單出現該任務；按刪除後剩 0 筆。
- 材料不足（只勾 0 樣）時會擋下，不生成空任務（jsdom 的 `alert()` 會印「Not implemented」但不影響結果；真實瀏覽器會跳提示框）。
- AI 無 Key 時：按「用 AI 再發酵一個任務」會明確提示先儲存 Key，不會假裝生成。
- 換條件：15 分鐘、靜靜做、3–4 歲仍能生成任務，計時器顯示 15:00。

測試中發現並已修復一個小問題：`renderTask` 直接呼叫 `scrollIntoView`，在 jsdom 會拋 `TypeError`（jsdom 沒有實作它），
真實瀏覽器雖有此功能，但已加上 `typeof === 'function'` 防護，避免舊瀏覽器因此中斷。修復後重新跑 UI 測試，全數通過、無錯誤訊息。

## 4. AI 模式模擬測試（假 Key、假回傳，不連真實網路）

指令：

```bash
node test-ai-mock.mjs
```

結果：**通過**。用假 Key 與 stub 的 `fetch` 驗證：

- Gemini 路徑：呼叫 `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent`，
  提示詞正確列出勾選的材料（黏土、廢紙盒、球、彩繪筆、積木），回傳的 JSON 任務正確渲染為任務卡，標示「AI 生成」。
- MixRoute 錯誤路徑：回傳 HTTP 401 時，畫面顯示「AI 生成失敗：MixRoute 回傳 HTTP 401，請檢查 Key、模型 ID 與餘額。本地引擎仍可正常使用。」

**未測試的部分（誠實說明）：**

- 沒有用真實 API Key 呼叫過 MixRoute 或 Gemini，真實連線、真實模型的回傳格式、費用與延遲皆未驗證。
  若要參選 MixRoute 特別獎，投稿前請用真實 MixRoute Key 實際按一次「用 AI 再發酵一個任務」，確認能成功生成。
- 沒有在真實瀏覽器（Chrome／Safari／手機瀏覽器）上點過；Demo 錄影前請務必在真實瀏覽器完整走一次流程。
- 列印功能（`window.print()`）只接了按鈕，未實際列印驗證。
