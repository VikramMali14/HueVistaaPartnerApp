import { act, fireEvent, render, screen } from "@testing-library/react-native";
import { AppState, type AppStateStatus } from "react-native";

import { LOWEST_SHOWN_MS, LowestPrice } from "../LowestPrice";

/** The lowest price: covered until tapped, and covered again by itself — the customer may be looking. */
describe("LowestPrice", () => {
  let appStateListener: ((s: AppStateStatus) => void) | null = null;
  beforeEach(() => {
    jest.useFakeTimers();
    jest.spyOn(AppState, "addEventListener").mockImplementation((_type, listener) => {
      appStateListener = listener as (s: AppStateStatus) => void;
      return { remove: () => (appStateListener = null) } as ReturnType<typeof AppState.addEventListener>;
    });
  });
  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it("stays covered until tapped, counts down, then covers itself again after 15 seconds", () => {
    render(<LowestPrice price={3950} testID="low" />);
    expect(screen.queryByText("₹3,950")).toBeNull();
    fireEvent.press(screen.getByTestId("low"));
    expect(screen.getByText("₹3,950")).toBeTruthy();
    expect(screen.getByText("Hides in 15 s")).toBeTruthy();

    act(() => jest.advanceTimersByTime(LOWEST_SHOWN_MS - 1_000));
    expect(screen.getByText("Hides in 1 s")).toBeTruthy();
    act(() => jest.advanceTimersByTime(1_000));
    expect(screen.queryByText("₹3,950")).toBeNull();
    expect(screen.getByTestId("low")).toBeTruthy();
  });

  it("covers itself the moment the app is put away", () => {
    render(<LowestPrice price={3950} testID="low" />);
    fireEvent.press(screen.getByTestId("low"));
    act(() => appStateListener?.("background"));
    expect(screen.queryByText("₹3,950")).toBeNull();
  });

  it("covers itself at once when tapped again", () => {
    render(<LowestPrice price={3950} testID="low" />);
    fireEvent.press(screen.getByTestId("low"));
    fireEvent.press(screen.getByTestId("low-shown"));
    expect(screen.queryByText("₹3,950")).toBeNull();
  });
});
