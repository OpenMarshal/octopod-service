export interface ServiceCommand {
    command: string;
    data: any;
}
export interface ServiceCommandResponse<T> {
    statusCode: number;
    statusMessage: string;
    data?: T;
}
