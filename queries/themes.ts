import gql from "graphql-tag";

export const themesQuery = gql`
  query Themes($space: ID!) {
    themes(spaceId: $space) {
      themes {
        id
        number
        labels {
          id
          name
          color
        }
        workItems {
          id
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
    }
  }
`;
