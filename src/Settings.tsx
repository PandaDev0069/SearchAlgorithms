import {
  Accessibility,
  Check,
  Columns2,
  LayoutList,
  Maximize2,
  Monitor,
  Moon,
  Palette,
  RotateCcw,
  SlidersHorizontal,
  Sun,
  Type,
} from "lucide-react";
import type { Preferences } from "./preferences";
import { defaultPreferences } from "./preferences";

export function Settings({
  value,
  onChange,
}: {
  value: Preferences;
  onChange: (patch: Partial<Preferences>) => void;
}) {
  return (
    <>
      <span className="modal-eyebrow">
        <SlidersHorizontal size={16} />
        MAKE IT YOURS
      </span>
      <h2 id="modal-title">自分に合った学習環境へ。</h2>
      <p className="modal-description">
        変更はすぐ反映され、このブラウザーに保存されます。
      </p>
      <fieldset className="settings-group">
        <legend>
          <Palette size={16} />
          テーマと色
        </legend>
        <div className="theme-choices">
          {(
            [
              { id: "system", label: "システム", icon: Monitor },
              { id: "light", label: "ライト", icon: Sun },
              { id: "dark", label: "ダーク", icon: Moon },
              { id: "paper", label: "ペーパー", icon: BookIcon },
            ] as const
          ).map((theme) => (
            <button
              key={theme.id}
              aria-pressed={value.theme === theme.id}
              className={`theme-choice ${value.theme === theme.id ? "selected" : ""}`}
              onClick={() => onChange({ theme: theme.id })}
            >
              <theme.icon size={20} />
              <span>{theme.label}</span>
              {value.theme === theme.id && <Check size={13} />}
            </button>
          ))}
        </div>
        <div className="setting-row">
          <span>アクセントカラー</span>
          <div className="accent-choices">
            {(
              [
                { id: "green", label: "グリーン" },
                { id: "blue", label: "ブルー" },
                { id: "violet", label: "バイオレット" },
                { id: "amber", label: "アンバー" },
              ] as const
            ).map((color) => (
              <button
                key={color.id}
                className={`accent-choice accent-${color.id}`}
                aria-label={color.label}
                aria-pressed={value.accent === color.id}
                onClick={() => onChange({ accent: color.id })}
              >
                {value.accent === color.id && <Check size={14} />}
              </button>
            ))}
          </div>
        </div>
      </fieldset>
      <fieldset className="settings-group">
        <legend>
          <Type size={16} />
          文字の読みやすさ
        </legend>
        <div className="setting-row">
          <label htmlFor="font-size">
            文字サイズ <b>{value.fontSize}%</b>
          </label>
          <div className="setting-range">
            <button
              aria-label="文字を小さく"
              className="secondary-button"
              disabled={value.fontSize <= 80}
              onClick={() => onChange({ fontSize: value.fontSize - 5 })}
            >
              A−
            </button>
            <input
              id="font-size"
              type="range"
              min={80}
              max={160}
              step={5}
              value={value.fontSize}
              onChange={(e) => onChange({ fontSize: Number(e.target.value) })}
            />
            <button
              aria-label="文字を大きく"
              className="secondary-button"
              disabled={value.fontSize >= 160}
              onClick={() => onChange({ fontSize: value.fontSize + 5 })}
            >
              A＋
            </button>
          </div>
        </div>
        <label className="setting-row" htmlFor="font-family">
          <span>フォント</span>
          <select
            id="font-family"
            value={value.font}
            onChange={(e) =>
              onChange({ font: e.target.value as Preferences["font"] })
            }
          >
            <option value="noto">Noto Sans JP</option>
            <option value="system">端末の標準フォント</option>
            <option value="serif">明朝体</option>
          </select>
        </label>
        <label className="setting-row" htmlFor="density">
          <span>表示の密度</span>
          <select
            id="density"
            value={value.density}
            onChange={(e) =>
              onChange({ density: e.target.value as Preferences["density"] })
            }
          >
            <option value="comfortable">ゆったり</option>
            <option value="compact">コンパクト</option>
          </select>
        </label>
      </fieldset>
      <fieldset className="settings-group">
        <legend>
          <Columns2 size={16} />
          レイアウト
        </legend>
        <div className="layout-choices">
          {(
            [
              { id: "split", label: "横並び", icon: Columns2 },
              { id: "stacked", label: "縦並び", icon: LayoutList },
              { id: "focus", label: "集中", icon: Maximize2 },
            ] as const
          ).map((layout) => (
            <button
              aria-pressed={value.layout === layout.id}
              className={`secondary-button ${value.layout === layout.id ? "selected" : ""}`}
              key={layout.id}
              onClick={() => onChange({ layout: layout.id })}
            >
              <layout.icon size={16} />
              {layout.label}
            </button>
          ))}
        </div>
        {value.layout === "split" && (
          <>
            <label className="setting-row" htmlFor="panel-ratio">
              <span>
                可視化パネルの幅 <b>{value.splitRatio}%</b>
              </span>
              <input
                id="panel-ratio"
                type="range"
                min={45}
                max={80}
                value={value.splitRatio}
                onChange={(e) =>
                  onChange({ splitRatio: Number(e.target.value) })
                }
              />
            </label>
            <label className="setting-row" htmlFor="code-position">
              <span>コードパネルの位置</span>
              <select
                id="code-position"
                value={value.codePosition}
                onChange={(e) =>
                  onChange({
                    codePosition: e.target.value as Preferences["codePosition"],
                  })
                }
              >
                <option value="right">右側</option>
                <option value="left">左側</option>
              </select>
            </label>
          </>
        )}
        <Toggle
          label="画面幅いっぱいに表示"
          checked={value.wide}
          onChange={(wide) => onChange({ wide })}
        />
        <Toggle
          label="サイドバーを折りたたむ"
          checked={value.sidebarCollapsed}
          onChange={(sidebarCollapsed) => onChange({ sidebarCollapsed })}
        />
        <Toggle
          label="コードパネルを表示"
          checked={value.showCode}
          onChange={(showCode) => onChange({ showCode })}
        />
        <Toggle
          label="統計カードを表示"
          checked={value.showStats}
          onChange={(showStats) => onChange({ showStats })}
        />
        <Toggle
          label="トレースを表示"
          checked={value.showTrace}
          onChange={(showTrace) => onChange({ showTrace })}
        />
        <p className="setting-note">
          タブレットでは横並びを保ち、スマートフォンでは対応するコード行を可視化の上に表示します。集中レイアウトではコードを隠します。
        </p>
      </fieldset>
      <fieldset className="settings-group">
        <legend>
          <Accessibility size={16} />
          操作とアクセシビリティ
        </legend>
        <Toggle
          label="再生のキーボードショートカット"
          checked={value.shortcuts}
          onChange={(shortcuts) => onChange({ shortcuts })}
        />
        <Toggle
          label="色に加えて枠線・模様で区別"
          checked={value.highContrast}
          onChange={(highContrast) => onChange({ highContrast })}
        />
        <Toggle
          label="アニメーションを抑える"
          checked={value.reducedMotion}
          onChange={(reducedMotion) => onChange({ reducedMotion })}
        />
        <Toggle
          label="トレースの現在行を自動追従"
          checked={value.followTrace}
          onChange={(followTrace) => onChange({ followTrace })}
        />
        <Toggle
          label="別のタブに移動したら一時停止"
          checked={value.pauseWhenHidden}
          onChange={(pauseWhenHidden) => onChange({ pauseWhenHidden })}
        />
        <Toggle
          label="再生を繰り返す"
          checked={value.loop}
          onChange={(loop) => onChange({ loop })}
        />
        <Toggle
          label="次回、前の実験を復元する"
          checked={value.resume}
          onChange={(resume) => onChange({ resume })}
        />
        <p className="setting-note">
          端末の「視差効果を減らす」設定も尊重します。実験は停止した状態で復元します。
        </p>
      </fieldset>
      <button
        className="secondary-button reset-settings"
        onClick={() => onChange({ ...defaultPreferences })}
      >
        <RotateCcw size={15} />
        表示設定を初期値に戻す
      </button>
      <p className="setting-note">
        実験データ、学習記録、実績はそのまま残ります。
      </p>
    </>
  );
}
function BookIcon({ size = 20 }: { size?: number }) {
  return <Type size={size} />;
}
function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="setting-row toggle-row">
      <span>{label}</span>
      <input
        type="checkbox"
        role="switch"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
    </label>
  );
}
