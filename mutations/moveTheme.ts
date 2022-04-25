import gql from "graphql-tag";

export const moveThemeMutation = gql`
  mutation MoveTheme($id: ID!, $space: ID!) {
    editTheme(input: { id: $id, spaceId: $space }) {
      theme {
        space {
          id
        }
      }
    }
  }
`;
