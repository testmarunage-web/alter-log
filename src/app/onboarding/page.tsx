"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const STEPS = [
  {
    key: "goal",
    question: "あなたが今、最も達成したいことは何ですか？",
    options: [
      "昇進・キャリアアップ",
      "起業・副業の立ち上げ",
      "チームの生産性向上",
      "リーダーシップの強化",
      "自己管理・習慣の改善",
    ],
  },
  {
    key: "industry",
    question: "あなたの業種・職種を教えてください。",
    options: [
      "IT・テクノロジー",
      "コンサルティング・戦略",
      "金融・保険",
      "製造・ものづくり",
      "営業・マーケティング",
      "その他",
    ],
  },
  {
    key: "coachStyle",
    question: "どのようなコーチングスタイルを望みますか？",
    options: [
      "厳格（直接的・容赦ないフィードバック）",
      "共感的（寄り添い・対話を重視）",
      "論理的（データと根拠に基づく分析）",
    ],
  },
  {
    key: "mainChallenge",
    question: "現在、最も悩んでいる課題は何ですか？",
    options: [
      "時間管理・優先順位づけ",
      "意思決定・判断力",
      "チーム・部下のマネジメント",
      "自己モチベーションの維持",
      "コミュニケーション・影響力",
    ],
  },
] as const;

type Answers = {
  goal: string;
  industry: string;
  coachStyle: string;
  mainChallenge: string;
};

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Partial<Answers>>({});
  const [loading, setLoading] = useState(false);

  const current = STEPS[step];
  const selectedValue = answers[current.key as keyof Answers];
  const isLast = step === STEPS.length - 1;

  function handleSelect(value: string) {
    setAnswers((prev) => ({ ...prev, [current.key]: value }));
  }

  async function handleNext() {
    if (!selectedValue) return;

    if (!isLast) {
      setStep((s) => s + 1);
      return;
    }

    // 最終ステップ: APIに送信
    setLoading(true);
    try {
      const res = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(answers),
      });
      if (!res.ok) throw new Error("Failed to save");
      router.push("/chat");
    } catch {
      alert("保存に失敗しました。もう一度お試しください。");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center px-4 py-12">
      {/* プログレスバー */}
      <div className="w-full max-w-lg mb-8">
        <div className="flex justify-between text-xs text-zinc-500 mb-2">
          <span>あなたのAIコーチを設定中</span>
          <span>{step + 1} / {STEPS.length}</span>
        </div>
        <div className="h-1 bg-zinc-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-violet-500 rounded-full transition-all duration-500"
            style={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
          />
        </div>
      </div>

      <Card className="w-full max-w-lg bg-zinc-900/80 border-zinc-800">
        <CardContent className="pt-8 pb-8 px-8">
          <p className="text-xs text-violet-400 font-medium tracking-widest uppercase mb-3">
            Q{step + 1}
          </p>
          <h2 className="text-xl font-semibold text-zinc-100 mb-8 leading-snug">
            {current.question}
          </h2>

          <div className="space-y-3">
            {current.options.map((option) => {
              const selected = selectedValue === option;
              return (
                <button
                  key={option}
                  onClick={() => handleSelect(option)}
                  className={`w-full text-left px-4 py-3 rounded-lg border text-sm transition-all duration-150 ${
                    selected
                      ? "border-violet-500 bg-violet-500/15 text-zinc-100"
                      : "border-zinc-700 bg-zinc-800/50 text-zinc-400 hover:border-zinc-500 hover:text-zinc-200"
                  }`}
                >
                  <span className="flex items-center gap-3">
                    <span
                      className={`w-4 h-4 rounded-full border-2 flex-shrink-0 ${
                        selected ? "border-violet-500 bg-violet-500" : "border-zinc-600"
                      }`}
                    />
                    {option}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="flex justify-between mt-8 gap-3">
            {step > 0 && (
              <Button
                variant="outline"
                className="border-zinc-700 text-zinc-400 hover:bg-zinc-800"
                onClick={() => setStep((s) => s - 1)}
                disabled={loading}
              >
                戻る
              </Button>
            )}
            <Button
              className={`ml-auto bg-violet-600 hover:bg-violet-500 text-white font-semibold px-8 ${
                !selectedValue ? "opacity-40 cursor-not-allowed" : ""
              }`}
              onClick={handleNext}
              disabled={!selectedValue || loading}
            >
              {loading ? "保存中..." : isLast ? "AIコーチを起動する →" : "次へ"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
