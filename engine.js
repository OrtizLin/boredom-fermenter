/* 無聊發酵機 Boredom Fermenter — 本地組合引擎
 * 純邏輯、無 DOM、無網路。app.js 在瀏覽器使用它，tests/test-engine.mjs 在 Node 使用它。
 * 規則：只用使用者勾選的材料；能量（想動／想靜靜做）與時間、年齡都要對得上。
 * 種子可重現：同一組輸入 + 同一種子 = 同一張任務卡。任務編號即種子。
 */
(function (root) {
  'use strict';

  var MATERIALS = {
    clay: '黏土',
    box: '廢紙盒',
    ball: '球',
    crayon: '彩繪筆',
    blocks: '積木',
    towel: '毛巾',
    cup: '紙杯',
    paper: '舊報紙'
  };

  // 32 張任務模板。每張只用 needs 列出的材料，步驟也只提這些材料。
  var TEMPLATES = [
    { id: 'T01', title: '幫小汽車蓋一座會塌的賽車場', needs: ['clay', 'box', 'ball'], energy: 'move', time: 30, ages: ['3-4', '4-6', '7-9'],
      story: '賽車場蓋好了，可是彎道一直塌。沒關係，塌掉的地方就是新的賽道，今天的冠軍由最會修路的人拿走。',
      steps: ['用廢紙盒拼出賽車場的地板和彎道，黏土當作護欄和路障。', '把球當作賽車，從起點滾下去，看看它會在哪裡卡住。', '卡住的地方就改設計：加高護欄、把彎道拉寬，或乾脆開一條新路。', '比三次，記下哪一次最快，再把賽車場推倒重蓋一次。'],
      parent: '你覺得賽車場還缺什麼？', safety: '球不要往人臉上滾；紙盒邊緣若有點利，先幫孩子把邊角折平。' },
    { id: 'T02', title: '黏土怪獸畫像館', needs: ['clay', 'crayon'], energy: 'calm', time: 15, ages: ['3-4', '4-6', '7-9'],
      story: '有一隻怪獸住在黏土裡，牠長什麼樣子只有孩子知道。捏出來，再幫牠畫一張正式的畫像，掛在畫像館裡。',
      steps: ['先用黏土捏出一隻怪獸，不用像，越奇怪越好。', '用彩繪筆在紙上畫出這隻怪獸的畫像，寫上牠的名字。', '幫怪獸想一個超能力，畫在畫像的角落。'],
      parent: '這隻怪獸最怕什麼？最喜歡吃什麼？', safety: '黏土不要放進嘴巴；玩完記得洗手。' },
    { id: 'T03', title: '黏土橋樑大考驗', needs: ['clay', 'blocks'], energy: 'calm', time: 30, ages: ['4-6', '7-9'],
      story: '河的兩邊各有一座積木城，居民想去對岸串門子。橋要夠穩，黏土就是今天的工程水泥。',
      steps: ['用積木在桌上排出兩座城，中間留一條河。', '用黏土和積木搭一座橋，橋墩要站在河的兩邊。', '一顆一顆把積木放在橋上，看橋能撐幾顆才塌。', '塌了就改設計再試一次，記下最穩的那座橋長什麼樣子。'],
      parent: '橋塌了，你覺得是哪裡先撐不住？', safety: '積木不要往上拋；塌下來的時候手先離開。' },
    { id: 'T04', title: '黏土杯子塔', needs: ['clay', 'cup'], energy: 'move', time: 15, ages: ['3-4', '4-6'],
      story: '紙杯疊得越高，風就越大。黏土是塔的地基，也是塔倒掉時最好笑的證人。',
      steps: ['把紙杯一個一個疊成塔，黏土黏在杯底當作地基。', '疊到你覺得快倒的時候停下來，猜猜還能再疊幾個。', '塔倒了之後，用剩下的杯子排一個新形狀。'],
      parent: '你覺得塔為什麼會倒？', safety: '站在椅子上疊高塔時，大人要在旁邊。' },
    { id: 'T05', title: '紙盒保齡球館', needs: ['box', 'ball'], energy: 'move', time: 15, ages: ['3-4', '4-6', '7-9'],
      story: '客廳變成保齡球館，紙盒是球瓶，球是今天的明星。分數不重要，重要的是球瓶倒下的聲音。',
      steps: ['把廢紙盒排成三角形，站在三步遠的地方。', '用球滾過去，看一次能撞倒幾個紙盒。', '把沒倒的紙盒換個位置，再比一次。'],
      parent: '你想把球瓶排成什麼形狀？', safety: '球往空的地方滾，不要往人或玻璃的方向。' },
    { id: 'T06', title: '紙盒機器人變身', needs: ['box', 'crayon'], energy: 'calm', time: 30, ages: ['4-6', '7-9'],
      story: '這個紙盒本來要被丟掉，結果它說它想當機器人。幫它畫上眼睛、按鈕和一顆會發光的心。',
      steps: ['選一個廢紙盒當作機器人的身體。', '用彩繪筆畫上眼睛、嘴巴、按鈕和開關。', '幫機器人取名字，再想一個它最會做的家事。'],
      parent: '你的機器人最想幫家裡做什麼？', safety: '不要用紙盒套住頭；畫筆不要畫在臉上。' },
    { id: 'T07', title: '紙盒城市規劃師', needs: ['box', 'blocks'], energy: 'calm', time: 30, ages: ['4-6', '7-9'],
      story: '這座城市還沒有路、沒有公園，也沒有人住。規劃師今天上任，第一件事是決定市中心要蓋什麼。',
      steps: ['用廢紙盒當作房子，積木當作路和橋。', '先蓋一條主幹道，再決定公園、學校和商店在哪裡。', '幫城市取名字，說說住在這裡的人今天要去哪裡。'],
      parent: '這座城市最需要什麼？', safety: '紙盒邊角若有點利，先折平再玩。' },
    { id: 'T08', title: '紙盒報紙迷宮', needs: ['box', 'paper'], energy: 'move', time: 30, ages: ['4-6', '7-9'],
      story: '迷宮裡藏了一樣寶物，入口只有一個，出口要自己找。報紙是地圖，也是迷宮的牆。',
      steps: ['把廢紙盒排成迷宮的牆，留一個入口。', '把舊報紙揉成小球，藏在迷宮的某個角落當作寶物。', '閉上眼睛數到十，再走進迷宮找寶物。'],
      parent: '如果迷宮太簡單，要怎麼讓它更難？', safety: '迷宮不要排得太高，避免紙盒倒下來壓到人。' },
    { id: 'T09', title: '毛巾球接力賽', needs: ['towel', 'ball'], energy: 'move', time: 15, ages: ['3-4', '4-6', '7-9'],
      story: '兩個人各拉著毛巾的一邊，球放在毛巾中間。走得越穩，球就越聽話。',
      steps: ['兩個人各拉著毛巾的兩端，球放在中間。', '一起慢慢走三步，看看球會不會掉下來。', '球掉了就撿起來，從掉的地方繼續走。'],
      parent: '你們要怎麼走，球才不會掉？', safety: '在空曠的地方玩，地上不要有會絆倒的東西。' },
    { id: 'T10', title: '紙杯投球挑戰', needs: ['cup', 'ball'], energy: 'move', time: 15, ages: ['3-4', '4-6', '7-9'],
      story: '紙杯排成一排，球只有一顆。投進哪個杯子，就能得到那個杯子的分數。',
      steps: ['把紙杯排成一排，站在兩步遠的地方。', '用球投向紙杯，投進一個就得一分。', '把杯子排得更遠，再比一次。'],
      parent: '站在哪裡投最容易進？', safety: '球不要往人身上丟。' },
    { id: 'T11', title: '積木球道工程師', needs: ['blocks', 'ball'], energy: 'move', time: 30, ages: ['4-6', '7-9'],
      story: '球要從高處滾到低處，中間要經過三個彎。工程師的任務是讓球一路滾到底，不中途掉隊。',
      steps: ['用積木搭一條有高低差的球道。', '把球放在最高處放開，看它能滾多遠。', '球掉出來的地方就加一塊積木當護欄，再試一次。'],
      parent: '球在哪裡最容易掉出來？', safety: '積木搭高時不要站在旁邊推。' },
    { id: 'T12', title: '舊報紙漫畫家', needs: ['paper', 'crayon'], energy: 'calm', time: 30, ages: ['4-6', '7-9'],
      story: '報紙上的照片都還沒說完故事。幫它們加上對話框，今天的新聞由孩子來寫。',
      steps: ['從舊報紙上選一張照片，剪下來或指著它。', '用彩繪筆畫上對話框，寫下照片裡的人在說什麼。', '把三張照片排在一起，變成一則四格漫畫。'],
      parent: '照片裡的人剛剛發生了什麼事？', safety: '報紙油墨會沾手，玩完記得洗手；剪刀由大人拿。' },
    { id: 'T13', title: '紙杯偶劇場', needs: ['cup', 'crayon'], energy: 'calm', time: 30, ages: ['3-4', '4-6', '7-9'],
      story: '紙杯翻過來就是一個角色，畫上臉之後它就開始說話了。今晚的劇場只演一齣戲。',
      steps: ['每個紙杯畫上一張臉，取一個名字。', '幫每個角色想一句口頭禪。', '把紙杯排在桌邊，演一齣一分鐘的戲。'],
      parent: '這齣戲裡，誰是最勇敢的角色？', safety: '彩繪筆不要畫在臉上或衣服上。' },
    { id: 'T14', title: '毛巾大地圖', needs: ['towel', 'crayon'], energy: 'calm', time: 15, ages: ['3-4', '4-6'],
      story: '毛巾鋪開就是一張地圖，彩繪筆畫出來的路，通往一個只有孩子知道的地方。',
      steps: ['把毛巾平鋪在地上，當作一張地圖。', '用彩繪筆在紙上畫出地圖上的路、河和山。', '用手指沿著路走一遍，說說終點有什麼。'],
      parent: '這條路的終點有什麼？', safety: '不要在毛巾上跑跳，容易滑倒。' },
    { id: 'T15', title: '積木杯子城堡', needs: ['blocks', 'cup'], energy: 'calm', time: 30, ages: ['3-4', '4-6', '7-9'],
      story: '城堡的城牆是積木，塔樓是紙杯。國王今天要檢查城堡，看看它夠不夠堅固。',
      steps: ['用積木排出城堡的城牆。', '把紙杯疊在四個角落當作塔樓。', '幫城堡取名字，再決定誰住在裡面。'],
      parent: '城堡裡住著誰？他今天要做什麼？', safety: '城堡倒下來時手先離開，不要用手去接。' },
    { id: 'T16', title: '毛巾帳篷基地', needs: ['towel', 'blocks'], energy: 'calm', time: 30, ages: ['3-4', '4-6', '7-9'],
      story: '客廳的角落出現了一個基地，入口很小，只有知道暗號的人能進去。',
      steps: ['用積木搭出帳篷的骨架，毛巾蓋在上面當屋頂。', '留一個小入口，裡面放一樣最喜歡的東西。', '想一個進基地的暗號，說對了才能進去。'],
      parent: '這個基地的暗號是什麼？', safety: '帳篷不要搭在會絆倒人的走道上。' },
    { id: 'T17', title: '毛巾船漂流記', needs: ['towel', 'cup'], energy: 'calm', time: 15, ages: ['3-4', '4-6'],
      story: '毛巾是一艘船，紙杯是船上的水手。船要漂過客廳這片海，中間會遇到大浪。',
      steps: ['把毛巾鋪在地上當作船，紙杯排在船上當水手。', '輕輕搖動毛巾，看看哪個水手先掉下船。', '掉下船的水手要想辦法爬回來，重新排好隊。'],
      parent: '船遇到大浪的時候，水手該怎麼辦？', safety: '不要站在毛巾上，毛巾會滑。' },
    { id: 'T18', title: '報紙紙杯火箭', needs: ['paper', 'cup'], energy: 'move', time: 30, ages: ['4-6', '7-9'],
      story: '火箭的燃料是報紙，發射台是紙杯。倒數三二一，火箭要飛到客廳的另一頭。',
      steps: ['把舊報紙捲成火箭的身體，紙杯當作發射台。', '幫火箭取名字，畫上窗戶和火焰。', '從發射台把火箭推向對面，看它能飛多遠。'],
      parent: '火箭飛到哪裡去了？', safety: '不要把火箭往人身上丟；報紙邊緣不要碰到眼睛。' },
    { id: 'T19', title: '黏土球滾畫', needs: ['clay', 'ball'], energy: 'calm', time: 15, ages: ['3-4', '4-6'],
      story: '黏土黏在球上，球滾過的地方就留下一條路。今天的畫不用筆，用滾的。',
      steps: ['把一小塊黏土黏在球上。', '讓球在紙上慢慢滾，看看它畫出什麼線條。', '換一塊不同顏色的黏土，再滾一次。'],
      parent: '這條線看起來像什麼？', safety: '黏土不要放進嘴巴；球不要往臉上滾。' },
    { id: 'T20', title: '紙盒紙杯停車場', needs: ['box', 'cup'], energy: 'calm', time: 30, ages: ['3-4', '4-6', '7-9'],
      story: '停車場開張了，紙杯是停車格，紙盒是收費亭。每輛車都要找到自己的位置。',
      steps: ['把紙杯排成一排，當作停車格。', '用廢紙盒做一個收費亭，放在停車場入口。', '幫每輛車編號，說說它們今天要去哪裡。'],
      parent: '哪一輛車最難停進去？', safety: '紙盒邊角若有點利，先折平再玩。' },
    { id: 'T21', title: '黏土報紙恐龍', needs: ['clay', 'paper'], energy: 'calm', time: 30, ages: ['4-6', '7-9'],
      story: '報紙上出現了恐龍的腳印，順著腳印走，就能找到一隻用黏土做的恐龍。',
      steps: ['用舊報紙撕出恐龍腳印的形狀，排成一條路。', '用黏土捏出一隻恐龍，放在路的盡頭。', '幫恐龍取名字，再想想牠住在哪裡。'],
      parent: '這隻恐龍最喜歡吃什麼？', safety: '黏土不要放進嘴巴；報紙油墨玩完要洗手。' },
    { id: 'T22', title: '球的彩色足跡', needs: ['ball', 'crayon'], energy: 'move', time: 15, ages: ['3-4', '4-6'],
      story: '球滾過的地方會留下足跡，彩繪筆負責把足跡變成地圖。今天的球去過很多地方。',
      steps: ['用彩繪筆在紙上畫一個起點。', '把球從起點滾出去，滾到哪裡停下來，就在那裡畫一個記號。', '把所有記號連起來，看看球今天走了什麼路線。'],
      parent: '球今天去了哪些地方？', safety: '球往空的地方滾，不要往人或玻璃的方向。' },
    { id: 'T23', title: '報紙積木橋', needs: ['paper', 'blocks'], energy: 'move', time: 30, ages: ['4-6', '7-9'],
      story: '河上沒有橋，報紙是橋面，積木是橋墩。橋要夠穩，才能讓小車開過去。',
      steps: ['用積木在兩邊搭出橋墩。', '把舊報紙鋪在橋墩上面當作橋面。', '把積木小車放在橋上，看看橋會不會塌。'],
      parent: '橋塌了，你想先修哪裡？', safety: '橋塌下來時手先離開。' },
    { id: 'T24', title: '毛巾報紙野餐', needs: ['towel', 'paper'], energy: 'calm', time: 15, ages: ['3-4', '4-6'],
      story: '客廳變成野餐的草地，毛巾是野餐墊，報紙是今天的菜單。野餐的食物全部用想像的。',
      steps: ['把毛巾鋪在地上當作野餐墊。', '用舊報紙撕出三樣野餐食物的形狀，放在毛巾上。', '幫每樣食物取名字，說說它是什麼味道。'],
      parent: '今天的野餐，你最想吃什麼？', safety: '不要在毛巾上跑跳，容易滑倒。' },
    { id: 'T25', title: '紙杯報紙風車', needs: ['cup', 'paper'], energy: 'move', time: 30, ages: ['4-6', '7-9'],
      story: '風車轉得越快，風就越大。紙杯是風車的底座，報紙是風車的葉片。',
      steps: ['把舊報紙剪成風車的葉片，黏在紙杯上。', '對著風車吹氣，看看它轉得多快。', '把風車拿到窗邊，看看自然的風能不能讓它轉。'],
      parent: '風車轉得快跟慢，跟什麼有關？', safety: '剪刀由大人拿；不要把紙片放進嘴巴。' },
    { id: 'T26', title: '黏土毛巾小床', needs: ['clay', 'towel'], energy: 'calm', time: 15, ages: ['3-4', '4-6'],
      story: '有一個小玩偶累了，牠需要一張床。毛巾是床墊，黏土是枕頭，今天的任務是讓牠睡個好覺。',
      steps: ['把毛巾摺成一張小床。', '用黏土捏一個小枕頭，放在床頭。', '幫小玩偶蓋好被子，說一聲晚安。'],
      parent: '小玩偶今天做了什麼，累成這樣？', safety: '黏土不要放進嘴巴。' },
    { id: 'T27', title: '紙盒毛巾洞穴探險', needs: ['box', 'towel'], energy: 'move', time: 30, ages: ['4-6', '7-9'],
      story: '紙盒是一個洞穴，毛巾是洞穴的門簾。裡面很黑，探險家要帶著勇氣走進去。',
      steps: ['把廢紙盒打開當作洞穴，毛巾掛在洞口當門簾。', '在洞穴裡藏一樣東西，當作寶藏。', '掀開門簾走進去，找到寶藏再走出來。'],
      parent: '洞穴裡面有什麼？', safety: '洞穴不要做得太密閉，留一個通風口；不要把頭套進紙盒裡。' },
    { id: 'T28', title: '報紙球投籃', needs: ['paper', 'ball'], energy: 'move', time: 15, ages: ['3-4', '4-6', '7-9'],
      story: '舊報紙揉成球，就是今天的籃球。籃框在哪裡？由孩子自己決定。',
      steps: ['把舊報紙揉成三顆小球。', '選一個地方當作籃框，例如椅子或紙盒。', '站在兩步遠的地方投球，投進一個得一分。'],
      parent: '籃框放在哪裡最剛好？', safety: '球不要往人身上丟。' },
    { id: 'T29', title: '積木塗鴉故事', needs: ['blocks', 'crayon'], energy: 'calm', time: 30, ages: ['4-6', '7-9'],
      story: '積木排成什麼，故事就從那裡開始。彩繪筆負責把故事畫下來，免得明天忘記。',
      steps: ['用積木排一個場景，例如一座山或一條街。', '用彩繪筆把這個場景畫下來。', '看著畫，說一個三句話的故事。'],
      parent: '這個場景裡發生了什麼事？', safety: '積木不要往上拋。' },
    { id: 'T30', title: '黏土紙盒小劇場', needs: ['clay', 'box', 'crayon'], energy: 'calm', time: 30, ages: ['4-6', '7-9'],
      story: '紙盒是舞台，黏土是演員，彩繪筆是燈光。今晚只演一齣戲，觀眾只有一個人也沒關係。',
      steps: ['把廢紙盒打開當作舞台，用彩繪筆畫上布幕。', '用黏土捏兩個演員，放在舞台上。', '演一齣一分鐘的戲，演完謝幕。'],
      parent: '這齣戲裡，誰改變了主意？', safety: '不要用紙盒套住頭。' },
    { id: 'T31', title: '紙盒高塔工程', needs: ['box', 'blocks', 'cup'], energy: 'move', time: 60, ages: ['7-9'],
      story: '這座塔要蓋到跟桌子一樣高，紙盒是樓層，積木是樑，紙杯是屋頂。工程師只有一個，時間只有一小時。',
      steps: ['先在地上排好塔的地基，用紙盒當第一層。', '一層一層往上蓋，積木放在層與層之間當樑。', '最後把紙杯放在最上面當屋頂，拍照留念。', '塔倒了也沒關係，記下它倒之前有多高。'],
      parent: '塔倒之前，你覺得哪一層最重要？', safety: '塔搭高時大人要在旁邊；倒下來時手先離開。' },
    { id: 'T32', title: '紙杯報紙小劇場', needs: ['cup', 'paper', 'crayon'], energy: 'calm', time: 60, ages: ['7-9'],
      story: '報紙是劇本，紙杯是演員，彩繪筆是化妝師。這齣戲要演給全家人看，演完還要接受訪問。',
      steps: ['從舊報紙上選一個故事，當作今天的劇本。', '每個紙杯畫上一張臉，分配好角色。', '彩排一次，再正式演出。', '演出結束後，演員要接受一個訪問問題。'],
      parent: '如果可以改寫結局，你會怎麼改？', safety: '剪刀由大人拿；報紙油墨玩完要洗手。' },
    { id: 'T33', title: '黏土積木賽車', needs: ['clay', 'blocks'], energy: 'move', time: 15, ages: ['3-4', '4-6', '7-9'],
      story: '積木是賽道，黏土是賽車。賽車沒有引擎，靠的是手推和一點點運氣。',
      steps: ['用積木排一條彎彎的賽道。', '用黏土捏一輛賽車，放在起點。', '用手把賽車推到終點，計時看看要幾秒。'],
      parent: '賽車在哪裡最容易翻車？', safety: '賽車不要往人身上推。' },
    { id: 'T34', title: '積木彩繪賽道', needs: ['blocks', 'crayon'], energy: 'move', time: 15, ages: ['3-4', '4-6'],
      story: '賽道還沒有畫好，車子已經在起點等了。彩繪筆是今天的鋪路工人。',
      steps: ['用積木排賽道的邊界。', '用彩繪筆在紙上畫出賽道的路線圖。', '照著路線圖，把積木賽道再排一次。'],
      parent: '這條賽道最難的地方在哪裡？', safety: '積木不要往上拋。' },
    { id: 'T35', title: '黏土怪獸賽跑', needs: ['clay', 'crayon'], energy: 'move', time: 15, ages: ['3-4', '4-6', '7-9'],
      story: '兩隻黏土怪獸要賽跑，牠們跑得很慢，但是跑得很認真。彩繪筆是裁判，負責畫起跑線和終點線。',
      steps: ['用黏土捏兩隻怪獸，用彩繪筆畫出起跑線和終點線。', '兩隻怪獸輪流往前跳，看誰先到終點。', '輸的怪獸可以要求再比一次，這次換一條路。'],
      parent: '哪隻怪獸跑得比較快？為什麼？', safety: '黏土不要放進嘴巴。' },
    { id: 'T36', title: '紙盒隧道賽', needs: ['box', 'crayon'], energy: 'move', time: 15, ages: ['3-4', '4-6'],
      story: '紙盒排成一條隧道，隧道裡面很黑，出口有光。穿過隧道的人就是今天的探險家。',
      steps: ['把廢紙盒排成一條隧道，用彩繪筆在隧道口畫一個標誌。', '從隧道的一頭爬到另一頭。', '把隧道加長，再爬一次。'],
      parent: '隧道裡面有什麼？', safety: '隧道不要排得太高，避免紙盒倒下來；不要把頭套進紙盒裡。' },
    { id: 'T37', title: '積木保齡球', needs: ['blocks', 'ball'], energy: 'move', time: 15, ages: ['3-4', '4-6', '7-9'],
      story: '積木是球瓶，球是保齡球。球瓶倒下的聲音，就是今天最好聽的音樂。',
      steps: ['把積木排成三角形當作球瓶。', '站在三步遠的地方，用球滾過去。', '把沒倒的積木換個位置，再比一次。'],
      parent: '你想把球瓶排成什麼形狀？', safety: '球往空的地方滾，不要往人或玻璃的方向。' },
    { id: 'T38', title: '黏土球投擲賽', needs: ['clay', 'ball'], energy: 'move', time: 15, ages: ['4-6', '7-9'],
      story: '黏土球很重，球很輕，兩種球的投法完全不一樣。今天的比賽要比兩種球。',
      steps: ['用黏土捏三顆小球，再準備一顆球。', '先投黏土球，再投球，看看哪一種投得遠。', '把目標放得更遠，再比一次。'],
      parent: '哪一種球比較好投？為什麼？', safety: '球不要往人身上丟；黏土不要放進嘴巴。' },
    { id: 'T39', title: '紙盒積木倒塌秀', needs: ['box', 'blocks'], energy: 'move', time: 15, ages: ['3-4', '4-6', '7-9'],
      story: '這座塔蓋得越高，倒下來就越壯觀。今天的任務不是不讓它倒，而是讓它倒得好看。',
      steps: ['用廢紙盒和積木輪流疊一座高塔。', '疊到你覺得快倒的時候停下來，猜猜它會往哪邊倒。', '輕輕推一下，讓塔倒下來，再重新蓋一座。'],
      parent: '塔倒下來之前，你覺得哪一層最危險？', safety: '塔倒下來時手先離開，不要用手去接。' },
    { id: 'T40', title: '球的障礙賽', needs: ['ball', 'blocks', 'box'], energy: 'move', time: 30, ages: ['4-6', '7-9'],
      story: '球要從起點滾到終點，中間有積木山和紙盒隧道。障礙賽的冠軍，是最會繞路的球。',
      steps: ['用積木和廢紙盒在地上排一條障礙賽道。', '把球放在起點，用手輕輕推著它前進。', '球卡住的地方就改賽道，再試一次。'],
      parent: '哪一個障礙最難通過？', safety: '球往空的地方滾，不要往人或玻璃的方向。' }
  ];

  function mulberry32(seed) {
    var a = seed >>> 0;
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function hashSeed(str) {
    var h = 2166136261;
    for (var i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  function randomSeed() {
    return Math.floor(Math.random() * 900000) + 100000; // 6 位數
  }

  function matches(t, input) {
    if (t.time > input.time) return false;
    if (t.ages.indexOf(input.age) === -1) return false;
    if (input.energy !== 'any' && t.energy !== input.energy) return false;
    for (var i = 0; i < t.needs.length; i++) {
      if (input.materials.indexOf(t.needs[i]) === -1) return false;
    }
    return true;
  }

  function pickTask(input, seed) {
    var s = (typeof seed === 'number' && isFinite(seed)) ? seed : randomSeed();
    var pool = TEMPLATES.filter(function (t) { return matches(t, input); });
    if (pool.length === 0) return { task: null, seed: s, poolSize: 0, total: TEMPLATES.length };
    var rng = mulberry32(s);
    var idx = Math.floor(rng() * pool.length);
    var t = pool[idx];
    return {
      task: {
        id: 'BF-' + String(s).padStart(6, '0'),
        seed: s,
        templateId: t.id,
        title: t.title,
        story: t.story,
        materials: t.needs.map(function (k) { return MATERIALS[k]; }),
        materialKeys: t.needs.slice(),
        steps: t.steps.slice(),
        parent: t.parent,
        safety: t.safety,
        time: input.time,
        age: input.age,
        energy: input.energy,
        source: 'local'
      },
      seed: s, poolSize: pool.length, total: TEMPLATES.length
    };
  }

  // 計算在某組輸入下有多少種不重複任務（以模板計；同一模板、不同種子只算一種玩法）。
  function countCombinations(input) {
    return TEMPLATES.filter(function (t) { return matches(t, input); }).length;
  }

  function totalTemplates() { return TEMPLATES.length; }

  var api = {
    MATERIALS: MATERIALS, TEMPLATES: TEMPLATES,
    pickTask: pickTask, countCombinations: countCombinations,
    totalTemplates: totalTemplates, randomSeed: randomSeed,
    mulberry32: mulberry32, hashSeed: hashSeed
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.BoredomFermenter = api;
})(typeof window !== 'undefined' ? window : globalThis);
