import streamDeck, { action, KeyDownEvent, SendToPluginEvent, SingletonAction } from "@elgato/streamdeck";
import { listTasks, startTask } from "../trackingtime-api";

type StartTaskSettings = { taskId?: number };
type GetTasksPayload = { event: string; search?: string };

@action({ UUID: "com.devgijbels.ez-trackingtime.start-task" })
export class StartTask extends SingletonAction {
  override async onKeyDown(ev: KeyDownEvent) {
    try {
      const { taskId } = ev.payload.settings as StartTaskSettings;

      if (!taskId) {
        streamDeck.logger.warn("Start Task button pressed but no taskId configured yet");
        return;
      }

      await startTask(taskId);
    } catch (err) {
      streamDeck.logger.error("Failed to start task:", err);
    }
  }

  override async onSendToPlugin(ev: SendToPluginEvent<GetTasksPayload, StartTaskSettings>) {
    const payload = ev.payload;
    if (payload.event !== "getTasks") return;

    try {
      const tasks = await listTasks(payload.search ?? "");
      const items = tasks.map((t) => ({ label: t.name, value: String(t.id) }));

      await streamDeck.ui.sendToPropertyInspector({ event: "getTasks", items });
    } catch (err) {
      streamDeck.logger.error("Failed to load tasks for property inspector:", err);
    }
  }
}