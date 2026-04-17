"use client";

import { useState } from "react";

interface ReportData {
  id: string;
  weekStart: string;
  weekEnd: string;
  summary: string;
  highlights: string | null;
  changes: string | null;
  observation: string | null;
  journalCount: number;
}

function formatWeekRange(startStr: string, endStr: string): string {
  const start = new Date(startStr + "T12:00:00Z");
  const end = new Date(endStr + "T12:00:00Z");
  const sy = start.getFullYear();
  const sm = start.getMonth() + 1;
  const sd = start.getDate();
  const em = end.getMonth() + 1;
  const ed = end.getDate();
  const weekNum = Math.ceil(sd / 7);
  return `${sy}年${sm}月 第${weekNum}週（${sm}/${sd}〜${em}/${ed}）`;
}

/** 1週分のレポート全セクションを表示するコンポーネント */
function ReportBody({ report }: { report: ReportData }) {
  return (
    <div className="space-y-5">
      {/* サマリー */}
      <div>
        <p className="font-mono text-[10px] tracking-[0.15em] text-[#C4A35A]/70 uppercase font-bold mb-2">今週のサマリー</p>
        <p className="text-[18px] font-bold text-[#E8D5A0] leading-relaxed">{report.summary}</p>
      </div>

      {/* ハイライト */}
      {report.highlights && (
        <div className="rounded-xl border border-white/[0.07] px-5 py-4" style={{ background: "rgba(255,255,255,0.018)" }}>
          <p className="font-mono text-[10px] tracking-[0.15em] text-[#C4A35A]/70 uppercase font-bold mb-2">今週のハイライト</p>
          <div className="text-[13px] text-[#E8E3D8]/75 leading-[1.85] whitespace-pre-wrap">{report.highlights}</div>
        </div>
      )}

      {/* 変化 */}
      {report.changes && (
        <div className="rounded-xl border border-white/[0.07] px-5 py-4" style={{ background: "rgba(255,255,255,0.018)" }}>
          <p className="font-mono text-[10px] tracking-[0.15em] text-[#C4A35A]/70 uppercase font-bold mb-2">先週からの変化</p>
          <div className="text-[13px] text-[#E8E3D8]/75 leading-[1.85] whitespace-pre-wrap">{report.changes}</div>
        </div>
      )}

      {/* 観察 */}
      {report.observation && (
        <div className="rounded-xl border border-[#C4A35A]/12 px-5 py-4" style={{ background: "rgba(196,163,90,0.04)" }}>
          <p className="font-mono text-[10px] tracking-[0.15em] text-[#C4A35A]/70 uppercase font-bold mb-2">Alterからの観察</p>
          <div className="text-[13px] text-[#E8E3D8]/80 leading-[1.85] whitespace-pre-wrap">{report.observation}</div>
        </div>
      )}
    </div>
  );
}

export function ReportClient({ reports }: { reports: ReportData[] }) {
  if (reports.length === 0) {
    return (
      <div className="rounded-xl border border-white/[0.06] px-6 py-10 text-center" style={{ background: "rgba(255,255,255,0.018)" }}>
        <p className="text-[13px] text-[#8A8276]/80 leading-relaxed">
          初回の週次レポートは4/20（日）に届きます。
        </p>
        <p className="text-[11px] text-[#8A8276]/50 mt-2 leading-relaxed">
          十分なジャーナルが記録されている週について、<br />
          1週間の振り返りレポートを自動生成します。
        </p>
      </div>
    );
  }

  const latest = reports[0];
  const past = reports.slice(1);

  return (
    <div className="space-y-8">
      {/* ── 最新の週 ── */}
      <div>
        <p className="text-[13px] text-[#E8E3D8]/70 font-mono mb-1">
          {formatWeekRange(latest.weekStart, latest.weekEnd)}
        </p>
        <p className="text-[11px] text-[#8A8276]/60 font-mono mb-5">
          {latest.journalCount}件のジャーナルから生成
        </p>
        <ReportBody report={latest} />
      </div>

      {/* ── 過去の週 ── */}
      {past.length > 0 && (
        <div>
          <div className="flex items-center gap-3 mb-4">
            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-white/[0.08] to-transparent" />
            <span className="font-mono text-[10px] tracking-[0.2em] text-[#8A8276]/45 uppercase">past reports</span>
            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-white/[0.08] to-transparent" />
          </div>
          <div className="space-y-3">
            {past.map((r) => (
              <PastReportCard key={r.id} report={r} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function PastReportCard({ report }: { report: ReportData }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-xl border border-white/[0.05] overflow-hidden" style={{ background: "rgba(255,255,255,0.012)" }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3.5 text-left"
      >
        <div className="min-w-0">
          <p className="text-[12px] text-[#E8E3D8]/55 font-mono">{formatWeekRange(report.weekStart, report.weekEnd)}</p>
          <p className="text-[13px] text-[#E8E3D8]/70 mt-0.5 truncate">{report.summary}</p>
        </div>
        <svg
          width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          className="text-[#8A8276]/40 transition-transform duration-200 flex-shrink-0 ml-3"
          style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)" }}
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      <div
        className="overflow-hidden"
        style={{
          maxHeight: open ? "5000px" : "0px",
          opacity: open ? 1 : 0,
          transition: "max-height 0.35s cubic-bezier(0.4,0,0.2,1), opacity 0.25s ease",
        }}
      >
        <div className="px-4 pb-4 pt-1">
          <ReportBody report={report} />
        </div>
      </div>
    </div>
  );
}
