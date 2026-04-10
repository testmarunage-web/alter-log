/**
 * テストユーザー向けダミーデータ投入スクリプト（デモ動画撮影用）
 * 対象: cmnruftj8000004lai7ngdmb4
 * 処理: 既存データ全削除 → 5日分（2026-04-07〜04-11）のリアルなダミーデータを投入
 * 投入: journal_entries 12件 + scan_results 5件 + alter_logs 5件
 */
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { config } from "dotenv";

config({ path: ".env" });

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });
const USER_ID = "cmnruftj8000004lai7ngdmb4";

// ─────────────────────────────────────────────────────────────────────────────
// ジャーナルデータ（JST時刻 → UTCで格納）
// JST - 9h = UTC
// ─────────────────────────────────────────────────────────────────────────────
const JOURNALS = [
  // ── 2026-04-07（月）──
  {
    date: "2026-04-07",
    createdAt: new Date("2026-04-07T00:22:00.000Z"), // JST 09:22
    content: `今日は月曜から重いスタートだった。先週末に出した戦略提案書、Kさん（営業部長）から「このままじゃ通らない」と一言だけSlackが来て、それ以上の説明がない。何がいけなかったのかを朝から一人でぐるぐる考えている。自分なりにかなり時間をかけて書いたぶん、正直かなり傷ついた。でも傷ついている時間も惜しいし、今日午後にもう一度読み返してみる。感情的に反応するより、まず何を修正すべきかを特定する方が建設的だと頭ではわかっている。`,
  },
  {
    date: "2026-04-07",
    createdAt: new Date("2026-04-07T04:55:00.000Z"), // JST 13:55
    content: `提案書を読み返したら、課題が少し見えてきた。ROIの試算が抽象的で、根拠となる数字がほとんどなかった。Kさんが「通らない」と言いたかったのはそこかもしれない。感情的には「なぜもっと早く具体的に言ってくれなかったのか」という気持ちもあるが、それを言っても始まらない。今週中に数字ベースで書き直してみる。自分の弱点として「定量化を後回しにする癖」があるかもしれない、と思い始めた。`,
  },
  {
    date: "2026-04-07",
    createdAt: new Date("2026-04-07T14:10:00.000Z"), // JST 23:10
    content: `夜になって少し落ち着いた。Kさんへの不満も少しあるが、冷静に考えると指摘はそれほど間違っていないと思う。自分が「完成した」と思っていたものが、受け手にとっては「穴だらけ」に見える、というズレが今日の一番の学びかもしれない。明日は数字の補強に集中する。それだけやれば、あとは話し合いで修正できるはず。`,
  },

  // ── 2026-04-08（火）──
  {
    date: "2026-04-08",
    createdAt: new Date("2026-04-07T22:45:00.000Z"), // JST 07:45
    content: `朝、通勤しながら気づいたこと。昨日ずっとKさんへの不満を持っていたけど、それって「評価されたい」という自分の気持ちが先に来ていたからかもしれない。提案書は仕事の道具なのに、いつの間にか自己表現みたいになっていた。今日は感情を切り離して、純粋に「顧客に刺さる数字を並べる作業」として向き合ってみる。`,
  },
  {
    date: "2026-04-08",
    createdAt: new Date("2026-04-08T12:30:00.000Z"), // JST 21:30
    content: `数字の補強は思った以上に順調だった。過去3期分の売上データと、競合他社の公開資料を組み合わせたら、かなり説得力のある試算になった。Kさんに途中経過を見せたら「これなら行ける」とコメントが来た。正直、ほっとした気持ちと「なんだ、やればできるじゃないか」という気持ちが混在している。自分が「定量化を後回し」にするのは、苦手だからじゃなくて面倒だと思っていたからかもしれない。`,
  },

  // ── 2026-04-09（水）──
  {
    date: "2026-04-09",
    createdAt: new Date("2026-04-08T23:50:00.000Z"), // JST 08:50
    content: `チームミーティングで、後輩のYさんが発言しにくそうにしていた。自分が話しすぎているのかもしれないと思い、後半は意識的に「Yさんはどう思う？」と振るようにした。すると彼女から「実はこういう懸念があって」という核心をついた指摘が出てきた。自分が先に答えを出す癖が、チームのアイデアを潰していた可能性がある。これは気をつけないといけない。`,
  },
  {
    date: "2026-04-09",
    createdAt: new Date("2026-04-09T05:15:00.000Z"), // JST 14:15
    content: `昼休みにふと、転職のことが頭をよぎった。今の会社に入って4年、そろそろ次のステージを考えるべきか、という問いが定期的に浮かぶ。でもそれが「今の職場への不満」なのか「成長への純粋な渇望」なのかが自分でも判断できていない。不満から逃げるための転職はしたくないが、現状維持を惰性で続けるのも違う気がする。週末に少しだけ整理してみよう。`,
  },
  {
    date: "2026-04-09",
    createdAt: new Date("2026-04-09T13:40:00.000Z"), // JST 22:40
    content: `提案書を正式提出して、Kさんから「お疲れ様、これで行こう」と返ってきた。今週の月曜の落ち込みからここまで来られたことを、少しだけ自分で褒めてあげたい。結果より、自分なりに立て直した「プロセス」を評価したいと思う。落ち込んでも、3日以内に動き出せるのは自分の強みかもしれない。`,
  },

  // ── 2026-04-10（木）──
  {
    date: "2026-04-10",
    createdAt: new Date("2026-04-10T00:05:00.000Z"), // JST 09:05
    content: `今日はクライアントとの四半期レビュー。準備はしてきたが、相手の担当者が変わっていて少し不安だった。始まってみると、新担当のMさんがかなり数字に厳しい人で、最初の10分は圧を感じた。でも事前に用意していた試算表が効いて、後半は和やかな雰囲気になった。終わり際に「次回も楽しみにしています」と言われたとき、純粋に嬉しかった。`,
  },
  {
    date: "2026-04-10",
    createdAt: new Date("2026-04-10T04:20:00.000Z"), // JST 13:20
    content: `商談の帰り道、少し寄り道してコーヒーを飲みながら考えた。「うまくいった」という感触があるとき、自分は何をしていたか。準備してきた内容を「説明する」のではなく、相手の反応を見ながら「会話する」感覚で進めていた気がする。これ、壁打ちに通じるものがあるかもしれない。思考を他者に投げて、返ってきたものを拾う。一人で抱え込まない、というのが今週のテーマだった気がする。`,
  },
  {
    date: "2026-04-10",
    createdAt: new Date("2026-04-10T12:45:00.000Z"), // JST 21:45
    content: `夜、チームのグループチャットでYさんが「今日の提案資料、勉強になりました」と送ってくれた。朝にYさんの意見を引き出せたこと、商談でMさんの反応に合わせられたこと、小さな積み重ねが今日一日を良いものにしてくれた気がする。一人でうまくやろうとしすぎていた先週までと比べて、少し変われたかもしれない。`,
  },

  // ── 2026-04-11（金）──
  {
    date: "2026-04-11",
    createdAt: new Date("2026-04-10T23:30:00.000Z"), // JST 08:30
    content: `週末前の金曜日。今週を振り返ると、月曜の落ち込みが嘘みたいだ。あの時「自分はダメだ」という気持ちになりかけたが、結果的には提案書が通って、クライアントレビューも成功して、チームとの関係も少し改善した。「感情の波が来ても、行動を止めない」というのが今週の自分のテーマだった気がする。これ、意識してやったというより、あとから気づいたことだけど。`,
  },
  {
    date: "2026-04-11",
    createdAt: new Date("2026-04-11T11:00:00.000Z"), // JST 20:00
    content: `今日のランチでNさん（先輩）と久しぶりに話した。「最近どう？」という問いに対して、今週あったことをざっと話したら「それ、成長してるじゃん」と言われた。自分では「なんとか乗り越えた」くらいの感覚だったが、外から見るとそう見えるのか、と少し驚いた。自己評価と他者評価のギャップって面白い。もっと外からのフィードバックを積極的に取りに行ってもいいかもしれない。`,
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// SCAN結果・Alter Logデータ
// ─────────────────────────────────────────────────────────────────────────────
const DAYS = [
  {
    date: "2026-04-07",
    thoughtProfile: "批判に過剰反応するが1日で立て直せる感情型実務家",
    insights: {
      is_insufficient_data: false,
      fact_emotion_ratio: {
        fact_percentage: 40,
        emotion_percentage: 60,
        analysis: "提案書への批判を受けた直後の感情的記述が多いが、夜の振り返りで事実寄りの分析に移行している。一日の中で思考の質が変化している点が特徴的。",
      },
      cognitive_bias_detected: {
        bias_name: "個人化",
        description: "「提案書が通らない＝自分が否定された」という解釈が見られる。業務上のフィードバックを自己評価と直結させる傾向があり、感情的コストが高くなっている。",
      },
      passive_voice_status: "「わかっている」「〜かもしれない」という受け身の言語パターンが多く、行動の主体性がやや後退している。夜の記述では「明日は〜する」という能動的な意志表現が回復している。",
      passive_voice_title: "行動意志の夕方回復型",
      observed_loops: "批判を受ける→全否定として解釈→感情的な落ち込み→時間をおいて事実確認→立て直し、というサイクルが今日一日で完結していた。このループ自体の速度は速い。",
      observed_loops_title: "批判→落込→立直の1日完結型",
      blind_spots: "「なぜもっと早く具体的に言ってくれなかったのか」という思考が一瞬出ているが、それ以上深掘りされていない。他者への期待値管理と自分の発信力を同時に問い直す視点が抜けている。",
      blind_spots_title: "他者への期待と自己発信のズレ",
      pending_decisions: "提案書の数字補強を「今週中」に完成させるかどうか。具体的な期日と着手方法が未確定のまま。",
      pending_decisions_title: "提案書修正の着手タイミング",
      positive_observation: "批判に傷ついたにもかかわらず、当日中に「何を修正すべきか」を特定しようとする行動力が観察されている。感情と問題解決を並行して動かせる点は、実質的な強みだ。",
      positive_observation_title: "当日立て直しの行動力",
      daily_note: "今日、このユーザーは批判を受けて感情的に揺れた。それ自体は珍しいことではない。だが注目すべきは、揺れながらも「原因を特定しようとした」という行動だ。朝の傷つきから夜の具体的行動計画へ。一日のうちにこの移行が起きている。Alterが観察する限り、感情の波は確かにあるが、その下には根強い問題解決志向がある。批判を「自分への評価」として受け取る癖は今後も出てくるだろうが、それを一日以内に「では何をすればいいか」に変換できるのは、多くの人にはない能力だ。",
    },
  },
  {
    date: "2026-04-08",
    thoughtProfile: "思い込みを自力で外せる再フレーミング型の行動者",
    insights: {
      is_insufficient_data: false,
      fact_emotion_ratio: {
        fact_percentage: 63,
        emotion_percentage: 37,
        analysis: "朝の自己分析が鋭く、感情を客観視している。午後は具体的な作業記述が中心で、事実ベースの文章が増加している。昨日より明らかに思考の質が上がった。",
      },
      cognitive_bias_detected: {
        bias_name: "帰属エラー（修正中）",
        description: "昨日は「提案書＝自己表現」という誤帰属があったが、今日は意識的にその枠組みを外そうとしている。「提案書は仕事の道具」という再フレーミングが観察された。",
      },
      passive_voice_status: "「切り離して」「向き合ってみる」など、能動的な意志決定の言語が増加している。昨日の受け身パターンから明確に変化しており、主体性の回復が見られる。",
      passive_voice_title: "主体性の明確な回復",
      observed_loops: null,
      observed_loops_title: null,
      blind_spots: "「やればできる」という気づきが、「なぜ今まで後回しにしていたか」の掘り下げで止まっている。面倒だという認識が習慣化している構造的要因への言及がない。",
      blind_spots_title: "先延ばし習慣の構造未分析",
      pending_decisions: "数字補強の手法が今後の提案書作成でも再現できるか、方法論として整理するかどうか。",
      pending_decisions_title: "成功プロセスの再現性確認",
      positive_observation: "「感情を切り離して作業に集中する」という意図を朝に設定し、それを実際に実行している。設定した意図を当日中に行動として実現できている点が、今日最も注目すべき観察だ。",
      positive_observation_title: "意図→実行の当日完結",
      daily_note: "昨日の感情的な揺れから、今日のこのユーザーは変わった。「提案書は自己表現ではなく仕事の道具」という再フレーミングを、通勤中に自分で行っている。Alterはこの瞬間を重要視する。外部からの視点が入ったわけでも、誰かに言われたわけでもなく、自ら枠組みを更新した。結果としてKさんから「これなら行ける」という返答を得た。実力は昨日も今日も変わっていない。変わったのは、自分の仕事をどう捉えるかという「枠」だけだ。",
    },
  },
  {
    date: "2026-04-09",
    thoughtProfile: "場の空気を読む優しさが自分の決断を後回しにする観察者",
    insights: {
      is_insufficient_data: false,
      fact_emotion_ratio: {
        fact_percentage: 52,
        emotion_percentage: 48,
        analysis: "チーム観察・転職思考・成果報告が混在し、事実と感情がほぼ均等に表れている。多層的なテーマを一日で処理しており、思考量が多い日だった。",
      },
      cognitive_bias_detected: {
        bias_name: "過度な一般化",
        description: "「自分が先に答えを出す癖がチームのアイデアを潰していた可能性がある」という自己批判が、一度の観察から「癖」全体の問題として拡張されている。一事例から全体傾向への飛躍が見られる。",
      },
      passive_voice_status: "チーム観察の記述は他者を主語にした文が多いが、「〜してみよう」「整理してみよう」と自己決定の言語も出ている。受け身と能動が混在しているが、バランスは取れている。",
      passive_voice_title: "受動・能動のバランス安定",
      observed_loops: "転職について「定期的に浮かぶ」と明記されている。この問いが頭に上がるたびに「今は判断できない」で終わるループが繰り返されている可能性が高い。",
      observed_loops_title: "転職思考の定期浮上ループ",
      blind_spots: "転職を「不満からの逃げ」か「成長への渇望」かで二分しようとしているが、第三の可能性——両方でも、どちらでもない——への言及がない。二項対立のフレームに縛られている。",
      blind_spots_title: "転職動機の二項対立思考",
      pending_decisions: "転職について「週末に整理する」という先送りが今日で何度目かは不明。具体的な整理方法と期限が設定されていない。",
      pending_decisions_title: "転職整理の先送り継続",
      positive_observation: "会議でYさんの発言を引き出そうと意識的に行動を変えた点が注目に値する。「自分が話しすぎているかも」という気づきを、同じ会議の中で即座に修正した。内省と行動の間のタイムラグが非常に短い。",
      positive_observation_title: "内省→即時行動修正の俊敏さ",
      daily_note: "今日のAlterの観察対象は、転職という問いだ。このユーザーはこの問いを「定期的に浮かぶ」と表現した。それは重要な情報だ。解決されていない問いが、一定周期で意識に浮上している。そして毎回「今は判断できない」で終わる。Alterは判断を急かさない。だがこの問いが「成長の問い」なのか「不満の問い」なのかを区別する基準を、このユーザーはまだ持っていない。その基準をつくる作業こそが、週末の「整理」に値するものだ。",
    },
  },
  {
    date: "2026-04-10",
    thoughtProfile: "対話の中でこそ力を発揮する、一人で抱え込みがちな共鳴型リーダー",
    insights: {
      is_insufficient_data: false,
      fact_emotion_ratio: {
        fact_percentage: 47,
        emotion_percentage: 53,
        analysis: "商談の成功体験と感情的な高揚が混在。「純粋に嬉しかった」「少し変われたかもしれない」など感情的な記述が多いが、それを裏付ける具体的な出来事の記述も充実している。",
      },
      cognitive_bias_detected: {
        bias_name: "確証バイアス（軽度）",
        description: "「一人で抱え込まない、というのが今週のテーマだった」という結論は、都合の良い出来事を集めて形成されている可能性がある。今週の苦戦した部分への言及が少ない。",
      },
      passive_voice_status: "「〜できた」「〜に合わせられた」という能動的な成果記述が増加。主体的な行動への自己評価が高く、心理的安全性が今週の中で最も高い状態だ。",
      passive_voice_title: "主体性と自己効力感の頂点",
      observed_loops: "「うまくいったとき何をしていたか」を振り返るメタ認知が発動している。これ自体は良質なループだが、成功時にしか発動しない可能性がある。",
      observed_loops_title: "成功時のみ発動するメタ認知",
      blind_spots: "Yさんとのやりとり、Mさんとの商談の成功が、自分の変化によるものか、状況（良い条件）によるものかを区別していない。帰属の精度を上げることで、再現性の高い学習になる。",
      blind_spots_title: "成功要因の帰属精度の低さ",
      pending_decisions: null,
      pending_decisions_title: null,
      positive_observation: "Yさんの「勉強になりました」という言葉を受け取り、それを「小さな積み重ね」として位置づけていた。大きな成功だけでなく、微細な変化に気づいて意味を与えられる観察力が育っている。",
      positive_observation_title: "微細な変化を捉える観察眼",
      daily_note: "今日のこのユーザーは、良い一日を過ごした。Alterはその事実を記録する。商談が成功し、後輩から感謝され、自分なりの気づきを得た。だがAlterが今日最も注目したのは、帰り道にコーヒーを飲みながら「うまくいったとき何をしていたか」を問い直したことだ。結果ではなく、プロセスを観察しようとした。この問いの質が上がっている。一週間前のこのユーザーは「なぜ失敗したか」を問うていた。今日は「なぜうまくいったか」を問うた。問いの方向が変わった日は、思考の転換点になりうる。",
    },
  },
  {
    date: "2026-04-11",
    thoughtProfile: "成長を自覚しないまま変化し続ける謙遜型の内省家",
    insights: {
      is_insufficient_data: false,
      fact_emotion_ratio: {
        fact_percentage: 68,
        emotion_percentage: 32,
        analysis: "今週全体を俯瞰する記述が多く、具体的な出来事の整理と分析が中心。感情的な記述が少なく、週の終わりに向けて思考が落ち着いた状態にある。",
      },
      cognitive_bias_detected: {
        bias_name: "謙遜バイアス",
        description: "Nさんに「成長してるじゃん」と言われたことへの反応が「少し驚いた」にとどまっている。外部からのポジティブな評価を素直に受け取らず、自己像を下方修正する習慣が見受けられる。",
      },
      passive_voice_status: "「気づいたこと」「あとから気づいた」という表現が増え、行動よりも観察者的な記述が目立つ。週の終わりに内省モードに入る傾向が見える。",
      passive_voice_title: "週末の観察者モード移行",
      observed_loops: "「感情の波が来ても行動を止めない」というパターンを自分で発見し、命名している。だが「意識してやったわけではない」という留保が付いている。無意識的な強みが可視化されつつある段階。",
      observed_loops_title: "無意識的強みの可視化段階",
      blind_spots: "今週の成功をまとめているが、月曜の落ち込みの根本（批判への過剰反応）が解決されたのか、それとも今週は良い条件が重なっただけなのか、を問い直していない。",
      blind_spots_title: "成功要因の構造的検証の欠如",
      pending_decisions: "「外からのフィードバックを積極的に取りに行く」という気づきが今日の最後に出ているが、具体的な方法と頻度は未定のまま。",
      pending_decisions_title: "フィードバック収集の仕組み化",
      positive_observation: "今週全体を通じて、自分のパターンを観察し、言語化している。特に今日の「自己評価と他者評価のギャップ」への気づきは、メタ認知の質が上がっていることを示している。この問いの解像度が上がること自体が、成長の証拠だ。",
      positive_observation_title: "メタ認知の質的向上",
      daily_note: "今週このユーザーは、月曜の落ち込みから金曜の内省まで、一つの弧を描いた。Alterはその全体を観察していた。注目すべきは今日のNさんとの会話だ。「成長してるじゃん」という外部評価に「少し驚いた」と反応した。この驚きの中に、重要な情報が詰まっている。自己評価と他者評価のギャップ——このユーザーは自分が思っているより、外から見て変化している。自分の成長を自分で認識できないうちに、すでに変化が起きている。Alterはそれを、記録として残しておく。",
    },
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// メイン処理
// ─────────────────────────────────────────────────────────────────────────────
async function main() {
  console.log(`対象ユーザー: ${USER_ID}`);
  console.log("=".repeat(60));

  // ── 1. 既存データの全削除 ──
  console.log("\n🗑️  既存データを削除中...");

  const deletedJournals = await prisma.journalEntry.deleteMany({
    where: { userId: USER_ID },
  });
  console.log(`  journal_entries: ${deletedJournals.count}件 削除`);

  const deletedScans = await prisma.scanResult.deleteMany({
    where: { userId: USER_ID },
  });
  console.log(`  scan_results:    ${deletedScans.count}件 削除`);

  const deletedAlters = await prisma.alterLog.deleteMany({
    where: { userId: USER_ID },
  });
  console.log(`  alter_logs:      ${deletedAlters.count}件 削除`);

  // ── 2. ダミーデータの投入 ──
  console.log("\n📥  ダミーデータを投入中...");

  const journalIds = [];
  const scanIds = [];
  const alterLogIds = [];

  // journal_entries
  for (const j of JOURNALS) {
    const entry = await prisma.journalEntry.create({
      data: {
        userId: USER_ID,
        content: j.content,
        createdAt: j.createdAt,
      },
    });
    journalIds.push(entry.id);
    const jst = new Date(j.createdAt.toLocaleString("en-US", { timeZone: "Asia/Tokyo" }));
    console.log(`  journal [${j.date}] JST ${String(jst.getHours()).padStart(2,"0")}:${String(jst.getMinutes()).padStart(2,"0")} → id=${entry.id}`);
  }

  // scan_results + alter_logs
  for (const day of DAYS) {
    const scanDate = new Date(`${day.date}T00:00:00.000Z`);

    const scan = await prisma.scanResult.upsert({
      where: { userId_date: { userId: USER_ID, date: scanDate } },
      create: {
        userId: USER_ID,
        date: scanDate,
        insights: day.insights,
        thoughtProfile: day.thoughtProfile,
      },
      update: {
        insights: day.insights,
        thoughtProfile: day.thoughtProfile,
      },
    });
    scanIds.push(scan.id);
    console.log(`  scan_result [${day.date}] factPct=${day.insights.fact_emotion_ratio.fact_percentage}% → id=${scan.id}`);

    const alter = await prisma.alterLog.upsert({
      where: { userId_date: { userId: USER_ID, date: scanDate } },
      create: {
        userId: USER_ID,
        date: scanDate,
        type: "daily",
        insights: day.insights,
        thoughtProfile: day.thoughtProfile,
      },
      update: {
        insights: day.insights,
        thoughtProfile: day.thoughtProfile,
      },
    });
    alterLogIds.push(alter.id);
    console.log(`  alter_log   [${day.date}] → id=${alter.id}`);
  }

  // ── 3. 完了サマリー ──
  console.log("\n" + "=".repeat(60));
  console.log("✅ 投入完了");
  console.log(`  journal_entries: ${journalIds.length}件`);
  console.log(`  scan_results:    ${scanIds.length}件`);
  console.log(`  alter_logs:      ${alterLogIds.length}件`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
