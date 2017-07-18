export declare function call(coreUrl: string, service: string, method: string, inputData: any, callback: (response: any, responsePaths: {
    [method: string]: string[];
}) => void): void;
export declare function call<T>(coreUrl: string, service: string, method: string, inputData: any, callback: (response: T, responsePaths: {
    [method: string]: string[];
}) => void): void;
export declare function call<T, Q>(coreUrl: string, service: string, method: string, inputData: Q, callback: (response: T, responsePaths: {
    [method: string]: string[];
}) => void): void;
