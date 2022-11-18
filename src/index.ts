import { Toolkit } from "actions-toolkit";
import { getCommitsSinceLatestTag, getJiraIssueCodesFromCommits, getLatestTag } from "./utils/git.util";
import { Version3Client } from "jira.js";
import {SuggestedIssue} from "jira.js/src/version3/models/suggestedIssue";

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

    const issues = await client.issueSearch.getIssuePickerResource<SuggestedIssue[]>({
        query: `project = CN and key in (${jiraIssueCodes.join(',')})`
    })

    console.log(issues.length)

    // haal issues op uit jira

    // filter op story/bugfixes

    // semver die shit

    // release met tag
}

run(tools);
