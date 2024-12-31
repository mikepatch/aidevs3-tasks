type AnswerType = string | string[] | number | number[] | object;

export class TasksProvider {
  protected API_KEY: string;
  private rootUrl: string;

  constructor() {
    this.API_KEY = import.meta.env.AIDEVS_API_KEY;
    this.rootUrl = "https://centrala.ag3nts.org";
  }

  async getData(taskName: string) {
    return this._fetch(`/data/${this.API_KEY}/${taskName}`);
  }

  async getDataFromEndpoint(endpoint: string, query: string) {
    const options: RequestInit = {
      method: "POST",
      body: JSON.stringify({
        apikey: this.API_KEY,
        query,
      }),
    };

    return this._fetch(`/${endpoint}`, options);
  }

  async queryDatabase(query: string) {
    const options: RequestInit = {
      method: "POST",
      body: JSON.stringify({
        task: "database",
        apikey: this.API_KEY,
        query,
      }),
    };

    return this._fetch("/apidb", options);
  }

  async getDataFromReportEndpoint(taskName: string, query: string) {
    const options: RequestInit = {
      method: "POST",
      body: JSON.stringify({
        task: taskName,
        apikey: this.API_KEY,
        answer: query,
      }),
    };

    return this._fetch("/report", options);
  }

  async sendAnswer(
    taskName: string,
    answer: AnswerType
  ): Promise<{ code: number; message: string }> {
    const options: RequestInit = {
      method: "POST",
      body: JSON.stringify({ task: taskName, apikey: this.API_KEY, answer }),
    };

    return this._fetch("/report/verify", options);
  }

  private async _fetch(additionalPath = "", options?: RequestInit) {
    try {
      const url = this.rootUrl + additionalPath;
      const response = await fetch(url, options);
      const responseText = await response.text();

      try {
        return JSON.parse(responseText);
      } catch {
        return responseText;
      }
    } catch (err) {
      throw console.error("Error: ", err);
    }
  }
}
