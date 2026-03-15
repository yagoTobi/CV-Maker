import { useState, useRef, useCallback, useEffect } from "react";
import { PipecatClient } from "@pipecat-ai/client-js";
import {
  WebSocketTransport,
  ProtobufFrameSerializer,
} from "@pipecat-ai/websocket-transport";
import type {
  VoiceWidgetState,
  VoiceWSMessage,
  VoiceTranscriptLine,
} from "../types";

const WS_URL = `ws://${window.location.hostname}:8000/api/ws/voice-interview`;
const API_BASE = `http://${window.location.hostname}:8000/api`;

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
  }, []);

  useEffect(() => () => cleanup(), [cleanup]);

  const handleSessionComplete = useCallback(async () => {
    setWidgetState("ending");
    const sessionId = sessionIdRef.current;
    sessionIdRef.current = null;
    cleanup();

    if (!sessionId) {
      setWidgetState("idle");
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/voice/extract-cv`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: sessionId }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      onFormDataReadyRef.current(data.formData);
    } catch (err) {
      console.error("[VoiceInterview] extract-cv failed:", err);
    } finally {
      setWidgetState("idle");
    }
  }, [cleanup]);

  const start = useCallback(async () => {
    setWidgetState("connecting");
    setTranscript([]);
    setElapsed(0);
    console.log("[VoiceInterview] start() called, creating PipecatClient...");

    try {
      const client = new PipecatClient({
        transport: new WebSocketTransport({
          serializer: new ProtobufFrameSerializer(),
          recorderSampleRate: 16000, // Nova Sonic expects 16 kHz input
          playerSampleRate: 24000, // Nova Sonic outputs 24 kHz audio
        }),
        enableCam: false,
        enableMic: true,
        callbacks: {
          onConnected: () => {
            console.log("[VoiceInterview] onConnected (transport layer)");
          },
          onBotReady: () => {
            console.log(
              "[VoiceInterview] onBotReady — transitioning to active",
            );
            // Transition to 'active' immediately on bot-ready.
            // The session_start server message will set the session ID separately.
            setWidgetState("active");
            timerRef.current = setInterval(
              () => setElapsed((s) => s + 1),
              1000,
            );
          },
          onDisconnected: () => {
            console.log("[VoiceInterview] onDisconnected");
            if (widgetStateRef.current !== "ending") {
              setWidgetState("idle");
              cleanup();
            }
          },
          onServerMessage: (message: unknown) => {
            console.log("[VoiceInterview] raw server message:", message);
            try {
              const msg = (
                typeof message === "string" ? JSON.parse(message) : message
              ) as VoiceWSMessage;

              switch (msg.type) {
                case "session_start":
                  console.log(
                    "[VoiceInterview] session_start, id:",
                    msg.session_id,
                  );
                  sessionIdRef.current = msg.session_id;
                  break;
                case "transcript":
                  setTranscript((prev) => [
                    ...prev,
                    { speaker: msg.speaker, text: msg.text },
                  ]);
                  break;
                case "session_complete":
                  handleSessionComplete();
                  break;
                case "error":
                  console.error("[VoiceInterview] backend error:", msg.message);
                  setWidgetState("idle");
                  cleanup();
                  break;
              }
            } catch (parseErr) {
              console.warn(
                "[VoiceInterview] failed to parse server message:",
                parseErr,
              );
            }
          },
        },
      });

      clientRef.current = client;
      console.log("[VoiceInterview] calling connect() to", WS_URL);
      await client.connect({ wsUrl: WS_URL });
      console.log("[VoiceInterview] connect() resolved — bot is ready");
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
