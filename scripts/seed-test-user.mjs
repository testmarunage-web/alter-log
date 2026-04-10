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
    content: `なんか今日月曜から気分重くて。先週末に出した提案書、部長から「このままじゃ通らない」ってSlackが来て。それだけ。説明とか何もなくて。自分なりにけっこう時間かけて書いたやつだったから、正直かなりへこんだ。何がよくなかったのかもわかんないし、午後もう一回読み直してみようとは思ってるけど、なんか気分が乗らない。感情的になってもしょうがないのわかってるんだけど、それがまたしんどい。`,
  },
  {
    date: "2026-04-07",
    createdAt: new Date("2026-04-07T04:55:00.000Z"), // JST 13:55
    content: `昼過ぎにもう一回提案書読み返してみた。ROIのとこ、数字が全然なかった。ざっくりしすぎてた。部長が「通らない」って言いたかったのってたぶんそこだと思う。今は「もっと早く言ってくれよ」って気持ちもあるけど、まあそれ言ってもしょうがないか。今週中に数字ちゃんと入れて書き直す。なんか自分、定量化するのいつも後回しにしてるな。苦手ってわけじゃないと思うんだけど、なんか面倒くさいんだよな。`,
  },
  {
    date: "2026-04-07",
    createdAt: new Date("2026-04-07T14:10:00.000Z"), // JST 23:10
    content: `夜になってだいぶ落ち着いてきた。部長への不満も全くないわけじゃないけど、冷静に考えると指摘はそんなに間違ってないと思う。自分が「完成した」と思ってたものが、相手から見たら「穴だらけ」に見えるってのが今日一番の学びかも。明日は数字の補強だけ集中してやる。それだけやれば、あとはなんとかなると思う。`,
  },

  // ── 2026-04-08（火）──
  {
    date: "2026-04-08",
    createdAt: new Date("2026-04-07T22:45:00.000Z"), // JST 07:45
    content: `通勤しながらふと思ったんだけど。昨日ずっと部長への不満持ってたけど、それって「評価されたかった」気持ちが先に来てたからじゃないかなって。仕事の書類なのに、いつの間にか自己表現みたいになってたかもしれない。そういう意味では部長は正しいんだよな。今日は感情切り離して、とにかく数字並べる作業として向き合ってみる。`,
  },
  {
    date: "2026-04-08",
    createdAt: new Date("2026-04-08T12:30:00.000Z"), // JST 21:30
    content: `数字の補強、思ったよりずっとうまくいった。過去3期の売上データと競合の公開資料組み合わせたら、けっこう説得力ある試算できて。途中経過見せたら「これなら行ける」って返ってきた。ほんとにほっとした。なんか「やればできるじゃん」みたいな気持ちもあって。定量化後回しにしてたの、苦手だからじゃなくて面倒だと思ってただけかも。`,
  },

  // ── 2026-04-09（水）──
  {
    date: "2026-04-09",
    createdAt: new Date("2026-04-08T23:50:00.000Z"), // JST 08:50
    content: `今日のミーティングで、後輩のこが発言しにくそうにしてた。自分が話しすぎてるのかなって思って、後半は意識して「どう思う？」って振るようにしたら、けっこうちゃんとした指摘が出てきた。自分が先に答え出す癖、あるかもしれない。チームのアイデア潰してたとしたらまずいな。ちょっと気をつけないといけない。`,
  },
  {
    date: "2026-04-09",
    createdAt: new Date("2026-04-09T05:15:00.000Z"), // JST 14:15
    content: `昼休みぼーっとしてたらまた転職のこと考えてた。今の会社4年いて、そろそろ次どうしようかって問いが定期的に出てくる。でも動機が自分でもよくわかってないんだよな。不満から逃げたいのか、純粋に成長したいのかで全然意味違うし。なんか毎回同じとこでループしてる気がして。週末ちょっとだけ整理してみようかな。`,
  },
  {
    date: "2026-04-09",
    createdAt: new Date("2026-04-09T13:40:00.000Z"), // JST 22:40
    content: `提案書、正式に提出した。上司から「お疲れ様、これで行こう」って返ってきた。月曜のへこみ思うと、ここまで来られたの素直に自分褒めてあげたい。結果より、3日で立て直せたプロセスが良かったと思う。落ち込んでも3日以内に動けるの、自分の強みかもな。`,
  },

  // ── 2026-04-10（木）──
  {
    date: "2026-04-10",
    createdAt: new Date("2026-04-10T00:05:00.000Z"), // JST 09:05
    content: `今日はクライアントの四半期レビューだった。担当者が変わってて、新しい人がけっこう数字に厳しい感じで最初ちょっと緊張した。でも事前に作ってた試算表が効いて、後半は雰囲気よくなった。帰り際に「次回も楽しみにしてます」って言われて、なんか素直に嬉しかった。`,
  },
  {
    date: "2026-04-10",
    createdAt: new Date("2026-04-10T04:20:00.000Z"), // JST 13:20
    content: `帰り道ちょっと寄り道してコーヒー飲みながら考えた。今日なんでうまくいったんだろうって。準備した内容を「説明する」のじゃなくて、相手の反応見ながら「会話する」感じでやってたからかも。一人で考えてるときより、誰かと話してるときのほうが頭が動く気がする。今週のテーマってそこだったのかもな、振り返ると。`,
  },
  {
    date: "2026-04-10",
    createdAt: new Date("2026-04-10T12:45:00.000Z"), // JST 21:45
    content: `夜に後輩からグループチャットで「今日の提案資料、勉強になりました」って来てた。朝に後輩の意見引き出せたこと、商談でも相手に合わせられたこと、なんかいい一日だったな。先週の自分と比べて少し変われたかもしれない。一人でうまくやろうとしすぎてた感じが、ちょっと薄れてる気がする。`,
  },

  // ── 2026-04-11（金）──
  {
    date: "2026-04-11",
    createdAt: new Date("2026-04-10T23:30:00.000Z"), // JST 08:30
    content: `週末前の金曜。今週振り返るとほんとに月曜のへこみが嘘みたいだ。あのとき「自分ダメだ」ってなりかけたのに、結果的には提案書通って、クライアントレビューも成功して、後輩ともいい感じになって。「感情の波が来ても行動止めない」っていうの、今週のテーマだったと思う。意識してやったわけじゃないけど、後から気づいた感じ。`,
  },
  {
    date: "2026-04-11",
    createdAt: new Date("2026-04-11T11:00:00.000Z"), // JST 20:00
    content: `昼に先輩と久しぶりに話した。「最近どう？」って聞かれて今週あったこと話したら、「それ成長してるじゃん」って言われた。自分では「なんとか乗り越えた」くらいの感覚だったから、そう見えるんだってちょっと驚いた。自己評価と他者評価ってずれるんだなあ。もっと外からのフィードバック積極的に取りに行ってもいいかもしれない。`,
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
      daily_note: "対象者は今日、上司からの一言で強い感情的反応を示している。「このままじゃ通らない」というフィードバックを受け、自分への全否定として受け取った節がある。だが注目すべきは、傷ついたまま止まらなかったことだ。当日中に提案書を読み返し、「ROIの根拠が薄い」という課題を自ら特定した。感情と問題解決を並行して動かせる能力が、今日の行動に表れている。夜には「明日は数字の補強だけ集中してやる」という具体的な計画が立てられており、一日のうちに落ち込みから立て直しへの移行が完結している。",
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
      daily_note: "今日の対象者は、昨日の感情的反応を自ら再評価することから始めた。通勤中に「提案書は仕事の道具であり、自己表現ではない」という枠組みの更新を自力で行っている。外部から何かを言われたわけでも、状況が変わったわけでもない。変わったのは対象者自身の認知の枠だけだ。この再フレーミングが当日の行動品質を大きく変えた。数字補強の作業は順調に進み、上司からの肯定的な反応を得た。「やればできる」という気づきが出ているが、それは能力の発見ではなく、認知の枠を変えた結果として見るべきだ。",
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
      daily_note: "今日の対象者は複数の層で観察を行っている。チームへの影響、転職という問い、そして今週の成果。特に転職については「定期的に浮かぶ」と自ら言語化しており、未解決のまま繰り返される問いであることを認識している。だが「不満か成長か」という二項対立のフレームに縛られており、それ以外の可能性への視野が閉じている。今週最も記録に値するのは、ミーティング中に自分の行動を即座に修正した俊敏さだ。内省から行動修正までのタイムラグが極めて短い。この特性は、意識化されれば大きな強みになりうる。",
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
      daily_note: "今日の対象者は、対話の中で自分の力が最もよく出ることを体感している。商談の成功を振り返る中で「説明する」のではなく「会話する」という気づきが生まれた。これは今週の変化の核心に触れている。一人で完結しようとすると縮まり、他者と関わると開く。この特性を今日、対象者は言語化しつつある。後輩からの「勉強になりました」という言葉も、小さな変化の積み重ねとして自ら意味づけしていた。一日の中に複数の肯定的な接点があり、それを受け取る準備が今週の対象者には整ってきている。",
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
      daily_note: "今週全体を俯瞰すると、対象者は月曜の落ち込みから金曜の内省まで、ひとつの弧を描いた。先輩との会話で「成長してるじゃん」と言われたことへの反応として「少し驚いた」という表現が出ている。自己評価と他者評価のギャップを、今日はじめて外部から提示された様子だ。対象者が認識している以上の変化がすでに起きている——この事実を、対象者は今日ようやく外から知った。この種の驚きは、自己像の更新が始まるサインとして記録に値する。",
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
