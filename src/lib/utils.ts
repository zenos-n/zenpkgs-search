export const capitalize = <T extends string>(str: T): Capitalize<T> => {
    if (!str) return str as Capitalize<T>;
    return (str.charAt(0).toUpperCase() + str.slice(1)) as Capitalize<T>;
};

/**
 * Resolves a dot-notation string path against an object.
 * Satisfies ESLint 'no-any' and handles specific Interface types.
 */
export function getValueByPath<ReturnType = unknown>(
    obj: object,
    path: string
): ReturnType | undefined {
    const parts = path.split('.');

    // Start with the object as unknown to satisfy the reducer
    let current: unknown = obj;

    for (const part of parts) {
        if (current !== null && typeof current === 'object' && part in current) {
            // We use a type assertion here to access the dynamic key safely
            current = (current as Record<string, unknown>)[part];
        } else {
            return undefined;
        }
    }

    return current as ReturnType;
}