export type ProcessedData = {
  filename: string;
  desc: string;
};

export type Image = {
  filename: string;
  base64: string;
  desc: string;
};

export type Recording = {
  filename: string;
  buffer: Buffer;
};