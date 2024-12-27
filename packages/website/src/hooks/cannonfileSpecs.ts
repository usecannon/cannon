import { chainDefinitionSchema } from '@usecannon/builder/dist/src/schemas';
import { runSchema } from '@usecannon/cli/dist/src/schemas';
import { compile } from 'json-schema-to-typescript';
import { useQuery } from '@tanstack/react-query';
import { zodToJsonSchema } from 'zod-to-json-schema';

interface CannonfileSpec {
  description: string;
  deprecated?: boolean;
  specs: Spec[];
}

interface Spec {
  name: string;
  type: string;
  description: string;
}

const getSpec = async (jsonSchema: any, propName: string): Promise<Spec> => {
  return {
    name: propName + (jsonSchema.required?.includes(propName) ? '' : '?'),
    type: await getJsonSchemaPropType(jsonSchema.properties[propName]),
    description: jsonSchema.properties[propName].description,
  };
};

const getJsonSchemaPropType = async (prop: any) => {
  prop = { ...prop };
  prop.description = '';

  let result = (
    await compile(prop, 'Type', {
      format: false,
      bannerComment: '',
    })
  ).trim();

  if (result[result.length - 1] === ';') {
    result = result.slice(0, -1);
  }

  return result.replace('export interface Type ', '').replace('export type Type = ', '');
};

async function fetchCannonfileSpecs() {
  const chainDefinitionJsonSchema = zodToJsonSchema(chainDefinitionSchema, {
    $refStrategy: 'none',
  });

  const runJsonSchema = zodToJsonSchema(runSchema, {
    $refStrategy: 'none',
  });

  const result = new Map<string, CannonfileSpec>();

  const metadataKeys = ['name', 'preset', 'version', 'description', 'keywords', 'privateSourceCode', 'deployers'];
  const metadataSpecs: Spec[] = [];
  for (const key of metadataKeys) {
    metadataSpecs.push(await getSpec(chainDefinitionJsonSchema, key));
  }

  result.set('metadata', {
    description: 'Provide metadata for your Cannonfile. These are the top-most attributes on your Cannonfile.',
    specs: metadataSpecs,
  });

  for (const stepName in (chainDefinitionJsonSchema as any).properties) {
    if (metadataKeys.includes(stepName)) {
      continue;
    }

    const stepSpecs: Spec[] = [];
    const stepJsonSchema = (chainDefinitionJsonSchema as any).properties[stepName].additionalProperties;

    for (const key in stepJsonSchema?.properties) {
      stepSpecs.push(await getSpec(stepJsonSchema, key));
    }
    result.set(stepName, {
      description: (chainDefinitionJsonSchema as any).properties[stepName].description,
      specs: stepSpecs,
    });
  }

  const runSpecs: Spec[] = [];
  for (const key in (runJsonSchema as any).properties) {
    runSpecs.push(await getSpec(runJsonSchema, key));
  }
  result.set('run', {
    description:
      '⚠ This operation breaks composability—only use this as a last resort. (Instead, you should use a custom Cannon plug-in if this is necessary for your deployment.) Execute a custom script. This script is passed a ChainBuilder object as parameter.',
    specs: runSpecs,
  });

  const deprecatedKeys = ['setting', 'provision', 'import', 'contract'];
  for (const key of deprecatedKeys) {
    if (result.has(key)) {
      const step = result.get(key);
      if (step) {
        step.deprecated = true;
        result.set(key, step);
      }
    }
  }

  return result;
}

export function useCannonfileSpecs() {
  return useQuery({
    queryKey: ['cannonfileSpecs'],
    queryFn: fetchCannonfileSpecs,
  });
}
