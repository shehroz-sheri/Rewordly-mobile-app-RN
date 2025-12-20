import RNFS from 'react-native-fs';
import { DocumentPickerResponse } from '@react-native-documents/picker';

/**
 * File Reader Utility for extracting text from files
 * Currently supports: .txt files (local extraction)
 * PDF, DOCX, and other formats should be sent to backend for processing
 */
export class FileReader {
    // Maximum file size: 8MB
    private static readonly MAX_FILE_SIZE = 8 * 1024 * 1024; // 8MB in bytes

    /**
     * Validate file size
     * @throws Error if file exceeds maximum size
     */
    static validateFileSize(file: DocumentPickerResponse): void {
        const fileSizeInMB = (file.size || 0) / (1024 * 1024);

        if (file.size && file.size > this.MAX_FILE_SIZE) {
            throw new Error(
                `FILE_TOO_LARGE:File size (${fileSizeInMB.toFixed(2)}MB) exceeds the maximum allowed size of 8MB. Please select a smaller file.`
            );
        }
    }
    /**
     * Read text from a plain text file
     */
    private static async readTextFile(filePath: string): Promise<string> {
        try {
            const content = await RNFS.readFile(filePath, 'utf8');
            return content;
        } catch (error) {
            console.error('Error reading text file:', error);
            throw new Error('Failed to read text file');
        }
    }

    /**
     * Check if file should be processed locally or sent to backend
     */
    static shouldProcessLocally(file: DocumentPickerResponse): boolean {
        const fileName = file.name?.toLowerCase() || '';
        const mimeType = file.type?.toLowerCase() || '';

        // Only process .txt files locally
        return (
            mimeType.includes('text/plain') ||
            fileName.endsWith('.txt') ||
            fileName.endsWith('.text')
        );
    }

    /**
     * Result type for text extraction
     */
    static ExtractionResult = {
        SUCCESS: 'SUCCESS' as const,
        REQUIRES_BACKEND_PDF: 'REQUIRES_BACKEND_PDF' as const,
        REQUIRES_BACKEND_DOCX: 'REQUIRES_BACKEND_DOCX' as const,
        ERROR: 'ERROR' as const,
    };

    /**
     * Extract text from .txt files only
     * For other formats (PDF, DOCX), returns a signal to send to backend
     */
    static async extractTextFromFile(
        file: DocumentPickerResponse,
    ): Promise<{
        status: typeof FileReader.ExtractionResult[keyof typeof FileReader.ExtractionResult];
        text?: string;
        error?: string;
    }> {
        try {
            console.log('📄 File Info:', {
                name: file.name,
                type: file.type,
                size: file.size,
                uri: file.uri,
            });

            // Validate file size first
            this.validateFileSize(file);

            // Get file path (handle both file:// and content:// URIs)
            let filePath = file.uri;

            // For Android content:// URIs, we need to copy to cache first
            if (filePath.startsWith('content://')) {
                const destPath = `${RNFS.CachesDirectoryPath}/${file.name}`;
                await RNFS.copyFile(filePath, destPath);
                filePath = destPath;
            } else if (filePath.startsWith('file://')) {
                filePath = filePath.replace('file://', '');
            }

            // Determine file type
            const fileName = file.name?.toLowerCase() || '';
            const mimeType = file.type?.toLowerCase() || '';

            // Only handle text files locally
            if (
                mimeType.includes('text/plain') ||
                fileName.endsWith('.txt') ||
                fileName.endsWith('.text')
            ) {
                console.log('📝 Processing text file locally...');
                const text = await this.readTextFile(filePath);
                return { status: this.ExtractionResult.SUCCESS, text };
            }

            // For PDF files, signal backend processing needed
            if (mimeType.includes('pdf') || fileName.endsWith('.pdf')) {
                console.log('📄 PDF file detected - backend processing required');
                return { status: this.ExtractionResult.REQUIRES_BACKEND_PDF };
            }

            // For DOCX files, signal backend processing needed
            if (
                mimeType.includes('word') ||
                mimeType.includes('officedocument') ||
                fileName.endsWith('.doc') ||
                fileName.endsWith('.docx')
            ) {
                console.log('📄 DOCX file detected - backend processing required');
                return { status: this.ExtractionResult.REQUIRES_BACKEND_DOCX };
            }

            // Unknown file type - try to read as text
            console.log('❓ Unknown file type, attempting to read as text...');
            try {
                const text = await this.readTextFile(filePath);
                return { status: this.ExtractionResult.SUCCESS, text };
            } catch (err) {
                return {
                    status: this.ExtractionResult.ERROR,
                    error: 'Unsupported file format. Please use TXT, PDF, or DOCX files.',
                };
            }
        } catch (error: any) {
            console.error('❌ Error extracting text from file:', error);
            return {
                status: this.ExtractionResult.ERROR,
                error: error.message || 'Failed to process file',
            };
        }
    }

    /**
     * Validate extracted text
     */
    static validateExtractedText(text: string): {
        isValid: boolean;
        wordCount: number;
        charCount: number;
        error?: string;
    } {
        const trimmedText = text.trim();
        const wordCount = trimmedText
            .split(/\s+/)
            .filter(w => w.length > 0).length;
        const charCount = trimmedText.length;

        if (charCount === 0) {
            return {
                isValid: false,
                wordCount: 0,
                charCount: 0,
                error: 'No text content found in file',
            };
        }

        if (wordCount === 0) {
            return {
                isValid: false,
                wordCount: 0,
                charCount,
                error: 'File contains only special characters',
            };
        }

        return {
            isValid: true,
            wordCount,
            charCount,
        };
    }

    /**
     * Get file as base64 for sending to backend
     * Use this for PDF, DOCX, and other formats that need backend processing
     */
    static async getFileAsBase64(file: DocumentPickerResponse): Promise<string> {
        try {
            // Validate file size first
            this.validateFileSize(file);

            let filePath = file.uri;

            // Handle different URI schemes
            if (filePath.startsWith('content://')) {
                const destPath = `${RNFS.CachesDirectoryPath}/${file.name}`;
                await RNFS.copyFile(filePath, destPath);
                filePath = destPath;
            } else if (filePath.startsWith('file://')) {
                filePath = filePath.replace('file://', '');
            }

            // Read file as base64
            const base64 = await RNFS.readFile(filePath, 'base64');
            return base64;
        } catch (error: any) {
            console.error('❌ Error reading file as base64:', error);

            // If it's a file size error, re-throw it
            if (error.message?.includes('FILE_TOO_LARGE')) {
                throw error;
            }

            // Otherwise, throw a generic error
            throw new Error('Failed to read file. Please try again.');
        }
    }
}
