"use client";

import * as React from "react";

export interface SpeechSettings {
  language: string;
  autoDetect: boolean;
  silenceTimeout: number; // in ms
  autoPunctuation: boolean;
}

export function getSpeechSettings(): SpeechSettings {
  if (typeof window === "undefined") {
    return { language: "en-IN", autoDetect: true, silenceTimeout: 800, autoPunctuation: true };
  }
  const savedLang = localStorage.getItem("wokai_speech_language");
  const savedAutoDetect = localStorage.getItem("wokai_speech_auto_detect");
  const savedTimeout = localStorage.getItem("wokai_speech_silence_timeout");
  const savedPunctuation = localStorage.getItem("wokai_speech_punctuation");

  // Detect navigator language
  let defaultLang = "en-IN";
  if (typeof navigator !== "undefined" && navigator.language) {
    const navLang = navigator.language;
    if (navLang.startsWith("hi")) defaultLang = "hi-IN";
    else if (navLang.startsWith("ja")) defaultLang = "ja-JP";
    else if (navLang.startsWith("es")) defaultLang = "es-ES";
    else if (navLang.startsWith("fr")) defaultLang = "fr-FR";
    else if (navLang.startsWith("de")) defaultLang = "de-DE";
    else if (navLang.startsWith("pt")) defaultLang = "pt-PT";
    else if (navLang.startsWith("it")) defaultLang = "it-IT";
    else if (navLang.startsWith("en-GB") || navLang === "en-gb") defaultLang = "en-GB";
    else if (navLang.startsWith("en-US") || navLang === "en-us") defaultLang = "en-US";
    else if (navLang.startsWith("en")) defaultLang = "en-IN"; // default WokAI OS is English (India)
  }

  return {
    language: savedLang || defaultLang,
    autoDetect: savedAutoDetect !== "false",
    silenceTimeout: savedTimeout ? Number(savedTimeout) : 800,
    autoPunctuation: savedPunctuation !== "false",
  };
}

export function saveSpeechSettings(settings: SpeechSettings) {
  if (typeof window === "undefined") return;
  localStorage.setItem("wokai_speech_language", settings.language);
  localStorage.setItem("wokai_speech_auto_detect", String(settings.autoDetect));
  localStorage.setItem("wokai_speech_silence_timeout", String(settings.silenceTimeout));
  localStorage.setItem("wokai_speech_punctuation", String(settings.autoPunctuation));
}

