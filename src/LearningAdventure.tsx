import {
  BookOpen,
  Check,
  Compass,
  Crown,
  Flame,
  Gem,
  Gift,
  LockKeyhole,
  Sparkles,
  Sun,
  Trophy,
} from "lucide-react";
import { algorithms } from "./algorithms";
import type { LearningState } from "./learning";
import {
  achievements,
  CHEST_XP,
  DAILY_GOAL,
  dailyTreasure,
  learningStats,
  STUDY_XP,
  unlockedAchievements,
} from "./learning";

const icons = {
  sparkles: Sparkles,
  compass: Compass,
  book: BookOpen,
  crown: Crown,
  sun: Sun,
  flame: Flame,
  gift: Gift,
  gem: Gem,
};

export function LearningAdventure({
  state,
  today,
  onClaim,
}: {
  state: LearningState;
  today: string;
  onClaim: () => void;
}) {
  const stats = learningStats(state, today);
  const unlocked = unlockedAchievements(state, today);
  const todayIds = state.days[today]?.algorithms ?? [];
  const recentDays = Array.from({ length: 7 }, (_, i) =>
    new Date(Date.parse(`${today}T00:00:00Z`) - (6 - i) * 86400000).toISOString().slice(0, 10),
  );
  return (
    <>
      <span className="modal-eyebrow">
        <Compass size={16} />
        YOUR LEARNING ADVENTURE
      </span>
      <h2 id="modal-title">学ぶたび、冒険が進む。</h2>
      <p className="modal-description">
        競う相手は昨日の自分。日本時間（JST）で毎日の学びを記録します。
      </p>
      <div className="adventure-hero">
        <div className="hero-gem">
          <Gem size={36} />
        </div>
        <div>
          <span>知識の冒険者</span>
          <h3>LEVEL {stats.level}</h3>
          <p>
            合計 {stats.xp} XP ・次のレベルまで {100 - stats.levelXp} XP
          </p>
          <div className="learning-progress">
            <span style={{ width: `${stats.levelXp}%` }} />
          </div>
        </div>
      </div>
      <div className="adventure-stats">
        <span>
          <Flame size={19} />
          <b>{stats.streak}</b>日連続
        </span>
        <span>
          <BookOpen size={19} />
          <b>{stats.days}</b>日学習
        </span>
        <span>
          <Compass size={19} />
          <b>
            {stats.distinct.length}/{algorithms.length}
          </b>
          種類体験
        </span>
      </div>
      <section className="daily-quest">
        <div>
          <h3>
            <Sun size={17} />
            今日のクエスト
          </h3>
          <span>{today} JST</span>
        </div>
        <p>
          3種類のアルゴリズムを最後まで体験しよう。
          <strong>
            {Math.min(stats.today, DAILY_GOAL)} / {DAILY_GOAL}
          </strong>
        </p>
        <div className="quest-checkpoints">
          {Array.from({ length: DAILY_GOAL }, (_, i) => (
            <span key={i} className={stats.today > i ? "done" : ""}>
              {stats.today > i ? <Check size={20} /> : i + 1}
            </span>
          ))}
        </div>
        <div className="today-algorithms">
          {todayIds.map((id) => (
            <span key={id}>
              <Check size={12} />
              {algorithms.find((a) => a.id === id)?.name}
            </span>
          ))}
          {!todayIds.length && <span>最初のアルゴリズムを体験してみよう。</span>}
        </div>
      </section>
      <section
        className={`treasure-card ${stats.chestReady ? "ready" : ""} ${stats.chestOpened ? "opened" : ""}`}
      >
        <div className="treasure-art" aria-hidden="true">
          <Gift size={43} />
          {stats.chestReady && <Sparkles size={22} />}
        </div>
        <div>
          <h3>{stats.chestOpened ? dailyTreasure(today) : "デイリー宝箱"}</h3>
          <p>
            {stats.chestOpened
              ? `本日の宝物と ${CHEST_XP} XP を獲得しました！`
              : stats.chestReady
                ? "クエスト達成！ 宝箱を開けて報酬を受け取ろう。"
                : `今日のクエストを達成すると、宝物と ${CHEST_XP} XP。`}
          </p>
          <button className="play-button" disabled={!stats.chestReady} onClick={onClaim}>
            {stats.chestOpened ? (
              <Check size={15} />
            ) : stats.chestReady ? (
              <Gift size={15} />
            ) : (
              <LockKeyhole size={15} />
            )}{" "}
            {stats.chestOpened
              ? "受け取り済み"
              : stats.chestReady
                ? "宝箱を開ける"
                : "まだ開けられません"}
          </button>
        </div>
      </section>
      <section className="study-week">
        <h3>最近の7日間</h3>
        <div>
          {recentDays.map((day) => (
            <span
              className={state.days[day] ? "studied" : ""}
              key={day}
              title={`${day}：${state.days[day]?.algorithms.length ?? 0}種類`}
            >
              <span>
                {
                  ["日", "月", "火", "水", "木", "金", "土"][
                    new Date(`${day}T00:00:00Z`).getUTCDay()
                  ]
                }
              </span>
              <i>{state.days[day] ? <Check size={15} /> : day.slice(-2)}</i>
            </span>
          ))}
        </div>
      </section>
      <section className="achievements">
        <div>
          <h3>
            <Trophy size={17} />
            実績
          </h3>
          <span>
            {unlocked.length} / {achievements.length}
          </span>
        </div>
        <div className="achievement-grid">
          {achievements.map((achievement) => {
            const earned = unlocked.includes(achievement.id);
            const Icon = icons[achievement.icon];
            return (
              <div key={achievement.id} className={`achievement ${earned ? "earned" : ""}`}>
                <span className="achievement-icon">
                  {earned ? <Icon size={22} /> : <LockKeyhole size={19} />}
                </span>
                <strong>{achievement.name}</strong>
                <p>{achievement.description}</p>
                <small>{earned ? "達成済み" : "未達成"}</small>
              </div>
            );
          })}
        </div>
      </section>
      <p className="setting-note">
        1種類につき1日1回 {STUDY_XP}{" "}
        XP。再生やステップ操作で最終結果まで到達すると記録します。上限による停止は対象外です。宝箱は1日1個・報酬は固定で、購入要素はありません。記録はこのブラウザーに保存されます。過去の体験済みアルゴリズムは実績に引き継ぎ、XPは新しい学習から加算します。
      </p>
    </>
  );
}
