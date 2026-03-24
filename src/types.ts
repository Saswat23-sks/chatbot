export type Persona = 'Witty' | 'Empathetic' | 'Formal' | 'Sarcastic' | 'Helpful Assistant' | 'Curious Explorer' | 'Analytical' | 'Philosophical' | 'Humorous';

export interface Message {
  id: string;
  text: string;
  sender: 'user' | 'bot';
  timestamp: Date;
  sentiment?: 'positive' | 'neutral' | 'negative';
  isError?: boolean;
  feedback?: 'up' | 'down';
  sources?: { uri: string; title: string }[];
  file?: {
    name: string;
    type: string;
    size: number;
    url?: string;
    content?: string; // For text/csv/json
    base64?: string; // For images/pdfs
  };
  replyTo?: {
    id: string;
    text: string;
    sender: 'user' | 'bot';
  };
}

export interface ChatRule {
  patterns: string[];
  responses: string[];
}
