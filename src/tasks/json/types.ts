export type TestDataItem = {
  q: string;
  a: string;
};

export type DataItem = {
  question: string;
  answer: number;
  test?: TestDataItem;
};

export type Data = {
  "test-data": DataItem[];
};

export type QuestionItem = {
  original: DataItem;
  question: string;
};
