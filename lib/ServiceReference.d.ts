export interface ServiceReferenceInput {
    isVolatile?: boolean;
    flushed?: boolean;
    encrypt?: boolean;
    mainOutputMethod?: string;
    outputs?: {
        [method: string]: number;
    };
}
export interface ServiceReference {
    aliases?: string[];
    inputs: {
        [method: string]: ServiceReferenceInput;
    };
}
export interface ServiceReferenceExtended extends ServiceReference {
    name: string;
    owner?: string;
}
