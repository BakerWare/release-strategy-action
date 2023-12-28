import { Toolkit } from "actions-toolkit";

export async function getLatestTag(tools: Toolkit): Promise<string> {
    let latestTag = '';

    await tools.exec('git tag', ['--list', 'v[0-9]*.[0-9]*.[0-9]*', '--sort', 'v:refname'], {
        silent: false,
        listeners: {
            stdout: (buffer: Buffer) => {
                latestTag = buffer.toString().split('\n').pop() || '';
            }
        }
    });

    return latestTag;
}

export async function getCommitsSinceLatestTag(tools: Toolkit, latestTag: string): Promise<string[]> {
    let commits: string[] = [];
    let myOutput = '';

    await tools.exec(`git log ${latestTag}..HEAD --oneline`, [],{
        silent: false,
        listeners: {
            stdout: (data) => {
                myOutput += data.toString('utf-8');
            }
        }
    })

    commits = myOutput.split('\n');

    return commits.reverse();
}

export function getJiraIssueCodesFromCommits(commits: string[]): string[] {
    const jiraIssueCodes = [];

    for (const commit of commits) {
        const code = getJiraCodeFromString(commit);

        if (code) {
            jiraIssueCodes.push(code)
        }
    }

    return jiraIssueCodes;
}

export function getJiraCodeFromString(commit: string): undefined | string {
    const regex = '((?<!([A-Z]{1,10})-?)[A-Z]+-\\d+)'
    const res = commit.match(regex);

    if (res) {
        return res[0];
    }

    return undefined;
}
