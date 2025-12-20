import { ApiConfig } from './storage';

/**
 * API Helper for making requests to the universal endpoint
 */
export class ApiHelper {
    /**
     * Call the universal API endpoint with retry logic
     * @param baseURL - Primary API URL
     * @param backupApi - Backup API URL (used if primary fails)
     * @param endpoint - Specific endpoint (humanize, paraphrase, plagiarism)
     * @param text - Text to process
     * @param style - Optional style parameter for humanizer
     * @returns Processed text result
     */
    static async callUniversalApi(
        baseURL: string,
        backupApi: string,
        endpoint: 'humanize' | 'paraphrase' | 'plagiarism',
        text: string,
        style?: 'Casual' | 'Business' | 'Academic',
    ): Promise<string> {
        const requestBody = {
            endpoint,
            text,
            ...(style && { style }),
        };

        try {
            // Try primary URL first
            const response = await fetch(baseURL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestBody),
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            return data.result || data.text || '';
        } catch (primaryError) {
            console.error('Primary API failed, trying backup:', primaryError);

            // Try backup URL
            try {
                const backupResponse = await fetch(backupApi, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(requestBody),
                });

                if (!backupResponse.ok) {
                    throw new Error(`HTTP error! status: ${backupResponse.status}`);
                }

                const backupData = await backupResponse.json();
                return backupData.result || backupData.text || '';
            } catch (backupError) {
                console.error('Backup API also failed:', backupError);
                throw new Error('Both primary and backup APIs failed');
            }
        }
    }

    /**
     * Humanize text using the universal API
     */
    static async humanize(
        config: { baseURL: string; backupApi: string },
        text: string,
        style: 'Casual' | 'Business' | 'Academic',
    ): Promise<string> {
        return this.callUniversalApi(
            config.baseURL,
            config.backupApi,
            'humanize',
            text,
            style,
        );
    }

    /**
     * Paraphrase text using the universal API
     */
    static async paraphrase(
        config: { baseURL: string; backupApi: string },
        text: string,
    ): Promise<string> {
        return this.callUniversalApi(
            config.baseURL,
            config.backupApi,
            'paraphrase',
            text,
        );
    }

    /**
     * Remove plagiarism using the universal API
     */
    static async removePlagiarism(
        config: { baseURL: string; backupApi: string },
        text: string,
    ): Promise<string> {
        return this.callUniversalApi(
            config.baseURL,
            config.backupApi,
            'plagiarism',
            text,
        );
    }
}
