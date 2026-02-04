export type RootStackParamList = {
  Menu: undefined;
  Game: undefined;
  Auth: undefined;
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
  experience_updated: {
    connect(callback: (xp: number, level: number) => void): void;
  };
  tutorial_completed_updated: {
    connect(callback: (isCompleted: boolean) => void): void;
  };
  set_game_paused(paused: boolean): void;
  get_game_paused(): boolean;
  request_menu_open(): void;
  request_menu_close(): void;
  get_menu_request_version(): number;
  get_menu_request_action(): string;
  open_window(windowName: string): void;
  close_window(windowName: string): void;
  set_counter_from_react(value: number): void;
  get_counter(): number;
  set_franc_balance_from_react(value: number): void;
  get_franc_balance(): number;
  set_experience_from_react(xp: number, level: number): void;
  get_experience_xp(): number;
  get_experience_level(): number;
  set_tutorial_completed_from_react(isCompleted: boolean): void;
  get_tutorial_completed(): boolean;
}
