export type Message = {
  [key: string]: string;
};

export type PhoneLog = {
  start: string;
  end: string;
  length: number;
};

export type RebuiltPhoneLog = {
  messages: Message;
  length: number;
};

export type ConversationsData = {
  [key: string]: PhoneLog | string[];
  reszta: string[];
};
