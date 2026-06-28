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
      void audioContextRef.current.close();
      audioContextRef.current = null;
    }
    setAudioLevel(0);
  }

  // 2. Microphone volume monitoring (Real amplitude node)
  const startAudioMonitoring = React.useCallback(async () => {
    try {
      cleanupAudio();
      
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      
      micStreamRef.current = stream;

      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const audioCtx = new AudioContextClass();
      audioContextRef.current = audioCtx;

      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const updateVolume = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(dataArray);
        
        // Calculate average volume level
        let total = 0;
        for (let i = 0; i < bufferLength; i++) {
          total += dataArray[i];
        }
        const average = total / bufferLength;
        // Normalize between 0 and 100
        setAudioLevel(Math.min(100, Math.floor((average / 255) * 150)));
        animationFrameRef.current = requestAnimationFrame(updateVolume);
      };

      updateVolume();
    } catch (err) {
      console.warn("Could not start real audio analysis node, falling back to simulated wave:", err);
      // Fallback: simulate volume level changes
      let simulatedDir = 1;
      const interval = setInterval(() => {
        setAudioLevel((prev) => {
          let next = prev + Math.floor(Math.random() * 20 - 10) * simulatedDir;
          if (next > 80) {
            next = 80;
            simulatedDir = -1;
          }
          if (next < 5) {
            next = 5;
            simulatedDir = 1;
          }
          return next;
        });
      }, 100);
      
      // Store interval as audio context dummy tracking
      (audioContextRef as any).current = {
        close: () => {
          clearInterval(interval);
          return Promise.resolve();
        }
      };
    }
  }, []);

  // 3. Initialize SpeechRecognition on mount
  React.useEffect(() => {
    return () => {
      cleanupAudio();
      cleanupTimers();
    };
  }, []);

  // 4. Stop Listening callback
  const stopListening = React.useCallback(() => {
    cleanupTimers();
    cleanupAudio();
    
    if (recognitionRef.current) {
      setIsProcessing(true);
      try {
        recognitionRef.current.stop();
      } catch (err) {
        console.warn("Error stopping recognition:", err);
      }
    }
    
    // Simulate finishing step for UX
    setTimeout(() => {
      setIsProcessing(false);
    }, 600);
  }, []);

  // 5. Cancel Listening callback
  const cancelListening = React.useCallback(() => {
    cleanupTimers();
    cleanupAudio();
    setIsListening(false);
    setIsProcessing(false);
    setTranscript("");
    setInterimTranscript("");
    
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch (err) {
        console.warn("Error aborting recognition:", err);
      }
    }
  }, []);

  // 6. Start Listening callback
  const startListening = React.useCallback(async () => {
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
      // Trigger media stream permissions and start monitoring
      await startAudioMonitoring();

      const settings = getSpeechSettings();
      const recognition = new SpeechRecognition();
      
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = settings.language;
      
      // Auto-punctuation is browser specific, but let's declare it
      if ("audioLanguages" in recognition) {
        // Supported in some Chromium versions
        (recognition as any).punctuation = settings.autoPunctuation;
      }

      recognitionRef.current = recognition;
      setIsListening(true);
      setIsProcessing(false);

      // Start elapsed timer
      timerIntervalRef.current = setInterval(() => {
        setSeconds((prev) => prev + 1);
      }, 1000);

      // Silence detection reset handler
      const resetSilenceTimer = () => {
        if (silenceTimerRef.current) {
          clearTimeout(silenceTimerRef.current);
        }
        silenceTimerRef.current = setTimeout(() => {
          console.log(`SpeechRecognition: Silence detected for ${settings.silenceTimeout}ms. Auto-stopping.`);
          stopListening();
        }, settings.silenceTimeout);
      };

      resetSilenceTimer();

      recognition.onstart = () => {
        setIsListening(true);
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
        setIsListening(false);
        setIsProcessing(false);

        if (event.error === "not-allowed") {
          setError("Microphone access is disabled. Please enable microphone permissions in your browser settings.");
        } else {
          setError(`Voice recognition error: ${event.error}`);
        }
      };

      recognition.onend = () => {
        cleanupTimers();
        cleanupAudio();
        setIsListening(false);
      };

      recognition.start();
    } catch (err: any) {
      console.error("Mic access denied or error:", err);
      cleanupTimers();
      cleanupAudio();
      setIsListening(false);
      setIsProcessing(false);
      setError("Microphone access is disabled. Please enable microphone permissions in your browser settings.");
    }
  }, [stopListening, startAudioMonitoring]);

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