export function useSpeechRecognition() {
  const [isSupported, setIsSupported] = React.useState(() => {
    if (typeof window !== "undefined") {
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      return !!SpeechRecognition;
    }
    return true;
  });
  const [isListening, setIsListening] = React.useState(false);
  const [isProcessing, setIsProcessing] = React.useState(false);

  const setProcessing = React.useCallback((val: boolean) => {
    isProcessingRef.current = val;
    setIsProcessing(val);
  }, []);
  const [transcript, setTranscript] = React.useState("");
  const [interimTranscript, setInterimTranscript] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [confidence, setConfidence] = React.useState<number | null>(null);

  // Waveform visualization data
  const [audioLevel, setAudioLevel] = React.useState(0);
  // Timer state for ChatGPT voice style UI
  const [seconds, setSeconds] = React.useState(0);

  const recognitionRef = React.useRef<any>(null);
  const silenceTimerRef = React.useRef<NodeJS.Timeout | null>(null);
  const timerIntervalRef = React.useRef<NodeJS.Timeout | null>(null);
  const audioContextRef = React.useRef<AudioContext | null>(null);
  const analyserRef = React.useRef<AnalyserNode | null>(null);
  const micStreamRef = React.useRef<MediaStream | null>(null);
  const animationFrameRef = React.useRef<number | null>(null);
  const userStoppedRef = React.useRef(false);
  const restartCountRef = React.useRef(0);
  const isProcessingRef = React.useRef(false);
  const isListeningRef = React.useRef(false);

  const setListening = React.useCallback((val: boolean) => {
    isListeningRef.current = val;
    setIsListening(val);
  }, []);

  // 1. Hoisted Cleanup Functions
  function cleanupTimers() {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
  }

  function cleanupAudio() {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach((track) => track.stop());
      micStreamRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== "closed") {
      void audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
      analyserRef.current = null;
    }
    setAudioLevel(0);
  }

  // 2. Microphone volume monitoring (Simulated wave to avoid mic locks and SpeechRecognition conflicts)
  const startAudioMonitoring = React.useCallback(async () => {
    cleanupAudio();
    console.log("[WokAI Speech] Initializing conflict-free simulated audio monitoring");
    let simulatedDir = 1;
    const interval = setInterval(() => {
      setAudioLevel((prev) => {
        let next = prev + Math.floor(Math.random() * 20 - 10) * simulatedDir;
        if (next > 75) { next = 75; simulatedDir = -1; }
        if (next < 10) { next = 10; simulatedDir = 1; }
        return next;
      });
    }, 100);

    (audioContextRef as any).current = {
      close: () => {
        clearInterval(interval);
        return Promise.resolve();
      }
    };
  }, []);

  // 3. Initialize SpeechRecognition on mount
  React.useEffect(() => {
    return () => {
      userStoppedRef.current = true;
      cleanupAudio();
      cleanupTimers();
      if (recognitionRef.current) {
        try { recognitionRef.current.abort(); } catch {}
      }
    };
  }, []);

  // 4. Stop Listening callback — user-initiated stop
  const stopListening = React.useCallback(() => {
    userStoppedRef.current = true;
    cleanupTimers();
    // Don't cleanup audio yet — keep the visualizer running briefly during processing

    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (err) {
        console.warn("Error stopping recognition:", err);
      }
    }

    setProcessing(true);
    // Simulate finishing step for UX
    setTimeout(() => {
      setProcessing(false);
      cleanupAudio();
    }, 600);
  }, [setProcessing]);

  // 5. Cancel Listening callback — user-initiated cancel
  const cancelListening = React.useCallback(() => {
    userStoppedRef.current = true;
    cleanupTimers();
    cleanupAudio();
    setIsListening(false);
    setProcessing(false);
    setTranscript("");
    setInterimTranscript("");
    setSeconds(0);

    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch (err) {
        console.warn("Error aborting recognition:", err);
      }
    }
  }, [setProcessing]);

  // 6. Start Listening callback
  const startListening = React.useCallback(async () => {
    userStoppedRef.current = false;
    restartCountRef.current = 0;
    setError(null);
    setTranscript("");
    setInterimTranscript("");
    setConfidence(null);
    setSeconds(0);
    cleanupTimers();

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setError("Voice input isn't supported in this browser.");
      setIsSupported(false);
      return;
    }

    try {
      await startAudioMonitoring();

      const settings = getSpeechSettings();
      const recognition = new SpeechRecognition();

      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = settings.language;

      if ("audioLanguages" in recognition) {
        (recognition as any).punctuation = settings.autoPunctuation;
      }

      recognitionRef.current = recognition;
      setListening(true);
      setProcessing(false);

      // Start elapsed timer
      timerIntervalRef.current = setInterval(() => {
        setSeconds((prev) => prev + 1);
      }, 1000);

      // Silence detection — only auto-stop on genuine silence after speech starts (5000ms)
      const silenceTimeout = 5000;
      const resetSilenceTimer = () => {
        if (silenceTimerRef.current) {
          clearTimeout(silenceTimerRef.current);
        }
        silenceTimerRef.current = setTimeout(() => {
          if (!userStoppedRef.current) {
            console.log(`SpeechRecognition: Silence detected for ${silenceTimeout}ms. Auto-stopping.`);
            stopListening();
          }
        }, silenceTimeout);
      };

      recognition.onstart = () => {
        setListening(true);
      };

      recognition.onresult = (event: any) => {
        resetSilenceTimer();

        let finalText = "";
        let interimText = "";
        let finalConfidence = 0;
        let finalCount = 0;

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const result = event.results[i];
          if (result.isFinal) {
            finalText += result[0].transcript;
            finalConfidence += result[0].confidence;
            finalCount++;
          } else {
            interimText += result[0].transcript;
          }
        }

        if (finalCount > 0) {
          setTranscript((prev) => {
            const separator = prev ? " " : "";
            return prev + separator + finalText.trim();
          });
          setConfidence(finalConfidence / (finalCount || 1));
        }

        setInterimTranscript(interimText);
      };

      recognition.onerror = (event: any) => {
        console.error("Speech recognition error:", event);
        cleanupTimers();
        cleanupAudio();
        setListening(false);
        setProcessing(false);

        if (event.error === "not-allowed") {
          setError("Microphone access is disabled. Please enable microphone permissions in your browser settings.");
        } else if (event.error === "no-speech") {
          setTranscript("");
          setInterimTranscript("");
        } else {
          setError(`Voice recognition error: ${event.error}`);
        }
      };

      recognition.onend = () => {
        cleanupTimers();
        cleanupAudio();
        setListening(false);

        if (!userStoppedRef.current && restartCountRef.current < 5) {
          restartCountRef.current += 1;
          console.log(`SpeechRecognition: Auto-restarting (attempt ${restartCountRef.current}/5)...`);
          setTimeout(() => {
            if (!userStoppedRef.current && !isListeningRef.current && recognitionRef.current === recognition) {
              try {
                recognition.start();
              } catch {
                console.log("SpeechRecognition: Could not restart, session ended.");
              }
            }
          }, 200);
        }
      };

      recognition.start();
    } catch (err: any) {
      console.error("Mic access denied or error:", err);
      cleanupTimers();
      cleanupAudio();
      setListening(false);
      setProcessing(false);
      setError("Microphone access is disabled. Please enable microphone permissions in your browser settings.");
    }
  }, [stopListening, startAudioMonitoring, setProcessing, setListening]);

  return {
    isSupported,
    isListening,
    isProcessing,
    transcript,
    interimTranscript,
    error,
    confidence,
    audioLevel,
    seconds,
    startListening,
    stopListening,
    cancelListening,
    setError
  };
}
