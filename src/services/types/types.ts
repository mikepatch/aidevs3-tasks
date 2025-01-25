import OpenAI from "openai";

export type ImageConfig = {
  prompt: string;
  model?: OpenAI.ImageModel;
  size?: OpenAI.ImageEditParams["size"];
};

export type TDoc = {
  text: string;
  metadata: {
    tokens: number;
    source?: string; // url / path
    mimeType?: string; // mime type
    name?: string; // filename
    source_uuid?: string;
    conversation_uuid?: string;
    uuid?: string;
    duration?: number; // duration in seconds
    headers?: Headers;
    urls?: string[];
    images?: string[];
    screenshots?: string[];
    chunk_index?: number;
    total_chunks?: number;
  };
};

export type Headers = {
  [key: string]: string[];
};
