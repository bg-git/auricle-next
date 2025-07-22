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
