"use client";

import React, { useEffect, useRef } from "react";
import Link from "next/link";

type CurveConfig = {
  color: string;
  glow: string | null;
  w: number;
  amp: number;
  freq: number;
  spd: number;
  yOff: number;
  ph: number;
};

const CURVES: CurveConfig[] = [
  { color: "rgba(201,168,76,0.22)", glow: "rgba(201,168,76,0.15)", w: 4, amp: 280, freq: 0.0007, spd: 0.2, yOff: 0.08, ph: 0 },
  { color: "rgba(201,168,76,0.08)", glow: null, w: 1.5, amp: 280, freq: 0.0007, spd: 0.2, yOff: 0.08, ph: 0.12 },
  { color: "rgba(232,213,160,0.15)", glow: "rgba(232,213,160,0.1)", w: 3.5, amp: 320, freq: 0.0005, spd: -0.15, yOff: 0.35, ph: 2.2 },
  { color: "rgba(232,213,160,0.05)", glow: null, w: 1.2, amp: 320, freq: 0.0005, spd: -0.15, yOff: 0.35, ph: 2.3 },
  { color: "rgba(201,168,76,0.12)", glow: "rgba(201,168,76,0.08)", w: 3, amp: 240, freq: 0.0009, spd: 0.12, yOff: 0.65, ph: 4.8 },
];

const VIDEO_BORDER_STYLE: React.CSSProperties = {
  border: "1px solid rgba(180,180,190,0.25)",
  boxShadow: "0 0 24px rgba(180,180,190,0.1)",
};

type VideoPlayerProps = {
  src: string;
  ariaLabel: string;
  className?: string;
  style?: React.CSSProperties;
};

function VideoPlayer({ src, ariaLabel, className, style }: VideoPlayerProps) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.muted = true;
    el.play().catch(() => {});
  }, []);
  return (
    <video
      ref={ref}
      autoPlay
      muted
      loop
      playsInline
      aria-label={ariaLabel}
      className={className}
      style={{ ...VIDEO_BORDER_STYLE, ...style }}
    >
      <source src={src} type="video/mp4" />
    </video>
  );
}

function CtaBlock() {
  return (
    <>
      <Link href="/sign-up" className="lp-cta">
        Alter Logを始める
      </Link>
      <div className="mt-4 text-[11px] text-[#6a6358] leading-[1.8] text-center">
        <span>月額¥2,980（税込）</span>
        <span className="mx-2 text-[#3a3632]">|</span>
        <span>7日間全額返金保証</span>
        <p className="text-[10px] text-[#4a4438] mt-0.5">
          返金をご希望の場合は support@alter-log.com までご連絡ください。
        </p>
      </div>
    </>
  );
}

