import { ImageAnnotatorClient } from "@google-cloud/vision";
import { google } from "googleapis";
import { logMessage } from "../utils";

export class GoogleCloudService {
  private authClient: any;
  private readonly SCOPES = ["https://www.googleapis.com/auth/cloud-vision"];

  constructor() {
    this.initializeGoogleAuth();
  }

  private async initializeGoogleAuth() {
    try {
      logMessage({
        type: "process",
        title: "Initializing Google Cloud Authentication",
      });

      const credentials = {
        type: "service_account",
        project_id: process.env.GOOGLE_PROJECT_ID,
        private_key_id: process.env.GOOGLE_PRIVATE_KEY_ID,
        private_key: require("dotenv")
          .config()
          .parsed.GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n"), // Use parsed value directly
        client_email: process.env.GOOGLE_CLIENT_EMAIL,
        client_id: process.env.GOOGLE_CLIENT_ID,
        auth_uri: "https://accounts.google.com/o/oauth2/auth",
        token_uri: "https://oauth2.googleapis.com/token",
        auth_provider_x509_cert_url:
          "https://www.googleapis.com/oauth2/v1/certs",
        client_x509_cert_url: `https://www.googleapis.com/robot/v1/metadata/x509/${process.env.GOOGLE_CLIENT_EMAIL}`,
      };

      this.authClient = new google.auth.GoogleAuth({
        credentials,
        scopes: this.SCOPES,
      });

      logMessage({
        type: "success",
        title: "Google Cloud Authentication Initialized",
        details: {
          "Project ID": process.env.GOOGLE_PROJECT_ID,
          "Client Email": process.env.GOOGLE_CLIENT_EMAIL,
          Scopes: this.SCOPES.join(", "),
        },
      });
    } catch (error: any) {
      logMessage({
        type: "error",
        title: "Google Cloud Authentication Failed",
        message: error.message,
        details: {
          "Project ID": process.env.GOOGLE_PROJECT_ID,
          "Client Email": process.env.GOOGLE_CLIENT_EMAIL,
        },
      });
      throw error;
    }
  }

  async detectDocumentText(
    imageBuffer: Buffer,
    options: {
      languageHints?: string[];
      retries?: number;
      retryDelay?: number;
    } = {}
  ): Promise<string> {
    const { languageHints = ["pl"], retries = 3, retryDelay = 1000 } = options;
    let attemptsLeft = retries;

    try {
      const visionClient = new ImageAnnotatorClient({
        auth: this.authClient,
      });

      logMessage({
        type: "process",
        title: "Starting Document Text Detection",
        details: {
          "Image size": `${imageBuffer.length} bytes`,
          "Language hints": languageHints.join(", "),
          "Max retries": retries,
        },
      });

      while (attemptsLeft > 0) {
        try {
          const [result] = await visionClient.annotateImage({
            image: {
              content: imageBuffer.toString("base64"),
            },
            imageContext: {
              languageHints,
            },
            features: [{ type: "DOCUMENT_TEXT_DETECTION" as const }],
          });

          let text = result.fullTextAnnotation?.text;
          if (!text && result.textAnnotations?.[0]?.description) {
            text = result.textAnnotations[0].description;
          }

          if (text?.trim()) {
            logMessage({
              type: "success",
              title: "Text Successfully Extracted",
              details: {
                "Text length": `${text.trim().length} characters`,
                Sample: `${text.trim().substring(0, 50)}...`,
              },
            });
            return text.trim();
          }

          attemptsLeft--;
          if (attemptsLeft > 0) {
            logMessage({
              type: "warning",
              title: "No Text Found in Image",
              details: {
                "Attempts left": attemptsLeft,
                "Retry delay": `${retryDelay}ms`,
              },
            });
            await new Promise((resolve) => setTimeout(resolve, retryDelay));
          }
        } catch (error: unknown) {
          attemptsLeft--;
          if (attemptsLeft > 0) {
            logMessage({
              type: "warning",
              title: "API Request Failed",
              message: error instanceof Error ? error.message : String(error),
              details: {
                "Attempts left": attemptsLeft,
                "Retry delay": `${retryDelay}ms`,
              },
            });
            await new Promise((resolve) => setTimeout(resolve, retryDelay));
          } else {
            throw error;
          }
        }
      }

      logMessage({
        type: "error",
        title: "Text Detection Failed",
        message: "Maximum retry attempts reached with no text found",
      });
      return "";
    } catch (error) {
      logMessage({
        type: "error",
        title: "Fatal Error in Text Detection",
        message: error instanceof Error ? error.message : String(error),
      });
      return "";
    }
  }
}
