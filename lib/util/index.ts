export const isRunOnLocal = (): boolean => {
    return process.env.RUN_ENV === undefined;
};