export default function LPClient() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Canvas flowing curves
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let W = 0, H = 0, sY = 0, t = 0;
    let rafId: number;

    function resize() {
      W = canvas!.width = window.innerWidth;
      H = canvas!.height = Math.max(
        document.documentElement.scrollHeight,
        window.innerHeight * 5
      );
    }

    function onScroll() {
      sY = window.pageYOffset;
    }

    function drawCurve(cv: CurveConfig) {
      const baseY = H * cv.yOff;
      const scrollShift = sY * 0.12;
      ctx!.beginPath();
      ctx!.strokeStyle = cv.color;
      ctx!.lineWidth = cv.w;
      if (cv.glow) {
        ctx!.shadowColor = cv.glow;
        ctx!.shadowBlur = 40;
      } else {
        ctx!.shadowBlur = 0;
      }
      for (let x = -20; x <= W + 20; x += 3) {
        const y =
          baseY +
          Math.sin(x * cv.freq + t * cv.spd + cv.ph) * cv.amp +
          Math.sin(x * cv.freq * 0.35 + t * cv.spd * 0.65 + cv.ph * 1.8) * (cv.amp * 0.4) +
          Math.cos(x * cv.freq * 0.12 + t * cv.spd * 0.25) * (cv.amp * 0.12) +
          scrollShift;
        if (x === -20) ctx!.moveTo(x, y);
        else ctx!.lineTo(x, y);
      }
      ctx!.stroke();
      ctx!.shadowBlur = 0;
    }

    function frame() {
      ctx!.clearRect(0, 0, W, H);
      CURVES.forEach(drawCurve);
      t += 0.01;
      rafId = requestAnimationFrame(frame);
    }

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", resize);
    resize();
    frame();

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", resize);
    };
  }, []);

  // Scroll reveal
  useEffect(() => {
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("vis");
            obs.unobserve(e.target);
          }
        });
      },
      { threshold: 0.08 }
    );
    document.querySelectorAll(".rv,.rv-l,.rv-r,.rv-s").forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  }, []);

  return (
    <div className="lp-root">
      {/* ── Canvas Background ── */}
      <canvas
        ref={canvasRef}
        style={{ position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none" }}
      />

      {/* ── Header ── */}
      <header
        className="fixed top-0 inset-x-0 z-50"
        style={{
          background: "rgba(5,5,7,0.55)",
          backdropFilter: "blur(32px) saturate(1.4)",
          borderBottom: "1px solid rgba(255,255,255,0.03)",
        }}
      >
        <div className="max-w-[1200px] mx-auto px-6 sm:px-10 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 group">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="#C9A84C" strokeWidth="0.8" opacity="0.45" />
              <circle cx="12" cy="12" r="4" fill="#C9A84C" opacity="0.65" />
              <circle cx="12" cy="12" r="1.5" fill="#050507" />
            </svg>
            <span className="heading text-[15px] tracking-normal text-[#E2D1A0] group-hover:text-[#C9A84C] transition-colors">
              Alter Log
            </span>
          </Link>
          <Link
            href="/sign-in"
            className="text-[10px] font-medium tracking-[0.12em] uppercase px-5 py-2 rounded-full text-[#6a6358] hover:text-[#d4cfc2] transition-all"
            style={{ border: "1px solid rgba(255,255,255,0.06)" }}
          >
            ログイン
          </Link>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="relative z-[1] flex items-center px-6 sm:px-10 pt-20">
        <div className="w-full max-w-[1200px] mx-auto grid grid-cols-1 lg:grid-cols-[1fr_1.1fr] gap-8 lg:gap-6 items-center py-4 sm:py-10">
          {/* テキスト: スマホ中央揃え、PC左揃え */}
          <div className="text-center lg:text-left">
            <h1 className="rv">
              <span className="heading block text-[2.6rem] sm:text-[3.6rem] lg:text-[4.6rem] leading-[0.95] text-white">
                あなた以上に、<br />あなたを知る。
              </span>
            </h1>
            <p
              className="heading text-[1.3rem] sm:text-[1.8rem] lg:text-[2.2rem] leading-[1.2] text-[#C9A84C] mt-4 rv"
              style={{ transitionDelay: "0.1s" }}
            >
              「究極の客観視」を手に入れる。
            </p>
            <p
              className="mt-6 text-[#6a6358] text-[13px] sm:text-[14px] leading-[2] font-light max-w-md mx-auto lg:mx-0 rv"
              style={{ transitionDelay: "0.2s" }}
            >
              溜め込んだ思考や感情を、そのまま吐き出してみませんか？専属AI「Alter」があなたの言葉を静かに受け止め、無意識のパターンを解き明かします。
            </p>
            <div
              className="mt-8 flex flex-col items-center lg:items-start rv"
              style={{ transitionDelay: "0.3s" }}
            >
              <CtaBlock />
            </div>
          </div>

          {/* Hero動画: PCのみ表示、カード枠なし */}
          <div className="hidden lg:flex relative rv-r justify-center" style={{ transitionDelay: "0.3s" }}>
            <VideoPlayer
              src="/videos/alterlog.mp4"
              ariaLabel="Alter Log画面"
              style={{
                display: "block",
                height: "520px",
                width: "auto",
                borderRadius: "16px",
                boxShadow: "0 48px 120px rgba(0,0,0,0.65), 0 0 40px rgba(180,180,190,0.12)",
              }}
            />
          </div>
        </div>
      </section>

      {/* ── Problem ── */}
      <section className="relative z-[1] py-16 sm:py-28 px-6 sm:px-10">
        <div className="max-w-[580px] mx-auto text-center rv">
          <h2 className="heading text-[1.8rem] sm:text-[2.8rem] text-white leading-[1.15]">
            <span style={{ whiteSpace: "nowrap" }}>「自分の思考」という密室から、</span><br />
            <span style={{ whiteSpace: "nowrap" }}>抜け出そう。</span>
          </h2>
          <div className="mt-8 space-y-2 text-[13px] sm:text-[14px] text-[#6a6358] leading-[2.2] font-light">
            <p>思考を整理するために日記やジャーナリングを試しても、結局自分の枠を出られない。</p>
            <p>一人で内省を繰り返しても、同じ悩みをループし、自分自身を客観視するには限界がある。</p>
            <p>かといって、プロのコーチングを受けるのはハードルが高い。</p>
          </div>
          <p className="heading text-[1.3rem] sm:text-[1.9rem] text-[#C9A84C] mt-12 leading-[1.3]">
            Alter Log ── それは「<span style={{ whiteSpace: "nowrap" }}>ジャーナリング2.0</span>」。
          </p>
        </div>
      </section>

      {/* ── Features ── */}
      <section className="relative z-[1] pb-16 px-6 sm:px-10">
        <div className="max-w-[1100px] mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

            {/* Feature 01 */}
            <div className="rv-l flex justify-center md:block">
              <div className="img-card w-full max-w-[75vw] md:max-w-full">
                <VideoPlayer
                  src="/videos/recording.mp4"
                  ariaLabel="ジャーナル入力画面"
                  className="w-full"
                  style={{ aspectRatio: "3/4", objectFit: "cover", objectPosition: "top" }}
                />
                <div
                  className="p-6"
                  style={{ border: "1px solid rgba(180,180,190,0.25)", background: "#0c0d12", paddingTop: "24px" }}
                >
                  <p className="mono text-[#C9A84C] opacity-40 text-[10px] tracking-[0.2em] uppercase mb-2">
                    Feature 01
                  </p>
                  <h3 className="heading text-[1.1rem] text-white leading-[1.2] mb-3">
                    言葉にならないモヤモヤも、<br />そのまま受け止める。
                  </h3>
                  <p className="text-[12px] text-[#8a8276] leading-[2] font-light">
                    綺麗な文章は不要です。思い浮かんだ感情やまとまらない思考を、そのまま打ち明けてください。Alterが静かに聞き入れます。
                  </p>
                </div>
              </div>
            </div>

            {/* Feature 02 */}
            <div className="rv flex justify-center md:block" style={{ transitionDelay: "0.1s" }}>
              <div className="img-card w-full max-w-[75vw] md:max-w-full">
                <VideoPlayer
                  src="/videos/scan.mp4"
                  ariaLabel="SCAN分析画面"
                  className="w-full"
                  style={{ aspectRatio: "3/4", objectFit: "cover", objectPosition: "top" }}
                />
                <div
                  className="p-6"
                  style={{ border: "1px solid rgba(180,180,190,0.25)", background: "#0c0d12", paddingTop: "24px" }}
                >
                  <p className="mono text-[#C9A84C] opacity-40 text-[10px] tracking-[0.2em] uppercase mb-2">
                    Feature 02
                  </p>
                  <h3 className="heading text-[1.1rem] text-white leading-[1.2] mb-3">
                    忖度ゼロの「鏡」が、<br />ハッとする気づきをくれる。
                  </h3>
                  <p className="text-[12px] text-[#8a8276] leading-[2] font-light">
                    Alterにはあなたへの遠慮がありません。何気ない言葉から「無意識のバイアス」を抽出し、あなた自身すら気づいていない真実を突きつけます。
                  </p>
                </div>
              </div>
            </div>

            {/* Feature 03 */}
            <div className="rv-r flex justify-center md:block" style={{ transitionDelay: "0.2s" }}>
              <div className="img-card w-full max-w-[75vw] md:max-w-full">
                <VideoPlayer
                  src="/videos/alterlog.mp4"
                  ariaLabel="Alter Log観察日記画面"
                  className="w-full"
                  style={{ aspectRatio: "3/4", objectFit: "cover", objectPosition: "top" }}
                />
                <div
                  className="p-6"
                  style={{ border: "1px solid rgba(180,180,190,0.25)", background: "#0c0d12", paddingTop: "24px" }}
                >
                  <p className="mono text-[#C9A84C] opacity-40 text-[10px] tracking-[0.2em] uppercase mb-2">
                    Feature 03
                  </p>
                  <h3 className="heading text-[1.1rem] text-white leading-[1.2] mb-3">
                    あなたが眠る間に書き上げられる<br />「あなたの観察日記」
                  </h3>
                  <p className="text-[12px] text-[#8a8276] leading-[2] font-light">
                    深夜、Alterは「あなたについての観察日記」を書き上げます。翌朝、自分の脳内を他人のように客観視する未知の体験が始まります。
                  </p>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ── Comparison ── */}
      <section
        className="relative z-[1] py-16 sm:py-28 px-6 sm:px-10"
        style={{ borderTop: "1px solid rgba(201,168,76,0.06)" }}
      >
        <div className="max-w-[880px] mx-auto rv">
          <h2 className="heading text-[1.8rem] sm:text-[2.4rem] text-center text-white mb-14 leading-[1.15]">
            自分と向き合うための、新しい選択肢。
          </h2>
          <div className="overflow-x-auto pb-2">
            <table className="w-full min-w-[640px] border-collapse">
              <thead>
                <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                  <th className="py-4 px-4 w-[22%]" />
                  <th className="py-4 px-4 w-[26%] text-center gold-col rounded-t-xl">
                    <span className="heading text-[#C9A84C] text-[13px]">Alter Log</span>
                  </th>
                  <th className="py-4 px-4 w-[26%] text-center">
                    <span className="text-[#4a4438] text-[10px] tracking-[0.08em] uppercase">手書きの日記</span>
                  </th>
                  <th className="py-4 px-4 w-[26%] text-center">
                    <span className="text-[#4a4438] text-[10px] tracking-[0.08em] uppercase">プロのコーチング</span>
                  </th>
                </tr>
              </thead>
              <tbody className="text-[14px]">
                <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
                  <td className="py-5 px-4 text-[#d4cfc2] font-medium">心理的安全性</td>
                  <td className="py-5 px-4 text-center text-[#C9A84C] font-semibold gold-col">◎ 一切の評価・ジャッジなし</td>
                  <td className="py-5 px-4 text-center text-[#6a6358] font-light">◎ 誰にも見られない</td>
                  <td className="py-5 px-4 text-center text-[#6a6358] font-light">△ 人の目が気になる</td>
                </tr>
                <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
                  <td className="py-5 px-4 text-[#d4cfc2] font-medium">新しい気づき</td>
                  <td className="py-5 px-4 text-center text-[#C9A84C] font-semibold gold-col">◎ Alterが思考の癖を指摘</td>
                  <td className="py-5 px-4 text-center text-[#6a6358] font-light">△ 思考が堂々巡りになる</td>
                  <td className="py-5 px-4 text-center text-[#6a6358] font-light">◎ プロの視点が得られる</td>
                </tr>
                <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
                  <td className="py-5 px-4 text-[#d4cfc2] font-medium">手軽さ・即時性</td>
                  <td className="py-5 px-4 text-center text-[#C9A84C] font-semibold gold-col">◎ ベッドや移動中、スマホ1つで</td>
                  <td className="py-5 px-4 text-center text-[#6a6358] font-light">△ ノートを持ち歩く手間</td>
                  <td className="py-5 px-4 text-center text-[#6a6358] font-light">× 予約と日程調整が必要</td>
                </tr>
                <tr>
                  <td className="py-5 px-4 text-[#d4cfc2] font-medium">継続しやすさ</td>
                  <td className="py-5 px-4 text-center text-[#C9A84C] font-semibold gold-col rounded-b-xl">◎ 新たな気づきがあるから続く</td>
                  <td className="py-5 px-4 text-center text-[#6a6358] font-light">× 3日で白紙に戻りがち</td>
                  <td className="py-5 px-4 text-center text-[#6a6358] font-light">△ 高額な費用がネックに</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div className="text-center mt-14">
            <div
              className="inline-flex items-center gap-3 px-8 py-4 rounded-2xl"
              style={{ border: "1px solid rgba(201,168,76,0.3)", background: "rgba(201,168,76,0.06)" }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#C9A84C" strokeWidth="1.5">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
              <span className="text-[15px] text-[#E2D1A0] font-bold tracking-[0.04em]">7日間全額返金保証</span>
            </div>
            <p className="mt-4 text-[13px] text-[#6a6358] font-light">
              お申し込みから7日以内にご満足いただけなければ、理由を問わず全額返金いたします。返金をご希望の場合は support@alter-log.com までご連絡ください。
            </p>
          </div>
        </div>
      </section>

      {/* ── Steps ── */}
      <section
        className="relative z-[1] py-16 sm:py-28 px-6 sm:px-10"
        style={{ background: "linear-gradient(180deg,rgba(12,13,18,0.5),#050507)" }}
      >
        <div className="max-w-[600px] mx-auto rv">
          <h2 className="heading text-[1.8rem] sm:text-[2.4rem] text-center text-white leading-[1.15] mb-4">
            始めるのは簡単。<br className="sm:hidden" />気づきは、すぐに。
          </h2>
          <p className="text-center text-[13px] text-[#4a4438] font-light mb-14">
            登録からわずか数日で、変化を実感できます。
          </p>
          <div className="space-y-12">
            {/* Step 1 */}
            <div className="flex gap-6 items-start">
              <div
                className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center"
                style={{ border: "1.5px solid rgba(201,168,76,0.35)" }}
              >
                <span className="heading text-[#C9A84C] text-[14px]">1</span>
              </div>
              <div className="flex-1">
                <h3 className="heading text-[1.1rem] text-white mb-2">思考を吐き出す</h3>
                <p className="text-[12.5px] text-[#6a6358] leading-[2] font-light">
                  頭の中のモヤモヤを、テキストでも音声でも、そのままジャーナルに。整える必要はありません。Alterが全てを静かに受け止めます。
                </p>
                <div className="mt-4 img-card">
                  <VideoPlayer src="/videos/journal.mp4" ariaLabel="ジャーナル入力画面" className="w-full" />
                </div>
              </div>
            </div>
            {/* Step 2 */}
            <div className="flex gap-6 items-start">
              <div
                className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center"
                style={{ border: "1.5px solid rgba(201,168,76,0.35)" }}
              >
                <span className="heading text-[#C9A84C] text-[14px]">2</span>
              </div>
              <div className="flex-1">
                <h3 className="heading text-[1.1rem] text-white mb-2">究極の客観視を手に入れる</h3>
                <p className="text-[12.5px] text-[#6a6358] leading-[2] font-light">
                  Alterがジャーナルを読み解き、思考の構造を分析。あなた専用の「観察日記」と「思考プロファイル」で、自分を他人のように見つめる体験が始まります。
                </p>
                <div className="mt-4 img-card">
                  <VideoPlayer src="/videos/alterlog.mp4" ariaLabel="Alter Log画面" className="w-full" />
                </div>
              </div>
            </div>
            {/* Step 3 */}
            <div className="flex gap-6 items-start">
              <div
                className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center"
                style={{ border: "1.5px solid rgba(201,168,76,0.35)" }}
              >
                <span className="heading text-[#C9A84C] text-[14px]">3</span>
              </div>
              <div className="flex-1">
                <h3 className="heading text-[1.1rem] text-white mb-2">続けるほど、変化が見える</h3>
                <p className="text-[12.5px] text-[#6a6358] leading-[2] font-light">
                  ムードマップやワードクラウドで、過去の自分と今の自分を比較。1週間前には見えなかった自分の変化に気づく瞬間が訪れます。
                </p>
                <div className="mt-4 img-card">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/images/screenshot-dashboard.jpg"
                    alt="ダッシュボード画面"
                    className="w-full"
                    style={{
                      border: "1px solid rgba(180,180,190,0.25)",
                      boxShadow: "0 0 24px rgba(180,180,190,0.1)",
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section className="relative z-[1] py-24 sm:py-40 px-6 sm:px-10 text-center overflow-hidden">
        <div className="relative z-10 max-w-2xl mx-auto rv">
          <h2 className="heading text-[2.4rem] sm:text-[3.5rem] md:text-[4.5rem] text-white leading-[1.05]">
            本当の自分と、<br />
            <span style={{ whiteSpace: "nowrap" }}>もう一度出会う場所。</span>
          </h2>
          <p className="mt-6 text-[#6a6358] text-[13px] font-light">
            あなたを最も理解するAlterが、ここで待っています。
          </p>
          <div className="mt-12 flex flex-col items-center">
            <CtaBlock />
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer
        className="relative z-[1] py-14 px-6 sm:px-10"
        style={{ borderTop: "1px solid rgba(255,255,255,0.025)" }}
      >
        <div className="max-w-[1100px] mx-auto flex flex-col items-center gap-6">
          <span className="heading text-[12px] text-[#C9A84C] opacity-25">Alter Log</span>
          <div className="flex flex-wrap justify-center gap-7 text-[10px] text-[#4a4438] font-light tracking-[0.05em]">
            <Link href="/terms" className="hover:text-[#d4cfc2] transition-colors">利用規約</Link>
            <Link href="/privacy" className="hover:text-[#d4cfc2] transition-colors">プライバシーポリシー</Link>
            <Link href="/tokushoho" className="hover:text-[#d4cfc2] transition-colors">特定商取引法に基づく表記</Link>
          </div>
          <p className="text-[9px] text-[#4a4438] opacity-40">© 2026 Alter Log. All Rights Reserved.</p>
        </div>
      </footer>
    </div>
  );
}
