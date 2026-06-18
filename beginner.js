/* ConvergeBeginner — plain-language coaching for users new to archery */
(function (root) {
  "use strict";

  var Eng = root.ConvergeEngine;
  var PHASE_SUB = ["距離・サイトを決める", "的の前でタップ記録", "戻って結果を見る"];

  function isOn(settings) {
    return !settings || settings.beginnerMode !== false;
  }

  function offsetBands(faceD) {
    faceD = faceD || 122;
    if (Eng && Eng.metrics && Eng.metrics.offsetBands) return Eng.metrics.offsetBands(faceD);
    return { softDist: 0.35, strongDist: 0.7 };
  }

  function isCentered(mx, my, faceD) {
    if (Eng && Eng.metrics && Eng.metrics.isCentered) return Eng.metrics.isCentered(mx, my, faceD || 122);
    return Math.abs(mx) <= 0.35 && Math.abs(my) <= 0.35;
  }

  function endLabel(n) {
    return n + "回目（6本ずつ）";
  }

  function arrowProgress(n, pe) {
    return n + "本目 / あと" + (pe - n) + "本";
  }

  /** Short label for beginner mode — no coordinates. */
  function simpleGroup(st, faceD) {
    if (!st || st.n < 1) return "記録しよう";
    if (st.rr > 2.5) return "ばらけています";
    if (st.rr < 1.2 && isCentered(st.mx, st.my, faceD)) return "よく集まっています";
    if (st.rr < 2) return "だいたい集まっています";
    return "ばらけ気味です";
  }

  /** Where the group center landed — headline for return screen. */
  function groupDirection(st, faceD) {
    if (!st || st.n < 1) return "記録しよう";
    var b = offsetBands(faceD);
    var th = b.softDist;
    var thStrong = b.strongDist;
    if (Math.abs(st.my) <= th && Math.abs(st.mx) <= th) return "中心はだいたい真ん中";
    var soft =
      (Math.abs(st.my) > th || Math.abs(st.mx) > th) &&
      Math.abs(st.my) <= thStrong &&
      Math.abs(st.mx) <= thStrong;
    var prefix = soft ? "中心は少し" : "中心は";
    var v = "";
    var h = "";
    if (st.my > th) v = "上";
    else if (st.my < -th) v = "下";
    if (st.mx > th) h = "右";
    else if (st.mx < -th) h = "左";
    return prefix + (v + h);
  }

  /** One-line sight suggestion — meaning before numbers. */
  function simpleSightAction(adv, j) {
    if (j && j.label === "射形優先") return "まずフォームをそろえよう";
    if (j && j.label === "保留") return "もう1回打ってから判断しよう";
    if (!adv || !adv.moves || !adv.moves.length) return "このままサイトを触らなくて大丈夫";
    var m = adv.moves[0];
    if (!m) return "サイトを少し調整";
    var axis = m.axis === "v" ? (m.dir === "上" ? "上" : "下") : m.dir === "右" ? "右" : "左";
    return "サイトを少し" + axis + "へ";
  }

  /** Where the group landed vs center, in words a novice understands. */
  function plainGroup(st, faceD) {
    if (!st || st.n < 1) return "まだ矢がありません";
    var parts = [];
    var th = offsetBands(faceD).softDist;
    if (Math.abs(st.my) <= th && Math.abs(st.mx) <= th) parts.push("だいたい中心に集まっています");
    else {
      if (st.my > th) parts.push("中心より上");
      else if (st.my < -th) parts.push("中心より下");
      if (st.mx > th) parts.push("やや右");
      else if (st.mx < -th) parts.push("やや左");
    }
    if (st.rr > 2.5) parts.push("（ばらつき大きめ）");
    else if (st.rr < 1) parts.push("（よく集まっています）");
    return parts.join("・");
  }

  /**
   * Archery rule in plain words: arrows landed high → move sight up (POI goes down).
   */
  function plainSightMove(m) {
    if (!m) return "";
    if (m.axis === "v") {
      return m.dir === "上"
        ? "矢が上に寄っている → サイトを少し上へ（次は下に寄りやすくなります）"
        : "矢が下に寄っている → サイトを少し下へ（次は上に寄りやすくなります）";
    }
    return m.dir === "右"
      ? "矢が右に寄っている → サイトを少し右へ（次は左に寄りやすくなります）"
      : "矢が左に寄っている → サイトを少し左へ（次は右に寄りやすくなります）";
  }

  function plainMoves(adv) {
    if (!adv || !adv.moves || !adv.moves.length)
      return ["集まりは中心付近です。このままサイトを触らなくて大丈夫です。"];
    return adv.moves.map(plainSightMove);
  }

  var JUDGE_PLAIN = {
    維持: { title: "そのままでOK", body: "中心に十分近いです。サイトは触らず、同じ感覚でもう1回打ってみましょう。" },
    保留: { title: "まだ動かさない", body: "本数が少ないか、まだ傾向がはっきりしません。もう1回（6本）打ってから判断しましょう。" },
    少量: { title: "少しだけ動かす", body: "傾向は見えました。提案どおりに少しだけ動かして、様子を見ましょう。" },
    動かす: { title: "動かしてよい", body: "集まりとデータがそろいました。提案どおりサイトを動かしてみましょう。" },
    射形優先: { title: "まずフォームを", body: "散りが大きいです。サイトより、まず姿勢と引き方をそろえることを優先しましょう。" },
    風考慮: { title: "風の影響あり", body: "風のせいで横にずれている可能性があります。無風のときにまた確認すると安心です。" },
  };

  function plainJudgement(j) {
    if (!j) return null;
    return JUDGE_PLAIN[j.label] || { title: j.label, body: j.text || "" };
  }

  var BIAS_LABEL = {
    u: "上寄り",
    d: "下寄り",
    r: "右寄り",
    l: "左寄り",
    ur: "右上寄り",
    ru: "右上寄り",
    ul: "左上寄り",
    lu: "左上寄り",
    dr: "右下寄り",
    rd: "右下寄り",
    dl: "左下寄り",
    ld: "左下寄り",
  };

  /** Return-screen memory chip — streak of same bias (null if not worth showing). */
  function memoryChipLine(streak, dirKey) {
    if (streak < 2 || !dirKey || dirKey === "c") return null;
    var bias = BIAS_LABEL[dirKey];
    if (!bias) return null;
    return streak + "回連続・" + bias;
  }

  /** Qualitative confidence label from Eng.metrics.confidenceBand tier. */
  function confidenceWords(band) {
    if (band === "high") return "信頼度：高い";
    if (band === "mid") return "信頼度：ふつう";
    return "信頼度：まだ足りない";
  }

  function adviceDisclaimer() {
    return "※判断補助です。サイトを動かす前に射形・安全・コーチの指示を優先してください。";
  }

  function safetyNote() {
    return "サイトを動かす前に射形・安全・コーチの指示を優先してください。";
  }

  function safetyBanner() {
    return "目安です。最終判断は指導者・ルール・安全を優先してください。";
  }

  /** Plain trust line for sight suggestions — shown on return screen. */
  function trustLine(ctx) {
    ctx = ctx || {};
    if (!ctx.needsMove) {
      return "散布から読み取った参考です。動かす必要がなければそのままで大丈夫です。";
    }
    if (ctx.qualityLabel === "低" || (ctx.conf != null && ctx.conf < 50)) {
      return "※参考程度の目安です。もう1回（6本）打ってから動かすのがおすすめです。";
    }
    if (ctx.personal === "今回だけ") {
      return "※今回だけの傾向です。過去と違うので、すぐ動かさずもう1回確認しましょう。";
    }
    if (ctx.gearLevel === "低" && !ctx.hasCalib) {
      return "※散布からの目安です。設定で弓・矢とクリック量を入れると、あなた用に近づきます。";
    }
    if (ctx.hasCalib || ctx.gearLevel === "高" || ctx.personal === "過去と一致") {
      return "※散布とあなたの設定から算出した目安です。最終判断はコーチと射形を優先してください。";
    }
    return "※散布からの目安です。設定のクリック量を入れると精度が上がります。";
  }

  function coachCard(phase, ctx) {
    ctx = ctx || {};
    var cards = {
      home: {
        icon: "①②③",
        title: "3ステップで使います",
        body: "①距離とサイトを入力 → ②的の前で着弾をタップ（6本） → ③弓を置いた場所に戻って集まりとサイトの目安を見る",
      },
      setup: {
        icon: "①",
        title: "射る前の準備",
        body:
          "リングで的までの距離（メートル）を選びます。風がわからなければ真ん中の「無」でOK。サイト＝照準器の目盛り。今見ている数字をメモして入れてください（空欄でも始められます）。",
      },
      record: {
        icon: "②",
        title: "的の前に立って記録",
        body: ctx.zenkin
          ? "全金おめでとう！6本すべて金（9〜10点）です。特別な的が出ました。下のボタンで戻って結果を見ましょう。"
          : ctx.n === 0
            ? "矢が刺さった場所を的の上でタップ。ズレたときは0.4秒以上押し続けると細かく動かせます。"
            : ctx.n < ctx.pe - 1
              ? "あと" + (ctx.pe - ctx.n) + "本タップしたら、下の「6本終わった・戻る」で結果を見られます。"
              : "6本そろいました。下のボタンを押して戻りましょう。",
      },
      return: {
        icon: "③",
        title: ctx.zenkin ? "全金！おつかれさま" : "戻ってから確認",
        body: ctx.zenkin
          ? "6本すべて金ゾーン！的がお祝いモードになっています。" +
            (ctx.plainGroup ? " 集まり：" + ctx.plainGroup : "")
          : ctx.plainGroup
            ? "集まり：" + ctx.plainGroup + (ctx.moveLine ? "。" + ctx.moveLine : "")
            : "左の的で矢の集まりを、右の円でサイトの位置を確認します。間違えたら下の「記録に戻る」で的の前に戻れます。",
      },
      done: {
        icon: "✓",
        title: "おつかれさま",
        body: "今日の合計点です。また練習するときは「練習を始める」からどうぞ。",
      },
    };
    var c = cards[phase];
    if (!c) return "";
    return (
      '<div class="coach-card" data-phase="' +
      phase +
      '">' +
      '<div class="coach-ico">' +
      esc(c.icon) +
      "</div>" +
      '<div class="coach-body"><b>' +
      esc(c.title) +
      "</b><p>" +
      esc(c.body) +
      "</p></div></div>"
    );
  }

  function esc(s) {
    return String(s ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;");
  }

  function phaseSubtitles() {
    return PHASE_SUB;
  }

  function firstArrowToast(n, pe, score) {
    if (n === 1) return "1本目を記録しました！あと" + (pe - 1) + "本です";
    if (n === pe) return "6本そろいました。「6本終わった・戻る」を押して結果を見ましょう";
    return null;
  }

  function zenkinExplain() {
    return "6本すべてが金（黄色リング＝9点か10点）のときだけ、的が特別な見た目になります。";
  }

  function scoreExplain() {
    return "中心の黄点に近いほど高得点。外側の数字が低くなります。";
  }

  root.ConvergeBeginner = {
    isOn: isOn,
    endLabel: endLabel,
    arrowProgress: arrowProgress,
    simpleGroup: simpleGroup,
    groupDirection: groupDirection,
    simpleSightAction: simpleSightAction,
    plainGroup: plainGroup,
    plainSightMove: plainSightMove,
    plainMoves: plainMoves,
    plainJudgement: plainJudgement,
    coachCard: coachCard,
    phaseSubtitles: phaseSubtitles,
    firstArrowToast: firstArrowToast,
    zenkinExplain: zenkinExplain,
    scoreExplain: scoreExplain,
    adviceDisclaimer: adviceDisclaimer,
    safetyNote: safetyNote,
    safetyBanner: safetyBanner,
    trustLine: trustLine,
    memoryChipLine: memoryChipLine,
    confidenceWords: confidenceWords,
  };
})(typeof window !== "undefined" ? window : this);