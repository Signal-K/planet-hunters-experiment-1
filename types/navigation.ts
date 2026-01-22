export type RootStackParamList = {
  Auth: undefined;
  Loading: undefined;
  Game: undefined;
};

export interface AppController {
  has_signal_connections(signal: string): boolean;
  window_status_update: {
    connect(callback: (message: string) => void): void;
  };
  counter_updated: {
    connect(callback: (newValue: number) => void): void;
  };
  franc_balance_updated: {
    connect(callback: (newValue: number) => void): void;
  };
  open_window(windowName: string): void;
  close_window(windowName: string): void;
  set_counter_from_react(value: number): void;
  get_counter(): number;
  set_franc_balance_from_react(value: number): void;
  get_franc_balance(): number;
}