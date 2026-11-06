/*
 * app.js — 應用外殼
 * 建立側邊目錄、首頁模組卡片、實驗頁面（模擬 + 教材）、搜尋、
 * 學習進度、深／淺色主題、上一個／下一個與鍵盤導覽，並註冊 PWA。
 */
(function () {
  "use strict";
  const C = window.PhysicsLabCurriculum;
  const PL = window.PhysicsLab;
  const $ = (s, r) => (r || document).querySelector(s);
  const el = PL.el;

  // 建立扁平的實驗索引（含所屬模組），供導覽與搜尋使用
  const FLAT = [];
  C.modules.forEach(m => m.experiments.forEach((e, i) => FLAT.push({ exp: e, mod: m, indexInMod: i })));
  const byId = {};
  FLAT.forEach((f, i) => { f.order = i; byId[f.exp.id] = f; });
  const LEARNING_PATHS = Array.isArray(C.learningPaths) ? C.learningPaths : [];

  /*
   * 學段標記：這個實驗在哪一級。
   * 國中／高中是課綱本體；選修與大學延伸是「多走一步」的內容，必須在頁面上講清楚，
   * 否則自學的高中生會以為自己必須先學完分子遺傳才能玩這個網站。
   */
  function levelForExperiment(id) {
    const ADVANCED_MODULES = ["molecular","applied"];
    const entry = byId[id];
    const isAdvanced = !!(entry && ADVANCED_MODULES.indexOf(entry.mod.id) !== -1);
    let universityNote = "";
    let seniorNote = "";
    let juniorNote = "";
    LEARNING_PATHS.forEach(path => {
      (path.stages || []).forEach(stage => {
        if (!(stage.ids || []).includes(id)) return;
        if (stage.kind === "university") universityNote = stage.note || "大學生物先修直覺";
        if (stage.kind === "senior") seniorNote = stage.note || "高中課綱核心";
        if (stage.kind === "junior") juniorNote = stage.note || "國中打底";
      });
    });
    if (universityNote) {
      return {
        kind: "university",
        label: "大學延伸",
        hint: "高中課綱之後的銜接：用同一個現象多走一步。不需要先修大學課程，當成「以後會學到什麼」即可。" +
          (universityNote ? " " + universityNote : "")
      };
    }
    if (isAdvanced) {
      return {
        kind: "university",
        label: "選修延伸",
        hint: "對應 108 課綱選修的加深加廣。先修完必修的細胞、遺傳與生理再回來看，會順很多；不要求先修大學課程。" +
          (seniorNote || "")
      };
    }
    if (seniorNote || juniorNote) {
      return {
        kind: "senior",
        label: "高中課綱",
        hint: "對應 108 課綱高中生物。" + (seniorNote || juniorNote)
      };
    }
    return {
      kind: "senior",
      label: "高中課綱",
      hint: "以 108 課綱必修生物的核心概念為主；選修與大學延伸的步驟會另外標示。"
    };
  }

  function paintLevelBadge(id) {
    const host = $("#exp-header") || document.querySelector(".exp-header");
    if (!host) return;
    const old = host.querySelector(".exp-level-badge");
    if (old) old.remove();
    const info = levelForExperiment(id);
    const badge = el("span", "exp-level-badge is-" + info.kind);
    badge.textContent = info.label;
    badge.title = info.hint;
    badge.setAttribute("role", "note");
    badge.setAttribute("aria-label", info.label + "。" + info.hint);
    const title = $("#exp-title");
    if (title && title.parentNode) title.parentNode.insertBefore(badge, title.nextSibling);
    else host.appendChild(badge);
    const oldHint = host.querySelector(".exp-level-hint");
    if (oldHint) oldHint.remove();
    const hint = el("p", "exp-level-hint is-" + info.kind);
    hint.textContent = info.hint;
    if (title && title.parentNode) title.parentNode.insertBefore(hint, badge.nextSibling);
  }
  let activeLearningPath = LEARNING_PATHS[0] ? LEARNING_PATHS[0].id : "";
  const TEXTBOOK_BRIDGES = { "cell": { "junior": "國中生物：生命現象與顯微鏡初步", "senior": "高中生物：細胞構造、胞器與細胞週期", "next": "大學生物：細胞生物學與顯微技術", "observe": "先認出細胞類型與胞器，再改變放大率或細胞尺度，對照構造與功能的對應。", "exam": "先判斷細胞類型（動物、植物、原核），再由胞器推功能，最後才考慮尺度限制。" }, "membrane": { "junior": "國中生物：物質進出細胞的初步概念", "senior": "高中生物：細胞膜模型與被動、主動運輸", "next": "大學生物：膜電位、通道蛋白與訊息傳遞", "observe": "先確認濃度差與膜的可通透性，再改變環境張力，對照細胞形狀與體積變化。", "exam": "先判斷是被動還是主動運輸（要不要 ATP、順不順梯度），再考慮溶質與水的淨流向。" }, "metabolism": { "junior": "國中生物：光合作用與呼吸作用概要", "senior": "高中生物：酵素動力學、光反應與電子傳遞", "next": "大學生物：代謝途徑調控與生物能量學", "observe": "先分清光合與呼吸的淨反應式，再改變光照、溫度或受質，對照速率曲線。", "exam": "先確認反應場所與條件（需不需要光、有沒有氧），再追蹤 ATP、NADPH 與碳的流向。" }, "biomol": { "junior": "國中生物：食物中的養分與檢測初步", "senior": "高中生物：四類有機物的結構與檢測反應", "next": "大學生物：生物化學與儀器分析", "observe": "先認出單體與聚合物的結構差異，再改變樣品與試劑，對照顏色變化與成分推論。", "exam": "先想受質與試劑的反應機制（銅離子還原、碘嵌入螺旋），再由顏色深淺比較含量。" }, "plant": { "junior": "國中生物：植物的構造與水分運輸初步", "senior": "高中生物：蒸散、氣孔調節與植物激素", "next": "大學生物：植物生理與訊息傳導", "observe": "先確認運輸的方向與動力來源，再改變光照、濕度或生長素分布，對照氣孔與生長反應。", "exam": "先分清木質部（水、向上）與韌皮部（養分、雙向），再以蒸散拉力與膨壓解釋現象。" }, "animal-body": { "junior": "國中生物：消化、循環與呼吸概要", "senior": "高中生物：心臟構造、血壓與氣體交換", "next": "大學生物：人體生理學與心血管調控", "observe": "先畫出血流與氣流的路徑，再改變心率或呼吸深度，對照輸出量與氣體交換效率。", "exam": "先循著「體循環→右心→肺→左心→體循環」走一遍，再以壓力差與分壓差解釋流動與擴散。" }, "regulation": { "junior": "國中生物：神經與內分泌初步", "senior": "高中生物：神經衝動、突觸與荷爾蒙恆定", "next": "大學生物：神經生理學與內分泌學", "observe": "先分清電訊（神經）與化學訊（荷爾蒙）的傳遞方式，再改變刺激強度，對照反應與回饋。", "exam": "先確認受器、中樞與動作器構成的路徑，再以負回饋判斷荷爾蒙升降方向。" }, "genetics": { "junior": "國中生物：遺傳性狀與生殖初步", "senior": "高中生物：孟德爾定律、機率與性聯遺傳", "next": "大學生物：族群遺傳學與數量性狀", "observe": "先寫出親代基因型，再改變配子組合，對照棋盤方格與表現型比率。", "exam": "先把表現型翻成基因型（顯性個體要測交確認），再用機率乘法處理多對基因。" }, "molecular": { "junior": "國中生物：DNA 是遺傳物質的初步認識", "senior": "高中選修生物：複製、轉錄轉譯與基因工程", "next": "大學生物：分子生物學與基因體學", "observe": "先確認訊息流向（DNA→RNA→蛋白質），再改變序列或突變，對照產物與性狀變化。", "exam": "先寫出互補序列（A-T/U、G-C 配對），再分段檢查轉錄、轉譯的讀框與終止密碼。" }, "evolution": { "junior": "國中生物：化石與演化初步", "senior": "高中生物：天擇、哈溫平衡與親緣關係", "next": "大學生物：族群遺傳與演化生物學", "observe": "先確認變異是否存在且可遺傳，再改變環境壓力，對照基因頻率的世代變化。", "exam": "先判斷演化作用力（天擇、漂變、遷移、突變），再以哈溫平衡當比較基準。" }, "ecology": { "junior": "國中生物：食物鏈與生態系初步", "senior": "高中生物：族群成長、種間互動與物質循環", "next": "大學生物：生態系統生態學與保育生物學", "observe": "先確認族群或營養級的邊界，再改變資源或天敵，對照成長曲線與群集結構。", "exam": "先分清個體、族群、群集與生態系的層次，再以能量遞減與物質循環解釋分布。" }, "applied": { "junior": "國中生物：微生物與疾病初步", "senior": "高中選修生物：免疫、疫苗與生物技術應用", "next": "大學生物：免疫學、微生物學與生物倫理", "observe": "先分清專一性與非專一性防線，再改變病原或用藥壓力，對照防禦反應與抗藥性演化。", "exam": "先確認作用對象（細菌還是病毒、哪一道防線），再以天擇與群體免疫推論長期結果。" }
};
  // 離開模組時用三題收束概念；題目刻意著重判斷與模型，不要求背誦公式。
  const MODULE_CHECKPOINTS = { "cell": [ { "prompt": "複式顯微鏡的總放大率等於？", "choices": [ "目鏡倍率 × 物鏡倍率", "目鏡倍率 + 物鏡倍率", "物鏡倍率 ÷ 目鏡倍率", "鏡筒長度 × 物鏡倍率" ], "correct": 0, "explanation": "複式顯微鏡由目鏡與物鏡兩次放大串聯，總放大率是兩者相乘，例如 10× 目鏡配 40× 物鏡為 400 倍。" }, { "prompt": "細胞學說的核心主張是？", "choices": [ "所有生物由細胞構成，細胞是生命的基本單位", "細胞只在動物體內存在", "細胞可以自無生命物質自發產生", "植物細胞沒有細胞核" ], "correct": 0, "explanation": "細胞學說主張所有生物皆由細胞構成、細胞為生命基本單位，且細胞來自既有細胞的分裂。" }, { "prompt": "細胞越大，表面積對體積比會？", "choices": [ "變小，物質交換效率下降", "變大，交換更有效率", "不變", "先大後小再變大" ], "correct": 0, "explanation": "體積隨邊長三次方成長、表面積只有二次方，比值隨細胞變大而下降，交換效率因此受限。" } ], "membrane": [ { "prompt": "擴散作用的淨方向是？", "choices": [ "由高濃度往低濃度", "由低濃度往高濃度", "一定需要 ATP", "只發生在植物細胞" ], "correct": 0, "explanation": "擴散順著濃度梯度由高往低，靠分子熱運動即可進行，不消耗細胞能量。" }, { "prompt": "把紅血球放入蒸餾水（低張溶液）中，會發生？", "choices": [ "吸水膨脹甚至溶血", "失水皺縮", "形狀不變", "主動排出水分" ], "correct": 0, "explanation": "低張環境下膜外水勢高，水淨流入細胞；紅血球沒有細胞壁，過度吸水會脹破溶血。" }, { "prompt": "主動運輸與擴散最大的差別在於主動運輸？", "choices": [ "逆濃度梯度且需要 ATP", "不需要膜蛋白", "只運送水分子", "順濃度梯度進行" ], "correct": 0, "explanation": "主動運輸由載運蛋白逆濃度梯度搬運物質，直接或間接消耗 ATP，例如鈉鉀幫浦。" } ], "metabolism": [ { "prompt": "光合作用釋放的氧氣直接來自？", "choices": [ "水的裂解", "二氧化碳的分解", "葡萄糖的氧化", "土壤中的氧" ], "correct": 0, "explanation": "光反應中光系統 II 把水裂解，氧是水分子被拆開後的副產物，不是來自二氧化碳。" }, { "prompt": "細胞呼吸的電子傳遞鏈發生在？", "choices": [ "粒線體內膜", "細胞質基質", "葉綠體基質", "核糖體" ], "correct": 0, "explanation": "糖解在細胞質，檸檬酸循環與電子傳遞鏈在粒線體；鏈位於內膜，靠質子梯度合成 ATP。" }, { "prompt": "酵素在高於最適溫度很多時活性下降，主因是？", "choices": [ "蛋白質變性破壞活性區形狀", "受質被分解完畢", "pH 一定會跟著升高", "酵素被代謝消耗" ], "correct": 0, "explanation": "高溫破壞蛋白質的三級結構，活性區形狀改變使受質無法結合；此變性通常不可逆。" } ], "biomol": [ { "prompt": "碘液滴在馬鈴薯切面上呈藍紫色，代表含有？", "choices": [ "澱粉", "葡萄糖", "蛋白質", "油脂" ], "correct": 0, "explanation": "碘分子鑽入澱粉的螺旋結構而呈藍紫色；對單醣與雙醣、蛋白質與油脂都不變色。" }, { "prompt": "本氏液與還原醣隔水加熱後，顏色變化為？", "choices": [ "藍色轉為綠、黃、橙到磚紅", "藍色變深藍", "無色變藍", "紅色褪成無色" ], "correct": 0, "explanation": "還原醣把硫酸銅的 Cu²⁺ 還原成磚紅色的氧化亞銅，顏色由藍漸變到磚紅，越紅含量越多。" }, { "prompt": "雙縮脲試劑檢測蛋白質的原理是與什麼反應？", "choices": [ "胜肽鍵在鹼性下與銅離子呈紫紅色", "與脂肪染成橙紅", "與澱粉呈藍紫", "與核酸呈紅棕" ], "correct": 0, "explanation": "鹼性環境中 Cu²⁺ 與胜肽鍵形成紫紅色錯合物，胜肽鍵越多顏色越深。" } ], "plant": [ { "prompt": "水分在植物體內向上運輸的主要動力是？", "choices": [ "葉片蒸散產生的拉力", "根部主動把水打上去", "韌皮部的壓力流", "重力" ], "correct": 0, "explanation": "葉肉細胞蒸散失水產生負壓，配合水分子內聚力的水柱張力，把水由根拉到葉。" }, { "prompt": "保衛細胞吸水膨脹時，氣孔會？", "choices": [ "張開", "關閉", "不變", "脫落" ], "correct": 0, "explanation": "保衛細胞吸水後膨壓增加、外壁伸長較多而內彎，使兩細胞間的孔道張開，氣體與水汽得以進出。" }, { "prompt": "光合作用產物由葉運送到根，走的構造是？", "choices": [ "韌皮部的篩管", "木質部的導管", "氣孔", "根毛" ], "correct": 0, "explanation": "韌皮部把光合產物由源（葉）送到庫（根、果實），方向雙向；木質部只送水與無機鹽且向上。" } ], "animal-body": [ { "prompt": "血液由右心室送出後，下一站是？", "choices": [ "肺（肺動脈）", "全身（主動脈）", "左心房", "肝臟" ], "correct": 0, "explanation": "右心室把缺氧血經肺動脈送入肺循環，在肺泡完成氣體交換後，經肺靜脈回到左心房。" }, { "prompt": "微血管最適合物質交換的構造特徵是？", "choices": [ "管壁僅一層內皮細胞", "管壁厚且有彈性", "有瓣膜", "管徑最大" ], "correct": 0, "explanation": "微血管壁只有一層扁平內皮細胞，通透性高、流速慢，是養分、氣體與廢物交換的場所。" }, { "prompt": "平靜吸氣時，橫膈與胸腔的變化是？", "choices": [ "橫膈下降、胸腔擴大、肺內壓降低", "橫膈上升、胸腔縮小", "橫膈不動", "肺內壓高於大氣壓" ], "correct": 0, "explanation": "橫膈收縮下降使胸腔擴大，肺內壓低於大氣壓，空氣被吸入；平靜呼氣則是被動回彈。" } ], "regulation": [ { "prompt": "神經動作電位的去極化主要靠？", "choices": [ "Na⁺ 大量內流", "K⁺ 大量外流", "Cl⁻ 內流", "鈉鉀幫浦" ], "correct": 0, "explanation": "達閾值後電壓閘門 Na⁺ 通道打開，Na⁺ 順梯度湧入使膜內變正；再極化才是 K⁺ 外流。" }, { "prompt": "膝跳反射的反射中樞位於？", "choices": [ "脊髓", "大腦皮質", "小腦", "腦幹" ], "correct": 0, "explanation": "膝跳反射是單突觸脊髓反射，訊號不必上傳大腦即可完成，因此反應極快。" }, { "prompt": "血糖過低時，身體會分泌什麼來升高血糖？", "choices": [ "升糖素", "胰島素", "甲狀腺素", "抗利尿激素" ], "correct": 0, "explanation": "胰島 α 細胞分泌升糖素促進肝醣分解；胰島素則在血糖高時促進細胞攝取與儲存。" } ], "genetics": [ { "prompt": "減數分裂產生的配子，染色體數目是？", "choices": [ "減半（n）", "不變（2n）", "加倍（4n）", "隨機" ], "correct": 0, "explanation": "減數分裂連續兩次分裂把 2n 減成 n；受精後才恢復 2n，維持世代間數目恆定。" }, { "prompt": "異型合子 Aa 自交，後代表現型比率為？", "choices": [ "顯性：隱性 = 3:1", "1:1", "9:3:3:1", "全顯性" ], "correct": 0, "explanation": "Aa × Aa 基因型 1AA:2Aa:1aa；AA 與 Aa 都表現顯性，合計 3:1。" }, { "prompt": "紅綠色盲是 X 染色體連鎖隱性遺傳，患者通常？", "choices": [ "男性多於女性", "女性多於男性", "男女相等", "只出現在女性" ], "correct": 0, "explanation": "男性只有一條 X，帶一個隱性基因即表現；女性需兩條 X 同時帶因才會表現。" } ], "molecular": [ { "prompt": "DNA 中與腺嘌呤（A）配對的是？", "choices": [ "胸腺嘧啶（T）", "鳥糞嘌呤（G）", "胞嘧啶（C）", "尿嘧啶（U）" ], "correct": 0, "explanation": "DNA 以 A–T（兩個氫鍵）、G–C（三個氫鍵）互補配對；U 只出現在 RNA。" }, { "prompt": "「半保留複製」指的是？", "choices": [ "每個子代 DNA 含一條舊股與一條新股", "只複製一半的 DNA", "子代完全沒有舊股", "兩股都是新股" ], "correct": 0, "explanation": "複製時雙股解開各當模板，子代分子一舊一新，確保遺傳訊息準確傳遞。" }, { "prompt": "一個遺傳密碼子由幾個鹼基組成？", "choices": [ "3", "1", "2", "4" ], "correct": 0, "explanation": "三個鹼基對應一個胺基酸，4³ = 64 種組合足以編碼 20 種胺基酸與終止訊號。" } ], "evolution": [ { "prompt": "天擇能作用的變異必須是？", "choices": [ "可遺傳的變異", "後天獲得的體細胞改變", "個體自己想改的性狀", "只發生在成年後的變化" ], "correct": 0, "explanation": "天擇作用在表現型，但只有遺傳變異能傳給下一代並在族群中累積。" }, { "prompt": "哈溫平衡中異型合子的頻率是？", "choices": [ "2pq", "p²", "q²", "p + q" ], "correct": 0, "explanation": "p² 為同型顯性、2pq 為異型、q² 為同型隱性；三者和為 1。" }, { "prompt": "人臂、鯨鰭、蝙蝠翼骨骼結構相似，屬於？", "choices": [ "同源構造", "同功構造", "殘跡構造", "胚後變異" ], "correct": 0, "explanation": "結構相似而功能不同，來自共同祖先的同源構造；同功則是功能相似、結構不同。" } ], "ecology": [ { "prompt": "能量沿食物鏈每升一級，約有多少傳到下一級？", "choices": [ "約 10%", "約 50%", "100%", "約 90%" ], "correct": 0, "explanation": "大部分能量在呼吸、排泄與未被捕食中散失，傳遞效率約 10%，因此營養級通常不超過 4–5 級。" }, { "prompt": "族群呈 S 型成長時，數量穩定的上限稱為？", "choices": [ "環境負載力 K", "成長速率 r", "出生率", "族群密度" ], "correct": 0, "explanation": "資源有限時，密度升高使阻力增強，族群最終在環境負載力 K 附近波動。" }, { "prompt": "碳在生物與環境間循環，把 CO₂ 固定成有機物的關鍵過程是？", "choices": [ "光合作用", "呼吸作用", "燃燒", "分解" ], "correct": 0, "explanation": "光合作用把大氣 CO₂ 轉成有機碳進入食物網；呼吸、分解與燃燒則把碳釋回大氣。" } ], "applied": [ { "prompt": "抗生素對下列哪一類病原無效？", "choices": [ "病毒", "細菌", "部分真菌", "披衣菌" ], "correct": 0, "explanation": "抗生素針對細菌的細胞壁、核糖體等結構作用；病毒沒有這些構造且寄生活細胞，故無效。" }, { "prompt": "疫苗建立保護力的原理是？", "choices": [ "讓免疫系統先記住抗原，產生記憶細胞", "直接殺死所有病原", "取代白血球", "增加血漿量" ], "correct": 0, "explanation": "疫苗提供無害的抗原，訓練 B 與 T 細胞形成記憶；真正感染時免疫反應更快更強。" }, { "prompt": "腎元形成尿液的三個步驟是？", "choices": [ "過濾、再吸收、分泌", "消化、吸收、排出", "過濾、燃燒、排出", "蒸發、凝結、沉澱" ], "correct": 0, "explanation": "腎小球過濾血漿、腎小管回收有用物質、再分泌多餘離子，最後形成尿液。" } ]
};

  function auditCurriculum() {
    const ids = FLAT.map(f => f.exp.id);
    const duplicateIds = [...new Set(ids.filter((id, index) => ids.indexOf(id) !== index))];
    /*
     * 實驗程式改成延遲載入後，啟動當下註冊表是空的，不能再用它稽核。
     * 改成比對「對應表」——它由建置腳本實際執行每個實驗檔產生，
     * 能確保每個課程項目都真的有程式可以載入。
     */
    const mapped = Object.keys(EXPERIMENT_FILES);
    const available = new Set(mapped.concat(PL.ids ? PL.ids() : []));
    const expected = new Set(ids);
    const missingSimulations = ids.filter(id => !available.has(id));
    const extraSimulations = mapped.filter(id => !expected.has(id));
    const registeredIds = mapped;
    const audit = {
      modules: C.totalModules,
      experiments: ids.length,
      registeredSimulations: registeredIds.length,
      duplicateIds,
      missingSimulations,
      extraSimulations
    };
    window.PhysicsLabAudit = audit;
    if (duplicateIds.length || missingSimulations.length || extraSimulations.length) {
      console.error("生物實驗室課程稽核失敗", audit);
    }
    return audit;
  }

  function auditCheckpointBank() {
    const moduleIds = C.modules.map(module => module.id);
    const missingModules = moduleIds.filter(id => !Array.isArray(MODULE_CHECKPOINTS[id]) || MODULE_CHECKPOINTS[id].length !== 3);
    const invalidQuestions = moduleIds.flatMap(id => (MODULE_CHECKPOINTS[id] || []).filter(question =>
      !question.prompt || !Array.isArray(question.choices) || question.choices.length !== 4 || question.correct < 0 || question.correct >= question.choices.length || !question.explanation
    ).map(question => ({ moduleId: id, prompt: question.prompt || "" })));
    const audit = {
      modules: moduleIds.length,
      questions: moduleIds.reduce((total, id) => total + (MODULE_CHECKPOINTS[id] || []).length, 0),
      missingModules,
      invalidQuestions
    };
    window.PhysicsLabCheckpointAudit = audit;
    if (missingModules.length || invalidQuestions.length) console.error("章節檢核題庫稽核失敗", audit);
    return audit;
  }

  const store = {
    get(k, d) { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  };
  const STUDY_PLAN_KEY = "pl-study-plan";

  let viewed = new Set(store.get("pl-progress", []));
  let currentSim = null;
  let currentId = null;
  let checkpointState = null;
  let openToken = 0;      // 延遲載入時用來辨識「這次開啟是否仍然有效」
  let pendingChapterTarget = null;
  let initialized = false;

  function todayKey(date) {
    const d = date ? new Date(date) : new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return y + "-" + m + "-" + day;
  }

  function dayDiff(start, end) {
    const a = new Date(start + "T00:00:00");
    const b = new Date((end || todayKey()) + "T00:00:00");
    return Math.floor((b - a) / 86400000);
  }
  /* 站台設定（js/site-config.js） */
  const SITE = window.PhysicsLabSite || {};

  /* ---------------------------------------------------------------------
     實驗程式的延遲載入

     原本 16 個實驗檔（共 485 KB）在首頁就全部同步載入，但學生一次只會打開
     一個實驗，其餘 244 個的程式碼完全用不到。在中階手機上，這些解析與執行
     全部發生在畫面出現之前，是直接感受得到的卡頓。

     改成開啟實驗時才載入對應的檔案。對應表由 tools/build-manifest.js 產生，
     它是「真的把每個檔案跑一次」得到的，不受註冊寫法影響。
     --------------------------------------------------------------------- */
  const EXPERIMENT_FILES = window.PhysicsLabExperimentFiles || {};
  const loadedFiles = new Map();

  function loadScript(src) {
    if (loadedFiles.has(src)) return loadedFiles.get(src);
    const promise = new Promise((resolve, reject) => {
      const tag = document.createElement("script");
      tag.src = src;
      tag.async = false;              // 保持執行順序，避免相依性問題
      tag.onload = () => resolve(src);
      tag.onerror = () => reject(new Error("載入失敗：" + src));
      document.head.appendChild(tag);
    });
    loadedFiles.set(src, promise);
    return promise;
  }

  /* 確保某個實驗的程式碼已經就緒 */
    /*
   * 器材繪製層（sim-apparatus.js）跟實驗程式一樣是延遲載入的。
   *
   * 理由和實驗檔完全相同：首頁不跑任何模擬，卻要學生先把整個器材庫下載完，
   * 等於把省下來的流量又花掉。它只在第一個實驗真正要開啟前才載入，
   * 之後留在 PL.apparatus 上供所有實驗共用。
   */
  let apparatusPromise = null;
  function ensureApparatus() {
    if (PL.apparatus) return Promise.resolve(true);
    if (!apparatusPromise) {
      const build = (window.PhysicsLabSite && window.PhysicsLabSite.build) || "";
      /*
       * 觀察點引擎（sim-observe.js）也跟著器材層一起載：它只在實驗建置時才有事做，
       * 而且一定要在第一個實驗建置「之前」掛上鉤子——器材層剛好也是建置前必等的那一步。
       */
      const v = build ? "?v=" + build : "";
      /*
       * 量測工具、洞察、教師提示、無障礙這四支也只在實驗建置時掛鉤子（PL._hooks），首頁用不到，
       * 一起改成延遲載入：首次載入少約 42 KB gzip。順序維持原本 index.html 的順序（鉤子依註冊順序執行）。
       */
      const addons = ["sim-tools", "sim-insight", "sim-a11y", "bio-kit"].map(f => loadScript("js/" + f + ".js" + v).catch(err => { console.warn(err); }));
      apparatusPromise = Promise.all(addons.concat([loadScript("js/sim-apparatus.js" + v), loadScript("js/sim-observe.js" + v).catch(err => { console.warn(err); })]))
        .then(() => true)
        .catch(err => { console.error(err); apparatusPromise = null; return false; });
    }
    return apparatusPromise;
  }

  /*
   * 題庫（question-bank.js）也走延遲載入。
   *
   * 它只有「題目練習」這一區用得到，但卻是核心腳本裡最重的一份之一；
   * 留在首屏等於讓每個只看模擬的學生都先付這筆流量。改成第一次要渲染
   * 題目時才載（SW 仍會預先快取，第二次起等同本地）。
   */
  let questionBankPromise = null;
  function ensureQuestionBank() {
    if (window.PhysicsLabQuestionBank) return Promise.resolve(true);
    if (!questionBankPromise) {
      const build = (window.PhysicsLabSite && window.PhysicsLabSite.build) || "";
      questionBankPromise = loadScript("js/question-bank.js" + (build ? "?v=" + build : ""))
        .then(() => true)
        .catch(err => { console.error(err); questionBankPromise = null; return false; });
    }
    return questionBankPromise;
  }

  function ensureExperiment(id) {
    if (PL.has(id)) return ensureApparatus().then(() => true);
    const file = EXPERIMENT_FILES[id];
    if (!file) return Promise.resolve(false);
    const build = (window.PhysicsLabSite && window.PhysicsLabSite.build) || "";
    return ensureApparatus()
      .then(() => loadScript("js/experiments/" + file + (build ? "?v=" + build : "")))
      .then(() => PL.has(id))
      .catch(err => { console.error(err); return false; });
  }

  /*
   * 預先載入相鄰實驗
   * 使用者按「下一個實驗」的機率很高，在瀏覽器閒置時先把相鄰的檔案抓下來，
   * 切換時就不會有等待。用 requestIdleCallback 確保不跟當前的操作搶資源。
   */
  function prefetchNeighbours(order) {
    // 使用者開了省流量模式，或處於 2G／慢速連線時，不要偷偷多抓檔案
    const net = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    if (net && (net.saveData || /2g/.test(net.effectiveType || ""))) return;
    const idle = window.requestIdleCallback || (fn => setTimeout(fn, 1200));
    idle(() => {
      [order - 1, order + 1].forEach(i => {
        const item = FLAT[i];
        if (!item || PL.has(item.exp.id)) return;
        const file = EXPERIMENT_FILES[item.exp.id];
        // 一定要帶版本號：js/ 是一年 immutable 快取，不帶版本的網址部署後會拿到舊程式，
        // 而且和 ensureExperiment() 的網址不同，兩邊都載就會把同一支檔案執行兩次。
        const build = (window.PhysicsLabSite && window.PhysicsLabSite.build) || "";
        if (file) loadScript("js/experiments/" + file + (build ? "?v=" + build : "")).catch(() => {});
      });
    });
  }

  /* ------------------------------- 主題 ------------------------------- */
  // 第一次造訪預設亮色：實驗室場景是為明亮的實驗檯設計的，深色改成手動選項。
  function preferredTheme() {
    const saved = store.get("pl-theme", null);
    if (saved === "light" || saved === "dark") return saved;
    return "light";
  }

  /*
   * 收合／展開左側課程目錄。
   *
   * canvas 的像素尺寸是用容器寬度算出來的，而引擎在畫布容器上掛了 ResizeObserver，
   * 所以收合造成的寬度變化正常情況下會自己被接住。
   * 這裡仍補一次重繪當作保險：如果哪天漏掉，症狀會是畫布維持收合前的寬度、
   * 右邊留一條空白——而那看起來很像「這個實驗本來就畫不滿」，
   * 不會有人想到是尺寸沒更新。這種靜默的失敗值得多花一次重繪。
   *
   * 用 requestAnimationFrame 等一格，是要先讓瀏覽器完成重新排版，
   * 這時量到的容器寬度才是收合後的值。
   */
  function applySidebarCollapsed(collapsed) {
    const app = document.querySelector(".app");
    if (!app) return;
    if (collapsed) app.setAttribute("data-sidebar", "collapsed");
    else app.removeAttribute("data-sidebar");
    store.set("pl-sidebar-collapsed", !!collapsed);

    const btn = $("#sidebar-toggle");
    if (btn) {
      // 箭頭方向由 CSS 依 data-sidebar 反轉，這裡只更新無障礙標籤。
      btn.setAttribute("aria-expanded", String(!collapsed));
      btn.setAttribute("aria-label", collapsed ? "展開課程目錄" : "收合課程目錄");
      btn.title = collapsed ? "展開課程目錄" : "收合課程目錄，放大實驗台";
    }
    requestAnimationFrame(() => {
      if (currentSim && currentSim.rerender) {
        try { currentSim.rerender(); } catch (e) { console.warn("收合側欄後重繪失敗", e); }
      }
    });
  }

  function applyTheme(t) {
    const theme = t === "light" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", theme);
    store.set("pl-theme", theme);
    const stageTheme = $("#stage-theme");
    if (stageTheme) {
      stageTheme.innerHTML = (theme === "light" ? moonIcon : sunIcon) + "<span>" + (theme === "light" ? "深色" : "淺色") + "</span>";
      stageTheme.setAttribute("aria-label", theme === "light" ? "切換為深色主題" : "切換為淺色主題");
    }
    const btn = $("#theme-toggle");
    if (btn) {
      btn.innerHTML = theme === "light" ? moonIcon + "<span>深色</span>" : sunIcon + "<span>淺色</span>";
      btn.setAttribute("aria-pressed", String(theme === "light"));
      btn.title = theme === "light" ? "切換為深色主題" : "切換為淺色主題";
    }
    // 行動裝置的網址列顏色也要跟著換，否則淺色頁面上方會頂著一條深色。
    document.querySelectorAll('meta[name="theme-color"]').forEach(meta => meta.remove());
    const meta = document.createElement("meta");
    meta.name = "theme-color";
    meta.content = theme === "light" ? "#eef2f8" : "#13171c";
    document.head.appendChild(meta);
    // 主題切換後重繪目前模擬
    if (currentSim && currentSim.rerender) {
      try { currentSim.rerender(); } catch (e) { console.warn("主題切換重繪失敗", e); }
    }
  }
  const sunIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>';
  const moonIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8z"/></svg>';

  /* ------------------------------- 側邊目錄 ------------------------------- */
  function buildSidebar() {
    const wrap = $("#module-list");
    wrap.innerHTML = "";
    C.modules.forEach((m, moduleIndex) => {
      const mod = el("div", "module", wrap);
      mod.style.setProperty("--m-color", m.color);
      mod.dataset.mod = m.id;
      const head = el("div", "module-head", mod);
      const no = el("div", "module-no", head); no.textContent = String(moduleIndex + 1).padStart(2, "0");
      const t = el("div", "module-title", head); t.innerHTML = m.title + '<span class="track">' + m.track + "</span>";
      const car = el("div", "module-caret", head); car.textContent = "▶";
      head.addEventListener("click", () => mod.classList.toggle("open"));

      const list = el("div", "exp-list", mod);
      m.experiments.forEach((e, i) => {
        const item = el("div", "exp-item", list);
        item.dataset.id = e.id;
        const idx = el("div", "idx", item); idx.textContent = i + 1;
        const name = el("div", "exp-name", item); name.textContent = e.title;
        if (e.interactive) { const tag = el("span", "tag-int", item); tag.textContent = "互動"; }
        const chk = el("span", "check", item); chk.textContent = "✓";
        item.addEventListener("click", () => location.hash = "#" + e.id);
      });
    });
    refreshViewedMarks();
  }

  /* ------------------------------- 首頁 ------------------------------- */
  function getPathContext(id) {
    for (const path of LEARNING_PATHS) {
      const sequence = [];
      path.stages.forEach((stage, stageIndex) => {
        stage.ids.forEach((expId, indexInStage) => {
          sequence.push({ id: expId, stage, stageIndex, indexInStage });
        });
      });
      const index = sequence.findIndex(step => step.id === id);
      if (index !== -1) return { path, sequence, index, current: sequence[index] };
    }
    return null;
  }

  function makePathLab(parent, id) {
    const target = byId[id];
    if (!target) return;
    const button = el("button", "path-lab", parent);
    button.type = "button";
    button.textContent = target.exp.title;
    button.setAttribute("aria-label", "開啟實驗：" + target.exp.title);
    button.addEventListener("click", () => location.hash = "#" + target.exp.id);
  }

  function renderLearningLadder() {
    const ladder = $("#learning-ladder");
    const tabs = $("#path-tabs");
    const timeline = $("#path-timeline");
    if (!ladder || !tabs || !timeline) return;
    if (!LEARNING_PATHS.length) { ladder.hidden = true; return; }

    const active = LEARNING_PATHS.find(path => path.id === activeLearningPath) || LEARNING_PATHS[0];
    activeLearningPath = active.id;
    ladder.hidden = false;
    tabs.innerHTML = "";
    timeline.innerHTML = "";

    LEARNING_PATHS.forEach(path => {
      const tab = el("button", "path-tab", tabs);
      tab.type = "button";
      tab.textContent = path.title;
      tab.setAttribute("role", "tab");
      tab.setAttribute("aria-selected", String(path.id === active.id));
      tab.classList.toggle("active", path.id === active.id);
      tab.addEventListener("click", () => {
        activeLearningPath = path.id;
        renderLearningLadder();
      });
    });

    active.stages.forEach((stage, index) => {
      const stageEl = el("article", "path-stage path-" + stage.kind, timeline);
      const stageTop = el("div", "path-stage-top", stageEl);
      const number = el("span", "path-stage-number", stageTop); number.textContent = String(index + 1).padStart(2, "0");
      const level = el("span", "path-stage-level", stageTop); level.textContent = stage.level;
      const note = el("p", "path-stage-note", stageEl); note.textContent = stage.note;
      const labs = el("div", "path-labs", stageEl);
      stage.ids.forEach(id => makePathLab(labs, id));
    });
  }

  function makeExperimentPathStep(parent, label, target, current) {
    const step = el(current ? "div" : "button", "exp-path-step" + (current ? " current" : ""), parent);
    if (!current) step.type = "button";
    const labelEl = el("span", "exp-path-label", step); labelEl.textContent = label;
    const titleEl = el("strong", "exp-path-title", step); titleEl.textContent = target.exp.title;
    if (!current) {
      step.setAttribute("aria-label", "前往" + label + "：" + target.exp.title);
      step.addEventListener("click", () => location.hash = "#" + target.exp.id);
    }
  }

  function renderExperimentLearningPath(id) {
    const root = $("#exp-learning-path");
    if (!root) return;
    const context = getPathContext(id);
    root.innerHTML = "";
    root.hidden = !context;
    if (!context) return;

    const heading = el("div", "exp-path-heading", root);
    const eyebrow = el("span", "exp-path-eyebrow", heading); eyebrow.textContent = "銜接路徑 · " + context.path.title;
    const summary = el("span", "exp-path-summary", heading);
    summary.textContent = context.current.stage.level + " · 第 " + (context.current.indexInStage + 1) + " 步";

    const steps = el("div", "exp-path-steps", root);
    const previous = context.sequence[context.index - 1];
    const next = context.sequence[context.index + 1];
    if (previous && byId[previous.id]) makeExperimentPathStep(steps, "前一步", byId[previous.id], false);
    makeExperimentPathStep(steps, "目前", byId[id], true);
    if (next && byId[next.id]) makeExperimentPathStep(steps, "下一步", byId[next.id], false);
  }

  function renderLearningOutput(f) {
    const root = $("#learning-output");
    if (!root) return;
    const { exp, mod } = f;
    const bridge = TEXTBOOK_BRIDGES[mod.id] || {
      junior: "國中自然：以生活現象建立直覺", senior: "高中生物：以模型、量測與數據建立關係", next: "大學入門：以更一般的模型與數據分析延伸", observe: "每次只改變一個條件，對照讀數、圖像與現象。", exam: "先把題目的情境翻成模型或量測關係，再選擇合適的分析方式。"
    };
    root.innerHTML = "";

    const heading = el("div", "learning-output-heading", root);
    const eyebrow = el("span", "learning-output-eyebrow", heading); eyebrow.textContent = "學習閉環 · 本次實驗";
    const title = el("h3", "learning-output-title", heading); title.textContent = "玩完後，你要能帶走什麼？";
    const intro = el("p", "learning-output-intro", heading); intro.textContent = "不是只看到現象，而是把操作、課本概念與解題方法連成一條線。";

    /*
     * 學習閉環只留「其他地方沒有」的內容（2026-10 整理）：
     * 原本的「01 操作時先看」和實驗台上方的任務導讀重複；
     * 「03 玩完能帶走」直接取 exp.points 前三條，和右欄的「學習重點」一字不差。
     * 留下課本銜接、解題轉換與一句話結論。
     */
    const grid = el("div", "learning-output-grid", root);
    const textbook = el("article", "learning-output-step textbook", grid);
    const textbookNo = el("span", "learning-output-no", textbook); textbookNo.textContent = "課本接在哪裡";
    const textbookList = el("dl", "textbook-bridge", textbook);
    [["國中打底", bridge.junior], ["高中課本", bridge.senior], ["大學延伸", bridge.next]].forEach(([label, text]) => {
      const row = el("div", "textbook-bridge-row", textbookList);
      const term = el("dt", null, row); term.textContent = label;
      const desc = el("dd", null, row); desc.textContent = text;
    });

    const transfer = el("div", "learning-transfer", root);
    const transferLabel = el("span", "learning-transfer-label", transfer); transferLabel.textContent = "解題轉換";
    const transferCopy = el("p", "learning-transfer-copy", transfer); transferCopy.textContent = bridge.exam;

    const reflection = el("div", "learning-reflection", root);
    const reflectionHead = el("div", "learning-reflection-head", reflection);
    const label = el("label", "learning-reflection-label", reflectionHead); label.htmlFor = "learning-reflection-input"; label.textContent = "一句話結論";
    const prompt = el("p", "learning-reflection-prompt", reflectionHead);
    prompt.textContent = "改變一個參數後，請用「" + (exp.points[0] || exp.title) + "」解釋讀數或圖形為什麼改變。";
    const input = el("textarea", "learning-reflection-input", reflection); input.id = "learning-reflection-input"; input.maxLength = 240;
    input.placeholder = "寫下你的觀察與原因…";
    input.value = store.get("pl-reflection-" + exp.id, "");
    const actions = el("div", "learning-reflection-actions", reflection);
    const saved = el("span", "learning-reflection-saved", actions); saved.textContent = input.value ? "已儲存於這台裝置" : "";
    const save = el("button", "learning-reflection-save", actions); save.type = "button"; save.textContent = "儲存結論";
    save.addEventListener("click", () => {
      store.set("pl-reflection-" + exp.id, input.value.trim());
      saved.textContent = input.value.trim() ? "已儲存於這台裝置" : "已清除這則結論";
    });
  }

  function buildHome() {
    const heroExperimentCount = $("#hero-exp-count");
    if (heroExperimentCount) heroExperimentCount.textContent = C.totalExperiments;
    const grid = $("#module-grid");
    grid.innerHTML = "";
    /*
     * 模組卡（2026-10 改版）：大號序號＋模組色細線＋個人進度條。
     * 卡片本身就是入口，所以給它按鈕語意與鍵盤操作——原本是純 div，Tab 走不到。
     */
    const arrowSvg = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>';
    C.modules.forEach((m, index) => {
      const card = el("div", "mcard", grid);
      card.style.setProperty("--m-color", m.color);
      card.dataset.mod = m.id;
      card.setAttribute("role", "link");
      card.setAttribute("tabindex", "0");
      card.setAttribute("aria-label", "模組 " + m.no + "：" + m.title + "，" + m.experiments.length + " 個實驗");
      const top = el("div", "mcard-top", card);
      const no = el("div", "mcard-no", top); no.textContent = String(index + 1).padStart(2, "0");
      const tr = el("div", "mcard-track", top); tr.textContent = m.track;
      const ti = el("div", "mcard-title", card); ti.textContent = m.title;
      const intro = el("div", "mcard-intro", card); intro.textContent = m.intro;
      const meta = el("div", "mcard-meta", card);
      meta.innerHTML = '<span class="mcard-count"><b>' + m.experiments.length + '</b> 個實驗</span>' +
        '<span class="mcard-progress" aria-hidden="true"><i></i></span>' +
        '<span class="mcard-done">0 / ' + m.experiments.length + '</span>' +
        '<span class="mcard-go">' + arrowSvg + '</span>';
      const open = () => {
        const first = m.experiments.find(exp => !viewed.has(exp.id)) || m.experiments[0];
        location.hash = "#" + first.id;
      };
      card.addEventListener("click", open);
      card.addEventListener("keydown", e => {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); open(); }
      });
    });
    refreshHomeProgress();
    renderLearningLadder();
    // 統計數字
    $("#stat-mod").textContent = C.totalModules;
    $("#stat-exp").textContent = C.totalExperiments;
    $("#stat-int").textContent = C.totalInteractive;
    $("#side-exp").textContent = C.totalExperiments;
    $("#side-int").textContent = C.totalInteractive;
  }

  /* ------------------------------- 實驗頁 ------------------------------- */
  const pendingTypeset = new Set();

  /*
   * MathJax 載不到時的退路
   *
   * 由來：MathJax 從 cdn.jsdelivr.net 載，而 Service Worker 對跨網域資源
   * 是「網路優先、失敗看快取」——但那份快取從來沒被寫入過，所以離線時必定失敗。
   * 失敗時 typeset() 只是把節點丟進 pendingTypeset 等一個永遠不會來的事件，
   * 畫面上就留著 \(T \propto \sqrt{L}\) 這種原始碼。首頁 hero 就有兩處，
   * 等於主打「離線可用」的 PWA 一離線就先讓學生看到壞掉的字串。
   *
   * 這裡把 tools/build-static.js 為靜態頁寫的同一套 LaTeX→純文字轉換
   * 縮成瀏覽器版：載不到就退成「T ∝ √L」，讀得懂，也不會看起來像壞掉。
   */
  const GREEK = {
    pi: "π", theta: "θ", lambda: "λ", mu: "μ", rho: "ρ", alpha: "α", beta: "β",
    gamma: "γ", Delta: "Δ", delta: "δ", omega: "ω", Omega: "Ω", sigma: "σ",
    varepsilon: "ε", epsilon: "ε", phi: "φ", tau: "τ", nu: "ν", eta: "η"
  };
  const SYM = {
    propto: "∝", times: "×", cdot: "·", pm: "±", approx: "≈", neq: "≠",
    leq: "≤", geq: "≥", ll: "≪", gg: "≫", to: "→", Rightarrow: "⇒",
    infty: "∞", quad: " ", qquad: "  ", left: "", right: "", displaystyle: "",
    mathrm: "", text: "", ldots: "…", cdots: "⋯"
  };
  const OPERATOR = new Set(["∝", "×", "·", "±", "≈", "≠", "≤", "≥", "≪", "≫", "→", "⇒"]);
  const SUP = { "0": "⁰", "1": "¹", "2": "²", "3": "³", "4": "⁴", "5": "⁵", "6": "⁶", "7": "⁷", "8": "⁸", "9": "⁹", "+": "⁺", "-": "⁻", n: "ⁿ", i: "ⁱ" };
  const SUB = { "0": "₀", "1": "₁", "2": "₂", "3": "₃", "4": "₄", "5": "₅", "6": "₆", "7": "₇", "8": "₈", "9": "₉", "+": "₊", "-": "₋" };
  const isAtomic = s => /^[A-Za-z0-9ℏℓπθλμρσταβγδεφωνηΔΩ]+$/.test(s);

  // 從 index（必須是 "{"）讀出成對的大括號內容；分子分母本身會含大括號，
  // 所以必須數深度，不能用正規表示式。
  function readGroup(src, index) {
    if (src[index] !== "{") return null;
    let depth = 0;
    for (let i = index; i < src.length; i++) {
      if (src[i] === "{") depth++;
      else if (src[i] === "}" && --depth === 0) return { body: src.slice(index + 1, i), end: i + 1 };
    }
    return null;
  }
  function fraction(a, b) {
    if (isAtomic(a) && isAtomic(b)) return a + "/" + b;
    return "(" + (isAtomic(a) ? a : "(" + a + ")") + "/" + (isAtomic(b) ? b : "(" + b + ")") + ")";
  }
  function mapScript(body, table) {
    let out = "";
    for (const ch of body) { if (!table[ch]) return null; out += table[ch]; }
    return out;
  }
  function plainFormula(latex) {
    const src = String(latex || "");
    let out = "", i = 0;
    while (i < src.length) {
      const ch = src[i];
      if (ch === "\\") {
        const m = /^[A-Za-z]+/.exec(src.slice(i + 1));
        if (!m) { i += 2; continue; }
        const name = m[0];
        let j = i + 1 + name.length;
        while (src[j] === " ") j++;
        if (name === "dfrac" || name === "frac" || name === "tfrac") {
          const a = readGroup(src, j); if (!a) { i = j; continue; }
          const b = readGroup(src, a.end); if (!b) { i = a.end; continue; }
          out += fraction(plainFormula(a.body), plainFormula(b.body)); i = b.end; continue;
        }
        if (name === "sqrt") {
          const a = readGroup(src, j);
          if (a) { out += "√" + (isAtomic(a.body) ? plainFormula(a.body) : "(" + plainFormula(a.body) + ")"); i = a.end; continue; }
        }
        if (name === "mathrm" || name === "text") {
          const a = readGroup(src, j);
          if (a) { out += a.body; i = a.end; continue; }
        }
        // 希臘字母是變數，\Delta P 要黏成 ΔP；運算子則要留空白，∝ √L 才讀得順
        if (GREEK[name]) { out += GREEK[name]; i = j; continue; }
        if (name in SYM) {
          const sym = SYM[name];
          if (sym && OPERATOR.has(sym)) out += (/\s$/.test(out) || !out ? "" : " ") + sym + " ";
          else out += sym;
          i = j; continue;
        }
        out += name; i = j; continue;
      }
      if (ch === "^" || ch === "_") {
        const table = ch === "^" ? SUP : SUB;
        const g = readGroup(src, i + 1);
        const body = g ? g.body : src[i + 1];
        const mapped = body == null ? null : mapScript(plainFormula(body), table);
        if (mapped != null) { out += mapped; i = g ? g.end : i + 2; continue; }
        out += ch + (g ? "(" + plainFormula(g.body) + ")" : body || "");
        i = g ? g.end : i + 2; continue;
      }
      if (ch === "{" || ch === "}" || ch === "$") { i++; continue; }
      out += ch; i++;
    }
    return out.replace(/\s{2,}/g, " ");
  }

  /* 把節點底下所有文字裡的 \( … \) 與 \[ … \] 換成可讀文字 */
  const MATH_RE = /\\\(([\s\S]*?)\\\)|\\\[([\s\S]*?)\\\]/g;
  function renderPlainMath(node) {
    if (!node || !node.nodeType) return;
    const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT, null);
    const hits = [];
    let t;
    while ((t = walker.nextNode())) if (t.nodeValue && t.nodeValue.indexOf("\\") >= 0) hits.push(t);
    hits.forEach(n => {
      n.nodeValue = n.nodeValue.replace(MATH_RE, (_, a, b) => plainFormula(a != null ? a : b));
    });
  }

  let mathFailed = false;
  function failMath() {
    if (mathFailed) return;
    if (window.MathJax && MathJax.typesetPromise) return;   // 只是還沒跑完，不是失敗
    mathFailed = true;
    pendingTypeset.clear();
    renderPlainMath(document.body);
  }
  window.addEventListener("mathjax-failed", failMath);
  // script 的 onerror 不是每種失敗都會觸發（例如被代理伺服器回一個空檔），
  // 因此另外壓一道時間上限。
  setTimeout(failMath, 5000);

  function typeset(node) {
    if (!node) return;
    if (window.MathJax && MathJax.typesetPromise) {
      MathJax.typesetPromise([node]).catch(() => {});
    } else if (mathFailed) {
      renderPlainMath(node);
    } else {
      pendingTypeset.add(node);
    }
  }

  window.addEventListener("mathjax-ready", () => {
    if (!window.MathJax || !MathJax.typesetPromise || !pendingTypeset.size) return;
    const nodes = [...pendingTypeset];
    pendingTypeset.clear();
    MathJax.typesetPromise(nodes).catch(() => {});
  });

  function compactText(text, fallback, limit) {
    const raw = String(text || fallback || "").replace(/<[^>]*>/g, "").replace(/\\[()[\]]/g, "").replace(/\s+/g, " ").trim();
    return raw.length > limit ? raw.slice(0, limit - 1) + "…" : raw;
  }

  function getPracticeDone() {
    return new Set(store.get("pl-practice-done", []));
  }

  function setPracticeDone(id, done) {
    const state = getPracticeDone();
    if (done) state.add(id); else state.delete(id);
    store.set("pl-practice-done", [...state]);
  }

  function getPracticeAnswers() {
    const state = store.get("pl-practice-answers", {});
    return state && typeof state === "object" && !Array.isArray(state) ? state : {};
  }

  function setPracticeAnswer(id, answer) {
    const state = getPracticeAnswers();
    state[id] = answer;
    store.set("pl-practice-answers", state);
  }

  function makeChoices(correctOption, distractors, seed) {
    const options = distractors.slice(0, 3);
    const correct = Math.abs(seed || 0) % (options.length + 1);
    options.splice(correct, 0, correctOption);
    return { options, correct };
  }

  /*
   * 誘答選項的來源
   * 樣板題原本的誘答是「只需背下名詞」這類明顯錯誤的敘述，用刪去法就能全對。
   * 改成從「同模組其他實驗的學習重點」取材：每個選項都是真的學科敘述，
   * 只是描述的不是這一個實驗，學生必須真的分辨概念才選得出來。
   */
  function neighbourDistractors(f, count, offset) {
    const siblings = f.mod.experiments.filter(e => e.id !== f.exp.id && Array.isArray(e.points) && e.points.length);
    /*
     * 自己實驗的學習重點一個都不能當誘答：有些主題（如光譜與能階躍遷）
     * 的兄弟實驗會出現相同敘述，若正解與某選項一模一樣，題目就有兩個
     * 正確答案。先把本實驗全部重點集合成 Set，取樣時跳過。
     */
    const own = new Set((f.exp.points || []).map(p => compactText(p, f.exp.title, 72)));
    const picked = [];
    const shift = offset || 0;
    // 以 order 當起點等距取樣，讓同一個實驗每次進來的誘答固定，方便師生討論。
    for (let i = 0; i < siblings.length && picked.length < count; i += 1) {
      const item = siblings[(f.order * 3 + shift + i * 5) % siblings.length];
      const text = compactText(item.points[(f.order + shift + i) % item.points.length], item.title, 72);
      if (text && !picked.includes(text) && !own.has(text)) picked.push(text);
    }
    while (picked.length < count) picked.push("這個現象與實驗中量測的量沒有直接關係。");
    return picked;
  }

  /*
   * 手寫題的選項洗牌。題庫裡正解固定寫在第 0 位（撰寫方便），渲染前若不洗牌，
   * 「答案永遠是 A」等於把評量結果送給會看位置的學生。用與計算題同一套
   * 「實驗 + 日期」種子決定順序：同一個學生同一天看到的排列固定，方便檢討。
   */
  function shuffleAuthoredQuestion(q, salt) {
    const hash = questionSeed(String(salt || ""));
    let state = (hash >>> 0) || 1;
    const rand = () => {
      state = (state + 0x9e3779b9) >>> 0;
      let z = state;
      z = Math.imul(z ^ (z >>> 16), 0x21f0aaad) >>> 0;
      z = Math.imul(z ^ (z >>> 15), 0x735a2d97) >>> 0;
      return ((z ^ (z >>> 15)) >>> 0) / 4294967296;
    };
    const options = q.options.slice();
    let correct = q.correct;
    // Fisher–Yates：洗選項的同時跟著搬正解索引
    for (let i = options.length - 1; i > 0; i -= 1) {
      const j = Math.floor(rand() * (i + 1));
      [options[i], options[j]] = [options[j], options[i]];
      if (correct === i) correct = j; else if (correct === j) correct = i;
    }
    return Object.assign({}, q, { options, correct });
  }

  function buildPracticeQuestions(f) {
    const { exp, mod } = f;
    // 有逐題撰寫的題目就優先使用（渲染前洗牌）；其餘實驗由樣板生成。
    const authored = window.PhysicsLabQuestionBank && window.PhysicsLabQuestionBank[exp.id];
    if (Array.isArray(authored) && authored.length) {
      return authored.map((q, i) => shuffleAuthoredQuestion(q, exp.id + "#" + i));
    }

    const points = Array.isArray(exp.points) && exp.points.length ? exp.points : [exp.concept || exp.title];
    const core = compactText(points[0], exp.title, 72);
    const support = compactText(points[1] || exp.concept, exp.title, 72);
    const bridge = TEXTBOOK_BRIDGES[mod.id] || {};
    const conceptChoices = makeChoices(core, neighbourDistractors(f, 3, 0), f.order);
    /*
     * 第二題改問「結論歸屬」：四句都是真的學科敘述，只有一句是這個實驗支持的。
     * 正解取本實驗的第二個學習重點，誘答取別的實驗的重點（取樣偏移與第一題錯開，
     * 不會出現同一句話在兩題裡重複登場）。
     */
    const claimChoices = makeChoices(
      support,
      neighbourDistractors(f, 3, 2),
      f.order + 1
    );
    /*
     * 第三題改問「觀察方法」：正解是本模組的觀察建議，誘答是其他模組的——
     * 它們也都是正確的方法，只是用在這裡會文不對題。
     */
    const otherBridges = Object.keys(TEXTBOOK_BRIDGES).filter(id => id !== mod.id);
    const methodDistractors = [];
    for (let i = 0; i < otherBridges.length && methodDistractors.length < 3; i += 1) {
      const text = TEXTBOOK_BRIDGES[otherBridges[(f.order + i) % otherBridges.length]].observe;
      if (!methodDistractors.includes(text)) methodDistractors.push(text);
    }
    const methodChoices = makeChoices(
      bridge.observe || "固定其他條件，只改變一個量，對照讀數與圖形的變化。",
      methodDistractors,
      f.order + 2
    );
    return [
      {
        type: "單選題 · 核心觀念",
        prompt: "下列何者最能說明「" + exp.title + "」的核心觀念？",
        options: conceptChoices.options,
        correct: conceptChoices.correct,
        hint: "操作模擬時一次只動一個滑桿，先看讀數，再看圖形的斜率、面積或峰值是否同步改變。",
        answer: "重點是把參數變化連回核心概念：" + core + "。若觀察結果不同，通常代表還有另一個條件沒有固定。"
      },
      {
        type: "單選題 · 結論歸屬",
        prompt: "四位同學各自寫下一句「看完模擬後的結論」，其中只有一句是「" + exp.title + "」真正支持的。是哪一句？",
        options: claimChoices.options,
        correct: claimChoices.correct,
        hint: "先把每句話裡的「因為什麼、所以什麼」圈出來，再回頭對照模擬裡實際量到的關係。",
        answer: "本實驗支持的敘述是：「" + support + "」。其餘選句都是課程裡真實的學科敘述，但屬於其他實驗的結論，放在這裡就是文不對題。"
      },
      {
        type: "單選題 · 觀察方法",
        prompt: "想用「" + exp.title + "」的模擬把關係看清楚，下列哪一組操作建議最合適？",
        options: methodChoices.options,
        correct: methodChoices.correct,
        hint: "好的觀察流程會先固定條件、一次改一個量，並把讀數或圖形的變化記下來比對。",
        answer: "本模組的建議流程：" + (bridge.observe || "固定其他條件，只改變一個量，對照讀數與圖形的變化。") + " 其餘選項是其他主題（如光學、電路）的正確方法，用在這個實驗會量錯東西。"
      }
    ];
  }

  /*
   * 隨機化計算題
   * 每個學生、每一天拿到的數值都不同，必須真的算出一個數字並輸入。
   * 種子由「實驗 id + 使用者裝置代號 + 日期」決定：同一天重新整理是同一題
   * （不會因為想換簡單的題目就一直重整），隔天或換人才會換題。
   */
  function deviceSeed() {
    let seed = store.get("pl-seed", null);
    if (typeof seed !== "number") {
      seed = Math.floor(Math.random() * 2147483647);
      store.set("pl-seed", seed);
    }
    return seed;
  }

  function questionSeed(expId) {
    const base = deviceSeed() + todayKey().replace(/-/g, "");
    let hash = 2166136261;
    const text = expId + "|" + base;
    for (let i = 0; i < text.length; i += 1) {
      hash ^= text.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
  }

  function renderNumericQuestion(root, f, index) {
    if (typeof window.PhysicsLabBuildNumericQuestion !== "function") return false;
    const q = window.PhysicsLabBuildNumericQuestion(f.exp.id, questionSeed(f.exp.id));
    if (!q) return false;

    const id = f.exp.id + "-num";
    const done = getPracticeDone();
    const solved = done.has(id);

    const item = el("article", "practice-item practice-numeric", root);
    const head = el("div", "practice-head", item);
    const type = el("span", "practice-type", head);
    type.textContent = "Q" + (index + 1) + " · " + q.type;
    const status = el("span", "practice-status", head);
    status.textContent = solved ? "答對" : "待作答";

    const prompt = el("p", "practice-question", item);
    prompt.textContent = q.prompt;

    const row = el("div", "numeric-row", item);
    const input = el("input", "numeric-input", row);
    input.type = "text";
    input.inputMode = "decimal";
    input.autocomplete = "off";
    input.placeholder = "輸入你算出的數值";
    input.setAttribute("aria-label", "作答欄位");
    if (q.unit) { const unit = el("span", "numeric-unit", row); unit.textContent = q.unit; }
    const submit = el("button", "numeric-submit", row);
    submit.type = "button"; submit.textContent = "檢查答案";

    const feedback = el("p", "practice-feedback" + (solved ? " is-correct" : ""), item);
    feedback.hidden = !solved;
    if (solved) feedback.textContent = "答對了。正確答案 " + PL.fmt(q.answer, 3) + (q.unit ? " " + q.unit : "");

    const actions = el("div", "practice-actions", item);
    const hintBtn = el("button", "practice-btn", actions);
    hintBtn.type = "button"; hintBtn.textContent = "看提示"; hintBtn.setAttribute("aria-expanded", "false");
    const stepBtn = el("button", "practice-btn", actions);
    stepBtn.type = "button"; stepBtn.textContent = "看逐步解法"; stepBtn.setAttribute("aria-expanded", "false");
    const newBtn = el("button", "practice-btn", actions);
    newBtn.type = "button"; newBtn.textContent = "換一題";

    const hint = el("div", "practice-detail", item); hint.hidden = true; hint.textContent = q.hint || "";
    const steps = el("ol", "practice-detail numeric-steps", item); steps.hidden = true;
    (q.steps || []).forEach(line => { const li = el("li", null, steps); li.textContent = line; });

    const toggle = (btn, panel) => btn.addEventListener("click", () => {
      panel.hidden = !panel.hidden;
      btn.setAttribute("aria-expanded", String(!panel.hidden));
    });
    toggle(hintBtn, hint);
    toggle(stepBtn, steps);

    newBtn.addEventListener("click", () => {
      // 換一題＝換種子；已作答狀態一併清掉
      store.set("pl-seed", Math.floor(Math.random() * 2147483647));
      setPracticeDone(id, false);
      renderPractice(f);
    });

    function grade() {
      const raw = input.value.trim().replace(/[，,\s]/g, "");
      const value = Number(raw);
      feedback.hidden = false;
      if (!raw || !isFinite(value)) {
        feedback.classList.remove("is-correct");
        feedback.textContent = "請先輸入一個數值。";
        return;
      }
      // 用相對容差，避免學生因為四捨五入位數不同被判錯
      const tol = q.tolerance || 0.03;
      const ok = Math.abs(value - q.answer) <= Math.abs(q.answer) * tol + 1e-9;
      feedback.classList.toggle("is-correct", ok);
      if (ok) {
        feedback.textContent = "答對了。正確答案 " + PL.fmt(q.answer, 3) + (q.unit ? " " + q.unit : "") +
          "（容差 ±" + (tol * 100).toFixed(0) + "%）";
        status.textContent = "答對";
        setPracticeDone(id, true);
        steps.hidden = false;
        stepBtn.setAttribute("aria-expanded", "true");
      } else {
        const off = ((value - q.answer) / q.answer) * 100;
        feedback.textContent = "還不對。你的答案比正確值" + (off > 0 ? "大" : "小") +
          " " + Math.abs(off).toFixed(0) + "%，先檢查單位換算與公式的移項方向。";
        status.textContent = "再試一次";
      }
    }

    submit.addEventListener("click", grade);
    input.addEventListener("keydown", e => { if (e.key === "Enter") { e.preventDefault(); grade(); } });
    return true;
  }

  function renderPractice(f) {
    const root = $("#practice-list");
    if (!root) return;
    const done = getPracticeDone();
    const answers = getPracticeAnswers();
    root.innerHTML = "";
    const questions = buildPracticeQuestions(f);
    questions.forEach((q, index) => {
      const id = f.exp.id + "-q" + index;
      const item = el("article", "practice-item", root);
      const head = el("div", "practice-head", item);
      const type = el("span", "practice-type", head); type.textContent = "Q" + (index + 1) + " · " + q.type;
      const savedAnswer = Number(answers[id]);
      const solved = savedAnswer === q.correct || done.has(id);
      const selectedAnswer = savedAnswer === q.correct ? savedAnswer : (solved ? q.correct : null);
      const status = el("span", "practice-status", head); status.textContent = solved ? "答對" : "待作答";
      const prompt = el("p", "practice-question", item);
      prompt.textContent = q.prompt;
      if (q.formula) {
        // 公式是題幹的輔助行，不能蓋掉題目本身問什麼
        const formula = el("span", "practice-formula", prompt); formula.innerHTML = q.formula;
      }
      const choices = el("div", "practice-options", item);
      choices.setAttribute("role", "radiogroup");
      choices.setAttribute("aria-label", "第 " + (index + 1) + " 題選項");
      const optionButtons = [];
      q.options.forEach((choice, choiceIndex) => {
        const option = el("button", "practice-option", choices); option.type = "button";
        option.setAttribute("role", "radio");
        option.setAttribute("aria-checked", String(selectedAnswer === choiceIndex));
        option.setAttribute("aria-label", String.fromCharCode(65 + choiceIndex) + "：" + choice);
        if (solved) {
          option.disabled = true;
          if (choiceIndex === q.correct) option.classList.add("is-correct");
        }
        const label = el("span", "practice-option-key", option); label.textContent = String.fromCharCode(65 + choiceIndex);
        const text = el("span", "practice-option-text", option); text.textContent = choice;
        optionButtons.push(option);
      });
      const feedback = el("p", "practice-feedback" + (solved ? " is-correct" : ""), item);
      feedback.setAttribute("aria-live", "polite");
      feedback.hidden = !solved;
      if (solved) feedback.textContent = "答對了，這個判斷可以帶進下一題。";
      const actions = el("div", "practice-actions", item);
      const hintBtn = el("button", "practice-btn", actions); hintBtn.type = "button"; hintBtn.textContent = "看提示"; hintBtn.setAttribute("aria-expanded", "false");
      const answerBtn = el("button", "practice-btn", actions); answerBtn.type = "button"; answerBtn.textContent = "看解析"; answerBtn.setAttribute("aria-expanded", "false");
      const hint = el("div", "practice-detail", item); hint.hidden = true;
      const hintLabel = el("strong", null, hint); hintLabel.textContent = "提示：";
      hint.append(document.createTextNode(q.hint));
      const answer = el("div", "practice-detail", item); answer.hidden = true;
      const answerLabel = el("strong", null, answer); answerLabel.textContent = "解析：";
      answer.append(document.createTextNode(q.answer));
      hintBtn.addEventListener("click", () => {
        hint.hidden = !hint.hidden;
        hintBtn.setAttribute("aria-expanded", String(!hint.hidden));
      });
      answerBtn.addEventListener("click", () => {
        answer.hidden = !answer.hidden;
        answerBtn.setAttribute("aria-expanded", String(!answer.hidden));
      });
      optionButtons.forEach((option, choiceIndex) => option.addEventListener("click", () => {
        if (solved) return;
        optionButtons.forEach(button => {
          button.classList.remove("is-incorrect");
          button.setAttribute("aria-checked", "false");
        });
        option.setAttribute("aria-checked", "true");
        feedback.hidden = false;
        if (choiceIndex !== q.correct) {
          option.classList.add("is-incorrect");
          feedback.classList.remove("is-correct");
          feedback.textContent = "再想想：" + q.hint;
          return;
        }
        optionButtons.forEach(button => { button.disabled = true; });
        option.classList.add("is-correct");
        feedback.classList.remove("is-incorrect");
        feedback.classList.add("is-correct");
        feedback.textContent = "答對了，這個判斷可以帶進下一題。";
        status.textContent = "答對";
        answer.hidden = false;
        answerBtn.setAttribute("aria-expanded", "true");
        setPracticeAnswer(id, choiceIndex);
        setPracticeDone(id, true);
      }));
    });
    // 有隨機計算題的實驗，把它接在選擇題後面當作最後一題
    renderNumericQuestion(root, f, questions.length);
    typeset(root);
    updateFinish();
  }

  /* ------------------------------- 實驗進度：觀察點 → 完成實驗 -------------------------------
   * 實驗中由 sim-observe.js 在兩個階段彈出觀察題（播放時、改變參數後），
   * 這裡把進度畫在教材欄的「實驗進度」清單，全部觀察完再引導到最下方的總結題。
   */
  const OBS = { id: null, stages: [], done: {}, nudged: false };
  const OBS_TEXT = {
    play: ["播放並觀察", "按播放看實驗跑起來；跑到一個段落會停下來問你看到什麼"],
    param: ["改變一個參數", "暫停時把一根滑桿調一段，放手後會問你哪個讀數變了"]
  };
  function finishStats() {
    const root = $("#practice-list");
    const items = root ? Array.from(root.querySelectorAll(".practice-status")) : [];
    return { right: items.filter(n => n.textContent === "答對").length, total: items.length };
  }
  function updateFinish() {
    const st = finishStats();
    const c = $("#finish-count"); if (c) c.textContent = st.right + " / " + st.total;
    const card = $("#finish-card"); if (card) card.classList.toggle("is-complete", st.total > 0 && st.right === st.total);
    renderObserveTrack();
  }
  function renderObserveTrack() {
    const list = $("#observe-steps");
    if (!list) return;
    list.innerHTML = "";
    const steps = OBS.stages.map(k => ({ key: k, title: OBS_TEXT[k][0], desc: OBS_TEXT[k][1], state: OBS.done[k] || "" }));
    const st = finishStats();
    steps.push({ key: "finish", title: "完成總結題", desc: st.total ? st.right + " / " + st.total + " 題答對" : "載入中…",
      state: st.total && st.right === st.total ? "right" : "" });
    steps.forEach((s, i) => {
      const li = el("li", "observe-step" + (s.state ? " is-" + s.state : ""), list);
      const n = el("span", "observe-step-n", li); n.textContent = s.state ? "✓" : String(i + 1);
      const tx = el("div", "observe-step-text", li);
      const b = el("b", null, tx); b.textContent = s.title;
      const d = el("span", null, tx); d.textContent = s.state === "seen" ? "已觀察（答案在解說裡）" : s.desc;
      if (s.key === "finish") {
        li.classList.add("is-link"); li.tabIndex = 0; li.setAttribute("role", "button");
        const go = () => { const card = $("#finish-card"); if (card) card.scrollIntoView({ behavior: "smooth", block: "start" }); };
        li.addEventListener("click", go);
        li.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); go(); } });
      }
    });
  }
  function nudgeFinish() {
    if (OBS.nudged) return;
    const st = finishStats();
    if (st.total && st.right === st.total) return;
    OBS.nudged = true;
    document.querySelectorAll(".finish-nudge").forEach(n => n.remove());
    const t = el("div", "finish-nudge", document.body);
    t.setAttribute("role", "status");
    const tx = el("div", null, t);
    const b = el("b", null, tx); b.textContent = "觀察完成！";
    const sp = el("span", null, tx); sp.textContent = "最後做「完成實驗」的總結題，確認你真的看懂了。";
    const go = el("button", "finish-nudge-go", t); go.type = "button"; go.textContent = "去做總結題";
    const x = el("button", "finish-nudge-x", t); x.type = "button"; x.setAttribute("aria-label", "關閉"); x.textContent = "×";
    const close = () => t.remove();
    go.addEventListener("click", () => { close(); const card = $("#finish-card"); if (card) card.scrollIntoView({ behavior: "smooth", block: "start" }); });
    x.addEventListener("click", close);
    setTimeout(close, 12000);
  }
  window.addEventListener("pl-observe-ready", e => {
    const d = e.detail || {};
    if (d.id !== currentId) return;
    OBS.id = d.id; OBS.stages = d.stages || []; OBS.done = d.done || {};
    renderObserveTrack();
  });
  window.addEventListener("pl-observe", e => {
    const d = e.detail || {};
    if (d.id !== currentId) return;
    OBS.done = d.done || OBS.done;
    renderObserveTrack();
    if (OBS.stages.length && OBS.stages.every(k => OBS.done[k])) setTimeout(nudgeFinish, 900);
  });
  document.addEventListener("click", e => {
    if (e.target.closest && e.target.closest("#practice-list")) setTimeout(updateFinish, 0);
  });

  /* ------------------------------- 學習存檔與計劃 ------------------------------- */
  function showSaveStatus(message, tone) {
    const status = $("#save-status");
    if (!status) return;
    status.textContent = message;
    status.classList.remove("ok", "warn");
    if (tone) status.classList.add(tone);
  }

  function collectLearningSave() {
    const data = {};
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i);
      if (key && key.startsWith("pl-")) data[key] = localStorage.getItem(key);
    }
    return {
      app: "senior-biology",
      version: 1,
      exportedAt: new Date().toISOString(),
      totalExperiments: C.totalExperiments,
      data
    };
  }

  function exportLearningSave() {
    const save = collectLearningSave();
    const blob = new Blob([JSON.stringify(save, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "senior-biology-save-" + todayKey() + ".json";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    showSaveStatus("已匯出學習存檔", "ok");
  }

  function importLearningSave(file) {
    if (!file) return;
    // 8 MB 以上不可能是這個網站的存檔，先擋掉避免瀏覽器卡死。
    if (file.size > 8 * 1024 * 1024) { showSaveStatus("檔案過大，請確認是本站存檔", "warn"); return; }
    const reader = new FileReader();
    reader.onerror = () => showSaveStatus("讀取檔案失敗", "warn");
    reader.onload = () => {
      let entries;
      try {
        const save = JSON.parse(String(reader.result || ""));
        if (!save || (save.app !== "senior-biology" && save.app !== "senior-science") || !save.data || typeof save.data !== "object") {
          showSaveStatus("存檔格式不正確", "warn");
          return;
        }
        // 先把資料驗完、整理好，再動現有進度。
        // 原本是「先清空全部 pl- 鍵，再寫入」，中途若失敗就等於把使用者的進度洗掉了。
        entries = Object.entries(save.data).filter(([key, value]) => key.startsWith("pl-") && typeof value === "string");
        if (!entries.length) { showSaveStatus("存檔內沒有可用的學習資料", "warn"); return; }
      } catch (e) {
        showSaveStatus("存檔不是有效的 JSON", "warn");
        return;
      }

      // 保留一份現況，寫入失敗就回復。
      const backup = {};
      for (let i = 0; i < localStorage.length; i += 1) {
        const key = localStorage.key(i);
        if (key && key.startsWith("pl-")) backup[key] = localStorage.getItem(key);
      }
      try {
        Object.keys(backup).forEach(key => localStorage.removeItem(key));
        entries.forEach(([key, value]) => localStorage.setItem(key, value));
      } catch (e) {
        Object.keys(backup).forEach(key => localStorage.removeItem(key));
        Object.entries(backup).forEach(([key, value]) => localStorage.setItem(key, value));
        showSaveStatus("寫入失敗，已回復原本進度", "warn");
        return;
      }

      viewed = new Set(store.get("pl-progress", []));
      applyTheme(preferredTheme());
      // 側邊目錄的完成標記與展開狀態也要一起重畫，否則畫面與存檔不一致。
      refreshViewedMarks();
      renderStudyCenter();
      syncPlanControls(store.get(STUDY_PLAN_KEY, null));
      route();
      showSaveStatus("已匯入 " + entries.length + " 筆學習資料", "ok");
    };
    reader.readAsText(file);
  }

  function getPlanDaysValue() {
    const select = $("#plan-days");
    const custom = $("#custom-days");
    const raw = select && select.value === "custom" ? Number(custom && custom.value) : Number(select && select.value);
    return Math.max(3, Math.min(120, Number.isFinite(raw) ? Math.round(raw) : 30));
  }

  function getPlanMinutesValue() {
    const input = $("#plan-minutes");
    const raw = Number(input && input.value);
    return Math.max(10, Math.min(180, Number.isFinite(raw) ? Math.round(raw) : 35));
  }

  /*
   * 把實驗切成每日任務
   * 原本用 index % days 輪流發牌，第 1 天會拿到第 1、第 1+days、第 1+2days… 個實驗，
   * 等於每天都在不同章節之間跳來跳去，完全違反課程的先後順序。
   * 改成依課程順序切成連續區塊：同一天的實驗彼此相關，也維持章節的學習脈絡。
   */
  function distributePlan(ids, days) {
    const total = ids.length;
    const schedule = Array.from({ length: days }, (_, i) => ({ day: i + 1, ids: [] }));
    if (!total) return schedule;
    const base = Math.floor(total / days);
    const extra = total % days;   // 前 extra 天各多分一個，避免最後一天暴增
    let cursor = 0;
    for (let day = 0; day < days; day += 1) {
      const size = base + (day < extra ? 1 : 0);
      schedule[day].ids = ids.slice(cursor, cursor + size);
      cursor += size;
    }
    return schedule;
  }

  function createStudyPlan() {
    const days = getPlanDaysValue();
    const minutes = getPlanMinutesValue();
    const unseen = FLAT.map(f => f.exp.id).filter(id => !viewed.has(id));
    const fallback = FLAT.map(f => f.exp.id);
    const ids = unseen.length ? unseen : fallback;
    const plan = {
      version: 1,
      createdAt: new Date().toISOString(),
      startDate: todayKey(),
      days,
      minutes,
      totalTasks: ids.length,
      schedule: distributePlan(ids, days)
    };
    store.set(STUDY_PLAN_KEY, plan);
    renderStudyCenter();
    showSaveStatus("已建立 " + days + " 天學習計劃", "ok");
  }

  function goNextUnseen() {
    const target = FLAT.find(f => !viewed.has(f.exp.id)) || FLAT[0];
    if (target) location.hash = "#" + target.exp.id;
  }

  function clearStudyPlan() {
    localStorage.removeItem(STUDY_PLAN_KEY);
    renderStudyCenter();
    showSaveStatus("已清除學習計劃", "warn");
  }

  function syncPlanControls(plan) {
    const select = $("#plan-days");
    const customWrap = $("#custom-days-wrap");
    const custom = $("#custom-days");
    const minutes = $("#plan-minutes");
    if (!select) return;
    const days = plan ? plan.days : getPlanDaysValue();
    const preset = ["7", "14", "30"].includes(String(days));
    select.value = preset ? String(days) : "custom";
    if (customWrap) customWrap.hidden = select.value !== "custom";
    if (custom && !preset) custom.value = days;
    if (minutes) minutes.value = plan ? plan.minutes : minutes.value;
  }

  function renderTodayTasks(plan, dayIndex) {
    const list = $("#today-task-list");
    if (!list) return;
    list.innerHTML = "";
    if (!plan || dayIndex < 0 || dayIndex >= plan.schedule.length) return;
    const today = plan.schedule[dayIndex];
    const visible = today.ids.slice(0, 7);
    visible.forEach((id, index) => {
      const f = byId[id];
      if (!f) return;
      const task = el("button", "today-task" + (viewed.has(id) ? " done" : ""), list);
      task.type = "button";
      const no = el("span", "today-task-index", task); no.textContent = String(index + 1).padStart(2, "0");
      const name = el("span", "today-task-name", task); name.textContent = f.exp.title;
      if (viewed.has(id)) { const check = el("span", "today-task-check", task); check.textContent = "完成"; }
      task.addEventListener("click", () => location.hash = "#" + id);
    });
    if (today.ids.length > visible.length) {
      const more = el("div", "today-task more", list);
      const name = el("span", "today-task-name", more); name.textContent = "另外還有 " + (today.ids.length - visible.length) + " 個實驗，完成上方任務後可從側邊目錄繼續。";
    }
  }

  /*
   * 複習優先清單
   * 原本只是「完成比例最低的三個模組」，那其實是「還沒讀」而不是「需要複習」。
   * 改成綜合三個訊號排序，並直接告訴使用者為什麼這個模組排在前面：
   *   1. 章節檢核答錯或略過（最強訊號：已經讀過但概念沒抓穩）
   *   2. 練習題答錯過
   *   3. 還沒讀完的比例
   */
  function reviewPriority(mod) {
    const done = mod.experiments.filter(exp => viewed.has(exp.id)).length;
    const total = mod.experiments.length || 1;
    const checkpoint = store.get("pl-checkpoint-" + mod.id, null);
    const answers = getPracticeAnswers();

    let wrong = 0;
    const doneSet = getPracticeDone();
    mod.experiments.forEach(exp => {
      Object.keys(answers).forEach(key => {
        if (key.indexOf(exp.id + "-q") !== 0) return;
        // 正解索引隨日期洗牌，不能拿保存的選項序號與原始題庫比對；
        // 以「有作答紀錄但沒有答對標記」判定錯誤，與排列方式無關。
        if (!doneSet.has(key)) wrong += 1;
      });
    });

    let score = (1 - done / total) * 40;                       // 未讀比例：最多 40 分
    let reason = "尚未讀完";
    if (checkpoint && checkpoint.skipped) { score += 45; reason = "章節檢核略過"; }
    else if (checkpoint && checkpoint.score != null && checkpoint.total) {
      const rate = checkpoint.score / checkpoint.total;
      if (rate < 1) { score += (1 - rate) * 60; reason = "檢核 " + checkpoint.score + "/" + checkpoint.total; }
    }
    if (wrong > 0) { score += Math.min(30, wrong * 12); reason = "練習答錯 " + wrong + " 題"; }
    return { mod, done, total, score, reason, pct: done / total };
  }

  function renderReviewFocus() {
    const root = $("#review-focus-list");
    if (!root) return;
    root.innerHTML = "";
    const modules = C.modules.map(reviewPriority)
      .filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score || a.mod.no - b.mod.no)
      .slice(0, 3);
    if (!modules.length) {
      const row = el("div", "review-focus-item", root);
      const name = el("span", "review-focus-name", row);
      name.textContent = "目前沒有需要優先複習的模組，繼續往下一章前進吧。";
      return;
    }
    modules.forEach(item => {
      const row = el("button", "review-focus-item", root);
      row.type = "button";
      row.style.setProperty("--m-color", item.mod.color);
      const name = el("span", "review-focus-name", row);
      name.textContent = "模組 " + item.mod.no + " · " + item.mod.title + "（" + item.reason + "）";
      const meta = el("span", "review-focus-meta", row); meta.textContent = item.done + " / " + item.total;
      const firstUnseen = item.mod.experiments.find(exp => !viewed.has(exp.id)) || item.mod.experiments[0];
      row.addEventListener("click", () => { if (firstUnseen) location.hash = "#" + firstUnseen.id; });
    });
  }

  function renderStudyCenter() {
    const title = $("#today-plan-title");
    const summary = $("#today-plan-summary");
    if (!title || !summary) return;
    const plan = store.get(STUDY_PLAN_KEY, null);
    syncPlanControls(plan);
    const allPlanned = plan ? plan.schedule.flatMap(day => day.ids).filter(id => byId[id]) : [];
    const allDone = allPlanned.filter(id => viewed.has(id)).length;
    const currentIndex = plan ? dayDiff(plan.startDate) : -1;
    const today = plan && currentIndex >= 0 && currentIndex < plan.schedule.length ? plan.schedule[currentIndex] : null;
    const todayTotal = today ? today.ids.length : 0;
    const todayDone = today ? today.ids.filter(id => viewed.has(id)).length : 0;
    const pct = todayTotal ? Math.round(todayDone / todayTotal * 100) : 0;
    const fill = $("#today-progress-fill"); if (fill) fill.style.width = pct + "%";
    const progressText = $("#today-progress-text"); if (progressText) progressText.textContent = todayDone + " / " + todayTotal;
    const progressPct = $("#today-progress-percent"); if (progressPct) progressPct.textContent = pct + "%";
    renderReviewFocus();

    if (!plan) {
      title.textContent = "尚未建立計劃";
      summary.textContent = "選擇天數後，系統會把尚未完成的實驗平均分配到每日任務。";
      renderTodayTasks(null, -1);
      return;
    }
    if (currentIndex >= plan.schedule.length) {
      title.textContent = "計劃已走完";
      summary.textContent = "這份 " + plan.days + " 天計劃共安排 " + plan.totalTasks + " 個實驗，目前已完成 " + allDone + " 個。可以重新建立下一輪複習。";
      renderTodayTasks(null, -1);
      return;
    }
    title.textContent = "第 " + (currentIndex + 1) + " 天 · " + plan.minutes + " 分鐘";
    summary.textContent = "今日安排 " + todayTotal + " 個實驗；整份計劃已完成 " + allDone + " / " + allPlanned.length + " 個。";
    renderTodayTasks(plan, currentIndex);
  }

  function openExp(id) {
    const f = byId[id];
    if (!f) { location.hash = ""; return; }
    if (currentSim && currentSim.stop) { try { currentSim.stop(); } catch (e) {} }
    currentSim = null; currentId = id;
    const { exp, mod } = f;
    Object.assign(OBS, { id, stages: [], done: {}, nudged: false });
    document.querySelectorAll(".finish-nudge").forEach(n => n.remove());
    const plist = $("#practice-list"); if (plist) plist.innerHTML = "";
    updateFinish();

    showView("exp");
    const view = $("#exp-view");
    view.style.setProperty("--m-color", mod.color);
    document.documentElement.style.setProperty("--m-color", mod.color); // 讓 canvas 也能取用模組色

    view.classList.remove("fade-in"); void view.offsetWidth; view.classList.add("fade-in");

    // 頁首
    $("#exp-crumb").innerHTML = '<b>模組' + mod.no + " · " + mod.title + '</b><span class="sep">/</span>' +
      "第 " + (f.indexInMod + 1) + " 個實驗";
    $("#exp-title").textContent = exp.title;
    $("#exp-lead").textContent = exp.concept;
    // 學測／分科／課本實驗對應：標題上方一枚標籤，教材區多一段「考題怎麼問」
    const examTag = exp.exam && exp.exam.tag;
    if (examTag) {
      const b = el("span", "exp-exam-tag", $("#exp-crumb"));
      b.textContent = examTag;
    }
    const examBox = $("#guide-exam");
    if (examBox) {
      examBox.hidden = !(exp.exam && exp.exam.how);
      $("#guide-exam-how").textContent = exp.exam && exp.exam.how ? exp.exam.how : "";
    }
    paintLevelBadge(id);
    renderExperimentLearningPath(id);
    renderLearningOutput(f);

    /*
     * 模擬工作區
     * 程式碼採延遲載入，因此先顯示載入狀態，等對應的檔案就緒再建置。
     * 期間使用者若已經切到別的實驗（openToken 改變），就放棄這次建置，
     * 避免慢的網路下舊實驗蓋掉新實驗。
     */
    const simRoot = $("#sim-root");
    simRoot.innerHTML = "";
    const token = ++openToken;
    const loading = el("div", "sim-loading", simRoot);
    loading.setAttribute("role", "status");
    loading.textContent = "載入互動模擬…";

    ensureExperiment(exp.id).then(ready => {
      if (token !== openToken) return;          // 使用者已經換到別的實驗
      simRoot.innerHTML = "";
      if (!ready) {
        const empty = el("div", "empty", simRoot);
        empty.textContent = "此實驗的互動模擬尚在開發中。";
        return;
      }
      try {
        currentSim = PL.get(exp.id).build(simRoot) || {};
        arrangeStage();
        setTimeout(arrangeStage, 0);   // 掛載鉤子（示範重點、課堂提問）有時晚一拍才插進來
      } catch (err) {
        console.error("模擬載入失敗：" + exp.id, err);
        simRoot.innerHTML = "";
        const failed = el("div", "empty", simRoot);
        failed.textContent = "此模擬載入時發生問題，請重新整理後再試。";
      }
      prefetchNeighbours(f.order);
    });

    // 教材：公式與重點
    $("#guide-concept").textContent = exp.concept;
    $("#guide-formula").innerHTML = exp.formula;
    const ul = $("#guide-points"); ul.innerHTML = "";
    exp.points.forEach(p => { const li = el("li", null, ul); li.textContent = p; });
    // 題目練習要等題庫就緒；換頁競爭用與模擬同一個 token 擋掉
    ensureQuestionBank().then(() => {
      if (token !== openToken) return;
      renderPractice(f);
    });
    typeset($("#guide-formula"));

    /*
     * 學習單入口
     * 競品分析的結論：老師採用一個教學網站的關鍵不是功能多寡，
     * 而是「能不能直接印一張紙帶進教室」。PhET 有 3,600 份教師活動，
     * 這裡至少要讓每個實驗都能一鍵取得對應的學習單。
     */
    const outputs = $("#learning-output");
    if (outputs) {
      const existing = outputs.querySelector(".worksheet-link-row");
      if (existing) existing.remove();
      const oldKeys = outputs.querySelector(".sim-shortcuts");
      if (oldKeys) oldKeys.remove();
      const row = el("div", "worksheet-link-row", outputs);
      const link = el("a", "worksheet-link", row);
      link.href = "p/worksheet-" + encodeURIComponent(exp.id) + ".html";
      link.target = "_blank";
      link.rel = "noopener";
      link.textContent = "列印這個實驗的學習單";
      const note = el("span", "worksheet-link-note", row);
      note.textContent = "含資料記錄表格、作圖區與由圖求值欄位，可直接發給學生";

      /* 鍵盤捷徑：自學與上台都用得到，寫在實驗頁而不是藏進說明書 */
      const keys = el("p", "sim-shortcuts", outputs);
      keys.textContent = "鍵盤：空白鍵 播放／暫停 · S 單步 · R 全部重設 · ← → 切換實驗 · / 搜尋";
    }

    // 上一個 / 下一個
    const prev = FLAT[f.order - 1], next = FLAT[f.order + 1];
    setNav($("#nav-prev"), prev, "上一個實驗");
    setNav($("#nav-next"), next, "下一個實驗");

    // 進度與側邊高亮
    markVisited(id);
    highlightSidebar(id, mod.id);
    updateStageBar(id);
    $(".main").scrollTop = 0; window.scrollTo(0, 0);
    document.title = exp.title + "｜生物實驗室";
  }

  function setNav(btn, target, dir) {
    if (!target) { btn.disabled = true; btn.onclick = null; btn.querySelector(".nav-title").textContent = "—"; btn.querySelector(".nav-dir").textContent = dir; return; }
    btn.disabled = false;
    btn.querySelector(".nav-dir").textContent = dir;
    btn.querySelector(".nav-title").textContent = target.exp.title;
    btn.onclick = () => location.hash = "#" + target.exp.id;
  }

  function highlightSidebar(id, modId) {
    document.querySelectorAll(".exp-item.active").forEach(x => x.classList.remove("active"));
    const item = document.querySelector('.exp-item[data-id="' + CSS.escape(id) + '"]');
    if (item) {
      item.classList.add("active");
      const mod = item.closest(".module");
      if (mod && !mod.classList.contains("open")) mod.classList.add("open");
      item.scrollIntoView({ block: "nearest" });
    }
    closeSidebarMobile();
  }

  /* ------------------------------- 進度 ------------------------------- */
  /*
   * 之前「開啟＝已完成」，用方向鍵掃過一輪就會顯示 100%，
   * 學習進度、今日任務與複習清單全部失去意義。
   * 改成要真的停留或動手操作過，才算完成一個實驗。
   */
  const DWELL_MS = 20000;
  let dwellTimer = 0;
  let dwellId = null;

  function cancelDwell() {
    if (dwellTimer) { clearTimeout(dwellTimer); dwellTimer = 0; }
    dwellId = null;
  }

  function startDwell(id) {
    cancelDwell();
    dwellId = id;
    dwellTimer = setTimeout(() => { if (dwellId === id) completeExperiment(id); }, DWELL_MS);
    // 動手調整任何參數就立刻算數，不必等滿時間。
    const simRoot = $("#sim-root");
    if (!simRoot) return;
    const onInteract = () => { if (dwellId === id) completeExperiment(id); };
    ["pointerdown", "input", "change"].forEach(type =>
      simRoot.addEventListener(type, onInteract, { once: true, passive: true })
    );
  }

  function completeExperiment(id) {
    cancelDwell();
    if (viewed.has(id)) return;
    viewed.add(id);
    store.set("pl-progress", [...viewed]);
    refreshViewedMarks();
  }

  function markVisited(id) {
    store.set("pl-last-viewed", id);
    refreshViewedMarks();
    startDwell(id);
  }
  function refreshViewedMarks() {
    document.querySelectorAll(".exp-item").forEach(it => {
      it.classList.toggle("viewed", viewed.has(it.dataset.id));
    });
    const pct = Math.round(viewed.size / C.totalExperiments * 100);
    const fill = $("#progress-fill"); if (fill) fill.style.width = pct + "%";
    const lab = $("#progress-count"); if (lab) lab.textContent = viewed.size + " / " + C.totalExperiments;
    refreshHomeProgress();
    renderStudyCenter();
  }
  /* 首頁：模組卡的個人進度＋英雄區的「繼續上次」。第一次來的人看不到後者，不會多一顆用不到的按鈕。 */
  function refreshHomeProgress() {
    document.querySelectorAll(".mcard[data-mod]").forEach(card => {
      const mod = C.modules.find(m => m.id === card.dataset.mod);
      if (!mod) return;
      const done = mod.experiments.filter(exp => viewed.has(exp.id)).length;
      const total = mod.experiments.length;
      const bar = card.querySelector(".mcard-progress i");
      if (bar) bar.style.width = (total ? done / total * 100 : 0) + "%";
      const label = card.querySelector(".mcard-done");
      if (label) label.textContent = done + " / " + total;
      card.classList.toggle("is-started", done > 0);
      card.classList.toggle("is-complete", total > 0 && done === total);
    });
    const resume = $("#hero-resume");
    if (resume) {
      const last = store.get("pl-last-viewed", "");
      const target = last && byId[last];
      resume.hidden = !target;
      if (target) {
        resume.href = "#" + target.exp.id;
        const title = $("#hero-resume-title"); if (title) title.textContent = target.exp.title;
        resume.setAttribute("aria-label", "繼續上次的實驗：" + target.exp.title);
      }
    }
  }
  function resetProgress() {
    // 清除後無法復原（除非先匯出存檔），所以先確認一次
    if (typeof window.confirm === "function" && !window.confirm("確定要清除全部學習進度嗎？建議先「匯出存檔」備份。")) return;
    viewed = new Set(); store.set("pl-progress", []); localStorage.removeItem("pl-last-viewed");
    cancelDwell(); refreshViewedMarks();
  }

  /* ------------------------------- 搜尋 ------------------------------- */
  function runSearch(q) {
    q = (q || "").trim().toLowerCase();
    if (!q) { if (location.hash.replace("#", "")) return; showView("home"); return; }
    const hits = FLAT.filter(f =>
      f.exp.title.toLowerCase().includes(q) ||
      f.exp.concept.toLowerCase().includes(q) ||
      f.mod.title.toLowerCase().includes(q) ||
      f.exp.points.some(p => p.toLowerCase().includes(q))
    );
    const list = $("#sr-list"); list.innerHTML = "";
    $("#sr-count").textContent = hits.length;
    if (!hits.length) {
      // 搜尋字串來自使用者輸入，之前直接串進 innerHTML，等於把輸入當 HTML 執行。
      const empty = el("div", "empty", list);
      empty.textContent = "找不到符合「" + q + "」的實驗。";
    }
    hits.forEach(f => {
      const item = el("div", "sr-item", list);
      item.style.setProperty("--m-color", f.mod.color);
      const mod = el("div", "sr-mod", item); mod.textContent = "模組" + f.mod.no + " · " + f.mod.title;
      const title = el("div", "sr-title", item); title.textContent = f.exp.title;
      const desc = el("div", "sr-desc", item); desc.textContent = f.exp.concept;
      item.setAttribute("role", "button");
      item.setAttribute("tabindex", "0");
      item.addEventListener("click", () => location.hash = "#" + f.exp.id);
      item.addEventListener("keydown", e => {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); location.hash = "#" + f.exp.id; }
      });
    });
    showView("search");
  }

  /* ------------------------------- 視圖切換 ------------------------------- */
  function showView(name) {
    $("#home-view").style.display = name === "home" ? "" : "none";
    $("#exp-view").style.display = name === "exp" ? "" : "none";
    $("#search-results").style.display = name === "search" ? "" : "none";
    syncStageMode(name);
  }

  /*
   * 教師演示的「純實驗台」：只在實驗頁、且是從「教師演示版」進來時生效。
   * 旗標放 sessionStorage——同一個分頁重新整理還在（上台時不會被打回原形），
   * 但新開分頁或回首頁就會清掉，不會讓別人點進來看到一個沒有導覽的頁面。
   */
  const STAGE_KEY = "pl-teacher-stage";
  function stageFlag() { try { return sessionStorage.getItem(STAGE_KEY) === "1"; } catch (e) { return false; } }
  function setStageFlag(on) {
    try { if (on) sessionStorage.setItem(STAGE_KEY, "1"); else sessionStorage.removeItem(STAGE_KEY); } catch (e) {}
  }
  function syncStageMode(view) {
    const showing = view || ($("#exp-view").style.display !== "none" ? "exp" : "home");
    const on = showing === "exp" && stageFlag();
    const was = document.body.classList.contains("stage-only");
    document.body.classList.toggle("stage-only", on);
    if (!on) { closeStageMenu(); toggleStageChart(false); }
    else arrangeStage();
    // 畫布高度依「是否一頁式」計算；切換時讓 sim-core 重新量一次
    if (on !== was) requestAnimationFrame(() => window.dispatchEvent(new Event("resize")));
  }
  function exitStageMode() {
    setStageFlag(false);
    closeStageMenu();
    syncStageMode("home");
    location.hash = "";
  }

  /*
   * 一頁式實驗台：整頁與右欄都不捲動。讀數橫排在畫布下方；右欄依序嘗試
   * 全部攤開 → 縮小圖表 → 兩個分頁 → 三個分頁（各再試緊湊排版），取第一個放得下的。
   */
  const STAGE_PANES = [
    { key: "params", label: "參數", nodes: root => [
      ...Array.from(root.querySelectorAll(".sim-insight-block")).filter(n => n.querySelector(".sim-presets")),
      root.querySelector(".sim-control-deck")
    ] },
    { key: "charts", label: "圖表", nodes: root => [root.querySelector(".sim-charts")] },
    { key: "ask", label: "提問", nodes: root => [root.querySelector(".sim-demo-tip"), root.querySelector(".sim-predict")] }
  ];
  let stageTab = "params";   // 換實驗時沿用上一次的分頁
  let stageFitRaf = 0, stageFitBusy = false, stageFitCount = 0, stageFitWindow = 0, stageFitLater = 0;

  function arrangeStage() {
    if (!document.body.classList.contains("stage-only")) return;
    const root = $("#sim-root");
    if (!root || !root.querySelector(".sim-stage")) return;
    let side = root.querySelector(":scope > .stage-side");
    if (!side) {
      side = el("aside", "stage-side", root); side.setAttribute("aria-label", "實驗操作");
      const tabs = el("div", "stage-tabs", side); tabs.setAttribute("role", "tablist"); tabs.setAttribute("aria-label", "右欄分頁");
      STAGE_PANES.forEach((p, i) => {
        const pane = el("div", "stage-pane", side); pane.dataset.pane = p.key;
        pane.id = "stage-pane-" + p.key; pane.setAttribute("role", "tabpanel");
        const tab = el("button", "stage-tab", tabs); tab.type = "button"; tab.dataset.pane = p.key;
        tab.setAttribute("role", "tab"); tab.setAttribute("aria-controls", pane.id);
        tab.title = p.label + "（" + (i + 1) + "）";
        tab.addEventListener("click", () => selectStageTab(p.key, true));
      });
      const dock = el("div", "stage-dock", root); dock.setAttribute("aria-label", "量測讀數");
      // 內容長高（例如課堂提問揭曉答案）就重排
      if (typeof ResizeObserver !== "undefined") {
        const ro = new ResizeObserver(() => {
          if (stageFitBusy) return;
          const s = root.querySelector(":scope > .stage-side");
          const v = root.querySelector(".sim-visual-panel");
          if ((s && s.scrollHeight > s.clientHeight + 1) || (v && v.scrollHeight > v.clientHeight + 1)) scheduleStageFit(true);
        });
        side.querySelectorAll(".stage-pane").forEach(p => ro.observe(p));
        ro.observe(dock);
        side._stageRo = ro;
      }
    }
    const transport = root.querySelector(".sim-transport");
    if (transport && transport.parentNode !== side) {
      side.insertBefore(transport, side.firstChild);
      // 播放鍵「播放／暫停」換字、提示換行都會改變傳輸列高度，也要觸發重排
      if (side._stageRo) side._stageRo.observe(transport);
    }
    // 換實驗時 #sim-root 被清空重建，放大圖表的旗標要跟著歸零
    if (root.classList.contains("stage-chart-big") && !root.querySelector(".stage-chart-overlay")) root.classList.remove("stage-chart-big");
    const big = root.classList.contains("stage-chart-big");
    STAGE_PANES.forEach(p => {
      if (big && p.key === "charts") return;
      const pane = side.querySelector('.stage-pane[data-pane="' + p.key + '"]');
      p.nodes(root).forEach(node => { if (node && node.parentNode !== pane) pane.appendChild(node); });
    });
    updateStageChartBtn();
    const dock = root.querySelector(":scope > .stage-dock");
    const readouts = root.querySelector(".sim-readout-panel");
    if (dock && readouts && readouts.parentNode !== dock) dock.appendChild(readouts);
    scheduleStageFit();
  }

  function scheduleStageFit(fromObserver) {
    if (fromObserver) {
      const now = Date.now();
      if (now - stageFitWindow > 1000) { stageFitWindow = now; stageFitCount = 0; }
      if (++stageFitCount > 10) {
        // 太頻繁就等一秒再補排一次，不要就此放著溢出
        if (!stageFitLater) stageFitLater = setTimeout(() => { stageFitLater = 0; scheduleStageFit(true); }, 1000);
        return;
      }
    }
    cancelAnimationFrame(stageFitRaf);
    stageFitRaf = requestAnimationFrame(fitStage);
  }

  function selectStageTab(key, user) {
    const side = document.querySelector("#sim-root > .stage-side");
    if (!side) return;
    const groups = side._stageGroups || [];
    if (!groups.length) return;
    const group = groups.find(g => g.includes(key)) || groups[0];
    const tabs = Array.from(side.querySelectorAll(".stage-tab")).filter(t => !t.hidden);
    const target = tabs.find(t => t.dataset.pane === group[0]);
    if (user) stageTab = key;
    tabs.forEach(t => {
      const on = t === target;
      t.classList.toggle("is-active", on);
      t.setAttribute("aria-selected", on ? "true" : "false");
      t.tabIndex = on ? 0 : -1;
    });
    side.querySelectorAll(".stage-pane").forEach(p => { p.hidden = !p._stageHasContent || !group.includes(p.dataset.pane); });
    // 隱藏時量不到寬度、不會重算；顯示出來後依當下的上限補算一次
    if (group.includes("charts")) side.querySelectorAll(".stage-pane[data-pane='charts'] .sim-chart > canvas.sim-canvas").forEach(refitCanvas);
  }

  /*
   * 圖表放大到主畫面（G）
   * 右欄的圖表只有三百多像素寬，投影到教室後排看不清楚刻度。按一下把整組圖表搬到畫布的位置、
   * 撐滿實驗台；右欄的滑桿照樣能拉，曲線即時更新。再按一次（或 Esc）搬回右欄。
   * 搬的是同一個 DOM 節點，圖表的繪圖程式不需要知道自己被搬過。
   */
  function updateStageChartBtn() {
    const btn = $("#stage-chart"), root = $("#sim-root");
    if (!btn || !root) return;
    const has = !!root.querySelector(".sim-charts .sim-chart");
    const on = root.classList.contains("stage-chart-big");
    btn.hidden = !has;
    btn.setAttribute("aria-pressed", on ? "true" : "false");
    const label = btn.querySelector("span");
    if (label) label.textContent = on ? "回到實驗" : "放大圖表";
  }
  function toggleStageChart(force) {
    const root = $("#sim-root");
    if (!root) return;
    const stage = root.querySelector(":scope > .sim-stage");
    const charts = root.querySelector(".sim-charts");
    const was = root.classList.contains("stage-chart-big");
    const stacked = getComputedStyle(root).gridTemplateColumns.split(" ").length < 2;
    const on = !!(force == null ? !was : force) && !!stage && !!charts && !stacked && document.body.classList.contains("stage-only");
    let ov = stage && stage.querySelector(":scope > .stage-chart-overlay");
    if (on) {
      if (!ov) {
        ov = el("div", "stage-chart-overlay", stage);
        ov.setAttribute("role", "region"); ov.setAttribute("aria-label", "放大的結果圖");
        const back = el("button", "stage-chart-back", ov); back.type = "button"; back.textContent = "回到實驗畫面（G）";
        back.addEventListener("click", () => toggleStageChart(false));
      }
      ov.appendChild(charts);
      root.classList.add("stage-chart-big");
      scheduleStageFit();     // 右欄少了圖表分頁，重新分組；fitStage 最後會量放大後的圖表
    } else if (was || ov) {
      root.classList.remove("stage-chart-big");
      if (charts) {
        charts.querySelectorAll(".sim-chart").forEach(w => { w._stageMaxH = 0; w._stageMinH = 0; });
        const pane = root.querySelector('.stage-pane[data-pane="charts"]');
        if (pane && charts.parentNode !== pane) pane.appendChild(charts);
      }
      if (ov) ov.remove();
      scheduleStageFit();
    }
    updateStageChartBtn();
  }
  function fitBigCharts() {
    const root = $("#sim-root");
    const charts = root && root.classList.contains("stage-chart-big") && root.querySelector(".stage-chart-overlay > .sim-charts");
    if (!charts) return;
    const wraps = Array.from(charts.querySelectorAll(":scope > .sim-chart"));
    if (!wraps.length) return;
    const cols = Math.max(1, getComputedStyle(charts).gridTemplateColumns.split(" ").length);
    const rows = Math.ceil(wraps.length / cols);
    const gap = parseFloat(getComputedStyle(charts).rowGap) || 10;
    const per = (charts.clientHeight - gap * (rows - 1)) / rows;
    wraps.forEach(w => {
      const c = w.querySelector(":scope > canvas.sim-canvas");
      if (!c) return;
      const chrome = w.getBoundingClientRect().height - c.getBoundingClientRect().height;
      const cap = Math.max(140, Math.floor(per - chrome - 2));
      if (Math.abs((w._stageMaxH || 0) - cap) > 1) { w._stageMaxH = cap; w._stageMinH = 140; refitCanvas(c); }
    });
  }

  function refitCanvas(canvas) {
    const cv = canvas && canvas._labCv;
    if (!cv || typeof cv.refit !== "function" || !canvas.parentNode.getBoundingClientRect().width) return;
    try { cv.refit(); } catch (e) {}
  }

  function fitStage() {
    if (!document.body.classList.contains("stage-only")) return;
    const root = $("#sim-root");
    const side = root && root.querySelector(":scope > .stage-side");
    if (!side) return;
    // 直式／窄螢幕上下排列、可捲動
    const stacked = getComputedStyle(root).gridTemplateColumns.split(" ").length < 2;
    stageFitBusy = true;
    try {
      const dock = root.querySelector(":scope > .stage-dock");
      if (dock) {
        const r = dock.querySelector(".sim-readout-panel");
        dock.hidden = !r || r.hidden || getComputedStyle(r).display === "none" || !r.querySelector(".readout");
      }
      const panes = Array.from(side.querySelectorAll(".stage-pane"));
      panes.forEach(p => {
        p._stageHasContent = Array.from(p.children).some(n => getComputedStyle(n).display !== "none");
      });
      const present = panes.filter(p => p._stageHasContent).map(p => p.dataset.pane);
      const chartWraps = Array.from(side.querySelectorAll(".stage-pane[data-pane='charts'] .sim-chart"));
      const chartCanvas = w => w.querySelector(":scope > canvas.sim-canvas");
      const setChartCap = (cap, min) => chartWraps.forEach(w => {
        const c = chartCanvas(w); if (!c) return;
        w._stageMaxH = cap; w._stageMinH = min;
        refitCanvas(c);
      });

      if (stacked) {
        // 直式／窄螢幕上下排列時沒有「主畫面」可放大，收回右欄
        if (root.classList.contains("stage-chart-big")) toggleStageChart(false);
        side.classList.remove("is-compact", "is-dense", "is-wide", "is-tight", "is-overflowing", "has-tabs");
        root.classList.remove("stage-wide");
        side._stageGroups = [present];
        side.querySelector(".stage-tabs").hidden = true;
        panes.forEach(p => { p.hidden = !p._stageHasContent; });
        setChartCap(0, 0);
        return;
      }

      // 主畫布：扣掉讀數列與畫布卡其他內容後的高度
      const fitMain = () => {
        const stage = root.querySelector(":scope > .sim-stage");
        const visual = stage && stage.querySelector(".sim-visual-panel");
        const main = visual && visual.querySelector(".sim-canvas-wrap > canvas.sim-canvas");
        if (!main) return;
        const wrap = main.parentNode;
        let chrome = 0;
        Array.from(visual.children).forEach(n => {
          if (getComputedStyle(n).display === "none" || getComputedStyle(n).position === "absolute") return;
          if (n === wrap) {
            const cs = getComputedStyle(n);
            chrome += (parseFloat(cs.paddingTop) || 0) + (parseFloat(cs.paddingBottom) || 0);
            Array.from(n.children).forEach(k => {
              if (k === main) return;
              const ks = getComputedStyle(k);
              if (ks.display === "none" || ks.position === "absolute" || ks.position === "fixed") return;
              chrome += k.getBoundingClientRect().height;
            });
          } else {
            const ns = getComputedStyle(n);
            chrome += n.getBoundingClientRect().height + (parseFloat(ns.marginTop) || 0) + (parseFloat(ns.marginBottom) || 0);
          }
        });
        const vs = getComputedStyle(visual);
        chrome += (parseFloat(vs.borderTopWidth) || 0) + (parseFloat(vs.borderBottomWidth) || 0) + (parseFloat(vs.paddingTop) || 0) + (parseFloat(vs.paddingBottom) || 0);
        const cap = Math.floor(stage.clientHeight - chrome - 2);
        if (cap > 0 && Math.abs((wrap._stageMaxH || 0) - cap) > 1) { wrap._stageMaxH = cap; wrap._stageMinH = 160; refitCanvas(main); }
      };

      const tabsBar = side.querySelector(".stage-tabs");
      const has = k => present.includes(k);
      const plans = [];
      const all = [present];
      plans.push({ groups: all, shrink: false });
      if (has("charts")) plans.push({ groups: all, shrink: true, min: 130 });
      if (has("charts") && present.length > 1) {
        const rest = present.filter(k => k !== "charts");
        plans.push({ groups: [rest, ["charts"]], shrink: true, min: 110 });
      }
      if (present.length > 2 || (present.length === 2 && !has("charts"))) plans.push({ groups: present.map(k => [k]), shrink: true, min: 100 });

      const overflow = () => side.scrollHeight - side.clientHeight;
      const applyGroups = groups => {
        side._stageGroups = groups;
        const tabbed = groups.length > 1;
        side.classList.toggle("has-tabs", tabbed);
        tabsBar.hidden = !tabbed;
        side.querySelectorAll(".stage-tab").forEach(t => {
          const g = groups.find(x => x[0] === t.dataset.pane);
          t.hidden = !g;
          if (g) {
            const label = g.map(k => STAGE_PANES.find(p => p.key === k).label).join("・");
            const n = g.includes("charts") ? chartWraps.length : 0;
            t.textContent = label + (n > 1 ? " " + n : "");
          }
        });
      };
      const groupFits = (group, plan) => {
        side.querySelectorAll(".stage-pane").forEach(p => { p.hidden = !p._stageHasContent || !group.includes(p.dataset.pane); });
        if (group.includes("charts") && chartWraps.length) {
          setChartCap(0, 0);
          let over = overflow();
          if (over > 1 && plan.shrink) {
            const heights = chartWraps.map(w => { const c = chartCanvas(w); return c ? c.getBoundingClientRect().height : 0; });
            const cap = Math.floor(Math.max(...heights) - over / chartWraps.length) - 2;
            if (cap < plan.min) return false;
            setChartCap(cap, plan.min);
            over = overflow();
          }
          return over <= 1;
        }
        return overflow() <= 1;
      };
      const DENSITY = [[], ["is-compact"], ["is-compact", "is-dense"]];
      const setDensity = (d, wide, tight) => {
        side.classList.remove("is-compact", "is-dense", "is-wide", "is-tight", "is-overflowing");
        root.classList.toggle("stage-wide", !!wide);
        DENSITY[d].forEach(c => side.classList.add(c));
        if (wide) side.classList.add("is-wide");
        if (tight) side.classList.add("is-tight");
      };

      setDensity(0, false);
      fitMain();
      let chosen = null;
      const tryPlan = (plan, d, wide, tight) => {
        setDensity(d, wide, tight);
        applyGroups(plan.groups);
        const caps = [];
        for (const g of plan.groups) {
          if (!groupFits(g, plan)) return false;
          caps.push(g.includes("charts") ? (chartWraps[0] && chartWraps[0]._stageMaxH) || 0 : null);
        }
        chosen = { plan, d, wide, tight, caps };
        return true;
      };
      outer:
      for (const plan of plans) {
        for (let d = 0; d < DENSITY.length; d++) {
          if (d === 2 && plan.groups.length === 1 && plans.length > 1) continue;
          if (tryPlan(plan, d, false)) break outer;
        }
      }
      if (!chosen) {
        const last = plans[plans.length - 1];
        if (!tryPlan(last, 2, true) && !tryPlan(last, 2, true, true)) {
          // 最後一招：讓分頁自己捲
          chosen = { plan: last, d: 2, wide: true, caps: [], scroll: true };
          setDensity(2, true, true); applyGroups(last.groups);
        }
      }
      side.classList.toggle("is-overflowing", !!chosen.scroll);
      const chartsGroupIndex = chosen.plan.groups.findIndex(g => g.includes("charts"));
      if (chartsGroupIndex >= 0) {
        const cap = chosen.caps[chartsGroupIndex];
        const g = chosen.plan.groups[chartsGroupIndex];
        panes.forEach(p => { p.hidden = !p._stageHasContent || !g.includes(p.dataset.pane); });
        setChartCap(cap || 0, chosen.plan.min || 0);
      }
      fitMain();
      selectStageTab(stageTab, false);
      fitBigCharts();
    } finally {
      requestAnimationFrame(() => {
        stageFitBusy = false;
        // 排版期間內容又變了（例如播放中按鈕文字改變）就再排一次
        if (side.isConnected && side.scrollHeight > side.clientHeight + 1) scheduleStageFit(true);
      });
    }
  }

  /* ---------------------------- 教師演示列 ---------------------------- */
  function updateStageBar(id) {
    const f = byId[id];
    if (!f) return;
    const bar = $("#stage-bar");
    if (bar) bar.style.setProperty("--m-color", f.mod.color);
    const mod = $("#stage-picker-mod"); if (mod) mod.textContent = "模組" + f.mod.no;
    const title = $("#stage-picker-title"); if (title) title.textContent = f.exp.title;
    const count = $("#stage-picker-count");
    if (count) count.textContent = (f.mod.experiments.indexOf(f.exp) + 1) + " / " + f.mod.experiments.length;
    const prev = $("#stage-prev"), next = $("#stage-next");
    if (prev) prev.disabled = !FLAT[f.order - 1];
    if (next) next.disabled = !FLAT[f.order + 1];
  }
  function renderStageMenu(query) {
    const list = $("#stage-menu-list");
    if (!list) return;
    list.innerHTML = "";
    const q = (query || "").trim().toLowerCase();
    let count = 0;
    C.modules.forEach(m => {
      const items = m.experiments.filter(exp => !q || exp.title.toLowerCase().includes(q) || m.title.toLowerCase().includes(q));
      if (!items.length) return;
      const group = el("div", "stage-menu-mod", list);
      group.style.setProperty("--m-color", m.color);
      const head = el("p", "stage-menu-mod-title", group);
      head.innerHTML = "<span>" + String(C.modules.indexOf(m) + 1).padStart(2, "0") + "</span>";
      head.appendChild(document.createTextNode(m.title));
      items.forEach(exp => {
        const item = el("button", "stage-menu-item" + (exp.id === currentId ? " current" : ""), group);
        item.type = "button"; item.textContent = exp.title;
        item.addEventListener("click", () => { closeStageMenu(); location.hash = "#" + exp.id; });
        count++;
      });
    });
    if (!count) { const empty = el("p", "stage-menu-empty", list); empty.textContent = "找不到符合的實驗"; }
  }
  function openStageMenu() {
    const menu = $("#stage-menu"); if (!menu) return;
    const input = $("#stage-menu-input");
    if (input) input.value = "";
    renderStageMenu("");
    menu.hidden = false;
    $("#stage-picker").setAttribute("aria-expanded", "true");
    setTimeout(() => { if (input) input.focus(); }, 0);
  }
  function closeStageMenu() {
    const menu = $("#stage-menu"); if (!menu || menu.hidden) return;
    menu.hidden = true;
    const picker = $("#stage-picker"); if (picker) picker.setAttribute("aria-expanded", "false");
  }
  function toggleStageMenu() { const menu = $("#stage-menu"); if (menu && menu.hidden) openStageMenu(); else closeStageMenu(); }
  function stepStage(delta) {
    const f = currentId && byId[currentId];
    const target = f && FLAT[f.order + delta];
    if (target) location.hash = "#" + target.exp.id;
  }
  function toggleStageFullscreen() {
    try {
      if (document.fullscreenElement) document.exitFullscreen();
      else if (document.documentElement.requestFullscreen) document.documentElement.requestFullscreen().catch(() => {});
    } catch (e) {}
  }

  function closeSidebarMobile() { $("#sidebar").classList.remove("open"); $("#scrim").classList.remove("show"); }
  function toggleSidebar() { $("#sidebar").classList.toggle("open"); $("#scrim").classList.toggle("show"); }

  /*
   * 對話框的鍵盤焦點鎖定
   * 兩個 role="dialog" aria-modal="true" 的面板原本都沒有鎖住 Tab，
   * 鍵盤使用者按幾下就會跑到後面看不見、也點不到的內容上。
   */
  const FOCUSABLE = 'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

  function trapFocus(container, event) {
    if (event.key !== "Tab" || !container) return;
    const items = Array.from(container.querySelectorAll(FOCUSABLE))
      .filter(node => node.offsetParent !== null || node === document.activeElement);
    if (!items.length) return;
    const first = items[0], last = items[items.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  }

  /* ------------------------------- 章節檢核 ------------------------------- */
  function showChapterCheckpoint(mod, nextMod) {
    const questions = MODULE_CHECKPOINTS[mod.id];
    if (!questions || !questions.length) { openExp(pendingChapterTarget); return; }
    checkpointState = { mod, nextMod, questions, index: 0, answers: [], completed: false };
    const root = $("#chapter-checkpoint");
    root.style.setProperty("--checkpoint-color", mod.color);
    root.hidden = false;
    document.body.classList.add("checkpoint-active");
    renderCheckpoint();
    setTimeout(() => $("#checkpoint-panel").focus(), 0);
  }

  function renderCheckpoint() {
    const state = checkpointState;
    const root = $("#checkpoint-content");
    if (!state || !root) return;
    root.innerHTML = "";

    const kicker = el("p", "checkpoint-kicker", root);
    kicker.textContent = "離開前整理 · 模組 " + state.mod.no;
    const title = el("h2", "checkpoint-title", root); title.id = "checkpoint-title";
    title.textContent = state.mod.title + "章節檢核";

    if (state.completed) {
      renderCheckpointResult(root, state);
      return;
    }

    const intro = el("p", "checkpoint-intro", root);
    intro.textContent = "切換到「" + state.nextMod.title + "」前，用 3 題關鍵概念確認這一章已經能帶著走。";
    const progress = el("div", "checkpoint-progress", root);
    const progressLabel = el("span", null, progress); progressLabel.textContent = "第 " + (state.index + 1) + " / " + state.questions.length + " 題";
    const progressBar = el("div", "checkpoint-progress-bar", progress);
    const progressFill = el("div", "checkpoint-progress-fill", progressBar);
    progressFill.style.width = ((state.index + 1) / state.questions.length * 100) + "%";

    const question = state.questions[state.index];
    const questionTitle = el("h3", "checkpoint-question", root); questionTitle.textContent = question.prompt;
    const choices = el("div", "checkpoint-choices", root);
    const selected = state.answers[state.index];
    question.choices.forEach((choice, choiceIndex) => {
      const button = el("button", "checkpoint-choice", choices); button.type = "button";
      button.disabled = selected !== undefined;
      if (selected !== undefined) {
        if (choiceIndex === question.correct) button.classList.add("correct");
        else if (choiceIndex === selected) button.classList.add("incorrect");
      }
      const index = el("span", "checkpoint-choice-index", button); index.textContent = String.fromCharCode(65 + choiceIndex);
      const label = el("span", "checkpoint-choice-label", button); label.textContent = choice;
      button.addEventListener("click", () => {
        if (checkpointState.answers[checkpointState.index] !== undefined) return;
        checkpointState.answers[checkpointState.index] = choiceIndex;
        renderCheckpoint();
      });
    });

    if (selected !== undefined) {
      const feedback = el("p", "checkpoint-feedback", root);
      const correct = selected === question.correct;
      feedback.innerHTML = "<strong>" + (correct ? "答對了。" : "先別急，這題的關鍵是：") + "</strong>" + question.explanation;
    }

    const actions = el("div", "checkpoint-actions", root);
    const skip = el("button", "checkpoint-skip", actions); skip.type = "button"; skip.textContent = "略過檢核，繼續";
    skip.addEventListener("click", () => leaveCheckpoint());
    if (selected !== undefined) {
      const next = el("button", "checkpoint-next", actions); next.type = "button";
      next.textContent = state.index === state.questions.length - 1 ? "查看結果" : "下一題";
      next.addEventListener("click", () => {
        if (checkpointState.index < checkpointState.questions.length - 1) {
          checkpointState.index += 1;
        } else {
          checkpointState.completed = true;
          const score = checkpointState.answers.reduce((total, answer, index) => total + (answer === checkpointState.questions[index].correct ? 1 : 0), 0);
          store.set("pl-checkpoint-" + checkpointState.mod.id, { score, total: checkpointState.questions.length, completedAt: new Date().toISOString() });
        }
        renderCheckpoint();
      });
    }
  }

  function renderCheckpointResult(root, state) {
    const score = state.answers.reduce((total, answer, index) => total + (answer === state.questions[index].correct ? 1 : 0), 0);
    const result = el("div", "checkpoint-result-score", root); result.textContent = score;
    const total = el("span", null, result); total.textContent = " / " + state.questions.length;
    const note = el("p", "checkpoint-result-note", root);
    note.textContent = score === state.questions.length
      ? "三個關鍵判斷都掌握了。帶著這組概念進入下一章吧。"
      : "已記錄本次結果。下面的題目可作為回到這一章時優先複習的起點。";
    const review = el("div", "checkpoint-review", root);
    state.questions.forEach((question, index) => {
      const item = el("div", "checkpoint-review-item", review);
      const correct = state.answers[index] === question.correct;
      item.classList.add(correct ? "correct" : "incorrect");
      item.textContent = (correct ? "已掌握 · " : "待複習 · ") + question.explanation;
    });
    const actions = el("div", "checkpoint-actions", root);
    const next = el("button", "checkpoint-next", actions); next.type = "button";
    next.textContent = "進入「" + state.nextMod.title + "」";
    next.addEventListener("click", () => leaveCheckpoint());
  }

  function leaveCheckpoint() {
    const target = pendingChapterTarget;
    // 略過也要留下記錄，否則每次跨章節都會再被同一組題目攔一次。
    if (checkpointState && !checkpointState.completed) {
      store.set("pl-checkpoint-" + checkpointState.mod.id, { score: null, skipped: true, completedAt: new Date().toISOString() });
    }
    checkpointState = null;
    pendingChapterTarget = null;
    const root = $("#chapter-checkpoint");
    root.hidden = true;
    document.body.classList.remove("checkpoint-active");
    if (target && byId[target]) openExp(target);
  }

  /*
   * 章節檢核該不該跳出來
   * 原本只要跨模組就一定攔一次：用方向鍵翻過章節交界、或回頭複習舊章節，
   * 都會被同一組題目重複打斷。改成三個條件都成立才出現：
   *   1. 這個模組還沒做過檢核（做過就永遠不再打擾）
   *   2. 這個模組確實讀過一定比例，檢核才有意義
   *   3. 是往前推進，不是回頭複習
   */
  const CHECKPOINT_MIN_RATIO = 0.5;

  function checkpointDone(modId) {
    return !!store.get("pl-checkpoint-" + modId, null);
  }

  function shouldShowCheckpoint(currentMod, targetMod) {
    if (!currentMod || !targetMod || currentMod.id === targetMod.id) return false;
    if (stageFlag()) return false;   // 老師上台切實驗時不能跳出學生用的章節小考
    if (checkpointDone(currentMod.id)) return false;
    if (!Array.isArray(MODULE_CHECKPOINTS[currentMod.id]) || !MODULE_CHECKPOINTS[currentMod.id].length) return false;
    const total = currentMod.experiments.length;
    const seen = currentMod.experiments.filter(e => viewed.has(e.id)).length;
    if (!total || seen / total < CHECKPOINT_MIN_RATIO) return false;
    const currentIndex = C.modules.findIndex(m => m.id === currentMod.id);
    const targetIndex = C.modules.findIndex(m => m.id === targetMod.id);
    return targetIndex > currentIndex;
  }

  /* ------------------------------- 路由 ------------------------------- */
  function route() {
    const id = decodeURIComponent(location.hash.replace(/^#/, ""));
    if (!id || id === "home") {
      setStageFlag(false);
      showView("home"); document.title = "生物實驗室｜台灣中學互動生物";
      cancelDwell();
      if (currentSim && currentSim.stop) { try { currentSim.stop(); } catch (e) {} }
      currentSim = null; currentId = null; return;
    }
    const target = byId[id];
    if (!target) { location.hash = ""; return; }
    const current = currentId ? byId[currentId] : null;
    if (shouldShowCheckpoint(current && current.mod, target.mod)) {
      pendingChapterTarget = id;
      if (checkpointState && checkpointState.mod.id === current.mod.id) {
        checkpointState.nextMod = target.mod;
        renderCheckpoint();
      } else {
        showChapterCheckpoint(current.mod, target.mod);
      }
      return;
    }
    openExp(id);
  }

  function startApp() {
    if (initialized) return;
    initialized = true;
    init();
  }

  /* ---------------------------------------------------------------------
     離線與安裝

     實驗程式改成延遲載入之後，Service Worker 也跟著改為「開到才快取」，
     否則一安裝就在背景抓 485 KB，等於把省下的流量又花掉一次。
     真正需要完整離線（例如老師要帶到沒有網路的教室）的人，
     在這裡主動按一次即可，是否要花這個流量由使用者決定。
     --------------------------------------------------------------------- */
  function initOfflineCard() {
    const status = $("#offline-status");
    const cacheBtn = $("#btn-cache-all");
    const installBtn = $("#btn-install");
    const progress = $("#offline-progress");
    const fill = $("#offline-progress-fill");
    const progressText = $("#offline-progress-text");
    if (!status || !cacheBtn) return;

    const supported = "serviceWorker" in navigator && location.protocol.startsWith("http");

    function describe() {
      if (!supported) {
        status.textContent = "這個瀏覽器（或以檔案方式開啟時）不支援離線功能，但所有內容仍可正常使用。";
        cacheBtn.disabled = true;
        return;
      }
      status.textContent = navigator.onLine
        ? "基本內容已可離線使用。按下方按鈕可把全部 " + FLAT.length + " 個實驗一次存起來（壓縮後約 550 KB），之後沒有網路也能開。"
        : "目前沒有網路連線。已經看過的實驗仍可正常開啟。";
    }
    describe();
    window.addEventListener("online", describe);
    window.addEventListener("offline", describe);

    // 連線狀態改變時，在頂欄給一個明確的提示
    function paintConnection() {
      document.body.classList.toggle("is-offline", !navigator.onLine);
    }
    paintConnection();
    window.addEventListener("online", paintConnection);
    window.addEventListener("offline", paintConnection);

    cacheBtn.addEventListener("click", () => {
      if (!supported || !navigator.serviceWorker.controller) {
        status.textContent = "離線功能尚未就緒，請重新整理後再試一次。";
        return;
      }
      cacheBtn.disabled = true;
      progress.hidden = false;
      progressText.textContent = "開始下載…";
      navigator.serviceWorker.controller.postMessage({ type: "cache-all-experiments" });
    });

    if (supported) {
      navigator.serviceWorker.addEventListener("message", event => {
        const data = event.data || {};
        if (data.type === "cache-progress") {
          const pct = Math.round(data.done / data.total * 100);
          fill.style.width = pct + "%";
          progressText.textContent = "已下載 " + data.done + " / " + data.total + " 個檔案";
        }
        if (data.type === "cache-complete") {
          fill.style.width = "100%";
          progressText.textContent = "完成，全部實驗都可以離線使用了。";
          cacheBtn.textContent = "已下載完成";
          try { store.set("pl-offline-cached", true); } catch (e) {}
        }
      });
      if (store.get("pl-offline-cached", false)) {
        cacheBtn.textContent = "已下載完成";
        cacheBtn.disabled = true;
      }
    }

    /*
     * 安裝到主畫面
     * 瀏覽器只在符合條件時才會觸發 beforeinstallprompt，
     * 因此按鈕預設隱藏，等瀏覽器願意才顯示——不做假的安裝引導。
     */
    let deferredPrompt = null;
    window.addEventListener("beforeinstallprompt", event => {
      event.preventDefault();
      deferredPrompt = event;
      if (installBtn) installBtn.hidden = false;
    });
    if (installBtn) {
      installBtn.addEventListener("click", async () => {
        if (!deferredPrompt) return;
        deferredPrompt.prompt();
        try { await deferredPrompt.userChoice; } catch (e) {}
        deferredPrompt = null;
        installBtn.hidden = true;
      });
    }
    window.addEventListener("appinstalled", () => {
      if (installBtn) installBtn.hidden = true;
      status.textContent = "已安裝到主畫面，可以像 App 一樣開啟。";
    });
  }

  /* ------------------------------- 啟動 ------------------------------- */
  function init() {
    auditCurriculum();
    auditCheckpointBank();
    buildSidebar();
    buildHome();
    renderStudyCenter();
    applyTheme(preferredTheme());

    $("#theme-toggle").addEventListener("click", () => {
      applyTheme(document.documentElement.getAttribute("data-theme") === "light" ? "dark" : "light");
    });
    const sideBtn = $("#sidebar-toggle");
    if (sideBtn) {
      applySidebarCollapsed(store.get("pl-sidebar-collapsed", false));
      sideBtn.addEventListener("click", () => {
        applySidebarCollapsed(!document.querySelector(".app").matches('[data-sidebar="collapsed"]'));
      });
    }
    $("#menu-toggle").addEventListener("click", toggleSidebar);
    $("#scrim").addEventListener("click", closeSidebarMobile);
    $("#brand-home").addEventListener("click", () => location.hash = "");
    const stageExit = $("#stage-exit");
    if (stageExit) stageExit.addEventListener("click", exitStageMode);
    const stagePicker = $("#stage-picker");
    if (stagePicker) stagePicker.addEventListener("click", toggleStageMenu);
    const stagePrev = $("#stage-prev"); if (stagePrev) stagePrev.addEventListener("click", () => stepStage(-1));
    const stageNext = $("#stage-next"); if (stageNext) stageNext.addEventListener("click", () => stepStage(1));
    const stageFull = $("#stage-full"); if (stageFull) stageFull.addEventListener("click", toggleStageFullscreen);
    const stageChart = $("#stage-chart"); if (stageChart) stageChart.addEventListener("click", () => toggleStageChart());
    const stageThemeBtn = $("#stage-theme");
    if (stageThemeBtn) stageThemeBtn.addEventListener("click", () => {
      applyTheme(document.documentElement.getAttribute("data-theme") === "light" ? "dark" : "light");
    });
    document.addEventListener("fullscreenchange", () => {
      const label = stageFull && stageFull.querySelector("span");
      if (label) label.textContent = document.fullscreenElement ? "離開全螢幕" : "全螢幕";
    });
    const stageInput = $("#stage-menu-input");
    if (stageInput) {
      stageInput.addEventListener("input", () => renderStageMenu(stageInput.value));
      stageInput.addEventListener("keydown", e => {
        if (e.key === "Enter") { const first = $("#stage-menu-list .stage-menu-item"); if (first) first.click(); }
      });
    }
    document.addEventListener("pointerdown", e => {
      const menu = $("#stage-menu");
      if (menu && !menu.hidden && !menu.contains(e.target) && !e.target.closest("#stage-picker")) closeStageMenu();
    });
    /*
     * 首頁的兩條入口：教師演示版（精簡）與自學完整版（有鷹架）。
     * 進入的是同一批實驗，差別只在 body.demo-mode——sim-core 會據此收起或顯示鷹架。
     * 先把模式寫進 localStorage 並套到 body，再導向第一個實驗；之後進任何實驗都維持這個模式。
     */
    function enterWithMode(demo) {
      document.body.classList.toggle("demo-mode", demo);
      store.set("pl-demo-mode-flag", demo);   // 給 app 端記錄；sim-core 讀的是原始鍵
      try { localStorage.setItem("pl-demo-mode", demo ? "1" : "0"); } catch (e) {}
      setStageFlag(demo);   // 教師演示版＝純實驗台；自學完整版維持原本完整介面
      const last = store.get("pl-last-viewed", "");
      location.hash = "#" + (demo && last && byId[last] ? last : FLAT[0].exp.id);
      // 老師要先挑今天要演示的實驗：進場直接把選單打開
      if (demo) setTimeout(openStageMenu, 60);
    }
    const teacherBtn = $("#enter-teacher");
    if (teacherBtn) teacherBtn.addEventListener("click", () => enterWithMode(true));
    const studentBtn = $("#enter-student");
    if (studentBtn) studentBtn.addEventListener("click", () => enterWithMode(false));
    $("#hero-browse").addEventListener("click", () => ($(".module-section") || $("#module-grid")).scrollIntoView({ behavior: "smooth", block: "start" }));
    $("#btn-reset").addEventListener("click", resetProgress);
    $("#home-export-save").addEventListener("click", exportLearningSave);
    $("#home-import-save").addEventListener("click", () => $("#import-save-file").click());
    $("#import-save-file").addEventListener("change", event => {
      importLearningSave(event.target.files && event.target.files[0]);
      event.target.value = "";
    });
    $("#plan-days").addEventListener("change", () => syncPlanControls(store.get(STUDY_PLAN_KEY, null)));
    $("#btn-create-plan").addEventListener("click", createStudyPlan);
    $("#btn-clear-plan").addEventListener("click", clearStudyPlan);
    $("#btn-next-unseen").addEventListener("click", goNextUnseen);

    // 每個按鍵都掃 237 筆實驗會讓打字卡頓，改成停手後才搜尋。
    const search = $("#search-input");
    let searchTimer = 0;
    search.addEventListener("input", () => {
      clearTimeout(searchTimer);
      searchTimer = setTimeout(() => runSearch(search.value), 140);
    });
    search.addEventListener("keydown", e => {
      if (e.key === "Escape") { search.value = ""; runSearch(""); search.blur(); }
    });

    document.addEventListener("keydown", e => {
      if (checkpointState) {
        if (e.key === "Escape") leaveCheckpoint();
        trapFocus($("#checkpoint-panel"), e);
        return;
      }
      if (document.body.classList.contains("stage-only")) {
        const menu = $("#stage-menu");
        if (menu && !menu.hidden) {
          if (e.key === "Escape") { closeStageMenu(); $("#stage-picker").focus(); }
          return;   // 選單開著時，方向鍵與空白鍵留給搜尋框
        }
        if (e.key === "Escape" && $("#sim-root").classList.contains("stage-chart-big")) { toggleStageChart(false); return; }
        if (e.key === "Escape" && !document.fullscreenElement) { exitStageMode(); return; }
        if (e.target.tagName !== "INPUT" && e.target.tagName !== "TEXTAREA" && !e.repeat) {
          if (e.key === "/") { e.preventDefault(); openStageMenu(); return; }
          if (e.key === "f" || e.key === "F") { e.preventDefault(); toggleStageFullscreen(); return; }
          if ((e.key === "g" || e.key === "G") && $("#stage-chart") && !$("#stage-chart").hidden) { e.preventDefault(); toggleStageChart(); return; }
          if (e.key === "1" || e.key === "2" || e.key === "3") {
            const tab = document.querySelector('#sim-root .stage-tab[data-pane="' + STAGE_PANES[+e.key - 1].key + '"]');
            if (tab && !tab.hidden && !tab.parentNode.hidden) { e.preventDefault(); tab.click(); return; }
          }
        }
      }
      if (e.target.tagName === "INPUT" || e.target.tagName === "SELECT" || e.target.tagName === "TEXTAREA") return;
      if (currentId && $("#exp-view").style.display !== "none") {
        const f = byId[currentId];
        if (e.key === "ArrowRight" && FLAT[f.order + 1]) { location.hash = "#" + FLAT[f.order + 1].exp.id; }
        if (e.key === "ArrowLeft" && FLAT[f.order - 1]) { location.hash = "#" + FLAT[f.order - 1].exp.id; }
        // 空白鍵＝播放／暫停（PhET 慣例）：雙手留在鍵盤上就能推進 demo
        if (e.key === " " && !e.repeat) {
          const playBtn = document.querySelector(".sim-transport-play");
          if (playBtn && !playBtn.hidden) { e.preventDefault(); playBtn.click(); }
        }
        // R＝全部重設；S＝單步。自學與上台都少一次滑鼠移動
        if ((e.key === "r" || e.key === "R") && !e.repeat) {
          const resetBtn = document.querySelector(".sim-transport-reset");
          if (resetBtn && !resetBtn.hidden) { e.preventDefault(); resetBtn.click(); }
        }
        if ((e.key === "s" || e.key === "S") && !e.repeat) {
          const stepBtn = document.querySelector(".sim-transport-btn");
          if (stepBtn && !stepBtn.hidden && !stepBtn.disabled) { e.preventDefault(); stepBtn.click(); }
        }
      }
      // 「/」聚焦搜尋：從任何地方一鍵找實驗
      if ((e.key === "/" || (e.key.toLowerCase() === "k" && (e.ctrlKey || e.metaKey))) && !e.repeat) {
        e.preventDefault();
        const search = $("#search-input");
        if (search) { search.focus(); search.select(); }
      }
      if (e.key === "Escape") closeSidebarMobile();
    });

    let stageResizeTimer = 0;
    window.addEventListener("resize", () => {
      if (!document.body.classList.contains("stage-only")) return;
      clearTimeout(stageResizeTimer);
      stageResizeTimer = setTimeout(scheduleStageFit, 120);
    });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => scheduleStageFit()).catch(() => {});
    window.addEventListener("hashchange", route);
    route();

    // 版本連線時間
    const clock = $("#clock");
    if (clock) {
      const tick = () => { const d = new Date(); clock.textContent = d.toLocaleTimeString("zh-TW", { hour12: false }); };
      tick(); setInterval(tick, 1000);
    }

    // PWA
    if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
      window.addEventListener("load", () => navigator.serviceWorker.register("sw.js").catch(() => {}));
    }
    initOfflineCard();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", startApp);
  else startApp();
})();
