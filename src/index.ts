import express from 'express';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { GarminClient } from './client';
import {
  registerActivityTools,
  registerHealthTools,
  registerTrendTools,
  registerSleepTools,
  registerBodyTools,
  registerPerformanceTools,
  registerProfileTools,
  registerRangeTools,
  registerSnapshotTools,
  registerTrainingTools,
  registerWellnessTools,
  registerChallengeTools,
  registerWriteTools,
} from './tools';

const GARMIN_EMAIL = process.env.GARMIN_EMAIL;
const GARMIN_PASSWORD = process.env.GARMIN_PASSWORD;
const HTTP_PORT = process.env.PORT ?? process.env.MCP_HTTP_PORT;

if (!GARMIN_EMAIL || !GARMIN_PASSWORD) {
  console.error(
    'Error: GARMIN_EMAIL and GARMIN_PASSWORD environment variables are required.',
  );
  process.exit(1);
}

const garminClient = new GarminClient(GARMIN_EMAIL, GARMIN_PASSWORD);

function createMcpServer(): McpServer {
  const server = new McpServer({
    name: 'garmin-connect-mcp',
    version: '1.1.1',
  });
  registerActivityTools(server, garminClient);
  registerHealthTools(server, garminClient);
  registerTrendTools(server, garminClient);
  registerSleepTools(server, garminClient);
  registerBodyTools(server, garminClient);
  registerPerformanceTools(server, garminClient);
  registerProfileTools(server, garminClient);
  registerRangeTools(server, garminClient);
  registerSnapshotTools(server, garminClient);
  registerTrainingTools(server, garminClient);
  registerWellnessTools(server, garminClient);
  registerChallengeTools(server, garminClient);
  registerWriteTools(server, garminClient);
  return server;
}

async function startStdio(): Promise<void> {
  const server = createMcpServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Garmin Connect MCP server running on stdio');
}

async function startHttp(port: number): Promise<void> {
  const app = express();
  app.use(express.json());

  app.get('/healthz', (_req, res) => {
    res.json({ status: 'ok' });
  });

  app.post('/mcp', async (req, res) => {
    try {
      const server = createMcpServer();
      const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: undefined,
      });
      res.on('close', () => {
        transport.close();
        server.close();
      });
      await server.connect(transport);
      await transport.handleRequest(req, res, req.body);
    } catch (error) {
      console.error('Error handling MCP request:', error);
      if (!res.headersSent) {
        res.status(500).json({
          jsonrpc: '2.0',
          error: { code: -32603, message: 'Internal server error' },
          id: null,
        });
      }
    }
  });

  app.get('/mcp', (_req, res) => {
    res.status(405).json({
      jsonrpc: '2.0',
      error: { code: -32000, message: 'Method not allowed.' },
      id: null,
    });
  });

  app.delete('/mcp', (_req, res) => {
    res.status(405).json({
      jsonrpc: '2.0',
      error: { code: -32000, message: 'Method not allowed.' },
      id: null,
    });
  });

  app.listen(port, () => {
    console.error(`Garmin Connect MCP server running on HTTP port ${port}`);
  });
}

async function main(): Promise<void> {
  if (HTTP_PORT) {
    await startHttp(parseInt(HTTP_PORT, 10));
  } else {
    await startStdio();
  }
}

main().catch((error) => {
  console.error('Fatal error starting server:', error);
  process.exit(1);
});
