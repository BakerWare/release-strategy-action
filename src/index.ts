import { Toolkit } from "actions-toolkit";
import { getCommitsSinceLatestTag, getJiraIssueCodesFromCommits, getLatestTag } from "./utils/git.util";
import { Version3Client } from "jira.js";
import semver from "semver";

const tools = new Toolkit({
    secrets: [
        'JIRA_USER',
        'JIRA_PASS',
        'GITHUB_TOKEN',
    ]
})

async function run(tools: Toolkit) {
    const latestTag = await getLatestTag(tools);

    if (!latestTag) {
        tools.exit.failure('No valid tag found');
    }

    const commits = await getCommitsSinceLatestTag(tools, latestTag);

    if (!commits) {
        tools.exit.failure('No commits found since previous release');
    }

    const jiraIssueCodes = getJiraIssueCodesFromCommits(commits);

    if (!jiraIssueCodes) {
        tools.exit.failure('No new commits with jira code found since previous release');
    }

    const client = new Version3Client({
        host: 'https://bakerware.atlassian.net',
        newErrorHandling: true,
        authentication: {
            basic: {
                username: process.env.JIRA_USER as string,
                password: process.env.JIRA_PASS as string,
            },
        },
    });

    const result = await client.issueSearch.searchForIssuesUsingJql({
        jql: `project = CN and key in (${jiraIssueCodes.join(', ')}) ORDER BY created ASC`
    })

    const version = semver.coerce(latestTag);

    if (result !== undefined && result.issues) {
        for (const issue of result.issues) {
            const type = issue.fields.issuetype?.name;

            if (type === IssueType.Bug) {
                version?.inc('patch');
            }

            if (type === IssueType.Story) {
                version?.inc('minor');
            }

            if (type === IssueType.Refactor) {
                version?.inc('patch');
            }
        }
    }

    tools.token = process.env.GITHUB_TOKEN as string;

    await tools.github.request('POST /repos/BakerWare/release-strategy-action/releases', {
        owner: 'Thijs-Van-Drongelen',
        repo: 'release-strategy-action',
        tag_name: `v${version?.raw}`,
        target_commitish: 'main',
        name: `v${version?.raw}`,
        body: 'Description of the release',
        draft: false,
        prerelease: false,
        generate_release_notes: false
    });
}

run(tools);

enum IssueType {
    Bug = 'Bug',
    Story = 'Story',
    Refactor = 'Refactor',
    // Tasl = 'Task',
}
