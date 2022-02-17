export const ChainDefinitionScriptSchema = {
    properties: {
        exec: { type: 'string' },
    },
    optionalProperties: {
        args: { elements: { type: 'string' } },
        env: { elements: { type: 'string' } }
    }
} as const;