Suggested git commands to commit changes and open a PR:

1. Create a new branch and switch to it:

```bash
git checkout -b fix/magic-link-flow
```

2. Stage and commit changed files:

```bash
git add app/detect/page.jsx scripts/test-usage.js README.md
git commit -m "Fix magic-link flow: add instructions, intermediate /auth/complete, and smoke test"
```

3. Push the branch and open a PR (replace `origin` if different):

```bash
git push -u origin fix/magic-link-flow
```

Then open a pull request in your Git hosting provider (GitHub/GitLab). Suggested PR title: "Fix magic-link flow and add usage smoke test".

PR description checklist:

- Summary of the problem and changes (magic-link prefetch, UI instructions, intermediate /auth/complete page)
- Database notes: added unique constraint on `(user_id, date)` and recommended `GRANT` on `public.daily_usage` to the service role if needed.
- Testing instructions: start dev server and run `node scripts/test-usage.js` to validate `/api/usage` response.
