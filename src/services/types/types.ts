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
    type: "audio" | "text" | "image" | "document";
    content_type: "chunk" | "complete";
    source?: string;
    mimeType?: string;
    name?: string;
    description?: string;
    source_uuid?: string;
    conversation_uuid?: string;
    uuid?: string;
    duration?: number;
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
