import { Toolkit } from "actions-toolkit";
import { getCommitsSinceLatestTag, getLatestTag } from "./utils/git.util";

Toolkit.run(async tools => {
    const latestTag = await getLatestTag(tools);

    const commits = await getCommitsSinceLatestTag(tools, latestTag);

    console.log(commits)
})
