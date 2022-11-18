import { Toolkit } from "actions-toolkit";
import {getCommitsSinceLatestTag, getJiraIssueCodesFromCommits, getLatestTag} from "./utils/git.util";

Toolkit.run(async tools => {
    const latestTag = await getLatestTag(tools);

    if (!latestTag) {
        tools.exit.failure('No valid tag found');
    }

    const commits = await getCommitsSinceLatestTag(tools, latestTag);

    if (!commits) {
        tools.exit.failure('No new changes found');
    }

    const jiraIssueCodes = getJiraIssueCodesFromCommits(commits);

    console.log(jiraIssueCodes);

    // haal issues op uit jira

    // filter op story/bugfixes

    // semver die shit

    // release met tag
})
