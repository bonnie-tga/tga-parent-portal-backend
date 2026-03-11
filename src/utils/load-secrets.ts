/* eslint-disable prettier/prettier */
import { getSecret, isRunningInGcp } from './secret-manager';

export async function loadSecrets(): Promise<void> {
    // Only load secrets when running in GCP environment
    if (!isRunningInGcp()) {
        console.log('Not running in GCP, skipping secret loading.');
        return;
    }

    console.log('Loading secrets from Secret Manager...');

    try {
        // Define secrets mapping (secret name → environment variable name)
        const secrets = [
            { secretName: 'mongodb-uri', envVar: 'MONGODB_URI' },
            { secretName: 'jwt-secret', envVar: 'JWT_SECRET' },
            { secretName: 'jwt-refresh-secret', envVar: 'JWT_REFRESH_SECRET' },
            { secretName: 'cookie-secret', envVar: 'COOKIE_SECRET' },
            { secretName: 'google-client-id', envVar: 'GOOGLE_CLIENT_ID' },
            { secretName: 'google-client-secret', envVar: 'GOOGLE_CLIENT_SECRET' },
            { secretName: 'microsoft-client-id', envVar: 'MICROSOFT_CLIENT_ID' },
            {
                secretName: 'microsoft-client-secret',
                envVar: 'MICROSOFT_CLIENT_SECRET',
            },
            { secretName: 'mail-password', envVar: 'MAIL_PASSWORD' },
            // Add more secrets as needed
        ];

        // Load all secrets in parallel
        await Promise.all(
            secrets.map(async ({ secretName, envVar }) => {
                try {
                    const value = await getSecret(secretName);
                    process.env[envVar] = value;
                    console.log(`Loaded secret: ${secretName} → ${envVar}`);
                } catch (error) {
                    console.warn(
                        `Failed to load secret ${secretName}, environment variable ${envVar} not set.`,
                    );
                }
            }),
        );

        console.log('All secrets loaded successfully!');
    } catch (error) {
        console.error('Error loading secrets:', error);
    }
}
