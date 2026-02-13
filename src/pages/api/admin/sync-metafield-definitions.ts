// src/pages/api/admin/sync-metafield-definitions.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import {
  auricleAdmin,
  poaAdmin,
  shopifyAdminGraphql,
} from '@/lib/shopifyAdmin';

type MetafieldDefinition = {
  id: string;
  name: string;
  namespace: string;
  key: string;
  description: string;
  type: string;
  validations: Array<{
    name: string;
    value: string;
  }>;
};

const GET_METAFIELD_DEFINITIONS_QUERY = `
  query GetMetafieldDefinitions($first: Int!, $ownerType: MetafieldOwnerType!) {
    metafieldDefinitions(first: $first, ownerType: $ownerType) {
      edges {
        node {
          id
          name
          namespace
          key
          description
          type {
            name
          }
          validations {
            name
            value
          }
        }
      }
    }
  }
`;

const CREATE_METAFIELD_DEFINITION_MUTATION = `
  mutation CreateMetafieldDefinition($definition: MetafieldDefinitionInput!) {
    metafieldDefinitionCreate(definition: $definition) {
      createdDefinition {
        id
        name
        key
        type {
          name
        }
      }
      userErrors {
        field
        message
        code
      }
    }
  }
`;

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).send('Method Not Allowed');
  }

  try {
    console.log('Starting metafield definitions sync from Auricle to POA');

    // Step 1: Fetch all metafield definitions from Auricle (for products)
    console.log('Fetching metafield definitions from Auricle...');
    const auricleDefsResult = await shopifyAdminGraphql<{
      metafieldDefinitions: {
        edges: Array<{
          node: {
            id: string;
            name: string;
            namespace: string;
            key: string;
            description: string;
            type: { name: string };
            validations: Array<{ name: string; value: string }>;
          };
        }>;
      };
    }>(auricleAdmin, GET_METAFIELD_DEFINITIONS_QUERY, { first: 250, ownerType: 'PRODUCT' });

    const auricleDefs = auricleDefsResult.metafieldDefinitions.edges.map(
      (edge) => edge.node,
    );

    console.log(`Found ${auricleDefs.length} metafield definitions in Auricle`);

    // Step 2: For each definition, try to create it on POA
    const results = {
      total: auricleDefs.length,
      created: 0,
      skipped: 0,
      failed: 0,
      errors: [] as Array<{ key: string; error: string }>,
    };

    for (const def of auricleDefs) {
      // Skip some system metafields that shouldn't be synced
      if (def.namespace !== 'custom') {
        console.log(`Skipping ${def.key} - not a custom metafield`);
        results.skipped++;
        continue;
      }

      try {
        console.log(`Creating metafield definition: ${def.key} (${def.type.name})`);

        // Parse validations/choices from Auricle
        const definitionInput = {
          namespace: 'custom',
          key: def.key,
          name: def.name,
          description: def.description,
          type: def.type.name,
          ownerType: 'PRODUCT',
        } as Record<string, unknown>;

        // Handle choice list validations
        if (def.validations && def.validations.length > 0 && def.type.name.includes('selection')) {
          // For choice fields, validations contains "choices" with the list of options
          const choicesValidation = def.validations.find(v => v.name === 'choices');
          if (choicesValidation) {
            try {
              const choicesData = JSON.parse(choicesValidation.value);
              definitionInput.validations = {
                choices: choicesData,
              };
              console.log(`  Choice options for ${def.key}:`, choicesData);
            } catch (e) {
              console.log(`  Could not parse choices for ${def.key}`);
            }
          }
        }

        const createResult = await shopifyAdminGraphql<{
          metafieldDefinitionCreate: {
            createdDefinition: {
              id: string;
              name: string;
              key: string;
              type: { name: string };
            } | null;
            userErrors: Array<{ field: string[]; message: string; code: string }>;
          };
        }>(poaAdmin, CREATE_METAFIELD_DEFINITION_MUTATION, {
          definition: definitionInput,
        });

        const userErrors =
          createResult.metafieldDefinitionCreate?.userErrors ?? [];
        if (userErrors.length > 0) {
          // Check if the key already exists
          const alreadyExistsError = userErrors.some((e) =>
            e.message.includes('Key is in use'),
          );
          if (alreadyExistsError) {
            console.log(`Definition ${def.key} already exists on POA`);
            results.skipped++;
          } else {
            console.error(`Error creating ${def.key}:`, userErrors);
            results.failed++;
            results.errors.push({
              key: def.key,
              error: userErrors.map((e) => e.message).join('; '),
            });
          }
        } else if (createResult.metafieldDefinitionCreate?.createdDefinition) {
          console.log(`✓ Created definition: ${def.key}`);
          results.created++;
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`Failed to create metafield ${def.key}: ${msg}`);
        results.failed++;
        results.errors.push({ key: def.key, error: msg });
      }
    }

    console.log('Metafield definitions sync complete', results);
    return res.status(200).json(results);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('Error syncing metafield definitions:', message);
    return res.status(500).json({ error: message });
  }
}
