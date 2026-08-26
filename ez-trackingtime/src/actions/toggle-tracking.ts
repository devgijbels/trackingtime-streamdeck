import streamDeck, { action, KeyDownEvent, SingletonAction } from "@elgato/streamdeck";
import { getCurrentTask, startTask, stopTask } from "../trackingtime-api";

@action({ UUID: "com.devgijbels.ez-trackingtime.toggle-tracking" })
export class ToggleTracking extends SingletonAction {
  override async onKeyDown(ev: KeyDownEvent) {
    try {
      const running = await getCurrentTask();
      streamDeck.logger.debug("Current running task:", running);

      if (running) {
        streamDeck.logger.debug("Stopping task", running.id);
        await stopTask(running.id);
      } else {
        const { taskId } = ev.payload.settings as { taskId: number };
        streamDeck.logger.debug("Starting task with taskId from settings:", taskId);
        await startTask(taskId);
      }
    } catch (err) {
      streamDeck.logger.error("Failed to toggle tracking:", err);
    }
  }
}