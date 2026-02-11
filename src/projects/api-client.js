export class ProjectsClient {
  constructor(octokit, org, projectNumber) {
    this.octokit = octokit;
    this.org = org;
    this.projectNumber = projectNumber;
    this.projectId = null;
  }

  async getProjectId() {
    if (this.projectId) return this.projectId;

    const query = `
      query($org: String!, $number: Int!) {
        organization(login: $org) {
          projectV2(number: $number) {
            id
          }
        }
      }
    `;

    const response = await this.octokit.graphql(query, {
      org: this.org,
      number: this.projectNumber
    });

    this.projectId = response.organization.projectV2.id;
    return this.projectId;
  }

  async addIssueToProject(issueId) {
    const projectId = await this.getProjectId();
    const query = `
      mutation($projectId: ID!, $contentId: ID!) {
        addProjectV2ItemById(input: {projectId: $projectId, contentId: $contentId}) {
          item {
            id
          }
        }
      }
    `;

    const response = await this.octokit.graphql(query, {
      projectId,
      contentId: issueId
    });

    return response.addProjectV2ItemById.item.id;
  }

  async updateItemStatus(itemId, statusFieldId, statusValueId) {
      const projectId = await this.getProjectId();
      const query = `
        mutation($projectId: ID!, $itemId: ID!, $fieldId: ID!, $value: String!) {
          updateProjectV2ItemFieldValue(input: {
            projectId: $projectId,
            itemId: $itemId,
            fieldId: $fieldId,
            value: { singleSelectOptionId: $value }
          }) {
            projectV2Item {
              id
            }
          }
        }
      `;
      // This is a simplified version. In reality, you need IDs for fields and options.
  }
}
