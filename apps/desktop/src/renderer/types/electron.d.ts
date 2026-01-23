import type { CommandDeckAPI } from '../../types/ipc';

export interface ICommandDeckAPI extends CommandDeckAPI {}

declare global {
  interface Window {
    commanddeck: ICommandDeckAPI;
  }
}
