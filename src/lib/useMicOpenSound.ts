"use client";
import { useEffect, useRef } from "react";
import { micActive, type MicGateState } from "./voiceGate";
import { playMicOpenSound } from "./sounds";

export function useMicOpenSound(gate: MicGateState, mutedRef: { current: boolean }) {
  const prevRef = useRef(gate);
  useEffect(() => {
    const prev = prevRef.current;
    prevRef.current = gate;
    if (!micActive(prev) && micActive(gate)) {
      playMicOpenSound(!mutedRef.current);
    }
  }, [gate, mutedRef]);
}
