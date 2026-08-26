import { streamDeck } from "@elgato/streamdeck";
import { getCurrentTask, configure } from "./trackingtime-api";
import { ToggleTracking } from "./actions/toggle-tracking";
import { StartTask } from "./actions/start-task";

const RELEVANT_UUIDS = [
  "com.devgijbels.ez-trackingtime.toggle-tracking",
  "com.devgijbels.ez-trackingtime.start-task",
];

// We can enable "trace" logging so that all messages between the Stream Deck, and the plugin are recorded. When storing sensitive information
streamDeck.logger.setLevel("trace" as any);

interface GlobalSettings {
  email?: string;
  appPassword?: string;
  [key: string]: string | undefined;
}

async function applySettings(settings: GlobalSettings) {
  configure(settings.email ?? "", settings.appPassword ?? "");
}

// Register the Toggle Tracking action.
streamDeck.actions.registerAction(new ToggleTracking());
streamDeck.actions.registerAction(new StartTask());
streamDeck.settings.onDidReceiveGlobalSettings<GlobalSettings>((ev) => {
  applySettings(ev.settings);
});

// Finally, connect to the Stream Deck.
streamDeck.connect();

const initialSettings = await streamDeck.settings.getGlobalSettings<GlobalSettings>();
await applySettings(initialSettings);

setInterval(async () => {
  try {
    const running = await getCurrentTask();
    for (const action of streamDeck.actions) {
      if (!RELEVANT_UUIDS.includes(action.manifestId)) continue;
      if (!action.isKey()) continue;

      const settings = await action.getSettings<{ taskId: number }>();
      const isThisTaskRunning = running?.id === settings.taskId;
      await action.setState(isThisTaskRunning ? 1 : 0);
    }
  } catch (err) {
    streamDeck.logger.error("Failed to poll tracking status:", err);
  }
}, 5000);
