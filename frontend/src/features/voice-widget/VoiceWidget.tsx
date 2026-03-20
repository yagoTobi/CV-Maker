import { useState, useCallback, type RefObject } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { FiMic, FiMicOff, FiPhoneOff, FiChevronDown, FiChevronUp } from "react-icons/fi";
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
  /** Ref to the DOM element where the expanded overlay should be rendered (via portal) */
  overlayContainerRef?: RefObject<HTMLDivElement | null>;
}

export default function VoiceWidget({ overlayContainerRef }: VoiceWidgetProps) {
  const navigate = useNavigate();
  const { setFormData } = useAppContext();
  const [isExpanded, setIsExpanded] = useState(false);

  const handleFormDataReady = useCallback(
    (formData: CVFormData) => {
      console.log("[Voice:Widget] handleFormDataReady called with keys:", Object.keys(formData));
      console.log("[Voice:Widget] personalInfo:", formData.personalInfo?.fullName || "(no name)");
      console.log("[Voice:Widget] work entries:", formData.workExperience?.length ?? 0);
      setFormData(formData);
      setIsExpanded(false);
      // Stay in form builder — template is already selected.
      // Navigate to /build/form to reload with the extracted data.
      navigate("/build/form", { state: { mode: "build" }, replace: true });
      console.log("[Voice:Widget] navigated to /build/form");
    },
    [setFormData, navigate],
  );

  const { widgetState, transcript, elapsed, isMuted, start, end, toggleMute } =
    useVoiceInterview(handleFormDataReady);

  const isActive = widgetState === "active";
  const isConnecting = widgetState === "connecting";
  const isEnding = widgetState === "ending";
  const isBusy = isActive || isConnecting || isEnding;

  const handlePillClick = () => {
    if (isBusy) {
      // If interview is active and minimized, expand
      setIsExpanded(true);
    } else {
      // If idle, expand to show start button
      setIsExpanded(true);
    }
  };

  const handleCollapse = () => {
    // Always allow collapsing — minimizes the overlay
    setIsExpanded(false);
  };

  const handleEnd = () => {
    end();
    setIsExpanded(false);
  };

  const recentLines = transcript.slice(-5);

  // ── Expanded overlay (portaled into navWrapper) ──
  const container = overlayContainerRef?.current;
  const overlayContent = container ? createPortal(
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
          title="Minimize"
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
        {isConnecting && "Connecting\u2026"}
        {isActive && "Listening"}
        {isEnding && "Building your CV\u2026"}
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
    </div>,
    container,
  ) : null;

  // ── Minimized pill (interview active but collapsed) ──
  if (isBusy && !isExpanded) {
    return (
      <>
        {overlayContent}
        <div className={styles.pillMinimized}>
          <button
            className={styles.pillMinimizedMain}
            onClick={handlePillClick}
            title="Expand voice interview"
          >
            <div className={[styles.pillOrb, styles.pillOrbActive].join(" ")} />
            <span className={styles.pillLabel}>
              {isEnding ? "Building CV\u2026" : isConnecting ? "Connecting\u2026" : formatTime(elapsed)}
            </span>
            <FiChevronUp size={12} className={styles.pillExpandIcon} />
          </button>
          <div className={styles.pillMinimizedControls}>
            <button
              className={[styles.pillControlBtn, isMuted && styles.pillControlBtnMuted]
                .filter(Boolean)
                .join(" ")}
              onClick={toggleMute}
              title={isMuted ? "Unmute" : "Mute"}
              disabled={!isActive}
            >
              {isMuted ? <FiMicOff size={13} /> : <FiMic size={13} />}
            </button>
            <button
              className={styles.pillEndBtn}
              onClick={handleEnd}
              title="End interview"
              disabled={isEnding}
            >
              <FiPhoneOff size={13} />
            </button>
          </div>
        </div>
      </>
    );
  }

  // ── Idle pill (no interview) ──
  return (
    <>
      {overlayContent}
      <button
        className={styles.pill}
        disabled
        title="Coming soon"
      >
        <div className={styles.pillOrb} />
        <span className={styles.pillLabel}>Voice</span>
        <span className={styles.alphaBadge}>alpha</span>
      </button>
    </>
  );
}
