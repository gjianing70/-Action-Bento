/* ============================================
   Video2Action — i18n
   ============================================ */

const I18N = {
  "zh-CN": {
    lang: "zh-CN", label: "简", htmlLang: "zh-CN",
    header: { title: "行动便当", subtitle: "Action Bento" },
    progress: { label: "学习进度", count: (done, total) => `${done} / ${total}` },
    counter: (total) => `${total} 个待消化`,
    footer: {
      hot: "今日便当 \u00b7 温热中 \ud83d\udd25",
      partial: (p) => `还剩 ${p} 个里程碑待消化 \ud83c\udf59`,
      cleared: "全部消化完毕 \ud83c\udf89",
    },
    toast: "+1 \u2728",
    toastAllDone: "\ud83c\udf71 便当盖合上了！全部消化！",
    categories: { core: "核心原理", demo: "案例演示", biz: "商业变现" },
    linkBar: {
      placeholder: "粘贴链接（视频、文章、博客、网页均可）...",
      analyze: "拆解", analyzing: "分析中...",
      success: (n) => `拆解完成，生成 ${n} 个学习里程碑！`,
      error: "分析失败，请检查链接或 API 设置",
      noKey: "请先在设置中配置 API Key", noLink: "请输入链接",
    },
    settings: {
      title: "\u2699\ufe0f AI 设置", provider: "AI 服务商", apiKey: "API Key",
      endpoint: "API 端点", model: "模型",
      save: "保存设置", saved: "已保存 \u2713",
      testOk: "连接成功 \u2713", testFail: "连接失败",
    },
    empty: { icon: "\ud83d\udccb", text: "还没有学习清单", hint: "粘贴视频或文章链接，AI 自动拆解里程碑" },
    emptyHistory: { icon: "\ud83c\udf31", text: "还没有消化记录", hint: "完成一组内容的全部里程碑后会出现在这里" },
    groupBadge: (n) => `${n} 个里程碑`,
    history: {
      btnActive: "待消化",
      btnHistory: "消化的营养",
      statsPrefix: "已吸收",
      statsSuffix: "个知识里程碑",
      statsMotivation: "知识在生长 \ud83c\udf3f",
    },
    mockMilestones: [
      { id:"ms-001", groupId:"demo-group", order:0, title:"理解费曼学习法的四步框架", action:"用白纸写下一个刚学的概念，尝试教给别人", timestamp:"02:15", category:"core", categoryLabel:"核心原理", source:"费曼学习法完全指南 \u2014 YouTube" },
      { id:"ms-002", groupId:"demo-group", order:1, title:"识别知识盲区并定向回炉", action:"在讲解卡壳时标记该知识点，返回原始资料精读", timestamp:"08:42", category:"core", categoryLabel:"核心原理", source:"费曼学习法完全指南 \u2014 YouTube" },
      { id:"ms-003", groupId:"demo-group", order:2, title:"用类比法简化复杂概念", action:"用生活中的例子来解释抽象概念，写出 3 个类比", timestamp:"15:30", category:"demo", categoryLabel:"案例演示", source:"费曼学习法完全指南 \u2014 YouTube" },
      { id:"ms-004", groupId:"demo-group", order:3, title:"建立知识输出的最小闭环", action:"录一段 60 秒讲解视频发到学习群打卡", timestamp:"22:10", category:"demo", categoryLabel:"案例演示", source:"费曼学习法完全指南 \u2014 YouTube" },
      { id:"ms-005", groupId:"demo-group", order:4, title:"将学习法变为可售卖的知识产品", action:"把拆解笔记整理成 Notion 模板", timestamp:"31:00", category:"biz", categoryLabel:"商业变现", source:"费曼学习法完全指南 \u2014 YouTube" },
    ],
  },

  "zh-TW": {
    lang: "zh-TW", label: "繁", htmlLang: "zh-TW",
    header: { title: "行動便當", subtitle: "Action Bento" },
    progress: { label: "學習進度", count: (done, total) => `${done} / ${total}` },
    counter: (total) => `${total} 個待消化`,
    footer: {
      hot: "今日便當 \u00b7 溫熱中 \ud83d\udd25",
      partial: (p) => `還剩 ${p} 個里程碑待消化 \ud83c\udf59`,
      cleared: "全部消化完畢 \ud83c\udf89",
    },
    toast: "+1 \u2728",
    toastAllDone: "\ud83c\udf71 便當蓋合上了！全部消化！",
    categories: { core: "核心原理", demo: "案例演示", biz: "商業變現" },
    linkBar: {
      placeholder: "貼上連結（影片、文章、部落格、網頁均可）...",
      analyze: "拆解", analyzing: "分析中...",
      success: (n) => `拆解完成，產生 ${n} 個學習里程碑！`,
      error: "分析失敗，請檢查連結或 API 設定",
      noKey: "請先在設定中配置 API Key", noLink: "請輸入連結",
    },
    settings: {
      title: "\u2699\ufe0f AI 設定", provider: "AI 服務商", apiKey: "API Key",
      endpoint: "API 端點", model: "模型",
      save: "儲存設定", saved: "已儲存 \u2713",
      testOk: "連線成功 \u2713", testFail: "連線失敗",
    },
    empty: { icon: "\ud83d\udccb", text: "還沒有學習清單", hint: "貼上影片或文章連結，AI 自動拆解里程碑" },
    emptyHistory: { icon: "\ud83c\udf31", text: "還沒有消化記錄", hint: "完成一組內容的全部里程碑後會出現在這裡" },
    groupBadge: (n) => `${n} 個里程碑`,
    history: {
      btnActive: "待消化",
      btnHistory: "消化的營養",
      statsPrefix: "已吸收",
      statsSuffix: "個知識里程碑",
      statsMotivation: "知識在生長 \ud83c\udf3f",
    },
    mockMilestones: [
      { id:"ms-001", groupId:"demo-group", order:0, title:"理解費曼學習法的四步框架", action:"用白紙寫下一個剛學的概念，嘗試教給別人", timestamp:"02:15", category:"core", categoryLabel:"核心原理", source:"費曼學習法完全指南 \u2014 YouTube" },
      { id:"ms-002", groupId:"demo-group", order:1, title:"識別知識盲區並定向回爐", action:"在講解卡住時標記該知識點，返回原始資料精讀", timestamp:"08:42", category:"core", categoryLabel:"核心原理", source:"費曼學習法完全指南 \u2014 YouTube" },
      { id:"ms-003", groupId:"demo-group", order:2, title:"用類比法簡化複雜概念", action:"用生活中的例子來解釋抽象概念，寫出 3 個類比", timestamp:"15:30", category:"demo", categoryLabel:"案例演示", source:"費曼學習法完全指南 \u2014 YouTube" },
      { id:"ms-004", groupId:"demo-group", order:3, title:"建立知識輸出的最小閉環", action:"錄一段 60 秒講解影片發到學習群打卡", timestamp:"22:10", category:"demo", categoryLabel:"案例演示", source:"費曼學習法完全指南 \u2014 YouTube" },
      { id:"ms-005", groupId:"demo-group", order:4, title:"將學習法變為可售賣的知識產品", action:"把拆解筆記整理成 Notion 模板", timestamp:"31:00", category:"biz", categoryLabel:"商業變現", source:"費曼學習法完全指南 \u2014 YouTube" },
    ],
  },

  en: {
    lang: "en", label: "EN", htmlLang: "en",
    header: { title: "Action Bento", subtitle: "Video2Action" },
    progress: { label: "Learning Progress", count: (done, total) => `${done} / ${total}` },
    counter: (total) => `${total} to digest`,
    footer: {
      hot: "Today\u2019s Bento \u00b7 Still warm \ud83d\udd25",
      partial: (p) => `${p} milestones to digest \ud83c\udf59`,
      cleared: "All clear \u2014 well done! \ud83c\udf89",
    },
    toast: "+1 \u2728",
    toastAllDone: "\ud83c\udf71 Bento sealed! All digested!",
    categories: { core: "Core Concept", demo: "Case Study", biz: "Monetization" },
    linkBar: {
      placeholder: "Paste any link (video, article, blog, webpage)...",
      analyze: "Break Down", analyzing: "Analyzing...",
      success: (n) => `Done! ${n} learning milestones generated.`,
      error: "Analysis failed. Check link or API settings.",
      noKey: "Please set your API Key in Settings first", noLink: "Please enter a link",
    },
    settings: {
      title: "\u2699\ufe0f AI Settings", provider: "AI Provider", apiKey: "API Key",
      endpoint: "API Endpoint", model: "Model",
      save: "Save Settings", saved: "Saved \u2713",
      testOk: "Connected \u2713", testFail: "Connection failed",
    },
    empty: { icon: "\ud83d\udccb", text: "No learning milestones yet", hint: "Paste a video or article link and AI will break it down" },
    emptyHistory: { icon: "\ud83c\udf31", text: "No digested records yet", hint: "Complete all milestones to see them here" },
    groupBadge: (n) => `${n} milestones`,
    history: {
      btnActive: "To Digest",
      btnHistory: "Nutrition Absorbed",
      statsPrefix: "Absorbed",
      statsSuffix: "knowledge milestones",
      statsMotivation: "Knowledge is growing \ud83c\udf3f",
    },
    mockMilestones: [
      { id:"ms-001", groupId:"demo-group", order:0, title:"Understand the 4-Step Feynman Framework", action:"Write a freshly learned concept on paper and try teaching it", timestamp:"02:15", category:"core", categoryLabel:"Core Concept", source:"Feynman Technique Full Guide \u2014 YouTube" },
      { id:"ms-002", groupId:"demo-group", order:1, title:"Identify Knowledge Gaps & Revisit Sources", action:"Mark where you stumble and re-read the original material", timestamp:"08:42", category:"core", categoryLabel:"Core Concept", source:"Feynman Technique Full Guide \u2014 YouTube" },
      { id:"ms-003", groupId:"demo-group", order:2, title:"Simplify with Analogies", action:"Compare abstract concepts to everyday objects, write 3 analogies", timestamp:"15:30", category:"demo", categoryLabel:"Case Study", source:"Feynman Technique Full Guide \u2014 YouTube" },
      { id:"ms-004", groupId:"demo-group", order:3, title:"Build a Minimal Output Loop", action:"Record a 60-second explainer video and share it", timestamp:"22:10", category:"demo", categoryLabel:"Case Study", source:"Feynman Technique Full Guide \u2014 YouTube" },
      { id:"ms-005", groupId:"demo-group", order:4, title:"Turn Learning into a Sellable Product", action:"Package your notes into a Notion template on Gumroad", timestamp:"31:00", category:"biz", categoryLabel:"Monetization", source:"Feynman Technique Full Guide \u2014 YouTube" },
    ],
  },
};

function getSavedLang() { return localStorage.getItem("bento-lang") || "zh-CN"; }
function saveLang(lang) { localStorage.setItem("bento-lang", lang); }
function t(lang) { return I18N[lang] || I18N["zh-CN"]; }
