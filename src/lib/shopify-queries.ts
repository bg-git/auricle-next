export const GET_ALL_PRODUCTS = `
  query getAllProducts($first: Int!) {
    products(first: $first) {
      edges {
        node {
          id
          title
          handle
          images(first: 1) {
            edges {
              node {
                url
              }
            }
          }
          variants(first: 1) {
            edges {
              node {
                sku
              }
            }
          }
        }
      }
    }
  }
`;

export const GET_PRODUCTS_BY_TAG = `
  query getProductsByTag($tag: String!, $first: Int!) {
    products(first: $first, query: $tag) {
      edges {
        node {
          id
          title
          handle
          tags
          images(first: 1) {
            edges {
              node {
                url
                altText
              }
            }
          }
          variants(first: 1) {
            edges {
              node {
                id
                price {
                  amount
                }
                availableForSale
                quantityAvailable
                metafield(namespace: "custom", key: "member_price") {
                  value
                }
              }
            }
          }
          metafields(identifiers: [
            { namespace: "custom", key: "metal" },
            { namespace: "custom", key: "finish" },
            { namespace: "custom", key: "gem_colour" },
            { namespace: "custom", key: "gem_type" },
            { namespace: "custom", key: "fitting" },
            { namespace: "custom", key: "metal_colour" }
          ]) {
            key
            value
          }
        }
      }
    }
  }
`;
