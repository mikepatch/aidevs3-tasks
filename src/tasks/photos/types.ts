export type ACTION = "REPAIR" | "DARKEN" | "BRIGHTEN";
export type ImageDescription = {
  filename: string;
  description: string;
  needsImprovement: boolean;
};

export type ProcessedImage = {
  url: string;
  filename: string;
  description: string;
};

export type AgentDecision = {
  _thinking: string;
  extractUrls: boolean;
  describeImage: boolean;
  repairImage: boolean;
  darkenImage: boolean;
  brightenImage: boolean;
  next_step: string;
};
