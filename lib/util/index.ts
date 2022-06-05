export const isRunOnLocal = (): boolean => {
    return process.env.RUN_ENV === undefined;
};

export const isBlank = (item: string | undefined): boolean => {
    return item === undefined || item === '';
};

export const isNumeric = (string: string): boolean => {
    return /^-?\d+$/.test(string);
};
