import { Toolkit } from "actions-toolkit";
import { getCommitsSinceLatestTag, getJiraIssueCodesFromCommits, getLatestTag } from "./utils/git.util";
import { Version3Client } from "jira.js";

const tools = new Toolkit({
    secrets: [
        'JIRA_USER',
        'JIRA_PASS',
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
        jql: `project = CN and key in (${jiraIssueCodes.join(', ')}) ORDER BY created DESC`
    })

    if (result !== undefined && result.issues) {
        for (const issue of result.issues) {
            const type = issue.fields.issuetype?.name; // Bug | Story | Task | Refactor

            console.log(issue)
        }
    }

    // haal issues op uit jira

    // filter op story/bugfixes

    // semver die shit

    // release met tag
}

run(tools);
