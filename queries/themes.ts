import gql from "graphql-tag";

export const themesQuery = gql`
  query Themes($space: ID!, $cursor: String) {
    themes(spaceId: $space, cursor: $cursor, count: 50) {
      themes {
        id
        sort
        number
        labels {
          id
          name
          color
        }
        workItems {
          id
          number
          sort
          labels {
            id
            name
            color
          }
          status {
            id
            name
            type
            default
          }
        }
      }
      cursor
      hasMore
    }
  }
`;
