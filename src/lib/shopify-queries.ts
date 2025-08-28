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

export const GET_ALL_PAGES = `
  {
    pages(first: 250) {
      edges {
        node {
          handle
        }
      }
    }
  }
`;

export const GET_PAGE_BY_HANDLE = `
  query getPageByHandle($handle: String!) {
    pageByHandle(handle: $handle) {
      title
      bodyHtml
      seo {
        title
        description
      }
    }
  }
`;
