import { Toolkit } from "actions-toolkit";
import {
    getCommitsSinceLatestTag,
    getJiraCodeFromString,
    getJiraIssueCodesFromCommits,
    getLatestTag
} from "./utils/git.util";
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

    console.log(commits.length)
    console.log(commits)

    for (const commit of commits) {
        const code = getJiraCodeFromString(commit);
        const issue = result.issues.find(i => i.key === code);

        const type = issue?.fields.issuetype?.name;

        console.log(type)

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
 ### Fixed
${notes.fixed.map(a => `
- ${a}
`).join('')}   
`;

const added = `
 ### Added
${notes.added.map(a => `
- ${a}
`).join('')}   
`;

const refactors = `
 ### Refactor
${notes.refactors.map(a => `
- ${a}
`).join('')}   
`;

const tasks = `
 ### Tasks
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

    console.log(notes)

    await tools.github.request('POST /repos/BakerWare/release-strategy-action/releases', {
        owner: 'Thijs-Van-Drongelen',
        repo: 'release-strategy-action',
        tag_name: `v${version?.raw}`,
        target_commitish: 'main',
        name: `v${version?.raw}`,
        body: body,
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
    Task = 'Taak',
}
