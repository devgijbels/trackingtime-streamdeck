interface TrackingTimeResponse<T> {
  response: {
    status: number;
    message: string | null;
  };
  data: T;
}

let email: string | undefined;
let appPassword: string | undefined;

export function configure(newEmail: string, newAppPassword: string): void {
  email = newEmail;
  appPassword = newAppPassword;
}

function authHeader(): string {
  return "Basic " + Buffer.from(`${email}:${appPassword}`).toString("base64");
}

async function ttFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`https://api.trackingtime.co/api/v4${path}`, {
    ...options,
    headers: {
      Authorization: authHeader(),
      "User-Agent": "TrackingTime Stream Deck Plugin (your-email@example.com)",
      ...options.headers,
    },
  });

  const json = (await res.json()) as TrackingTimeResponse<T>;

  if (json.response.status >= 400) {
    throw new Error(json.response.message ?? "TrackingTime API error");
  }

  return json.data;
}

interface TrackingTimeUser {
  id: number;
  event: {
    start: string;
    end: string;
  } | null;
}

interface Task {
  id: number;
  name: string;
  tracking: boolean;
  users: TrackingTimeUser[];
}

const MY_USER_ID = <youruserid>; // TODO: move to env var or fetch dynamically

export async function getCurrentTask(): Promise<Task | null> {
  const tasks = await ttFetch<Task[]>("/tasks/paginated?filter=TRACKING");

  return (
    tasks.find((task) => {
      const myUser = task.users?.find((u) => u.id === MY_USER_ID);
      return task.tracking === true && myUser?.event != null;
    }) ?? null
  );
}

export async function stopTask(taskId: number): Promise<void> {
  await ttFetch(`/tasks/stop/${taskId}`, { method: "POST" });
}

function formatLocalDate(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

export async function startTask(taskId: number): Promise<void> {
  const date = formatLocalDate(new Date());

  await ttFetch(
    `/tasks/track/${taskId}?date=${encodeURIComponent(date)}&stop_running_task=true`,
    { method: "POST" }
  );
}

export async function listTasks(searchTerm: string = ""): Promise<Task[]> {
  let allTasks: Task[] = [];
  let page = 0;

  while (true) {
    const tasks = await ttFetch<Task[]>(
      `/tasks/paginated?filter=ACTIVE&page_size=100&page=${page}`
    );

    if (tasks.length === 0) break;

    allTasks.push(...tasks);
    page++;

    if (tasks.length < 100) break;
  }

  const cleaned = allTasks.map((t) => ({
    ...t,
    name: t.name ?? "(unnamed task)",
  }));

  if (!searchTerm) return cleaned;

  const term = searchTerm.toLowerCase();
  return cleaned.filter((t) => t.name.toLowerCase().includes(term));
}