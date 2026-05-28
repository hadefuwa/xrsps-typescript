/**
 * WebSocket bot client for full-stack integration tests.
 * Connects to a running game server and controls a player character.
 *
 * Usage:
 *   const bot = new BotClient({ username: "TestBot1", password: "test" });
 *   await bot.connect();
 *   await bot.waitForLogin();
 *   await bot.sendInventoryUse(slot, itemId, "eat");
 *   const hp = await bot.waitForHpChange();
 *   bot.disconnect();
 */

import WebSocket from "ws";
import { encodeMessage } from "../../../server/src/network/messages";
import { decodeClientPacket } from "../../../server/src/network/packet/ClientBinaryDecoder";

export interface BotOptions {
    username: string;
    password: string;
    host?: string;
    port?: number;
    timeoutMs?: number;
}

export interface BotMessage {
    type: string;
    payload?: any;
}

type MessageHandler = (msg: BotMessage) => void;

export class BotClient {
    private ws: WebSocket | null = null;
    private handlers = new Map<string, MessageHandler[]>();
    private messageQueue: BotMessage[] = [];
    private connected = false;
    private loggedIn = false;
    private opts: Required<BotOptions>;

    constructor(opts: BotOptions) {
        this.opts = {
            host: "localhost",
            port: 43594,
            timeoutMs: 10000,
            ...opts,
        };
    }

    async connect(): Promise<void> {
        const url = `ws://${this.opts.host}:${this.opts.port}`;
        this.ws = new WebSocket(url);

        return new Promise((resolve, reject) => {
            const timer = setTimeout(() => reject(new Error("Connection timeout")), this.opts.timeoutMs);

            this.ws!.on("open", () => {
                clearTimeout(timer);
                this.connected = true;
                resolve();
            });

            this.ws!.on("message", (raw: Buffer) => {
                this.handleRawMessage(raw);
            });

            this.ws!.on("error", (err) => {
                reject(err);
            });

            this.ws!.on("close", () => {
                this.connected = false;
                this.loggedIn = false;
            });
        });
    }

    private handleRawMessage(raw: Buffer): void {
        try {
            // Server sends binary messages — decode using server's own decoder
            // The server's encodeMessage encodes ServerToClient; we need to decode it
            // For now, attempt JSON fallback for simple messages
            const text = raw.toString("utf8");
            if (text.startsWith("{")) {
                const msg = JSON.parse(text) as BotMessage;
                this.dispatch(msg);
                return;
            }
        } catch {}

        // Binary message — store raw for inspection
        this.messageQueue.push({ type: "__binary__", payload: raw });
    }

    private dispatch(msg: BotMessage): void {
        this.messageQueue.push(msg);
        const listeners = this.handlers.get(msg.type) ?? [];
        for (const handler of listeners) {
            handler(msg);
        }
    }

    on(type: string, handler: MessageHandler): void {
        const existing = this.handlers.get(type) ?? [];
        this.handlers.set(type, [...existing, handler]);
    }

    off(type: string, handler: MessageHandler): void {
        const existing = this.handlers.get(type) ?? [];
        this.handlers.set(type, existing.filter((h) => h !== handler));
    }

    waitFor(type: string, timeoutMs?: number): Promise<BotMessage> {
        const timeout = timeoutMs ?? this.opts.timeoutMs;
        return new Promise((resolve, reject) => {
            const timer = setTimeout(() => {
                this.off(type, handler);
                reject(new Error(`Timeout waiting for message type "${type}"`));
            }, timeout);

            const handler: MessageHandler = (msg) => {
                clearTimeout(timer);
                this.off(type, handler);
                resolve(msg);
            };

            this.on(type, handler);
        });
    }

    // ── Outgoing messages ────────────────────────────────────────────

    sendRaw(data: Uint8Array): void {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
            throw new Error("Not connected");
        }
        this.ws.send(data);
    }

    async login(): Promise<void> {
        // Build login packet: [length(2), opcode(1), username, password, revision(4)]
        const { ClientPacketId } = await import("../../../src/shared/packets/ClientPacketId");
        const username = this.opts.username;
        const password = this.opts.password;
        const revision = 237; // match target.txt

        const usernameBytes = Buffer.from(username + "\0", "utf8");
        const passwordBytes = Buffer.from(password + "\0", "utf8");
        const payloadLen = usernameBytes.length + passwordBytes.length + 4;
        const buf = Buffer.allocUnsafe(3 + payloadLen);

        buf.writeUInt16BE(1 + payloadLen, 0);       // length
        buf.writeUInt8(ClientPacketId.LOGIN ?? 204, 2); // opcode
        usernameBytes.copy(buf, 3);
        passwordBytes.copy(buf, 3 + usernameBytes.length);
        buf.writeInt32BE(revision, 3 + usernameBytes.length + passwordBytes.length);

        this.sendRaw(buf);
    }

    async sendInventoryUse(slot: number, itemId: number, option: string = "eat"): Promise<void> {
        const { ClientPacketId } = await import("../../../src/shared/packets/ClientPacketId");
        const optBytes = Buffer.from(option + "\0", "utf8");
        const payloadLen = 2 + 2 + optBytes.length;
        const buf = Buffer.allocUnsafe(3 + payloadLen);

        buf.writeUInt16BE(1 + payloadLen, 0);
        buf.writeUInt8(ClientPacketId.INVENTORY_USE ?? 240, 2);
        buf.writeUInt16BE(slot, 3);
        buf.writeUInt16BE(itemId, 5);
        optBytes.copy(buf, 7);

        this.sendRaw(buf);
    }

    async sendIfClose(): Promise<void> {
        const { ClientPacketId } = await import("../../../src/shared/packets/ClientPacketId");
        const buf = Buffer.allocUnsafe(3);
        buf.writeUInt16BE(1, 0); // length = 1 (opcode only)
        buf.writeUInt8(ClientPacketId.IF_CLOSE ?? 251, 2);
        this.sendRaw(buf);
    }

    disconnect(): void {
        this.ws?.close();
        this.ws = null;
    }

    isConnected(): boolean {
        return this.connected;
    }

    isLoggedIn(): boolean {
        return this.loggedIn;
    }

    getMessageQueue(): BotMessage[] {
        return [...this.messageQueue];
    }
}
