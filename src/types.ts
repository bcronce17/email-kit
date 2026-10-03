export type Environment = 'development' | 'test' | 'preview' | 'production';

export type Mailbox = {
  address: string;
  name?: string;
};

export type Message = {
  to: string | Mailbox;
  subject: string;
  text: string;
  html?: string;
  replyTo?: string | Mailbox;
  messageId?: string;
};

export type SendResult = {
  messageId: string;
  accepted: string[];
  rejected: string[];
};

export type CapturedMessage = Message & {
  from: Mailbox;
  messageId: string;
};

export type SmtpConfig = {
  host: string;
  port: number;
  tls: 'none' | 'starttls' | 'implicit';
  servername?: string;
  auth?: {
    user: string;
    pass: string;
  };
  timeouts?: {
    connection?: number;
    greeting?: number;
    socket?: number;
    dns?: number;
  };
};

type CommonConfig = {
  from: Mailbox;
  environment: Environment;
};

export type EmailConfig = CommonConfig &
  (
    | { mode: 'memory' }
    | {
        mode: 'capture';
        smtp: SmtpConfig;
        captureHosts?: string[];
      }
    | {
        mode: 'live';
        smtp: SmtpConfig;
        recipientAllowlist?: string[];
      }
  );

export interface EmailClient {
  send(message: Message): Promise<SendResult>;
  verify(): Promise<void>;
  /** Stops new work and waits for already-started operations. */
  close(): Promise<void>;
  /** Memory mode only. Returns detached copies; never exposes SMTP content. */
  getMessages(): CapturedMessage[];
  clearMessages(): void;
}
