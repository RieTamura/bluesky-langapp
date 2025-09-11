import { Request, Response } from "express";
import DataService from "../services/dataService.js";
import DictionaryService from "../services/dictionaryService.js";
import AuthController from "./authController.js";
import type {
  CreateWordRequest,
  UpdateWordRequest,
  WordData,
} from "../types/data.js";
import { validateWordData } from "../utils/dataUtils.js";
import { normalizeWord } from "../utils/textProcessor.js";

export class WordsController {
  private static dataService = new DataService();

  /**
   * GET /api/words
   * Get all words for the authenticated user
   */
  static async getWords(req: Request, res: Response): Promise<void> {
    try {
      // Get userId from authenticated session. For development builds allow a
      // fallback to the demo account `default_user` when no session is present.
      let userId = AuthController.getUserId(req);
      if (!userId) {
        if (process.env.NODE_ENV === 'development') {
          console.log('No session found; development fallback to default_user');
          userId = 'default_user';
        } else {
          res.status(401).json({
            error: "Authentication required",
            message: "Valid session required",
          });
          return;
        }
      }

      // Get query parameters for filtering
      const status = req.query.status as string;
      const limit = parseInt(req.query.limit as string) || undefined;
      const offset = parseInt(req.query.offset as string) || 0;
      // Query key: `languageCode` (singular). May contain a comma-separated list of language codes
      // (e.g. `languageCode=en,ja`). Values will be split on commas and trimmed before use.
      // Expected format: lowercase ISO language codes (e.g. 'en', 'ja'). Invalid entries are ignored.
      const languageCodesParam = req.query.languageCode as string | undefined;

      let words: WordData[] =
        await WordsController.dataService.getWords(userId);
      console.log(`Words API - User: ${userId}, Total words: ${words.length}`);

  // (Previously: attempted a fallback to default_user when user's list was empty.)
  // With the development-mode early substitution above there is no need to
  // try a second fallback here.

      // Filter by status if provided
      if (status && ["unknown", "learning", "known"].includes(status)) {
        words = words.filter((word) => word.status === status);
      }

      // Filter by languageCode(s) if provided
      if (languageCodesParam) {
        const langs = languageCodesParam
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);
        if (langs.length > 0) {
          words = words.filter((w: WordData) =>
            langs.includes(w.languageCode ?? "en"),
          );
        }
      }

      // Apply pagination
      const total = words.length;
      if (limit) {
        words = words.slice(offset, offset + limit);
      }

      res.json({
        success: true,
        data: words,
        meta: {
          total,
          count: words.length,
          offset,
          limit: limit || total,
        },
      });
    } catch (error) {
      console.error("Get words error:", error);
      res.status(500).json({
        error: "Failed to fetch words",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  /**
   * POST /api/words
   * Create a new word
   */
  static async createWord(req: Request, res: Response): Promise<void> {
    try {
      const userId = AuthController.getUserId(req);
      if (!userId) {
        res.status(401).json({
          error: "Authentication required",
          message: "Valid session required",
        });
        return;
      }
      const wordData: CreateWordRequest = req.body;

      // Validate required fields
      if (
        !wordData.word ||
        typeof wordData.word !== "string" ||
        wordData.word.trim().length === 0
      ) {
        res.status(400).json({
          error: "Invalid word data",
          message: "Word text is required and must be a non-empty string",
        });
        return;
      }

      // Check if word already exists for this user
      const existingWords = await WordsController.dataService.getWords(userId);
      const normalizedWord = normalizeWord(wordData.word);
      const targetLang = wordData.languageCode || "en";
      const existingWord = existingWords.find((w) => {
        const storedNorm =
          (w as any).normalizedWord ?? normalizeWord(w.word || "");
        const storedLang = (w as any).languageCode || "en";
        return storedNorm === normalizedWord && storedLang === targetLang;
      });

      if (existingWord) {
        res.status(409).json({
          error: "Word already exists",
          message: `Word "${wordData.word}" is already in your vocabulary`,
          data: existingWord,
        });
        return;
      }

      // Create new word
      const newWord = await WordsController.dataService.saveWord({
        // store original word for display, but include normalizedWord for matching
        word: wordData.word,
        normalizedWord: normalizedWord,
        status: wordData.status || "unknown",
        userId,
        languageCode: wordData.languageCode || "en",
        definition: wordData.definition,
        exampleSentence: wordData.exampleSentence,
      });

      res.status(201).json({
        success: true,
        data: newWord,
        message: "Word created successfully",
      });
    } catch (error) {
      console.error("Create word error:", error);
      res.status(500).json({
        error: "Failed to create word",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  /**
   * PUT /api/words/:id
   * Update an existing word
   */
  static async updateWord(req: Request, res: Response): Promise<void> {
    try {
      const userId = AuthController.getUserId(req);
      if (!userId) {
        res.status(401).json({
          error: "Authentication required",
          message: "Valid session required",
        });
        return;
      }
      const wordId = req.params.id;
      const updateData: UpdateWordRequest = req.body;

      // Get existing word
      const existingWord =
        await WordsController.dataService.getWordById(wordId);
      if (!existingWord) {
        res.status(404).json({
          error: "Word not found",
          message: `Word with ID "${wordId}" not found`,
        });
        return;
      }

      // Check if word belongs to the user
      if (existingWord.userId !== userId) {
        res.status(403).json({
          error: "Access denied",
          message: "You can only update your own words",
        });
        return;
      }

      // Validate status if provided
      if (
        updateData.status &&
        !["unknown", "learning", "known"].includes(updateData.status)
      ) {
        res.status(400).json({
          error: "Invalid status",
          message: "Status must be one of: unknown, learning, known",
        });
        return;
      }

      // Update word
      const updatedWord = await WordsController.dataService.saveWord({
        ...existingWord,
        ...updateData,
        id: wordId,
        languageCode:
          updateData.languageCode || existingWord.languageCode || "en",
        lastReviewedAt: updateData.status
          ? new Date().toISOString()
          : existingWord.lastReviewedAt,
      });

      res.json({
        success: true,
        data: updatedWord,
        message: "Word updated successfully",
      });
    } catch (error) {
      console.error("Update word error:", error);
      res.status(500).json({
        error: "Failed to update word",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  /**
   * GET /api/words/:id
   * Get a specific word by ID
   */
  static async getWord(req: Request, res: Response): Promise<void> {
    try {
      const userId = AuthController.getUserId(req);
      if (!userId) {
        res.status(401).json({
          error: "Authentication required",
          message: "Valid session required",
        });
        return;
      }
      const wordId = req.params.id;

      const word = await WordsController.dataService.getWordById(wordId);
      if (!word) {
        res.status(404).json({
          error: "Word not found",
          message: `Word with ID "${wordId}" not found`,
        });
        return;
      }

      // Check if word belongs to the user
      if (word.userId !== userId) {
        res.status(403).json({
          error: "Access denied",
          message: "You can only access your own words",
        });
        return;
      }

      res.json({
        success: true,
        data: word,
      });
    } catch (error) {
      console.error("Get word error:", error);
      res.status(500).json({
        error: "Failed to fetch word",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  /**
   * DELETE /api/words/:id
   * Delete a word
   */
  static async deleteWord(req: Request, res: Response): Promise<void> {
    try {
      const userId = AuthController.getUserId(req);
      if (!userId) {
        res.status(401).json({
          error: "Authentication required",
          message: "Valid session required",
        });
        return;
      }
      const wordId = req.params.id;

      // Get existing word to check ownership
      const existingWord =
        await WordsController.dataService.getWordById(wordId);
      if (!existingWord) {
        res.status(404).json({
          error: "Word not found",
          message: `Word with ID "${wordId}" not found`,
        });
        return;
      }

      // Check if word belongs to the user
      if (existingWord.userId !== userId) {
        res.status(403).json({
          error: "Access denied",
          message: "You can only delete your own words",
        });
        return;
      }

      // Delete word
      const deleted = await WordsController.dataService.deleteWord(wordId);
      if (!deleted) {
        res.status(500).json({
          error: "Failed to delete word",
          message: "Word could not be deleted",
        });
        return;
      }

      res.json({
        success: true,
        message: "Word deleted successfully",
      });
    } catch (error) {
      console.error("Delete word error:", error);
      res.status(500).json({
        error: "Failed to delete word",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  /**
   * GET /api/words/:word/definition
   * Get dictionary definition for a word
   */
  static async getWordDefinition(req: Request, res: Response): Promise<void> {
    try {
      const userId = AuthController.getUserId(req);
      if (!userId) {
        res.status(401).json({
          error: "Authentication required",
          message: "Valid session required",
        });
        return;
      }

      const word = req.params.word;

      if (!word || typeof word !== "string" || word.trim().length === 0) {
        res.status(400).json({
          error: "Invalid word parameter",
          message: "Word parameter is required and must be a non-empty string",
        });
        return;
      }

      // Validate word format (basic validation)
      const normalizedWord = word.trim().toLowerCase();
      if (!/^[a-zA-Z\-']+$/.test(normalizedWord)) {
        res.status(400).json({
          error: "Invalid word format",
          message: "Word must contain only letters, hyphens, and apostrophes",
        });
        return;
      }

      console.log(
        `Fetching definition for word: ${normalizedWord} (user: ${userId})`,
      );

      // Get definition from dictionary service
      const definition = await DictionaryService.getDefinition(normalizedWord);

      if (!definition) {
        res.status(404).json({
          error: "Definition not found",
          message: `No definition found for word "${word}"`,
          word: normalizedWord,
        });
        return;
      }

      res.json({
        success: true,
        data: definition,
        message: "Definition retrieved successfully",
      });
    } catch (error) {
      console.error("Get word definition error:", error);

      // Handle specific error types
      if (error instanceof Error) {
        if (error.message.includes("timeout")) {
          res.status(504).json({
            error: "Dictionary service timeout",
            message:
              "The dictionary service is currently unavailable. Please try again later.",
          });
          return;
        }

        if (error.message.includes("Dictionary API error")) {
          res.status(502).json({
            error: "Dictionary service error",
            message:
              "The dictionary service is experiencing issues. Please try again later.",
          });
          return;
        }
      }

      res.status(500).json({
        error: "Failed to fetch definition",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
}

export default WordsController;
