// Format Date (supports Thai Buddhist Calendar)
export const formatDate = (date: string | Date, locale: string = 'en-US'): string => {
    const d = new Date(date);
    const options: Intl.DateTimeFormatOptions = {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        calendar: locale === 'th' ? 'buddhist' : 'gregory'
    };

    // Use 'th-TH' for Thai locale to trigger Buddhist calendar correctly if supported by browser
    const browserLocale = locale === 'th' ? 'th-TH-u-ca-buddhist' : 'en-US';

    return new Intl.DateTimeFormat(browserLocale, options).format(d);
};

// Format Number
export const formatNumber = (num: number, locale: string = 'en-US'): string => {
    const browserLocale = locale === 'th' ? 'th-TH' : 'en-US';
    return new Intl.NumberFormat(browserLocale).format(num);
};

// Format Currency
export const formatCurrency = (amount: number, currency: string = 'USD', locale: string = 'en-US'): string => {
    const browserLocale = locale === 'th' ? 'th-TH' : 'en-US';
    return new Intl.NumberFormat(browserLocale, {
        style: 'currency',
        currency: currency
    }).format(amount);
};
