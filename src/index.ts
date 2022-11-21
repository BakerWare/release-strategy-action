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

    for (const commit of commits) {
        const code = getJiraCodeFromString(commit);
        const issue = result.issues.find(i => i.key === code);

        const type = issue?.fields.issuetype?.name;

        if (issue) {
            console.log(issue);
            // if (type === IssueType.Bug) {
            //     version?.inc('patch');
            //
            //     notes.fixed.push(`${issue.key} ${issue.fields.summary} | @${issue.fields.assignee.name}`)
            // }
            //
            // if (type === IssueType.Story) {
            //     version?.inc('minor');
            //
            //     notes.added.push(`${issue.key} ${issue.fields.summary} | @${issue.fields.assignee.name}`)
            // }
            //
            // if (type === IssueType.Refactor) {
            //     version?.inc('patch');
            //
            //     notes.refactors.push(`${issue.key} ${issue.fields.summary} | @${issue.fields.assignee.name}`)
            // }
            //
            // if (type === IssueType.Task) {
            //     notes.tasks.push(`${issue.key} ${issue.fields.summary} | @${issue.fields.assignee.name}`)
            // }
        }
    }

    tools.token = process.env.GITHUB_TOKEN as string;

    console.log(notes)

    await tools.github.request('POST /repos/BakerWare/release-strategy-action/releases', {
        owner: 'Thijs-Van-Drongelen',
        repo: 'release-strategy-action',
        tag_name: `v${version?.raw}`,
        target_commitish: 'main',
        name: `v${version?.raw}`,
        body: `
### Fixed
- WM-123 Test 1 | @RFreij
- WM-123 Test 2 | @Thijs-van-Drongelen
- WM-123 Test 3 | @RFreij
- WM-123 Test 4 | @Thijs-van-Drongelen      
    
### Added  

- WM-123 Test 5 | @RFreij
- WM-123 Test 6 | @Thijs-van-Drongelen 

### Refactor  

- WM-123 Test 7 | @RFreij
- WM-123 Test 8 | @Thijs-van-Drongelen     
    
### Tasks  

- WM-123 Test 9 | @RFreij
- WM-123 Test 10 | @Thijs-van-Drongelen 
        `,
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
    Task = 'Task',
}
