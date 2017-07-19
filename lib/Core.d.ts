export interface WatchFileResponse {
    path: string;
    lastModifiedDate: number;
    deleted?: boolean;
}
export interface WatchFileRequest {
    getCurrent: boolean;
}
