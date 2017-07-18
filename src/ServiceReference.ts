
export interface ServiceReference
{
    aliases ?: string[]
    inputs : {
        [method : string] : {
            isVolatile ?: boolean
            flushed ?: boolean
            encrypt ?: boolean
            mainOutputMethod ?: string
            outputs ?: {
                [method : string] : number
            }
        }
    }
}

export interface ServiceReferenceExtended extends ServiceReference
{
    name : string
}
