import { Request, Response, NextFunction } from 'express';

export interface RequestWithLocale extends Request {
    locale?: string;
}

export const localeMiddleware = (req: RequestWithLocale, res: Response, next: NextFunction) => {
    const acceptLanguage = req.headers['accept-language'];

    // Simple parser: take the first language or default to 'en'
    // Real world: use a parser library to handle 'en-US,en;q=0.9'
    let locale = 'en';

    if (acceptLanguage) {
        const preferred = acceptLanguage.split(',')[0].trim();
        if (preferred.startsWith('th')) locale = 'th';
        else if (preferred.startsWith('en')) locale = 'en';
    }

    req.locale = locale;
    next();
};
