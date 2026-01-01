# gh-stats

GitHub user statistics generator.

Templates were originally borrowed from [jstrieb/github-stats](https://github.com/jstrieb/github-stats) and modified.

## Usage

Make sure you enabled GitHub Pages in your repository settings, In `Pages`, set the source to GitHub Actions.

Example GitHub Actions workflow:

> [!NOTE]
> Set `PAT_TOKEN` in your repo secrets with a token generated in your account settings. It must have `read:user` and `repo` permissions.
>
> You can use automatically generated `secrets.GITHUB_TOKEN` instead, but it may lead to incomplete stats.

```yaml
name: Generate Stats

on:
  schedule:
    - cron: "0 0 * * *"
  workflow_dispatch:

permissions:
  contents: write
  pages: write
  id-token: write

jobs:
  stats:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: GooseOb/gh-user-stats@master
        with:
          token: ${{ secrets.PAT_TOKEN }}

      - uses: actions/upload-pages-artifact@v3
        with:
          path: generated

      - uses: actions/deploy-pages@v4
```
