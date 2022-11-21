import { Toolkit } from "actions-toolkit";

export async function getLatestTag(tools: Toolkit): Promise<string> {
    let latestTag = '';

    await tools.exec('git describe --tags --abbrev=0', [], {
        silent: true,
        listeners: {
            stdout: (buffer) => {
                latestTag = buffer.toString("utf-8").replace('\n', '')
            }
        }
    });

    return latestTag;
}

export async function getCommitsSinceLatestTag(tools: Toolkit, latestTag: string): Promise<string[]> {
    let commits: string[] = [];

    await tools.exec(`git log ${latestTag}..HEAD --oneline`, [],{
        silent: true,
        listeners: {
            stdout: (buffer) => {
                commits = buffer.toString('utf-8').split('\n');
            }
        }
    })

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
