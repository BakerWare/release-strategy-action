import { Toolkit } from "actions-toolkit";

export async function getLatestTag(tools: Toolkit): Promise<string> {
    let latestTag = '';

    await tools.exec('git describe --tags --abbrev=0', [], {
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
        listeners: {
            stdout: (buffer) => {
                commits = buffer.toString('utf-8').split('\n');
            }
        }
    })

    return commits;
}

export function getJiraIssueCodesFromCommits(commits: string[]): string[] {
    const regex = '((?<!([A-Z]{1,10})-?)[A-Z]+-\\d+)'
    const jiraIssueCodes = [];

    for (const commit of commits) {
        const res = commit.match(regex);

        if (res) {
            jiraIssueCodes.push(res[0])
        }
    }

    return jiraIssueCodes;
}
