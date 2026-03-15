import { useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { FiMic, FiMicOff, FiPhoneOff, FiChevronDown } from "react-icons/fi";
import { useVoiceInterview } from "../../hooks/useVoiceInterview";
import { useAppContext } from "../../contexts/AppContext";
import type { CVFormData } from "../../types";
import styles from "./VoiceWidget.module.css";

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0");
  const s = (seconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

interface VoiceWidgetProps {
  /** DOM element where the expanded overlay should be rendered (via portal) */
  overlayContainer?: HTMLDivElement | null;
}

export default function VoiceWidget({ overlayContainer }: VoiceWidgetProps) {
  const navigate = useNavigate();
  const { setFormData } = useAppContext();
  const [isExpanded, setIsExpanded] = useState(false);

  const handleFormDataReady = useCallback(
    (formData: CVFormData) => {
      setFormData(formData);
      setIsExpanded(false);
      navigate("/build", { state: { fromVoice: true } });
    },
    [setFormData, navigate],
  );

  const { widgetState, transcript, elapsed, isMuted, start, end, toggleMute } =
    useVoiceInterview(handleFormDataReady);

  const isActive = widgetState === "active";
  const isConnecting = widgetState === "connecting";
  const isEnding = widgetState === "ending";
  const isBusy = isActive || isConnecting || isEnding;

  const handlePillClick = () => setIsExpanded(true);

  const handleCollapse = () => {
    if (!isBusy) setIsExpanded(false);
  };

  const handleEnd = () => {
    end();
    setIsExpanded(false);
  };

  const recentLines = transcript.slice(-5);

  const overlayContent = (
    <div
      className={[styles.overlay, isExpanded && styles.overlayVisible]
        .filter(Boolean)
        .join(" ")}
      aria-hidden={!isExpanded}
    >
      {/* Top bar */}
      <div className={styles.overlayHeader}>
        <span className={styles.timer}>
          {isBusy ? formatTime(elapsed) : "00:00"}
        </span>
        <button
          className={styles.collapseBtn}
          onClick={handleCollapse}
          disabled={isBusy}
          title={isBusy ? "Interview in progress" : "Collapse"}
        >
          <FiChevronDown size={14} />
        </button>
      </div>

      {/* Orb */}
      <div className={styles.orbWrapper}>
        <div
          className={[
            styles.orb,
            isActive && styles.orbActive,
            isConnecting && styles.orbConnecting,
            isEnding && styles.orbEnding,
          ]
            .filter(Boolean)
            .join(" ")}
        >
          <div className={styles.orbSheen} />
        </div>
      </div>

      {/* Status */}
      <div className={styles.agentName}>CV Coach</div>
      <div className={styles.agentStatus}>
        {isConnecting && "Connecting…"}
        {isActive && "Listening"}
        {isEnding && "Building your CV…"}
        {!isBusy && "Ready when you are"}
      </div>

      {/* Transcript feed */}
      <div className={styles.transcript}>
        {recentLines.length === 0 && !isBusy && (
          <p className={styles.transcriptEmpty}>
            Your conversation will appear here.
          </p>
        )}
        {recentLines.map((line, i) => (
          <p
            key={i}
            className={[
              styles.transcriptLine,
              line.speaker === "user"
                ? styles.transcriptUser
                : styles.transcriptAi,
            ].join(" ")}
          >
            {line.text}
          </p>
        ))}
      </div>

      {/* Controls */}
      <div className={styles.controls}>
        {!isBusy ? (
          <button className={styles.startBtn} onClick={start}>
            <FiMic size={15} />
            Start Interview
          </button>
        ) : (
          <>
            <button
              className={[styles.controlBtn, isMuted && styles.controlBtnMuted]
                .filter(Boolean)
                .join(" ")}
              onClick={toggleMute}
              title={isMuted ? "Unmute" : "Mute"}
              disabled={!isActive}
            >
              {isMuted ? <FiMicOff size={16} /> : <FiMic size={16} />}
            </button>

            <button
              className={styles.endBtn}
              onClick={handleEnd}
              title="End interview"
              disabled={isEnding}
            >
              <FiPhoneOff size={16} />
            </button>
          </>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* ── Overlay portaled into sectionNav wrapper ── */}
      {overlayContainer
        ? createPortal(overlayContent, overlayContainer)
        : overlayContent}

      {/* ── Pill trigger (always visible in sidebar footer) ── */}
      <button
        className={[styles.pill, isBusy && styles.pillActive]
          .filter(Boolean)
          .join(" ")}
        onClick={handlePillClick}
        title="Build CV via voice"
      >
        <div
          className={[styles.pillOrb, isBusy && styles.pillOrbActive]
            .filter(Boolean)
            .join(" ")}
        />
        <span className={styles.pillLabel}>
          {isEnding ? "Building CV…" : isBusy ? "In progress…" : "Voice"}
        </span>
        {!isBusy && <span className={styles.alphaBadge}>alpha</span>}
      </button>
    </>
  );
}
