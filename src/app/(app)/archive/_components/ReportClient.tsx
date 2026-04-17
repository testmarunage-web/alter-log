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

function Section({
  title,
  children,
  defaultOpen = false,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-white/[0.07] rounded-xl overflow-hidden" style={{ background: "rgba(255,255,255,0.018)" }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-5 py-3.5 text-left"
      >
        <span className="font-mono text-[11px] tracking-[0.15em] text-[#C4A35A]/80 uppercase font-bold">{title}</span>
        <svg
          width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          className="text-[#8A8276]/50 transition-transform duration-200 flex-shrink-0"
          style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)" }}
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>
      <div
        className="overflow-hidden"
        style={{
          maxHeight: open ? "2000px" : "0px",
          opacity: open ? 1 : 0,
          transition: "max-height 0.35s cubic-bezier(0.4,0,0.2,1), opacity 0.25s ease",
        }}
      >
        <div className="px-5 pb-4 pt-0">
          {children}
        </div>
      </div>
    </div>
  );
}

export function ReportClient({ reports }: { reports: ReportData[] }) {
  const [pastOpen, setPastOpen] = useState(false);

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
      {/* ヘッダー */}
      <div>
        <p className="text-[12px] text-[#8A8276]/70 font-mono">
          {formatWeekRange(latest.weekStart, latest.weekEnd)}
        </p>
        <p className="text-[10px] text-[#8A8276]/40 font-mono mt-0.5">
          {latest.journalCount}件のジャーナルから生成
        </p>
      </div>

      {/* 今週の一言 */}
      <Section title="今週の一言" defaultOpen={true}>
        <p className="text-[18px] font-bold text-[#E8D5A0] leading-relaxed">{latest.summary}</p>
      </Section>

      {/* 今週のハイライト */}
      {latest.highlights && (
        <Section title="今週のハイライト" defaultOpen={false}>
          <div className="text-[13px] text-[#E8E3D8]/75 leading-[1.85] whitespace-pre-wrap">{latest.highlights}</div>
        </Section>
      )}

      {/* 先週からの変化 */}
      {latest.changes && (
        <Section title="先週からの変化" defaultOpen={true}>
          <div className="text-[13px] text-[#E8E3D8]/75 leading-[1.85] whitespace-pre-wrap">{latest.changes}</div>
        </Section>
      )}

      {/* Alterからの観察 */}
      {latest.observation && (
        <Section title="Alterからの観察" defaultOpen={false}>
          <div
            className="rounded-lg px-4 py-3"
            style={{ background: "rgba(196,163,90,0.04)", border: "1px solid rgba(196,163,90,0.12)" }}
          >
            <div className="text-[13px] text-[#E8E3D8]/80 leading-[1.85] whitespace-pre-wrap">{latest.observation}</div>
          </div>
        </Section>
      )}

      {/* 過去のレポート */}
      {past.length > 0 && (
        <div>
          <button
            type="button"
            onClick={() => setPastOpen((v) => !v)}
            className="flex items-center gap-2 text-[11px] font-mono tracking-wide text-[#8A8276]/50 hover:text-[#8A8276]/80 transition-colors"
          >
            過去のレポート（{past.length}件）
            <svg
              width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
              className="transition-transform duration-200"
              style={{ transform: pastOpen ? "rotate(180deg)" : "rotate(0deg)" }}
            >
              <path d="M6 9l6 6 6-6" />
            </svg>
          </button>

          <div
            className="overflow-hidden"
            style={{
              maxHeight: pastOpen ? "5000px" : "0px",
              opacity: pastOpen ? 1 : 0,
              transition: "max-height 0.4s cubic-bezier(0.4,0,0.2,1), opacity 0.3s ease",
            }}
          >
            <div className="mt-4 space-y-3">
              {past.map((r) => (
                <PastReportCard key={r.id} report={r} />
              ))}
            </div>
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
        className="w-full flex items-center justify-between px-4 py-3 text-left"
      >
        <div>
          <p className="text-[11px] text-[#8A8276]/60 font-mono">{formatWeekRange(report.weekStart, report.weekEnd)}</p>
          <p className="text-[13px] text-[#E8E3D8]/70 mt-0.5">{report.summary}</p>
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
          maxHeight: open ? "3000px" : "0px",
          opacity: open ? 1 : 0,
          transition: "max-height 0.35s cubic-bezier(0.4,0,0.2,1), opacity 0.25s ease",
        }}
      >
        <div className="px-4 pb-4 space-y-3">
          {report.highlights && (
            <div>
              <p className="font-mono text-[10px] tracking-wide text-[#C4A35A]/60 uppercase mb-1">ハイライト</p>
              <p className="text-[12px] text-[#E8E3D8]/65 leading-relaxed whitespace-pre-wrap">{report.highlights}</p>
            </div>
          )}
          {report.changes && (
            <div>
              <p className="font-mono text-[10px] tracking-wide text-[#C4A35A]/60 uppercase mb-1">変化</p>
              <p className="text-[12px] text-[#E8E3D8]/65 leading-relaxed whitespace-pre-wrap">{report.changes}</p>
            </div>
          )}
          {report.observation && (
            <div>
              <p className="font-mono text-[10px] tracking-wide text-[#C4A35A]/60 uppercase mb-1">観察</p>
              <p className="text-[12px] text-[#E8E3D8]/65 leading-relaxed whitespace-pre-wrap">{report.observation}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
