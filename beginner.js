/* ConvergeBeginner — plain-language coaching for users new to archery */
(function (root) {
  "use strict";

  var PHASE_SUB = ["距離・サイトを決める", "的の前でタップ記録", "戻って結果を見る"];

  function isOn(settings) {
    return !settings || settings.beginnerMode !== false;
  }

  function endLabel(n) {
    return n + "回目（6本ずつ）";
  }

  function arrowProgress(n, pe) {
    return n + "本目 / あと" + (pe - n) + "本";
  }

  /** Where the group landed vs center, in words a novice understands. */
  function plainGroup(st) {
    if (!st || st.n < 1) return "まだ矢がありません";
    var parts = [];
    var th = 0.35;
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

  function coachCard(phase, ctx) {
    ctx = ctx || {};
    var cards = {
      home: {
        icon: "①②③",
        title: "3ステップで使います",
        body: "①弓場で距離とサイトを入力 → ②的の前で刺さった場所をタップ → ③射線（弓を置く場所）に戻って結果を見る",
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
        body:
          (ctx.n === 0
            ? "矢が刺さった場所を的の上でタップ。ズレたときは0.4秒以上押し続けると細かく動かせます。"
            : ctx.n < ctx.pe - 1
              ? "あと" + (ctx.pe - ctx.n) + "本タップしたら、下のボタンで射線に戻れます。"
              : "6本そろいました。下のボタンを押して戻りましょう。"),
      },
      return: {
        icon: "③",
        title: "戻ってから確認",
        body: ctx.plainGroup
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
    if (n === pe) return "6本そろいました。射線に戻ったら下のボタンを押してください";
    return null;
  }

  function scoreExplain() {
    return "中心の黄点に近いほど高得点。外側の数字が低くなります。";
  }

  root.ConvergeBeginner = {
    isOn: isOn,
    endLabel: endLabel,
    arrowProgress: arrowProgress,
    plainGroup: plainGroup,
    plainSightMove: plainSightMove,
    plainMoves: plainMoves,
    plainJudgement: plainJudgement,
    coachCard: coachCard,
    phaseSubtitles: phaseSubtitles,
    firstArrowToast: firstArrowToast,
    scoreExplain: scoreExplain,
  };
})(typeof window !== "undefined" ? window : this);