import gql from "graphql-tag";

export const spacesQuery = gql`
  query Spaces {
    organization {
      spaces {
        id
        name
        key
        labels {
          id
          name
          color
        }
        statuses {
          id
          name
          type
          default
        }
      }
    }
  }
`;
