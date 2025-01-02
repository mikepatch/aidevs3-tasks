export const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

export const extractFilenameFromUrl = (url: string): string => {
  const urlParts = url.split("/");
  return urlParts[urlParts.length - 1];
};
