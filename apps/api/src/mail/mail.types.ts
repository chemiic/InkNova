export interface SendMailInput {
  to: string;
  subject: string;
  text: string;
  html?: string;
  replyTo?: string;
}
