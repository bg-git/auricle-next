// src/pages/api/admin/update-metafield-definitions.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import {
  auricleAdmin,
  poaAdmin,
  shopifyAdminGraphql,
} from '@/lib/shopifyAdmin';

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

const UPDATE_METAFIELD_DEFINITION_MUTATION = `
  mutation UpdateMetafieldDefinition($id: ID!, $definition: MetafieldDefinitionInput!) {
    metafieldDefinitionUpdate(id: $id, definition: $definition) {
      updatedDefinition {
        id
        name
        key
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
    console.log('Starting metafield definitions update - adding validations/choices from Auricle to POA');

    // Fetch all metafield definitions from Auricle
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

    // Fetch all metafield definitions from POA to get their IDs
    console.log('Fetching metafield definitions from POA...');
    const poaDefsResult = await shopifyAdminGraphql<{
      metafieldDefinitions: {
        edges: Array<{
          node: {
            id: string;
            key: string;
            namespace: string;
            type: { name: string };
          };
        }>;
      };
    }>(poaAdmin, GET_METAFIELD_DEFINITIONS_QUERY, { first: 250, ownerType: 'PRODUCT' });

    const poaDefsByKey = new Map<string, { id: string; type: string }>();
    for (const edge of poaDefsResult.metafieldDefinitions.edges) {
      if (edge.node.namespace === 'custom') {
        poaDefsByKey.set(edge.node.key, {
          id: edge.node.id,
          type: edge.node.type.name,
        });
      }
    }

    const results = {
      total: auricleDefs.length,
      updated: 0,
      skipped: 0,
      failed: 0,
      errors: [] as Array<{ key: string; error: string }>,
    };

    // For each Auricle definition with choices, update the POA one
    for (const def of auricleDefs) {
      if (def.namespace !== 'custom') {
        results.skipped++;
        continue;
      }

      const poaDef = poaDefsByKey.get(def.key);
      if (!poaDef) {
        console.log(`Definition ${def.key} not found on POA - skipping`);
        results.skipped++;
        continue;
      }

      // Check if this definition has choice validations
      const choicesValidation = def.validations?.find(v => v.name === 'choices');
      if (!choicesValidation) {
        results.skipped++;
        continue;
      }

      try {
        console.log(`Updating metafield definition: ${def.key} with choices`);
        const choicesData = JSON.parse(choicesValidation.value);
        console.log(`  Choices:`, choicesData);

        const updateResult = await shopifyAdminGraphql<{
          metafieldDefinitionUpdate: {
            updatedDefinition: {
              id: string;
              name: string;
              key: string;
            } | null;
            userErrors: Array<{ field: string[]; message: string; code: string }>;
          };
        }>(poaAdmin, UPDATE_METAFIELD_DEFINITION_MUTATION, {
          id: poaDef.id,
          definition: {
            namespace: 'custom',
            key: def.key,
            name: def.name,
            description: def.description,
            type: poaDef.type,
            ownerType: 'PRODUCT',
            validations: {
              choices: choicesData,
            },
          },
        });

        const userErrors = updateResult.metafieldDefinitionUpdate?.userErrors ?? [];
        if (userErrors.length > 0) {
          console.error(`Error updating ${def.key}:`, userErrors);
          results.failed++;
          results.errors.push({
            key: def.key,
            error: userErrors.map((e) => e.message).join('; '),
          });
        } else {
          console.log(`✓ Updated definition: ${def.key}`);
          results.updated++;
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`Failed to update metafield ${def.key}: ${msg}`);
        results.failed++;
        results.errors.push({ key: def.key, error: msg });
      }
    }

    console.log('Metafield definitions update complete', results);
    return res.status(200).json(results);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('Error updating metafield definitions:', message);
    return res.status(500).json({ error: message });
  }
}
