import { z } from "zod";
import { Octokit } from "octokit";

export const githubRepoToolSchema = z.object({
  owner: z.string().describe("The name of the repository owner."),
  repo: z.string().describe("The name of the repository."),
});

export async function githubRepoTool(
  input: z.infer<typeof githubRepoToolSchema>,
) {
  if (!process.env.GITHUB_TOKEN) {
    throw new Error("Missing GITHUB_TOKEN secret.");
  }
  const githubClient = new Octokit({
    auth: process.env.GITHUB_TOKEN,
  });
  try {
    const repoData = await githubClient.request("GET /repos/{owner}/{repo}", {
      owner: input.owner,
      repo: input.repo,
      headers: {
        "X-GitHub-Api-Version": "2022-11-28",
      },
    });
    return {
      ...input,
      description: repoData.data.description ?? "",
      stars: repoData.data.stargazers_count,
      language: repoData.data.language ?? "",
    };
  } catch (err) {
    console.error(err);
    return "There was an error fetching the repository. Please check the owner and repo names.";
  }
}
