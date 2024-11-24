export type ResizedImageMetadata = {
  width: number;
  height: number;
};

export type ImageMessage = {
  type: "image_url";
  image_url: {
    url: string;
    detail: "low" | "high";
  };
};

export type TextMessage = {
  type: "text";
  text: string;
};
