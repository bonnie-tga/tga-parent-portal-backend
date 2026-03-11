/* eslint-disable prettier/prettier */
import { SecretManagerServiceClient } from '@google-cloud/secret-manager';

const client = new SecretManagerServiceClient();

export async function getSecret(secretName: string): Promise<string> {
    try {
        const projectId = process.env.GOOGLE_CLOUD_PROJECT;
        if (!projectId) {
            throw new Error('GOOGLE_CLOUD_PROJECT environment variable not set');
        }

        const name = `projects/${projectId}/secrets/${secretName}/versions/latest`;
        const [version] = await client.accessSecretVersion({ name });

        if (!version.payload || !version.payload.data) {
            throw new Error(`Secret ${secretName} not found or empty`);
        }

        return version.payload.data.toString();
    } catch (error) {
        console.error(`Error accessing secret ${secretName}:`, error);
        throw error;
    }
}

// Helper function to check if running in GCP environment
export function isRunningInGcp(): boolean {
    return !!process.env.GAE_SERVICE;
}
