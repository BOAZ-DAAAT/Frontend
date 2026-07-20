import type { RunEvent, RunStatus } from '@/features/runs/types';
import { apiClient } from '@/lib/apiClient';

export type AgentRunStreamMessage =
  | { type: 'run.event'; id: string; data: RunEvent }
  | { type: 'run.closed'; data: { run_id: string; status: RunStatus } };

type ParsedSseMessage = {
  event: string;
  id?: string;
  data: string;
};

function parseSseBlock(block: string): ParsedSseMessage | null {
  let event = 'message';
  let id: string | undefined;
  const data: string[] = [];

  for (const line of block.split('\n')) {
    if (!line || line.startsWith(':')) continue;
    const separator = line.indexOf(':');
    const field = separator === -1 ? line : line.slice(0, separator);
    const rawValue = separator === -1 ? '' : line.slice(separator + 1);
    const value = rawValue.startsWith(' ') ? rawValue.slice(1) : rawValue;

    if (field === 'event') event = value;
    if (field === 'id') id = value;
    if (field === 'data') data.push(value);
  }

  if (data.length === 0) return null;
  return { event, id, data: data.join('\n') };
}

async function* readSseMessages(
  stream: ReadableStream<Uint8Array>,
): AsyncGenerator<ParsedSseMessage> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      buffer += decoder.decode(value, { stream: !done }).replace(/\r\n/g, '\n');

      let boundary = buffer.indexOf('\n\n');
      while (boundary !== -1) {
        const message = parseSseBlock(buffer.slice(0, boundary));
        buffer = buffer.slice(boundary + 2);
        if (message) yield message;
        boundary = buffer.indexOf('\n\n');
      }

      if (done) break;
    }
  } finally {
    reader.releaseLock();
  }
}

export async function* streamAgentRunEvents(
  runId: string,
  options: { signal: AbortSignal; lastEventId?: string },
): AsyncGenerator<AgentRunStreamMessage> {
  const headers = new Headers({ Accept: 'text/event-stream' });
  if (options.lastEventId) {
    headers.set('Last-Event-ID', options.lastEventId);
  }

  const response = await apiClient.stream(
    `/agent-runs/${encodeURIComponent(runId)}/events/stream`,
    { headers, signal: options.signal },
  );
  if (!response.body) {
    throw new Error('이벤트 스트림 응답을 읽을 수 없습니다.');
  }

  for await (const message of readSseMessages(response.body)) {
    if (message.event === 'run.event' && message.id) {
      yield {
        type: 'run.event',
        id: message.id,
        data: JSON.parse(message.data) as RunEvent,
      };
    }
    if (message.event === 'run.closed') {
      yield {
        type: 'run.closed',
        data: JSON.parse(message.data) as { run_id: string; status: RunStatus },
      };
    }
  }
}
