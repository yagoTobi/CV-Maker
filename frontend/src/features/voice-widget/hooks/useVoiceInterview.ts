import { useState, useRef, useCallback, useEffect } from "react";
import type { TranscriptData, BotOutputData } from "@pipecat-ai/client-js";
import { PipecatClient } from "@pipecat-ai/client-js";
import {
  WebSocketTransport,
  ProtobufFrameSerializer,
} from "@pipecat-ai/websocket-transport";
import type {
  VoiceWidgetState,
  VoiceTranscriptLine,
} from "../../../types";
import { API_BASE } from "../../../services/api";

const WS_URL = import.meta.env.VITE_WS_URL || API_BASE.replace(/^http/, 'ws') + '/ws/voice-interview';

// Dev-only logging
const log = import.meta.env.DEV ? console.log.bind(console) : () => {};

/** Trigger phrase the AI says when it's done collecting info */
const SESSION_COMPLETE_PHRASE = "generating your cv now";

export interface UseVoiceInterviewResult {
  widgetState: VoiceWidgetState;
  transcript: VoiceTranscriptLine[];
  elapsed: number;
  isMuted: boolean;
  start: () => Promise<void>;
  end: () => void;
  toggleMute: () => void;
}

export function useVoiceInterview(
  onFormDataReady: (formData: object) => void,
): UseVoiceInterviewResult {
  const [widgetState, setWidgetState] = useState<VoiceWidgetState>("idle");
  const [transcript, setTranscript] = useState<VoiceTranscriptLine[]>([]);
  const [elapsed, setElapsed] = useState(0);
  const [isMuted, setIsMuted] = useState(false);

  const clientRef = useRef<PipecatClient | null>(null);
  const sessionIdRef = useRef<string | null>(null);
  const onFormDataReadyRef = useRef(onFormDataReady);
  const widgetStateRef = useRef(widgetState);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // Accumulate bot output text to detect trigger phrase across chunks
  const botTextBufferRef = useRef("");
  // Guard against triggering extraction more than once
  const extractingRef = useRef(false);

  useEffect(() => {
    onFormDataReadyRef.current = onFormDataReady;
  }, [onFormDataReady]);
  useEffect(() => {
    widgetStateRef.current = widgetState;
  }, [widgetState]);

  const cleanup = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (clientRef.current) {
      clientRef.current.disconnect().catch(() => {});
      clientRef.current = null;
    }
    sessionIdRef.current = null;
    botTextBufferRef.current = "";
    extractingRef.current = false;
  }, []);

  useEffect(() => () => cleanup(), [cleanup]);

  const handleSessionComplete = useCallback(async () => {
    if (extractingRef.current) return;
    extractingRef.current = true;

    log("[Voice:1] session_complete — starting extraction");
    setWidgetState("ending");
    const sessionId = sessionIdRef.current;
    log("[Voice:2] sessionId:", sessionId);

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    if (!sessionId) {
      console.warn("[Voice:2] no sessionId — aborting extraction");
      cleanup();
      setWidgetState("idle");
      return;
    }

    try {
      log("[Voice:3] calling POST /voice/extract-cv...");
      const res = await fetch(`${API_BASE}/voice/extract-cv`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: sessionId }),
      });
      log("[Voice:4] extract-cv response status:", res.status);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      log("[Voice:5] extracted formData:", data.formData ? Object.keys(data.formData) : "MISSING");
      if (!data.formData) {
        console.error("[Voice:5] backend returned no formData — full response:", data);
        return;
      }
      log("[Voice:6] calling onFormDataReady...");
      onFormDataReadyRef.current(data.formData);
      log("[Voice:7] onFormDataReady complete — form should now update");
    } catch (err) {
      console.error("[Voice:ERR] extract-cv failed:", err);
    } finally {
      log("[Voice:8] cleanup — disconnecting WebSocket");
      cleanup();
      setWidgetState("idle");
    }
  }, [cleanup]);

  const start = useCallback(async () => {
    setWidgetState("connecting");
    setTranscript([]);
    setElapsed(0);
    extractingRef.current = false;
    botTextBufferRef.current = "";

    // Generate session ID client-side and pass via query param
    const sessionId = crypto.randomUUID();
    sessionIdRef.current = sessionId;
    const wsUrl = `${WS_URL}?session_id=${sessionId}`;
    log("[VoiceInterview] start() — sessionId:", sessionId);

    try {
      const client = new PipecatClient({
        transport: new WebSocketTransport({
          serializer: new ProtobufFrameSerializer(),
          recorderSampleRate: 16000,
          playerSampleRate: 24000,
        }),
        enableCam: false,
        enableMic: true,
        callbacks: {
          onConnected: () => {
            log("[VoiceInterview] onConnected (transport layer)");
          },
          onBotReady: () => {
            log("[VoiceInterview] onBotReady — transitioning to active");
            setWidgetState("active");
            timerRef.current = setInterval(
              () => setElapsed((s) => s + 1),
              1000,
            );
          },
          onDisconnected: () => {
            log("[VoiceInterview] onDisconnected");
            if (widgetStateRef.current !== "ending") {
              setWidgetState("idle");
              cleanup();
            }
          },
          onUserTranscript: (data: TranscriptData) => {
            if (data.final && data.text) {
              log("[VoiceInterview] user transcript (final):", data.text);
              setTranscript((prev) => [
                ...prev,
                { speaker: "user", text: data.text },
              ]);
            }
          },
          onBotOutput: (data: BotOutputData) => {
            if (data.text) {
              log("[VoiceInterview] bot output:", data.text);
              setTranscript((prev) => [
                ...prev,
                { speaker: "ai", text: data.text },
              ]);

              // Accumulate and check for trigger phrase
              botTextBufferRef.current += " " + data.text;
              if (
                botTextBufferRef.current
                  .toLowerCase()
                  .includes(SESSION_COMPLETE_PHRASE)
              ) {
                log("[VoiceInterview] trigger phrase detected — ending session");
                botTextBufferRef.current = "";
                handleSessionComplete();
              }
            }
          },
          onError: (message) => {
            console.error("[VoiceInterview] RTVI error:", message);
            setWidgetState("idle");
            cleanup();
          },
        },
      });

      clientRef.current = client;
      log("[VoiceInterview] calling connect() to", wsUrl);
      await client.connect({ wsUrl });
      log("[VoiceInterview] connect() resolved — bot is ready");
    } catch (err) {
      console.error("[VoiceInterview] failed to start:", err);
      setWidgetState("idle");
      cleanup();
    }
  }, [cleanup, handleSessionComplete]);

  const end = useCallback(() => {
    if (sessionIdRef.current) {
      handleSessionComplete();
    } else {
      setWidgetState("idle");
      cleanup();
    }
  }, [handleSessionComplete, cleanup]);

  const toggleMute = useCallback(() => {
    setIsMuted((prev) => {
      const next = !prev;
      clientRef.current?.enableMic(!next);
      return next;
    });
  }, []);

  return { widgetState, transcript, elapsed, isMuted, start, end, toggleMute };
}
