import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import test from 'node:test';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';

const require = createRequire(import.meta.url);
const { startForgeMcpServer } = require(join(process.cwd(), 'electron/mcp/forgeMcpServer.cjs'));

async function createProtocolHarness(invokeRenderer: (request: Record<string, unknown>) => Promise<unknown>) {
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  const server = await startForgeMcpServer({
    sessionId: 'protocol-session',
    version: '1.5.0-test',
    transport: serverTransport,
    invokeRenderer,
  });
  const client = new Client({ name: 'forge-protocol-test', version: '1.0.0' });
  await client.connect(clientTransport);
  return { client, server };
}

test('MCP 完成初始化并只公开受控的 Agent 作业工具', async () => {
  const { client, server } = await createProtocolHarness(async () => ({}));
  try {
    assert.equal(client.getServerVersion()?.name, 'forge-editor');
    assert.equal(client.getServerVersion()?.version, '1.5.0-test');

    const listed = await client.listTools();
    const names = listed.tools.map((tool: { name: string }) => tool.name);
    assert.ok(names.includes('forge_get_manifest'));
    assert.ok(names.includes('forge_create_homework_draft'));
    assert.ok(names.includes('forge_open_preview'));
    assert.ok(names.includes('forge_create_feedback_report'));
    assert.equal(names.some((name: string) => /publish|svn|deploy|confirm_review/i.test(name)), false);
    assert.match(
      listed.tools.find((tool: { name: string }) => tool.name === 'forge_create_homework_draft')?.description ?? '',
      /_hw/,
    );
    assert.match(
      listed.tools.find((tool: { name: string }) => tool.name === 'forge_open_agent_draft')?.description ?? '',
      /_hw/,
    );
  } finally {
    await client.close();
    await server.close();
  }
});

test('MCP 在 Manifest 前阻止写入，并把能力修订锁传给 renderer', async () => {
  const calls: Array<Record<string, unknown>> = [];
  const { client, server } = await createProtocolHarness(async (request) => {
    calls.push(request);
    if (request.tool === 'forge_get_manifest') {
      return {
        editorVersion: '1.5.0',
        mcpApiVersion: '1.0.0',
        skillVersion: '0.1.0',
        courseSchemaVersion: '1',
        capabilityRevision: '2026-08-05.1',
      };
    }
    return { ok: true };
  });

  try {
    const blocked = await client.callTool({ name: 'forge_begin_transaction', arguments: {} });
    assert.equal(blocked.isError, true);
    assert.match(blocked.content[0]?.text ?? '', /forge_get_manifest/);
    assert.equal(calls.length, 0);

    const manifest = await client.callTool({ name: 'forge_get_manifest', arguments: {} });
    assert.equal(manifest.isError, undefined);
    assert.equal(manifest.structuredContent?.capabilityRevision, '2026-08-05.1');

    const result = await client.callTool({ name: 'forge_begin_transaction', arguments: {} });
    assert.equal(result.isError, undefined);
    assert.equal(calls.length, 2);
    assert.equal(calls[1]?.capabilityRevision, '2026-08-05.1');
    assert.equal(calls[1]?.sessionId, 'protocol-session');
  } finally {
    await client.close();
    await server.close();
  }
});

test('MCP 返回参数校验错误和 renderer 失败，不伪装为成功', async () => {
  const { client, server } = await createProtocolHarness(async (request) => {
    if (request.tool === 'forge_get_manifest') {
      return { capabilityRevision: 'revision-a' };
    }
    throw new Error('CAPABILITY_REVISION_CHANGED：请重新连接 Forge MCP');
  });

  try {
    const invalid = await client.callTool({ name: 'forge_get_tool_guidance', arguments: {} });
    assert.equal(invalid.isError, true);
    assert.match(invalid.content[0]?.text ?? '', /Invalid arguments/);

    await client.callTool({ name: 'forge_get_manifest', arguments: {} });
    const failed = await client.callTool({ name: 'forge_get_editor_state', arguments: {} });
    assert.equal(failed.isError, true);
    assert.match(failed.content[0]?.text ?? '', /CAPABILITY_REVISION_CHANGED/);
  } finally {
    await client.close();
    await server.close();
  }
});
