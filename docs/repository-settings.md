# Repository settings

A copy of this repository receives its files and nothing else, so every setting below has to be made again by hand. Each one comes with the clicks that reach it and a `gh` command that makes it.

Run the commands from inside the project folder. `gh` fills `{owner}` and `{repo}` in from the git remote, so nothing here names an account. The commands are written for PowerShell; the JSON they pipe in is plain ASCII.

## Main ruleset

A pull request is required, with no approvals and no code-owner review. The `pipeline` check must pass; the `evals` check joins it in Wave 4. Force pushes and deleting the branch are both blocked, only squash merging is allowed, and nobody is on the bypass list, administrators included.

**Clicks:** Settings → Rules → Rulesets → New ruleset → New branch ruleset. Name it `main`, set Enforcement to Active, leave the bypass list empty, and under Targets add the default branch. Tick Restrict deletions, Require a pull request before merging (required approvals 0, code owners unticked, allowed merge methods Squash), Require status checks to pass (add `pipeline`), and Block force pushes. Create.

```powershell
@'
{
  "name": "main",
  "target": "branch",
  "enforcement": "active",
  "bypass_actors": [],
  "conditions": { "ref_name": { "include": ["~DEFAULT_BRANCH"], "exclude": [] } },
  "rules": [
    { "type": "deletion" },
    { "type": "non_fast_forward" },
    {
      "type": "pull_request",
      "parameters": {
        "required_approving_review_count": 0,
        "require_code_owner_review": false,
        "dismiss_stale_reviews_on_push": false,
        "require_last_push_approval": false,
        "required_review_thread_resolution": false,
        "allowed_merge_methods": ["squash"]
      }
    },
    {
      "type": "required_status_checks",
      "parameters": {
        "strict_required_status_checks_policy": false,
        "required_status_checks": [{ "context": "pipeline" }]
      }
    }
  ]
}
'@ | gh api -X POST 'repos/{owner}/{repo}/rulesets' --input -
```

## Merging

Squash and nothing else, with the commit message taken from the pull request's title and description. **Allow auto-merge stays off.**

**Clicks:** Settings → General → Pull Requests. Untick Allow merge commits and Allow rebase merging. Tick Allow squash merging and set its default message to Pull request title and description. Leave Allow auto-merge unticked.

```powershell
gh api -X PATCH 'repos/{owner}/{repo}' -f squash_merge_commit_title=PR_TITLE -f squash_merge_commit_message=PR_BODY -F allow_squash_merge=true -F allow_merge_commit=false -F allow_rebase_merge=false
gh api -X PATCH 'repos/{owner}/{repo}' -F allow_auto_merge=false
```

The Claude desktop app has its own Auto-merge and Auto-fix switches for a pull request it watches. Both stay off in every Spindle session.

## Security

Secret scanning and push protection on; CodeQL on its default setup; dependency alerts on, with both kinds of update pull request off; private vulnerability reporting on.

**Clicks:** Settings → Advanced Security. Enable Secret Protection and its Push protection. Under Code scanning, CodeQL analysis → Set up → Default → Enable CodeQL. Enable Dependabot alerts; leave Dependabot security updates and Dependabot version updates off. Enable Private vulnerability reporting.

```powershell
@'
{ "security_and_analysis": { "secret_scanning": { "status": "enabled" }, "secret_scanning_push_protection": { "status": "enabled" } } }
'@ | gh api -X PATCH 'repos/{owner}/{repo}' --input -
gh api -X PATCH 'repos/{owner}/{repo}/code-scanning/default-setup' -f state=configured
gh api -X PUT 'repos/{owner}/{repo}/vulnerability-alerts'
gh api -X DELETE 'repos/{owner}/{repo}/automated-security-fixes'
gh api -X PUT 'repos/{owner}/{repo}/private-vulnerability-reporting'
```

The fourth command switches Dependabot security updates off. Version updates stay off because the repository holds no `.github/dependabot.yml`.

## Actions

Workflow permissions default to read-only. Workflows may create and approve pull requests. Anyone outside the repository needs approval before a workflow runs for them.

**Clicks:** Settings → Actions → General. Under Workflow permissions choose Read repository contents and packages permissions, and tick Allow GitHub Actions to create and approve pull requests. Under Approval for running fork pull request workflows from contributors, choose Require approval for all external contributors. Save each section.

```powershell
gh api -X PUT 'repos/{owner}/{repo}/actions/permissions/workflow' -f default_workflow_permissions=read -F can_approve_pull_request_reviews=true
gh api -X PUT 'repos/{owner}/{repo}/actions/permissions/fork-pr-contributor-approval' -f approval_policy=all_external_contributors
```

## The `claude` environment

The owner is its required reviewer. Its secret arrives in Wave 4, held on the environment and never at repository level. A repository variable records that the environment is protected, because the runner guard falls back to reading it where the protection rules themselves are out of reach.

**Clicks:** Settings → Environments → New environment, named `claude` → Configure environment. Tick Required reviewers, add yourself, and save the protection rules. Then Settings → Secrets and variables → Actions → Variables → New repository variable: name `CLAUDE_ENVIRONMENT_PROTECTED`, value `true`.

```powershell
$me = gh api user --jq .id
"{ ""reviewers"": [ { ""type"": ""User"", ""id"": $me } ] }" | gh api -X PUT 'repos/{owner}/{repo}/environments/claude' --input -
gh variable set CLAUDE_ENVIRONMENT_PROTECTED --body true
```

## Moderation

Interactions are held to prior contributors for six months.

**Clicks:** Settings → Moderation options → Interaction limits → Limit to prior contributors, for 6 months.

```powershell
gh api -X PUT 'repos/{owner}/{repo}/interaction-limits' -f limit=contributors_only -f expiry=six_months
```

## Proving the rule bites

With the ruleset in place, a push straight to main has to be refused. Commit something throwaway, try to push it, see the refusal, and then drop the commit. Do this only when `git status --short` prints nothing: the last command throws away every uncommitted change to a tracked file, not only the throwaway commit.

```powershell
git commit --allow-empty -m "throwaway: this push must be refused"
git push
git reset --hard origin/main
```
