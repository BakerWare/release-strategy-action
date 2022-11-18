import { Toolkit } from "actions-toolkit";
import { getCommitsSinceLatestTag, getLatestTag } from "./utils/git.util";

Toolkit.run(async tools => {
    const latestTag = await getLatestTag(tools);

    if (!latestTag) {
        tools.exit.failure('No valid tag found');
    }

    const commits = await getCommitsSinceLatestTag(tools, latestTag);

    if (!commits) {
        tools.exit.failure('No new changes found');
    }

    console.log(commits)
})
