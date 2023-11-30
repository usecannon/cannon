import { chainDefinitionSchema } from '@usecannon/builder/src/schemas.zod';
import { runSchema } from '@usecannon/cli/src/schemas.zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { compile } from 'json-schema-to-typescript';
import prettierPluginTypescript from 'prettier/plugins/typescript';
import prettierPluginEstree from 'prettier/plugins/estree';
import prettier from 'prettier/standalone';
import { useEffect, useState } from 'react';

interface CannonfileSpec {
  description: string;
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

  const source = await compile(prop, 'Type', {
    format: false,
    bannerComment: '',
  });
  let result = (
    await prettier.format(source, {
      parser: 'typescript',
      plugins: [prettierPluginTypescript, prettierPluginEstree],
    })
  ).trim();

  if (result[result.length - 1] === ';') {
    result = result.slice(0, -1);
  }

  return result.replace('export interface Type ', '').replace('export type Type = ', '');
};

export function useCannonfileSpecs() {
  const [cannonfileSpecs, setCannonfileSpecs] = useState<Map<string, CannonfileSpec>>();

  useEffect(() => {
    const fetchCannonfileSpecs = async () => {
      const chainDefinitionJsonSchema = zodToJsonSchema(chainDefinitionSchema, {
        $refStrategy: 'none',
      });

      const runJsonSchema = zodToJsonSchema(runSchema, {
        $refStrategy: 'none',
      });

      const result = new Map<string, CannonfileSpec>();

      const metadataKeys = ['name', 'preset', 'version', 'description', 'keywords'];
      const metadataSpecs: Spec[] = [];
      for (const key of metadataKeys) {
        metadataSpecs.push(await getSpec(chainDefinitionJsonSchema, key));
      }
      result.set('metadata', {
        description: 'Provide metadata for your Cannonfile.',
        specs: metadataSpecs,
      });

      for (const stepName in (chainDefinitionJsonSchema as any).properties) {
        if (metadataKeys.includes(stepName)) {
          continue;
        }

        const stepSpecs: Spec[] = [];
        const stepJsonSchema = (chainDefinitionJsonSchema as any).properties[stepName].additionalProperties;

        for (const key in stepJsonSchema.properties) {
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
          'Execute a custom script. This script is passed aChainBuilder object as parameter. This action breaks composability—only use this as a last resort. Instead, you should use a custom Cannon plug-in if this is necessary for your deployment.',
        specs: runSpecs,
      });

      setCannonfileSpecs(result);
    };

    void fetchCannonfileSpecs();
  }, []);

  return cannonfileSpecs;
}
