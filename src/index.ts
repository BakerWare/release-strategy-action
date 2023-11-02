import { Toolkit } from "actions-toolkit";
import {
    getCommitsSinceLatestTag,
    getJiraCodeFromString,
    getJiraIssueCodesFromCommits,
    getLatestTag
} from "./utils/git.util";
import { Version3Client } from "jira.js";
import semver from "semver";
import { IssueType } from "./types/issue-type";

const tools = new Toolkit({
    secrets: [
        'JIRA_USER',
        'JIRA_PASS',
        'GITHUB_TOKEN'
    ]
})

async function run(tools: Toolkit) {
    const debugMode = process.env.ACTIONS_RUNNER_DEBUG ?? false;

    const latestTag =  'v3.18.1'; // await getLatestTag(tools);

    if (!latestTag) {
        tools.exit.failure('No valid tag found');
    }

    const commits = await getCommitsSinceLatestTag(tools, latestTag);

    if (!commits) {
        return tools.exit.failure('No commits found since previous release');
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

    const project = process.env.PROJECT as string;

    if (debugMode) {
        console.log(`JQL: project = ${project} and key in (${jiraIssueCodes.join(', ')}) ORDER BY created ASC`)
    }

    const result = await client.issueSearch.searchForIssuesUsingJql({
        jql: `project = ${project} and key in (${jiraIssueCodes.join(', ')}) ORDER BY created ASC`
    })


    if (!result.issues) {
        tools.exit.failure('No jira issues found');
    }

    const version = semver.coerce(latestTag);
    const notes: {
        fixed: string[],
        added: string[],
        refactors: string[],
        tasks: string[],
    } = {
        fixed: [],
        added: [],
        refactors: [],
        tasks: [],
    }

    for (const commit of commits) {
        const code = getJiraCodeFromString(commit);

        // @ts-ignore
        const issue = result.issues.find(i => i.key === code);

        const type = issue?.fields.issuetype?.name;

        if (issue) {
            if (type === IssueType.Bug) {
                version?.inc('patch');

                notes.fixed.push(`${issue.key} ${issue.fields.summary}`)
            }

            if (type === IssueType.Story) {
                version?.inc('minor');

                notes.added.push(`${issue.key} ${issue.fields.summary}`)
            }

            if (type === IssueType.Refactor) {
                version?.inc('patch');

                notes.refactors.push(`${issue.key} ${issue.fields.summary}`)
            }

            if (type === IssueType.Task) {
                notes.tasks.push(`${issue.key} ${issue.fields.summary}`)
            }
        }
    }

    tools.token = process.env.GITHUB_TOKEN as string;

const fixed = `
 ### :bug: Fixed
${notes.fixed.map(a => `
- ${a}
`).join('')}   
`;

const added = `
 ### :chart_with_upwards_trend: Added
${notes.added.map(a => `
- ${a}
`).join('')}   
`;

const refactors = `
 ### :wrench: Refactor
${notes.refactors.map(a => `
- ${a}
`).join('')}   
`;

const tasks = `
 ### :white_check_mark: Tasks
${notes.tasks.map(a => `
- ${a}
`).join('')}   
`;

    let body = '';

    if (notes.fixed.length > 0) {
        body += fixed;
    }
    if (notes.added.length > 0) {
        body += added;
    }
    if (notes.refactors.length > 0) {
        body += refactors;
    }
    if (notes.tasks.length > 0) {
        body += tasks;
    }

    await tools.github.repos.createRelease({
        tag_name: `v${version?.raw}`,
        target_commitish: 'main',
        name: `v${version?.raw}`,
        body: body,
        prerelease: false,
        draft: false,
        ...tools.context.repo
    })
}

run(tools).catch((e) => {
    console.error(e)
});
