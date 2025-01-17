interface AgentServer {
  url: string;  // e.g., "http://localhost:3001"
  agentId: string;
}

export class AgentClient {
  private agents: Map<string, AgentServer>;

  constructor() {
    this.agents = new Map();
  }

  registerAgent(agentId: string, serverUrl: string) {
    this.agents.set(agentId, { url: serverUrl, agentId });
  }

  async sendMessage(agentId: string, message: {
    roomId: string,
    userId: string,
    text: string,
    userName?: string
  }) {
    const agent = this.agents.get(agentId);
    if (!agent) throw new Error(`Agent ${agentId} not found`);

    try {
      const formData = new FormData();
      formData.append("text", message.text);
      formData.append("userId", message.userId);
      formData.append("roomId", `${message.roomId}`);

      const response = await fetch(`${agent.url}/${agentId}/message`, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error(`Failed to send message to agent ${agentId}: ${response.statusText}`);
      }

      const data = await response.json();
      return Array.isArray(data) ? data[0]?.text || '' : '';
    } catch (error) {
      console.error(`Error communicating with agent ${agentId}:`, error);
      throw error;
    }
  }

  async checkAgentHealth(agentId: string): Promise<boolean> {
    const agent = this.agents.get(agentId);
    if (!agent) return false;

    try {
      const response = await fetch(`${agent.url}/hello`);
      return response.ok;
    } catch (error) {
      console.error(`Health check failed for agent ${agentId}:`, error);
      return false;
    }
  }
} 
