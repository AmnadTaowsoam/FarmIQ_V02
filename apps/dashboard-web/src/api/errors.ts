export interface ApiError {
    status: number;
    code: string;
    message: string;
    requestId?: string;
    details?: Record<string, unknown>;
}

export const parseApiError = (error: any): ApiError => {
    // If it's already an ApiError from the client, return as is
    if (error && typeof error.status === 'number' && error.code && error.message) {
        return error as ApiError;
    }

    // Default fallback
    const fallback: ApiError = {
        status: 500,
        code: 'UNKNOWN_ERROR',
        message: 'An unexpected error occurred.',
    };

    if (!error) return fallback;

    // Handle string errors
    if (typeof error === 'string') {
        return { ...fallback, message: error };
    }

    // Handle Error objects
    if (error instanceof Error) {
        return { ...fallback, message: error.message };
    }

    return fallback;
};
