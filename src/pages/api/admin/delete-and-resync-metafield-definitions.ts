// src/pages/api/admin/delete-and-resync-metafield-definitions.ts
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

const DELETE_METAFIELD_DEFINITION_MUTATION = `
  mutation DeleteMetafieldDefinition($id: ID!) {
    metafieldDefinitionDelete(id: $id) {
      deletedDefinitionId
      userErrors {
        field
        message
        code
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
    console.log('Starting delete and resync of metafield definitions');

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

    // Fetch all metafield definitions from POA to delete them
    console.log('Fetching POA metafield definitions to delete...');
    const poaDefsResult = await shopifyAdminGraphql<{
      metafieldDefinitions: {
        edges: Array<{
          node: {
            id: string;
            key: string;
            namespace: string;
          };
        }>;
      };
    }>(poaAdmin, GET_METAFIELD_DEFINITIONS_QUERY, { first: 250, ownerType: 'PRODUCT' });

    const results = {
      auricleTotal: auricleDefs.length,
      deleted: 0,
      created: 0,
      errors: [] as Array<{ key: string; error: string }>,
    };

    // Delete all custom POA definitions
    for (const edge of poaDefsResult.metafieldDefinitions.edges) {
      const def = edge.node;
      if (def.namespace !== 'custom') continue;

      try {
        console.log(`Deleting POA definition: ${def.key}`);
        const deleteResult = await shopifyAdminGraphql<{
          metafieldDefinitionDelete: {
            deletedDefinitionId: string;
            userErrors: Array<{ message: string }>;
          };
        }>(poaAdmin, DELETE_METAFIELD_DEFINITION_MUTATION, { id: def.id });

        if (deleteResult.metafieldDefinitionDelete?.userErrors?.length) {
          console.error(
            `Error deleting ${def.key}:`,
            deleteResult.metafieldDefinitionDelete.userErrors,
          );
        } else {
          results.deleted++;
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`Failed to delete ${def.key}: ${msg}`);
      }
    }

    console.log(`Deleted ${results.deleted} definitions. Now recreating with choices...`);

    // Recreate all definitions from Auricle with choices
    for (const def of auricleDefs) {
      if (def.namespace !== 'custom') continue;

      try {
        console.log(`Creating metafield definition: ${def.key} (${def.type.name})`);

        const definitionInput = {
          namespace: 'custom',
          key: def.key,
          name: def.name,
          description: def.description,
          type: def.type.name,
          ownerType: 'PRODUCT',
        } as Record<string, unknown>;

        // Handle choice list validations
        if (
          def.validations &&
          def.validations.length > 0 &&
          def.type.name.includes('selection')
        ) {
          const choicesValidation = def.validations.find(
            (v) => v.name === 'choices',
          );
          if (choicesValidation) {
            try {
              const choicesData = JSON.parse(choicesValidation.value);
              definitionInput.validations = {
                choices: choicesData,
              };
              console.log(`  Choices: ${choicesData.map((c: any) => c.name || c).join(', ')}`);
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
            } | null;
            userErrors: Array<{ field: string[]; message: string; code: string }>;
          };
        }>(poaAdmin, CREATE_METAFIELD_DEFINITION_MUTATION, {
          definition: definitionInput,
        });

        const userErrors =
          createResult.metafieldDefinitionCreate?.userErrors ?? [];
        if (userErrors.length > 0) {
          console.error(`Error creating ${def.key}:`, userErrors);
          results.errors.push({
            key: def.key,
            error: userErrors.map((e) => e.message).join('; '),
          });
        } else if (createResult.metafieldDefinitionCreate?.createdDefinition) {
          console.log(`✓ Created definition: ${def.key}`);
          results.created++;
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`Failed to create metafield ${def.key}: ${msg}`);
        results.errors.push({ key: def.key, error: msg });
      }
    }

    console.log('Delete and resync complete', results);
    return res.status(200).json(results);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('Error in delete and resync:', message);
    return res.status(500).json({ error: message });
  }
}
