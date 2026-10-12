import { CONFIG } from "../config";

export class SolanaService {
  /**
   * Fetches raw account info from Solana RPC via native JSON-RPC
   */
  async getAccountInfo(pubkey: string): Promise<any> {
    try {
      const response = await fetch(CONFIG.SOLANA_RPC_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method: "getAccountInfo",
          params: [pubkey, { encoding: "base64" }],
        }),
      });
      const data = (await response.json()) as any;
      return data?.result?.value || null;
    } catch (err) {
      console.error(`Error querying RPC for ${pubkey}:`, err);
      return null;
    }
  }
}

export const solanaService = new SolanaService();
