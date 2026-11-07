/**
 * Injects and talks to the content agent in the top frame of a tab.
 */
import { AGENT_PROTOCOL_VERSION, type AgentRequest, type AgentResponses } from '../core/messages';

type AgentKind = AgentRequest['kind'];

export class AgentError extends Error {}

export async function callAgent<K extends AgentKind>(
  tabId: number,
  request: Extract<AgentRequest, { kind: K }>,
  timeoutMs = 60000,
): Promise<AgentResponses[K]> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new AgentError('The page stopped responding during capture.')), timeoutMs);
  });
  try {
    const response = (await Promise.race([
      chrome.tabs.sendMessage(tabId, request, { frameId: 0 }),
      timeout,
    ])) as { ok: true; data: AgentResponses[K] } | { ok: false; error: string } | undefined;
    if (!response) throw new AgentError('The page did not respond. It may have navigated away.');
    if (!response.ok) throw new AgentError(response.error);
    return response.data;
  } finally {
    clearTimeout(timer);
  }
}

/** Ensures the agent is present (injecting it if necessary). */
export async function ensureAgent(tabId: number): Promise<void> {
  try {
    const pong = await callAgent(tabId, { kind: 'agent.ping' }, 1500);
    if (pong.version === AGENT_PROTOCOL_VERSION) return;
  } catch {
    // Not injected yet (or a stale page); inject below.
  }
  await chrome.scripting.executeScript({
    target: { tabId, frameIds: [0] },
    files: ['/capture-agent.js'],
    injectImmediately: true,
  });
  await callAgent(tabId, { kind: 'agent.ping' }, 3000);
}
