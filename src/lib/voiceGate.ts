export interface MicGateState {
  userMicOn: boolean;
  speaking: boolean;
  gated: boolean;
}

export type MicGateEvent =
  | { type: "user-mic"; on: boolean }
  | { type: "speech-start" }
  | { type: "speech-about-to-end" }
  | { type: "speech-end" }
  | { type: "interrupt" };

export const initialMicGate: MicGateState = {
  userMicOn: false,
  speaking: false,
  gated: false,
};

export function micGateReducer(state: MicGateState, event: MicGateEvent): MicGateState {
  switch (event.type) {
    case "user-mic":
      if (!event.on) return { ...state, userMicOn: false, gated: false };
      return { ...state, userMicOn: true, gated: state.speaking };
    case "speech-start":
      return { ...state, speaking: true, gated: state.userMicOn };
    case "speech-about-to-end":
      return { ...state, gated: false };
    case "speech-end":
      return { ...state, speaking: false, gated: false };
    case "interrupt":
      return { ...state, speaking: false, gated: false };
    default:
      return state;
  }
}

export function micActive(state: MicGateState): boolean {
  return state.userMicOn && !state.gated;
}
